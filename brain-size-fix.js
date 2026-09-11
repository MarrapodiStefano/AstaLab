/* Brain size fix v3.6.0 — solo dimensione numeri crediti slot */
(function(){
  'use strict';
  const VERSION='3.6.0';
  function apply(){
    let style=document.getElementById('brainSizeFixStyle');
    if(!style){style=document.createElement('style');style.id='brainSizeFixStyle';document.head.appendChild(style);}
    style.textContent=`
      input.brain-slot-budget-input,
      .brain-slot-budget input.brain-slot-budget-input{
        font-size:16px!important;
        line-height:35px!important;
        font-weight:800!important;
        width:54px!important;
        max-width:54px!important;
        height:35px!important;
      }
      .app-version{ }
    `;
    const v=document.querySelector('.app-version');
    if(v)v.textContent='V. '+VERSION;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();