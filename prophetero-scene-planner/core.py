"""CPU-only H3 scene planning. All exports are copies; this module never queues work."""
from __future__ import annotations
import base64, copy, io, math, uuid
from PIL import Image, ImageOps

from .canvas import PRESETS, canvas_size
from .source_settings import manifest as lora_manifest, overview, apply_loras
from .time_controls import sync_controls
MAX_IMAGE = 16 * 1024 * 1024

def number(value, low, high):
    if isinstance(value, bool): raise ValueError('Invalid numeric value.')
    value = float(value)
    if not math.isfinite(value) or not low <= value <= high: raise ValueError('Numeric value outside the supported range.')
    return value

def timing(seconds):
    seconds = number(seconds, 1, 15)
    frames = max(5, 5 + math.floor((seconds * 24 - 5) / 17 + .5) * 17)
    return frames, frames / 24

def image_from_url(value):
    if not isinstance(value, str) or not value.startswith(('data:image/png;base64,', 'data:image/jpeg;base64,', 'data:image/webp;base64,')):
        raise ValueError('Choose a PNG, JPEG or WebP image.')
    if len(value) > MAX_IMAGE * 4 // 3 + 100: raise ValueError('Image limit: 16 MiB.')
    try:
        raw = base64.b64decode(value.split(',', 1)[1], validate=True)
        with Image.open(io.BytesIO(raw)) as src:
            if src.width * src.height > 24_000_000: raise ValueError('Image limit: 24 megapixels.')
            if getattr(src, 'n_frames', 1) != 1: raise ValueError('Use a still image, not an animation.')
            src.load()
            src = ImageOps.exif_transpose(src).convert('RGBA')
            bg = Image.new('RGBA', src.size, 'white'); bg.alpha_composite(src)
            return bg.convert('RGB')
    except (OSError, Image.DecompressionBombError) as e: raise ValueError('The image cannot be decoded.') from e

def fitted_image(image, settings, size):
    mode = settings.get('fit', 'cover')
    if mode not in ('cover', 'contain', 'stretch'): raise ValueError('Unknown image fitting mode.')
    x, y = number(settings.get('x', .5), 0, 1), number(settings.get('y', .5), 0, 1)
    width, height = size
    if mode == 'stretch': return image.resize(size, Image.Resampling.LANCZOS)
    factor = (max if mode == 'cover' else min)(width / image.width, height / image.height)
    # Same round-half-up geometry as the browser preview.
    w, h = max(1, math.floor(image.width * factor + .5)), max(1, math.floor(image.height * factor + .5))
    resized = image.resize((w, h), Image.Resampling.LANCZOS)
    if mode == 'contain':
        color = settings.get('background', '#101820')
        if not isinstance(color, str) or len(color) != 7 or color[0] != '#' or any(c not in '0123456789abcdefABCDEF' for c in color[1:]): raise ValueError('Invalid background color.')
        canvas = Image.new('RGB', size, color)
        canvas.paste(resized, (math.floor((width-w)/2+.5), math.floor((height-h)/2+.5)))
        return canvas
    left, top = math.floor((w-width)*x+.5), math.floor((h-height)*y+.5)
    return resized.crop((left, top, left+width, top+height))

H3_FIELDS = ('prompt','width','height','length')

def widget_value(node,name,index,default=None):
    raw=node.get('widgets_values',[])
    return raw.get(name,default) if isinstance(raw,dict) else raw[index] if isinstance(raw,list) and len(raw)>index else default

