/* Asta Fantacalcio — Bacchetta definitiva v3.4.54
   Unico motore per il popolamento degli slot Brain.
   - ricalcola gli slot non acquistati da zero
   - rispetta esattamente l'appetibilità dello slot
   - usa credits come massimale personale
   - usa lo storico dei prezzi per stimare il mercato e ordinare i candidati
   - massimizza prima il numero di slot riempiti, poi la priorità/qualità
   - non supera mai il budget del ruolo
*/
(function(){
'use strict';
const VERSION='3.4.54';
const PRIORITY_RANK={max:5,high:4,base:3,low:2,bet:1};
function all(){return typeof allPlayers==='function'?allPlayers():[]}
function activeStrategy(){return typeof activeBrainStrategy==='function'?activeBrainStrategy():current?.brainStrategies?.find(s=>s.id===current?.activeBrainStrategyId)}
function roleLimits(){const s=activeStrategy();return s&&typeof brainStrategySlots==='function'?brainStrategySlots(s):{P:2,D:9,C:9,A:7}}
function hasObjective(id){const list=current?.objectives;if(!Array.isArray(list))return false;return list.some(x=>String(x)===String(id))}
function priorityOf(p){try{return typeof objectivePriority==='function'?objectivePriority(p.id):'low'}catch(e){return 'low'}}
function targetsFor(s,r){return typeof brainSlotTargets==='function'?brainSlotTargets(s,r):(s.slotTargets?.[r]||[])}
function refPrice(p){const pmv=Number(p?.pmv);if(Number.isFinite(pmv)&&pmv>0)return pmv;const c=Number(p?.credits);return Number.isFinite(c)&&c>0?c:1}
function maxBid(p){const c=Number(p?.credits);return Number.isFinite(c)&&c>0?Math.round(c):1}
function median(a){if(!a.length)return 1;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2}
function marketMultiplier(p){const rows=[],near=[],ps=all(),byId=new Map(ps.map(x=>[String(x.id),x]));(Array.isArray(current?.history)?current.history:[]).forEach(h=>{if(h?.role!==p?.role||!(Number(h?.price)>0))return;const ref=byId.get(String(h.playerId));if(!ref)return;const base=refPrice(ref),ratio=Number(h.price)/base;if(!Number.isFinite(ratio)||ratio<=0)return;rows.push(ratio);if(Math.abs((Number(ref.appeal)||0)-(Number(p.appeal)||0))<=1.25)near.push(ratio)});const rm=median(rows),nm=median(near),q=near.length>=3?.7:near.length?.35:0;return Math.max(.55,Math.min(1.6,rm*(1-q)+nm*q))}
function marketEstimate(p){return Math.max(1,Math.round(refPrice(p)*marketMultiplier(p)))}
function quality(p){const appeal=Math.max(0,Math.min(10,Number(p?.appeal)||0));let hist=null;try{hist=window.ASTA_HISTORICAL?.profile?.(p)||null}catch(e){}const hs=hist?.found&&hist.pv>0?Number(hist.historicalScore)||0:null;let q=hs==null?appeal:appeal*.6+hs*.4;const pri=priorityOf(p);if(pri==='max')q+=.8;else if(pri==='high')q+=.5;else if(pri==='base')q+=.25;return q}
function candidates(r,priority,sold){return all().filter(p=>p?.role===r&&hasObjective(p.id)&&priorityOf(p)===priority&&!sold.has(String(p.id))).map(p=>({p,cost:maxBid(p),market:marketEstimate(p),quality:quality(p)})).sort((a,b)=>b.quality-a.quality||a.market-b.market||a.cost-b.cost||String(a.p.name||'').localeCompare(String(b.p.name||''),'it')).slice(0,80)}
function slotValue(c,priority,budget){const rank=PRIORITY_RANK[priority]||1;const marketGap=(c.cost-Math.max(1,c.market))/Math.max(1,c.cost);const fit=Math.abs(c.cost-Math.min(c.cost,budget))/Math.max(1,budget);return rank*1000+c.quality*10-marketGap*8-fit*.25-c.cost*.002}
function solveRole(r,slotDefs,budget){
  const sold=soldIds(),ordered=[...slotDefs].sort((a,b)=>(PRIORITY_RANK[b.priority]||1)-(PRIORITY_RANK[a.priority]||1)||a.index-b.index),groups=ordered.map(d=>candidates(r,d.priority,sold));
  let beam=[{chosen:[],used:new Set(),cost:0,filled:0,value:0}],WIDTH=220;
  for(let i=0;i<groups.length;i++){
    const next=[],slot=ordered[i];
    for(const state of beam){
      next.push(state);
      for(const c of groups[i]){
        const id=String(c.p.id);if(state.used.has(id)||c.cost>budget-state.cost)continue;
        const used=new Set(state.used);used.add(id);next.push({chosen:state.chosen.concat({...c,slot}),used,cost:state.cost+c.cost,filled:state.filled+1,value:state.value+slotValue(c,slot.priority,budget)})
      }
    }
    next.sort((a,b)=>b.filled-a.filled||b.value-a.value||a.cost-b.cost);beam=next.slice(0,WIDTH)
  }
  const best=beam[0]||{chosen:[],used:new Set(),cost:0,filled:0,value:0};return{ok:true,chosen:best.chosen,cost:best.cost,budget,filled:best.filled,total:ordered.length}
}
function roleState(s,r){const initial=Number(current?.initialCredits)||0,alloc=s?.allocation||{},team=typeof brainMyTeam==='function'?brainMyTeam():current?.teams?.[0],spent=Number((team?.players||[]).filter(p=>p.role===r).reduce((n,p)=>n+(Number(p.price)||0),0)),bought=(team?.players||[]).filter(p=>p.role===r),total=Number(roleLimits()[r]||0),targets=targetsFor(s,r),plannedTotal=Math.max(1,initial*(Number(alloc[r])||0)/100),budget=Math.max(0,Math.round(plannedTotal-spent));return{initial,plannedTotal,spent,bought,total,targets,budget}}
function buildPlan(s){const plan={roles:{},errors:[]};['P','D','C','A'].forEach(r=>{const st=roleState(s,r),defs=[];for(let i=st.bought.length;i<st.total;i++)defs.push({index:i,priority:st.targets[i]?.priority||'base'});const solved=solveRole(r,defs,st.budget);plan.roles[r]={...st,defs,solved};if(solved.filled<solved.total)plan.errors.push(r+': riempiti '+solved.filled+'/'+solved.total+' slot compatibili con budget e appetibilità');});return plan}
function applyPlan(s,plan){if(!s.slotTargets||typeof s.slotTargets!=='object')s.slotTargets={};if(!s.slotAllocation||typeof s.slotAllocation!=='object')s.slotAllocation={};['P','D','C','A'].forEach(r=>{const x=plan.roles[r],n=x.total,old=Array.isArray(s.slotTargets[r])?s.slotTargets[r]:[],next=Array.from({length:n},(_,i)=>({priority:old[i]?.priority||'base',playerId:null})),pcts=Array.from({length:n},()=>0);for(let i=0;i<x.bought.length;i++){const p=x.bought[i],bid=Math.max(1,Number(p.price)||0);next[i]={priority:old[i]?.priority||priorityOf(p),playerId:p.id};pcts[i]=Math.round(bid/x.plannedTotal*1000)/10}(x.solved?.chosen||[]).forEach(c=>{const bid=Math.max(1,Number(c.cost)||maxBid(c.p));next[c.slot.index]={priority:c.slot.priority,playerId:c.p.id};pcts[c.slot.index]=Math.round(bid/x.plannedTotal*1000)/10});s.slotTargets[r]=next;s.slotAllocation[r]=pcts});if(typeof persist==='function')persist();if(typeof renderBrain==='function')renderBrain()}
function syncTargetAllocations(s){if(!s)return;['P','D','C','A'].forEach(r=>{const st=roleState(s,r),targets=Array.isArray(s.slotTargets?.[r])?s.slotTargets[r]:[],arr=Array.isArray(s.slotAllocation?.[r])?s.slotAllocation[r].slice():[];targets.forEach((t,i)=>{if(t?.playerId==null){arr[i]=0;return}const p=all().find(x=>String(x.id)===String(t.playerId));if(!p){arr[i]=0;return}let bid=maxBid(p);for(const team of current?.teams||[]){const bought=(team.players||[]).find(x=>String(x.id)===String(p.id));if(bought){bid=Math.max(1,Number(bought.price)||0);break}}arr[i]=Math.round(bid/st.plannedTotal*1000)/10});s.slotAllocation[r]=arr})}
function runNewWand(btn){if(!current){alert('Apri prima un’asta.');return}const s=activeStrategy();if(!s){alert('Nessuna strategia attiva.');return}if(btn){btn.disabled=true;btn.classList.add('magic-wand-running');btn.setAttribute('aria-busy','true')}try{syncMarket();const plan=buildPlan(s);applyPlan(s,plan);console.info('Bacchetta v3.4.54: ricalcolo completato.',plan)}catch(e){console.error('Bacchetta v3.4.54',e);alert('Errore Bacchetta Magica: '+(e?.message||e))}finally{if(btn){btn.disabled=false;btn.classList.remove('magic-wand-running');btn.setAttribute('aria-busy','false')}}}
function syncMarket(){if(!current||!Array.isArray(current.teams))return;const base=Array.isArray(current.history)?current.history:[],existing=new Set(base.map(h=>String(h?.playerId??'')+'|'+String(h?.price??''))),extra=[];current.teams.forEach(t=>(t.players||[]).forEach(p=>{const price=Number(p?.price);if(!(price>0)||p?.id==null)return;const key=String(p.id)+'|'+String(price);if(existing.has(key))return;extra.push({playerId:p.id,price,role:p.role,team:t.name,teamId:t.id,source:'team-sync'})}));current.history=base.concat(extra);return{base,extra}}
function install(){const version=document.querySelector('.app-version');if(version)version.textContent='V. '+VERSION;if(window.__ASTA_BACCHETTA_V12)return true;document.addEventListener('click',function(e){const btn=e.target?.closest?.('.magic-wand-btn');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();const ctx=syncMarket(),originalPersist=typeof persist==='function'?persist:null;if(ctx&&originalPersist){persist=function(){const h=current.history;current.history=ctx.base;try{return originalPersist.apply(this,arguments)}finally{current.history=h}}}try{runNewWand(btn)}finally{if(originalPersist)persist=originalPersist;if(ctx)setTimeout(()=>{current.history=ctx.base},100)}},true);window.runMagicWand=runNewWand;if(typeof window.renderBrain==='function'&&!window.renderBrain.__marketSyncV12Wrapped){const original=window.renderBrain;window.renderBrain=function(){const s=activeStrategy();if(s)syncTargetAllocations(s);return original.apply(this,arguments)};window.renderBrain.__marketSyncV12Wrapped=true}window.__ASTA_BACCHETTA_V12=true;return true}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
