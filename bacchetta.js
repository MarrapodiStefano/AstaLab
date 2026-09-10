/* Bacchetta controller v3.4.56.2
   Unico motore di calcolo: market-sync-v50.js.
   Questo controller gestisce esclusivamente UI, fallback click e aggiornamento PWA.
*/
(function(){
'use strict';
const VERSION='3.4.56';

function ensureStyle(){
  if(document.getElementById('bacchettaStableStyle562'))return;
  const s=document.createElement('style');
  s.id='bacchettaStableStyle562';
  s.textContent=`
    .magic-wand-btn{width:42px;height:42px;min-width:42px;min-height:42px;flex:0 0 42px;border:1px solid #dfe4e9;border-radius:13px;background:#fff;font-size:23px;line-height:1;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(20,30,45,.06);cursor:pointer;-webkit-tap-highlight-color:transparent;padding:0}
    .magic-wand-btn:active{transform:scale(.92)}
    .magic-wand-btn.magic-wand-running{animation:magicWandPulse562 .72s ease-in-out infinite!important;box-shadow:0 0 0 6px rgba(8,120,79,.10),0 3px 14px rgba(8,120,79,.20);background:#f2fbf7}
    .magic-wand-btn:disabled{cursor:wait;opacity:.75}
    @keyframes magicWandPulse562{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.10) rotate(8deg)}}
    .bottom{position:fixed!important;left:0!important;right:0!important;top:auto!important;bottom:0!important;z-index:2147483647!important;transform:none!important;-webkit-transform:none!important;will-change:auto!important;-webkit-backface-visibility:visible!important;backface-visibility:visible!important}
    .app{padding-bottom:72px!important}
  `;
  document.head.appendChild(s);
}

function ensureButton(){
  const brain=document.getElementById('brain');
  if(!brain)return;
  const head=brain.querySelector('.head');
  if(!head)return;
  let btn=head.querySelector('.magic-wand-btn');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='magic-wand-btn';
    btn.textContent='🪄';
    btn.title='Ricalcola tutta la strategia';
    btn.setAttribute('aria-label','Ricalcola tutta la strategia');
    btn.setAttribute('data-bacchetta-button','1');
    const plus=head.querySelector('button[onclick*="addBrainStrategy"]');
    if(plus)head.insertBefore(btn,plus);else head.appendChild(btn);
  }
  return btn;
}

function wrapRunner(){
  if(typeof window.runMagicWand!=='function' || window.runMagicWand.__wrapped562)return false;
  const original=window.runMagicWand;
  const wrapped=async function(btn){
    window.__ASTA_WAND_ACTIVE=true;
    try{return await original(btn)}finally{window.__ASTA_WAND_ACTIVE=false}
  };
  wrapped.__wrapped562=true;
  window.runMagicWand=wrapped;
  return true;
}

function fallbackClick(btn){
  if(!btn)return;
  if(window.__ASTA_WAND_ACTIVE)return;
  if(typeof window.runMagicWand!=='function')return;
  if(btn.disabled)return;
  /* Il motore principale usa un listener documentale. Questo fallback entra
     solo se quel listener non ha preso in carico il click. */
  setTimeout(function(){
    if(window.__ASTA_WAND_ACTIVE || btn.disabled)return;
    if(typeof window.runMagicWand==='function')window.runMagicWand(btn);
  },80);
}

function bindButton(btn){
  if(!btn||btn.dataset.bacchettaBound==='1')return;
  btn.dataset.bacchettaBound='1';
  btn.addEventListener('pointerdown',function(){
    if(!btn.disabled){btn.classList.add('magic-wand-running');}
  },{passive:true});
  btn.addEventListener('click',function(e){
    e.preventDefault();
    e.stopPropagation();
    fallbackClick(btn);
  });
}

function forceRefresh(){
  const btn=document.getElementById('refreshAppBtn');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  const go=function(){
    window.location.replace(window.location.pathname+'?update='+Date.now());
  };
  try{
    if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){
      navigator.serviceWorker.getRegistrations().then(function(regs){
        return Promise.all(regs.map(function(r){try{return r.update()}catch(e){return null}}));
      }).catch(function(){}).finally(go);
    }else go();
  }catch(e){go();}
}

function fixRefresh(){
  /* L'inline legacy di index.html può ridefinire refreshApp: lo sostituiamo
     dopo il parsing e anche al successivo tick. */
  window.refreshApp=forceRefresh;
  const b=document.getElementById('refreshAppBtn');
  if(b)b.onclick=function(e){e.preventDefault();forceRefresh()};
}

function install(){
  ensureStyle();
  const btn=ensureButton();
  bindButton(btn);
  wrapRunner();
  fixRefresh();
  if(typeof window.renderBrain==='function'&&!window.renderBrain.__bacchettaUi562){
    const original=window.renderBrain;
    window.renderBrain=function(){
      const result=original.apply(this,arguments);
      setTimeout(function(){const b=ensureButton();bindButton(b)},0);
      return result;
    };
    window.renderBrain.__bacchettaUi562=true;
  }
}

function boot(){
  install();
  let n=0;
  const timer=setInterval(function(){
    install();
    if(++n>=100)clearInterval(timer);
  },100);
  setTimeout(fixRefresh,0);
  setTimeout(fixRefresh,250);
  setTimeout(fixRefresh,1000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
window.ASTA_BACCHETTA_VERSION=VERSION;
})();
