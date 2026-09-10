/* Brain budget fix v3.4.51
   Compatibilità con Bacchetta v11: il massimale del giocatore è vincolante
   e il totale delle prenotazioni non può superare il budget del ruolo.
*/
(function(){
'use strict';
const VERSION='3.4.51';
function players(){return typeof allPlayers==='function'?allPlayers():[];}
function active(){return typeof activeBrainStrategy==='function'?activeBrainStrategy():current?.brainStrategies?.find(s=>s.id===current?.activeBrainStrategyId);}
function maxBid(p){const n=Number(p?.credits);return Number.isFinite(n)&&n>0?Math.round(n):1;}
function sync(){
  const s=active();
  if(!s||!s.slotTargets||!s.slotAllocation)return;
  const initial=Number(current?.initialCredits)||0,alloc=s.allocation||{};
  ['P','D','C','A'].forEach(role=>{
    const planned=Math.max(1,initial*(Number(alloc[role])||0)/100),targets=Array.isArray(s.slotTargets[role])?s.slotTargets[role]:[],arr=Array.isArray(s.slotAllocation[role])?s.slotAllocation[role].slice():[];
    targets.forEach((target,index)=>{
      if(target?.playerId==null){arr[index]=0;return;}
      const p=players().find(x=>String(x.id)===String(target.playerId));
      if(!p){arr[index]=0;return;}
      let bid=maxBid(p);
      for(const team of current?.teams||[]){const bought=(team.players||[]).find(x=>String(x.id)===String(p.id));if(bought){bid=Math.max(1,Number(bought.price)||0);break;}}
      arr[index]=Math.round(bid/planned*1000)/10;
    });
    s.slotAllocation[role]=arr;
  });
}
function install(){
  const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION;
  if(typeof window.renderBrain!=='function')return false;
  if(window.renderBrain.__brainBudgetFix51)return true;
  const original=window.renderBrain;
  window.renderBrain=function(){sync();return original.apply(this,arguments)};
  window.renderBrain.__brainBudgetFix51=true;
  return true;
}
function boot(){if(install())return;let n=0;const timer=setInterval(()=>{if(install()||++n>60)clearInterval(timer)},50);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
