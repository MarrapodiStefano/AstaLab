/* Brain target price fix 3.5.71 — prezzo target dalla voce Crediti */
(function(){
'use strict';
const VERSION='3.5.71';
function state(){try{return JSON.parse(localStorage.getItem('AF_CURRENT')||'null')}catch(e){return null}}
function sync(){
 const s=state();
 if(!s||!Array.isArray(s.brainStrategies)||typeof window.allPlayers!=='function')return;
 const st=s.brainStrategies.find(x=>Number(x.id)===Number(s.activeBrainStrategyId));
 if(!st)return;
 const my=s.teams?.find(t=>Number(t.id)===Number(s.myTeamId))||s.teams?.[0];
 const owned=new Set((my?.players||[]).map(p=>String(p.id)));
 ['P','D','C','A'].forEach(function(role){
  const row=[...document.querySelectorAll('#brainContent .brain-role-row')].find(x=>x.classList.contains('role-'+role));
  if(!row)return;
  const roleBudget=(Number(s.initialCredits)||0)*(Math.max(0,Number(st.allocation?.[role])||0))/100;
  row.querySelectorAll('.brain-slot').forEach(function(slot){
   const p=slot.querySelector('.brain-slot-player');
   if(!p)return;
   const name=String(p.textContent||'').trim();
   if(!name||name==='Scegli giocatore')return;
   const player=window.allPlayers().find(x=>String(x.name||'').trim()===name);
   if(!player||owned.has(String(player.id)))return;
   const credits=Number(player.credits);
   if(!Number.isFinite(credits))return;
   const budget=slot.querySelector('.brain-slot-budget, .brain-slot-budget-input');
   const pct=slot.querySelector('.brain-slot-percent input');
   const value=String(Math.round(credits));
   const percent=roleBudget>0?String(Math.round(credits/roleBudget*100)):'0';
   if(budget){if('value' in budget)budget.value=value;if(budget.textContent!==value)budget.textContent=value}
   if(pct&&String(pct.value)!==percent)pct.value=percent;
  });
 });
 const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION;
}
function hook(){
 if(typeof window.renderBrain!=='function'||window.renderBrain.__brain371)return;
 const old=window.renderBrain;
 const wrapped=function(){const out=old.apply(this,arguments);setTimeout(sync,0);return out};
 wrapped.__brain371=true;window.renderBrain=wrapped;
}
function boot(){setTimeout(sync,0);setTimeout(sync,150);let tries=0;const id=setInterval(function(){hook();sync();if(++tries>40)clearInterval(id)},100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.BrainTargetPriceFix={version:VERSION,sync};
})();
