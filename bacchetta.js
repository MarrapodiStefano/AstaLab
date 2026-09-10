/* Bacchetta controller 3.4.57
   Questo file NON contiene più un secondo motore d'asta.
   Fa solo tre cose affidabili:
   1) garantisce che il motore market-sync-v50 venga caricato;
   2) garantisce pulsante + animazione indipendente dal renderBrain;
   3) sostituisce la vecchia refreshApp inline con un solo aggiornamento controllato.
*/
(function(){
'use strict';
const VERSION='3.4.57';

function setVersion(){
  document.querySelectorAll('.app-version').forEach(v=>v.textContent='V. '+VERSION);
}

function ensureWandButton(){
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
    head.appendChild(btn);
  }
}

function ensureStyles(){
  if(document.getElementById('magicWandStable57'))return;
  const s=document.createElement('style');
  s.id='magicWandStable57';
  s.textContent=`
.magic-wand-btn{
  width:42px;height:42px;min-width:42px;min-height:42px;flex:0 0 42px;
  border:1px solid #dfe4e9;border-radius:13px;background:#fff;
  font-size:23px;line-height:1;display:flex;align-items:center;justify-content:center;
  box-shadow:0 1px 4px rgba(20,30,45,.06);cursor:pointer;
  -webkit-tap-highlight-color:transparent;
}
.magic-wand-btn:active{transform:scale(.92)}
.magic-wand-btn.magic-wand-running,
html.wand-running .magic-wand-btn{
  animation:magicWandPulse57 .55s ease-in-out infinite;
  box-shadow:0 0 0 6px rgba(8,120,79,.12),0 3px 14px rgba(8,120,79,.22);
  background:#f2fbf7;
}
.magic-wand-btn:disabled{cursor:wait}
@keyframes magicWandPulse57{
  0%,100%{transform:scale(1) rotate(0deg)}
  50%{transform:scale(1.14) rotate(10deg)}
}
`;
  document.head.appendChild(s);
}

function startAnimation(){
  document.documentElement.classList.add('wand-running');
  clearTimeout(window.__wandAnimationTimer57);
  window.__wandAnimationTimer57=setTimeout(()=>{
    document.documentElement.classList.remove('wand-running');
  },1600);
}

function bindAnimation(){
  if(document.documentElement.dataset.wandAnimation57==='1')return;
  document.documentElement.dataset.wandAnimation57='1';
  document.addEventListener('pointerdown',e=>{
    if(e.target?.closest?.('.magic-wand-btn')) startAnimation();
  },true);
  document.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&document.activeElement?.closest?.('.magic-wand-btn')) startAnimation();
  },true);
}

function ensureMarketEngine(){
  if(window.__ASTA_BACCHETTA_V12 || typeof window.runMagicWand==='function')return;
  if(document.querySelector('script[data-market-sync-v50]'))return;
  const s=document.createElement('script');
  s.src='./market-sync-v50.js?v=3.4.56';
  s.async=false;
  s.setAttribute('data-market-sync-v50','1');
  (document.body||document.head).appendChild(s);
}

function stableRefresh(){
  if(window.__ASTA_REFRESH_RUNNING_57)return;
  window.__ASTA_REFRESH_RUNNING_57=true;
  const btn=document.getElementById('refreshAppBtn');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  /* Una sola navigazione. Niente doppio reload e niente attesa del controller. */
  const url=window.location.pathname+'?update='+Date.now();
  window.location.replace(url);
}

function install(){
  ensureStyles();
  ensureWandButton();
  bindAnimation();
  ensureMarketEngine();
  setVersion();
  /* L'index storico ridefinisce refreshApp inline: lo sostituiamo dopo che
     lo stack di script ha terminato, così resta una sola implementazione. */
  window.setTimeout(()=>{window.refreshApp=stableRefresh;setVersion();ensureWandButton()},0);
}

function boot(){
  install();
  let n=0;
  const timer=setInterval(()=>{
    install();
    if(++n>=80)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
