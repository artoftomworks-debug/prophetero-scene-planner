import {translationDefaults,validateTranslation} from './translator.mjs';
import {audioDefaults,validateAudio} from './audio-plan.mjs';
export const presets={landscape:[1344,768],portrait:[768,1344],square:[768,768],
 'trial-landscape':[768,448],'trial-portrait':[448,768],'square-512':[512,512],
 '1024-landscape':[1024,576],'1024-portrait':[576,1024],'1088-landscape':[1088,608],'1088-portrait':[608,1088],
 '1280-landscape':[1280,704],'1280-portrait':[704,1280],'square-1024':[1024,1024],
 'fullhd-landscape':[1920,1088],'fullhd-portrait':[1088,1920]};
export function canvasSize(plan){
 const size=plan.preset==='custom'?[plan.customWidth,plan.customHeight]:presets[plan.preset];
 if(!size||!size.every(v=>Number.isInteger(v)&&v>=256&&v<=4096&&v%32===0)||size[0]*size[1]>8388608)throw Error('Use whole H3 dimensions from 256 to 4096, multiples of 32, up to 8 megapixels.');
 return size;
}

export function imagePreset(width,height){
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Invalid image size.');
    return width===height?'square':width>height?'landscape':'portrait';
}
export function imageCanvas(state,width,height){
    const apply=state.images.length===0&&state.canvasAutoPending===true;
    return {...state,preset:apply?imagePreset(width,height):state.preset,canvasAutoPending:false};
}
export function aspectDiffers(sw,sh,w,h){return Math.abs(Math.log((sw/sh)/(w/h)))>.005;}
export function timing(seconds){const frames=Math.max(5,5+Math.floor((Number(seconds)*24-5)/17+.5)*17);return {frames,seconds:frames/24};}
export function geometry(sw,sh,w,h,fit='cover',x=.5,y=.5){
    if(fit==='stretch')return {x:0,y:0,w,h};
    const scale=(fit==='contain'?Math.min:Math.max)(w/sw,h/sh),rw=Math.max(1,Math.round(sw*scale)),rh=Math.max(1,Math.round(sh*scale));
    return {x:(fit==='contain'?Math.round((w-rw)/2):-Math.round((rw-w)*x))||0,y:(fit==='contain'?Math.round((h-rh)/2):-Math.round((rh-h)*y))||0,w:rw,h:rh};
}
export function assemble(base,events){const rows=[...events].sort((a,b)=>a.time-b.time).filter(e=>e.text.trim()).map(e=>`Around ${Number(e.time).toFixed(2)} seconds: ${e.text.trim()}`);return base.trim()+(rows.length?'\n\nScene progression (approximate timing):\n'+rows.join('\n'):'');}
export function initial(){return {version:1,loras:[],loraEdits:[],settings:[],translationDraft:translationDefaults(),customWidth:1344,customHeight:768,canvasAutoPending:true,audio:audioDefaults(),sourceId:'',sourceWorkflow:null,sourceName:'',models:[],preset:'landscape',seconds:8,base:'',prompt:'',events:[],images:[],selected:0};}
export function attachSource(previous,data,keepPlan=false){
    if(!data||typeof data.id!=='string'||!data.workflow||!Array.isArray(data.workflow.nodes)||!Array.isArray(data.workflow.links))throw Error('Invalid source workflow.');
    const next=keepPlan?{...previous}:initial();
    Object.assign(next,{sourceId:data.id,sourceWorkflow:data.workflow,sourceName:data.models?.[0]||data.name||'H3',models:data.models||[],loras:data.loras||[],loraEdits:[],settings:data.settings||[]});
    if(!keepPlan){next.base=data.prompt||'';next.prompt=next.base;next.preset=data.preset||'landscape';next.seconds=data.seconds||8;next.customWidth=data.customWidth||1344;next.customHeight=data.customHeight||768;if(next.preset==='custom'||!['landscape','portrait','square'].includes(next.preset))next.canvasAutoPending=false;}
    else if(!next.base.trim()&&!next.prompt.trim()){next.base=data.prompt||'';next.prompt=next.base;}
    return next;
}
export function validProject(p){
    if(!p||p.version!==1||(!presets[p.preset]&&p.preset!=='custom')||!Number.isFinite(Number(p.seconds))||p.seconds<1||p.seconds>15||!Array.isArray(p.images)||p.images.length>6||!Array.isArray(p.events)||p.events.length>12||typeof p.base!=='string'||typeof p.prompt!=='string')throw new Error('Invalid Scene Planner project.');
    if(p.prompt.length>24000||p.base.length>16000)throw new Error('Project text is too long.');
    if(!Array.isArray(p.models)||p.models.some(x=>typeof x!=='string')||typeof p.sourceName!=='string'||(p.sourceWorkflow!==null&&p.sourceWorkflow!==undefined&&(typeof p.sourceWorkflow!=='object'||!Array.isArray(p.sourceWorkflow.nodes)||!Array.isArray(p.sourceWorkflow.links))))throw new Error('Invalid workflow snapshot in project.');
    for(const i of p.images){if(!['start','guide','end'].includes(i.role)||!['cover','contain','stretch'].includes(i.fit)||typeof i.data!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(i.data)||i.data.length>24*1024**2||![i.x,i.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1)||!Number.isFinite(i.time)||i.time<0||typeof i.name!=='string'||!/^#[0-9a-f]{6}$/i.test(i.background))throw new Error('Invalid image settings in project.');}
    for(const e of p.events)if(!Number.isFinite(e.time)||e.time<0||typeof e.text!=='string'||e.text.length>1000)throw new Error('Invalid scene event.');
    if(typeof p.sourceId!=='string'||(p.sourceId&&!/^[0-9a-f]{32}$/.test(p.sourceId)))throw new Error('Invalid source snapshot.');
    // Keep an unfinished custom-size edit recoverable in drafts/projects. The
    // canvas renderer and both export validators still reject invalid sizes.
    for(const key of ['customWidth','customHeight'])if(p[key]!==undefined&&(!Number.isFinite(p[key])||Math.abs(p[key])>1e9))throw Error('Invalid custom dimension.');
    if(p.canvasAutoPending!==undefined&&typeof p.canvasAutoPending!=='boolean')throw Error('Invalid canvas preference.');
    for(const key of ['loras','loraEdits','settings'])if(p[key]!==undefined&&(!Array.isArray(p[key])||p[key].length>1500))throw Error('Invalid source settings.');
    return {...initial(),...p,translationDraft:validateTranslation(p.translationDraft),canvasAutoPending:p.canvasAutoPending===true&&p.images.length===0,audio:validateAudio(p.audio),selected:Math.max(0,Math.min(p.images.length-1,Number(p.selected)||0))};
}
export async function draft(mode,value){return new Promise((resolve,reject)=>{const req=indexedDB.open('prophetero-scene-planner',1);req.onupgradeneeded=()=>req.result.createObjectStore('drafts');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('drafts',mode==='get'?'readonly':'readwrite'),store=tx.objectStore('drafts'),r=mode==='get'?store.get('current'):store.put(value,'current');let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};};});}


