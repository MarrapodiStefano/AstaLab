/* =========================
   CAMPETTI – SERIE A 2026/27
========================= */
const CAMPI_SERIE_A = [
  ['atalanta','Atalanta','Atalanta BC.png'],['bologna','Bologna','Bologna FC 1909.png'],['cagliari','Cagliari','Cagliari Calcio.png'],['como','Como','Como 1907.png'],['fiorentina','Fiorentina','ACF Fiorentina.png'],['frosinone','Frosinone','Frosinone Calcio.png'],['genoa','Genoa','Genoa CFC.png'],['inter','Inter','Inter Milan.png'],['juventus','Juventus','Juventus FC.png'],['lazio','Lazio','SS Lazio.png'],['lecce','Lecce','US Lecce.png'],['milan','Milan','AC Milan.png'],['monza','Monza','AC Monza.png'],['napoli','Napoli','SSC Napoli.png'],['parma','Parma','Parma Calcio 1913.png'],['roma','Roma','AS Roma.png'],['sassuolo','Sassuolo','US Sassuolo.png'],['torino','Torino','Torino FC.png'],['udinese','Udinese','Udinese Calcio.png'],['venezia','Venezia','Venezia FC.png']
].map(([id,name,file])=>({id,name,crest:'https://raw.githubusercontent.com/luukhopman/football-logos/master/logos/Italy%20-%20Serie%20A/'+encodeURIComponent(file)}));
function renderCampetti(){const grid=document.getElementById('campettiGrid');if(!grid)return;grid.innerHTML=CAMPI_SERIE_A.map(team=>`<button class="campetti-team campetti-${team.id}" type="button" onclick="openCampetto('${team.id}')" aria-label="Apri campetto ${team.name}"><span class="campetti-crest" aria-hidden="true"><img src="${team.crest}" alt="" loading="eager" referrerpolicy="no-referrer"></span></button>`).join('');}
function openCampetto(teamId){const team=CAMPI_SERIE_A.find(t=>t.id===teamId);if(!team)return;const viewer=document.getElementById('campettiViewer'),image=document.getElementById('campettiViewerImage'),empty=document.getElementById('campettiViewerEmpty');if(!viewer||!image||!empty)return;viewer.classList.add('show');document.body.classList.add('campetti-open');campettiResetZoom();const campettiImages={atalanta:'./assets/atalanta.jpg',bologna:'./assets/bologna.PNG',cagliari:'./assets/cagliari.PNG',como:'./assets/como.PNG',fiorentina:'./assets/fiorentina.PNG',frosinone:'./assets/frosinone.PNG',genoa:'./assets/genoa.PNG',inter:'./assets/inter.PNG',juventus:'./assets/juventus.PNG',lazio:'./assets/lazio.PNG',lecce:'./assets/lecce.PNG',milan:'./assets/milan.jpg',monza:'./assets/monza.jpg',napoli:'./assets/napoli.jpg',parma:'./assets/parma.PNG',roma:'./assets/roma.PNG',sassuolo:'./assets/sassuolo.PNG',torino:'./assets/torino.PNG',udinese:'./assets/udinese.PNG',venezia:'./assets/venezia.PNG'};const imagePath=campettiImages[team.id];if(imagePath){image.src=imagePath+'?v=2.9.26';image.alt='Campetto '+team.name;image.style.display='block';empty.style.display='none';image.onerror=()=>{image.style.display='none';empty.innerHTML='<div class="campetti-empty-icon">⚽</div><b>Immagine '+team.name+' non trovata</b><span>Controlliamo insieme il nome del file nella cartella assets.</span>';empty.style.display='flex';};}else{image.removeAttribute('src');image.style.display='none';empty.innerHTML='<div class="campetti-empty-icon">⚽</div><b>Campetto '+team.name+'</b><span>Immagine non ancora collegata.</span>';empty.style.display='flex';}}
function closeCampetto(){const viewer=document.getElementById('campettiViewer');if(viewer)viewer.classList.remove('show');document.body.classList.remove('campetti-open');campettiResetZoom();}
let campettiScale=1,campettiX=0,campettiY=0,campettiStartDist=0,campettiStartScale=1,campettiStartX=0,campettiStartY=0,campettiPanning=false,campettiPinching=false;
function campettiApplyTransform(){const image=document.getElementById('campettiViewerImage');if(!image)return;image.style.transform='translate('+campettiX+'px,'+campettiY+'px) scale('+campettiScale+')';}
function campettiResetZoom(){campettiScale=1;campettiX=0;campettiY=0;campettiApplyTransform();}
function campettiDistance(touches){const dx=touches[0].clientX-touches[1].clientX,dy=touches[0].clientY-touches[1].clientY;return Math.hypot(dx,dy);}
function initCampettiZoom(){const area=document.getElementById('campettiImageStage');if(!area||area.dataset.zoomReady)return;area.dataset.zoomReady='1';area.addEventListener('touchstart',e=>{if(e.touches.length===2){campettiPinching=true;campettiPanning=false;campettiStartDist=campettiDistance(e.touches);campettiStartScale=campettiScale;}else if(e.touches.length===1&&campettiScale>1){campettiPanning=true;campettiStartX=e.touches[0].clientX-campettiX;campettiStartY=e.touches[0].clientY-campettiY;}},{passive:false});area.addEventListener('touchmove',e=>{if(e.touches.length===2&&campettiPinching){e.preventDefault();const ratio=campettiDistance(e.touches)/campettiStartDist;campettiScale=Math.min(4,Math.max(1,campettiStartScale*ratio));campettiApplyTransform();}else if(e.touches.length===1&&campettiPanning){e.preventDefault();campettiX=e.touches[0].clientX-campettiStartX;campettiY=e.touches[0].clientY-campettiStartY;campettiApplyTransform();}},{passive:false});area.addEventListener('touchend',e=>{if(e.touches.length<2)campettiPinching=false;if(!e.touches.length)campettiPanning=false;if(campettiScale<=1.02)campettiResetZoom();});area.addEventListener('dblclick',()=>{if(campettiScale===1){campettiScale=2;}else{campettiResetZoom();return;}campettiApplyTransform();});}

