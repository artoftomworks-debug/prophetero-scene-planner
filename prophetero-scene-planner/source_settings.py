"""Inspectable source settings and explicit LoRA edits; never execute model code."""
import copy, math

POWER='Power Lora Loader (rgthree)'
STANDARD={'LoraLoader':('lora_name','strength_model','strength_clip'),'LoraLoaderModelOnly':('lora_name','strength_model')}

def incoming(w,node,name):
    slot=next((i for i,v in enumerate(node.get('inputs',[])) if v['name']==name),None)
    return next((l for l in w['links'] if l[3]==node['id'] and l[4]==slot),None)

def ancestors(w,roots):
    found=set(roots)
    while True:
        more={l[1] for l in w['links'] if l[3] in found}-found
        if not more:return found
        found.update(more)

def relevant(w,h3):
    reached={h3['id']}
    while True:
        more={l[3] for l in w['links'] if l[1] in reached and l[5]=='CONDITIONING'}-reached
        if not more:break
        reached.update(more)
    guiders=[n['id'] for n in w['nodes'] if n['id'] in reached and n['type']=='BasicGuider']
    samplers=[l[3] for l in w['links'] if l[1] in guiders and l[5]=='GUIDER']
    return ancestors(w,[h3['id'],*guiders,*samplers])

def strength(value):
    if type(value) not in (int,float) or not math.isfinite(value) or abs(value)>100:raise ValueError('LoRA strength must be a finite number between -100 and 100.')
    return value

def row(value,slot):
    if not isinstance(value,dict) or not isinstance(value.get('lora'),str) or type(value.get('on')) is not bool:return None
    return dict(slot=slot,name=value['lora'],on=value['on'],strength=strength(value.get('strength')),clip=None if value.get('strengthTwo') is None else strength(value['strengthTwo']))

def loader(node):
    raw=node.get('widgets_values',[]);kind=node['type'];rows=[];editable=node.get('mode',0)==0
    if any(i.get('link') is not None and (i['name'].startswith('lora_') or i['name'] in ('lora_name','strength_model','strength_clip')) for i in node.get('inputs',[])):editable=False
    try:
        if kind==POWER:
            if not isinstance(raw,(list,dict)):editable=False
            else:
                for key,value in (enumerate(raw) if isinstance(raw,list) else raw.items()):
                    if isinstance(value,dict) and ('lora' in value or 'on' in value):
                        parsed=row(value,key)
                        if parsed is None:editable=False
                        else:rows.append(parsed)
        elif kind in STANDARD:
            fields=STANDARD[kind]
            values=[raw.get(k) for k in fields] if isinstance(raw,dict) else raw[:len(fields)] if isinstance(raw,list) else []
            if len(values)!=len(fields) or not isinstance(values[0],str):editable=False
            else:rows=[dict(slot=0,name=values[0],on=any(v!=0 for v in values[1:]),strength=strength(values[1]),clip=strength(values[2]) if len(values)>2 else None)]
        else:editable=False
    except ValueError:editable=False
    return dict(nodeId=node['id'],type=kind,title=node.get('title') or kind,editable=editable,canAdd=editable and kind==POWER,rows=rows)

def manifest(w,h3):
    ids=relevant(w,h3)
    result=[loader(n) for n in w['nodes'] if n['id'] in ids and ('lora' in n['type'].lower())]
    # Native insertion is offered only with one unambiguous model root and CLIP source.
    roots=[n for n in w['nodes'] if n['id'] in ids and n['type'] in ('UNETLoader','CheckpointLoaderSimple') and n.get('mode',0)==0]
    if len(roots)==1 and incoming(w,h3,'clip'):
        result.append(dict(nodeId='new',type='LoraLoader',title='New native LoRA chain',editable=True,canAdd=True,rows=[]))
    return result

def overview(w,h3):
    ids=relevant(w,h3)
    kinds={'UNETLoader','CheckpointLoaderSimple','CLIPLoader','VAELoader','RandomNoise','KSamplerSelect','BasicScheduler','CFGGuider','BasicGuider','SamplerCustomAdvanced'}
    return [dict(nodeId=n['id'],type=n['type'],title=n.get('title') or n['type'],values=copy.deepcopy(n.get('widgets_values',[]))) for n in w['nodes'] if n['id'] in ids and n['type'] in kinds]

