import importlib.util,pathlib,sys,types,json,unittest
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];P=ROOT/'prophetero-scene-planner'
pkg=types.ModuleType('canvas_test');pkg.__path__=[str(P)];sys.modules[pkg.__name__]=pkg
from canvas_test import canvas,core

class CanvasTests(unittest.TestCase):
    def test_all_presets_and_custom_export_actual_dimensions(self):
        original=json.loads((P/'templates/dasiwa-pro.json').read_text(encoding='utf-8-sig'))
        cases=[(k,{},size) for k,size in canvas.PRESETS.items()]+[('custom',dict(customWidth=960,customHeight=544),(960,544))]
        for preset,custom,expected in cases:
            with self.subTest(preset=preset):
                plan=dict(preset=preset,seconds=5,prompt='Rain.',images=[dict(role='start')],**custom)
                graph=core.export_workflow(original,plan,['start.png']);by={n['id']:n for n in graph['nodes']};h3=next(n for n in graph['nodes'] if n['type']=='MiniMaxH3ImageToVideo')
                values=[]
                for key in ['width','height']:
                    slot=next(i for i in h3['inputs'] if i['name']==key);link=next(l for l in graph['links'] if l[0]==slot['link']);values.append(by[link[1]]['widgets_values'][0])
                self.assertEqual(tuple(values),expected)
                fitted=core.fitted_image(Image.new('RGB',(160,90),'blue'),{},canvas.canvas_size(plan));self.assertEqual(fitted.size,expected)
                self.assertEqual(core.describe(graph)['preset'],preset)
    def test_invalid_canvas_is_rejected(self):
        for w,h in [(1080,1920),(0,608),(1024.0,576),(True,576),(4096,4096),(256,64),(None,768)]:
            with self.subTest(size=(w,h)),self.assertRaises(ValueError):canvas.canvas_size(dict(preset='custom',customWidth=w,customHeight=h))
    def test_native_i2v_does_not_call_canvas_adaptation(self):
        import ast
        path=pathlib.Path('C:/AIWorks/Data/Packages/ComfyUI/comfy_extras/nodes_minimax_h3.py')
        if not path.exists():self.skipTest('Native H3 implementation not installed here.')
        module=ast.parse(path.read_text(encoding='utf-8'));node=next(n for n in module.body if isinstance(n,ast.ClassDef) and n.name=='MiniMaxH3ImageToVideo')
        calls=[n.func.id for n in ast.walk(node) if isinstance(n,ast.Call) and isinstance(n.func,ast.Name)]
        self.assertNotIn('adapt_canvas',calls);self.assertIn('_empty_av_latent',calls)

if __name__=='__main__':unittest.main(verbosity=2)
