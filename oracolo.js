/* ORACOLO 1.0.8 — motore Smart isolato dal Brain */
(function(){
'use strict';
const VERSION='3.5.19';
let busy=false,renderWrapped=false,observer=null;
const ROLES=['P','D','C','A'];

function state(){
  try{return JSON.parse(localStorage.getItem('AF_CURRENT')||'null')}catch(e){return null}
}
function players(){
  try{return typeof window.allPlayers==='function' ? window.allPlayers() : []}catch(e){return []}
}
function myTeam(s){
  return (s?.teams||[]).find(t=>Number(t.id)===Number(s.myTeamId??0))||(s?.teams||[])[0]||null
}
function soldMap(s){
  const m=new Map();
  (s?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>m.set(String(p.id),t.id)));
  return m
}
function strategy(s){
  const direct=(s?.brainStrategies||[]).find(x=>Number(x.id)===Number(s.activeBrainStrategyId));
  if(direct)return direct;
  const card=document.querySelector('.brain-strategy.active');
  const title=card?.querySelector('.brain-strategy-name');
  const m=String(title?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
  return m?(s?.brainStrategies||[]).find(x=>Number(x.id)===Number(m[1]))||null:null
}
function slotCount(st,r){
  if(typeof window.brainStrategySlots==='function'){
    try{return Number(window.brainStrategySlots(st)?.[r]||0)}catch(e){}
  }
  return Number(st?.slots?.[r]||0)
}
function isEmptyPlayerId(v){
  return v==null||v===''||Number(v)===0||String(v).toLowerCase()==='undefined'||String(v).toLowerCase()==='null'
}
function objectivePriorityFor(s,id){
  return s?.objectivePriorities?.[id] || 'base'
}
function eligibleTarget(s,r,target,pool,sold){
  const id=target?.playerId;
  if(isEmptyPlayerId(id)||sold.has(String(id)))return null;
  const p=pool.find(x=>String(x.id)===String(id));
  if(!p||p.role!==r)return null;
  const priority=target?.priority||'base';
  const objectives=Array.isArray(s?.objectives)?s.objectives:[];
  if(!objectives.includes(p.id))return null;
  if(objectivePriorityFor(s,p.id)!==priority)return null;
  return p
}
function targets(st,r,s,pool,sold){
  const n=slotCount(st,r);
  let a=Array.isArray(st?.slotTargets?.[r])?st.slotTargets[r].slice():[];
  while(a.length<n)a.push({priority:'base',playerId:null});
  a=a.slice(0,n).map(t=>{
    const priority=t?.priority||'base';
    const p=eligibleTarget(s,r,{priority,playerId:t?.playerId},pool,sold);
    return {priority,playerId:p?p.id:null};
  });
  if(!st.slotTargets)st.slotTargets={};
  st.slotTargets[r]=a;
  return a
}
function pcts(st,r){
  if(typeof window.brainStrategySlotAllocation==='function'){
    try{
      const a=window.brainStrategySlotAllocation(st,r);
      if(Array.isArray(a))return a.slice(0,slotCount(st,r))
    }catch(e){}
  }
  const a=Array.isArray(st?.slotAllocation?.[r])?st.slotAllocation[r].slice():[];
  const n=slotCount(st,r);
  while(a.length<n)a.push(0);
  return a.slice(0,n)
}
function stats(id){
  try{
    const db=JSON.parse(localStorage.getItem('AF_ORACOLO_STATS')||'{}'),v=db[String(id)];
    return Array.isArray(v)?{pres:v[0],fm:v[2],goals:v[3],assists:v[4],yellow:v[5],red:v[6],pmv:v[9]}:(v||{})
  }catch(e){return {}}
}
function candidatePool(s,r,used,priority){
  const sold=soldMap(s),wanted=priority||'base';
  if(typeof window.brainSlotPlayers==='function'){
    try{
      return window.brainSlotPlayers(r,wanted).filter(p=>!sold.has(String(p.id))&&!used.has(String(p.id)));
    }catch(e){}
  }
  const objectives=Array.isArray(s?.objectives)?s.objectives:[];
  return players().filter(p=>{
    if(p.role!==r||sold.has(String(p.id))||used.has(String(p.id)))return false;
    if(!objectives.includes(p.id))return false;
    return objectivePriorityFor(s,p.id)===wanted;
  })
}
function score(p,s,r,maxBudget,priority){
  const price=Math.max(0,Number(p.credits)||0);
  if(price>maxBudget)return -Infinity;
  const st=stats(p.id),my=myTeam(s);
  const owned=(my?.players||[]).filter(x=>x.role===r);
  const same=owned.filter(x=>String(x.realTeam||x.team||'').toLowerCase()===String(p.team||'').toLowerCase()).length;
  let v=(Number(p.appeal)||0)*18+
    Math.min(Number(st.pres)||0,38)*.9+
    (Number(st.goals)||0)*2.8+
    (Number(st.assists)||0)*2.6+
    (Number(st.fm)||0)*4.5+
    (Number(st.pmv)||Number(p.pmv)||0)*.05;
  v-=(Number(st.yellow)||0)*.35+(Number(st.red)||0)*1.5+same*9;
  if(!same)v+=5;
  if(typeof window.objectivePriority==='function'){
    try{if(window.objectivePriority(p.id)===priority)v+=20}catch(e){}
  }
  return v
}
function slotBudget(st,r,i,planned,ps,budgets){
  const stored=Array.isArray(budgets)?Number(budgets[i]):NaN;
  if(Number.isFinite(stored)&&stored>0)return stored;
  return Math.round(planned*(Number(ps[i])||0)/100)
}
function choose(s,st,r,i,used,maxBudget,roleBudget){
  const priority=(Array.isArray(st?.slotTargets?.[r])?st.slotTargets[r][i]?.priority:'base')||'base';
  const pool=candidatePool(s,r,used,priority);
  let best=pool.map(p=>({p,v:score(p,s,r,maxBudget,priority)})).filter(x=>Number.isFinite(x.v)).sort((a,b)=>b.v-a.v)[0]?.p||null;
  if(best)return best;
  best=pool.map(p=>({p,v:score(p,s,r,roleBudget,priority)})).filter(x=>Number.isFinite(x.v)).sort((a,b)=>b.v-a.v)[0]?.p||null;
  return best
}
function writeState(st,r,i,p,budget){
  if(!st.slotTargets)st.slotTargets={};
  if(!Array.isArray(st.slotTargets[r]))st.slotTargets[r]=[];
  while(st.slotTargets[r].length<=i)st.slotTargets[r].push({priority:'base',playerId:null});
  st.slotTargets[r][i].playerId=p.id;
  if(!st.slotBudgets)st.slotBudgets={};
  if(!Array.isArray(st.slotBudgets[r]))st.slotBudgets[r]=[];
  st.slotBudgets[r][i]=Math.round(Number(budget)||Number(p.credits)||0)
}
function setBudgetInput(r,i,v){
  const row=document.querySelector('.brain-role-row.role-'+r),slot=row?.querySelectorAll('.brain-slot')[i],input=slot?.querySelector('.brain-slot-budget-input');
  if(input){input.value=String(Math.round(v));input.dispatchEvent(new Event('change',{bubbles:true}))}
}
function persistState(s){
  localStorage.setItem('AF_CURRENT',JSON.stringify(s));
  try{
    const db=JSON.parse(localStorage.getItem('AF_DB')||'[]'),i=db.findIndex(x=>Number(x.id)===Number(s.id));
    if(i>=0){db[i]=s;localStorage.setItem('AF_DB',JSON.stringify(db))}
  }catch(e){}
}
function fillStrategy(){
  if(busy)return;
  const s=state(),st=strategy(s);
  if(!s||!st)return;
  const pool=players(),sold=soldMap(s);
  window.__AF_STATE=s;
  busy=true;
  const used=new Set(),mine=myTeam(s);
  (mine?.players||[]).forEach(p=>used.add(String(p.id)));
  let changed=0;

  ROLES.forEach(r=>{
    const ts=targets(st,r,s,pool,sold),ps=pcts(st,r);
    const planned=Math.round((Number(s.initialCredits)||1200)*(Number(st.allocation?.[r])||0)/100);
    const budgets=Array.isArray(st.slotBudgets?.[r])?st.slotBudgets[r]:[];
    let roleSpent=0;

    ts.forEach(t=>{
      if(isEmptyPlayerId(t.playerId))return;
      used.add(String(t.playerId));
      const existing=pool.find(p=>String(p.id)===String(t.playerId));
      if(existing)roleSpent+=Number(existing.credits)||0;
    });

    ts.forEach((t,i)=>{
      if(!isEmptyPlayerId(t.playerId))return;
      const roleRemaining=Math.max(0,planned-roleSpent);
      if(roleRemaining<=0)return;
      const cap=Math.min(roleRemaining,Math.max(0,slotBudget(st,r,i,planned,ps,budgets))||roleRemaining);
      const p=choose(s,st,r,i,used,cap,roleRemaining);
      if(!p)return;
      const price=Number(p.credits)||0;
      if(price>roleRemaining)return;
      writeState(st,r,i,p,price);
      used.add(String(p.id));
      roleSpent+=price;
      changed++;
      setBudgetInput(r,i,price);
    });
  });

  persistState(s);
  setTimeout(()=>{
    busy=false;
    if(changed){
      sessionStorage.setItem('AF_ORACOLO_RETURN','brain');
      window.location.reload();
    }else{
      alert('Oracolo non ha trovato un giocatore compatibile: nessun obiettivo disponibile del ruolo rientra nel budget della strategia.');
    }
  },250)
}
function addButton(){
  document.querySelectorAll('.brain-strategy.active').forEach(card=>{
    if(card.querySelector('.oracolo-action'))return;
    const total=card.querySelector('.brain-total');
    if(!total)return;
    const wrap=document.createElement('div');
    wrap.className='oracolo-action';
    const b=document.createElement('button');
    b.type='button';b.className='oracolo-button';
    b.innerHTML='<span class="oracolo-icon">🔮</span><span>Oracolo</span>';
    b.title='Consigli Smart per gli slot vuoti';
    b.onclick=e=>{e.preventDefault();e.stopPropagation();fillStrategy()};
    wrap.appendChild(b);total.insertAdjacentElement('afterend',wrap)
  })
}
function style(){
  if(document.getElementById('oracoloStyle'))return;
  const c=document.createElement('style');c.id='oracoloStyle';
  c.textContent='.oracolo-action{width:100%;margin:8px 0 10px;display:flex}.oracolo-button{width:100%;height:38px;padding:0 12px;border:1px solid rgba(93,63,145,.28);border-radius:11px;background:linear-gradient(135deg,#fff,#f2edff);color:#5b3b8f;font-weight:850;font-size:14px;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 2px 7px rgba(75,45,120,.12)}.oracolo-button:active{transform:scale(.98)}.oracolo-icon{font-size:19px;line-height:1}';
  document.head.appendChild(c)
}
function watchBrain(){
  if(observer||!document.body)return;
  const target=document.getElementById('brainContent')||document.body;
  observer=new MutationObserver(()=>addButton());
  observer.observe(target,{childList:true,subtree:true});
  addButton()
}
function boot(){
  style();
  if(renderWrapped)return;
  const old=window.renderBrain;
  if(typeof old==='function'){
    window.renderBrain=function(){const x=old.apply(this,arguments);setTimeout(addButton,0);return x};
    renderWrapped=true;
    window.renderBrain();
    watchBrain()
  }else setTimeout(boot,100)
}
window.Oracolo={version:VERSION,run:fillStrategy};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
(function(){
  function sync(e){
    const b=e.target?.closest?.('.oracolo-button');
    if(!b)return;
    const card=b.closest('.brain-strategy'),title=card?.querySelector('.brain-strategy-name'),m=String(title?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);
    if(!m)return;
    try{
      const s=JSON.parse(localStorage.getItem('AF_CURRENT')||'null');
      if(s){s.activeBrainStrategyId=Number(m[1]);localStorage.setItem('AF_CURRENT',JSON.stringify(s));window.__AF_STATE=s}
    }catch(x){}
  }
  document.addEventListener('click',sync,true)
})();