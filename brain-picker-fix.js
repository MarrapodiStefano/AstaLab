/* Brain player picker fix v3.4.45
   Mostra tutti gli obiettivi della stessa appetibilità, gestendo correttamente
   anche gli ID salvati come stringhe invece che come numeri.
*/
(function(){
'use strict';
const VERSION='3.4.45';

function sameId(a,b){
  return String(a)===(String(b));
}

function isObjective(id){
  const list=current?.objectives;
  if(!Array.isArray(list)) return false;
  return list.some(x=>sameId(x,id));
}

function priorityOf(id){
  const map=current?.objectivePriorities||{};
  return map[id] || map[String(id)] || map[Number(id)] || 'low';
}

function soldIds(){
  const sold=new Set();
  (current?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>sold.add(String(p.id))));
  return sold;
}

function fixedBrainSlotPlayers(role,priority){
  const sold=soldIds();
  return allPlayers()
    .filter(p=>{
      if(p.role!==role) return false;
      if(sold.has(String(p.id))) return false;
      if(!isObjective(p.id)) return false;
      return priorityOf(p.id)===priority;
    })
    .sort((a,b)=>Number(b.appeal||0)-Number(a.appeal||0)||String(a.name||'').localeCompare(String(b.name||''),'it'));
}

function install(){
  if(typeof allPlayers!=='function') return false;
  window.brainSlotPlayers=fixedBrainSlotPlayers;
  const v=document.querySelector('.app-version');
  if(v) v.textContent=VERSION;
  return true;
}

function boot(){
  install();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    install();
    if(tries>=30) clearInterval(timer);
  },100);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
