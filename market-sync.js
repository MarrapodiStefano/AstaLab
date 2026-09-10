/* Asta Fantacalcio — sincronizzazione mercato per Bacchetta */
(function(){
'use strict';
const VERSION='3.4.43';
function sync(){
  if(!current||!Array.isArray(current.teams)) return null;
  const base=Array.isArray(current.history)?current.history:[];
  const existing=new Set(base.map(h=>String(h?.playerId??'')+'|'+String(h?.price??'')));
  const extra=[];
  current.teams.forEach(t=>(t.players||[]).forEach(p=>{
    const price=Number(p?.price);
    if(!(price>0)||p?.id==null) return;
    const key=String(p.id)+'|'+String(price);
    if(existing.has(key)) return;
    extra.push({playerId:p.id,price,role:p.role,team:t.name,teamId:t.id,source:'team-sync'});
  }));
  current.history=base.concat(extra);
  const originalPersist=typeof persist==='function'?persist:null;
  if(originalPersist){
    persist=function(){
      const h=current.history;
      current.history=base;
      try{return originalPersist.apply(this,arguments)}
      finally{current.history=h}
    };
  }
  return {base,originalPersist};
}
function install(){
  const original=window.runMagicWand;
  if(typeof original!=='function'||original.__marketSync)return false;
  const wrapped=function(){
    const ctx=sync();
    try{return original.apply(this,arguments)}
    finally if(ctx)setTimeout(function(){current.history=ctx.base;if(ctx.originalPersist)persist=ctx.originalPersist},2000);
  };
  wrapped.__marketSync=true;
  wrapped.__marketSyncVersion=VERSION;
  window.runMagicWand=wrapped;
  return true;
}
if(!install()){
  let n=0;
  const timer=setInterval(function(){if(install()||++n>50)clearInterval(timer)},50);
}
})();
