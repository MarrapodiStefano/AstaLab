/* UI fixes 3.4.36 — versione interfaccia */
(function(){
  'use strict';
  const VERSION='3.4.36';

  function setVersion(){
    const v=document.querySelector('.app-version');
    if(v)v.textContent='V. '+VERSION;
  }

  function boot(){
    setVersion();

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