def h3_widget_fields(node):
    """Read both legacy arrays and named/compact frontend serialization.

    Newer frontends can omit widgets converted into linked inputs. UI-only
    buttons may leave null placeholders. Neither is a generation parameter.
    """
    raw=node.get('widgets_values')
    if isinstance(raw,dict):
        if not isinstance(raw.get('prompt'),str): raise ValueError('The H3 prompt field could not be read.')
        return {key:raw[key] for key in H3_FIELDS if key in raw}, {key:key for key in H3_FIELDS if key in raw}
    if not isinstance(raw,list): raise ValueError('The H3 prompt fields could not be read.')
    linked={entry['name'] for entry in node.get('inputs',[]) if entry.get('link') is not None}
    compact=[key for key in H3_FIELDS if key not in linked]
    # Full legacy arrays are unambiguous only when all four field types match.
    if len(raw)>=4 and isinstance(raw[0],str) and all(isinstance(v,(int,float)) and not isinstance(v,bool) for v in raw[1:4]) and all(v is None or v=='' for v in raw[4:]):
        names=list(H3_FIELDS)
    elif len(raw)>=len(compact) and all(v is None or v=='' for v in raw[len(compact):]): names=compact
    else: raise ValueError('The H3 fields could not be matched by name. Save the workflow in ComfyUI and import it again.')
    values={name:raw[index] for index,name in enumerate(names)}
    if 'prompt' in values and not isinstance(values['prompt'],str): raise ValueError('The H3 prompt must be text.')
    return values,{name:index for index,name in enumerate(names)}

def h3_values(workflow,node):
    values,_=h3_widget_fields(node)
    by_id={n['id']:n for n in workflow['nodes']}
    def connected(target,name,seen=()):
        slot=next((i for i,v in enumerate(target.get('inputs',[])) if v['name']==name),None)
        link=next((l for l in workflow['links'] if l[3]==target['id'] and l[4]==slot),None)
        if not link:return None
        if link[1] in seen or len(seen)>12:raise ValueError('Cyclic H3 setting connection.')
        source=by_id[link[1]];widgets=source.get('widgets_values',[])
        if source['type'] in ('PrimitiveInt','PrimitiveFloat'):
            return widgets.get('value') if isinstance(widgets,dict) else widgets[0] if widgets else None
        if source['type']=='ComfyMathExpression':
            expr=widgets.get('expression') if isinstance(widgets,dict) else widgets[0] if widgets else ''
            expr=''.join(str(expr).split());a=connected(source,'values.a',(*seen,source['id']))
            if expr=='a':return a
            if expr=='max(5,floor((a*b-5)/17+0.5)*17+5)':
                b=connected(source,'values.b',(*seen,source['id']))
                if a is not None and b is not None:return max(5,math.floor((number(a,0,3600)*number(b,1,120)-5)/17+.5)*17+5)
        # Never evaluate arbitrary expressions or replace a live connection by a stale widget default.
        raise ValueError(f'Cannot read the linked H3 setting "{name}" from {source["type"]}. Use a standard numeric control.')
    result={}
    for key in H3_FIELDS:
        linked=any(i['name']==key and i.get('link') is not None for i in node.get('inputs',[]))
        value=connected(node,key) if linked else values.get(key)
        if key=='prompt':
            if not isinstance(value,str):raise ValueError('The H3 prompt must be literal text in this version.')
        else:
            value=number(value,5 if key=='length' else 32,3600 if key=='length' else 16384)
            if value!=int(value):raise ValueError(f'H3 {key} must be an integer.')
            value=int(value)
        result[key]=value
    return result

