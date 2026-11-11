import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initial,sourceBaseline,planReview,restoreReviewField,timing} from '../prophetero-scene-planner/web/planner-model.mjs';
const workflow=JSON.parse(fs.readFileSync(new URL('../prophetero-scene-planner/templates/dasiwa-pro.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
const baseline=sourceBaseline(workflow);
assert.deepEqual([baseline.width,baseline.height,baseline.frames,baseline.fps],[768,1344,192,24]);
const plan={...initial(),sourceWorkflow:workflow,sourceId:'f'.repeat(32),preset:'1088-landscape',seconds:12,base:'New scene',prompt:'New prompt',images:[{role:'start',time:0,name:'start'},{role:'guide',time:.125,name:'guide'},{role:'end',time:0,name:'end'}],events:[{time:1,text:'Move'}],audio:{...initial().audio,instruction:'Rain'},loras:[{nodeId:6,editable:true,rows:[{name:'one',on:true,strength:.8,clip:null},{name:'off',on:false,strength:1,clip:null}]}],loraEdits:[{nodeId:6,rows:[{name:'two',on:true,strength:.5,clip:.2}]}]};
const snapshot=structuredClone(plan),review=planReview(plan);
assert.equal(review.changedSize,true);assert.equal(review.changedTime,true);assert.equal(review.changedPrompt,true);assert.equal(review.changedLoras,true);
assert.deepEqual(review.beforeLoras.map(r=>r.name),['one']);assert.deepEqual(review.afterLoras.map(r=>r.name),['two']);
assert.equal(review.closePairs.length,1);assert.equal(review.closePairs[0].seconds,.125);assert.equal(review.frames.at(-1).frame,timing(12).frames-1);
for(const [field,keys] of [['size',['preset','customWidth','customHeight','canvasAutoPending']],['duration',['seconds']],['loras',['loraEdits']],['prompt',['base','prompt']]]){
 const result=restoreReviewField(plan,field);
 for(const key of Object.keys(plan))if(!keys.includes(key))assert.deepEqual(result[key],plan[key],`${field} reset changed ${key}`);
 assert.deepEqual(plan,snapshot,'Review/reset mutated the original plan');
 if(field==='size')assert.equal(result.preset,'portrait');
 if(field==='duration')assert.equal(result.seconds,8);
 if(field==='prompt')assert.equal(result.prompt,baseline.prompt);
 if(field==='loras')assert.deepEqual(result.loraEdits,[]);
}
// Compact H3 widget arrays with linked geometry and UI-only null slots.
const compact=structuredClone(workflow),h3=compact.nodes.find(n=>n.type==='MiniMaxH3ImageToVideo');h3.widgets_values=[baseline.prompt,null];
assert.deepEqual(sourceBaseline(compact),baseline);
// Unknown or cyclic expressions must never fall back to stale visible values.
const unknown=structuredClone(workflow),math=unknown.nodes.find(n=>n.type==='ComfyMathExpression'&&String(n.widgets_values[0]).includes('max('));
assert.ok(math);math.widgets_values[0]='globalThis.__notAllowed=true';
assert.equal(sourceBaseline(unknown).frames,null);assert.equal(sourceBaseline(unknown).timeRestorable,false);
assert.throws(()=>restoreReviewField({...plan,sourceWorkflow:unknown},'duration'));
assert.equal(globalThis.__notAllowed,undefined);
const non24=structuredClone(workflow),create=non24.nodes.find(n=>n.type==='CreateVideo');create.inputs.find(i=>i.name==='fps').link=null;non24.links=non24.links.filter(l=>!(l[3]===create.id&&create.inputs[l[4]]?.name==='fps'));create.widgets_values={fps:30};
assert.equal(sourceBaseline(non24).fps,30);assert.equal(sourceBaseline(non24).timeRestorable,false);
const missing={...plan,sourceWorkflow:null};assert.equal(planReview(missing).source,null);assert.throws(()=>restoreReviewField(missing,'size'));
const duplicate={...plan,images:[{role:'start',time:0,name:'a'},{role:'guide',time:0,name:'b'}]};assert.equal(planReview(duplicate).closePairs.length,0); // Existing hard validator handles duplicates.
assert.equal(planReview({...plan,images:[{role:'start',time:0,name:'a'},{role:'guide',time:.25,name:'b'}]}).closePairs.length,0);
console.log('PASS: exact source controls, compact widgets, scoped resets, immutable source, LoRA strengths, keyframe advice, unknown expressions and non-24fps limits.');
