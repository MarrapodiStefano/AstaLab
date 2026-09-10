/* Bacchetta compatibility controller — frozen v3.4.56
   Unico motore operativo: market-sync-v50.js.
   Questo file esiste solo per compatibilità con il vecchio caricamento diretto.
*/
(function(){
'use strict';
const VERSION='3.4.56';
function loadEngine(){
  if(window.__ASTA_BACCHETTA_V12 || typeof window.runMagicWand==='function')return true;
  if(document.querySelector('script[data-market-sync-v50]'))return false;
  const s=document.createElement('script');
  s.src='./market-sync-v50.js?v=3.4.56';
  s.async=false;
  s.setAttribute('data-market-sync-v50','1');
  (document.body||document.head).appendChild(s);
  return false;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadEngine,{once:true});
else loadEngine();
window.ASTA_BACCHETTA_VERSION=VERSION;
})();
