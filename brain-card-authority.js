/* Brain card authority 3.5.101 — collega il nome visualizzato alla scheda PLAYERS */
(function(){
'use strict';
const VERSION='3.5.101',ROLES=['P','D','C','A'];
function state(){try{return(typeof current!=='undefined'&&current)||JSON.parse(localStorage.getItem('AF_CURRENT')||'null')}catch(e){return null}}
function players(){try{return typeof window.allPlayers==='function'?window.allPlayers():[]}catch(e){return[]}}
function strategy(s){return(s?.brainStrategies||[]).find(x=>Number(x.id)===Number(s.activeBrainStrategyId))||null}
function mine(s){return(s?.teams||[]).find(t=>Number(t.id)===Number(s.myTeamId))||(s?.teams||[])[0]||null}
function allocation(st,r){const a=st?.baseAllocation&&typeof st.baseAllocation==='object'?st.baseAllocation:(st?.allocation||{});return Math.max(0,Number(a[r])||0)}
function roleBudget(s,st,r){return Math.max(0,Math.round((Number(s?.initialCredits)||1200)*allocation(st,r)/100))}
function credits(p){const c=Number(p?.credits);return Number.isFinite(c)&&c>=0?Math.round(c):null}
function findByName(name,r){const n=String(name||'').trim().toLowerCase();if(!n||n==='scegli giocatore')return null;return players().find(p=>String(p.name||'').trim().toLowerCase()===n&&String(p.role||'').toUpperCase()===r)||null}
function sync(){const s=state(),st=strategy(s);if(!s||!st)return false;let changed=false;ROLES.forEach(r=>{const row=document.querySelector('#brainContent .brain-role-row.role-'+r);if(!row)return;const slots=[...row.querySelectorAll('.brain-slot')];if(!Array.isArray(st.slotTargets?.[r]))return;const plan=roleBudget(s,st,r);slots.forEach((slot,i)=>{const el=slot.querySelector('.brain-slot-player');if(!el)return;const p=findByName(el.textContent,r);if(!p)return;st.slotTargets[r][i]=st.slotTargets[r][i]||{priority:'base',playerId:null};if(String(st.slotTargets[r][i].playerId||'')!==String(p.id)){st.slotTargets[r][i].playerId=p.id;changed=true}const c=credits(p);if(c==null)return;st.slotBudgets=st.slotBudgets&&typeof st.slotBudgets==='object'?st.slotBudgets:{};st.slotBudgets[r]=Array.isArray(st.slotBudgets[r])?st.slotBudgets[r]:[];while(st.slotBudgets[r].length<=i)st.slotBudgets[r].push(0);if(Number(st.slotBudgets[r][i])!==c){st.slotBudgets[r][i]=c;changed=true}st.slotAllocation=st.slotAllocation&&typeof st.slotAllocation==='object'?st.slotAllocation:{};st.slotAllocation[r]=Array.isArray(st.slotAllocation[r])?st.slotAllocation[r]:[];while(st.slotAllocation[r].length<=i)st.slotAllocation[r].push(0);const pct=plan>0?c/plan*100:0;if(Math.abs(Number(st.slotAllocation[r][i]||0)-pct)>0.0000001){st.slotAllocation[r][i]=pct;changed=true}const b=slot.querySelector('.brain-slot-budget');const pi=slot.querySelector('.brain-slot-percent input');if(b)b.textContent=String(c);if(pi)pi.value=String(plan>0?Math.round(pct):0)});});if(changed&&typeof window.persist==='function')window.persist();return changed}
function boot(){sync();setInterval(sync,250);const old=window.renderBrain;if(typeof old==='function'&&!old.__brainCardAuthority3101){const wrapped=function(){const out=old.apply(this,arguments);setTimeout(sync,0);return out};wrapped.__brainCardAuthority3101=true;window.renderBrain=wrapped}}
const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.BrainCardAuthority={version:VERSION,sync};
})();
