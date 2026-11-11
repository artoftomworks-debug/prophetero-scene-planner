import copy, importlib.util, json, pathlib, unittest, sys, types
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
pkg=types.ModuleType('scene_test_pkg');pkg.__path__=[str(ROOT/'prophetero-scene-planner')];sys.modules[pkg.__name__]=pkg
spec=importlib.util.spec_from_file_location('scene_test_pkg.core',ROOT/'prophetero-scene-planner/core.py');core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)

def plan():
    return {'preset':'landscape','seconds':8,'prompt':'A stationary camera observes rain.','events':[],'images':[{'role':'start'},{'role':'guide','time':2},{'role':'guide','time':5},{'role':'end'}]}

class SceneTests(unittest.TestCase):
    def test_all_real_templates(self):
        for file in (ROOT/'prophetero-scene-planner/templates').glob('*.json'):
            with self.subTest(file=file.name):
                original=json.loads(file.read_text(encoding='utf-8-sig'));before=copy.deepcopy(original)
                result=core.export_workflow(original,plan(),['start.png','guide1.png','guide2.png','end.png'])
                self.assertEqual(original,before)
                by={n['id']:n for n in result['nodes']};old={n['id']:n for n in original['nodes']}
                for n in original['nodes']:
                    if n['type'] in ('UNETLoader','CLIPLoader','VAELoader','Power Lora Loader (rgthree)','RandomNoise','BasicScheduler','KSamplerSelect'):
                        self.assertEqual(by[n['id']]['widgets_values'],n['widgets_values'])
                target=next(n for n in result['nodes'] if n['type']=='MiniMaxH3ImageToVideo')
                self.assertEqual(target['widgets_values'],[plan()['prompt'],1344,768,192])
                new=[n for n in result['nodes'] if n['id'] not in old]
                self.assertEqual([n['widgets_values'][0] for n in new if n['type']=='MiniMaxH3AddGuide'],[48,120])
                for link in result['links']:
                    ident,source,slot,dest,target_slot,_=link
                    self.assertIn(ident,by[source]['outputs'][slot]['links']);self.assertEqual(by[dest]['inputs'][target_slot]['link'],ident)
                fps=next(n for n in result['nodes'] if n['type']=='CreateVideo')
                link=next(l for l in result['links'] if l[0]==next(i for i in fps['inputs'] if i['name']=='fps')['link'])
                self.assertEqual(by[link[1]]['type'],'PrimitiveFloat');self.assertEqual(by[link[1]]['widgets_values'],[24.0])
                core.validate_graph(result)
                new_ids={n['id'] for n in new}
                old_bottom=max(n['pos'][1]+n['size'][1] for n in original['nodes'])
                self.assertTrue(all(n['pos'][1]>old_bottom for n in new))
                for a in new:
                    for b in new:
                        if a is b:continue
                        self.assertTrue(a['pos'][0]+a['size'][0]<=b['pos'][0] or b['pos'][0]+b['size'][0]<=a['pos'][0] or a['pos'][1]+a['size'][1]<=b['pos'][1] or b['pos'][1]+b['size'][1]<=a['pos'][1])

    def test_crop_and_contain_pixels(self):
        source=Image.new('RGB',(300,100),'green');source.paste('red',(0,0,100,100));source.paste('blue',(200,0,300,100))
        for anchor,color in [(0,(255,0,0)),(.5,(0,128,0)),(1,(0,0,255))]:
            result=core.fitted_image(source,{'fit':'cover','x':anchor,'y':.5},(100,100));self.assertEqual(result.getpixel((50,50)),color)
        result=core.fitted_image(source,{'fit':'contain','background':'#ffffff'},(100,100))
        self.assertEqual(result.getpixel((50,0)),(255,255,255));self.assertEqual(result.getpixel((5,50)),(255,0,0));self.assertEqual(result.getpixel((95,50)),(0,0,255))
        self.assertEqual(core.fitted_image(source,{'fit':'stretch'},(80,120)).size,(80,120))

    def test_frontend_widget_layouts_and_live_connections(self):
        original=json.loads((ROOT/'prophetero-scene-planner/templates/dasiwa-pro.json').read_text(encoding='utf-8-sig'))
        for mode in ['compact','compact_button','legacy_button','named']:
            with self.subTest(mode=mode):
                w=copy.deepcopy(original);h3=next(n for n in w['nodes'] if n['type']=='MiniMaxH3ImageToVideo');raw=h3['widgets_values'][:]
                h3['widgets_values']={'prompt':raw[0],'width':32,'height':32,'length':5} if mode=='named' else [raw[0]] if mode=='compact' else [raw[0],None] if mode=='compact_button' else raw+[None]
                # Actual connected constants override old/stale hidden widget values.
                node=next(n for n in w['nodes'] if n['id']==22);node['widgets_values'][0]=1344
                node=next(n for n in w['nodes'] if n['id']==23);node['widgets_values'][0]=768
                node=next(n for n in w['nodes'] if n['id']==18);node['widgets_values'][0]=5
                video=next(n for n in w['nodes'] if n['type']=='CreateVideo');video['widgets_values']={'bit_depth':8,'codec':'none'} if mode=='named' else [8]
                summary=core.describe(w);self.assertEqual(summary['preset'],'landscape');self.assertEqual(summary['seconds'],124/24)
                p=plan();p['preset']='portrait';p['seconds']=8
                result=core.export_workflow(w,p,['a','b','c','d']);target=next(n for n in result['nodes'] if n['type']=='MiniMaxH3ImageToVideo')
                values=core.h3_values(result,target);self.assertEqual((values['width'],values['height'],values['length']),(768,1344,192))
                self.assertEqual(next(n for n in result['nodes'] if n['type']=='CreateVideo')['widgets_values'],video['widgets_values'])
                self.assertEqual(type(target['widgets_values']),type(h3['widgets_values']))
                self.assertEqual(len(target['widgets_values']),len(h3['widgets_values']))
        w=copy.deepcopy(original);target=next(n for n in w['nodes'] if n['type']=='MiniMaxH3ImageToVideo');target['widgets_values']=[target['widgets_values'][0], 'unknown-field']
        with self.assertRaises(ValueError):core.validate_graph(w)

    def test_exported_duration_warning(self):
        w=json.loads((ROOT/'prophetero-scene-planner/templates/dasiwa-pro.json').read_text(encoding='utf-8-sig'))
        p=plan();p.update(seconds=10,language='HU');result=core.export_workflow(w,p,['a','b','c','d'])
        target=next(n for n in result['nodes'] if n['type']=='MiniMaxH3ImageToVideo')
        self.assertEqual(core.h3_values(result,target)['length'],243)
        note=next(n for n in result['nodes'] if n['type']=='Note' and n.get('title','').startswith('Scene Planner · READ FIRST'))
        self.assertIn('10.125',note['widgets_values'][0]);self.assertIn('243',note['widgets_values'][0]);self.assertIn('régi Duration',note['widgets_values'][0]);self.assertIn('ÚJ JSON',note['widgets_values'][0])

    def test_timing_and_rejections(self):
        for seconds in [1,2,4,5,6,8,10,15]:
            frames,duration=core.timing(seconds);self.assertEqual(frames%17,5);self.assertEqual(duration,frames/24)
        w=json.loads((ROOT/'prophetero-scene-planner/templates/dasiwa-pro.json').read_text(encoding='utf-8-sig'))
        for replacement in [0,8,8.1]:
            p=plan();p['images'][1]['time']=replacement
            with self.assertRaises(ValueError):core.export_workflow(w,p,['a','b','c','d'])
        p=plan();p['images'][2]['time']=2
        with self.assertRaises(ValueError):core.export_workflow(w,p,['a','b','c','d'])
        p=plan();p['images']=[{'role':'start'}]
        result=core.export_workflow(w,p,['a']);h3=next(n for n in result['nodes'] if n['type']=='MiniMaxH3ImageToVideo')
        self.assertIsNone(next(i for i in h3['inputs'] if i['name']=='last_frame')['link'])
        duplicate=copy.deepcopy(w);duplicate['nodes'].append(copy.deepcopy(next(n for n in w['nodes'] if n['type']=='MiniMaxH3ImageToVideo')));duplicate['nodes'][-1]['id']=999
        with self.assertRaisesRegex(ValueError,'exactly one'):core.validate_graph(duplicate)
        bad=copy.deepcopy(w);bad['links']={}
        with self.assertRaises(ValueError):core.validate_graph(bad)
        with self.assertRaises(ValueError):core.fitted_image(Image.new('RGB',(10,10)),{'x':float('nan')},(100,100))

if __name__=='__main__':unittest.main(verbosity=2)
