import {app} from '../../scripts/app.js';
import {api} from '../../scripts/api.js';

function prepareImageSelector(node){
    if(node.__sceneImageSelector)return;node.__sceneImageSelector=true;
    const update=async data=>{
        const values=data?.widgets_values;
        const widget=node.widgets?.find(w=>w.name==='image');
        const value=(Array.isArray(values)?values[0]:values?.image)||widget?.value;
        if(!widget||typeof value!=='string'||!/^PropheteroScenePlanner\/[a-f0-9]{32}\/0[1-6]\.png$/.test(value))return;
        try{
            // The stock LoadImage dropdown lists input-root files only. Check
            // our prepared subfolder file before registering it like a normal upload.
            const response=await api.fetchApi('/prophetero_scene_planner/prepared-image?image='+encodeURIComponent(value));
            const result=await response.json();if(!response.ok||result.image!==value||!result.exists)return;
            let choices=widget.options?.values;
            if(typeof choices==='function')choices=choices(widget);
            if(!Array.isArray(choices))return;
            // Some frontend widgets return a computed copy of their choices.
            // Assign the verified list instead of mutating a temporary array.
            widget.options.values=choices.includes(value)?[...choices]:[...choices,value];
            widget.value=value;
            await widget.callback?.(value);
            node.setDirtyCanvas?.(true,true);
        }catch{/* Leave a genuinely missing file flagged; never fabricate an input. */}
    };
    const previous=node.onConfigure;
    node.onConfigure=function(data,...rest){const result=previous?.call(this,data,...rest);void update(data);return result;};
    node.scenePlannerRefreshImage=update;
}

async function openPlanner(node, capture=true) {
    const page=window.open('about:blank','_blank');
    if(page)page.opener=null;
    try {
        if(!page)throw new Error('Allow pop-ups for your local ComfyUI page.');
        const globalLanguage=app.graph?._nodes?.find(n=>['ArtofTomworksGlobalLanguage','PropheteroGlobalLanguage'].includes(n.comfyClass||n.type))?.widgets?.find(w=>w.name==='language')?.value;
        const lang=node?.widgets?.find(w=>w.name==='language')?.value||globalLanguage||localStorage.getItem('prophetero.scene.language')||'EN';
        let route='/prophetero_scene_planner/studio?language='+encodeURIComponent(lang);
        if(capture){
            // Serialize the current graph, including custom widget values,
            // even when an input image is not yet ready for generation.
            const workflow=app.graph?.serialize?await app.graph.serialize():(await app.graphToPrompt()).workflow;
            const response=await api.fetchApi('/prophetero_scene_planner/source',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workflow})});
            const data=await response.json();if(!response.ok)throw new Error(data.error||'Cannot capture this workflow.');
            route+='&project='+data.id;
        }
        page.location.href=api.apiURL?api.apiURL(route):route;
    }catch(error){if(page)page.close();alert(error.message);}
}
function hasSource(){return !!app.graph?._nodes?.some(n=>(n.comfyClass||n.type)==='MiniMaxH3ImageToVideo');}
app.registerExtension({
    name:'Prophetero.ScenePlanner',
    async beforeRegisterNodeDef(nodeType,nodeData){
        if(nodeData?.name!=='LoadImage')return;
        const choices=nodeData.input?.required?.image?.[0];if(!Array.isArray(choices))return;
        try{
            const response=await api.fetchApi('/prophetero_scene_planner/prepared-images');
            const result=await response.json();if(!response.ok||!Array.isArray(result.images))return;
            for(const value of result.images)if(typeof value==='string'&&/^PropheteroScenePlanner\/[a-f0-9]{32}\/0[1-6]\.png$/.test(value)&&!choices.includes(value))choices.push(value);
        }catch{/* Normal ComfyUI image selection remains available. */}
    },
    getCanvasMenuItems(){return [{content:'Prophetero · Scene Planner',callback:()=>openPlanner(null,hasSource())}];},
    nodeCreated(node){
        const kind=node.comfyClass||node.type;
        if(kind==='LoadImage'){prepareImageSelector(node);return;}
        if(!['MiniMaxH3ImageToVideo','PropheteroScenePlanner'].includes(kind)||node.__scenePlanner)return;
        node.__scenePlanner=true;
        const label='Open Scene Planner / Jelenettervező'+(localStorage.getItem('prophetero.scene.seen.0.2')?'':' · NEW');
        const widget=node.addWidget('button',label,'',()=>openPlanner(node,kind==='MiniMaxH3ImageToVideo'||hasSource()),{serialize:false});
        widget.options.serialize=false;
        const resize=()=>{const size=node.computeSize?.();if(size)node.setSize?.([Math.max(node.size?.[0]||0,size[0]),Math.max(node.size?.[1]||0,size[1])]);};
        const previous=node.onConfigure;node.onConfigure=function(...args){const result=previous?.apply(this,args);resize();return result;};resize();
    },
    async afterConfigureGraph(){
        // ComfyUI awaits this hook BEFORE its missing-media pipeline. Returning
        // the actual verification promise prevents a stale Missing Inputs scan.
        await Promise.all((app.graph?._nodes||[]).map(node=>node.scenePlannerRefreshImage?.()));
    }
});
