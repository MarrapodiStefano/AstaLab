/* ORACOLO 1.0.9 — motore Smart 3.5.20 */
(function(){
'use strict';
const VERSION='3.5.20';
let busy=false,observer=null,renderWrapped=false;
const ROLES=['P','D','C','A'];
function state(){try{return JSON.parse(localStorage.getItem('AF_CURRENT')||'null')}catch(e){return null}}
function players(){try{return typeof window.allPlayers==='function'?window.allPlayers():[]}catch(e){return []}}
function myTeam(s){return (s?.teams||[]).find(t=>Number(t.id)===Number(s.myTeamId))||(s?.teams||[])[0]||null}
function soldSet(s){const x=new Set();(s?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>x.add(String(p.id))));return x}
function strategy(s){return (s?.brainStrategies||[]).find(x=>Number(x.id)===Number(s.activeBrainStrategyId))||null}
function slotCount(st,r){try{if(typeof window.brainStrategySlots==='function')return Number(window.brainStrategySlots(st)?.[r]||0)}catch(e){}return Number(st?.slots?.[r]||0)}
function empty(v){return v==null||v===''||Number(v)===0||String(v).toLowerCase()==='null'||String(v).toLowerCase()==='undefined'}
function priorityOf(s,id){try{if(typeof window.objectivePriority==='function')return window.objectivePriority(id)||'base'}catch(e){}return s?.objectivePriorities?.[id]||'base'}
function slotTargets(st,r){const n=slotCount(st,r);if(!st.slotTargets)st.slotTargets={};let a=Array.isArray(st.slotTargets[r])?st.slotTargets[r].slice(0,n):[];while(a.length<n)a.push({priority:'base',playerId:null});st.slotTargets[r]=a.map(t=>({priority:t?.priority||'base',playerId:empty(t?.playerId)?null:t.playerId}));return st.slotTargets[r]}
function slotPcts(st,r){try{if(typeof window.brainStrategySlotAllocation==='function'){const a=window.brainStrategySlotAllocation(st,r);if(Array.isArray(a))return a.slice(0,slotCount(st,r))}}catch(e){}const n=slotCount(st,r),a=Array.isArray(st?.slotAllocation?.[r])?st.slotAllocation[r].slice(0,n):[];while(a.length<n)a.push(0);return a}
function slotBudget(st,r,i,planned,pcts){const stored=Array.isArray(st?.slotBudgets?.[r])?Number(st.slotBudgets[r][i]):NaN;if(Number.isFinite(stored)&&stored>0)return stored;return Math.round(planned*(Number(pcts[i])||0)/100)}
function stats(id){try{const d=JSON.parse(localStorage.getItem('AF_ORACOLO_STATS')||'{}'),v=d[String(id)];return Array.isArray(v)?{pres:v[0],fm:v[2],goals:v[3],assists:v[4],yellow:v[5],red:v[6],pmv:v[9]}:(v||{})}catch(e){return {}}}
function score(p,s,r,cap,priority){const price=Math.max(0,Number(p.credits)||0);if(price>cap)return -Infinity;const q=stats(p.id),my=myTeam(s),owned=(my?.players||[]).filter(x=>x.role===r);const same=owned.filter(x=>String(x.realTeam||x.team||'').toLowerCase()===String(p.team||'').toLowerCase()).length;let v=(Number(p.appeal)||0)*18+Math.min(Number(q.pres)||0,38)*.9+(Number(q.goals)||0)*2.8+(Number(q.assists)||0)*2.6+(Number(q.fm)||0)*4.5+(Number(q.pmv)||Number(p.pmv)||0)*.05-same*9;if(!same)v+=5;try{if(typeof window.objectivePriority==='function'&&window.objectivePriority(p.id)===priority)v+=20}catch(e){}return v}
function pool(s,r,used,priority){const sold=soldSet(s),obj=Array.isArray(s?.objectives)?s.objectives:[],all=players().filter(p=>p.role===r&&!sold.has(String(p.id))&&!used.has(String(p.id)));
  const exact=all.filter(p=>obj.includes(p.id)&&priorityOf(s,p.id)===priority);
  if(exact.length)return exact;
  const objective=all.filter(p=>obj.includes(p.id));
  if(objective.length)return objective;
  return all;
}
function choose(s,st,r,i,used,slotCap,roleCap){const t=slotTargets(st,r)[i]||{priority:'base'},wanted=t.priority||'base';let list=pool(s,r,used,wanted),best=list.map(p=>({p,v:score(p,s,r,slotCap,wanted)})).filter(x=>Number.isFinite(x.v)).sort((a,b)=>b.v-a.v)[0]?.p||null;if(best)return best;list=pool(s,r,used,wanted);return list.map(p=>({p,v:score(p,s,r,roleCap,wanted)})).filter(x=>Number.isFinite(x.v)).sort((a,b)=>b.v-a.v)[0]?.p||null}
function write(st,r,i,p){if(!st.slotTargets)st.slotTargets={};if(!Array.isArray(st.slotTargets[r]))st.slotTargets[r]=[];while(st.slotTargets[r].length<=i)st.slotTargets[r].push({priority:'base',playerId:null});st.slotTargets[r][i].playerId=p.id}
function persist(s){localStorage.setItem('AF_CURRENT',JSON.stringify(s));try{const db=JSON.parse(localStorage.getItem('AF_DB')||'[]'),i=db.findIndex(x=>Number(x.id)===Number(s.id));if(i>=0){db[i]=s;localStorage.setItem('AF_DB',JSON.stringify(db))}}catch(e){}}
function fill(){if(busy)return;const s=state(),st=strategy(s);if(!s||!st)return;busy=true;const sold=soldSet(s),mine=myTeam(s),used=new Set((mine?.players||[]).map(p=>String(p.id)));let changed=0;
  ROLES.forEach(r=>{const ts=slotTargets(st,r),pcts=slotPcts(st,r),planned=Math.round((Number(s.initialCredits)||1200)*(Number(st.allocation?.[r])||0)/100);let roleSpent=0;ts.forEach(t=>{if(!empty(t.playerId)){const p=players().find(x=>String(x.id)===String(t.playerId));if(p){used.add(String(p.id));roleSpent+=Number(p.credits)||0}}});
    ts.forEach((t,i)=>{if(!empty(t.playerId))return;const roleRemaining=Math.max(0,planned-roleSpent);if(roleRemaining<=0)return;const cap=Math.min(roleRemaining,Math.max(0,slotBudget(st,r,i,planned,pcts))||roleRemaining);const p=choose(s,st,r,i,used,cap,roleRemaining);if(!p)return;const price=Number(p.credits)||0;if(price>roleRemaining)return;write(st,r,i,p);used.add(String(p.id));roleSpent+=price;changed++})
  });
  persist(s);setTimeout(()=>{busy=false;if(changed){sessionStorage.setItem('AF_ORACOLO_RETURN','brain');window.location.reload()}else alert('Oracolo non ha trovato giocatori compatibili con la strategia e il budget disponibile. Prova ad aumentare il budget di uno slot o a renderne meno stringente l’appetibilità.')},150)
}
function addButton(){document.querySelectorAll('.brain-strategy.active').forEach(card=>{if(card.querySelector('.oracolo-action'))return;const total=card.querySelector('.brain-total');if(!total)return;const wrap=document.createElement('div');wrap.className='oracolo-action';const b=document.createElement('button');b.type='button';b.className='oracolo-button';b.innerHTML='<span class="oracolo-icon">🔮</span><span>Oracolo</span>';b.title='Consigli Smart per gli slot vuoti';b.onclick=e=>{e.preventDefault();e.stopPropagation();fill()};wrap.appendChild(b);total.insertAdjacentElement('afterend',wrap)})}
function style(){if(document.getElementById('oracoloStyle'))return;const c=document.createElement('style');c.id='oracoloStyle';c.textContent='.oracolo-action{width:100%;margin:8px 0 10px;display:flex}.oracolo-button{width:100%;height:38px;padding:0 12px;border:1px solid rgba(93,63,145,.28);border-radius:11px;background:linear-gradient(135deg,#fff,#f2edff);color:#5b3b8f;font-weight:850;font-size:14px;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 2px 7px rgba(75,45,120,.12)}.oracolo-button:active{transform:scale(.98)}.oracolo-icon{font-size:19px;line-height:1}';document.head.appendChild(c)}
function watch(){if(observer||!document.body)return;observer=new MutationObserver(addButton);observer.observe(document.getElementById('brainContent')||document.body,{childList:true,subtree:true});addButton()}
function boot(){style();if(renderWrapped)return;const old=window.renderBrain;if(typeof old==='function'){window.renderBrain=function(){const x=old.apply(this,arguments);setTimeout(addButton,0);return x};renderWrapped=true;window.renderBrain();watch()}else setTimeout(boot,100)}
window.Oracolo={version:VERSION,run:fill};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
