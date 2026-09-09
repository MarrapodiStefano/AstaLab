/* UI fixes 3.4.36 — Bacchetta unica + posizione lato sinistro */
(function(){
  'use strict';
  const VERSION='3.4.36';
  let observer=null;

  function setVersion(){
    const v=document.querySelector('.app-version');
    if(v)v.textContent='V. '+VERSION;
  }

  function position(btn){
    const header=document.querySelector('.header');
    if(!header)return;
    const r=header.getBoundingClientRect();
    btn.style.top=Math.max(0,Math.round(r.bottom+12))+'px';
  }

  function ensureWand(){
    const brain=document.getElementById('brain');
    if(!brain)return;
    brain.querySelectorAll('.magic-wand-btn').forEach(el=>el.remove());
    let btn=document.getElementById('magicWandFixed');
    if(!btn){
      btn=document.createElement('button');
      btn.id='magicWandFixed';
      btn.type='button';
      btn.className='magic-wand-fixed-btn';
      btn.textContent='🪄';
      btn.setAttribute('aria-label','Compila automaticamente gli slot');
      btn.title='Compila automaticamente gli slot';
      btn.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        if(typeof window.runMagicWand==='function')window.runMagicWand(btn);
      });
      document.body.appendChild(btn);
    }
    position(btn);
    btn.style.display=brain.classList.contains('active')?'flex':'none';
  }

  function boot(){
    setVersion();
    const css=document.createElement('style');
    css.id='uiFixes36Style';
    css.textContent=`
      #magicWandFixed{position:fixed;left:16px;right:auto;z-index:2147483646;width:58px;height:58px;min-width:58px;min-height:58px;border:1px solid #dfe4e9;border-radius:17px;background:#fff;color:var(--ink);font-size:30px;line-height:1;display:none;align-items:center;justify-content:center;box-shadow:0 5px 18px rgba(20,30,45,.14);cursor:pointer;-webkit-tap-highlight-color:transparent;}
      #magicWandFixed:active{transform:scale(.94)}
      #magicWandFixed.magic-wand-running{animation:magicWandPulse36 .72s ease-in-out infinite;box-shadow:0 0 0 7px rgba(8,120,79,.11),0 4px 16px rgba(8,120,79,.22);background:#f2fbf7}
      @keyframes magicWandPulse36{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.10) rotate(8deg)}}
    `;
    document.head.appendChild(css);
    ensureWand();
    const brain=document.getElementById('brain');
    if(brain&&!observer){
      observer=new MutationObserver(()=>setTimeout(ensureWand,0));
      observer.observe(brain,{childList:true,subtree:true});
    }
    window.addEventListener('resize',()=>{const b=document.getElementById('magicWandFixed');if(b)position(b);},{passive:true});
    document.addEventListener('click',()=>setTimeout(ensureWand,0),true);
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
