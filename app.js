let db = JSON.parse(
    localStorage.getItem('AF_DB') || '[]'
);

let current = JSON.parse(
    localStorage.getItem('AF_CURRENT') || 'null'
);

let objRole = 'P';

let objStatus = 'available';

let freeRole = 'ALL';


/* Calciatori aggiunti manualmente: vengono salvati dentro l'asta */
function allPlayers(){
    return [
        ...PLAYERS,
        ...((current && Array.isArray(current.extraPlayers))
            ? current.extraPlayers
            : [])
    ];
}


const $ = id => document.getElementById(id);



/* =========================
   SICUREZZA TESTO
========================= */

function esc(s){

    return String(s ?? '').replace(/[&<>"']/g, c => ({

        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#039;'

    }[c]));

}



/* =========================
   SALVATAGGIO
========================= */

function persist(){

    localStorage.setItem(
        'AF_DB',
        JSON.stringify(db)
    );

    localStorage.setItem(
        'AF_CURRENT',
        JSON.stringify(current)
    );

    const refreshBtn = $('refreshAppBtn');

    if(refreshBtn){
        const activeScreen = document.querySelector('.screen.active')?.id;
        refreshBtn.style.display = activeScreen === 'home' ? 'flex' : 'none';
    }

    render();

}



/* =========================
   NAVIGAZIONE
========================= */

/* =========================
   AGGIORNAMENTO PWA
========================= */

async function refreshApp(){

    const btn = $('refreshAppBtn');

    if(btn){
        btn.classList.add('loading');
        btn.setAttribute('aria-label','Aggiornamento in corso');
    }

    try{

        // Controllo esplicito del Service Worker.
        if('serviceWorker' in navigator){

            const reg = await navigator.serviceWorker.getRegistration();

            if(reg){

                await reg.update();

                // Se esiste una nuova versione pronta, attivala subito.
                if(reg.waiting){
                    reg.waiting.postMessage({type:'SKIP_WAITING'});
                }

                // Aspettiamo il cambio effettivo del controller.
                await new Promise(resolve => {
                    let done = false;

                    const finish = () => {
                        if(done) return;
                        done = true;
                        navigator.serviceWorker.removeEventListener('controllerchange', finish);
                        resolve();
                    };

                    navigator.serviceWorker.addEventListener('controllerchange', finish);

                    // Fallback: non bloccare l'aggiornamento se iOS non invia l'evento.
                    setTimeout(finish, 1200);
                });
            }
        }

        // Bypass della cache anche per il documento principale.
        window.location.replace(
            window.location.pathname + '?update=' + Date.now()
        );

    }
    catch(err){

        console.warn('Aggiornamento PWA:', err);

        // Anche senza Service Worker forziamo una richiesta nuova al server.
        window.location.replace(
            window.location.pathname + '?update=' + Date.now()
        );
    }
}

function go(id){

    document
        .querySelectorAll('.screen')
        .forEach(x => x.classList.remove('active'));


    $(id).classList.add('active');


    document
        .querySelectorAll('.nav')
        .forEach(x =>
            x.classList.toggle(
                'active',
                x.dataset.s === id
            )
        );

    render();

}



/* =========================
   MODALE
========================= */

function openModal(h){

    const sheet = $('sheet').closest('.sheet');

    $('sheet').innerHTML = h;

    $('modal').classList.add('show');

    // Ogni apertura parte sempre realmente dall'inizio della pagina.
    sheet.scrollTop = 0;

}


function closeModal(){

    $('modal').classList.remove('show');

    // Ripristina eventuali modalità speciali a tutta pagina.
    $('sheet').closest('.sheet').classList.remove('history-fullscreen');

    // Evita di conservare la precedente posizione di scorrimento.
    $('sheet').closest('.sheet').scrollTop = 0;

}


$('modal').onclick = e => {

    if(e.target.id === 'modal'){

        closeModal();

    }

};



/* =========================
   NUOVA ASTA
========================= */

function newAuction(){

    openModal(`

        <div class="h2">
            ➕ Nuova asta
        </div>


        <label>
            Nome asta
        </label>

        <input
            id="aname"
            placeholder="Es. Asta 2026">


        <label>
            Data
        </label>

        <input
            id="adate"
            type="date"
            value="${new Date().toISOString().slice(0,10)}">


        <label>
            Numero squadre
        </label>

        <select id="anum">

            ${Array
                .from({length:9},(_,i)=>i+2)
                .map(n => `
                    <option
                        value="${n}"
                        ${n===10?'selected':''}>
                        ${n}
                    </option>
                `)
                .join('')}

        </select>


        <label>
            Crediti iniziali per squadra
        </label>

        <input
            id="acred"
            type="number"
            min="1"
            value="1200">


        <label>
            Giocatori da acquistare per ruolo
        </label>

        <div class="rolelimits">
            <div><span>Portieri</span><input id="alimP" type="number" min="0" value="2"></div>
            <div><span>Difensori</span><input id="alimD" type="number" min="0" value="9"></div>
            <div><span>Centrocampisti</span><input id="alimC" type="number" min="0" value="9"></div>
            <div><span>Attaccanti</span><input id="alimA" type="number" min="0" value="7"></div>
        </div>


        <label>
            Nomi squadre
        </label>

        <div id="teamInputs"></div>


        <button
            class="btn primary"
            style="width:100%;margin-top:12px"
            onclick="createAuction()">

            Crea asta

        </button>


        </div>


        </div>


        <button
            class="btn secondary"
            style="width:100%;margin-top:8px"
            onclick="closeModal()">

            Annulla

        </button>

    `);


    $('anum').onchange = makeInputs;


    makeInputs();

}



function makeInputs(){

    let n = +$('anum').value;


    $('teamInputs').innerHTML = Array
        .from({length:n},(_,i)=>`

            <input
                class="tn"
                style="margin:4px 0"
                value="Squadra ${i+1}"
                placeholder="Squadra ${i+1}">

        `)
        .join('');

}



/* =========================
   CREA ASTA
========================= */

function createAuction(){

    let c = +$('acred').value || 1200;


    let names =
        [...document.querySelectorAll('.tn')]
        .map((x,i) =>
            x.value.trim() ||
            `Squadra ${i+1}`
        );


    current = {

        id:Date.now(),

        name:
            $('aname').value.trim() ||
            'Asta Fantacalcio',

        date:$('adate').value,

        initialCredits:c,

        roleLimits:{
            P:Math.max(0, +$('alimP').value || 0),
            D:Math.max(0, +$('alimD').value || 0),
            C:Math.max(0, +$('alimC').value || 0),
            A:Math.max(0, +$('alimA').value || 0)
        },


        myTeamId:0,


        teams:names.map((name,id)=>({

            id,

            name,

            spent:0,

            players:[],

        })),


        extraPlayers:[],

        objectives:[],

        objectivePriorities:{},

        playerNotes:{},

        history:[]

    };


    db = [
        current,
        ...db
    ];


    persist();


    closeModal();


    go('auction');

}



/* =========================
   MODIFICA IMPOSTAZIONI ASTA
========================= */

function editAuctionSettings(){

    if(!current) return;

    const limits=roleLimits();

    openModal(`

        <div class="h2">⚙️ Modifica asta</div>

        <div class="muted small" style="margin-bottom:14px">
            Puoi aggiornare le impostazioni anche ad asta in corso.
        </div>

        <label>Nome asta</label>
        <input id="editAname" value="${esc(current.name)}">

        <label>Data</label>
        <input id="editAdate" type="date" value="${esc(current.date||'')}">

        <label>Crediti iniziali per squadra</label>
        <input id="editAcred" type="number" min="1" value="${current.initialCredits}">

        <label>Giocatori da acquistare per ruolo</label>
        <div class="rolelimits">
            <div><span>Portieri</span><input id="editLimP" type="number" min="0" value="${limits.P}"></div>
            <div><span>Difensori</span><input id="editLimD" type="number" min="0" value="${limits.D}"></div>
            <div><span>Centrocampisti</span><input id="editLimC" type="number" min="0" value="${limits.C}"></div>
            <div><span>Attaccanti</span><input id="editLimA" type="number" min="0" value="${limits.A}"></div>
        </div>

        <label>Nomi squadre</label>

        <div id="editTeamInputs">
            ${current.teams.map(t=>`
                <input
                    class="edit-tn"
                    data-team-id="${t.id}"
                    style="margin:4px 0"
                    value="${esc(t.name)}"
                    placeholder="Nome squadra">
            `).join('')}
        </div>

        <button class="btn primary" style="width:100%;margin-top:14px" onclick="saveAuctionSettings()">
            💾 Salva modifiche
        </button>

        <button class="btn secondary" style="width:100%;margin-top:8px" onclick="closeModal()">
            Annulla
        </button>

    `);

}

