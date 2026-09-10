/* Asta Fantacalcio — Brain stability fix 3.4.56
   Corregge esclusivamente:
   - più strategie persistenti
   - apertura/espansione della strategia toccando tutta la riga
   Non modifica Aggiorna né il menu inferiore.
*/
(function(){
'use strict';
const VERSION='3.4.56';

function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}
function uniqueId(){
  let id=Date.now();
  const used=new Set((current?.brainStrategies||[]).map(s=>String(s.id)));
  while(used.has(String(id))) id++;
  return id;
}
function defaults(){return {P:2,D:9,C:9,A:7}}
function normalizeStrategy(s,i){
  if(!s||typeof s!=='object') s={};
  if(!s.id)s.id=uniqueId()+i;
  if(!s.name)s.name='Strategia '+(i+1);
  if(!s.allocation||typeof s.allocation!=='object')s.allocation={P:10,D:10,C:30,A:50};
  if(!s.slots||typeof s.slots!=='object')s.slots=defaults();
  return s;
}
function ensureStrategies(){
  if(!current)return;
  if(!Array.isArray(current.brainStrategies))current.brainStrategies=[];
  current.brainStrategies=current.brainStrategies.filter(Boolean).map((s,i)=>normalizeStrategy(s,i));
  if(!current.brainStrategies.length){
    current.brainStrategies=[{id:uniqueId(),name:'Strategia 1',allocation:{P:10,D:10,C:30,A:50},slots:defaults()}];
  }
  if(!current.activeBrainStrategyId||!current.brainStrategies.some(s=>String(s.id)===String(current.activeBrainStrategyId))){
    current.activeBrainStrategyId=current.brainStrategies[0].id;
  }
}

/* Sostituisce solo la funzione di creazione: append, mai replace. */
window.createBrainFromTemplate=function(key){
  if(!current)return;
  ensureStrategies();
  const templates=window.BRAIN_TEMPLATES;
  const t=Array.isArray(templates)?templates.find(x=>x.key===key):null;
  const allocation=t?.allocation||{P:25,D:25,C:25,A:25};
  const baseName=t?.name?String(t.name).replace(/^[^ ]+ /,''):'Personalizzata';
  const n=current.brainStrategies.length+1;
  const s={
    id:uniqueId(),
    name:baseName+' '+n,
    allocation:clone(allocation),
    slots:defaults(),
    template:key
  };
  current.brainStrategies.push(s);
  current.activeBrainStrategyId=s.id;
  window.brainExpandedId=s.id;
  if(typeof window.closeBrainTemplatePicker==='function')window.closeBrainTemplatePicker();
  if(typeof window.persist==='function')window.persist();
  else localStorage.setItem('AF_CURRENT',JSON.stringify(current));
};

window.addBrainStrategy=function(){
  if(!current){alert('Apri prima un’asta.');return}
  ensureStrategies();
  if(typeof window.openBrainTemplatePicker==='function')window.openBrainTemplatePicker();
};

/* Garantisce che il nome/area della strategia sia realmente tappabile. */
function bindStrategyClicks(){
  if(document.documentElement.dataset.brainStrategyClickFix==='1')return;
  document.documentElement.dataset.brainStrategyClickFix='1';
  document.addEventListener('click',function(e){
    const card=e.target?.closest?.('.brain-strategy');
    if(!card)return;
    const name=e.target?.closest?.('.brain-strategy-name');
    const edit=e.target?.closest?.('.brain-strategy-edit');
    if(edit)return;
    if(name){
      /* L'onclick originale dovrebbe già eseguire. Questo fallback interviene
         soltanto se il browser non lo ha fatto. */
      return;
    }
    const all=[...(current?.brainStrategies||[])];
    const visible=[...document.querySelectorAll('.brain-strategy')];
    const index=visible.indexOf(card);
    const s=all[index];
    if(!s)return;
    if(typeof window.toggleBrainStrategy==='function')window.toggleBrainStrategy(s.id);
  },false);
}

function addStyles(){
  if(document.getElementById('brainStabilityStyle56'))return;
  const s=document.createElement('style');s.id='brainStabilityStyle56';
  s.textContent=`
    .brain-strategy-title{touch-action:manipulation!important}
    .brain-strategy-name{pointer-events:auto!important;position:relative!important;z-index:2!important}
    .brain-strategy:not(.expanded) .brain-strategy-title{min-height:56px}
  `;
  document.head.appendChild(s);
}

function install(){
  if(!window.current&&typeof current==='undefined')return false;
  ensureStrategies();
  bindStrategyClicks();
  addStyles();
  const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION;
  return true;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
let tries=0;const timer=setInterval(()=>{if(install()||++tries>30)clearInterval(timer)},100);
})();