// Review only reads recognized controls. Never evaluate imported expressions.
export function sourceBaseline(workflow){
 const nodes=workflow?.nodes||[],links=workflow?.links||[],h3=nodes.filter(n=>n.type==='MiniMaxH3ImageToVideo');
 if(h3.length!==1)return null;
 const node=h3[0],fields=['prompt','width','height','length'];
 function read(n,name,depth=0,seen=[]){
  if(depth>12||seen.includes(n.id))return null;
  const slot=(n.inputs||[]).findIndex(i=>i.name===name),input=n.inputs?.[slot];
  if(input?.link!=null){
   const edge=links.find(l=>l[0]===input.link&&l[3]===n.id&&l[4]===slot),src=nodes.find(v=>v.id===edge?.[1]);
   if(!src)return null;
   const next=[...seen,n.id],raw=src.widgets_values;
   if(['PrimitiveInt','PrimitiveFloat'].includes(src.type)){const v=Array.isArray(raw)?raw[0]:raw?.value;return typeof v==='number'&&Number.isFinite(v)?v:null;}
   if(src.type==='ComfyMathExpression'){
    const expr=String(Array.isArray(raw)?raw[0]:raw?.expression).replace(/\s/g,''),a=read(src,'values.a',depth+1,next);
    if(expr==='a')return a;
    if(expr==='max(5,floor((a*b-5)/17+0.5)*17+5)'){
     const b=read(src,'values.b',depth+1,next);
     if(Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&a<=3600&&b>=1&&b<=120)return Math.max(5,Math.floor((a*b-5)/17+.5)*17+5);
    }
   }
   return null;
  }
  const raw=n.widgets_values;
  if(raw&& !Array.isArray(raw)&&typeof raw==='object')return raw[name]??null;
  if(!Array.isArray(raw))return null;
  if(n.type==='MiniMaxH3ImageToVideo'){
   const full=typeof raw[0]==='string'&&raw.slice(1,4).length===3&&raw.slice(1,4).every(v=>typeof v==='number')&&raw.slice(4).every(v=>v==null||v==='');
   const names=full?fields:fields.filter(k=>!(n.inputs||[]).some(i=>i.name===k&&i.link!=null));
   if(raw.slice(names.length).some(v=>v!=null&&v!==''))return null;
   return raw[names.indexOf(name)]??null;
  }
  // CreateVideo legacy widgets: fps, UI-only preview value.
  if(n.type==='CreateVideo'&&name==='fps'&&typeof raw[0]==='number')return raw[0];
  return null;
 }
 const branch=new Set([node.id]);let grew=true;
 while(grew){grew=false;for(const l of links)if(branch.has(l[1])&&!branch.has(l[3])){branch.add(l[3]);grew=true;}}
 const creates=nodes.filter(n=>n.type==='CreateVideo'&&branch.has(n.id));
 const fps=creates.length===1?read(creates[0],'fps'):null,width=read(node,'width'),height=read(node,'height'),frames=read(node,'length'),prompt=read(node,'prompt');
 const seconds=Number.isFinite(frames)&&Number.isFinite(fps)&&frames>0&&fps>0?frames/fps:null;
 let sizeRestorable=false;try{canvasSize({preset:'custom',customWidth:width,customHeight:height});sizeRestorable=true;}catch{}
 const timeRestorable=fps===24&&Number.isInteger(frames)&&seconds>=1&&seconds<=15&&timing(seconds).frames===frames;
 return {width,height,frames,fps,seconds,prompt:typeof prompt==='string'?prompt:null,sizeRestorable,timeRestorable};
}
export function planReview(plan){
 const source=sourceBaseline(plan.sourceWorkflow),target=timing(plan.seconds);let size=null;
 try{size=canvasSize(plan);}catch{}
 const manifest=plan.loras||[],changes=plan.loraEdits||[],nodes=plan.sourceWorkflow?.nodes||[];
 function loras(edited){return manifest.flatMap(info=>{
  const rows=edited?(changes.find(e=>e.nodeId===info.nodeId)?.rows||info.rows):info.rows;
  return (rows||[]).filter(r=>r.on&&(nodes.find(n=>n.id===info.nodeId)?.mode??0)===0).map(r=>({nodeId:info.nodeId,name:r.name,strength:r.strength,clip:r.clip}));
 });}
 const beforeLoras=loras(false),afterLoras=loras(true),frames=plan.images.map((i,index)=>({index,role:i.role,name:i.name,frame:i.role==='start'?0:i.role==='end'?target.frames-1:Math.round(i.time*24)})).sort((a,b)=>a.frame-b.frame||a.index-b.index);
 const closePairs=frames.slice(1).flatMap((f,index)=>{const a=frames[index],gap=f.frame-a.frame;return gap>0&&gap<6?[{a:a.index+1,b:f.index+1,seconds:gap/24}]:[];});
 return {source,target,size,beforeLoras,afterLoras,frames,closePairs,
  changedSize:!!source&&(!size||source.width!==size[0]||source.height!==size[1]),
  changedTime:!!source&&(source.frames!==target.frames||source.fps!==24),
  changedPrompt:source?.prompt!==null&&!!source&&(plan.base!==source.prompt||plan.prompt!==source.prompt),
  changedLoras:changes.length>0,
  unknownLoras:manifest.some(i=>!i.editable&&(i.rows||[]).length>0)};
}
export function restoreReviewField(plan,field){
 const source=sourceBaseline(plan.sourceWorkflow);if(!source)throw Error('Source settings unavailable.');
 // Each action deliberately retains images, events and unrelated edits.
 if(field==='size'&&source.sizeRestorable){const preset=Object.entries(presets).find(([,s])=>s[0]===source.width&&s[1]===source.height)?.[0]||'custom';return {...plan,preset,customWidth:source.width,customHeight:source.height,canvasAutoPending:false};}
 if(field==='duration'&&source.timeRestorable)return {...plan,seconds:source.seconds};
 if(field==='loras')return {...plan,loraEdits:[]};
 if(field==='prompt'&&source.prompt!==null)return {...plan,base:source.prompt,prompt:source.prompt};
 throw Error('This source value cannot be restored within the current H3 export limits.');
}
