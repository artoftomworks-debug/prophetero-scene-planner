import copy, importlib.util, json, pathlib, sys, types, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1];P=ROOT/'prophetero-scene-planner'
pkg=types.ModuleType('source_test');pkg.__path__=[str(P)];sys.modules[pkg.__name__]=pkg
from source_test import core,source_settings as settings

def workflow():return json.loads((P/'templates/dasiwa-pro.json').read_text(encoding='utf-8-sig'))
def plan(**extra):return dict(preset='landscape',seconds=10,prompt='Test scene',images=[dict(role='start')],**extra)
def row(name='motion.safetensors',slot=None,on=True,strength=.8,clip=None):return dict(name=name,slot=slot,on=on,strength=strength,clip=clip)
def export(w,p):return core.export_workflow(w,p,['start.png'],{'motion.safetensors','light.safetensors'})
def assert_acyclic(test,w):
    pending={n['id'] for n in w['nodes']};done=set()
    while pending:
        ready={i for i in pending if all(l[1] in done for l in w['links'] if l[3]==i)}
        test.assertTrue(ready,'Cycle in exported graph');done.update(ready);pending-=ready

class SourceSettings(unittest.TestCase):
    def test_no_edit_preserves_source_widgets_and_lora_order(self):
        w=workflow();loader=next(n for n in w['nodes'] if n['id']==6)
        loader['widgets_values']=[{'type':'PowerLoraLoaderHeaderWidget'},{'lora':'motion.safetensors','on':True,'strength':.9,'strengthTwo':.2,'custom':'keep'},None]
        before=copy.deepcopy(w);info=core.describe(w)
        self.assertEqual(info['loras'][0]['rows'][0]['clip'],.2)
        self.assertIn('RandomNoise',[n['type'] for n in info['settings']])
        result=export(w,plan());self.assertEqual(w,before)
        old={n['id']:n for n in w['nodes']};new={n['id']:n for n in result['nodes']}
        for n in old.values():
            if n['type'] in ('UNETLoader','CLIPLoader','VAELoader','RandomNoise','KSamplerSelect','BasicScheduler',settings.POWER):self.assertEqual(n['widgets_values'],new[n['id']]['widgets_values'])
        self.assertEqual(result['extra']['prophetero_scene_planner']['lora_changes'],[])

    def test_power_edits_are_real_widgets_not_prompt_tags(self):
        w=workflow();loader=next(n for n in w['nodes'] if n['id']==6)
        loader['widgets_values']=[{'type':'PowerLoraLoaderHeaderWidget'},{'lora':'motion.safetensors','on':True,'strength':.9,'custom':'keep'}]
        result=export(w,plan(loraEdits=[dict(nodeId=6,rows=[row(slot=1,on=False,strength=.3,clip=.2),row('light.safetensors')])]))
        changed=next(n for n in result['nodes'] if n['id']==6)['widgets_values']
        self.assertEqual(changed[0],loader['widgets_values'][0]);self.assertFalse(changed[1]['on']);self.assertEqual(changed[1]['custom'],'keep');self.assertEqual(changed[1]['strengthTwo'],.2);self.assertEqual(changed[2]['lora'],'light.safetensors')
        self.assertEqual(next(n for n in result['nodes'] if n['type']=='MiniMaxH3ImageToVideo')['widgets_values'][0],'Test scene')
        assert_acyclic(self,result)
        removed=export(w,plan(loraEdits=[dict(nodeId=6,rows=[])]));self.assertEqual(next(n for n in removed['nodes'] if n['id']==6)['widgets_values'],[changed[0]])
        with self.assertRaisesRegex(ValueError,'not installed'):export(w,plan(loraEdits=[dict(nodeId=6,rows=[row('missing.safetensors')])]))
        with self.assertRaises(ValueError):export(w,plan(loraEdits=[dict(nodeId=6,rows=[row(strength=float('nan'))])]))

    def test_new_native_chain_preserves_links_and_never_creates_cycle(self):
        for existing in [True,False]:
            w=workflow()
            if not existing:
                # Turn the optional Power loader into a pure routing node: no
                # existing LoRA handling is required by the inserted native chain.
                next(n for n in w['nodes'] if n['id']==6)['type']='RoutingFixture'
                # Use direct root MODEL/CLIP for an unambiguous no-loader source.
                for l in w['links']:
                    if l[1]==6:l[1],l[2]=(2,0) if l[5]=='MODEL' else (3,0)
            result=export(w,plan(loraEdits=[dict(nodeId='new',rows=[row(),row('light.safetensors',strength=.5,clip=.1)])]))
            assert_acyclic(self,result);added=[n for n in result['nodes'] if n['type']=='LoraLoader']
            self.assertEqual(len(added),2);self.assertEqual(added[0]['widgets_values'],['motion.safetensors',.8,.8]);self.assertEqual(added[1]['widgets_values'],['light.safetensors',.5,.1])
            for node in added:
                self.assertTrue(all(i['link'] is not None for i in node['inputs']))

    def test_native_loader_disable_and_inactive_custom_preservation(self):
        w=workflow();loader=next(n for n in w['nodes'] if n['id']==6);loader['type']='LoraLoader';loader['widgets_values']=['motion.safetensors',.7,.4]
        result=export(w,plan(loraEdits=[dict(nodeId=6,rows=[])]));self.assertEqual(next(n for n in result['nodes'] if n['id']==6)['widgets_values'],['motion.safetensors',0,0])
        for mode in (2,4):
            loader['mode']=mode;self.assertFalse(core.describe(w)['loras'][0]['editable'])
            with self.assertRaises(ValueError):export(w,plan(loraEdits=[dict(nodeId=6,rows=[])]))
        loader['mode']=0;loader['type']='UnknownLoRALoader'
        self.assertFalse(core.describe(w)['loras'][0]['editable']);self.assertEqual(next(n for n in export(w,plan())['nodes'] if n['id']==6)['widgets_values'],loader['widgets_values'])

    def test_duration_fields_match_true_length_and_shared_controls_stay(self):
        w=workflow();result=export(w,plan());by={n['id']:n for n in result['nodes']}
        self.assertEqual(by[18]['type'],'PrimitiveFloat');self.assertEqual(by[18]['widgets_values'],[10.125]);self.assertEqual(by[19]['widgets_values'][0],24)
        self.assertEqual(core.h3_values(result,by[7])['length'],243)
        metadata=result['extra']['prophetero_scene_planner'];self.assertEqual((metadata['requested_seconds'],metadata['seconds'],metadata['fps'],metadata['frames']),(10.,10.125,24,243))
        # Another consumer shares the original seconds control: don't change it.
        extra=copy.deepcopy(next(n for n in w['nodes'] if n['type']=='ComfyMathExpression'));extra['id']=999;extra['inputs']=[dict(name='values.a',type='INT',link=900)];extra['outputs']=[]
        w['nodes'].append(extra);w['links'].append([900,18,0,999,0,'INT'])
        result=export(w,plan());shared=next(n for n in result['nodes'] if n['id']==18)
        self.assertEqual(shared['widgets_values'],[8,'fixed']);self.assertIn('SHARED',shared['title'])
        self.assertTrue(any(n['type']=='PrimitiveFloat' and n.get('title','').startswith('Scene Planner · actual duration: 10.125') for n in result['nodes']))

if __name__=='__main__':unittest.main(verbosity=2)
