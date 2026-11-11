import {mountLoras} from './lora-panel.mjs';
import {mountTranslator} from './translator.mjs';
import {mountResources} from './resource-ui.mjs';
import {mountAudio,withAudio} from './audio-plan.mjs';
import {presets,timing,geometry,assemble,initial,validProject,draft,attachSource,imagePreset,imageCanvas,aspectDiffers,canvasSize,planReview,restoreReviewField} from './planner-model.mjs';
import {t,languages} from './planner-labels.mjs';
const $=id=>document.getElementById(id), apiBase=new URL('../',import.meta.url), params=new URL(location.href).searchParams;
let lang=languages.includes(params.get('language'))?params.get('language'):(localStorage.getItem('prophetero.scene.language')||'EN');
let state=initial(),timer,busy=false,drawToken=0,exported=null;
const cache=new Map();
function text(key){return t(key,lang);}
function message(value='',bad=false){$('status').textContent=value;$('status').classList.toggle('bad',bad);}
async function request(path,data){const response=await fetch(new URL(path,apiBase),data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const result=await response.json();if(!response.ok)throw new Error(result.error||`HTTP ${response.status}`);return result;}
function translate(){workload.translate();audioUI.refresh();translator.refresh();document.documentElement.lang=lang.toLowerCase();$('language').value=lang;for(const n of document.querySelectorAll('[data-t]'))n.textContent=text(n.dataset.t);for(const option of $('preset').options){const size=presets[option.value];if(size){const [w,h]=size;option.textContent=`${w} × ${h} · ${text('orientation_'+imagePreset(w,h))}`+(option.value.startsWith('trial-')||option.value==='square-512'?' · '+text('trialCanvas'):'')+(w*h>1344*768?' · '+text('largeCanvasShort'):'');}}$('canvas').ariaLabel=text('preview');$('timeline').ariaLabel=text('keyframes');$('large').textContent=text(document.querySelector('.preview').classList.contains('large')?'close':'large');render();}
const workload=mountResources($('resources'),{planningOnly:true,language:()=>lang,read:profile=>request('resources?profile='+encodeURIComponent(profile))});
const audioUI=mountAudio($('audioPlan'),{language:()=>lang,get:()=>state.audio,set:a=>{state.audio=a;persist();}});
const loraUI=mountLoras($('sourceLoras'),{language:()=>lang,get:()=>state,set:value=>{state.loraEdits=value;persist();},request});
const translator=mountTranslator($('translator'),{language:()=>lang,get:()=>state.translationDraft,set:value=>{state.translationDraft=value;persist();},source:field=>field==='audio'?state.audio.instruction:state[field],apply:(field,value)=>{if(value.length>(field==='audio'?4000:field==='base'?16000:24000))throw Error('The translation is too long for this field.');if(field==='audio')state.audio.instruction=value;else state[field]=value;persist();render();},request});
$('openTranslator').onclick=()=>translator.open('prompt');
function syncURL(){const url=new URL(location.href);if((url.searchParams.get('project')||'')!==state.sourceId){if(state.sourceId)url.searchParams.set('project',state.sourceId);else url.searchParams.delete('project');history.replaceState(null,'',url);}}
function persist(){renderReview();syncURL();exported=null;$('exportPath').textContent='';clearTimeout(timer);timer=setTimeout(async()=>{try{await draft('put',state);$('draftStatus').textContent=text('saved');}catch{$('draftStatus').textContent=text('storage');}},400);}
function current(){return state.images[state.selected];}
function image(item){if(!cache.has(item.data))cache.set(item.data,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{cache.delete(item.data);reject(new Error('Image could not be decoded.'));};img.src=item.data;}));return cache.get(item.data);}
async function paint(){
    const token=++drawToken,c=$('canvas'),[w,h]=canvasSize(state);c.width=w;c.height=h;$('drop').style.aspectRatio=`${w}/${h}`;
    const ctx=c.getContext('2d'),item=current();ctx.fillStyle=item?.background||'#101820';ctx.fillRect(0,0,w,h);$('empty').hidden=!!item;
    $('useImageAspect').disabled=$('useImageSize').disabled=!item||busy;
    if(!item){$('imageInfo').textContent='';$('aspectSuggestion').textContent='';$('fitWarning').textContent='';return;}
    const img=await image(item);if(token!==drawToken)return;
    const sw=img.naturalWidth,sh=img.naturalHeight,box=geometry(sw,sh,w,h,item.fit,item.x,item.y);ctx.drawImage(img,box.x,box.y,box.w,box.h);
    $('imageInfo').textContent=`${item.name} · ${sw} × ${sh} → ${w} × ${h}`;
    const suggestion=imagePreset(sw,sh);$('aspectSuggestion').textContent=`${text('aspectSuggestion')}: ${text('orientation_'+suggestion)} · ${presets[suggestion].join(' × ')}`;
    $('fitWarning').textContent=item.fit==='stretch'?text('stretch'):aspectDiffers(sw,sh,w,h)?text(item.fit==='contain'?'aspectPadding':'aspectCrop'):'';
}
function roleTime(item){const a=timing(state.seconds);return item.role==='start'?0:item.role==='end'?(a.frames-1)/24:Number(item.time);}
function problems(){const p=[],a=timing(state.seconds);try{canvasSize(state);}catch{p.push(text('invalidCanvas'));}if(!state.sourceId)p.push(text('noSource'));if(state.images.filter(i=>i.role==='start').length!==1)p.push(text('needStart'));const guides=state.images.filter(i=>i.role==='guide').map(i=>Math.round(i.time*24));if(state.images.filter(i=>i.role==='end').length>1||guides.some(f=>f<=0||f>=a.frames-1)||new Set(guides).size!==guides.length)p.push(text('badGuide'));if(!state.prompt.trim())p.push(text('needPrompt'));if(state.events.some(e=>e.time>a.seconds))p.push(text('badGuide'));if(state.images.reduce((sum,i)=>sum+i.data.length,0)>46*1024**2)p.push('Combined image upload limit: 46 MiB in encoded form. Use smaller source images.');return p;}
function render(controls=true){
    audioUI.refresh();translator.refresh();loraUI.refresh();renderReview();
    $('customCanvas').hidden=state.preset!=='custom';$('customWidth').value=state.customWidth;$('customHeight').value=state.customHeight;
    let validCanvas=true;try{const [w,h]=canvasSize(state);$('canvasInfo').textContent=`${text('actualCanvas')}: ${w} × ${h}`+(w*h>1344*768?' · '+text('largeCanvas'):'');}catch{validCanvas=false;$('canvasInfo').textContent=text('invalidCanvas');}
    $('sourceInfo').textContent=state.sourceId?[...new Set([state.sourceName,...state.models])].join(' · '):text('noSource');
    $('goSource').hidden=!!state.sourceId;
    $('preset').value=state.preset;$('seconds').value=state.seconds;const a=timing(state.seconds);$('timing').textContent=`${text('actual')}: ${a.seconds.toFixed(3)} s · ${a.frames} frames · 24 fps`;$('exportTiming').textContent=`${text('duration')}: ${state.seconds} s → ${text('actual')}: ${a.seconds.toFixed(3)} s · ${a.frames} frames · 24 fps`;
    $('cards').replaceChildren();$('timeline').replaceChildren();
    state.images.forEach((item,index)=>{
        const button=document.createElement('button');button.className='card'+(state.selected===index?' active':'');button.type='button';
        const img=document.createElement('img');img.src=item.data;img.alt='';const caption=document.createElement('span');caption.textContent=`${text(item.role)} · ${roleTime(item).toFixed(3)} s\n${item.name}`;button.append(img,caption);button.onclick=()=>{state.selected=index;render();persist();};$('cards').append(button);
        const mark=document.createElement('button');mark.textContent=String(index+1);mark.title=caption.textContent;mark.className=state.selected===index?'active':'';mark.style.left=Math.max(0,Math.min(100,roleTime(item)/a.seconds*100))+'%';mark.onclick=button.onclick;$('timeline').append(mark);
    });
    const item=current();$('imageControls').hidden=!item;$('downloadImage').disabled=!item||busy;
    if(item&&controls){for(const key of ['role','fit','background','x','y'])$(key).value=item[key];$('time').value=roleTime(item).toFixed(3);$('time').max=((a.frames-1)/24).toFixed(3);}
    $('time').disabled=!item||item.role!=='guide';$('x').disabled=$('y').disabled=!item||item.fit!=='cover';$('background').disabled=!item||item.fit!=='contain';
    if(controls){$('base').value=state.base;$('prompt').value=state.prompt;renderEvents();}
    const p=problems();$('checks').replaceChildren();if(p.length){const list=document.createElement('ul');list.className='bad';for(const problem of p){const li=document.createElement('li');li.textContent=problem;list.append(li);}$('checks').append(list);}else{$('checks').textContent=text('ready');$('checks').className='good';}
    $('export').disabled=busy||p.length>0;if(validCanvas)Promise.resolve().then(paint).catch(e=>message(e.message,true));
}

