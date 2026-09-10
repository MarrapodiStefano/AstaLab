/* Brain budget fix v3.4.56
   Il motore unico degli slot è market-sync-v50.js.
   Questo file mantiene solo la sincronizzazione visiva e la versione.
*/
(function(){
'use strict';
const VERSION='3.4.56';
function setVersion(){const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION}
function install(){setVersion();if(typeof window.renderBrain!=='function')return false;if(window.renderBrain.__brainBudgetFix56)return true;const original=window.renderBrain;window.renderBrain=function(){const result=original.apply(this,arguments);setVersion();return result};window.renderBrain.__brainBudgetFix56=true;return true}
function boot(){if(install())return;let n=0;const timer=setInterval(()=>{if(install()||++n>60)clearInterval(timer)},50)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
