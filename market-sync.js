/* Asta Fantacalcio — mercato + Bacchetta v8: budget guidato dagli obiettivi */
(function(){
'use strict';
const VERSION='3.4.44';

function soldIds(){const s=new Set();(current?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>s.add(String(p.id))));return s;}
function all(){return typeof allPlayers==='function'?allPlayers():[];}
function roleLimits(){return typeof brainStrategySlots==='function'?brainStrategySlots(activeStrategy()):{P:2,D:9,C:9,A:7};}
function activeStrategy(){return typeof activeBrainStrategy==='function'?activeBrainStrategy():current?.brainStrategies?.find(s=>s.id===current?.activeBrainStrategyId);}
function hasObjective(id){return !Array.isArray(current?.objectives)||current.objectives.some(x=>String(x)===String(id));}
function priorityOf(p){try{return typeof objectivePriority==='function'?objectivePriority(p.id):'base';}catch(e){return 'base';}}
function targetsFor(s,r){return typeof brainSlotTargets==='function'?brainSlotTargets(s,r):(s.slotTargets?.[r]||[]);}
function slotCount(s,r){return Number(roleLimits()[r]||0);}
function refPrice(p){const pmv=Number(p?.pmv);if(Number.isFinite(pmv)&&pmv>0)return pmv;const c=Number(p?.credits);return Number.isFinite(c)&&c>0?c:1;}
function maxBid(p){const c=Number(p?.credits);return Number.isFinite(c)&&c>0?Math.round(c):1;}
function median(a){if(!a.length)return 1;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;}
function marketMultiplier(p){
  const rows=[];const near=[];const ps=all();const byId=new Map(ps.map(x=>[String(x.id),x]));
  (Array.isArray(current?.history)?current.history:[]).forEach(h=>{
    if(h?.role!==p?.role||!(Number(h?.price)>0))return;
    const ref=byId.get(String(h.playerId));if(!ref)return;
    const base=refPrice(ref),ratio=Number(h.price)/base;
    if(!(base>0)&&!Number.isFinite(ratio))return;
    if(Number.isFinite(ratio)&&ratio>0){rows.push(ratio);if(Math.abs((Number(ref.appeal)||0)-(Number(p.appeal)||0))<=1.25)near.push(ratio);}
  });
  const rm=median(rows),nm=median(near),q=near.length>=3?.7:near.length?.35:0;
  return Math.max(.55,Math.min(1.6,rm*(1-q)+nm*q));
}
function marketEstimate(p){return Math.max(1,Math.round(refPrice(p)*marketMultiplier(p)));}
function quality(p,r){
  const appeal=Math.max(0,Math.min(10,Number(p?.appeal)||0));
  let hist=null;
  try{hist=window.ASTA_HISTORICAL?.profile?.(p)||null;}catch(e){hist=null;}
  const hs=hist?.found&&hist.pv>0?Number(hist.historicalScore)||0:null;
  let q=hs==null?appeal:appeal*.6+hs*.4;
  const pri=priorityOf(p);
  if(pri==='max')q+=.8;else if(pri==='high')q+=.5;else if(pri==='base')q+=.25;
  return q;
}
function candidates(r,priority,sold){
  return all().filter(p=>p?.role===r&&hasObjective(p.id)&&priorityOf(p)===priority&&!sold.has(String(p.id)))
    .map(p=>({p,cost:maxBid(p),market:marketEstimate(p),quality:quality(p,r)}))
    .sort((a,b)=>b.quality-a.quality||a.cost-b.cost||b.market-a.market);
}
function futureMin(groups,start,used){let n=0;for(let i=start;i<groups.length;i++){let best=Infinity;for(const c of groups[i])if(!used.has(String(c.p.id))&&c.cost<best)best=c.cost;if(!Number.isFinite(best))return Infinity;n+=best;}return n;}
function solveRole(r,slotDefs,budget){
  const groups=slotDefs.map(d=>candidates(r,d.priority,new Set()));
  for(let i=0;i<groups.length;i++)if(!groups[i].length)return{ok:false,reason:'nessun giocatore disponibile per l\'appetibilità '+slotDefs[i].priority+' nello slot '+(slotDefs[i].index+1)};
  let beam=[{chosen:[],used:new Set(),cost:0,value:0}];
  const WIDTH=100;
  for(let i=0;i<groups.length;i++){
    const next=[];
    for(const st of beam){
      const rows=groups[i].filter(c=>!st.used.has(String(c.p.id)));
      for(const c of rows){
        const total=st.cost+c.cost;if(total>budget)continue;
        const used=new Set(st.used);used.add(String(c.p.id));
        if(total+futureMin(groups,i+1,used)>budget)continue;
        const value=st.value+c.quality-(c.cost/Math.max(1,budget))*.8-(c.market>c.cost?1.2:0);
        next.push({chosen:st.chosen.concat({...c,slot:slotDefs[i]}),used,cost:total,value});
      }
    }
    if(!next.length)return{ok:false,reason:'budget insufficiente per rispettare tutte le appetibilità del ruolo'};
    next.sort((a,b)=>b.value-a.value||a.cost-b.cost);beam=next.slice(0,WIDTH);
  }
  const best=beam[0];return{ok:true,chosen:best.chosen,cost:best.cost,budget};
}
function buildPlan(s){
  const initial=Number(current?.initialCredits)||0;const alloc=s?.allocation||{};const team=typeof brainMyTeam==='function'?brainMyTeam():current?.teams?.[0];
  const spentBy={P:0,D:0,C:0,A:0},countBy={P:0,D:0,C:0,A:0};
  (team?.players||[]).forEach(p=>{if(spentBy[p.role]!=null){spentBy[p.role]+=Number(p.price)||0;countBy[p.role]++;}});
  const plan={roles:{},errors:[]},sold=soldIds();
  ['P','D','C','A'].forEach(r=>{
    const total=slotCount(s,r),targets=targetsFor(s,r);const defs=[];
    for(let i=countBy[r];i<total;i++)defs.push({index:i,priority:targets[i]?.priority||'base'});
    const roleBudget=Math.max(0,Math.round(initial*(Number(alloc[r])||0)/100)-spentBy[r]);
    const solved=solveRole(r,defs,roleBudget);
    plan.roles[r]={total,targets,defs,roleBudget,spent:spentBy[r],count:countBy[r],solved};
    if(!solved.ok)plan.errors.push(r+': '+solved.reason+' (budget disponibile '+roleBudget+')');
  });
  return plan;
}
function applyPlan(s,plan){
  const initial=Number(current?.initialCredits)||0,alloc=s?.allocation||{};if(!s.slotTargets||typeof s.slotTargets!=='object')s.slotTargets={};if(!s.slotAllocation||typeof s.slotAllocation!=='object')s.slotAllocation={};
  ['P','D','C','A'].forEach(r=>{
    const x=plan.roles[r],n=x.total,old=Array.isArray(s.slotTargets[r])?s.slotTargets[r]:[],oldPct=Array.isArray(s.slotAllocation[r])?s.slotAllocation[r]:[];
    const next=Array.from({length:n},(_,i)=>({priority:old[i]?.priority||'base',playerId:null}));
    const pcts=Array.from({length:n},(_,i)=>Number(oldPct[i])||0);
    const planned=Math.max(1,initial*(Number(alloc[r])||0)/100);
    for(let i=0;i<x.count;i++){
      const p=brainMyTeam()?.players?.[i];
      if(p&&p.role===r){next[i]={priority:old[i]?.priority||priorityOf(p),playerId:p.id};pcts[i]=Math.round((Number(p.price)||0)/planned*1000)/10;}
    }
    (x.solved?.chosen||[]).forEach(c=>{next[c.slot.index]={priority:c.slot.priority,playerId:c.p.id};pcts[c.slot.index]=Math.round(c.cost/planned*1000)/10;});
    s.slotTargets[r]=next;s.slotAllocation[r]=pcts;
  });
  if(typeof persist==='function')persist();if(typeof renderBrain==='function')renderBrain();
}
function runNewWand(btn){
  if(!current){alert('Apri prima un’asta.');return;}
  const s=activeStrategy();if(!s){alert('Nessuna strategia attiva.');return;}
  if(btn){btn.disabled=true;btn.classList.add('magic-wand-running');btn.setAttribute('aria-busy','true');}
  try{
    const plan=buildPlan(s);
    if(plan.errors.length){console.warn('Bacchetta v8',plan.errors);alert('La Bacchetta non può rispettare tutte le appetibilità con il budget attuale.\n\n'+plan.errors.join('\n'));return;}
    applyPlan(s,plan);
    console.info('Bacchetta v8: strategia ricalcolata per obiettivi e budget.',plan);
  }catch(e){console.error('Bacchetta v8',e);alert('Errore Bacchetta Magica: '+(e?.message||e));}
  finally{if(btn){btn.disabled=false;btn.classList.remove('magic-wand-running');btn.setAttribute('aria-busy','false');}}
}
function syncMarket(){
  if(!current||!Array.isArray(current.teams))return null;
  const base=Array.isArray(current.history)?current.history:[];const existing=new Set(base.map(h=>String(h?.playerId??'')+'|'+String(h?.price??'')));const extra=[];
  current.teams.forEach(t=>(t.players||[]).forEach(p=>{const price=Number(p?.price);if(!(price>0)||p?.id==null)return;const key=String(p.id)+'|'+String(price);if(existing.has(key))return;extra.push({playerId:p.id,price,role:p.role,team:t.name,teamId:t.id,source:'team-sync'});}));
  current.history=base.concat(extra);return{base,extra};
}
function install(){
  const version=document.querySelector('.app-version');if(version)version.textContent=VERSION;
  if(window.__ASTA_BACCHETTA_V8)return true;
  document.addEventListener('click',function(e){
    const btn=e.target?.closest?.('.magic-wand-btn');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    const ctx=syncMarket();
    try{runNewWand(btn);}finally{if(ctx)setTimeout(()=>{current.history=ctx.base;},100);}
  },true);
  window.runMagicWand=runNewWand;window.__ASTA_BACCHETTA_V8=true;return true;
}
if(!install()){let n=0;const timer=setInterval(function(){if(install()||++n>50)clearInterval(timer);},50);}
})();
