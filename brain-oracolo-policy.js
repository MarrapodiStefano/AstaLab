/* Brain Oracolo policy 3.5.102 — gerarchia 🔥 > ⭐️ > 👍 > 🎲 + PWA bootstrap */
(function(){
'use strict';
const VERSION='3.5.102';
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

/*
   BOOTSTRAP PWA DEFINITIVO
   Questo file viene caricato anche dalle vecchie versioni del Service Worker.
   Per questo è il punto corretto per uscire dal ciclo vecchio SW -> vecchio HTML.
*/
function updatePWA(){
  if(!('serviceWorker' in navigator))return;
  if(window.__astaPwaBootstrap102)return;
  window.__astaPwaBootstrap102=true;
  let reloading=false;
  const reload=function(){
    if(reloading)return;
    reloading=true;
    window.location.replace(window.location.pathname+'?pwa='+Date.now());
  };
  navigator.serviceWorker.addEventListener('controllerchange',reload);
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(function(reg){
    return reg.update().catch(function(){}).then(function(){
      let w=reg.waiting||reg.installing;
      if(!w)return;
      if(w.state==='installed'){
        try{w.postMessage({type:'SKIP_WAITING'})}catch(e){}
        return;
      }
      return new Promise(function(resolve){
        let done=false;
        const finish=function(){if(done)return;done=true;w.removeEventListener('statechange',onState);resolve()};
        const onState=function(){if(w.state==='installed'||w.state==='redundant')finish()};
        w.addEventListener('statechange',onState);
        setTimeout(finish,4000);
      }).then(function(){
        if(reg.waiting){try{reg.waiting.postMessage({type:'SKIP_WAITING'})}catch(e){}}
      });
    });
  }).catch(function(e){console.warn('PWA bootstrap:',e)});
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){updatePWA();bootBrain()},{once:true});
}else{
  updatePWA();
  bootBrain();
}
window.BrainOracoloPolicy={version:VERSION};
const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION;
})();