/* =========================
   BACCHETTA MAGICA
========================= */
(function loadMagicWand(){
  const VERSION='3.4.34';
  const versionEl=document.querySelector('.app-version');
  if(versionEl)versionEl.textContent='V. '+VERSION;
  if(!document.querySelector('script[data-bacchetta]')){
    const script=document.createElement('script');
    script.src='./bacchetta.js?v='+VERSION;
    script.dataset.bacchetta='1';
    script.async=false;
    script.onload=function(){
      document.documentElement.dataset.bacchettaReady=window.runMagicWand?'1':'0';
      ensureBrainControls();
    };
    script.onerror=function(){console.error('Bacchetta Magica: caricamento fallito');ensureBrainControls();};
    document.body.appendChild(script);
  }

  const css=document.createElement('style');
  css.id='magicWandFixedStyle';
  css.textContent=`
    /* La bacchetta resta nell'header Brain, distinta dal + delle strategie. */
    #brain .head{position:relative}
    #brain .head .magic-wand-btn{width:42px;height:42px;flex:0 0 42px;border:1px solid #dfe4e9;border-radius:14px;background:#fff;font-size:23px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(20,30,45,.10);cursor:pointer;-webkit-tap-highlight-color:transparent;order:2}
    #brain .head > button.plus{order:3}
    #brain .head .magic-wand-btn:active{transform:scale(.94)}
    #brain .head .magic-wand-btn.magic-wand-running{animation:magicWandPulse .72s ease-in-out infinite}
    @keyframes magicWandPulse{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.08) rotate(7deg)}}
    .brain-strategy-name{touch-action:manipulation;-webkit-user-select:none;user-select:none}
  `;
  document.head.appendChild(css);

  let strategyPressTimer=null;
  let suppressStrategyClickUntil=0;
  let strategyPressTarget=null;

  function moveWandIntoBrainHeader(){
    const fixed=document.getElementById('magicWandFixed');
    if(fixed)fixed.remove();
    const brain=document.getElementById('brain');
    if(!brain)return;
    const head=brain.querySelector('.head');
    if(!head)return;
    const wand=head.querySelector('.magic-wand-btn')||brain.querySelector('.magic-wand-btn');
    if(!wand)return;
    const plus=head.querySelector('button.plus');
    if(plus)head.insertBefore(wand,plus);
    else head.appendChild(wand);
  }

  function ensureStrategyLongPress(){
    const brain=document.getElementById('brain');
    if(!brain||brain.dataset.strategyLongPress==='1')return;
    brain.dataset.strategyLongPress='1';

    brain.addEventListener('pointerdown',e=>{
      const name=e.target.closest('.brain-strategy-name');
      if(!name)return;
      const id=Number((name.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/)?.[1]);
      if(!id)return;
      strategyPressTarget=name;
      clearTimeout(strategyPressTimer);
      strategyPressTimer=setTimeout(()=>{
        if(strategyPressTarget!==name)return;
        suppressStrategyClickUntil=Date.now()+900;
        if(typeof selectBrainStrategy==='function'){
          selectBrainStrategy(id);
          renderBrain();
        }
        name.classList.add('brain-strategy-long-selected');
        setTimeout(()=>name.classList.remove('brain-strategy-long-selected'),300);
        strategyPressTimer=null;
      },650);
    },true);

    const cancel=()=>{clearTimeout(strategyPressTimer);strategyPressTimer=null;strategyPressTarget=null;};
    brain.addEventListener('pointerup',cancel,true);
    brain.addEventListener('pointercancel',cancel,true);
    brain.addEventListener('pointerleave',cancel,true);
    brain.addEventListener('pointermove',e=>{if(strategyPressTarget&&Math.abs(e.movementX||0)+Math.abs(e.movementY||0)>10)cancel();},true);
    brain.addEventListener('contextmenu',e=>{if(e.target.closest('.brain-strategy-name'))e.preventDefault();},true);
    brain.addEventListener('click',e=>{
      const name=e.target.closest('.brain-strategy-name');
      if(name&&Date.now()<suppressStrategyClickUntil){e.preventDefault();e.stopImmediatePropagation();suppressStrategyClickUntil=0;}
    },true);
  }

  function ensureBrainControls(){
    moveWandIntoBrainHeader();
    ensureStrategyLongPress();
  }

  ensureBrainControls();
  document.addEventListener('click',()=>setTimeout(ensureBrainControls,0),true);
  const observer=new MutationObserver(()=>setTimeout(ensureBrainControls,0));
  const brain=document.getElementById('brain');
  if(brain)observer.observe(brain,{childList:true,subtree:true});

  const oldGo=window.go;
  if(typeof oldGo==='function'&&!oldGo.__magicWandBrainControls34){
    window.go=function(id){const r=oldGo.apply(this,arguments);setTimeout(ensureBrainControls,0);return r;};
    window.go.__magicWandBrainControls34=true;
  }

  /* =========================
     AGGIORNAMENTO PWA ROBUSTO
  ========================= */
  function hardRefresh(){
    const btn=document.getElementById('refreshAppBtn');
    if(btn){btn.classList.add('loading');btn.setAttribute('aria-label','Aggiornamento in corso');btn.disabled=true;}
    try{
      if('serviceWorker' in navigator){
        navigator.serviceWorker.getRegistration().then(reg=>{if(reg)reg.update().catch(()=>{});}).catch(()=>{});
      }
    }catch(e){}
    setTimeout(()=>{
      const u=new URL(window.location.href);
      u.searchParams.set('update',Date.now());
      u.hash='';
      window.location.replace(u.toString());
    },180);
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#refreshAppBtn');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    hardRefresh();
  },true);

  window.refreshApp=hardRefresh;
})();

function campettiBoot(){renderCampetti();initCampettiZoom();}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',campettiBoot,{once:true});}else{campettiBoot();}
