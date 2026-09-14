/* Brain Oracolo policy 3.5.103 — gerarchia 🔥 > ⭐️ > 👍 > 🎲 */
(function(){
'use strict';
const VERSION='3.5.103';
let armed=false;
function arm(){
  if(armed)return true;
  if(!window.BrainEngine?.fill)return false;
  document.addEventListener('click',function(e){
    const b=e.target?.closest?.('.oracolo-button');
    if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    window.BrainEngine.fill();
  },true);
  armed=true;
  return true;
}
function bootBrain(){if(arm())return;setTimeout(bootBrain,100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootBrain,{once:true});else bootBrain();
window.BrainOracoloPolicy={version:VERSION};
const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION;
})();
