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
  const VERSION='3.4.32';
  const versionEl=document.querySelector('.app-version');
  if(versionEl)versionEl.textContent='V. '+VERSION;
  if(document.querySelector('script[data-bacchetta]'))return;
  const script=document.createElement('script');
  script.src='./bacchetta.js?v='+VERSION;
  script.dataset.bacchetta='1';
  script.async=false;
  script.onload=function(){
    document.documentElement.dataset.bacchettaReady=window.runMagicWand?'1':'0';
    ensureMagicWandButton();
  };
  script.onerror=function(){console.error('Bacchetta Magica: caricamento fallito');ensureMagicWandButton();};
  document.body.appendChild(script);

  function ensureMagicWandButton(){
    const brain=document.getElementById('brain');
    if(!brain)return;
    let btn=document.getElementById('magicWandFixed');
    if(!btn){
      btn=document.createElement('button');
      btn.id='magicWandFixed';
      btn.type='button';
      btn.textContent='🪄';
      btn.setAttribute('aria-label','Bacchetta Magica');
      btn.title='Compila automaticamente gli slot della strategia attiva';
      btn.onclick=function(e){
        e.preventDefault();
        e.stopPropagation();
        if(typeof window.runMagicWand==='function') window.runMagicWand();
        else alert('Bacchetta Magica non ancora caricata.');
      };
      document.body.appendChild(btn);
    }
    const active=brain.classList.contains('active');
    btn.style.display=active?'flex':'none';
  }

  const css=document.createElement('style');
  css.id='magicWandFixedStyle';
  css.textContent=`#magicWandFixed{position:fixed;right:16px;top:calc(78px + env(safe-area-inset-top));z-index:2147483646;width:48px;height:48px;border:1px solid #dfe4e9;border-radius:15px;background:#fff;box-shadow:0 3px 12px rgba(20,30,45,.14);font-size:26px;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent}#magicWandFixed:active{transform:scale(.94)}#magicWandFixed:disabled{opacity:.6}`;
  document.head.appendChild(css);

  ensureMagicWandButton();
  document.addEventListener('click',()=>setTimeout(ensureMagicWandButton,0),true);
  const oldGo=window.go;
  if(typeof oldGo==='function'&&!oldGo.__magicWandWrapped){
    window.go=function(id){const r=oldGo.apply(this,arguments);setTimeout(ensureMagicWandButton,0);return r;};
    window.go.__magicWandWrapped=true;
  }

  /* =========================
     AGGIORNAMENTO PWA RAPIDO
  ========================= */
  const installFastRefresh=()=>{
    const currentRefresh=window.refreshApp;
    if(typeof currentRefresh!=='function' || currentRefresh.__fastRefresh32)return;
    const fastRefresh=()=>{
      const btn=document.getElementById('refreshAppBtn');
      if(btn){
        btn.classList.add('loading');
        btn.setAttribute('aria-label','Aggiornamento in corso');
      }
      try{
        if('serviceWorker' in navigator){
          navigator.serviceWorker.getRegistration().then(reg=>{
            if(!reg)return;
            reg.update().catch(()=>{});
            if(reg.waiting){
              try{reg.waiting.postMessage({type:'SKIP_WAITING'});}catch(e){}
            }
          }).catch(()=>{});
        }
      }catch(e){}
      /*
         Non aspettiamo controllerchange/reg.update(): su iOS questo può
         trattenere la UI per diversi secondi. Il SW attuale è network-first,
         quindi il documento con query unica viene richiesto subito alla rete.
      */
      setTimeout(()=>{
        window.location.replace(window.location.pathname+'?update='+Date.now());
      },80);
    };
    fastRefresh.__fastRefresh32=true;
    window.refreshApp=fastRefresh;
  };
  installFastRefresh();
})();

function campettiBoot(){renderCampetti();initCampettiZoom();}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',campettiBoot,{once:true});}else{campettiBoot();}