def apply_loras(w,h3,edits,catalog=None):
    if edits is None:return []
    if not isinstance(edits,list) or len(edits)>100:raise ValueError('Invalid LoRA edits.')
    supported={m['nodeId']:m for m in manifest(w,h3)};by={n['id']:n for n in w['nodes']};changes=[];seen=set()
    for edit in edits:
        if not isinstance(edit,dict):raise ValueError('Invalid LoRA edit.')
        ident=edit.get('nodeId');rows=edit.get('rows')
        if ident not in supported or ident in seen or not supported[ident]['editable']:raise ValueError('Unsupported, linked or inactive LoRA loader. Edit it in ComfyUI.')
        seen.add(ident);info=supported[ident]
        if not isinstance(rows,list) or len(rows)>64:raise ValueError('At most 64 LoRAs per loader.')
        if info['type'] in STANDARD and ident!='new' and len(rows)>1:raise ValueError('This loader accepts one LoRA; use the new chain for additional LoRAs.')
        original={r['slot']:r for r in info['rows']};used=set();clean=[]
        for r in rows:
            if not isinstance(r,dict) or not isinstance(r.get('name'),str) or not r['name'].strip() or len(r['name'])>600 or type(r.get('on')) is not bool:raise ValueError('Choose a LoRA file and enabled state.')
            slot=r.get('slot');old=original.get(slot)
            if slot is not None and (old is None or slot in used):raise ValueError('Unknown or duplicate LoRA row.')
            used.add(slot) if slot is not None else None
            if catalog is not None and (not old or old['name']!=r['name']) and r['name'] not in catalog:raise ValueError('The selected LoRA is not installed in this ComfyUI backend: '+r['name'])
            clean.append(dict(slot=slot,name=r['name'],on=r['on'],strength=strength(r.get('strength')),clip=None if r.get('clip') is None else strength(r['clip'])))
        if clean==info['rows']:continue
        if ident=='new':
            if clean:insert_chain(w,h3,clean)
        else:
            node=by[ident];raw=node['widgets_values']
            if info['type']==POWER:
                values=[]
                for r in clean:
                    value=copy.deepcopy(raw[r['slot']]) if r['slot'] is not None else {}
                    value.update(lora=r['name'],on=r['on'],strength=r['strength'])
                    if r['clip'] is None:value.pop('strengthTwo',None)
                    else:value['strengthTwo']=r['clip']
                    values.append(value)
                if isinstance(raw,list):
                    # Retain non-LoRA header/config widgets exactly as saved.
                    retained=[v for i,v in enumerate(raw) if i not in original]
                    node['widgets_values']=retained+values
                else:
                    node['widgets_values']={k:v for k,v in raw.items() if k not in original}
                    node['widgets_values'].update({f'lora_{i+1}':v for i,v in enumerate(values)})
            else:
                r=clean[0] if clean else dict(name=info['rows'][0]['name'],on=False,strength=0,clip=0)
                values=[r['name'],r['strength'] if r['on'] else 0]
                if info['type']=='LoraLoader':values.append((r['strength'] if r['clip'] is None else r['clip']) if r['on'] else 0)
                if isinstance(raw,dict):raw.update(zip(STANDARD[info['type']],values))
                else:raw[:len(values)]=values
        if clean!=info['rows']:changes.append(dict(nodeId=ident,before=info['rows'],after=clean))
    return changes

def insert_chain(w,h3,rows):
    ids=relevant(w,h3);roots=[n for n in w['nodes'] if n['id'] in ids and n['type'] in ('UNETLoader','CheckpointLoaderSimple') and n.get('mode',0)==0]
    if len(roots)!=1:raise ValueError('Cannot choose an unambiguous model source for a new LoRA chain.')
    root=roots[0];clip_link=incoming(w,h3,'clip')
    clip_node=next((n for n in w['nodes'] if clip_link and n['id']==clip_link[1]),None)
    if clip_node and (clip_node['type']==POWER or clip_node['type'] in STANDARD) and any(o.get('type')=='MODEL' for o in clip_node.get('outputs',[])):
        root=clip_node
    model_slot=next((i for i,v in enumerate(root['outputs']) if v.get('type')=='MODEL'),None)
    model_links=[l for l in w['links'] if l[1]==root['id'] and l[2]==model_slot and l[3] in ids]
    if not model_links or not clip_link:raise ValueError('The model and CLIP must be connected for a new LoRA chain.')
    model=(root['id'],model_slot);clip=(clip_link[1],clip_link[2]);clip_links=[l for l in w['links'] if l[1]==clip[0] and l[2]==clip[1] and l[3] in ids and l[5]=='CLIP']
    if root['id'] in ancestors(w,[clip[0]]) and root['id']!=clip[0]:raise ValueError('This split model/CLIP chain needs manual LoRA insertion in ComfyUI.')
    next_id=max(n['id'] for n in w['nodes'])+1;next_link=max([l[0] for l in w['links']]+[0])+1
    def link(source,slot,dest,dest_slot,kind):
        nonlocal next_link
        w['links'].append([next_link,source,slot,dest,dest_slot,kind]);next_link+=1
    for i,r in enumerate(rows):
        node={'id':next_id,'type':'LoraLoader','pos':[100+i*360,-400],'size':[330,180],'flags':{},'order':len(w['nodes']),'mode':0,'inputs':[{'name':'model','type':'MODEL','link':None},{'name':'clip','type':'CLIP','link':None}],'outputs':[{'name':'MODEL','type':'MODEL','links':[]},{'name':'CLIP','type':'CLIP','links':[]}],'properties':{'Node name for S&R':'LoraLoader'},'widgets_values':[r['name'],r['strength'] if r['on'] else 0,(r['strength'] if r['clip'] is None else r['clip']) if r['on'] else 0],'title':'Scene Planner · LoRA · '+r['name']}
        w['nodes'].append(node);link(*model,next_id,0,'MODEL');link(*clip,next_id,1,'CLIP');model=(next_id,0);clip=(next_id,1);next_id+=1
    for l in model_links:l[1],l[2]=model
    for l in clip_links:l[1],l[2]=clip
