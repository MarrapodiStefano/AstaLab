/* Bacchetta compatibility controller — frozen v3.4.56
   Questo file NON contiene più un secondo motore della Bacchetta.
   Il solo motore operativo è market-sync-v50.js.
   Manteniamo questo controller perché l'app esistente può caricarlo direttamente.
*/
(function(){
'use strict';
const VERSION='3.4.56';

function loadEngine(){
  if(window.__ASTA_BACCHETTA_V12 || typeof window.runMagicWand==='function') return true;
  if(document.querySelector('script[data-bacchetta-engine56]')) return false;
  const s=document.createElement('script');
  s.src='./market-sync-v50.js?v=3.4.56';
  s.async=false;
  s.setAttribute('data-bacchetta-engine56','1');
  (document.body||document.head).appendChild(s);
  return false;
}

function install(){
  /* Nessun setVersion(), nessun listener click, nessuna animazione qui:
     evita il conflitto che faceva oscillare 56/57 e duplicava la Bacchetta. */
  loadEngine();
  return true;
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',install,{once:true});
}else{
  install();
}

window.ASTA_BACCHETTA_VERSION=VERSION;
})();
