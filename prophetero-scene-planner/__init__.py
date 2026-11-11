"""Prophetero Scene Planner: local image fitting + H3 keyframe workflow copies."""
from __future__ import annotations
import asyncio, json, re, shutil, uuid
from pathlib import Path
from urllib.parse import urlsplit
from aiohttp import web
import folder_paths
from server import PromptServer
from .resource_policy import assess
from .canvas import canvas_size
from .core import PRESETS, describe, export_workflow, fitted_image, image_from_url, widget_value

WEB_DIRECTORY = './web'
HERE = Path(__file__).resolve().parent
ASSETS = {'lora-panel.mjs','translator.mjs','audio-plan.mjs','resource-ui.mjs','planner.mjs','planner-model.mjs','planner-labels.mjs','planner.css'}
TEMPLATES = {'dasiwa-simple','dasiwa-pro','eros-simple','eros-pro'}

def origin(request):
    value = request.headers.get('Origin')
    if value:
        parsed = urlsplit(value)
        if parsed.scheme not in ('http','https') or parsed.netloc.lower() != request.host.lower(): raise web.HTTPForbidden(text='Use the local ComfyUI page.')
    elif request.remote not in ('127.0.0.1','::1',None): raise web.HTTPForbidden(text='Use the local ComfyUI page.')

def root(): return Path(folder_paths.get_output_directory()).resolve() / 'Prophetero' / 'ScenePlanner'

def project_path(ident):
    if not isinstance(ident, str) or not re.fullmatch('[a-f0-9]{32}', ident): raise ValueError('Invalid project ID.')
    return root() / 'Projects' / (ident+'.json')

def load(ident):
    try: return json.loads(project_path(ident).read_text(encoding='utf-8'))
    except FileNotFoundError as e: raise ValueError('This source snapshot is no longer available. Import the workflow again.') from e

def prepared_image(value):
    if not isinstance(value,str) or not re.fullmatch(r'PropheteroScenePlanner/[a-f0-9]{32}/0[1-6]\.png',value): return None
    base=Path(folder_paths.get_input_directory()).resolve();prepared=(base/'PropheteroScenePlanner').resolve();path=(base/value).resolve()
    if not prepared.is_relative_to(base) or not path.is_relative_to(prepared) or not path.is_file(): return None
    return path

@PromptServer.instance.routes.get('/prophetero_scene_planner/prepared-image')
async def check_prepared_image(request):
    origin(request);value=request.query.get('image','')
    if not prepared_image(value): return web.json_response({'error':'Prepared image not found. Export the scene again.'},status=404)
    return web.json_response({'image':value,'exists':True})

@PromptServer.instance.routes.get('/prophetero_scene_planner/prepared-images')
async def list_prepared_images(request):
    origin(request);base=Path(folder_paths.get_input_directory()).resolve();parent=base/'PropheteroScenePlanner';result=[]
    if parent.is_dir() and parent.resolve().is_relative_to(base):
        directories=sorted((p for p in parent.iterdir() if p.is_dir() and re.fullmatch('[a-f0-9]{32}',p.name)),key=lambda p:p.stat().st_mtime,reverse=True)[:200]
        for directory in directories:
            for index in range(1,7):
                value=f'PropheteroScenePlanner/{directory.name}/{index:02d}.png'
                if prepared_image(value):result.append(value)
                if len(result)>=512:return web.json_response({'images':result})
    return web.json_response({'images':result})

async def body(request, limit=3*1024**2):
    origin(request)
    if request.content_type != 'application/json': raise ValueError('JSON required.')
    data = bytearray()
    async for chunk in request.content.iter_chunked(65536):
        data.extend(chunk)
        if len(data) > limit: raise ValueError('Request too large.')
    value = json.loads(data)
    if not isinstance(value, dict): raise ValueError('Expected an object.')
    return value

@PromptServer.instance.routes.get('/prophetero_scene_planner/resources')
async def resources(request):
    origin(request)
    try:return web.json_response(await asyncio.to_thread(assess,request.query.get('profile','auto')))
    except ValueError as e:return web.json_response({'error':str(e)},status=400)

@PromptServer.instance.routes.get('/prophetero_scene_planner/loras')
async def loras(request):
    origin(request)
    try:return web.json_response({'files':await asyncio.to_thread(folder_paths.get_filename_list,'loras')})
    except (OSError,AttributeError) as e:return web.json_response({'error':'Local LoRA catalog unavailable. Existing source LoRAs can still be kept.'},status=400)

@PromptServer.instance.routes.get('/prophetero_scene_planner/studio')
async def studio(request):
    origin(request)
    response = web.FileResponse(HERE/'web'/'planner.html')
    response.headers['Cache-Control']='no-store'
    response.headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'self'; object-src 'none'"
    return response

@PromptServer.instance.routes.get('/prophetero_scene_planner/assets/{name}')
async def asset(request):
    origin(request); name=request.match_info['name']
    if name not in ASSETS: raise web.HTTPNotFound()
    response=web.FileResponse(HERE/'web'/name); response.headers['Cache-Control']='no-store'; return response