function renderReview(){
 const host=$('review');if(!host)return;const promptOpen=host.querySelector('details')?.open===true;host.replaceChildren();host.hidden=!state.sourceId;if(host.hidden)return;
 const r=planReview(state),src=r.source,el=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;return n;};
 host.append(el('h3',text('reviewTitle')),el('p',text('reviewHelp')),el('p',text('reviewPreserved')));
 const table=el('div');table.className='review-grid';host.append(table);
 const unknown=text('reviewUnknown'),dims=(w,h)=>Number.isFinite(w)&&Number.isFinite(h)?`${w} × ${h}`:unknown;
 const duration=(frames,fps)=>Number.isFinite(frames)&&Number.isFinite(fps)&&fps>0?`${(frames/fps).toFixed(3)} s · ${frames} frames · ${fps} fps`:unknown;
 function row(key,label,before,after,changed,restorable,field,help){
  const box=el('section');box.className='review-row';box.dataset.reviewField=key;box.append(el('h4',text(label)));
  const badge=el('strong',text(changed?'reviewChanged':'reviewSame'));badge.className=changed?'review-changed':'good';box.append(badge);
  const values=el('div');values.className='review-values';
  for(const [caption,value] of [['reviewSnapshot',before],['reviewPlanned',after]]){const column=el('div');column.className='review-value';column.append(el('strong',text(caption)),el('span',value));values.append(column);}box.append(values);
  if(changed&&restorable){const b=el('button',text('reviewRestore'));b.type='button';b.dataset.restore=field;b.disabled=busy;b.onclick=()=>{if(!confirm(text('reviewConfirm')+' '+text(label)))return;state=restoreReviewField(state,field);render();persist();message();};box.append(b);}
  else if(changed&&field&& !restorable&&['size','duration'].includes(field))box.append(el('p',text('reviewSourceLimit')));
  if(help)box.append(el('p',text(help)));table.append(box);
 }
 row('size','reviewSize',dims(src?.width,src?.height),r.size?dims(...r.size):text('invalidCanvas'),r.changedSize,src?.sizeRestorable,'size');
 row('duration','reviewTime',duration(src?.frames,src?.fps),duration(r.target.frames,24),r.changedTime,src?.timeRestorable,'duration');
 const loras=rows=>rows.map(v=>`${v.name} × ${v.strength} / ${v.clip??v.strength} · #${v.nodeId}`).join('\n')||text('reviewNone');
 row('loras','reviewLoras',loras(r.beforeLoras),loras(r.afterLoras),r.changedLoras,true,'loras','reviewSnapshotHelp');
 // Prompt details are optional so long text does not bury the save action.
 row('prompt','reviewPrompt',text('reviewSame'),text(r.changedPrompt?'reviewChanged':'reviewSame'),r.changedPrompt,src?.prompt!==null,'prompt','reviewPromptHelp');
 const details=el('details'),summary=el('summary',text('reviewPrompt')),pre=el('pre',`${src?.prompt??unknown}\n\n→\n\n${state.prompt}`);details.open=promptOpen;details.append(summary,pre);table.lastChild.append(details);
 const list=el('div');list.className='review-keyframes';list.append(el('h4',text('reviewFrames')));
 if(!r.frames.length)list.append(el('p',text('reviewNone')));
 for(const f of r.frames)list.append(el('p',`#${f.index+1} · ${text(f.role)} · ${(f.frame/24).toFixed(3)} s · frame ${f.frame} · ${f.name}`));host.append(list);
 const warnings=el('div');warnings.id='reviewWarnings';warnings.setAttribute('aria-live','polite');
 if(r.closePairs.length)warnings.append(el('p',text('reviewClose')+' '+r.closePairs.map(p=>`#${p.a} ↔ #${p.b}: ${p.seconds.toFixed(3)} s`).join(' · ')));
 if(r.unknownLoras)warnings.append(el('p',text('reviewReadonly')));host.append(warnings);
}