def validate_graph(workflow):
    if not isinstance(workflow, dict) or not isinstance(workflow.get('nodes'), list) or not isinstance(workflow.get('links'), list): raise ValueError('Choose a ComfyUI UI workflow JSON (nodes and links arrays).')
    if not 1 <= len(workflow['nodes']) <= 1500 or len(workflow['links']) > 6000: raise ValueError('Unsupported workflow size.')
    if not isinstance(workflow.get('definitions', {}), dict) or workflow.get('definitions', {}).get('subgraphs'): raise ValueError('Flatten subgraphs before importing this workflow.')
    nodes = workflow['nodes']
    if any(not isinstance(n,dict) for n in nodes): raise ValueError('Unsupported workflow node layout.')
    ids = [n.get('id') for n in nodes]
    if any(type(i) is not int or i < 0 for i in ids) or len(set(ids)) != len(ids): raise ValueError('Workflow node IDs must be unique integers.')
    h3 = [n for n in nodes if n.get('type') == 'MiniMaxH3ImageToVideo']
    if len(h3) != 1: raise ValueError('This version supports exactly one MiniMaxH3ImageToVideo node. Use a Simple or Pro H3 workflow.')
    for link in workflow['links']:
        if not isinstance(link, list) or len(link) != 6: raise ValueError('Unsupported workflow link format.')
    if len({l[0] for l in workflow['links']}) != len(workflow['links']): raise ValueError('Duplicate workflow link IDs.')
    by_id = {n['id']: n for n in nodes}
    for node in nodes:
        if not isinstance(node.get('inputs',[]),list) or not isinstance(node.get('outputs',[]),list) or any(not isinstance(x,dict) or not isinstance(x.get('name'),str) for x in node.get('inputs',[])) or any(not isinstance(x,dict) for x in node.get('outputs',[])):
            raise ValueError('Unsupported workflow node layout.')
    for link in workflow['links']:
        _, source, source_slot, target, target_slot, _ = link
        if source not in by_id or target not in by_id or type(source_slot) is not int or type(target_slot) is not int or source_slot < 0 or target_slot < 0: raise ValueError('Broken workflow link.')
        if source_slot >= len(by_id[source].get('outputs', [])) or target_slot >= len(by_id[target].get('inputs', [])): raise ValueError('Broken workflow connection slot.')
    h3_values(workflow,h3[0])
    return h3[0]

def describe(workflow):
    h3 = validate_graph(workflow)
    values=h3_values(workflow,h3)
    width,height=int(values['width']),int(values['height'])
    preset=next((key for key,size in PRESETS.items() if size==(width,height)),'custom')
    return {'node': h3['id'], 'family':'H3','loras':lora_manifest(workflow,h3),'settings':overview(workflow,h3), 'prompt': values['prompt'], 'models': [str(widget_value(n,'unet_name',0,'')) for n in workflow['nodes'] if n.get('type') == 'UNETLoader'], 'name': str(workflow.get('id', 'Imported H3 workflow')), 'preset':preset, 'customWidth':width, 'customHeight':height, 'seconds':max(1,min(15,values['length']/24))}

def assemble_prompt(base, events, duration):
    base = str(base).strip()
    if len(base) > 16000: raise ValueError('Prompt is too long.')
    rows = []
    if len(events) > 12: raise ValueError('At most 12 scene events.')
    for event in sorted(events, key=lambda e: float(e.get('time', 0))):
        t = number(event.get('time', 0), 0, duration)
        text = str(event.get('text', '')).strip()
        if len(text) > 1000: raise ValueError('An event is too long.')
        if text: rows.append(f'Around {t:.2f} seconds: {text}')
    return base + ('\n\nScene progression (approximate timing):\n' + '\n'.join(rows) if rows else '')

