/* Brain budget fix v3.4.55
   La Bacchetta v3.4.55 (market-sync-v50.js) è l'unico motore che modifica i giocatori degli slot.
   Questo file mantiene solo la sincronizzazione visiva della versione.
*/
(function(){
'use strict';
const VERSION='3.4.55';
function setVersion(){document.querySelectorAll('.app-version').forEach(v=>v.textContent='V. '+VERSION)}
function install(){setVersion();if(typeof window.renderBrain!=='function')return false;if(window.renderBrain.__brainBudgetFix55)return true;const original=window.renderBrain;window.renderBrain=function(){const result=original.apply(this,arguments);setVersion();return result};window.renderBrain.__brainBudgetFix55=true;return true}
function boot(){if(install())return;let n=0;const timer=setInterval(()=>{if(install()||++n>60)clearInterval(timer)},50)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
