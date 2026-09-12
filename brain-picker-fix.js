/* Brain picker results redesign 3.5.28 */
(function(){
'use strict';
const VERSION='3.5.28';
function setVersion(){const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION}
function installStyle(){if(document.getElementById('brainPickerBudgetStyleV28'))return;const s=document.createElement('style');s.id='brainPickerBudgetStyleV28';s.textContent=`
.brain-player-option{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) auto auto auto!important;
  align-items:center!important;
  gap:10px!important;
  min-height:58px!important;
  padding:10px 14px!important;
  box-sizing:border-box!important;
  border-bottom:1px solid rgba(80,90,100,.12)!important;
  background:#fff!important;
}
.brain-player-option:last-child{border-bottom:0!important}
.brain-player-option-name{
  min-width:0!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
  font-weight:800!important;
}
.brain-player-option-budget-v28{
  min-width:48px!important;
  height:34px!important;
  padding:0 9px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  box-sizing:border-box!important;
  border-radius:10px!important;
  background:rgba(105,115,134,.10)!important;
  color:#566174!important;
  font-size:15px!important;
  font-weight:850!important;
  white-space:nowrap!important;
}
.brain-player-option-team{
  margin:0!important;
  max-width:92px!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
  color:#697386!important;
  font-weight:700!important;
  font-size:14px!important;
}
.brain-player-option .brain-player-option-check,
.brain-player-option .check,
.brain-player-option .selected-check{margin-left:0!important}
@media(max-width:390px){
  .brain-player-option{grid-template-columns:minmax(0,1fr) auto auto auto!important;gap:7px!important;padding:9px 10px!important;min-height:56px!important}
  .brain-player-option-budget-v28{min-width:44px!important;height:32px!important;padding:0 7px!important;font-size:14px!important}
  .brain-player-option-team{max-width:76px!important;font-size:13px!important}
}
`;document.head.appendChild(s)}
function addBudgets(){const modal=document.getElementById('modal');if(!modal||!modal.classList.contains('show'))return;let state=null;try{state=JSON.parse(localStorage.getItem('AF_CURRENT')||'null')}catch(e){return}if(!state)return;modal.querySelectorAll('.brain-player-option').forEach(function(option){const current=option.querySelector('.brain-player-option-budget-v28');option.querySelectorAll('.brain-player-option-budget,.brain-player-option-budget-v25,.brain-player-option-budget-v26,.brain-player-option-budget-v27').forEach(function(x){x.remove()});if(current){option.dataset.budgetReady='1';return}const m=String(option.getAttribute('onclick')||'').match(/updateBrainSlotPlayer\((\d+),\s*[\'\"]([PDCA])[\'\"],\s*(\d+),\s*(\d+)/);if(!m)return;const playerId=String(m[4]),name=option.querySelector('.brain-player-option-name');if(!name)return;let player=null;try{if(typeof window.allPlayers==='function')player=window.allPlayers().find(p=>String(p.id)===playerId)}catch(e){}if(!player)return;const value=Number(player.credits);if(!Number.isFinite(value))return;const budget=document.createElement('span');budget.className='brain-player-option-budget-v28';budget.textContent=Math.round(value);name.insertAdjacentElement('afterend',budget);option.dataset.budgetReady='1'})}
function watchVersion(){const root=document.body;if(!root)return;new MutationObserver(function(){const v=document.querySelector('.app-version');if(v&&v.textContent!=='V. '+VERSION)v.textContent='V. '+VERSION}).observe(root,{childList:true,subtree:true,characterData:true})}
function boot(){setVersion();installStyle();watchVersion();const modal=document.getElementById('modal');if(!modal)return;new MutationObserver(function(){addBudgets()}).observe(modal,{childList:true,subtree:true});document.addEventListener('click',function(e){if(e.target?.closest?.('.brain-slot-player'))setTimeout(addBudgets,0)},true);addBudgets()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.BrainPickerFix={version:VERSION};
})();