def export_workflow(original, plan, prepared_paths, lora_catalog=None):
    """Patch a copy, bypassing existing crop/guide controls on the selected H3 branch."""
    target = validate_graph(original)
    width, height = canvas_size(plan)
    frames, duration = timing(plan.get('seconds', 8))
    from .audio_direction import direction, compose
    audio=direction(plan.get('audio'))
    resource_profile=plan.get('resource_profile','auto')
    if resource_profile not in ('auto','low','balanced','full'):raise ValueError('Unknown resource profile.')
    prompt = compose(str(plan.get('prompt', '')).strip(),audio)
    if not prompt or len(prompt) > 24000: raise ValueError('Provide a scene prompt (up to 24,000 characters).')
    images = plan.get('images', [])
    if not 1 <= len(images) <= 6 or len(prepared_paths) != len(images): raise ValueError('Choose a start image and up to five further key images.')
    roles = [i.get('role') for i in images]
    if roles.count('start') != 1 or roles.count('end') > 1 or any(r not in ('start', 'guide', 'end') for r in roles): raise ValueError('Use exactly one start image and at most one end image.')
    guides = []
    for index, item in enumerate(images):
        if item['role'] == 'guide':
            frame = math.floor(number(item.get('time'), 0, duration) * 24 + .5)
            if not 0 < frame < frames-1: raise ValueError('Intermediate images must be between the first and last frames.')
            guides.append((frame, index))
    if len({f for f, _ in guides}) != len(guides): raise ValueError('Two guide images cannot use the same frame.')
    w = copy.deepcopy(original); h3 = next(n for n in w['nodes'] if n['id'] == target['id'])
    lora_changes=apply_loras(w,h3,plan.get('loraEdits'),lora_catalog)
    by_id = {n['id']: n for n in w['nodes']}
    next_id = max(by_id) + 1
    next_link = max([l[0] for l in w['links']] + [0]) + 1
    def pair(value,default):
        if isinstance(value,(list,tuple)) and len(value)>=2:return float(value[0]),float(value[1])
        if isinstance(value,dict) and '0' in value and '1' in value:return float(value['0']),float(value['1'])
        return default
    bottom=0
    for n in w['nodes']:
        _,y=pair(n.get('pos'),(0,0));_,height_n=pair(n.get('size'),(330,180));bottom=max(bottom,y+height_n)
    for group in w.get('groups',[]):
        bounds=group.get('bounding',[])
        if isinstance(bounds,list) and len(bounds)==4:bottom=max(bottom,float(bounds[1])+float(bounds[3]))
    new_top=bottom+200;new_nodes=[]
    def input_index(node, name):
        return next((i for i, v in enumerate(node.get('inputs', [])) if v['name'] == name), None)
    def disconnect(node, name):
        slot = input_index(node, name)
        if slot is None: return
        w['links'][:] = [l for l in w['links'] if not (l[3] == node['id'] and l[4] == slot)]
        node['inputs'][slot]['link'] = None
    def connect(source, slot, dest, name, kind):
        nonlocal next_link
        idx = input_index(dest, name)
        if idx is None:
            entry={'name': name, 'type': kind, 'link': None}
            if dest is h3 and name in H3_FIELDS:entry['widget']={'name':name}
            dest.setdefault('inputs', []).append(entry); idx = len(dest['inputs'])-1
        disconnect(dest, name)
        w['links'].append([next_link, source['id'], slot, dest['id'], idx, kind]); next_link += 1
    def make(kind, widgets, inputs, outputs, title):
        nonlocal next_id
        index=len(new_nodes)
        node = {'id': next_id, 'type': kind, 'pos': [100+index%3*460, new_top+index//3*500], 'size': [410, 430 if kind in ('LoadImage','Note') else 180], 'flags': {}, 'order': len(w['nodes']), 'mode': 0, 'inputs': [{'name': n, 'type': t, 'link': None} for n,t in inputs], 'outputs': [{'name': n, 'type': t, 'links': []} for n,t in outputs], 'properties': {'Node name for S&R': kind}, 'widgets_values': widgets, 'title': title}
        next_id += 1; w['nodes'].append(node);new_nodes.append(node);by_id[node['id']] = node; return node
    # Resolve the original VAE before making connections.
    vae_slot = input_index(h3, 'vae')
    vae_link = next((l for l in w['links'] if l[3] == h3['id'] and l[4] == vae_slot), None)
    if not vae_link: raise ValueError('The H3 video VAE must be connected.')
    vae_node = by_id[vae_link[1]]
    # Find only BasicGuiders downstream from this H3 conditioning output.
    reached = {h3['id']}; changed = True
    while changed:
        changed = False
        for l in w['links']:
            if l[1] in reached and l[5] == 'CONDITIONING' and l[3] not in reached: reached.add(l[3]); changed = True
    guiders = [n for n in w['nodes'] if n['id'] in reached and n['type'] == 'BasicGuider']
    if not guiders: raise ValueError('No standard BasicGuider found on this H3 conditioning branch.')
    # Native nodes support converted widget inputs. New constants leave old shared controls alone.
    _,field_positions=h3_widget_fields(h3)
    for key,value in {'prompt':prompt,'width':width,'height':height,'length':frames}.items():
        if key in field_positions:h3['widgets_values'][field_positions[key]]=value
    for name, value in [('width', width), ('height', height), ('length', frames)]:
        constant = make('PrimitiveInt', [value, 'fixed'], [], [('INT', 'INT')], f'Scene Planner · {name}: {value}')
        connect(constant, 0, h3, name, 'INT')
    disconnect(h3, 'first_frame'); disconnect(h3, 'last_frame')
    loaders = {}
    for index, (item, path) in enumerate(zip(images, prepared_paths)):
        loader = make('LoadImage', [path, 'image'], [], [('IMAGE','IMAGE'),('MASK','MASK')], f'Scene Planner · {item["role"]} · {index+1}')
        loaders[index] = loader
        if item['role'] in ('start', 'end'): connect(loader, 0, h3, 'first_frame' if item['role']=='start' else 'last_frame', 'IMAGE')
    conditioning = h3
    for frame, index in sorted(guides):
        guide = make('MiniMaxH3AddGuide', [frame], [('positive','CONDITIONING'),('vae','VAE'),('latent','LATENT'),('image','IMAGE')], [('positive','CONDITIONING')], f'Scene Planner · {frame/24:.2f}s · frame {frame}')
        connect(conditioning, 0, guide, 'positive', 'CONDITIONING'); connect(vae_node, vae_link[2], guide, 'vae', 'VAE'); connect(h3, 1, guide, 'latent', 'LATENT'); connect(loaders[index], 0, guide, 'image', 'IMAGE')
        conditioning = guide
    for guider in guiders: connect(conditioning, 0, guider, 'conditioning', 'CONDITIONING')
    # Find video saving branch via LATENT -> IMAGE -> VIDEO, not unrelated branches.
    branch = {h3['id']}; changed = True
    while changed:
        changed = False
        for l in w['links']:
            if l[1] in branch and l[3] not in branch: branch.add(l[3]); changed = True
    creates = [n for n in w['nodes'] if n['id'] in branch and n['type'] == 'CreateVideo']
    if len(creates) != 1: raise ValueError('A single standard CreateVideo output is required.')
    create = creates[0]
    fps = make('PrimitiveFloat', [24.0], [], [('FLOAT','FLOAT')], 'Scene Planner · fps: 24')
    connect(fps, 0, create, 'fps', 'FLOAT')
    control_changes=sync_controls(original,w,h3,create,width,height,frames,duration)
    make('PrimitiveFloat',[duration],[],[('FLOAT','FLOAT')],f'Scene Planner · actual duration: {duration:.6f} s · {frames} frames')
    note_texts={
        'EN':'EXPORTED VIDEO LENGTH: {seconds:.3f} s = {frames} frames / 24 fps.\n\nThe Scene Planner length node controls this video. The old Duration / seconds control is no longer connected to this output length.\n\nTo change the length: set Requested seconds in planner section 2, export again and load the NEW JSON. Existing exported files do not update automatically.',
        'HU':'EXPORTÁLT VIDEÓHOSSZ: {seconds:.3f} s = {frames} képkocka / 24 fps.\n\nEzt a videót a Scene Planner length node vezérli. A régi Duration / másodperc mező már nem ezt a kimeneti hosszt szabályozza.\n\nHossz módosítása: a tervező 2. részében állítsd a Kért másodperc mezőt, ments új JSON-t, és az ÚJ JSON-t töltsd be. A korábbi export nem frissül magától.',
        'DE':'EXPORTIERTE VIDEOLÄNGE: {seconds:.3f} s = {frames} Bilder / 24 fps.\n\nDer Scene Planner length-Node steuert die Länge. Das alte Duration-Feld ist nicht mehr damit verbunden. Gewünschte Sekunden im Planer ändern, erneut exportieren und die NEUE JSON laden.',
        'FR':'DURÉE VIDÉO EXPORTÉE : {seconds:.3f} s = {frames} images / 24 fps.\n\nLe nœud Scene Planner length contrôle la durée. L’ancien champ Duration n’est plus lié à cette durée. Modifiez les secondes dans le planificateur, exportez à nouveau et chargez le NOUVEAU JSON.',
        'ES':'DURACIÓN EXPORTADA: {seconds:.3f} s = {frames} fotogramas / 24 fps.\n\nEl nodo Scene Planner length controla la duración. El antiguo campo Duration ya no la controla. Cambia los segundos en el planificador, exporta de nuevo y carga el NUEVO JSON.',
        'IT':'DURATA ESPORTATA: {seconds:.3f} s = {frames} fotogrammi / 24 fps.\n\nIl nodo Scene Planner length controlla la durata. Il vecchio campo Duration non la controlla più. Cambia i secondi nel pianificatore, esporta di nuovo e carica il NUOVO JSON.',
        'PT':'DURAÇÃO EXPORTADA: {seconds:.3f} s = {frames} fotogramas / 24 fps.\n\nO nó Scene Planner length controla a duração. O antigo campo Duration já não a controla. Altere os segundos no planeador, exporte novamente e carregue o NOVO JSON.',
        'PL':'DŁUGOŚĆ EKSPORTU: {seconds:.3f} s = {frames} klatek / 24 fps.\n\nWęzeł Scene Planner length steruje długością. Stare pole Duration już nią nie steruje. Zmień sekundy w planerze, eksportuj ponownie i wczytaj NOWY JSON.'}
    text=note_texts.get(plan.get('language','EN'),note_texts['EN']).format(seconds=duration,frames=frames)
    make('Note',[text],[],[],'Scene Planner · READ FIRST · exported video length')
    for node in w['nodes']:
        if node['id'] in branch and node['type'] == 'SaveVideo':
            raw=node.get('widgets_values',[])
            if isinstance(raw,dict) and isinstance(raw.get('filename_prefix'),str):raw['filename_prefix']='Prophetero/ScenePlanner/Scene'
            elif isinstance(raw,list) and raw and isinstance(raw[0],str):raw[0]='Prophetero/ScenePlanner/Scene'
        for entry in node.get('inputs', []): entry['link'] = None
        for entry in node.get('outputs', []): entry['links'] = []
    for link in w['links']:
        ident, source, slot, dest, target_slot, _ = link
        by_id[source]['outputs'][slot]['links'].append(ident); by_id[dest]['inputs'][target_slot]['link'] = ident
    w['last_node_id'] = next_id-1; w['last_link_id'] = next_link-1; w['id'] = str(uuid.uuid4()); w['revision'] = 0
    w.setdefault('extra', {})['prophetero_scene_planner'] = {'version':'0.2.0', 'fps':24, 'frames':frames, 'seconds':duration,'requested_seconds':float(plan.get('seconds',8)),'width':width,'height':height,'lora_changes':lora_changes,'control_changes':control_changes, 'events':plan.get('events', []), 'audio_direction':audio, 'resource_profile':resource_profile, 'note':'Text event timing is guidance, not guaranteed motion control.'}
    w['extra']['ue_links'] = []
    w.setdefault('groups',[]).append({'title':'Scene Planner · prepared images and keyframes','bounding':[60,new_top-90,1390,math.ceil(len(new_nodes)/3)*500+100],'color':'#315765','font_size':28,'flags':{}})
    w['extra']['ds']={'scale':.8,'offset':[0,-new_top+140]}
    validate_graph(w)
    return w