function saveAuctionSettings(){

    if(!current) return;

    const newLimits={
        P:Math.max(0,+$('editLimP').value||0),
        D:Math.max(0,+$('editLimD').value||0),
        C:Math.max(0,+$('editLimC').value||0),
        A:Math.max(0,+$('editLimA').value||0)
    };

    const problems=[];

    current.teams.forEach(t=>{
        const c={P:0,D:0,C:0,A:0};
        t.players.forEach(p=>c[p.role]++);
        ['P','D','C','A'].forEach(role=>{
            if(c[role]>newLimits[role]){
                problems.push(t.name+' ha già '+c[role]+' '+role);
            }
        });
    });

    if(problems.length){
        alert(
            'Impossibile salvare una composizione rosa inferiore ai giocatori già acquistati.\n\n'+
            problems.join('\n')
        );
        return;
    }

    current.name=$('editAname').value.trim()||'Asta Fantacalcio';
    current.date=$('editAdate').value;
    current.initialCredits=Math.max(1,+$('editAcred').value||1);
    current.roleLimits=newLimits;

    document.querySelectorAll('.edit-tn').forEach(input=>{
        const id=+input.dataset.teamId;
        const team=current.teams.find(t=>t.id===id);
        if(team){
            team.name=input.value.trim()||('Squadra '+(id+1));
        }
    });

    /* Aggiorna anche lo storico con i nuovi nomi delle squadre */
    const namesById=new Map(current.teams.map(t=>[t.id,t.name]));
    current.history.forEach(h=>{
        if(h.teamId!=null && namesById.has(h.teamId)){
            h.team=namesById.get(h.teamId);
        }
    });

    persist();
    closeModal();

}


/* =========================
   LIMITI ROSA
========================= */

function roleLimits(){

    return current?.roleLimits || {
        P:2,
        D:9,
        C:9,
        A:7
    };

}


/* =========================
   CONTEGGIO RUOLI
========================= */

function counts(t){

    let c = {

        P:0,
        D:0,
        C:0,
        A:0

    };


    t.players.forEach(p => {

        c[p.role]++;

    });


    return `

        <span class="countpill role-P">
            <b>P</b>${c.P}/${roleLimits().P}
        </span>

        <span class="countpill role-D">
            <b>D</b>${c.D}/${roleLimits().D}
        </span>

        <span class="countpill role-C">
            <b>C</b>${c.C}/${roleLimits().C}
        </span>

        <span class="countpill role-A">
            <b>A</b>${c.A}/${roleLimits().A}
        </span>

        <span class="totalcount">
            · ${t.players.length} tot.
        </span>

    `;

}




/* =========================
   BRAIN
========================= */
const BRAIN_ROLES=[
  ['P','🟠 Portieri'],
  ['D','🟢 Difensori'],
  ['C','🔵 Centrocampisti'],
  ['A','🔴 Attaccanti']
];

function ensureBrain(){
  if(!current) return;
  if(!Array.isArray(current.brainStrategies) || !current.brainStrategies.length){
    current.brainStrategies=[{
      id:Date.now(),
      name:'Strategia 1',
      allocation:{P:10,D:10,C:30,A:50}
    }];
    current.activeBrainStrategyId=current.brainStrategies[0].id;
  }
  if(!current.activeBrainStrategyId || !current.brainStrategies.some(s=>s.id===current.activeBrainStrategyId)){
    current.activeBrainStrategyId=current.brainStrategies[0].id;
  }
}

function activeBrainStrategy(){
  ensureBrain();
  return current?.brainStrategies.find(s=>s.id===current.activeBrainStrategyId);
}

function renderBrain(){
  const box=$('brainContent');
  if(!box) return;
  if(!current){
    box.innerHTML='<div class="card muted">Crea o apri un’asta per usare Brain.</div>';
    return;
  }
  ensureBrain();
  const budget=current.initialCredits||0;
  box.innerHTML=
    '<div class="card">'+
      '<div class="muted small">Budget dell’asta in corso</div>'+
      '<div class="brain-budget">💰 '+budget+' crediti</div>'+
    '</div>'+
    current.brainStrategies.map(s=>{
      const total=BRAIN_ROLES.reduce((n,[r])=>n+(+s.allocation[r]||0),0);
      const active=s.id===current.activeBrainStrategyId;
      return '<div class="card brain-strategy '+(active?'active':'')+'" onclick="selectBrainStrategy('+s.id+')">'+
        '<div class="brain-strategy-head">'+
          '<input class="brain-check" type="radio" name="brainActive" '+(active?'checked':'')+' onclick="event.stopPropagation();selectBrainStrategy('+s.id+')">'+
          '<div class="brain-name">'+esc(s.name)+'</div>'+
          '<button class="btn secondary" style="min-height:34px;padding:5px 9px" onclick="event.stopPropagation();renameBrainStrategy('+s.id+')">✏️</button>'+
        '</div>'+
        '<div class="brain-total '+(total===100?'ok':'warn')+'">'+total+'% · '+Math.round(budget*total/100)+' crediti'+(total===100?' ✓':'')+'</div>'+
        BRAIN_ROLES.map(([r,label])=>{
          const pct=+s.allocation[r]||0;
          return '<div class="brain-role-row">'+
            '<div class="brain-role-label">'+label+'</div>'+
            '<input type="number" min="0" max="100" value="'+pct+'" onclick="event.stopPropagation()" onchange="updateBrainAllocation('+s.id+',\''+r+'\',this.value)">'+
            '<div class="brain-credits">'+Math.round(budget*pct/100)+' cr</div>'+
          '</div>';
        }).join('')+
        '<div class="brain-actions">'+
          '<button class="btn secondary" onclick="event.stopPropagation();duplicateBrainStrategy('+s.id+')">Duplica</button>'+
          (current.brainStrategies.length>1?'<button class="btn secondary" onclick="event.stopPropagation();deleteBrainStrategy('+s.id+')">Elimina</button>':'')+
        '</div>'+
      '</div>';
    }).join('');
}

function selectBrainStrategy(id){
  if(!current) return;
  ensureBrain();
  current.activeBrainStrategyId=id;
  persist();
}
function addBrainStrategy(){
  if(!current){ alert('Apri prima un’asta.'); return; }
  ensureBrain();
  const n=current.brainStrategies.length+1;
  current.brainStrategies.push({id:Date.now(),name:'Strategia '+n,allocation:{P:10,D:10,C:30,A:50}});
  persist();
}
function duplicateBrainStrategy(id){
  const s=current?.brainStrategies.find(x=>x.id===id); if(!s) return;
  current.brainStrategies.push({id:Date.now(),name:s.name+' copia',allocation:{...s.allocation}});
  persist();
}
function renameBrainStrategy(id){
  const s=current?.brainStrategies.find(x=>x.id===id); if(!s) return;
  const name=prompt('Nome della strategia',s.name);
  if(name!==null && name.trim()){s.name=name.trim();persist();}
}
function deleteBrainStrategy(id){
  if(!current || current.brainStrategies.length<=1) return;
  if(!confirm('Eliminare questa strategia?')) return;
  current.brainStrategies=current.brainStrategies.filter(s=>s.id!==id);
  if(current.activeBrainStrategyId===id) current.activeBrainStrategyId=current.brainStrategies[0].id;
  persist();
}
function updateBrainAllocation(id,role,value){
  const s=current?.brainStrategies.find(x=>x.id===id); if(!s) return;
  s.allocation[role]=Math.max(0,Math.min(100,+value||0));
  persist();
}


/* =========================
   BUDGET
========================= */

function budget(t){

    return current.initialCredits - t.spent;

}


/*
   CREDITI MINIMI DA TENERE DA PARTE

   Ogni giocatore ancora necessario per completare
   la rosa deve poter essere acquistato almeno a 1 credito.
*/

function totalSlots(){

    const limits = roleLimits();

    return limits.P + limits.D + limits.C + limits.A;

}


function remainingPlayers(t){

    return Math.max(
        0,
        totalSlots() - t.players.length
    );

}


/*
   CREDITI REALMENTE SPENDIBILI

   Se mancano ancora N giocatori, bisogna conservare
   almeno N - 1 crediti per poter completare la rosa
   dopo il prossimo acquisto.
*/

