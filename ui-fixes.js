/* UI fixes 3.5.0 — versione interfaccia */
(function(){
  'use strict';
  const VERSION='3.5.0';
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
    const cancel=function(){
      clearTimeout(longPressTimer);
      longPressTimer=null;
      pressTarget=null;
    };
    document.addEventListener('pointerup',cancel,true);
    document.addEventListener('pointercancel',cancel,true);
    document.addEventListener('pointermove',function(e){
      if(pressTarget&&e.pointerType==='touch')cancel();
    },true);
    document.addEventListener('click',function(e){
      const btn=e.target?.closest?.('.brain-strategy-name');
      if(btn&&longPressFired){
        e.preventDefault();
        e.stopImmediatePropagation();
        longPressFired=false;
      }
    },true);
  }

  function addBrainPlayerInfoButtons(){
    document.querySelectorAll('.brain-slot').forEach(function(slot){
      if(slot.dataset.infoReady==='1')return;
      const playerBtn=slot.querySelector('.brain-slot-player');
      if(!playerBtn)return;
      if(!playerBtn.classList.contains('has-player'))return;
      const playerName=playerBtn.textContent.trim();
      if(!playerName || playerName==='Scegli giocatore')return;
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
        e.preventDefault();
        e.stopPropagation();
        if(typeof window.openPlayer==='function')window.openPlayer(Number(playerId),'auction');
      });
      playerBtn.parentNode.insertBefore(wrap,playerBtn);
      wrap.appendChild(playerBtn);
      wrap.appendChild(info);
      slot.dataset.infoReady='1';
    });
  }

  function addBrainBudgetInputs(){
    document.querySelectorAll('.brain-strategy').forEach(function(card){
      const m=String(card.className).match(/\bactive\b/);
      const title=card.querySelector('.brain-strategy-name');
      if(!title)return;
      const onclick=String(title.getAttribute('onclick')||'');
      const idMatch=onclick.match(/toggleBrainStrategy\((\d+)\)/);
      if(!idMatch)return;
      const strategyId=Number(idMatch[1]);
      const strategy=(window.current?.brainStrategies||[]).find(s=>Number(s.id)===strategyId);
      if(!strategy)return;
      if(!strategy.slotBudgets||typeof strategy.slotBudgets!=='object')strategy.slotBudgets={};

      card.querySelectorAll('.brain-slot').forEach(function(slot){
        if(slot.dataset.budgetReady==='1')return;
        const name=slot.querySelector('.brain-slot-name');
        const budget=slot.querySelector('.brain-slot-budget');
        if(!name||!budget)return;
        const row=slot.closest('.brain-role-row');
        if(!row)return;
        const role=(row.className.match(/\brole-([PDCA])\b/)||[])[1];
        if(!role)return;
        const index=Math.max(0,Number(name.textContent.trim())-1);
        const calculated=Number(budget.textContent.trim())||0;
        const stored=Array.isArray(strategy.slotBudgets[role])?strategy.slotBudgets[role][index]:null;
        const value=Number.isFinite(Number(stored))?Number(stored):calculated;
        if(!Array.isArray(strategy.slotBudgets[role]))strategy.slotBudgets[role]=[];
        strategy.slotBudgets[role][index]=value;

        const input=document.createElement('input');
        input.type='number';
        input.min='0';
        input.step='1';
        input.value=String(value);
        input.className='brain-slot-budget-input';
        input.setAttribute('aria-label','Budget slot '+(index+1));
        input.addEventListener('change',function(){
          const v=Math.max(0,Math.round(Number(input.value)||0));
          input.value=String(v);
          if(!Array.isArray(strategy.slotBudgets[role]))strategy.slotBudgets[role]=[];
          strategy.slotBudgets[role][index]=v;
          if(typeof persist==='function')persist();
        });
        budget.replaceWith(input);
        slot.dataset.budgetReady='1';
      });
    });
  }

  function installBrainSlotInfoStyle(){
    if(document.getElementById('brainSlotInfoStyle'))return;
    const css=document.createElement('style');
    css.id='brainSlotInfoStyle';
    css.textContent=`
      .brain-slot{grid-template-columns:18px max-content max-content 36px minmax(0,1fr)!important;}
      .brain-slot-name,.brain-slot-percent,.brain-slot-budget,.brain-slot-budget-input,.brain-slot-player-wrap{min-width:0;white-space:nowrap;}
      .brain-slot-player-wrap{display:flex;align-items:center;gap:4px;min-width:0;}
      .brain-slot-player-wrap .brain-slot-player{flex:1 1 auto;min-width:0;width:auto!important;}
      .brain-slot-player-info{width:28px;height:35px;min-width:28px;padding:0;border:1px solid rgba(80,90,100,.20);border-radius:9px;background:#fff;color:var(--muted);font-size:17px;font-weight:850;line-height:1;display:flex;align-items:center;justify-content:center;flex:0 0 28px;}
      .brain-slot-player-info:active{transform:scale(.94);}
      .brain-slot-budget-input{width:auto!important;height:35px!important;min-height:35px!important;padding:0 3px!important;text-align:center;font-size:14px!important;font-weight:750;}
      @media(max-width:390px){
        .brain-slot{grid-template-columns:18px max-content max-content 36px minmax(0,1fr)!important;gap:3px!important;}
        .brain-slot-player-info{width:26px;height:35px;min-width:26px;flex-basis:26px;font-size:16px;}
        .brain-slot-budget-input{height:35px!important;min-height:35px!important;font-size:13px!important;padding:0 2px!important;}
      }
    `;
    document.head.appendChild(css);
  }

  function installStableRefresh(){
    window.refreshApp=function(){
      if(document.documentElement.dataset.refreshing==='1')return;
      document.documentElement.dataset.refreshing='1';
      const btn=document.getElementById('refreshAppBtn');
      if(btn){btn.disabled=true;btn.setAttribute('aria-label','Aggiornamento in corso');}

      const reload=function(){
        try{window.location.reload();}
        catch(e){window.location.href=window.location.href;}
      };

      if(!navigator.serviceWorker){reload();return;}
      navigator.serviceWorker.getRegistration().then(function(reg){
        if(!reg){reload();return;}
        let reloaded=false;
        const onceReload=function(){if(reloaded)return;reloaded=true;reload();};
        navigator.serviceWorker.addEventListener('controllerchange',onceReload,{once:true});
        return reg.update().catch(()=>{}).then(function(){
          setTimeout(onceReload,1200);
        });
      }).catch(reload);
    };
  }

  function boot(){
    setVersion();
    setupLongPress();
    installBrainSlotInfoStyle();
    installStableRefresh();
    if(!document.getElementById('brainLongPressStyle')){
      const css=document.createElement('style');
      css.id='brainLongPressStyle';
      css.textContent='.brain-strategy-title,.brain-strategy-title *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none;}';
      document.head.appendChild(css);
    }
    const oldRender=window.renderBrain;
    if(typeof oldRender==='function'&&!oldRender.__uiFixesVersionWrap){
      window.renderBrain=function(){
        try{return oldRender.apply(this,arguments);}finally{
          setVersion();
          addBrainPlayerInfoButtons();
          addBrainBudgetInputs();
        }};
      window.renderBrain.__uiFixesVersionWrap=true;
    }
    addBrainPlayerInfoButtons();
    addBrainBudgetInputs();
  }

  function load(){
    if(window.runMagicWand){boot();return;}
    if(document.querySelector('script[data-bacchetta-loader]'))return;
    const s=document.createElement('script');
    s.src='./bacchetta.js?v='+VERSION;
    s.dataset.bacchettaLoader='1';
    s.async=false;
    s.onload=boot;
    s.onerror=()=>console.error('Bacchetta Magica: caricamento fallito');
    document.body.appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
