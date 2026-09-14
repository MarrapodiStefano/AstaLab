/* Brain bet fix 3.5.97 — le 🎲 Scommesse devono sempre cercare un nome low-cost */
(function(){
'use strict';
const VERSION='3.5.97';
function state(){try{return(typeof current!=='undefined'&&current)||JSON.parse(localStorage.getItem('AF_CURRENT')||'null')}catch(e){return null}}
function players(){try{return typeof window.allPlayers==='function'?window.allPlayers():[]}catch(e){return[]}}
function strategy(s){return(s?.brainStrategies||[]).find(x=>Number(x.id)===Number(s.activeBrainStrategyId))||null}
function mine(s){return(s?.teams||[]).find(t=>Number(t.id)===Number(s.myTeamId))||(s?.teams||[])[0]||null}
function sold(s){const z=new Set();(s?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>z.add(String(p.id))));return z}
function credits(p){const n=Number(p?.credits);return Number.isFinite(n)&&n>0?Math.round(n):null}
function appeal(p){return Number(p?.appeal)||0}
function roleBudget(s,st,r){const a=st?.baseAllocation||st?.allocation||{};return Math.round((Number(s?.initialCredits)||1200)*(Number(a[r])||0)/100)}
function populateBets(){const s=state(),st=strategy(s);if(!s||!st)return false;const list=players(),soldSet=sold(s),used=new Set((mine(s)?.players||[]).map(p=>String(p.id)));Object.values(st.slotTargets||{}).flat().forEach(t=>{if(t?.playerId!=null)used.add(String(t.playerId))});st.slotTargets=st.slotTargets&&typeof st.slotTargets==='object'?st.slotTargets:{};st.slotBudgets=st.slotBudgets&&typeof st.slotBudgets==='object'?st.slotBudgets:{};let changed=false;for(const r of ['P','D','C','A']){const targets=st.slotTargets[r]||[],budgets=st.slotBudgets[r]||[],cap=Math.max(30,Math.round(roleBudget(s,st,r)*.10));for(let i=0;i<targets.length;i++){const t=targets[i];if(!t||t.priority!=='bet'||t.playerId!=null)continue;const candidates=list.filter(p=>String(p.role||'').toUpperCase()===r&&!soldSet.has(String(p.id))&&!used.has(String(p.id))).map(p=>({p,c:credits(p)})).filter(x=>x.c!=null&&x.c<=cap);if(!candidates.length)continue;candidates.sort((a,b)=>{const av=appeal(a.p)/Math.max(1,a.c),bv=appeal(b.p)/Math.max(1,b.c);return bv-av||appeal(b.p)-appeal(a.p)||a.c-b.c});const pick=candidates[0];t.playerId=pick.p.id;budgets[i]=pick.c;used.add(String(pick.p.id));changed=true}}if(changed){try{if(typeof window.persist==='function')window.persist();else localStorage.setItem('AF_CURRENT',JSON.stringify(s))}catch(e){}}return changed}
function install(){if(!window.BrainEngine?.fill||window.BrainEngine.fill.__betFix397)return false;const old=window.BrainEngine.fill;const wrapped=function(){populateBets();return old.apply(this,arguments)};wrapped.__betFix397=true;window.BrainEngine.fill=wrapped;window.BrainEngine.populateBets=populateBets;return true}
function setVersion(){const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION}
function boot(){setVersion();if(install())return;setTimeout(boot,100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.BrainBetFix={version:VERSION,populateBets};
})();