function spendableBudget(t){

    return Math.max(
        0,
        budget(t) - Math.max(0, remainingPlayers(t) - 1)
    );

}



/* =========================
   RIGA SQUADRA
========================= */

function teamRow(t){

    return `

        <div class="teamrow">

            <div>

                <div
                    class="teamname teamname-open"
                    role="button"
                    tabindex="0"
                    onclick="openFormation(${t.id})"
                    onkeydown="if(event.key==='Enter' || event.key===' '){event.preventDefault();openFormation(${t.id})}">
                    ${esc(t.name)}
                </div>


                <div class="counts">

                    ${counts(t)}

                </div>

            </div>


            <div class="budget">

                ${spendableBudget(t)}

            </div>

        </div>

    `;

}


/* FORMAZIONI */
const FORMATION_MODULES={'3-4-3':[3,4,3],'3-5-2':[3,5,2],'4-3-3':[4,3,3],'4-4-2':[4,4,2],'4-5-1':[4,5,1],'5-3-2':[5,3,2],'5-4-1':[5,4,1]};
let formationTeamId=null;
let selectedBenchPlayerId=null;

function openFormation(teamId){
  formationTeamId=teamId;
  selectedBenchPlayerId=null;
  go('formation');
}

function formationAutoLine(players,role,needed){
  return players
    .filter(p=>p.role===role)
    .sort((a,b)=>b.price-a.price)
    .slice(0,needed);
}

function pitchArtwork(){
  return '<img class="pitch-art" src="./assets/campetto.JPG" alt="">';
}

function formationNeeds(module){
  const m=FORMATION_MODULES[module]||FORMATION_MODULES['3-4-3'];
  return {P:1,D:m[0],C:m[1],A:m[2]};
}

function getFormationStarters(team,module){
  const needs=formationNeeds(module);
  const byId=new Map(team.players.map(p=>[p.id,p]));
  const saved=Array.isArray(team.formationStarters)?team.formationStarters:[];
  const savedPlayers=saved.map(id=>byId.get(id)).filter(Boolean);
  const counts={P:0,D:0,C:0,A:0};
  savedPlayers.forEach(p=>counts[p.role]++);

  const valid=
    savedPlayers.length===11 &&
    savedPlayers.every(p=>counts[p.role]<=needs[p.role]) &&
    counts.P===needs.P && counts.D===needs.D &&
    counts.C===needs.C && counts.A===needs.A;

  if(valid) return savedPlayers;

  const starters=[
    ...formationAutoLine(team.players,'P',needs.P),
    ...formationAutoLine(team.players,'D',needs.D),
    ...formationAutoLine(team.players,'C',needs.C),
    ...formationAutoLine(team.players,'A',needs.A)
  ];

  team.formationStarters=starters.map(p=>p.id);
  return starters;
}

function saveFormationState(){
  localStorage.setItem('AF_CURRENT',JSON.stringify(current));
  const index=db.findIndex(a=>a.id===current?.id);
  if(index>=0){
    db[index]=current;
    localStorage.setItem('AF_DB',JSON.stringify(db));
  }
}

function renderFormation(){
  const title=$('formationTitle'),select=$('formationModule'),pitch=$('pitch'),bench=$('formationBench');

  if(!current||formationTeamId===null){
    title.innerHTML='<svg class="field-icon" viewBox="0 0 28 24" aria-hidden="true"><rect x="2" y="4" width="24" height="16" rx="1.4"/><path d="M14 4v16"/><circle cx="14" cy="12" r="2.7"/><path d="M2 7.5h4.5v9H2M26 7.5h-4.5v9H26"/></svg> Formazione';
    pitch.innerHTML='';
    bench.innerHTML='';
    return;
  }

  const team=current.teams.find(t=>t.id===formationTeamId);
  if(!team){
    pitch.innerHTML='';
    return;
  }

  title.innerHTML='<svg class="field-icon" viewBox="0 0 28 24" aria-hidden="true"><rect x="2" y="4" width="24" height="16" rx="1.4"/><path d="M14 4v16"/><circle cx="14" cy="12" r="2.7"/><path d="M2 7.5h4.5v9H2M26 7.5h-4.5v9H26"/></svg> '+esc(team.name);

  const saved=team.formationModule||'3-4-3';
  select.innerHTML=Object.keys(FORMATION_MODULES)
    .map(m=>'<option value="'+m+'"'+(m===saved?' selected':'')+'>'+m+'</option>')
    .join('');

  const allStarters=getFormationStarters(team,saved);
  const starters=[
    allStarters.filter(p=>p.role==='P'),
    allStarters.filter(p=>p.role==='D'),
    allStarters.filter(p=>p.role==='C'),
    allStarters.filter(p=>p.role==='A')
  ];

  const used=new Set(allStarters.map(p=>p.id));
  const positions=['82%','61%','39%','16%'];

  pitch.className='pitch';
  pitch.innerHTML=
    pitchArtwork()+
    starters.map((line,i)=>
      '<div class="formation-line" style="top:'+positions[i]+'">'+
      line.map(p=>
        '<button class="formation-player role-'+p.role+' '+(selectedBenchPlayerId!==null?'swap-target':'')+
        '" onclick="selectFieldPlayer('+p.id+')" aria-label="Giocatore '+esc(p.name)+'">'+
          '<div class="formation-shirt">'+p.role+'</div>'+
          '<div class="formation-player-name">'+esc(p.name)+'</div>'+
          '<div class="formation-player-price">'+p.price+'</div>'+
        '</button>'
      ).join('')+
      '</div>'
    ).join('');

  const roleOrder={P:0,D:1,C:2,A:3};
  const remaining=team.players
    .filter(p=>!used.has(p.id))
    .sort((a,b)=>(roleOrder[a.role]-roleOrder[b.role]) || (b.price-a.price));

  bench.innerHTML=remaining.length
    ? '<div class="bench-hint">'+
        (selectedBenchPlayerId===null
          ? 'Tocca un giocatore in panchina, poi un giocatore in campo dello stesso ruolo.'
          : 'Giocatore selezionato: <b>'+esc(remaining.find(p=>p.id===selectedBenchPlayerId)?.name||'')+'</b>. Ora scegli chi sostituire in campo.')+
      '</div>'+
      '<div class="bench-list">'+
      remaining.map(p=>
        '<button class="bench-player role-'+p.role+' '+(p.id===selectedBenchPlayerId?'selected':'')+
        '" onclick="selectBenchPlayer('+p.id+')">'+
          esc(p.name)+'<small>'+p.role+' · '+p.price+'</small>'+
        '</button>'
      ).join('')+
      '</div>'
    : '<div class="empty">Nessun giocatore in panchina.</div>';

  saveFormationState();
}

function selectBenchPlayer(playerId){
  selectedBenchPlayerId=selectedBenchPlayerId===playerId?null:playerId;
  renderFormation();
}

function selectFieldPlayer(playerId){
  if(selectedBenchPlayerId===null) return;

  const team=current?.teams.find(t=>t.id===formationTeamId);
  if(!team) return;

  const benchPlayer=team.players.find(p=>p.id===selectedBenchPlayerId);
  const fieldPlayer=team.players.find(p=>p.id===playerId);

  if(!benchPlayer||!fieldPlayer) return;

  if(benchPlayer.role!==fieldPlayer.role){
    const hint=$('formationBench');
    if(hint){
      const old=hint.querySelector('.bench-hint');
      if(old) old.innerHTML='⚠️ Puoi sostituire solo un giocatore dello <b>stesso ruolo</b>. Seleziona un '+benchPlayer.role+' in campo.';
    }
    return;
  }

  const starters=getFormationStarters(team,team.formationModule||'3-4-3');
  team.formationStarters=starters.map(p=>p.id===fieldPlayer.id?benchPlayer.id:p.id);

  selectedBenchPlayerId=null;
  saveFormationState();
  renderFormation();
}

function setFormationModule(module){
  if(!current||formationTeamId===null) return;
  const team=current.teams.find(t=>t.id===formationTeamId);
  if(!team) return;

  team.formationModule=module;
  team.formationStarters=null;
  selectedBenchPlayerId=null;
  saveFormationState();
  renderFormation();
}

/* =========================
   RENDER GENERALE
========================= */

