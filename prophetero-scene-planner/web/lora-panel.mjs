const langs=['EN','HU','DE','FR','ES','IT','PT','PL'];
const words={
 active:['active','aktív','aktiv','actives','activas','attive','ativas','aktywnych'],
 disabled:['Show disabled LoRAs','Kikapcsolt LoRA-k megjelenítése','Deaktivierte LoRAs anzeigen','Afficher les LoRAs désactivées','Mostrar LoRAs desactivadas','Mostra LoRA disattivate','Mostrar LoRAs desativadas','Pokaż wyłączone LoRA'],
 noActive:['No enabled LoRAs. Add one below or show the disabled rows.','Nincs bekapcsolt LoRA. Lent hozzáadhatsz újat, vagy megjelenítheted a kikapcsoltakat.','Keine aktiven LoRAs. Unten hinzufügen oder deaktivierte Zeilen anzeigen.','Aucune LoRA activée. Ajoutez-en une ci-dessous ou affichez les lignes désactivées.','No hay LoRAs activadas. Añade una abajo o muestra las filas desactivadas.','Nessuna LoRA attiva. Aggiungine una sotto o mostra le righe disattivate.','Nenhuma LoRA ativada. Adicione abaixo ou mostre as linhas desativadas.','Brak włączonych LoRA. Dodaj poniżej lub pokaż wyłączone wiersze.'],
 title:['Source settings and LoRAs','Forrásbeállítások és LoRA-k','Quelleinstellungen und LoRAs','Réglages source et LoRAs','Ajustes de origen y LoRAs','Impostazioni sorgente e LoRA','Configurações de origem e LoRAs','Ustawienia źródła i LoRA'],
 help:['Source model, seed, sampler and other settings stay unchanged. Only explicit LoRA edits are applied to the exported copy. File presence does not prove model compatibility.','A forrásmodell, seed, sampler és más beállítások megmaradnak. Csak a külön megadott LoRA-módosítások kerülnek az exportált másolatba. A fájl megléte nem igazolja a modellkompatibilitást.','Quellmodell, Seed, Sampler und andere Werte bleiben erhalten. Nur ausdrückliche LoRA-Änderungen gelten für die Exportkopie. Eine vorhandene Datei beweist keine Kompatibilität.','Modèle, seed, sampler et autres réglages conservés. Seules les modifications LoRA explicites changent la copie exportée. Un fichier présent ne prouve pas sa compatibilité.','Modelo, seed, sampler y otros ajustes se conservan. Solo los cambios LoRA explícitos modifican la copia. Un archivo presente no prueba compatibilidad.','Modello, seed, sampler e altre impostazioni restano invariati. Solo le modifiche LoRA esplicite cambiano la copia esportata. Il file presente non prova compatibilità.','Modelo, seed, sampler e outros ajustes são mantidos. Só as alterações LoRA explícitas mudam a cópia. Um arquivo presente não prova compatibilidade.','Model, seed, sampler i inne ustawienia zostają zachowane. Tylko jawne zmiany LoRA trafiają do kopii. Obecność pliku nie dowodzi zgodności.'],
 search:['Search installed LoRAs','Telepített LoRA-k keresése','Installierte LoRAs suchen','Rechercher des LoRAs installées','Buscar LoRAs instaladas','Cerca LoRA installati','Buscar LoRAs instaladas','Szukaj zainstalowanych LoRA'],
 refresh:['Refresh LoRA list','LoRA-lista frissítése','LoRA-Liste aktualisieren','Actualiser les LoRAs','Actualizar LoRAs','Aggiorna LoRA','Atualizar LoRAs','Odśwież LoRA'],
 target:['Add to loader','Hozzáadás ehhez a betöltőhöz','Zum Loader hinzufügen','Ajouter au chargeur','Añadir al cargador','Aggiungi al caricatore','Adicionar ao carregador','Dodaj do loadera'],
 add:['Add LoRA','LoRA hozzáadása','LoRA hinzufügen','Ajouter LoRA','Añadir LoRA','Aggiungi LoRA','Adicionar LoRA','Dodaj LoRA'],
 remove:['Remove','Eltávolítás','Entfernen','Retirer','Quitar','Rimuovi','Remover','Usuń'],
 enabled:['Enabled','Bekapcsolva','Aktiv','Activée','Activada','Attiva','Ativada','Włączona'],
 model:['Model strength','Modellerősség','Modellstärke','Force modèle','Intensidad modelo','Intensità modello','Força do modelo','Siła modelu'],
 clip:['CLIP strength · blank = same','CLIP-erősség · üres = ugyanaz','CLIP-Stärke · leer = gleich','Force CLIP · vide = identique','Intensidad CLIP · vacío = igual','Intensità CLIP · vuoto = uguale','Força CLIP · vazio = igual','Siła CLIP · puste = taka sama'],
 reset:['Restore source LoRAs','Forrás LoRA-inak visszaállítása','Quell-LoRAs wiederherstellen','Rétablir les LoRAs source','Restaurar LoRAs de origen','Ripristina LoRA sorgente','Restaurar LoRAs de origem','Przywróć LoRA źródłowe'],
 unchanged:['Source unchanged','Forrás változatlan','Quelle unverändert','Source inchangée','Origen sin cambios','Sorgente invariata','Origem inalterada','Źródło bez zmian'],
 changed:['Modified loaders','Módosított betöltők','Geänderte Loader','Chargeurs modifiés','Cargadores modificados','Caricatori modificati','Carregadores alterados','Zmienione loadery'],
 readonly:['Custom, inactive or linked loader: preserved as saved. Edit this loader in ComfyUI.','Egyedi, inaktív vagy kapcsolt betöltő: mentett állapotában megmarad. Ezt a ComfyUI-ban szerkeszd.','Eigener, inaktiver oder verknüpfter Loader bleibt erhalten. In ComfyUI bearbeiten.','Chargeur personnalisé, inactif ou lié conservé. Modifiez-le dans ComfyUI.','Cargador personalizado, inactivo o enlazado conservado. Edítalo en ComfyUI.','Caricatore personalizzato, inattivo o collegato conservato. Modifica in ComfyUI.','Carregador personalizado, inativo ou vinculado preservado. Edite no ComfyUI.','Własny, nieaktywny lub połączony loader zachowany. Edytuj w ComfyUI.'],
 none:['No LoRAs in this loader','Ebben a betöltőben nincs LoRA','Keine LoRAs in diesem Loader','Aucune LoRA dans ce chargeur','Sin LoRAs en este cargador','Nessun LoRA nel caricatore','Sem LoRAs neste carregador','Brak LoRA w loaderze'],
 snapshot:['Preserved source settings · read only','Megőrzött forrásbeállítások · csak olvasás','Erhaltene Quelleinstellungen · schreibgeschützt','Réglages source conservés · lecture seule','Ajustes de origen conservados · solo lectura','Impostazioni sorgente conservate · sola lettura','Configurações originais preservadas · leitura','Zachowane ustawienia źródła · tylko odczyt'],
 error:['LoRA list unavailable; existing source settings remain.','A LoRA-lista nem érhető el; a forrás beállításai megmaradnak.','LoRA-Liste nicht verfügbar; Quelle bleibt erhalten.','Liste LoRA indisponible ; source conservée.','Lista LoRA no disponible; origen conservado.','Elenco LoRA non disponibile; sorgente conservata.','Lista LoRA indisponível; origem preservada.','Lista LoRA niedostępna; źródło zachowane.'],
 newchain:['New native LoRA chain','Új natív LoRA-lánc','Neue native LoRA-Kette','Nouvelle chaîne LoRA native','Nueva cadena LoRA nativa','Nuova catena LoRA nativa','Nova cadeia LoRA nativa','Nowy natywny łańcuch LoRA'],
 confirm:['Discard LoRA edits and restore the source?','Elveted a LoRA-módosításokat és visszaállítod a forrást?','LoRA-Änderungen verwerfen?','Abandonner les changements LoRA ?','¿Descartar cambios LoRA?','Scartare le modifiche LoRA?','Descartar alterações LoRA?','Odrzucić zmiany LoRA?']
};
export function mountLoras(host,{language,get,set,request}){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;},t=k=>words[k][Math.max(0,langs.indexOf(language()))];
 let files=[],filter='',loaded=false,loading=false,attempted=false,modelStatus='',showDisabled=false;
 function edits(){return get().loraEdits||[];}
 function rows(info){return edits().find(e=>e.nodeId===info.nodeId)?.rows||info.rows;}
 function active(info,r){const node=get().sourceWorkflow?.nodes?.find(n=>n.id===info.nodeId);return r.on&&(node?.mode??0)===0;}
 function change(info,next){const list=edits().filter(e=>e.nodeId!==info.nodeId);if(JSON.stringify(next)!==JSON.stringify(info.rows))list.push({nodeId:info.nodeId,rows:next});set(list);}
 const heading=el('h2'),help=el('p'),search=el('input'),refreshButton=el('button'),target=el('select'),choice=el('select'),add=el('button'),reset=el('button'),status=el('p'),list=el('div'),snapshot=el('details'),summary=el('summary'),pre=el('pre');
 const panel=el('details'),toggle=el('summary'),brief=el('span'),count=el('span'),disabledLabel=el('label'),disabled=el('input'),disabledText=el('span');
 panel.id='loraPanel';toggle.className='lora-summary';heading.className='lora-summary-title';brief.className='lora-summary-names';count.id='loraActiveCount';disabled.id='loraShowDisabled';disabled.type='checkbox';disabledLabel.className='keep-plan';disabledLabel.append(disabled,disabledText);toggle.append(heading,count,brief);panel.append(toggle);host.append(panel);
 search.type='search';search.id='loraSearch';target.id='loraTarget';choice.id='loraChoice';add.id='loraAdd';list.id='loraRows';reset.id='loraReset';refreshButton.type=add.type=reset.type='button';
 const bar=el('div');bar.className='columns';for(const node of [search,refreshButton,target,choice,add])bar.append(node);snapshot.append(summary,pre);panel.append(help,disabledLabel,list,bar,reset,status,snapshot);
 disabled.onchange=()=>{showDisabled=disabled.checked;render();};
 async function load(){if(loading)return;attempted=true;loading=true;refreshButton.disabled=true;try{const r=await request('loras');files=Array.isArray(r.files)?r.files.filter(v=>typeof v==='string'):[];loaded=true;modelStatus='';}catch{modelStatus=t('error');}finally{loading=false;render();}}
 function choices(){const previous=choice.value;choice.replaceChildren();for(const name of files.filter(f=>f.toLowerCase().includes(filter.toLowerCase())).slice(0,2000)){const o=el('option',name);o.value=name;choice.append(o);}if([...choice.options].some(o=>o.value===previous))choice.value=previous;add.disabled=!choice.options.length||!target.options.length||loading;}
 search.oninput=()=>{filter=search.value;choices();};search.onfocus=()=>{if(!loaded)void load();};refreshButton.onclick=load;
 add.onclick=()=>{const info=(get().loras||[]).find(m=>String(m.nodeId)===target.value);if(!info||!choice.value)return;const next=structuredClone(rows(info));next.push({slot:null,name:choice.value,on:true,strength:1,clip:null});change(info,next);render();};
 reset.onclick=()=>{if(edits().length&&confirm(t('confirm'))){set([]);render();}};
 function render(){
  const infos=get().loras||[],all=infos.flatMap(info=>rows(info).map(r=>({info,r}))),enabledRows=all.filter(({info,r})=>active(info,r)),disabledCount=all.length-enabledRows.length;
  count.textContent=` · ${enabledRows.length} ${t('active')}`;
  const names=enabledRows.map(({r})=>r.name),short=names.slice(0,3).map(name=>name.split(/[\\/]/).pop());brief.textContent=short.join(' · ')+(names.length>3?` · +${names.length-3}`:'');brief.title=names.join('\n');brief.hidden=!names.length;
  disabled.checked=showDisabled;disabled.disabled=!disabledCount;disabledText.textContent=`${t('disabled')} (${disabledCount})`;
  heading.textContent=t('title');help.textContent=t('help');search.placeholder=search.ariaLabel=t('search');refreshButton.textContent=t('refresh');target.ariaLabel=t('target');choice.ariaLabel=t('search');add.textContent=t('add');reset.textContent=t('reset');summary.textContent=t('snapshot');pre.textContent=JSON.stringify(get().settings||[],null,2);reset.disabled=!edits().length;status.textContent=modelStatus||(!edits().length?t('unchanged'):`${t('changed')}: ${edits().length}`);
  refreshButton.disabled=loading;const selected=target.value;target.replaceChildren();list.replaceChildren();
  for(const info of infos){
   if(info.canAdd){const o=el('option',info.nodeId==='new'?t('newchain'):`${info.title} · #${info.nodeId}`);o.value=String(info.nodeId);target.append(o);}
   const current=rows(info);if(info.nodeId==='new'&&!current.length)continue;
   if(info.editable&&!current.some(r=>showDisabled||active(info,r)))continue;
   if(!info.editable&&current.length&&!current.some(r=>showDisabled||active(info,r)))continue;
   const box=el('section');box.className='lora-loader';box.append(el('h3',info.nodeId==='new'?t('newchain'):`${info.title} · #${info.nodeId}`));
   if(!info.editable)box.append(el('p',t('readonly')));
   if(!current.length)box.append(el('p',t('none')));
   current.forEach((r,index)=>{
    if(!showDisabled&&!active(info,r))return;
    const line=el('div');line.className='lora-row';line.dataset.loraName=r.name;
    const title=el('strong',r.name);line.append(title);
    const enabled=el('input');enabled.type='checkbox';enabled.checked=r.on;enabled.disabled=!info.editable;const label=el('label');label.className='keep-plan';label.append(enabled,el('span',t('enabled')));line.append(label);
    const update=(key,value)=>{const next=structuredClone(rows(info));next[index][key]=value;change(info,next);status.textContent=`${t('changed')}: ${edits().length}`;reset.disabled=!edits().length;if(key==='on')render();};enabled.onchange=()=>update('on',enabled.checked);
    for(const [key,word] of [['strength','model'],['clip','clip']]){const wrap=el('label');wrap.append(el('span',t(word)));const input=el('input');input.type='number';input.min=-100;input.max=100;input.step=.05;input.value=r[key]??'';input.disabled=!info.editable||(key==='clip'&&info.type==='LoraLoaderModelOnly');input.onchange=()=>{if(input.value===''&&key==='clip')update(key,null);else if(input.value!==''&&input.checkValidity())update(key,Number(input.value));else input.value=rows(info)[index][key]??'';};wrap.append(input);line.append(wrap);}
    const remove=el('button',t('remove'));remove.type='button';remove.className='danger';remove.disabled=!info.editable;remove.onclick=()=>{const next=structuredClone(rows(info));next.splice(index,1);change(info,next);render();};line.append(remove);box.append(line);
   });list.append(box);
  }
  if(!enabledRows.length&&!showDisabled)list.prepend(el('p',t('noActive')));
  if([...target.options].some(o=>o.value===selected))target.value=selected;choices();if(get().sourceId&&!attempted)void load();
 }
 return {refresh:render};
}
