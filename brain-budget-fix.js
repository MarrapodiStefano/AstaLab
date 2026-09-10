/* Brain budget fix v3.4.50
   Lo slot con un giocatore usa il suo massimale (credits) come budget riservato.
   Esempio: Kolo Muani 360 / budget Attaccanti 600 = 60% e 360 crediti.
*/
(function(){
'use strict';
const VERSION='3.4.50';
function players(){return typeof allPlayers==='function'?allPlayers():[];}
function active(){return typeof activeBrainStrategy==='function'?activeBrainStrategy():current?.brainStrategies?.find(s=>s.id===current?.activeBrainStrategyId);}
function maxBid(p){const n=Number(p?.credits);return Number.isFinite(n)&&n>0?Math.round(n):1;}
function sync(){
  const s=active();
  if(!s||!s.slotTargets||!s.slotAllocation)return;
  const initial=Number(current?.initialCredits)||0;
  const alloc=s.allocation||{};
  ['P','D','C','A'].forEach(role=>{
    const planned=Math.max(1,initial*(Number(alloc[role])||0)/100);
    const targets=Array.isArray(s.slotTargets[role])?s.slotTargets[role]:[];
    const arr=Array.isArray(s.slotAllocation[role])?s.slotAllocation[role].slice():[];
    targets.forEach((target,index)=>{
      if(target?.playerId==null)return;
      const p=players().find(x=>String(x.id)===String(target.playerId));
      if(!p)return;
      let bid=maxBid(p);
      for(const team of (current?.teams||[])){
        const bought=(team.players||[]).find(x=>String(x.id)===String(p.id));
        if(bought){bid=Math.max(1,Number(bought.price)||0);break;}
      }
      arr[index]=Math.round((bid/planned)*1000)/10;
    });
    s.slotAllocation[role]=arr;
  });
}
function install(){
  const v=document.querySelector('.app-version');
  if(v)v.textContent='V. '+VERSION;
  if(typeof window.renderBrain!=='function')return false;
  if(window.renderBrain.__brainBudgetFix50)return true;
  const original=window.renderBrain;
  window.renderBrain=function(){sync();return original.apply(this,arguments)};
  window.renderBrain.__brainBudgetFix50=true;
  return true;
}
function boot(){
  if(install())return;
  let n=0;
  const timer=setInterval(()=>{if(install()||++n>60)clearInterval(timer)},50);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
