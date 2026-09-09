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

  function boot(){
    setVersion();
    setupLongPress();

    /* Bacchetta.js gestisce direttamente il pulsante .magic-wand-btn,
       nella stessa posizione originale dentro l'intestazione di Brain.
       Qui non lo spostiamo e non lo sostituiamo. */
    const oldRender=window.renderBrain;
    if(typeof oldRender==='function'&&!oldRender.__uiFixesVersionWrap){
      window.renderBrain=function(){
        try{return oldRender.apply(this,arguments);}finally{setVersion();}
      };
      window.renderBrain.__uiFixesVersionWrap=true;
    }
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