@PromptServer.instance.routes.post('/prophetero_scene_planner/source')
async def source(request):
    try:
        data=await body(request)
        if data.get('template'):
            if data['template'] not in TEMPLATES: raise ValueError('Unknown template.')
            workflow=json.loads((HERE/'templates'/(data['template']+'.json')).read_text(encoding='utf-8-sig'))
        else: workflow=data.get('workflow')
        summary=describe(workflow); ident=uuid.uuid4().hex
        path=project_path(ident); path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(workflow,ensure_ascii=False),encoding='utf-8')
        return web.json_response({'id':ident,**summary,'workflow':workflow})
    except (ValueError,TypeError,KeyError,OSError) as e: return web.json_response({'error':str(e)},status=400)

@PromptServer.instance.routes.get('/prophetero_scene_planner/source/{id}')
async def get_source(request):
    origin(request)
    try:
        workflow=load(request.match_info['id'])
        return web.json_response({'id':request.match_info['id'], **describe(workflow),'workflow':workflow})
    except (ValueError,OSError) as e: return web.json_response({'error':str(e)},status=400)

def source_image(workflow, role):
    h3=next(n for n in workflow['nodes'] if n['type']=='MiniMaxH3ImageToVideo')
    node=h3; name='first_frame' if role=='start' else 'last_frame'
    for _ in range(12):
        idx=next((i for i,v in enumerate(node.get('inputs',[])) if v['name']==name),None)
        link=next((l for l in workflow['links'] if l[3]==node['id'] and l[4]==idx),None)
        if not link: return None
        node=next(n for n in workflow['nodes'] if n['id']==link[1])
        if node['type'] in ('LoadImage','LoadImageWithSwitch'):
            filename=str(widget_value(node,'image',0,'')).replace('\\','/')
            if filename.endswith(' [input]'): filename=filename[:-8]
            base=Path(folder_paths.get_input_directory()).resolve(); path=(base/filename).resolve()
            if not path.is_relative_to(base) or not path.is_file() or path.suffix.lower() not in ('.png','.jpg','.jpeg','.webp'): return None
            if path.stat().st_size > 16*1024**2: return None
            return path
        if node['type'] not in ('ImageScale','ImageScaleBy'): return None
        name='image'
    return None

@PromptServer.instance.routes.get('/prophetero_scene_planner/image/{id}/{role}')
async def get_image(request):
    origin(request)
    if request.match_info['role'] not in ('start','end'): raise web.HTTPNotFound()
    try: path=source_image(load(request.match_info['id']),request.match_info['role'])
    except (ValueError,KeyError,OSError): path=None
    if not path: raise web.HTTPNotFound()
    response=web.FileResponse(path);response.headers['Cache-Control']='no-store';return response

def build(data):
    original=load(data.get('id'));plan=data.get('plan')
    if not isinstance(plan,dict): raise ValueError('Invalid scene plan.')
    size=canvas_size(plan)
    images=plan.get('images',[])
    if not isinstance(images,list) or not 1<=len(images)<=6: raise ValueError('Choose one to six images.')
    ident=uuid.uuid4().hex
    base=Path(folder_paths.get_input_directory()).resolve();dest=base/'PropheteroScenePlanner'/ident
    output=root()/'Exports';output.mkdir(parents=True,exist_ok=True)
    paths=[f'PropheteroScenePlanner/{ident}/{i+1:02d}.png' for i in range(len(images))]
    # Validate the entire graph and plan before creating prepared-image files.
    catalog=set(folder_paths.get_filename_list('loras')) if plan.get('loraEdits') else None
    result=export_workflow(original,plan,paths,catalog)
    prepared=[fitted_image(image_from_url(item.get('data')),item,size) for item in images]
    dest.mkdir(parents=True,exist_ok=False)
    try:
        for i,image in enumerate(prepared): image.save(dest/f'{i+1:02d}.png')
        target=output/f'ScenePlanner_{ident}.json'
        target.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    except Exception:
        if dest.resolve().is_relative_to((base/'PropheteroScenePlanner').resolve()): shutil.rmtree(dest)
        raise
    return {'workflow':result,'path':str(target),'images':len(paths),'canvas':list(size)}

@PromptServer.instance.routes.post('/prophetero_scene_planner/export')
async def export(request):
    try:
        data=await body(request,48*1024**2)
        result=await asyncio.to_thread(build,data)
        return web.json_response(result)
    except (ValueError,TypeError,KeyError,OSError) as e: return web.json_response({'error':str(e)},status=400)

class PropheteroScenePlanner:
    @classmethod
    def INPUT_TYPES(cls): return {'required':{'language':(['EN','HU','DE','FR','ES','IT','PT','PL'],)}}
    RETURN_TYPES=('STRING',)
    RETURN_NAMES=('planner_url',)
    FUNCTION='open_info'
    CATEGORY='Prophetero/Planning'
    DESCRIPTION='Open the separate Scene Planner using the button. No generation is started.'
    def open_info(self,language): return (f'/prophetero_scene_planner/studio?language={language}',)

NODE_CLASS_MAPPINGS={'PropheteroScenePlanner':PropheteroScenePlanner}
NODE_DISPLAY_NAME_MAPPINGS={'PropheteroScenePlanner':'Prophetero · Scene Planner'}


def _is_generating():
    queue=getattr(PromptServer.instance,'prompt_queue',None)
    if queue is None:return False
    running,pending=queue.get_current_queue()
    return bool(running or pending)

from .translation import register as _register_translation
_register_translation(PromptServer.instance.routes,origin,body,_is_generating)