function render(){


    /* HOME */

    if(!current){

        $('sub').textContent =
            'Nessuna asta aperta';

        $('welcome').textContent =
            'Benvenuto';

        $('homeDash').innerHTML = '';

    }

    else{

        $('sub').textContent =
            `${current.name} · ${current.date}`;


        $('welcome').textContent =
            current.name;


        $('homeDash').innerHTML = `

            <div class="card">

                <div class="h2">
                    Situazione asta
                </div>

                ${current.teams
                    .map(teamRow)
                    .join('')}

            </div>

        `;

    }



    /* ASTA - SQUADRE */

    $('miniTeams').innerHTML = current

        ? [...current.teams]
            .sort((a,b) => {

                const diff = spendableBudget(b) - spendableBudget(a);

                return diff || a.id - b.id;

            })
            .map(teamRow)
            .join('')

        : `
            <div class="empty">
                Crea prima un’asta.
            </div>
        `;



    /* DETTAGLIO SQUADRE */

    $('teamsList').innerHTML = current

        ? current.teams.map(t => `

            <div class="card">

                <div class="head" style="min-height:38px!important;padding:0!important">

                    <div>

                        <div
                            class="h2"
                            style="margin:0">

                            ${esc(t.name)}

                        </div>


                        <div class="counts">

                            ${counts(t)}

                        </div>

                    </div>


                    <div class="teamrow-actions">
                        <div class="budget">${spendableBudget(t)}</div>
                        <button class="ball-btn" onclick="openFormation(${t.id})" aria-label="Apri formazione" title="Apri campetto"><svg class="field-icon" viewBox="0 0 28 24" aria-hidden="true"><rect x="2" y="4" width="24" height="16" rx="1.4"/><path d="M14 4v16"/><circle cx="14" cy="12" r="2.7"/><path d="M2 7.5h4.5v9H2M26 7.5h-4.5v9H26"/></svg></button>
                    </div>

                </div>


                ${
                    t.players.length

                    ? t.players.map(p => `

                        <div class="teamrow">

                            <div>

                                ${esc(p.name)}

                                <span class="tag role-tag role-${p.role}">
                                    ${p.role}
                                </span>

                            </div>


                            <b>
                                ${p.price}
                            </b>

                        </div>

                    `).join('')


                    : `

                        <div class="empty">

                            Nessun acquisto

                        </div>

                    `
                }

            </div>

        `).join('')


        : `

            <div class="empty">
                Nessuna asta.
            </div>

        `;



    renderFormation();

    renderObjectives();

    renderBrain();

    renderFree();

    renderArchive();

}



/* =========================
   RICERCA GIOCATORI
========================= */

function searchPlayers(){

    if(!current) return;


    let q =
        ($('q').value || '')
        .trim()
        .toLowerCase();


    if(!q){

        $('results').innerHTML = '';

        return;

    }


    let sold = new Map();


    current.teams.forEach(t => {

        t.players.forEach(p => {

            sold.set(
                p.id,
                t.name
            );

        });

    });


    let arr =
        allPlayers()
        .filter(p =>
            p.name
            .toLowerCase()
            .includes(q)
        )
        .slice(0,20);



    $('results').innerHTML = arr.length

        ? arr.map(p => `

            <div
                class="result"
                onclick="openPlayer(${p.id})">


                <div class="name">

                    ${esc(p.name)}

                </div>


                <div class="meta">

                    <span class="tag role-tag role-${p.role}">
                        ${p.role}
                    </span>


                    ${esc(p.team)}


                    ${
                        current.objectives.includes(p.id)

                        ? `
                            <span class="tag goal">
                                🎯 Obiettivo
                            </span>
                          `

                        : ''
                    }


                    ${
                        sold.has(p.id)

                        ? `
                            <span class="tag">
                                Acquistato:
                                ${esc(sold.get(p.id))}
                            </span>
                          `

                        : ''
                    }

                </div>

            </div>

        `).join('')


        : `

            <div class="empty">

                Nessun calciatore trovato.

            </div>

        `;

}



/* =========================
   AGGIUNGI CALCIATORE
========================= */

function openAddPlayer(){
    if(!current){
        alert('Apri prima un’asta.');
        return;
    }

    openModal(`
        <div class="playername">➕ Aggiungi calciatore</div>
        <div class="meta" style="margin:6px 0 18px">
            Il giocatore sarà subito disponibile in Asta e nella sezione Free.
        </div>

        <div class="form">
            <label>Nome calciatore *</label>
            <input id="newPlayerName" placeholder="Es. Mario Rossi" autocomplete="off">

            <label>Ruolo *</label>
            <select id="newPlayerRole">
                <option value="P">Portiere (P)</option>
                <option value="D">Difensore (D)</option>
                <option value="C">Centrocampista (C)</option>
                <option value="A">Attaccante (A)</option>
            </select>

            <label>Squadra *</label>
            <input id="newPlayerTeam" placeholder="Es. Milan" autocomplete="off">

            <div class="grid2" style="gap:10px">
                <div>
                    <label>Crediti</label>
                    <input id="newPlayerCredits" type="number" min="0" step="0.1" value="0">
                </div>
                <div>
                    <label>% crediti</label>
                    <input id="newPlayerPct" type="number" min="0" step="0.01" placeholder="Facoltativo">
                </div>
            </div>

            <div class="grid2" style="gap:10px">
                <div>
                    <label>PMV</label>
                    <input id="newPlayerPmv" type="number" min="0" step="0.1" placeholder="Facoltativo">
                </div>
                <div>
                    <label>Appetibilità</label>
                    <input id="newPlayerAppeal" type="number" min="0" step="0.1" placeholder="Facoltativo">
                </div>
            </div>
        </div>

        <button class="btn primary" style="width:100%;margin-top:18px" onclick="saveNewPlayer()">
            ➕ Aggiungi al listone
        </button>
    `);
}

function saveNewPlayer(){
    const name = ($('newPlayerName')?.value || '').trim();
    const role = $('newPlayerRole')?.value || '';
    const team = ($('newPlayerTeam')?.value || '').trim();

    if(!name || !role || !team){
        alert('Inserisci almeno nome, ruolo e squadra.');
        return;
    }

    const normalizeName = s => s.trim().toLowerCase();
    const duplicate = allPlayers().some(p =>
        normalizeName(p.name || '') === normalizeName(name) &&
        p.role === role &&
        normalizeName(p.team || '') === normalizeName(team)
    );

    if(duplicate){
        alert('Questo calciatore è già presente nel listone.');
        return;
    }

    const num = id => {
        const raw = ($(id)?.value || '').trim();
        return raw === '' ? null : Number(raw);
    };

    if(!Array.isArray(current.extraPlayers)) current.extraPlayers = [];

    current.extraPlayers.push({
        id: -Date.now(),
        role,
        name,
        team,
        credits: num('newPlayerCredits') ?? 0,
        pct: num('newPlayerPct'),
        pmv: num('newPlayerPmv'),
        appeal: num('newPlayerAppeal'),
        manual: true
    });

    persist();
    closeModal();

    alert(name + ' è stato aggiunto ed è subito disponibile.');
}

/* =========================
   CALCIATORI FREE
========================= */

function setFreeRole(role, el){

    freeRole = role;

    document
        .querySelectorAll('#free .chip')
        .forEach(x => x.classList.remove('active'));

    if(el) el.classList.add('active');

    renderFreeSuggestions();

    renderFree();

}


function searchFreePlayers(){

    renderFreeSuggestions();

    renderFree();

}


function renderFreeSuggestions(){

    const box = $('freeSuggestions');

    if(!box) return;

    const query = ($('freeQ')?.value || '')
        .trim()
        .toLowerCase();

    if(!query || !current){

        box.style.display = 'none';
        box.innerHTML = '';

        return;

    }


    const sold = new Set();

    current.teams.forEach(t => {
        t.players.forEach(p => sold.add(p.id));
    });


    const matches = allPlayers()
        .filter(p =>
            !sold.has(p.id) &&
            (freeRole === 'ALL' || p.role === freeRole) &&
            p.name.toLowerCase().includes(query)
        )
        .sort((a,b) => a.name.localeCompare(b.name, 'it'))
        .slice(0, 8);


    if(!matches.length){

        box.style.display = 'none';
        box.innerHTML = '';

        return;

    }


    box.innerHTML = matches.map(p => `

        <button
            class="free-suggestion"
            type="button"
            onclick="selectFreeSuggestion(${p.id})">

            <div>

                <div class="free-suggestion-name">
                    ${esc(p.name)}
                </div>

                <div class="free-suggestion-meta">
                    ${esc(p.team)}
                </div>

            </div>

            <span class="tag role-tag role-${p.role}">
                ${p.role}
            </span>

        </button>

    `).join('');


    box.style.display = 'block';

}


