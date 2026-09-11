/* Oracolo recovery guard v3.9.0 */
(function(){
  'use strict';
  const proto=Element.prototype;
  const desc=Object.getOwnPropertyDescriptor(proto,'textContent');
  if(desc&&desc.get&&desc.set&&!proto.__afTextContentGuard){
    Object.defineProperty(proto,'textContent',{
      configurable:desc.configurable,
      enumerable:desc.enumerable,
      get:desc.get,
      set:function(value){
        if(this.classList?.contains('app-version')) value='V. 3.9.0';
        if(String(this.textContent??'')===String(value??'')) return;
        return desc.set.call(this,value);
      }
    });
    proto.__afTextContentGuard=true;
  }
  function version(){
    const v=document.querySelector('.app-version');
    if(v) v.textContent='V. 3.9.0';
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',version,{once:true}); else version();
})();