function renderEvents(){
    $('events').replaceChildren();state.events.forEach((event,index)=>{
        const row=document.createElement('div');row.className='event';
        const timeLabel=document.createElement('label');timeLabel.textContent=text('time');const time=document.createElement('input');time.type='number';time.min=0;time.max=timing(state.seconds).seconds;time.step=.042;time.value=event.time;time.onchange=()=>{event.time=Math.max(0,Math.min(timing(state.seconds).seconds,Number(time.value)||0));time.value=event.time;persist();render(false);};timeLabel.append(time);
        const label=document.createElement('label');label.textContent=text('action');const input=document.createElement('textarea');input.rows=2;input.maxLength=1000;input.value=event.text;input.oninput=()=>{event.text=input.value;persist();};label.append(input);
        const remove=document.createElement('button');remove.textContent=text('delete');remove.className='danger';remove.onclick=()=>{state.events.splice(index,1);render();persist();};row.append(timeLabel,label,remove);$('events').append(row);
    });$('addEvent').disabled=state.events.length>=12;
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function jsonDownload(value,name){download(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),name);}
function hasWork(){return !state.canvasAutoPending||state.images.length||state.base.trim()||state.prompt.trim()||state.events.length||state.audio.instruction.trim();}
async function readFile(file){if(file.size>64*1024**2)throw new Error('File limit: 64 MiB.');return JSON.parse(await file.text());}
function fileData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}
async function addFiles(files){
    for(const file of files){if(state.images.length>=6)throw new Error('Maximum: 6 images.');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>16*1024**2)throw new Error('Use PNG, JPEG or WebP, up to 16 MiB per image.');
        const item={role:state.images.length?'guide':'start',name:file.name,data:await fileData(file),time:Math.max(.042,Math.min(timing(state.seconds).seconds-.1,timing(state.seconds).seconds/2)),fit:'cover',x:.5,y:.5,background:'#101820'};
        const decoded=await image(item);if(decoded.naturalWidth*decoded.naturalHeight>24_000_000)throw new Error('Image limit: 24 megapixels.');
        state=imageCanvas(state,decoded.naturalWidth,decoded.naturalHeight);
        state.images.push(item);state.selected=state.images.length-1;
    }render();persist();message();
}
async function autoStart(){if(state.images.length||!state.sourceId)return;try{const response=await fetch(new URL(`image/${state.sourceId}/start`,apiBase));if(!response.ok)return;const blob=await response.blob();await addFiles([new File([blob],'Workflow start image',{type:blob.type||'image/png'})]);}catch{/* Source image is optional; the user can choose another. */}}
async function setSource(data,keepPlan=false){
    state=attachSource(state,data,keepPlan);if(!keepPlan)cache.clear();
    render();persist();await autoStart();message();
}
async function act(fn){if(busy)return;busy=true;document.querySelector('main').inert=true;render(false);try{await fn();}catch(e){message(e.message,true);}finally{busy=false;document.querySelector('main').inert=false;render();}}
$('language').onchange=()=>{lang=$('language').value;localStorage.setItem('prophetero.scene.language',lang);translate();};
$('seen').hidden=!!localStorage.getItem('prophetero.scene.seen.0.2');$('seen').onclick=()=>{localStorage.setItem('prophetero.scene.seen.0.2','1');$('seen').hidden=true;};
$('images').onchange=()=>act(async()=>{await addFiles([...$('images').files]);$('images').value='';});
for(const kind of ['dragenter','dragover'])$('drop').addEventListener(kind,e=>{e.preventDefault();$('drop').classList.add('over');});
for(const kind of ['dragleave','drop'])$('drop').addEventListener(kind,e=>{e.preventDefault();$('drop').classList.remove('over');if(kind==='drop')act(()=>addFiles([...e.dataTransfer.files]));});
$('drop').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('images').click();}});
$('large').onclick=()=>{const active=document.querySelector('.preview').classList.toggle('large');document.body.classList.toggle('full',active);$('large').textContent=text(active?'close':'large');};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('full'))$('large').click();});
let drag=null;
$('canvas').onpointerdown=async e=>{try{canvasSize(state);}catch{return;}const item=current();if(!item||item.fit!=='cover')return;const img=await image(item),[w,h]=canvasSize(state),box=geometry(img.naturalWidth,img.naturalHeight,w,h,item.fit,item.x,item.y),rect=$('canvas').getBoundingClientRect(),scale=Math.min(rect.width/w,rect.height/h);drag={x:e.clientX,y:e.clientY,px:item.x,py:item.y,dx:(box.w-w)*scale,dy:(box.h-h)*scale,item};$('canvas').setPointerCapture(e.pointerId);};
$('canvas').onpointermove=e=>{if(!drag)return;const d=drag;d.item.x=d.dx?Math.max(0,Math.min(1,d.px-(e.clientX-d.x)/d.dx)):.5;d.item.y=d.dy?Math.max(0,Math.min(1,d.py-(e.clientY-d.y)/d.dy)):.5;$('x').value=d.item.x;$('y').value=d.item.y;paint();};
for(const name of ['pointerup','pointercancel'])$('canvas').addEventListener(name,()=>{if(drag){drag=null;persist();}});
for(const key of ['role','fit','background','x','y','time'])$(key).addEventListener(key==='x'||key==='y'?'input':'change',()=>{const item=current();if(!item)return;item[key]=['x','y','time'].includes(key)?Number($(key).value):$(key).value;persist();render();});
$('center').onclick=()=>{if(current()){current().x=current().y=.5;render();persist();}};
$('remove').onclick=()=>{state.images.splice(state.selected,1);state.selected=Math.max(0,Math.min(state.selected,state.images.length-1));cache.clear();render();persist();};
$('preset').onchange=()=>{state.preset=$('preset').value;state.canvasAutoPending=false;render();persist();};
for(const key of ['customWidth','customHeight'])$(key).onchange=()=>{state[key]=Number($(key).value);state.canvasAutoPending=false;persist();render();};
$('useImageSize').onclick=()=>act(async()=>{if(!current())return;const img=await image(current()),w=Math.round(img.naturalWidth/32)*32,h=Math.round(img.naturalHeight/32)*32;canvasSize({preset:'custom',customWidth:w,customHeight:h});state.preset='custom';state.customWidth=w;state.customHeight=h;state.canvasAutoPending=false;render();persist();});
$('useImageAspect').onclick=()=>act(async()=>{if(!current())return;const img=await image(current());state.preset=imagePreset(img.naturalWidth,img.naturalHeight);state.canvasAutoPending=false;render();persist();});
$('seconds').onchange=()=>{state.seconds=Math.max(1,Math.min(15,Number($('seconds').value)||8));render();persist();};
$('addEvent').onclick=()=>{if(state.events.length<12){state.events.push({time:0,text:''});renderEvents();persist();}};
for(const key of ['base','prompt'])$(key).oninput=()=>{state[key]=$(key).value;persist();render(false);};
$('assemble').onclick=()=>{const result=withAudio(assemble(state.base,state.events),state.audio);if(state.prompt.trim()&&state.prompt!==state.base&&state.prompt!==result&&!confirm(text('confirm')))return;state.prompt=result;render();persist();};
$('copy').onclick=()=>act(async()=>{await navigator.clipboard.writeText(withAudio(state.prompt,state.audio));message(text('copied'));});
$('downloadImage').onclick=()=>act(async()=>{await paint();const blob=await new Promise(resolve=>$('canvas').toBlob(resolve,'image/png'));download(blob,`ScenePlanner_${current().role}_${state.selected+1}.png`);});
$('save').onclick=()=>jsonDownload(state,'Prophetero_ScenePlanner_Project.json');
$('new').onclick=()=>{if(hasWork()&&!confirm(text('confirm')))return;state=initial();cache.clear();render();persist();message();};
$('load').onchange=()=>act(async()=>{const file=$('load').files[0];$('load').value='';if(!file)return;if(hasWork()&&!confirm(text('confirm')))return;const p=validProject(await readFile(file));for(const item of p.images)await image(item);const previous=state;try{state=p;await restoreSource();render();persist();}catch(e){state=previous;throw e;}});
$('useTemplate').onclick=()=>act(async()=>{const keep=hasWork()&&$('keepPlan').checked;if(hasWork()&&!keep&&!confirm(text('confirm')))return;message(text('busy'));await setSource(await request('source',{template:$('template').value}),keep);});
$('workflow').onchange=()=>act(async()=>{const file=$('workflow').files[0];$('workflow').value='';if(!file)return;const keep=hasWork()&&$('keepPlan').checked;if(hasWork()&&!keep&&!confirm(text('confirm')))return;message(text('busy'));await setSource(await request('source',{workflow:await readFile(file)}),keep);});
$('goSource').onclick=()=>{$('sourceSection').scrollIntoView({behavior:'smooth',block:'start'});$('useTemplate').focus({preventScroll:true});};
$('export').onclick=()=>act(async()=>{if(problems().length)return;message(text('busy'));const result=await request('export',{id:state.sourceId,plan:{...state,prompt:withAudio(state.prompt,state.audio),sourceWorkflow:null,language:lang,resource_profile:workload.selected}});exported=result;jsonDownload(result.workflow,'Prophetero_ScenePlanner_Workflow.json');$('exportPath').textContent=result.path;message(text('success'));});
async function restoreSource(){if(!state.sourceId&&!state.sourceWorkflow)return;try{if(!state.sourceId)throw new Error();const data=await request('source/'+state.sourceId);state.sourceWorkflow=data.workflow;state.loras=data.loras||[];state.settings=data.settings||[];}catch{if(state.sourceWorkflow){const data=await request('source',{workflow:state.sourceWorkflow});state.sourceId=data.id;state.loras=data.loras||[];state.settings=data.settings||[];}else{state.sourceId='';message(text('noSource'),true);}}}
async function init(){
    try{const saved=await draft('get');if(saved)state=validProject(saved);}catch{$('draftStatus').textContent=text('storage');}
    const incoming=params.get('project');
    if(incoming&&incoming!==state.sourceId){if(!hasWork()||confirm(text('confirm'))){await setSource(await request('source/'+incoming));}}
    else await restoreSource();
    translate();persist();void workload.check();
}
init().catch(e=>{translate();message(e.message,true);});
