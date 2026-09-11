/* UI fixes 3.4.36 — versione interfaccia */
(function(){
  'use strict';
  const VERSION='3.4.36';
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

  function installBrainSlotInfoStyle(){
    if(document.getElementById('brainSlotInfoStyle'))return;
    const css=document.createElement('style');
    css.id='brainSlotInfoStyle';
    css.textContent=`
      .brain-slot{grid-template-columns:18px max-content max-content 36px minmax(0,1fr)!important;}
      .brain-slot-name,.brain-slot-percent,.brain-slot-budget,.brain-slot-player-wrap{min-width:0;white-space:nowrap;}
      .brain-slot-player-wrap{display:flex;align-items:center;gap:4px;min-width:0;}
      .brain-slot-player-wrap .brain-slot-player{flex:1 1 auto;min-width:0;width:auto!important;}
      .brain-slot-player-info{width:28px;height:35px;min-width:28px;padding:0;border:1px solid rgba(80,90,100,.20);border-radius:9px;background:#fff;color:var(--muted);font-size:17px;font-weight:850;line-height:1;display:flex;align-items:center;justify-content:center;flex:0 0 28px;}
      .brain-slot-player-info:active{transform:scale(.94);}
      @media(max-width:390px){
        .brain-slot{grid-template-columns:18px max-content max-content 36px minmax(0,1fr)!important;gap:3px!important;}
        .brain-slot-player-info{width:26px;height:35px;min-width:26px;flex-basis:26px;font-size:16px;}
      }
    `;
    document.head.appendChild(css);
  }

  function boot(){
    setVersion();
    setupLongPress();
    installBrainSlotInfoStyle();
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
        }};
      window.renderBrain.__uiFixesVersionWrap=true;
    }
    addBrainPlayerInfoButtons();
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
