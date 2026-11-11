import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
// Exercise the actual installed frontend predicate, not a substitute validator.
const root='C:/AIWorks/Data/Packages/ComfyUI/venv/Lib/site-packages/comfyui_frontend_package/static/assets/';
const native=await fs.readFile(root+'app-B03VdYVv.js','utf8');
const start=native.indexOf('function resolveMediaMissingState('),end=native.indexOf('function scanNodeMediaCandidates',start);
assert.ok(start>0&&end>start);
const combo=await fs.readFile(root+'executionErrorStore-DU3jtHOO.js','utf8');
const cs=combo.indexOf('function resolveComboValues('),ce=combo.indexOf('function addToComboValues',cs);
assert.ok(cs>0&&ce>cs);
const context=vm.createContext({rn:()=>({flags:{assetsEnabled:false}}),ke:value=>({filepath:value,rootFolder:'input'})});
vm.runInContext(combo.slice(cs,ce)+';globalThis.Pe=resolveComboValues;'+native.slice(start,end)+';globalThis.isMissing=resolveMediaMissingState',context);
const launcher=(await fs.readFile(new URL('../prophetero-scene-planner/web/scene-launcher.js',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'');
let extension;const path='PropheteroScenePlanner/'+'d'.repeat(32)+'/01.png';let exists=true;
const app={graph:{_nodes:[]},registerExtension:e=>extension=e};
const api={fetchApi:async route=>{await new Promise(resolve=>setTimeout(resolve,15));const image=decodeURIComponent(route.split('image=')[1]);return {ok:exists,json:async()=>({image,exists})};}};
vm.runInNewContext(launcher,{app,api,window:{},localStorage:{getItem:()=>null},encodeURIComponent,alert(){}});
for(const mode of ['array','computed']){
 const widget={type:'combo',name:'image',value:path,options:{values:mode==='array'?['ordinary.png']:(w)=>{assert.equal(w.name,'image');return ['ordinary.png'];}},callback:async()=>{await new Promise(r=>setTimeout(r,5));}};
 const node={type:'LoadImage',widgets:[widget],setDirtyCanvas(){}};app.graph._nodes=[node];extension.nodeCreated(node);
 assert.equal(context.isMissing(widget,path),true);
 node.onConfigure({widgets_values:[path,'image']});
 const verified=extension.afterConfigureGraph();assert.equal(typeof verified.then,'function');
 await verified;
 assert.equal(context.isMissing(widget,path),false,mode+' must be resolved before the native load pipeline scans');
}
exists=false;
const widget={type:'combo',name:'image',value:path,options:{values:['ordinary.png']}},node={type:'LoadImage',widgets:[widget],setDirtyCanvas(){}};app.graph._nodes=[node];extension.nodeCreated(node);
await extension.afterConfigureGraph();assert.equal(context.isMissing(widget,path),true);
console.log('PASS: actual ComfyUI 1.57.6 missing-media predicate; asynchronous load-hook ordering; array/computed choices; absent files remain flagged.');
