/* Brain slot sync — logica aggiuntiva, nessuna modifica al layout di Brain */
(function(){
  'use strict';

  function findStrategy(id){
    return window.current?.brainStrategies?.find(function(s){return Number(s.id)===Number(id);})||null;
  }

  function rolePlanned(strategy,role){
    const budget=Number(window.current?.initialCredits)||0;
    const pct=Number(strategy?.allocation?.[role])||0;
    return Math.round(budget*pct/100);
  }

  function setSlotUI(id,role,index,pct,credits){
    const slots=document.querySelectorAll('.brain-strategy');
    let card=null;
    slots.forEach(function(c){
      const title=c.querySelector('.brain-strategy-name');
      const m=String(title?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
      if(m&&Number(m[1])===Number(id))card=c;
    });
    if(!card)return;
    const row=card.querySelector('.brain-role-row.role-'+role);
    const slot=row?.querySelectorAll('.brain-slot')[index];
    if(!slot)return;
    const p=slot.querySelector('.brain-slot-percent input');
    const b=slot.querySelector('.brain-slot-budget-input');
    if(p)p.value=String(pct);
    if(b)b.value=String(credits);
  }

  function syncSlotFromPercent(input){
    const slot=input.closest('.brain-slot');
    const row=input.closest('.brain-role-row');
    const card=input.closest('.brain-strategy');
    if(!slot||!row||!card)return;
    const title=card.querySelector('.brain-strategy-name');
    const m=String(title?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
    const rm=String(row.className||'').match(/\brole-([PDCA])\b/);
    if(!m||!rm)return;
    const id=Number(m[1]),role=rm[1];
    const index=Array.prototype.indexOf.call(row.querySelectorAll('.brain-slot'),slot);
    const strategy=findStrategy(id); if(!strategy)return;
    const planned=rolePlanned(strategy,role);
    const pct=Math.max(0,Math.min(99,Number(input.value)||0));
    const credits=Math.round(planned*pct/100);
    input.value=String(pct);
    const b=slot.querySelector('.brain-slot-budget-input');
    if(b)b.value=String(credits);
    if(window.current?.brainStrategies){
      const arr=window.brainStrategySlotAllocation?window.brainStrategySlotAllocation(strategy,role):null;
      if(arr){arr[index]=pct;strategy.slotAllocation[role]=arr;}
      strategy.slotBudgets=strategy.slotBudgets||{};
      strategy.slotBudgets[role]=Array.isArray(strategy.slotBudgets[role])?strategy.slotBudgets[role]:[];
      strategy.slotBudgets[role][index]=credits;
      if(typeof window.persist==='function')window.persist();
    }
  }

  function syncSlotFromCredits(input){
    const slot=input.closest('.brain-slot');
    const row=input.closest('.brain-role-row');
    const card=input.closest('.brain-strategy');
    if(!slot||!row||!card)return;
    const title=card.querySelector('.brain-strategy-name');
    const m=String(title?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
    const rm=String(row.className||'').match(/\brole-([PDCA])\b/);
    if(!m||!rm)return;
    const id=Number(m[1]),role=rm[1];
    const index=Array.prototype.indexOf.call(row.querySelectorAll('.brain-slot'),slot);
    const strategy=findStrategy(id); if(!strategy)return;
    const planned=rolePlanned(strategy,role);
    const credits=Math.max(0,Math.round(Number(input.value)||0));
    const pct=planned>0?Math.max(0,Math.min(99,Math.round(credits/planned*100))):0;
    input.value=String(credits);
    const p=slot.querySelector('.brain-slot-percent input');
    if(p)p.value=String(pct);
    const arr=window.brainStrategySlotAllocation?window.brainStrategySlotAllocation(strategy,role):null;
    if(arr){arr[index]=pct;strategy.slotAllocation[role]=arr;}
    strategy.slotBudgets=strategy.slotBudgets||{};
    strategy.slotBudgets[role]=Array.isArray(strategy.slotBudgets[role])?strategy.slotBudgets[role]:[];
    strategy.slotBudgets[role][index]=credits;
    if(typeof window.persist==='function')window.persist();
  }

  function installInputSync(){
    if(document.documentElement.dataset.brainSlotSync==='1')return;
    document.documentElement.dataset.brainSlotSync='1';
    document.addEventListener('change',function(e){
      const p=e.target?.closest?.('.brain-slot-percent input');
      if(p){syncSlotFromPercent(p);return;}
      const b=e.target?.closest?.('.brain-slot-budget-input');
      if(b)syncSlotFromCredits(b);
    },true);
  }

  function installPlayerDefault(){
    if(typeof window.updateBrainSlotPlayer!=='function'||window.updateBrainSlotPlayer.__slotSyncWrapped)return;
    const original=window.updateBrainSlotPlayer;
    const wrapped=function(id,role,index,value){
      original.apply(this,arguments);
      if(value===''||value==null)return;
      const player=(typeof window.allPlayers==='function'?window.allPlayers():[]).find(function(p){return String(p.id)===String(value);});
      const strategy=findStrategy(id);
      if(!player||!strategy)return;
      const pctRaw=Number(player.pct)||0;
      const pct=pctRaw<=1?pctRaw*100:pctRaw;
      const credits=Math.round(Number(player.credits)||0);
      const arr=window.brainStrategySlotAllocation?window.brainStrategySlotAllocation(strategy,role):null;
      if(arr){arr[index]=pct;strategy.slotAllocation[role]=arr;}
      strategy.slotBudgets=strategy.slotBudgets||{};
      strategy.slotBudgets[role]=Array.isArray(strategy.slotBudgets[role])?strategy.slotBudgets[role]:[];
      strategy.slotBudgets[role][index]=credits;
      if(typeof window.persist==='function')window.persist();
      setSlotUI(id,role,index,pct,credits);
    };
    wrapped.__slotSyncWrapped=true;
    window.updateBrainSlotPlayer=wrapped;
  }

  function boot(){
    installInputSync();
    installPlayerDefault();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  const timer=setInterval(function(){
    installPlayerDefault();
    if(typeof window.updateBrainSlotPlayer==='function'&&window.updateBrainSlotPlayer.__slotSyncWrapped)clearInterval(timer);
  },100);
})();
