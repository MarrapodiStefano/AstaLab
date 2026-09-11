/* Brain sync v1.2.0 — sola logica, layout originale di Brain intatto */
(function(){
  'use strict';
  function state(){try{return JSON.parse(localStorage.getItem('AF_CURRENT')||'null');}catch(e){return null;}}
  function findStrategy(id){const c=state();return c?.brainStrategies?.find(function(s){return Number(s.id)===Number(id);})||null;}
  function rolePlanned(strategy,role){const c=state();return Math.round((Number(c?.initialCredits)||0)*(Number(strategy?.allocation?.[role])||0)/100);}
  function saveSlotBudget(id,role,index,credits){const c=state();if(!c)return;const s=c.brainStrategies?.find(function(x){return Number(x.id)===Number(id);});if(!s)return;s.slotBudgets=s.slotBudgets||{};s.slotBudgets[role]=Array.isArray(s.slotBudgets[role])?s.slotBudgets[role]:[];s.slotBudgets[role][index]=credits;localStorage.setItem('AF_CURRENT',JSON.stringify(c));}
  function setSlotUI(id,role,index,pct,credits){let card=null;document.querySelectorAll('.brain-strategy').forEach(function(c){const m=String(c.querySelector('.brain-strategy-name')?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);if(m&&Number(m[1])===Number(id))card=c;});if(!card)return;const row=card.querySelector('.brain-role-row.role-'+role),slot=row?.querySelectorAll('.brain-slot')[index];if(!slot)return;const p=slot.querySelector('.brain-slot-percent input'),b=slot.querySelector('.brain-slot-budget-input');if(p)p.value=String(pct);if(b)b.value=String(credits);}

  /* Piano resta il <b> originale: cambiamo solo il comportamento, non il layout. */
  function installRolePlanEditing(){
    document.querySelectorAll('.brain-role-row').forEach(function(row){
      const plan=row.querySelector('.brain-role-numbers > span:first-child');
      const value=plan?.querySelector('b');
      if(!plan||!value||plan.dataset.planReady==='1')return;
      const role=(String(row.className||'').match(/\brole-([PDCA])\b/)||[])[1];
      const card=row.closest('.brain-strategy');
      const m=String(card?.querySelector('.brain-strategy-name')?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
      if(!role||!m)return;
      const strategyId=Number(m[1]);
      value.contentEditable='true';
      value.inputMode='numeric';
      value.spellcheck=false;
      value.setAttribute('role','textbox');
      value.setAttribute('aria-label','Piano '+role);
      value.dataset.brainPlanEditable='1';
      value.addEventListener('focus',function(){value.dataset.oldPlan=value.textContent.trim();});
      value.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();value.blur();}if(e.key==='Escape'){value.textContent=value.dataset.oldPlan||value.textContent;value.blur();}});
      value.addEventListener('blur',function(){
        const budget=Number(state()?.initialCredits)||0;
        const credits=Math.max(0,Math.round(Number(String(value.textContent).replace(/[^0-9.-]/g,''))||0));
        const pct=budget>0?Math.max(0,Math.min(100,Math.round(credits/budget*100))):0;
        value.textContent=String(credits);
        if(typeof window.updateBrainAllocation==='function')window.updateBrainAllocation(strategyId,role,pct);
      });
      plan.dataset.planReady='1';
    });
  }

  function syncSlotFromPercent(input){const slot=input.closest('.brain-slot'),row=input.closest('.brain-role-row'),card=input.closest('.brain-strategy');if(!slot||!row||!card)return;const m=String(card.querySelector('.brain-strategy-name')?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/),rm=String(row.className||'').match(/\brole-([PDCA])\b/);if(!m||!rm)return;const id=Number(m[1]),role=rm[1],index=Array.prototype.indexOf.call(row.querySelectorAll('.brain-slot'),slot),s=findStrategy(id);if(!s)return;const credits=Math.round(rolePlanned(s,role)*Math.max(0,Math.min(99,Number(input.value)||0))/100);input.value=String(Math.max(0,Math.min(99,Number(input.value)||0)));const b=slot.querySelector('.brain-slot-budget-input');if(b)b.value=String(credits);saveSlotBudget(id,role,index,credits);}
  function syncSlotFromCredits(input){const slot=input.closest('.brain-slot'),row=input.closest('.brain-role-row'),card=input.closest('.brain-strategy');if(!slot||!row||!card)return;const m=String(card.querySelector('.brain-strategy-name')?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/),rm=String(row.className||'').match(/\brole-([PDCA])\b/);if(!m||!rm)return;const id=Number(m[1]),role=rm[1],index=Array.prototype.indexOf.call(row.querySelectorAll('.brain-slot'),slot),s=findStrategy(id);if(!s)return;const credits=Math.max(0,Math.round(Number(input.value)||0)),planned=rolePlanned(s,role),pct=planned>0?Math.max(0,Math.min(99,Math.round(credits/planned*100))):0;input.value=String(credits);const p=slot.querySelector('.brain-slot-percent input');if(p)p.value=String(pct);if(typeof window.updateBrainSlotAllocation==='function')window.updateBrainSlotAllocation(id,role,index,pct);saveSlotBudget(id,role,index,credits);}
  function installInputSync(){if(document.documentElement.dataset.brainSlotSync==='1')return;document.documentElement.dataset.brainSlotSync='1';document.addEventListener('change',function(e){const p=e.target?.closest?.('.brain-slot-percent input');if(p)return syncSlotFromPercent(p);const b=e.target?.closest?.('.brain-slot-budget-input');if(b)syncSlotFromCredits(b);},true);}
  function installPlayerDefault(){if(typeof window.updateBrainSlotPlayer!=='function'||window.updateBrainSlotPlayer.__slotSyncWrapped)return;const original=window.updateBrainSlotPlayer;const wrapped=function(id,role,index,value){original.apply(this,arguments);if(value===''||value==null)return;const player=(typeof window.allPlayers==='function'?window.allPlayers():[]).find(function(p){return String(p.id)===String(value);});if(!player)return;const raw=Number(player.pct)||0,pct=raw<=1?raw*100:raw,credits=Math.round(Number(player.credits)||0);if(typeof window.updateBrainSlotAllocation==='function')window.updateBrainSlotAllocation(id,role,index,pct);saveSlotBudget(id,role,index,credits);setSlotUI(id,role,index,pct,credits);};wrapped.__slotSyncWrapped=true;window.updateBrainSlotPlayer=wrapped;}
  function wrapBrainRender(){if(typeof window.renderBrain!=='function'||window.renderBrain.__brainSyncWrapped)return;const original=window.renderBrain;window.renderBrain=function(){try{return original.apply(this,arguments);}finally{installRolePlanEditing();}};window.renderBrain.__brainSyncWrapped=true;installRolePlanEditing();}
  function install(){installInputSync();installPlayerDefault();wrapBrainRender();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  const timer=setInterval(function(){installPlayerDefault();wrapBrainRender();if(typeof window.updateBrainSlotPlayer==='function'&&window.updateBrainSlotPlayer.__slotSyncWrapped&&typeof window.renderBrain==='function'&&window.renderBrain.__brainSyncWrapped)clearInterval(timer);},100);
})();