function selectFreeSuggestion(id){

    const p = allPlayers().find(x => x.id === id);

    if(!p) return;

    const input = $('freeQ');

    if(input) input.value = p.name;

    const box = $('freeSuggestions');

    if(box){

        box.style.display = 'none';
        box.innerHTML = '';

    }

    renderFree();

}


function renderFree(){

    const box = $('freeList');

    if(!box) return;

    if(!current){

        box.innerHTML = `
            <div class="empty">
                Crea o apri prima un'asta.
            </div>
        `;

        return;

    }


    const sold = new Set();

    current.teams.forEach(t => {
        t.players.forEach(p => sold.add(p.id));
    });


    const query = ($('freeQ')?.value || '')
        .trim()
        .toLowerCase();

    const arr = allPlayers()
        .filter(p =>
            !sold.has(p.id) &&
            (freeRole === 'ALL' || p.role === freeRole) &&
            (
                !query ||
                p.name.toLowerCase().includes(query)
            )
        )
        .sort((a,b) => {
            const appealA = Number(a.appeal);
            const appealB = Number(b.appeal);

            const validA = Number.isFinite(appealA);
            const validB = Number.isFinite(appealB);

            if(validA && validB && appealB !== appealA){
                return appealB - appealA;
            }

            if(validA !== validB){
                return validA ? -1 : 1;
            }

            return a.name.localeCompare(b.name, 'it');
        });


    box.innerHTML = arr.length

        ? arr.map(p => `

            <div
                class="result free-result"
                onclick="openPlayer(${p.id}, 'free')">

                <div class="head">

                    <div>

                        <div class="name free-player-name">
                            <span>${esc(p.name)}</span>
                            ${current.objectives.includes(p.id)
                                ? `<span class="free-player-goal" title="${PRIORITIES[objectivePriority(p.id)].label}">${PRIORITIES[objectivePriority(p.id)].icon}</span>`
                                : ''
                            }
                        </div>

                        <div class="meta">
                            <span class="tag role-tag role-${p.role}">
                                ${p.role}
                            </span>

                            ${esc(p.team)}
                        </div>

                    </div>

                    <div style="text-align:right">

                        <div class="small muted">
                            Appetibilità
                        </div>

                        <div style="font-size:20px;font-weight:900">
                            ${p.appeal ?? '—'}
                        </div>

                    </div>

                </div>

            </div>

        `).join('')

        : `
            <div class="empty">
                Nessun calciatore libero per questo filtro.
            </div>
        `;

}



/* =========================
   PERCENTUALI
========================= */

function pct(v){

    if(v == null || v === ''){

        return '—';

    }


    return (
        Number(v) * 100
    ).toFixed(2) + '%';

}



/* =========================
   MODALITÀ ASTA LIVE
========================= */

function liveTeamRows(player){
    return [...current.teams].sort((a,b)=>spendableBudget(b)-spendableBudget(a)).map(t=>{
        const max=spendableBudget(t);
        const roleFull=t.players.filter(x=>x.role===player.role).length>=roleLimits()[player.role];
        const blocked=max<1||roleFull;
        return '<button class="live-team '+(blocked?'blocked':'')+'" '+(blocked?'disabled':'')+' onclick="selectLiveTeam('+t.id+',this)"><span><b>'+esc(t.name)+'</b><small>'+(roleFull?'Ruolo completo':'Offerta massima')+'</small></span><strong>'+(roleFull?'—':max)+'</strong></button>';
    }).join('');
}

function selectLiveTeam(teamId,button){
    document.querySelectorAll('.live-team').forEach(x=>x.classList.remove('selected'));
    button.classList.add('selected');
    $('buyer').value=teamId;
    const max=spendableBudget(current.teams.find(t=>t.id===+teamId));
    if(+$('price').value>max) $('price').value=max;
}

/* =========================
   NOTE CALCIATORI
========================= */

function playerNote(id){
    if(!current.playerNotes) current.playerNotes = {};
    return current.playerNotes[id] || '';
}

function savePlayerNote(id){
    if(!current.playerNotes) current.playerNotes = {};
    const field = $('playerNote');
    if(!field) return;
    const note = field.value.trim();
    if(note) current.playerNotes[id] = note;
    else delete current.playerNotes[id];
    persist();
    const status = $('noteStatus');
    if(status){
        status.textContent = '✓ Nota salvata';
        setTimeout(function(){
            if($('noteStatus')) $('noteStatus').textContent = '';
        },1800);
    }
}

/* =========================
   CONTEGGIO OBIETTIVI EQUIVALENTI
========================= */

function availableObjectiveCount(role, priority){
    if(!current) return 0;

    const sold = new Set();

    current.teams.forEach(t => {
        t.players.forEach(p => sold.add(p.id));
    });

    return allPlayers().filter(p =>
        p.role === role &&
        current.objectives.includes(p.id) &&
        !sold.has(p.id) &&
        objectivePriority(p.id) === priority
    ).length;
}

function objectiveRemainingHtml(player){

    if(!current.objectives.includes(player.id)) return '';

    const priority = objectivePriority(player.id);
    const count = availableObjectiveCount(player.role, priority);
    const data = PRIORITIES[priority];

    const message = count === 1
        ? 'È l’ultimo obiettivo ancora disponibile in questa categoria.'
        : count + ' obiettivi ancora disponibili in questa categoria.';

    return '<div class="objective-remaining">' +
        '<div class="objective-remaining-main">' +
            '<span>' + data.icon + ' ' + data.label + ' · ' + player.role + '</span>' +
            '<strong>' + count + '</strong>' +
        '</div>' +
        '<small>' + message + '</small>' +
    '</div>';
}


/* =========================
   CONSIGLIO OFFERTA
========================= */

function myTeam(){

    if(!current) return null;

    const id = Number.isFinite(+current.myTeamId)
        ? +current.myTeamId
        : 0;

    return current.teams.find(t => t.id === id)
        || current.teams[0]
        || null;

}


function recommendedOffer(player){

    const credits = Number(player.credits);
    const pmv = Number(player.pmv);

    /* Se il PMV non è disponibile, usiamo la tua valutazione. */
    let base;

    if(Number.isFinite(credits) && Number.isFinite(pmv)){
        base = credits * 0.70 + pmv * 0.30;
    }
    else if(Number.isFinite(credits)){
        base = credits;
    }
    else if(Number.isFinite(pmv)){
        base = pmv;
    }
    else{
        return null;
    }


    let multiplier = 1;

    if(current.objectives?.includes(player.id)){

        const priority = objectivePriority(player.id);

        if(priority === 'max') multiplier = 1.10;
        if(priority === 'high') multiplier = 1.05;

    }


    const advice = Math.max(1, Math.round(base * multiplier));

    const team = myTeam();

    if(!team) return advice;

    return Math.min(advice, spendableBudget(team));

}


/* =========================
   SCHEDA CALCIATORE
========================= */

function closePlayer(source){

    // Chiudendo una scheda giocatore azzeriamo SEMPRE
    // la posizione di scorrimento e la ricerca da cui è stata aperta.
    const sheet = $('sheet');
    const modal = $('modal');

    if(sheet) sheet.scrollTop = 0;
    if(modal) modal.scrollTop = 0;

    if(source !== 'free'){
        const q = $('q');
        const results = $('results');

        if(q){
            q.value = '';
            q.blur();
        }

        if(results) results.innerHTML = '';
    }

    if(source === 'free'){
        const freeQ = $('freeQ');
        const suggestions = $('freeSuggestions');

        if(freeQ){
            freeQ.value = '';
            freeQ.blur();
        }

        if(suggestions){
            suggestions.style.display = 'none';
            suggestions.innerHTML = '';
        }

        renderFree();
    }

    closeModal();

    // Alcuni browser mobili possono ripristinare lo scroll dopo il click
    // sul pulsante in fondo alla scheda: lo azzeriamo anche nei frame successivi.
    requestAnimationFrame(() => {
        if(sheet) sheet.scrollTop = 0;
        if(modal) modal.scrollTop = 0;
    });

    setTimeout(() => {
        if(sheet) sheet.scrollTop = 0;
        if(modal) modal.scrollTop = 0;
    }, 50);
}

