/* Brain Oracolo policy 3.5.81 — gerarchia 🔥 > ⭐️ > 👍 > 🎲 */
(function(){
'use strict';
const VERSION='3.5.81';
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
function boot(){if(arm())return;setTimeout(boot,100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.BrainOracoloPolicy={version:VERSION};
})();