/* Brain sync v1.0.3 — logica aggiuntiva, nessuna modifica alla struttura di Brain */
(function(){
  'use strict';

  function state(){
    try{return JSON.parse(localStorage.getItem('AF_CURRENT')||'null');}catch(e){return null;}
  }
  function findStrategy(id){
    const c=state();
    return c?.brainStrategies?.find(function(s){return Number(s.id)===Number(id);})||null;
  }
  function rolePlanned(strategy,role){
    const c=state();
    const budget=Number(c?.initialCredits)||0;
    const pct=Number(strategy?.allocation?.[role])||0;
    return Math.round(budget*pct/100);
  }
  function saveSlotBudget(id,role,index,credits){
    const c=state(); if(!c)return;
    const s=c.brainStrategies?.find(function(x){return Number(x.id)===Number(id);}); if(!s)return;
    s.slotBudgets=s.slotBudgets||{};
    s.slotBudgets[role]=Array.isArray(s.slotBudgets[role])?s.slotBudgets[role]:[];
    s.slotBudgets[role][index]=credits;
    localStorage.setItem('AF_CURRENT',JSON.stringify(c));
  }
  function setSlotUI(id,role,index,pct,credits){
    let card=null;
    document.querySelectorAll('.brain-strategy').forEach(function(c){
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

  function addBrainRolePlanInputs(){
    document.querySelectorAll('.brain-role-row').forEach(function(row){
      const plan=row.querySelector('.brain-role-numbers > span:first-child');
      if(!plan || plan.dataset.planReady==='1')return;
      const value=plan.querySelector('b');
      if(!value)return;
      const role=(String(row.className||'').match(/\brole-([PDCA])\b/)||[])[1];
      const card=row.closest('.brain-strategy');
      const title=card?.querySelector('.brain-strategy-name');
      const m=String(title?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
      if(!role||!m)return;
      const strategyId=Number(m[1]);
      const input=document.createElement('input');
      input.type='number';
      input.min='0';
      input.step='1';
      input.inputMode='numeric';
      input.value=String(Number(value.textContent.trim())||0);
      input.className='brain-role-plan-input';
      input.setAttribute('aria-label','Piano '+role);
      input.addEventListener('change',function(){
        const s=findStrategy(strategyId); if(!s)return;
        const budget=Number(state()?.initialCredits)||0;
        const credits=Math.max(0,Math.round(Number(input.value)||0));
        const pct=budget>0?Math.max(0,Math.min(100,Math.round(credits/budget*100))):0;
        input.value=String(credits);
        if(typeof window.updateBrainAllocation==='function')window.updateBrainAllocation(strategyId,role,pct);
      });
      value.replaceWith(input);
      plan.dataset.planReady='1';
    });
  }

  function installRolePlanStyle(){
    if(document.getElementById('brainRolePlanStyle'))return;
    const css=document.createElement('style');
    css.id='brainRolePlanStyle';
    css.textContent=`
      .brain-role-numbers .brain-role-plan-input{
        display:inline-block!important;
        width:58px!important;
        min-width:58px!important;
        max-width:58px!important;
        flex:0 0 58px!important;
        height:38px!important;
        min-height:38px!important;
        margin:0!important;
        padding:0 2px!important;
        box-sizing:border-box!important;
        border:1px solid rgba(80,90,100,.16)!important;
        border-radius:7px!important;
        background:rgba(255,255,255,.36)!important;
        text-align:center!important;
        font:inherit!important;
        font-size:24px!important;
        font-weight:900!important;
        line-height:38px!important;
        color:inherit!important;
        outline:none!important;
      }
      .brain-role-numbers .brain-role-plan-input:focus{
        border-color:rgba(80,90,100,.35)!important;
        background:rgba(255,255,255,.68)!important;
      }
      @media(max-width:390px){
        .brain-role-numbers .brain-role-plan-input{
          width:54px!important;
          min-width:54px!important;
          max-width:54px!important;
          flex-basis:54px!important;
          font-size:22px!important;
        }
      }
    `;
    document.head.appendChild(css);
  }

  function syncSlotFromPercent(input){
    const slot=input.closest('.brain-slot'),row=input.closest('.brain-role-row'),card=input.closest('.brain-strategy');
    if(!slot||!row||!card)return;
    const m=String(card.querySelector('.brain-strategy-name')?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
    const rm=String(row.className||'').match(/\brole-([PDCA])\b/); if(!m||!rm)return;
    const id=Number(m[1]),role=rm[1],index=Array.prototype.indexOf.call(row.querySelectorAll('.brain-slot'),slot);
    const s=findStrategy(id); if(!s)return;
    const planned=rolePlanned(s,role);
    const pct=Math.max(0,Math.min(99,Number(input.value)||0));
    const credits=Math.round(planned*pct/100);
    input.value=String(pct);
    const b=slot.querySelector('.brain-slot-budget-input'); if(b)b.value=String(credits);
    saveSlotBudget(id,role,index,credits);
  }
  function syncSlotFromCredits(input){
    const slot=input.closest('.brain-slot'),row=input.closest('.brain-role-row'),card=input.closest('.brain-strategy');
    if(!slot||!row||!card)return;
    const m=String(card.querySelector('.brain-strategy-name')?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
    const rm=String(row.className||'').match(/\brole-([PDCA])\b/); if(!m||!rm)return;
    const id=Number(m[1]),role=rm[1],index=Array.prototype.indexOf.call(row.querySelectorAll('.brain-slot'),slot);
    const s=findStrategy(id); if(!s)return;
    const planned=rolePlanned(s,role);
    const credits=Math.max(0,Math.round(Number(input.value)||0));
    const pct=planned>0?Math.max(0,Math.min(99,Math.round(credits/planned*100))):0;
    input.value=String(credits);
    const p=slot.querySelector('.brain-slot-percent input'); if(p)p.value=String(pct);
    if(typeof window.updateBrainSlotAllocation==='function')window.updateBrainSlotAllocation(id,role,index,pct);
    saveSlotBudget(id,role,index,credits);
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
      if(!player)return;
      const pctRaw=Number(player.pct)||0;
      const pct=pctRaw<=1?pctRaw*100:pctRaw;
      const credits=Math.round(Number(player.credits)||0);
      if(typeof window.updateBrainSlotAllocation==='function')window.updateBrainSlotAllocation(id,role,index,pct);
      saveSlotBudget(id,role,index,credits);
      setSlotUI(id,role,index,pct,credits);
    };
    wrapped.__slotSyncWrapped=true;
    window.updateBrainSlotPlayer=wrapped;
  }

  function wrapBrainRender(){
    if(typeof window.renderBrain!=='function'||window.renderBrain.__brainSyncRolePlanWrapped)return;
    const original=window.renderBrain;
    window.renderBrain=function(){
      try{return original.apply(this,arguments);}
      finally{addBrainRolePlanInputs();}
    };
    window.renderBrain.__brainSyncRolePlanWrapped=true;
    addBrainRolePlanInputs();
  }

  function install(){
    installInputSync();
    installRolePlanStyle();
    installPlayerDefault();
    wrapBrainRender();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  const timer=setInterval(function(){
    installPlayerDefault();
    wrapBrainRender();
    if(typeof window.updateBrainSlotPlayer==='function'&&window.updateBrainSlotPlayer.__slotSyncWrapped&&typeof window.renderBrain==='function'&&window.renderBrain.__brainSyncRolePlanWrapped)clearInterval(timer);
  },100);
})();
