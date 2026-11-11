import assert from 'node:assert/strict';
import {initial,imagePreset,imageCanvas,aspectDiffers,validProject,attachSource} from '../prophetero-scene-planner/web/planner-model.mjs';
assert.equal(imagePreset(1080,1920),'portrait');assert.equal(imagePreset(1920,1080),'landscape');assert.equal(imagePreset(1024,1024),'square');
for(const values of [[0,3],[-1,3],[NaN,3],[Infinity,3]])assert.throws(()=>imagePreset(...values));
let state=imageCanvas(initial(),1080,1920);assert.equal(state.preset,'portrait');assert.equal(state.canvasAutoPending,false);
state.images.push({});assert.equal(imageCanvas(state,1920,1080).preset,'portrait');
state.images=[];assert.equal(imageCanvas(state,1920,1080).preset,'portrait'); // Removing images does not undo the user's canvas.
assert.equal(imageCanvas({...initial(),preset:'square',canvasAutoPending:false},1080,1920).preset,'square');
const old=initial();delete old.canvasAutoPending;old.preset='portrait';const loaded=validProject(old);assert.equal(loaded.canvasAutoPending,false);assert.equal(imageCanvas(loaded,1920,1080).preset,'portrait');
assert.equal(validProject(initial()).canvasAutoPending,true);assert.throws(()=>validProject({...initial(),canvasAutoPending:'yes'}));
assert.equal(aspectDiffers(768,1344,768,1344),false);assert.equal(aspectDiffers(1920,1080,768,1344),true);
assert.equal(attachSource({...initial(),preset:'square',canvasAutoPending:false},{id:'a'.repeat(32),workflow:{nodes:[],links:[]}},true).preset,'square');
console.log('PASS: first-image orientation, manual canvas lock, later images/removal, old project preservation and aspect mismatch.');