function openPlayer(id, source){

    let p =
        allPlayers().find(x => x.id == id);


    let owner = null;

    let rec = null;



    current.teams.forEach(t => {

        let r =
            t.players.find(
                x => x.id == id
            );


        if(r){

            owner = t;

            rec = r;

        }

    });



    openModal(`


        <div class="head player-modal-head">

            <div>

                <div class="player-title-row">

                    <div class="playername">

                        ${esc(p.name)}

                    </div>

                    ${current.objectives.includes(p.id)
                        ? `
                            <span class="tag goal player-goal" title="${PRIORITIES[objectivePriority(p.id)].label}">
                                ${PRIORITIES[objectivePriority(p.id)].icon}
                            </span>
                          `
                        : ''
                    }

                </div>


                <div class="meta">

                    <span class="tag role-tag role-${p.role}">${p.role}</span>
                    ${esc(p.team)}

                </div>

            </div>


            <button
                class="player-privacy"
                id="playerPrivacyBtn"
                type="button"
                onclick="togglePlayerPrivacy()"
                aria-label="Nascondi dati privati"
                title="Nascondi dati privati">
                👁️
            </button>

            <button
                class="player-privacy"
                id="playerPrivacyBtn"
                type="button"
                onclick="togglePlayerPrivacy()"
                aria-label="Nascondi dati privati"
                title="Nascondi dati privati">
                👁️
            </button>

            <button
                class="player-close"
                type="button"
                onclick="closePlayer('${source === 'free' ? 'free' : 'auction'}')"
                aria-label="Chiudi scheda giocatore"
                title="Chiudi">
                ×
            </button>

        </div>



        <div class="player-private">

        <div class="player-private">

        <div class="kv">


            <div class="kvbox">

                <small>Crediti</small>

                <b>
                    ${p.credits ?? '—'}
                </b>

            </div>



            <div class="kvbox">

                <small>% crediti</small>

                <b>
                    ${pct(p.pct)}
                </b>

            </div>



            <div class="kvbox">

                <small>PMV</small>

                <b>
                    ${p.pmv ?? '—'}
                </b>

            </div>



            <div class="kvbox">

                <small>Appetibilità</small>

                <b>
                    ${p.appeal ?? '—'}
                </b>

            </div>


        </div>


        ${objectiveRemainingHtml(p)}


        <div class="offer-advice">

            <div class="offer-advice-row">

                <span>💰 Puoi spendere fino a</span>

                <strong>
                    ${myTeam() ? spendableBudget(myTeam()) : '—'}
                </strong>

            </div>

            <div class="offer-advice-row offer-recommended">

                <span>💡 Offerta consigliata</span>

                <strong>
                    ${recommendedOffer(p) ?? '—'}
                </strong>

            </div>

            <small>
                La proposta combina CREDITI (70%), PMV (30%) e la priorità del giocatore, senza mai superare il budget realmente spendibile.
            </small>

        </div>


        <div class="player-notes">

            <label>
                📝 Note personali
            </label>

            <textarea
                id="playerNote"
                rows="3"
                placeholder="Scrivi una nota su questo giocatore...">${esc(playerNote(p.id))}</textarea>

            <div class="note-actions">

                <button
                    class="btn secondary"
                    onclick="savePlayerNote(${p.id})">

                    💾 Salva nota

                </button>

                <span
                    id="noteStatus"
                    class="small muted">

                </span>

            </div>

        </div>


        ${ 
            source === 'objectives'

            ? ''

            : rec

            ? `


                <div
                    class="card"
                    style="background:var(--greenbg);border:0">


                    <b>
                        ACQUISTATO
                    </b>


                    <div style="margin-top:5px">

                        ${esc(owner.name)}
                        ·
                        ${rec.price}
                        crediti

                    </div>

                </div>



                <button
                    class="btn primary"
                    style="width:100%"
                    onclick="editPurchase(${p.id})">

                    ✏️ Modifica acquisto

                </button>


              `


            : `


                <div class="live-title">🔥 Asta Live</div>
                <div class="live-player-note">Seleziona la squadra vincitrice e inserisci il prezzo finale.</div>

                <label>Squadre ancora in gioco</label>
                <div class="live-teams">
                    ${liveTeamRows(p)}
                </div>

                <input id="buyer" type="hidden" value="">

                <label>Prezzo finale di acquisto</label>
                <input id="price" type="number" min="1" value="${p.credits || 1}" placeholder="Inserisci il prezzo finale">

                <button
                    class="btn primary"
                    style="width:100%;margin-top:12px"
                    onclick="assignPlayer(${p.id})">

                    🏆 Assegna giocatore

                </button>


              `
        }



        <button
            class="btn secondary"
            style="width:100%;margin-top:8px"
            onclick="closePlayer('${source === 'free' ? 'free' : 'auction'}'); return false;">

            Chiudi

        </button>


    `);

}



/* =========================
   MODALITÀ PRIVACY CALCIATORE
========================= */

function togglePlayerPrivacy(){

    const sheet = document.querySelector('#modal .sheet');

    if(!sheet) return;

    const active = sheet.classList.toggle('privacy-mode');
    const btn = $('playerPrivacyBtn');

    if(btn){
        btn.textContent = active ? '🙈' : '👁️';
        btn.setAttribute(
            'aria-label',
            active ? 'Mostra dati privati' : 'Nascondi dati privati'
        );
        btn.setAttribute(
            'title',
            active ? 'Mostra dati privati' : 'Nascondi dati privati'
        );
    }

}


/* =========================
   MODALITÀ PRIVACY CALCIATORE
========================= */

function togglePlayerPrivacy(){

    const sheet = document.querySelector('#modal .sheet');

    if(!sheet) return;

    const active = sheet.classList.toggle('privacy-mode');
    const btn = $('playerPrivacyBtn');

    if(btn){
        btn.textContent = active ? '🙈' : '👁️';
        btn.setAttribute(
            'aria-label',
            active ? 'Mostra dati privati' : 'Nascondi dati privati'
        );
        btn.setAttribute(
            'title',
            active ? 'Mostra dati privati' : 'Nascondi dati privati'
        );
    }

}


/* =========================
   ASSEGNA CALCIATORE
========================= */

function assignPlayer(id){

    if(!Array.isArray(current.history)){
        current.history = [];
    }

    let p =
        allPlayers().find(x => x.id == id);


    const buyerValue = $('buyer').value;

    if(buyerValue === ''){
        return alert('Seleziona prima la squadra che ha acquistato il giocatore.');
    }

    let t =
        current.teams.find(
            x => x.id === +buyerValue
        );


    let price =
        +$('price').value;



    if(!price || price < 1){

        return alert(
            'Inserisci un prezzo valido.'
        );

    }



    if(price > spendableBudget(t)){

        return alert(
            `Puoi spendere al massimo ${spendableBudget(t)} crediti, così resterà almeno 1 credito per ogni giocatore ancora necessario a completare la rosa.`
        );

    }



    const limits = roleLimits();

    if(
        t.players.filter(x => x.role === p.role).length >= limits[p.role]
    ){

        return alert(
            'Hai già raggiunto il numero massimo previsto per questo ruolo.'
        );

    }


    if(
        current.teams.some(
            t => t.players.some(
                p => p.id == id
            )
        )
    ){

        return alert(
            'Calciatore già acquistato.'
        );

    }



    t.players.push({

        id:p.id,

        name:p.name,

        role:p.role,

        price

    });



    t.spent += price;


    /* REGISTRA OPERAZIONE NELLO STORICO */

    current.history.push({
        playerId: p.id,
        name: p.name,
        role: p.role,
        realTeam: p.team || '',
        teamId: t.id,
        teamName: t.name,
        price,
        timestamp: Date.now()
    });


    persist();


    /* PULIZIA RICERCA */

    clearSearch();


    closeModal();

}



/* =========================
   STORICO ASTA
========================= */

function openHistory(){

    if(!current) return;

    $('sheet').closest('.sheet').classList.add('history-fullscreen');

    openModal(`

        <div class="h2">
            📜 Storico asta
        </div>

        <div class="small muted">
            Cerca un calciatore oppure annulla un acquisto.
        </div>

        <input
            id="historySearch"
            type="text"
            placeholder="🔍 Cerca calciatore"
            autocomplete="off"
            oninput="renderHistoryList()">

        <div
            id="historyResults"
            class="history-list"
            style="margin-top:10px">

        </div>

        <button
            class="btn secondary"
            style="width:100%;margin-top:8px"
            onclick="closeModal()">

            Chiudi

        </button>

    `);

    renderHistoryList();

}


