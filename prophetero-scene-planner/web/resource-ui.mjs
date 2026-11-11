// The limits are application safeguards, not promises that every model will fit.
const langs=['EN','HU','DE','FR','ES','IT','PT','PL'];
const words={
 required:['Required free RAM / VRAM','Szükséges szabad RAM / videómemória','Benötigter freier RAM / VRAM','RAM / VRAM libre nécessaire','RAM / VRAM libre necesaria','RAM / VRAM libera richiesta','RAM / VRAM livre necessária','Wymagane wolne RAM / VRAM'],
 shorten:['Use a short trial for this profile','Rövid próbaszakasz beállítása ehhez a profilhoz','Kurzen Test für dieses Profil wählen','Utiliser un essai court pour ce profil','Usar una prueba corta para este perfil','Usa una prova breve per questo profilo','Usar um teste curto para este perfil','Ustaw krótką próbę dla tego profilu'],
 scope:['This profile applies to optional Sound Lab generation. Exported H3 workflows run separately in ComfyUI with their own requirements; exporting a plan does not start or memory-limit H3.',
 'Ez a profil az opcionális Hangműhely generálására vonatkozik. Az exportált H3 workflow külön, a ComfyUI-ban fut a saját gépigényével. A terv exportálása nem indítja és nem korlátozza a H3 generálását.',
 'Dieses Profil gilt für die optionale Sound-Lab-Berechnung. Exportierte H3-Workflows laufen separat in ComfyUI mit eigenen Anforderungen. Export startet oder begrenzt H3 nicht.',
 'Ce profil concerne la génération Sound Lab facultative. Les workflows H3 exportés s’exécutent séparément dans ComfyUI avec leurs propres exigences. L’export ne lance ni ne limite H3.',
 'Este perfil se aplica a la generación opcional Sound Lab. Los workflows H3 exportados se ejecutan aparte en ComfyUI con sus requisitos. Exportar no inicia ni limita H3.',
 'Questo profilo riguarda la generazione Sound Lab facoltativa. I workflow H3 esportati girano separatamente in ComfyUI con requisiti propri. L’esportazione non avvia né limita H3.',
 'Este perfil aplica-se à geração Sound Lab opcional. Os workflows H3 exportados correm separadamente no ComfyUI com requisitos próprios. A exportação não inicia nem limita H3.',
 'Profil dotyczy opcjonalnego generowania w Sound Lab. Eksportowane workflow H3 działają osobno w ComfyUI z własnymi wymaganiami. Eksport nie uruchamia ani nie ogranicza H3.'],
 title:['Machine workload','Gépterhelés','Rechnerlast','Charge machine','Carga del equipo','Carico del computer','Carga do computador','Obciążenie komputera'],
 auto:['Recommended for my machine','Gépemhez javasolt','Für meinen Rechner empfohlen','Conseillé pour mon ordinateur','Recomendado para mi equipo','Consigliato per il computer','Recomendado para o computador','Zalecane dla komputera'],
 low:['Low memory','Kímélő · kevés memória','Wenig Speicher','Mémoire réduite','Memoria reducida','Memoria ridotta','Pouca memória','Mało pamięci'],
 balanced:['Balanced','Kiegyensúlyozott','Ausgewogen','Équilibré','Equilibrado','Bilanciato','Equilibrado','Zrównoważony'],
 full:['Full','Teljes','Voll','Complet','Completo','Completo','Completo','Pełny'],
 refresh:['Check free memory','Szabad memória ellenőrzése','Freien Speicher prüfen','Vérifier la mémoire libre','Comprobar memoria libre','Verifica memoria libera','Verificar memória livre','Sprawdź wolną pamięć'],
 hint:['Planning remains available. Sound generation limits: seconds / alternatives. Smaller analysis frames do not resize the final video. Limits are checked again before inference; they cannot guarantee that every job will fit.',
 'A tervezés továbbra is használható. Hanggenerálási határok: másodperc / változat. A kisebb elemzési kép nem méretezi át a végleges videót. Indítás előtt újra ellenőrzünk; ez nem jelent teljes garanciát minden feladatra.',
 'Planung bleibt verfügbar. Tonlimits: Sekunden / Varianten. Kleinere Analysebilder ändern die endgültige Videogröße nicht. Vor der Berechnung erfolgt eine erneute Prüfung; keine vollständige Garantie.',
 'La planification reste disponible. Limites audio : secondes / variantes. Les images d’analyse réduites ne redimensionnent pas la vidéo finale. Nouvelle vérification avant calcul, sans garantie absolue.',
 'La planificación sigue disponible. Límites de audio: segundos / variantes. El análisis reducido no cambia el tamaño del vídeo final. Se comprueba de nuevo antes de ejecutar; sin garantía absoluta.',
 'La pianificazione resta disponibile. Limiti audio: secondi / varianti. L’analisi ridotta non ridimensiona il video finale. Nuova verifica prima del calcolo, senza garanzia assoluta.',
 'O planeamento continua disponível. Limites de áudio: segundos / variantes. A análise reduzida não redimensiona o vídeo final. Nova verificação antes da execução; sem garantia absoluta.',
 'Planowanie nadal działa. Limity dźwięku: sekundy / warianty. Mniejsze obrazy analizy nie zmieniają rozmiaru filmu końcowego. Ponowna kontrola przed obliczeniami; bez pełnej gwarancji.'],
 unknown_ram:['RAM unavailable','RAM nem mérhető','RAM unbekannt','RAM inconnue','RAM desconocida','RAM sconosciuta','RAM desconhecida','Nieznana pamięć RAM'],
 unknown_gpu:['NVIDIA GPU unavailable','NVIDIA GPU nem mérhető','NVIDIA-GPU unbekannt','GPU NVIDIA inconnue','GPU NVIDIA desconocida','GPU NVIDIA sconosciuta','GPU NVIDIA desconhecida','Nieznana karta NVIDIA'],
 ram:['Not enough free RAM','Kevés a szabad RAM','Zu wenig freies RAM','RAM libre insuffisante','RAM libre insuficiente','RAM libera insufficiente','RAM livre insuficiente','Za mało wolnej pamięci RAM'],
 vram:['Not enough free VRAM','Kevés a szabad videómemória','Zu wenig freie VRAM','VRAM libre insuffisante','VRAM libre insuficiente','VRAM libera insufficiente','VRAM livre insuficiente','Za mało wolnej pamięci VRAM'],
 busy:['GPU busy: finish other generation first','A GPU foglalt: előbb fejezd be a másik generálást','GPU belegt: andere Generierung beenden','GPU occupé : terminer l’autre génération','GPU ocupada: termina la otra generación','GPU occupata: termina l’altra generazione','GPU ocupada: termine a outra geração','GPU zajęte: zakończ inne generowanie'],
 ready:['Ready for a resource check at start','Indításkor újra ellenőrizzük','Beim Start erneut prüfen','Vérification à nouveau au lancement','Se comprobará de nuevo al iniciar','Nuova verifica all’avvio','Nova verificação ao iniciar','Ponowna kontrola przy starcie'],
 unavailable:['Memory check failed. Planning is available; inference stays blocked. Restart the updated server.', 'A memóriaellenőrzés sikertelen. Tervezni lehet, generálni még nem. Indítsd újra a frissített szervert.', 'Speicherprüfung fehlgeschlagen. Planung möglich, Berechnung gesperrt. Aktualisierten Server neu starten.', 'Échec du contrôle mémoire. Planification possible, calcul bloqué. Redémarrer le serveur mis à jour.', 'Falló la comprobación. Planificación disponible, generación bloqueada. Reinicia el servidor actualizado.', 'Verifica fallita. Pianificazione disponibile, calcolo bloccato. Riavvia il server aggiornato.', 'Falha na verificação. Planeamento disponível, geração bloqueada. Reinicie o servidor atualizado.', 'Błąd kontroli. Planowanie dostępne, generowanie zablokowane. Uruchom ponownie zaktualizowany serwer.']
};
export function resourceText(key,language='EN'){return words[key]?.[Math.max(0,langs.indexOf(language))]||key;}
export function mountResources(host,{language,read,onchange=()=>{},planningOnly=false,key='prophetero.workload.v1'}){
 const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const title=el('h2'),label=el('label'),select=el('select'),refresh=el('button'),summary=el('p'),hint=el('p');
 select.setAttribute('aria-label','Machine workload');refresh.type='button';summary.setAttribute('role','status');hint.className='muted';host.append(title,label,refresh,summary,hint);label.append(select);
 let selected='auto',result=null,token=0;try{selected=localStorage.getItem(key)||'auto';}catch{}if(!['auto','low','balanced','full'].includes(selected))selected='auto';
 function translate(){const lang=language();title.textContent=resourceText('title',lang);hint.textContent=resourceText('hint',lang)+(planningOnly?' '+resourceText('scope',lang):'');refresh.textContent=resourceText('refresh',lang);select.replaceChildren();for(const id of ['auto','low','balanced','full']){const o=el('option',resourceText(id,lang));o.value=id;select.append(o);}select.value=selected;show();}
 function show(){const lang=language();if(!result){summary.textContent=resourceText('unavailable',lang);return;}
  const h=result.hardware,gpu=h.gpus.find(g=>g.index===0),gib=n=>n==null?'?':(n/1024).toFixed(1)+' GiB';
  summary.textContent=`${resourceText(result.effective,lang)} · ${result.limits.seconds} s / ${result.limits.count}\nRAM: ${gib(h.ram_free_mib)} / ${gib(h.ram_total_mib)} · VRAM (GPU 0): ${gib(gpu?.free_mib)} / ${gib(gpu?.total_mib)}\n${resourceText('required',lang)}: ${gib(result.limits.ram_mib)} / ${gib(result.limits.vram_mib)}\n`+(result.reasons.length?result.reasons.map(r=>resourceText(r,lang)).join(' · '):resourceText('ready',lang));summary.style.whiteSpace='pre-wrap';
 }
 async function check(){const id=++token;refresh.disabled=true;try{const next=await read(selected);if(id!==token)return;result=next;show();onchange(result);}catch{if(id!==token)return;result=null;show();onchange(null);}finally{if(id===token)refresh.disabled=false;}}
 select.onchange=()=>{selected=select.value;result=null;token++;try{localStorage.setItem(key,selected);}catch{}show();onchange(null);void check();};refresh.onclick=check;
 translate();return {check,translate,get selected(){return selected;},get result(){return result;}};
}
