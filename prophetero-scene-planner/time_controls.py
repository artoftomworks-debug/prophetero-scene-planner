"""Synchronize only recognized, exclusively owned source time/size controls."""
from .source_settings import incoming, ancestors

def sync_controls(original,result,h3,create,width,height,frames,seconds):
    old={n['id']:n for n in original['nodes']};new={n['id']:n for n in result['nodes']};changes=[]
    original_h3=old[h3['id']];original_create=old[create['id']]
    def value(node,value):
        raw=node.get('widgets_values',[])
        if isinstance(raw,dict):raw['value']=value
        elif isinstance(raw,list) and raw:raw[0]=value
    def exclusive(ids,targets):
        return all(l[3] in ids or l[3] in targets for l in original['links'] if l[1] in ids)
    def sync_direct(name,val):
        edge=incoming(original,original_h3,name)
        if not edge:return
        n=old[edge[1]]
        if n['type']=='PrimitiveInt' and exclusive({n['id']},{h3['id']}):
            value(new[n['id']],val);changes.append(dict(nodeId=n['id'],field=name,value=val))
    sync_direct('width',width);sync_direct('height',height)
    edge=incoming(original,original_h3,'length')
    if edge:
        ids=ancestors(original,[edge[1]])
        fps_edge=incoming(original,original_create,'fps')
        if fps_edge:ids.update(ancestors(original,[fps_edge[1]]))
        if exclusive(ids,{h3['id'],create['id']}):
            for ident in ids:
                n=old[ident];target=new[ident]
                if n['type'] not in ('PrimitiveInt','PrimitiveFloat'):continue
                # Infer roles from exact supported math inputs, not node titles.
                usage=[(old[l[3]],l[4]) for l in original['links'] if l[1]==ident and l[3] in ids]
                role=None
                for dest,slot in usage:
                    raw=dest.get('widgets_values',[]);expr=raw.get('expression') if isinstance(raw,dict) else raw[0] if raw else ''
                    field=dest.get('inputs',[])[slot]['name']
                    if ''.join(str(expr).split())=='max(5,floor((a*b-5)/17+0.5)*17+5)':role='seconds' if field=='values.a' else 'fps' if field=='values.b' else role
                if ident==edge[1]:role='length'
                if role=='seconds':
                    # The stale computation is now disconnected from the active
                    # length. Use a native float so fractional true seconds show.
                    target['type']='PrimitiveFloat';target.setdefault('properties',{})['Node name for S&R']='PrimitiveFloat';target['widgets_values']=[seconds]
                    for entry in target.get('inputs',[]):
                        if entry['name']=='value':entry['type']='FLOAT'
                    for out in target['outputs']:out['type']='FLOAT';out['name']='FLOAT'
                    for l in result['links']:
                        if l[1]==ident:l[5]='FLOAT';new[l[3]]['inputs'][l[4]]['type']='FLOAT'
                    target['title']=f'Scene Planner · duration: {seconds:.6f} s · display'
                elif role=='fps':
                    value(target,24);target['title']='Scene Planner · fps: 24 · display'
                elif role=='length':
                    value(target,frames);target['title']=f'Scene Planner · length: {frames} frames · display'
                if role:changes.append(dict(nodeId=ident,field=role,value=seconds if role=='seconds' else 24 if role=='fps' else frames))
        else:
            # Shared controls stay intact; distinguish them visibly from the
            # active exported branch without affecting their other consumers.
            for ident in ids:
                if old[ident]['type'] in ('PrimitiveInt','PrimitiveFloat'):
                    new[ident]['title']='[SHARED / NOT exported video length] '+old[ident].get('title',str(ident))
    # A linked widget can still be serialized visibly by legacy frontends.
    raw=create.get('widgets_values',[])
    if isinstance(raw,dict):
        if 'fps' in raw:raw['fps']=24.0
    elif isinstance(raw,list) and len(raw)>=2 and raw[1]==8 and isinstance(raw[0],(int,float)):
        raw[0]=24.0
    return changes
