const langs=['EN','HU','DE','FR','ES','IT','PT','PL'];
const rows={
 title:['Sound direction','Hangrendezés','Tongestaltung','Direction sonore','Dirección de sonido','Direzione sonora','Direção sonora','Plan dźwięku'],
 category:['Sound type','Hang típusa','Tonart','Type de son','Tipo de sonido','Tipo di suono','Tipo de som','Rodzaj dźwięku'],
 unchanged:['Keep source prompt unchanged','Az eredeti prompt szerint','Originalprompt beibehalten','Conserver le prompt source','Conservar el prompt original','Mantieni il prompt originale','Manter o prompt original','Zachowaj oryginalny prompt'],
 scene:['Match the scene','Jelenethez illő','Zur Szene passend','Adapté à la scène','Acorde con la escena','Adatto alla scena','Adequado à cena','Pasujący do sceny'],
 ambience:['Ambient sound','Környezeti hang','Umgebungsgeräusch','Ambiance','Ambiente','Ambiente','Ambiente','Dźwięk otoczenia'],
 effect:['Specific sound effect','Konkrét hangeffekt','Bestimmter Klangeffekt','Effet sonore précis','Efecto concreto','Effetto specifico','Efeito específico','Konkretny efekt'],
 music:['Music','Zene','Musik','Musique','Música','Musica','Música','Muzyka'],
 silent:['Silent result requested','Néma eredmény kérése','Stummes Ergebnis gewünscht','Résultat silencieux demandé','Resultado silencioso solicitado','Risultato muto richiesto','Resultado sem som solicitado','Żądany film niemy'],
 environment:['Environment','Környezet','Umgebung','Environnement','Entorno','Ambiente','Ambiente','Otoczenie'],
 automatic:['From the scene description','A jelenet leírásából','Aus der Szenenbeschreibung','D’après la description','Según la descripción','Dalla descrizione','Pela descrição','Z opisu sceny'],
 outdoors:['Outdoors','Kültér','Draußen','Extérieur','Exterior','Esterno','Exterior','Plener'],
 room:['Room','Beltér','Innenraum','Intérieur','Interior','Interno','Interior','Wnętrze'],
 cafe:['Café','Kávézó','Café','Café','Cafetería','Caffè','Café','Kawiarnia'],
 street:['Street','Utca','Straße','Rue','Calle','Strada','Rua','Ulica'],
 nature:['Nature','Természet','Natur','Nature','Naturaleza','Natura','Natureza','Przyroda'],
 arena:['Arena','Aréna','Arena','Arène','Arena','Arena','Arena','Arena'],
 speech:['Speech','Beszéd','Sprache','Parole','Habla','Parlato','Fala','Mowa'],
 none:['No speech or singing','Beszéd és ének nélkül','Ohne Sprache und Gesang','Sans parole ni chant','Sin habla ni canto','Senza parlato né canto','Sem fala nem canto','Bez mowy i śpiewu'],
 dialogue:['Visible speaker / dialogue','Látható beszélő / párbeszéd','Sichtbarer Sprecher / Dialog','Personnage parlant / dialogue','Hablante visible / diálogo','Parlante visibile / dialogo','Pessoa visível / diálogo','Widoczny rozmówca / dialog'],
 voiceover:['Off-screen voice','Narráció / képen kívüli hang','Stimme aus dem Off','Voix hors champ','Voz en off','Voce fuori campo','Voz fora de campo','Głos spoza kadru'],
 mood:['Mood','Hangulat','Stimmung','Ambiance','Ánimo','Atmosfera','Atmosfera','Nastrój'],
 natural:['Natural','Természetes','Natürlich','Naturel','Natural','Naturale','Natural','Naturalny'],
 calm:['Calm','Nyugodt','Ruhig','Calme','Tranquilo','Calmo','Calmo','Spokojny'],
 tense:['Tense','Feszült','Angespannt','Tendu','Tenso','Teso','Tenso','Napięty'],
 dramatic:['Dramatic','Drámai','Dramatisch','Dramatique','Dramático','Drammatico','Dramático','Dramatyczny'],
 energetic:['Energetic','Energikus','Energisch','Énergique','Enérgico','Energico','Enérgico','Energiczny'],
 custom:['Own direction (English recommended)','Saját irány (angolul ajánlott)','Eigene Vorgabe (Englisch empfohlen)','Direction personnelle (anglais conseillé)','Instrucción propia (inglés recomendado)','Direzione personale (inglese consigliato)','Direção própria (inglês recomendado)','Własne wskazówki (zalecany angielski)'],
 preview:['Audio instruction · editable','Hangutasítás · szerkeszthető','Tonanweisung · bearbeitbar','Instruction audio · modifiable','Instrucción de audio · editable','Istruzione audio · modificabile','Instrução de áudio · editável','Instrukcja audio · edytowalna'],
 build:['Build / replace audio instruction','Hangutasítás összeállítása / cseréje','Tonanweisung erstellen / ersetzen','Créer / remplacer l’instruction','Crear / sustituir instrucción','Crea / sostituisci istruzione','Criar / substituir instrução','Utwórz / zastąp instrukcję'],
 copy:['Copy audio instruction','Hangutasítás másolása','Tonanweisung kopieren','Copier l’instruction audio','Copiar instrucción de audio','Copia istruzione audio','Copiar instrução de áudio','Kopiuj instrukcję audio'],
 noMusic:['No music','Zene nélkül','Ohne Musik','Sans musique','Sin música','Senza musica','Sem música','Bez muzyki'],
 help:['Uses scene text, not automatic image analysis. Instructions guide the video model; unwanted speech/music and timing can still differ. For guaranteed silence or exact replacement, use Audio Fix after generation. No sound engine starts here.',
 'A jelenet szövegéből dolgozik, nem automatikus képelemzés. Az utasítás iránymutatás: a modell még adhat beszédet, zenét vagy eltérő időzítést. Biztos némításhoz, pontos cseréhez generálás után használd az Audio Fixet. Itt nem indul hanggenerátor.',
 'Nutzt Szenentext, keine automatische Bildanalyse. Tonvorgaben sind Hinweise; Sprache, Musik und Timing können abweichen. Für sichere Stummschaltung oder Austausch danach Audio Fix nutzen. Kein Tonmodell startet hier.',
 'Utilise le texte, sans analyse automatique d’image. Les consignes restent indicatives ; paroles, musique et timing peuvent différer. Utilisez Audio Fix ensuite pour couper ou remplacer précisément le son. Aucun moteur ne démarre ici.',
 'Usa el texto, sin análisis automático de imagen. Las instrucciones son orientativas; voz, música y tiempos pueden variar. Usa Audio Fix después para silenciar o sustituir con precisión. Aquí no se inicia ningún motor.',
 'Usa il testo, senza analisi automatica dell’immagine. Le istruzioni sono indicative; voci, musica e tempi possono variare. Usa Audio Fix dopo per silenziare o sostituire con precisione. Qui non parte alcun motore.',
 'Usa o texto, sem análise automática da imagem. As instruções são orientações; fala, música e tempos podem variar. Use Audio Fix depois para silenciar ou substituir com precisão. Nenhum motor é iniciado aqui.',
 'Używa tekstu sceny, bez automatycznej analizy obrazu. Instrukcje są wskazówkami; mowa, muzyka i czas mogą się różnić. Potem użyj Audio Fix do wyciszenia lub precyzyjnej zamiany. Tutaj nie uruchamia się model.'],
 lipsync:['Optional lip sync · separate post-processing','Választható szájszinkron · külön utómunka','Optionale Lippensynchronisation · Nachbearbeitung','Synchronisation labiale facultative · postproduction','Sincronización labial opcional · posproducción','Sincronizzazione labiale facoltativa · postproduzione','Sincronização labial opcional · pós-produção','Opcjonalna synchronizacja ust · postprodukcja'],
 lipHelp:['Lip-sync engine is not installed or tested in this package. Visible-speaker shots may need it after voice selection. It changes face pixels and re-encodes video; Audio Fix picture-copy guarantees do not apply. Original video must be retained. Off-screen narration needs no lip sync.',
 'Ebben a csomagban még nincs telepített és kipróbált szájszinkronmotor. Látható beszélőnél a hang kiválasztása után lehet rá szükség. Módosítja az arc képét és újrakódolja a videót; az Audio Fix képmásolási garanciája erre nem érvényes. Az eredetit meg kell tartani. Narrációhoz nem szükséges.',
 'Kein installierter oder getesteter Lippenmotor in diesem Paket. Erst die Stimme wählen. Die Gesichtspixel werden verändert und das Video neu codiert. Original behalten; bei Off-Stimmen unnötig.',
 'Aucun moteur labial installé ou testé dans ce paquet. Choisir la voix d’abord. Le visage est modifié et la vidéo réencodée. Garder l’original ; inutile pour une voix hors champ.',
 'Este paquete no incluye motor labial instalado ni probado. Elige la voz primero. Modifica el rostro y recodifica el vídeo. Conserva el original; no hace falta para voz en off.',
 'Questo pacchetto non include un motore labiale installato e testato. Scegli prima la voce. Modifica il volto e ricodifica il video. Conserva l’originale; non serve per voce fuori campo.',
 'Este pacote não inclui motor labial instalado ou testado. Escolha a voz primeiro. Modifica o rosto e recodifica o vídeo. Guarde o original; desnecessário para voz fora de campo.',
 'Pakiet nie zawiera zainstalowanego i przetestowanego silnika ust. Najpierw wybierz głos. Zmienia twarz i ponownie koduje film. Zachowaj oryginał; zbędne dla głosu spoza kadru.']
};
export const audioDefaults=()=>({category:'unchanged',environment:'automatic',speech:'none',mood:'natural',noMusic:true,custom:'',instruction:'',lipSync:false});
export function validateAudio(value){const a={...audioDefaults(),...value};for(const [key,allowed]of Object.entries({category:['unchanged','scene','ambience','effect','music','silent'],environment:['automatic','outdoors','room','cafe','street','nature','arena'],speech:['none','dialogue','voiceover'],mood:['natural','calm','tense','dramatic','energetic']}))if(!allowed.includes(a[key]))throw Error('Invalid audio direction.');if(typeof a.noMusic!=='boolean'||typeof a.lipSync!=='boolean'||typeof a.custom!=='string'||a.custom.length>1000||typeof a.instruction!=='string'||a.instruction.length>4000)throw Error('Invalid audio direction.');return a;}
export function buildAudio(a){a=validateAudio(a);if(a.category==='unchanged')return '';if(a.category==='silent')return 'Silent scene. No speech, singing, music or sound effects. Remove the audio track in post-production for guaranteed silence.';
 const types={scene:'Natural, plausible sound matching the scene description and its visible actions.',ambience:'Continuous environmental ambience with realistic acoustic perspective.',effect:'Clearly defined sound effects matching the actions described in the scene.',music:'Music matching the scene mood.'};
 return [types[a.category],a.environment!=='automatic'?`Environment: ${a.environment}.`:'',`Mood: ${a.mood}.`,a.speech==='none'?'No speech or singing.':a.speech==='voiceover'?'Off-screen narration only; visible people do not speak.':'Speech belongs only to the visible speaker described in the scene; preserve that speaker throughout the shot.',a.noMusic?'No music.':'',a.custom.trim()].filter(Boolean).join(' ');
}
export function withAudio(prompt,a){const clean=prompt.replace(/\n*\[SCENE AUDIO\][\s\S]*?\[\/SCENE AUDIO\]/g,'').trim();const audio=validateAudio(a);return clean+(audio.category!=='unchanged'&&audio.instruction.trim()?`\n\n[SCENE AUDIO]\n${audio.instruction.trim()}\n[/SCENE AUDIO]`:'');}
export function mountAudio(host,{language,get,set}){
 const el=(tag)=>document.createElement(tag),elements=[];const t=key=>rows[key]?.[Math.max(0,langs.indexOf(language()))]||key;
 function labelText(tag,key){const e=el(tag);e.dataset.audioLabel=key;elements.push(e);return e;}
 host.append(labelText('h2','title'));const fields={};
 for(const [key,values] of Object.entries({category:['unchanged','scene','ambience','effect','music','silent'],environment:['automatic','outdoors','room','cafe','street','nature','arena'],speech:['none','dialogue','voiceover'],mood:['natural','calm','tense','dramatic','energetic']})){const label=el('label');label.append(labelText('span',key));const select=el('select');select.id='audio_'+key;select.setAttribute('aria-label',t(key));for(const value of values){const o=labelText('option',value);o.value=value;select.append(o);}fields[key]=select;label.append(select);host.append(label);select.onchange=()=>{const a={...get(),[key]:select.value};if(key==='category'&&a.category==='music')a.noMusic=false;if(key==='speech'&&a.speech!=='dialogue')a.lipSync=false;set(a);refresh();};}
 const check=el('label'),noMusic=el('input');noMusic.type='checkbox';check.className='inline';check.append(noMusic,labelText('span','noMusic'));host.append(check);noMusic.onchange=()=>{set({...get(),noMusic:noMusic.checked,...(noMusic.checked&&get().category==='music'?{category:'scene'}:{})});refresh();};
 for(const key of ['custom','instruction']){const label=el('label');label.append(labelText('span',key==='custom'?'custom':'preview'));const input=el('textarea');input.id='audio_'+key;input.rows=3;input.maxLength=key==='custom'?1000:4000;fields[key]=input;label.append(input);host.append(label);input.oninput=()=>set({...get(),[key]:input.value});}
 const build=labelText('button','build'),copy=labelText('button','copy');build.type=copy.type='button';host.append(build,copy,labelText('p','help'));build.onclick=()=>{set({...get(),instruction:buildAudio(get())});refresh();};copy.onclick=async()=>{await navigator.clipboard.writeText(get().instruction).catch(()=>{fields.instruction.focus();fields.instruction.select();});};
 const lip=el('label'),lipBox=el('input');lip.className='inline';lipBox.type='checkbox';lipBox.disabled=true;lip.append(lipBox,labelText('span','lipsync'));host.append(lip,labelText('p','lipHelp'));
 function refresh(){const a=get();for(const key of Object.keys(fields))if(document.activeElement!==fields[key])fields[key].value=a[key];noMusic.checked=a.noMusic;lipBox.checked=false;for(const e of elements)e.textContent=t(e.dataset.audioLabel);}
 refresh();return {refresh};
}
