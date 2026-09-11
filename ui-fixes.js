/* UI fixes 3.5.5 — funzioni di interfaccia indipendenti */
(function(){
  'use strict';
  const VERSION='3.5.5';
  let longPressTimer=null;
  let longPressFired=false;
  let pressTarget=null;

  function setVersion(){
    const v=document.querySelector('.app-version');
    if(v)v.textContent='V. '+VERSION;
  }

  function setupLongPress(){
    if(document.documentElement.dataset.brainLongPressReady==='1')return;
    document.documentElement.dataset.brainLongPressReady='1';
    document.addEventListener('pointerdown',function(e){
      const btn=e.target?.closest?.('.brain-strategy-name');
      if(!btn)return;
      const m=String(btn.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
      if(!m)return;
      pressTarget=btn;
      longPressFired=false;
      clearTimeout(longPressTimer);
      longPressTimer=setTimeout(function(){
        if(!pressTarget)return;
        const id=Number(m[1]);
        if(typeof window.selectBrainStrategy==='function')window.selectBrainStrategy(id);
        longPressFired=true;
        pressTarget=null;
      },550);
    },true);
    const cancel=function(){clearTimeout(longPressTimer);longPressTimer=null;pressTarget=null;};
    document.addEventListener('pointerup',cancel,true);
    document.addEventListener('pointercancel',cancel,true);
    document.addEventListener('pointermove',function(e){if(pressTarget&&e.pointerType==='touch')cancel();},true);
    document.addEventListener('click',function(e){
      const btn=e.target?.closest?.('.brain-strategy-name');
      if(btn&&longPressFired){e.preventDefault();e.stopImmediatePropagation();longPressFired=false;}
    },true);
  }

  function addBrainPlayerInfoButtons(){
    document.querySelectorAll('.brain-slot').forEach(function(slot){
      if(slot.dataset.infoReady==='1')return;
      const playerBtn=slot.querySelector('.brain-slot-player');
      if(!playerBtn||!playerBtn.classList.contains('has-player'))return;
      const playerName=playerBtn.textContent.trim();
      if(!playerName||playerName==='Scegli giocatore')return;
      let playerId=null;
      if(typeof window.allPlayers==='function'){
        const p=window.allPlayers().find(x=>String(x.name||'').trim()===playerName);
        if(p)playerId=p.id;
      }
      if(playerId==null)return;
      const wrap=document.createElement('div');
      wrap.className='brain-slot-player-wrap';
      const info=document.createElement('button');
      info.type='button';
      info.className='brain-slot-player-info';
      info.setAttribute('aria-label','Apri scheda giocatore');
      info.setAttribute('title','Scheda giocatore');
      info.textContent='ⓘ';
      info.addEventListener('click',function(e){
        e.preventDefault();e.stopPropagation();
        if(typeof window.openPlayer==='function')window.openPlayer(Number(playerId),'auction');
      });
      playerBtn.parentNode.insertBefore(wrap,playerBtn);
      wrap.appendChild(playerBtn);wrap.appendChild(info);
      slot.dataset.infoReady='1';
    });
  }

  function addBrainBudgetInputs(){
    document.querySelectorAll('.brain-strategy').forEach(function(card){
      const title=card.querySelector('.brain-strategy-name');
      if(!title)return;
      const idMatch=String(title.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
      if(!idMatch)return;
      const strategyId=Number(idMatch[1]);
      const storedState=JSON.parse(localStorage.getItem('AF_CURRENT')||'null');
      const strategy=(storedState?.brainStrategies||[]).find(s=>Number(s.id)===strategyId);
      if(!strategy)return;
      if(!strategy.slotBudgets||typeof strategy.slotBudgets!=='object')strategy.slotBudgets={};
      card.querySelectorAll('.brain-slot').forEach(function(slot){
        if(slot.dataset.budgetReady==='1')return;
        const name=slot.querySelector('.brain-slot-name');
        const budget=slot.querySelector('.brain-slot-budget');
        const row=slot.closest('.brain-role-row');
        if(!name||!budget||!row)return;
        const role=(row.className.match(/\brole-([PDCA])\b/)||[])[1];
        if(!role)return;
        const index=Math.max(0,Number(name.textContent.trim())-1);
        const calculated=Number(budget.textContent.trim())||0;
        const stored=Array.isArray(strategy.slotBudgets[role])?strategy.slotBudgets[role][index]:null;
        const value=Number.isFinite(Number(stored))?Number(stored):calculated;
        if(!Array.isArray(strategy.slotBudgets[role]))strategy.slotBudgets[role]=[];
        strategy.slotBudgets[role][index]=value;
        const input=document.createElement('input');
        input.type='number';input.min='0';input.step='1';input.inputMode='numeric';input.value=String(value);
        input.className='brain-slot-budget-input';
        input.setAttribute('aria-label','Budget slot '+(index+1));
        input.addEventListener('change',function(){
          const v=Math.max(0,Math.round(Number(input.value)||0));
          input.value=String(v);strategy.slotBudgets[role][index]=v;
          storedState.brainStrategies.find(s=>Number(s.id)===strategyId).slotBudgets=strategy.slotBudgets;
          localStorage.setItem('AF_CURRENT',JSON.stringify(storedState));
          if(typeof window.persist==='function')window.persist();
        });
        budget.replaceWith(input);slot.dataset.budgetReady='1';
      });
    });
  }

  function installStyle(){
    if(document.getElementById('brainSlotInfoStyle'))return;
    const css=document.createElement('style');css.id='brainSlotInfoStyle';
    css.textContent=`
      .brain-strategy-title,.brain-strategy-title *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none;}
      .brain-slot{grid-template-columns:20px 58px 58px 38px minmax(0,1fr)!important;width:100%;min-width:0;gap:4px!important;}
      .brain-slot-name,.brain-slot-percent,.brain-slot-budget,.brain-slot-budget-input,.brain-slot-player-wrap{min-width:0;white-space:nowrap;}
      .brain-slot-player-wrap{display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden;}
      .brain-slot-player-wrap .brain-slot-player{flex:1 1 auto;min-width:0;width:auto!important;overflow:hidden;text-overflow:ellipsis;}
      .brain-slot-player-info{width:28px;height:35px;min-width:28px;padding:0;border:1px solid rgba(80,90,100,.20);border-radius:9px;background:#fff;color:var(--muted);font-size:17px;font-weight:850;line-height:1;display:flex;align-items:center;justify-content:center;flex:0 0 28px;}
      .brain-slot-player-info:active{transform:scale(.94);}
      .brain-slot-budget{display:flex;align-items:center;justify-content:center;min-width:0;padding:0 1px;}
      .brain-slot-budget-input{width:100%!important;height:35px!important;min-height:35px!important;padding:0 2px!important;border:1px solid rgba(80,90,100,.18)!important;border-radius:9px!important;background:rgba(255,255,255,.42)!important;box-shadow:none!important;text-align:center!important;font-size:14px!important;font-weight:850!important;}
      @media(max-width:390px){.brain-slot{grid-template-columns:18px 54px 54px 36px minmax(0,1fr)!important;gap:3px!important;}.brain-slot-player-info{width:26px;height:35px;min-width:26px;flex-basis:26px;font-size:16px;}.brain-slot-budget-input{height:35px!important;min-height:35px!important;font-size:13px!important;}}
      #appRefreshOverlay{display:none!important;}
    `;
    document.head.appendChild(css);
  }

  function installStableRefresh(){
    window.refreshApp=function(){
      if(document.documentElement.dataset.refreshing==='1')return;
      document.documentElement.dataset.refreshing='1';
      const btn=document.getElementById('refreshAppBtn');
      if(btn){
        btn.disabled=true;
        btn.classList.add('loading');
        btn.setAttribute('aria-label','Aggiornamento in corso');
      }
      /* Il controllo del Service Worker è secondario: non deve ritardare il reload. */
      try{
        if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){
          navigator.serviceWorker.getRegistrations().then(function(regs){
            regs.forEach(function(r){try{r.update();}catch(e){}});
          }).catch(function(){});
        }
      }catch(e){}
      /* Un solo breve intervallo consente al browser di dipingere lo spinner. */
      window.setTimeout(function(){window.location.reload();},350);
    };
  }

  function boot(){
    setVersion();setupLongPress();installStyle();installStableRefresh();
    const oldRender=window.renderBrain;
    if(typeof oldRender==='function'&&!oldRender.__uiFixesVersionWrap){
      window.renderBrain=function(){try{return oldRender.apply(this,arguments);}finally{setVersion();addBrainPlayerInfoButtons();addBrainBudgetInputs();}};
      window.renderBrain.__uiFixesVersionWrap=true;
    }
    addBrainPlayerInfoButtons();addBrainBudgetInputs();
  }

  setVersion();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();