function renderHistoryList(){

    const box = $('historyResults');

    if(!box) return;


    const query = ($('historySearch')?.value || '')
        .trim()
        .toLowerCase();


    const sold = Array.isArray(current.history)
        ? [...current.history]
            .sort((a,b) => b.timestamp - a.timestamp)
            .filter(x =>
                !query ||
                x.name.toLowerCase().includes(query)
            )
        : [];


    box.innerHTML = sold.length

        ? sold.map(x => `

            <div
                class="history-row"
                style="cursor:pointer"
                onclick="undoPurchase('${x.timestamp}')">

                <div>

                    <div class="name">
                        ${esc(x.name)}
                    </div>

                    <div class="meta">
                        ${esc(x.teamName)}
                        ·
                        ${x.role}
                        ${
                            x.realTeam
                            ? ' · ' + esc(x.realTeam)
                            : ''
                        }
                    </div>

                </div>

                <div style="text-align:right">

                    <strong>
                        ${x.price}
                    </strong>

                    <div class="small muted">
                        Tocca per annullare
                    </div>

                </div>

            </div>

        `).join('')

        : '<div class="empty">Nessun giocatore trovato nello storico.</div>';

}


function undoLastPurchase(){

    if(!Array.isArray(current.history) || !current.history.length){

        return alert('Non ci sono acquisti da annullare.');

    }


    const last = [...current.history]
        .sort((a,b) => b.timestamp - a.timestamp)[0];


    undoPurchase(last.timestamp);

}


function undoPurchase(timestamp){

    if(!Array.isArray(current.history)) return;


    const purchase = current.history.find(
        x => String(x.timestamp) === String(timestamp)
    );


    if(!purchase){

        return alert('Acquisto non trovato.');

    }


    if(!confirm(
        'Vuoi annullare questo acquisto?\n\n' +
        purchase.name + ' — ' + purchase.teamName +
        ' — ' + purchase.price + ' crediti'
    )){

        return;

    }


    const team = current.teams.find(
        t => t.id === purchase.teamId
    );


    if(!team){

        return alert('Squadra non trovata.');

    }


    const playerIndex = team.players.findIndex(
        p => p.id == purchase.playerId
    );


    if(playerIndex >= 0){

        team.players.splice(playerIndex,1);

    }


    team.spent = Math.max(
        0,
        team.spent - purchase.price
    );


    current.history = current.history.filter(
        x => x !== purchase
    );


    persist();

    renderHistoryList();

}


/* =========================
   PULIZIA RICERCA
========================= */

function clearSearch(){

    const q = $('q');

    const results = $('results');


    if(q){

        q.value = '';

    }


    if(results){

        results.innerHTML = '';

    }

}



/* =========================
   MODIFICA ACQUISTO
========================= */

function editPurchase(id){

    let old =
        current.teams.find(
            t => t.players.some(
                p => p.id == id
            )
        );


    let rec =
        old.players.find(
            p => p.id == id
        );



    openModal(`


        <div class="h2">

            ✏️ Modifica acquisto

        </div>


        <div class="small muted">

            ${esc(rec.name)}

        </div>



        <label>
            Squadra acquirente
        </label>


        <select id="buyer">

            ${current.teams.map(t => `

                <option
                    value="${t.id}"
                    ${t.id === old.id ? 'selected' : ''}>

                    ${esc(t.name)}

                </option>

            `).join('')}

        </select>



        <label>
            Prezzo di acquisto
        </label>


        <input
            id="price"
            type="number"
            min="1"
            value="${rec.price}">



        <button
            class="btn primary"
            style="width:100%;margin-top:12px"
            onclick="savePurchaseEdit(${id},${old.id})">

            Salva modifica

        </button>



        <button
            class="btn danger"
            style="width:100%;margin-top:8px"
            onclick="removePurchase(${id},${old.id})">

            Elimina acquisto

        </button>



        <button
            class="btn secondary"
            style="width:100%;margin-top:8px"
            onclick="closeModal()">

            Annulla

        </button>


    `);

}



/* =========================
   SALVA MODIFICA
========================= */

function savePurchaseEdit(id,oldId){

    let old =
        current.teams.find(
            t => t.id === oldId
        );


    let i =
        old.players.findIndex(
            p => p.id == id
        );


    let rec =
        old.players[i];


    let neu =
        current.teams.find(
            t => t.id === +$('buyer').value
        );


    let price =
        +$('price').value;



    if(!price || price < 1){

        return alert(
            'Prezzo non valido.'
        );

    }



    /*
       Calcoliamo il credito disponibile
       tenendo conto del vecchio acquisto.
    */

    let available =
        spendableBudget(neu);


    if(neu.id === old.id){

        available += rec.price;

    }


    if(price > available){

        return alert(
            `Puoi spendere al massimo ${available} crediti, così la squadra potrà comunque completare la rosa.`
        );

    }



    /* Rimuove vecchio acquisto */

    old.spent -= rec.price;

    old.players.splice(i,1);



    /* Aggiorna */

    rec.price = price;



    /* Inserisce nella nuova squadra */

    neu.players.push(rec);

    neu.spent += price;



    persist();


    closeModal();

}



/* =========================
   ELIMINA ACQUISTO
========================= */

function removePurchase(id,tid){

    let t =
        current.teams.find(
            t => t.id === tid
        );


    let i =
        t.players.findIndex(
            p => p.id == id
        );


    if(i >= 0){

        t.spent -=
            t.players[i].price;


        t.players.splice(i,1);


        persist();

    }


    closeModal();

}



/* =========================
   OBIETTIVI - RUOLO
========================= */

function setRole(r,el){

    objRole = r;


    document
        .querySelectorAll('#objectives .chip')
        .forEach(x =>
            x.classList.remove('active')
        );


    el.classList.add('active');


    renderObjectives();

}



/* =========================
   OBIETTIVI - DISPONIBILITÀ
========================= */

function setObjectiveStatus(status,el){

    objStatus = status;


    document
        .querySelectorAll('.objective-tab')
        .forEach(x =>
            x.classList.remove('active')
        );


    el.classList.add('active');


    renderObjectives();

}



/* =========================
   MODIFICA OBIETTIVI
========================= */

function editObjectives(){

    openModal(`


        <button type="button" class="setup-objectives-close" onclick="closeModal()" aria-label="Chiudi">×</button>

        <div class="h2 setup-objectives-title">

            🎯 Imposta obiettivi

        </div>


        <div class="small muted">

            Tocca il nome per aprire la scheda del calciatore.<br>
            Tocca il simbolo a destra per scegliere il grado di appetibilità:
            ☆ → ★ → 🔥 → ⭐ → 👍 → 🎲 → ☆.

        </div>



        <div
            class="chips"
            style="margin-top:12px">


            <button
                class="chip role-P active"
                onclick="setupRole('P',this)">
                P
            </button>


            <button
                class="chip role-D"
                onclick="setupRole('D',this)">
                D
            </button>


            <button
                class="chip role-C"
                onclick="setupRole('C',this)">
                C
            </button>


            <button
                class="chip role-A"
                onclick="setupRole('A',this)">
                A
            </button>


        </div>



        <label>
            Cerca
        </label>


        <input
            id="oq"
            placeholder="Nome calciatore…"
            oninput="renderSetup()">



        <div id="setupList"></div>



        <button
            class="btn primary"
            style="width:100%;margin-top:12px"
            onclick="closeModal()">

            Fatto

        </button>


    `);



    window.setupR = 'P';


    renderSetup();

}



function clearObjectiveSetupSearch(){
    const input = $('oq');
    if(input) input.value = '';
}

function setupRole(r,el){

    window.setupR = r;


    document
        .querySelectorAll('.sheet .chip')
        .forEach(x =>
            x.classList.remove('active')
        );


    el.classList.add('active');


    renderSetup();

}



function renderSetup(){

    let q =
        ($('oq')?.value || '')
        .toLowerCase();

    let r =
        window.setupR || 'P';

    let arr =
        allPlayers()
        .filter(p =>
            p.role === r &&
            (
                !q ||
                p.name
                .toLowerCase()
                .includes(q)
            )
        )
        .slice(0,100);

    $('setupList').innerHTML =
        arr.map(p => {

            const isObjective = current.objectives.includes(p.id);
            const priority = isObjective ? objectivePriority(p.id) : null;
            const state = isObjective
                ? (PRIORITIES[priority] || PRIORITIES.base)
                : {icon:'☆', label:'Aggiungi agli obiettivi'};

            return `
                <div class="result">

                    <div
                        class="head"
                        style="cursor:pointer"
                        onclick="openPlayer(${p.id}, 'objectives')">

                        <div>

                            <div class="name">
                                ${esc(p.name)}
                            </div>

                            <div class="meta">
                                ${esc(p.team)}
                                <span class="tag role-tag role-${p.role}">${p.role}</span>
                                · Appetibilità:
                                ${p.appeal ?? '—'}
                            </div>

                        </div>

                        <button
                            type="button"
                            onclick="cycleSetupObjective(${p.id}, event)"
                            title="${state.label}"
                            aria-label="${state.label}"
                            style="width:46px;height:46px;border:0;background:transparent;font-size:28px;cursor:pointer;line-height:1">
                            ${state.icon}
                        </button>

                    </div>

                </div>
            `;
        }).join('');

}



