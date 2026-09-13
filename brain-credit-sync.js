/* Brain credit sync 3.5.80 — il budget target segue i crediti della scheda giocatore */
(function(){
'use strict';
const VERSION='3.5.80';
const ROLES=['P','D','C','A'];
let running=false;

function getState(){
  try{return (typeof current!=='undefined'&&current)||JSON.parse(localStorage.getItem('AF_CURRENT')||'null')}catch(e){return null}
}
function getPlayers(){
  try{
    if(typeof window.allPlayers==='function') return window.allPlayers();
    if(typeof allPlayers==='function') return allPlayers();
    if(Array.isArray(window.PLAYERS)) return window.PLAYERS;
    return [];
  }catch(e){return []}
}
function norm(s){return String(s||'').trim().toLowerCase()}
function roleBudget(s,st,r){
  const allocation=st?.allocation||st?.baseAllocation||{};
  return Math.max(0,Math.round((Number(s?.initialCredits)||1200)*(Number(allocation[r])||0)/100));
}
function saveState(s){
  try{
    localStorage.setItem('AF_CURRENT',JSON.stringify(s));
    const db=JSON.parse(localStorage.getItem('AF_DB')||'[]');
    const i=db.findIndex(x=>Number(x.id)===Number(s.id));
    if(i>=0){db[i]=s;localStorage.setItem('AF_DB',JSON.stringify(db));}
  }catch(e){}
}
function sync(){
  if(running)return;
  const s=getState(),st=s?.brainStrategies?.find(x=>Number(x.id)===Number(s.activeBrainStrategyId));
  if(!s||!st)return;
  const ps=getPlayers();
  if(!ps.length)return;
  running=true;
  let changed=false;
  try{
    ROLES.forEach(function(r){
      const budget=roleBudget(s,st,r);
      const row=[...document.querySelectorAll('#brainContent .brain-role-row')].find(x=>x.classList.contains('role-'+r));
      if(!row)return;
      [...row.querySelectorAll('.brain-slot')].forEach(function(slot,i){
        if(slot.classList.contains('purchased')||slot.classList.contains('is-frozen'))return;
        const playerEl=slot.querySelector('.brain-slot-player');
        if(!playerEl)return;
        const name=String(playerEl.textContent||'').trim();
        if(!name||name==='Scegli giocatore'||name==='Giocatore acquistato')return;
        const p=ps.find(x=>norm(x.name)===norm(name)&&String(x.role||'').toUpperCase()===r);
        if(!p)return;
        const credits=Math.max(0,Math.round(Number(p.credits)||0));
        if(credits<=0)return;
        const manual=st.slotBudgetManual?.[r]?.[i]===true;
        const budgetEl=slot.querySelector('.brain-slot-budget-input,.brain-slot-budget');
        const pctEl=slot.querySelector('.brain-slot-percent input');
        if(!manual){
          if(budgetEl){
            if('value' in budgetEl){if(String(budgetEl.value)!==String(credits))budgetEl.value=String(credits)}
            else if(budgetEl.textContent!==String(credits))budgetEl.textContent=String(credits);
          }
          const pct=budget>0?Math.round(credits/budget*100):0;
          if(pctEl&&String(pctEl.value)!==String(pct))pctEl.value=String(pct);
          st.slotBudgets=st.slotBudgets&&typeof st.slotBudgets==='object'?st.slotBudgets:{};
          st.slotBudgets[r]=Array.isArray(st.slotBudgets[r])?st.slotBudgets[r]:[];
          if(Number(st.slotBudgets[r][i])!==credits){st.slotBudgets[r][i]=credits;changed=true}
        }
      });
    });
    if(changed)saveState(s);
  }finally{running=false}
}
function boot(){
  sync();
  setInterval(sync,350);
  const v=document.querySelector('.app-version');
  if(v)v.textContent='V. '+VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.BrainCreditSync={version:VERSION,sync};
})();
