/* UI fixes 3.4.50 — versione interfaccia */
(function(){
  'use strict';
  const VERSION='3.4.50';
  let longPressTimer=null;
  let longPressFired=false;
  let pressTarget=null;
  function setVersion(){const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION;}
  function setupLongPress(){if(document.documentElement.dataset.brainLongPressReady==='1')return;document.documentElement.dataset.brainLongPressReady='1';document.addEventListener('pointerdown',function(e){const btn=e.target?.closest?.('.brain-strategy-name');if(!btn)return;const m=String(btn.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);if(!m)return;pressTarget=btn;longPressFired=false;clearTimeout(longPressTimer);longPressTimer=setTimeout(function(){if(!pressTarget)return;const id=Number(m[1]);if(typeof window.selectBrainStrategy==='function')window.selectBrainStrategy(id);longPressFired=true;pressTarget=null;},550);},true);const cancel=function(){clearTimeout(longPressTimer);longPressTimer=null;pressTarget=null;};document.addEventListener('pointerup',cancel,true);document.addEventListener('pointercancel',cancel,true);document.addEventListener('pointermove',function(e){if(pressTarget&&e.pointerType==='touch')cancel();},true);document.addEventListener('click',function(e){const btn=e.target?.closest?.('.brain-strategy-name');if(btn&&longPressFired){e.preventDefault();e.stopImmediatePropagation();longPressFired=false;}},true);}
  /* Non sostituire refreshApp se app.js ha già installato il gestore PWA completo.
     In questo modo restano attivi update del Service Worker + controllerchange,
     evitando il doppio cambio di pagina/sfarfallio. */
  function setupRefresh(){
    if(typeof window.refreshApp==='function')return;
    window.refreshApp=function(){
      const btn=document.getElementById('refreshAppBtn');
      if(btn){btn.classList.add('loading');btn.disabled=true;}
      window.location.replace(window.location.pathname+'?update='+Date.now());
    };
  }
  function boot(){setVersion();setupLongPress();setupRefresh();if(!document.getElementById('brainLongPressStyle')){const css=document.createElement('style');css.id='brainLongPressStyle';css.textContent='.brain-strategy-title,.brain-strategy-title *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none;}';document.head.appendChild(css);}if(!document.getElementById('brainTemplateCompact40')){const css=document.createElement('style');css.id='brainTemplateCompact40';css.textContent=`.brain-template-picker{padding:8px!important}.brain-template-sheet{padding:12px!important;max-height:86vh!important;border-radius:20px 20px 12px 12px!important}.brain-template-title{font-size:19px!important;margin-bottom:2px!important}.brain-template-sub{font-size:14px!important;line-height:1.25!important;margin-bottom:8px!important}.brain-template{margin:5px 0!important;padding:10px!important;border-radius:13px!important}.brain-template-name{font-size:15px!important;margin-bottom:2px!important}.brain-template-desc{font-size:12px!important;line-height:1.2!important}.brain-template-values{font-size:11px!important;margin-top:4px!important;line-height:1.15!important}.brain-template-close{margin-top:7px!important}`;document.head.appendChild(css);}const oldRender=window.renderBrain;if(typeof oldRender==='function'&&!oldRender.__uiFixesVersionWrap){window.renderBrain=function(){try{return oldRender.apply(this,arguments);}finally{setVersion();}};window.renderBrain.__uiFixesVersionWrap=true;}}
  function load(){if(window.runMagicWand){boot();return;}if(document.querySelector('script[data-bacchetta-loader]'))return;const s=document.createElement('script');s.src='./bacchetta.js?v='+VERSION;s.dataset.bacchettaLoader='1';s.async=false;s.onload=boot;s.onerror=()=>console.error('Bacchetta Magica: caricamento fallito');document.body.appendChild(s);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