/* =========================
   AGGIUNGI / TOGLI OBIETTIVO
========================= */

function cycleSetupObjective(id,event){

    if(event) event.stopPropagation();

    if(!current.objectivePriorities) current.objectivePriorities = {};

    const i = current.objectives.indexOf(id);

    /* ☆ → ★ : entra negli obiettivi */
    if(i < 0){

        current.objectives.push(id);
        current.objectivePriorities[id] = 'base';

    }

    else{

        const priority = objectivePriority(id);

        /* ★ → 🔥 → ⭐ → 👍 → 🎲 → ☆ */
        const next = {
            base:'max',
            max:'high',
            high:'low',
            low:'bet'
        };

        if(priority === 'bet'){

            current.objectives.splice(i,1);
            delete current.objectivePriorities[id];

        }

        else{

            current.objectivePriorities[id] = next[priority] || 'max';

        }

    }

    /* Salva senza chiudere la finestra di impostazione. */
    localStorage.setItem('AF_DB', JSON.stringify(db));
    localStorage.setItem('AF_CURRENT', JSON.stringify(current));

    renderSetup();

    if(typeof renderObjectives === 'function'){
        renderObjectives();
    }

}



/* =========================
   PRIORITÀ OBIETTIVI
========================= */

const PRIORITIES = {
    max:  { icon:'🔥', label:'Priorità massima', order:5 },
    high: { icon:'⭐', label:'Priorità alta', order:4 },
    low:  { icon:'👍', label:'Interessante', order:3 },
    base: { icon:'★', label:'Obiettivo', order:2 },
    bet:  { icon:'🎲', label:'Scommessa', order:1 }
};

function objectivePriority(id){
    if(!current.objectivePriorities) current.objectivePriorities = {};
    return current.objectivePriorities[id] || 'low';
}

function cycleObjectivePriority(id,event){
    if(event) event.stopPropagation();
    if(!current.objectivePriorities) current.objectivePriorities = {};

    const next={
        base:'max',
        max:'high',
        high:'low',
        low:'bet',
        bet:'max'
    };

    const currentPriority = objectivePriority(id);
    current.objectivePriorities[id] = next[currentPriority] || 'max';

    persist();
    renderObjectives();
}

/* =========================
   LISTA OBIETTIVI
========================= */

function renderObjectives(){

    if(!current) return;


    const q = ($('objQ')?.value || '').trim().toLowerCase();

    let sold = new Set();


    current.teams.forEach(t => {

        t.players.forEach(p => {

            sold.add(p.id);

        });

    });



    let arr =
        allPlayers()
        .filter(p =>
            p.role === objRole &&
            current.objectives.includes(p.id) &&
            (
                !q ||
                p.name.toLowerCase().includes(q)
            ) &&
            (
                objStatus === 'available'
                    ? !sold.has(p.id)
                    : sold.has(p.id)
            )
        )
        .sort((a,b) => {
            const pa = PRIORITIES[objectivePriority(a.id)].order;
            const pb = PRIORITIES[objectivePriority(b.id)].order;
            if(pb !== pa) return pb - pa;
            return (b.appeal ?? -1) - (a.appeal ?? -1);
        });



    $('objList').innerHTML =
        arr.length

        ? arr.map(p => `

            <div
                class="result objective-result"
                style="padding:5px 10px!important;margin:0 0 4px!important;min-height:0!important"
                onclick="openPlayer(${p.id}, 'objectives')">


                <div class="head" style="min-height:38px!important;padding:0!important">


                    <div>

                        <div class="name">

                            ${esc(p.name)}

                        </div>


                        <div class="meta">

                            ${esc(p.team)}
                            <span class="tag role-tag role-${p.role}">${p.role}</span>

                            ${
                                sold.has(p.id)

                                ? `
                                    <span class="tag">
                                        Non disponibile
                                    </span>
                                  `

                                : `
                                    <span class="tag avail">
                                        Disponibile
                                    </span>
                                  `
                            }

                        </div>

                    </div>


                    <div
                        class="objective-priority" style="padding:2px 5px!important;min-width:44px!important;line-height:1!important"
                        onclick="cycleObjectivePriority(${p.id}, event)"
                        title="Tocca per cambiare priorità">

                        <span>
                            ${PRIORITIES[objectivePriority(p.id)].icon}
                        </span>

                        <small>
                            ${PRIORITIES[objectivePriority(p.id)].label}
                        </small>

                    </div>


                </div>

            </div>

        `).join('')


        : `

            <div class="empty">

                ${objStatus === 'available'
                    ? 'Nessun obiettivo disponibile.'
                    : 'Nessun obiettivo non disponibile.'}

            </div>

        `;

}



/* =========================
   APRI ASTA DALL'ARCHIVIO
========================= */

function openSaved(id){

    let auction =
        db.find(x => x.id === id);


    if(!auction) return;


    current = auction;


    persist();


    go('auction');

}



/* =========================
   ELIMINA ASTA
========================= */

function deleteAuction(id){

    let a =
        db.find(x => x.id === id);


    if(!a) return;


    if(
        !confirm(
            `Eliminare definitivamente l'asta "${a.name}"?\n\n` +
            `Saranno eliminati anche tutti gli acquisti e gli obiettivi salvati in quella asta.`
        )
    ){

        return;

    }



    db =
        db.filter(x => x.id !== id);



    if(
        current &&
        current.id === id
    ){

        current =
            db.length
            ? db[0]
            : null;

    }


    persist();

}



/* =========================
   ARCHIVIO
========================= */

function renderArchive(){

    $('archiveList').innerHTML =
        db.length

        ? db.map(a => `

            <div class="card">


                <div class="head">


                    <div>

                        <div
                            class="h2"
                            style="margin:0">

                            ${esc(a.name)}

                        </div>


                        <div class="meta">

                            ${a.date}
                            ·
                            ${a.teams.length} squadre
                            ·
                            ${a.initialCredits} crediti

                        </div>

                    </div>



                    <div
                        style="display:flex;gap:7px">


                        <button
                            class="btn primary"
                            style="min-height:42px;padding:8px 11px"
                            onclick="openSaved(${a.id})">

                            Apri

                        </button>



                        <button
                            class="btn danger"
                            style="min-height:42px;padding:8px 11px"
                            onclick="deleteAuction(${a.id})"
                            aria-label="Elimina asta">

                            🗑️

                        </button>


                    </div>


                </div>


            </div>

        `).join('')


        : `

            <div class="empty">

                Nessuna asta salvata.

            </div>

        `;

}



/* =========================
   AVVIO APP
========================= */

render();

checkListoneVersion();


/* =========================
   CONTROLLO AGGIORNAMENTO LISTONE
========================= */

async function checkListoneVersion(){

    try{

        const res = await fetch(
            `./listone-version.json?ts=${Date.now()}`,
            { cache:'no-store' }
        );

        if(!res.ok) return;

        const info = await res.json();

        const version = String(
            info.version || ''
        );

        if(!version) return;

        const key = 'AF_LISTONE_VERSION';

        const previous = localStorage.getItem(key);


        /* Primo avvio: memorizza la versione senza disturbare */

        if(!previous){

            localStorage.setItem(key, version);

            return;

        }


        /* Nuovo listone disponibile */

        if(previous !== version){

            localStorage.setItem(key, version);

            alert(
                'È disponibile un nuovo Listone.\n\n' +
                'L’app verrà aggiornata mantenendo tutte le tue aste, gli acquisti e gli obiettivi salvati.'
            );

            window.location.reload();

        }

    }

    catch(e){

        /* Offline o controllo non disponibile: l'app continua normalmente */

    }

}


/* SERVICE WORKER */

if("serviceWorker" in navigator){

    navigator
        .serviceWorker
        .register("./sw.js")
        .catch(() => {});

}


// Il pulsante di aggiornamento è disponibile nella Home.
window.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = $('refreshAppBtn');
    if(refreshBtn){
        refreshBtn.style.display = 'flex';
    }
});
