import asyncio,importlib.util,json,pathlib,sys,types,unittest
from aiohttp import web,ClientSession
ROOT=pathlib.Path(__file__).resolve().parents[1];P=ROOT/'prophetero-scene-planner'
pkg=types.ModuleType('translate_test');pkg.__path__=[str(P)];sys.modules[pkg.__name__]=pkg
from translate_test import translation as tr

HARDWARE=dict(ram_free_mib=18000,ram_total_mib=32768,gpus=[dict(index=0,total_mib=12282,free_mib=10000,usage=0)])

class TranslationUnit(unittest.TestCase):
    def test_protected_numbers_and_tags(self):
        original='Eső 24 fps, 1088 × 608, CFG 1.5, <lora:rain:0.8>, model.safetensors.\n[SCENE AUDIO]6 dB[/SCENE AUDIO]'
        protected,tokens=tr.protect(original);self.assertNotIn('24 fps',protected);self.assertEqual(tr.restore(protected,tokens),original)
        with self.assertRaises(ValueError):tr.restore(protected.replace(tokens[0][0],''),tokens)
        with self.assertRaises(ValueError):tr.restore(protected+tokens[0][0],tokens)
    def test_resource_and_remote_guards(self):
        tr.guard(HARDWARE,2*1024**3)
        cpu=dict(HARDWARE,gpus=[]);tr.guard(cpu,2*1024**3,True)
        with self.assertRaises(ValueError):tr.guard(cpu,2*1024**3)
        with self.assertRaises(ValueError):tr.guard(dict(HARDWARE,ram_free_mib=100),2*1024**3,True)
        self.assertEqual(tr.local_models({'models':[{'name':'local','size':20},{'name':'other:cloud'},{'name':'remote','remote_host':'x'}]}),[{'name':'local','size':20}])

class TranslationHTTP(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.calls=[];self.busy=False;self.drop_tokens=False;self.slow=False
        async def tags(r):return web.json_response({'models':[{'name':'local:test','size':2*1024**3},{'name':'remote:cloud','remote_host':'cloud'}]})
        async def show(r):return web.json_response({'capabilities':['completion']})
        async def chat(r):
            data=await r.json();self.calls.append(data)
            if self.slow:await asyncio.sleep(.2)
            text=data['messages'][1]['content'].replace('Eső','Rain')
            if self.drop_tokens:text='Model output lost all numbers.'
            return web.json_response({'message':{'content':json.dumps({'translation':text})},'done_reason':'stop'})
        app=web.Application();app.router.add_get('/api/tags',tags);app.router.add_post('/api/show',show);app.router.add_post('/api/chat',chat)
        self.ollama=web.AppRunner(app);await self.ollama.setup();site=web.TCPSite(self.ollama,'127.0.0.1',0);await site.start();tr.OLLAMA=f'http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}'
        self.old_snapshot=tr.snapshot;tr.snapshot=lambda:HARDWARE
        routes=web.RouteTableDef()
        def origin(r):
            if r.headers.get('Origin','http://'+r.host)!='http://'+r.host:raise web.HTTPForbidden()
        async def body(r,limit):
            origin(r);raw=await r.read()
            if len(raw)>limit:raise ValueError('Request too large')
            return json.loads(raw)
        tr.register(routes,origin,body,lambda:self.busy);app=web.Application();app.add_routes(routes);self.server=web.AppRunner(app);await self.server.setup();site=web.TCPSite(self.server,'127.0.0.1',0);await site.start();self.base=f'http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}/prophetero_scene_planner/'
        self.client=ClientSession()
    async def asyncTearDown(self):
        await self.client.close();await self.server.cleanup();await self.ollama.cleanup();tr.snapshot=self.old_snapshot
    def data(self):return dict(text='Eső 24 fps <lora:test:0.8>',language='EN',model='local:test',cpu=False)
    async def post(self,data):
        async with self.client.post(self.base+'translation',json=data) as r:return r.status,await r.json()
    async def test_actual_routes_and_no_auto_application(self):
        async with self.client.get(self.base+'translation/models') as r:self.assertEqual((await r.json())['models'][0]['name'],'local:test')
        status,data=await self.post(self.data());self.assertEqual(status,200);self.assertEqual(data['translation'],'Rain 24 fps <lora:test:0.8>')
        request=self.calls[0];self.assertEqual(request['keep_alive'],0);self.assertFalse(request['stream']);self.assertNotIn('images',str(request.keys()))
        self.assertEqual(self.data()['text'],'Eső 24 fps <lora:test:0.8>')
        self.assertEqual((await self.post(dict(self.data(),model='remote:cloud')))[0],400)
    async def test_busy_generation_bad_input_and_token_loss_are_blocked(self):
        self.busy=True;self.assertEqual((await self.post(self.data()))[0],400);self.assertEqual(self.calls,[])
        self.busy=False
        self.assertEqual((await self.post(dict(self.data(),text='a'*12001)))[0],400)
        self.drop_tokens=True;status,data=await self.post(self.data());self.assertEqual(status,400);self.assertIn('protected',data['error'])
        async with self.client.post(self.base+'translation',json=self.data(),headers={'Origin':'http://external.example'}) as r:self.assertEqual(r.status,403)
    async def test_single_translation_and_cpu_setting(self):
        self.slow=True;first=asyncio.create_task(self.post(dict(self.data(),cpu=True)))
        for _ in range(50):
            if self.calls:break
            await asyncio.sleep(.01)
        self.assertEqual((await self.post(self.data()))[0],400)
        self.assertEqual((await first)[0],200);self.assertEqual(self.calls[0]['options']['num_gpu'],0)

if __name__=='__main__':unittest.main(verbosity=2)
