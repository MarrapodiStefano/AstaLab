/* Brain sync 3.5.30 — mantiene slot, appetibilità e budget coerenti con gli acquisti */
(function(){
'use strict';
const VERSION='3.5.30';
let syncing=false,wrapped=false;
const ROLES=['P','D','C','A'];
function read(){try{return JSON.parse(localStorage.getItem('AF_CURRENT')||'null')}catch(e){return null}}
function save(s){localStorage.setItem('AF_CURRENT',JSON.stringify(s));try{const db=JSON.parse(localStorage.getItem('AF_DB')||'[]'),i=db.findIndex(x=>Number(x.id)===Number(s.id));if(i>=0){db[i]=s;localStorage.setItem('AF_DB',JSON.stringify(db))}}catch(e){}}
function players(){try{return typeof window.allPlayers==='function'?window.allPlayers():[]}catch(e){return []}}
function sold(s){const set=new Set();(s?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>set.add(String(p.id))));return set}
function priority(s,id){const v=s?.objectivePriorities?.[id]??s?.objectivePriorities?.[String(id)];return ['max','high','low','bet','base'].includes(v)?v:'base'}
function planned(s,st,r){return Math.round((Number(s.initialCredits)||1200)*(Number(st?.allocation?.[r])||0)/100)}
function slotCount(st,r){const n=Number(st?.slots?.[r]);return Number.isFinite(n)&&n>=0?Math.round(n):0}
function ensureArrays(st,r,n){if(!st.slotTargets||typeof st.slotTargets!=='object')st.slotTargets={};if(!Array.isArray(st.slotTargets[r]))st.slotTargets[r]=[];while(st.slotTargets[r].length<n)st.slotTargets[r].push({priority:'base',playerId:null});st.slotTargets[r]=st.slotTargets[r].slice(0,n);if(!st.slotAllocation||typeof st.slotAllocation!=='object')st.slotAllocation={};if(!Array.isArray(st.slotAllocation[r]))st.slotAllocation[r]=[];while(st.slotAllocation[r].length<n)st.slotAllocation[r].push(0);st.slotAllocation[r]=st.slotAllocation[r].slice(0,n);if(!st.slotBudgets||typeof st.slotBudgets!=='object')st.slotBudgets={};if(!Array.isArray(st.slotBudgets[r]))st.slotBudgets[r]=[];while(st.slotBudgets[r].length<n)st.slotBudgets[r].push(0);st.slotBudgets[r]=st.slotBudgets[r].slice(0,n)}
function sync(){
  if(syncing)return false;
  const s=read();if(!s||!Array.isArray(s.brainStrategies))return false;
  syncing=true;let changed=false;const soldIds=sold(s),all=players();
  s.brainStrategies.forEach(st=>{
    ROLES.forEach(r=>{
      const n=slotCount(st,r);if(!n)return;ensureArrays(st,r,n);
      const targets=st.slotTargets[r],pcts=st.slotAllocation[r],budgets=st.slotBudgets[r];
      const used=new Set();
      targets.forEach(t=>{if(t?.playerId!=null&&!soldIds.has(String(t.playerId)))used.add(String(t.playerId))});
      targets.forEach((t,i)=>{
        const pid=t?.playerId;
        if(pid!=null&&!soldIds.has(String(pid)))return;
        if(pid!=null&&soldIds.has(String(pid))){
          const wanted=priority(s,pid);
          const slotPct=Number(pcts[i])||0;
          const fallbackBudget=Math.round(planned(s,st,r)*slotPct/100);
          const slotBudget=Number(budgets[i])>0?Number(budgets[i]):fallbackBudget;
          const candidates=all.filter(p=>p.role===r&&!soldIds.has(String(p.id))&&!used.has(String(p.id))&&s.objectives?.some(x=>String(x)===String(p.id))&&priority(s,p.id)===wanted&&(Number(p.credits)||0)<=slotBudget).sort((a,b)=>(Number(b.appeal)||-1)-(Number(a.appeal)||-1)||(Number(a.credits)||0)-(Number(b.credits)||0));
          if(candidates.length){t.playerId=candidates[0].id;used.add(String(candidates[0].id));changed=true}else{t.playerId=null;changed=true}
        }
      });
      targets.forEach((t,i)=>{
        if(t?.playerId==null)return;
        const p=all.find(x=>String(x.id)===String(t.playerId));if(!p)return;
        if((Number(pcts[i])||0)<=0){const pl=planned(s,st,r);if(pl>0&&Number(p.credits)>0){const pct=Math.max(1,Math.min(99,Math.round(Number(p.credits)/pl*100)));pcts[i]=pct;budgets[i]=Number(p.credits);changed=true}}
        else if(!(Number(budgets[i])>0)){budgets[i]=Math.round(planned(s,st,r)*Number(pcts[i])/100);changed=true}
      });
    });
  });
  if(changed)save(s);syncing=false;return changed;
}
function preserveView(){try{const screen=document.querySelector('.screen.active')?.id;if(screen)sessionStorage.setItem('AF_BRAIN_SYNC_SCREEN',screen)}catch(e){}}
function restoreView(){try{const screen=sessionStorage.getItem('AF_BRAIN_SYNC_SCREEN');if(!screen)return;sessionStorage.removeItem('AF_BRAIN_SYNC_SCREEN');setTimeout(()=>{if(typeof window.go==='function')window.go(screen)},0)}catch(e){}}
function wrapAssign(){if(wrapped)return;const fn=window.assignPlayer;if(typeof fn!=='function'){setTimeout(wrapAssign,100);return}window.assignPlayer=function(){const out=fn.apply(this,arguments);setTimeout(()=>{preserveView();if(sync())window.location.reload()},0);return out};wrapped=true}
function boot(){const changed=sync();if(changed){preserveView();setTimeout(()=>window.location.reload(),20);return}restoreView();wrapAssign();if(typeof window.undoPurchase==='function'&&!window.undoPurchase.__brainSyncWrap){const fn=window.undoPurchase;window.undoPurchase=function(){const out=fn.apply(this,arguments);setTimeout(()=>{preserveView();if(sync())window.location.reload()},0);return out};window.undoPurchase.__brainSyncWrap=true}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.BrainSyncFix={version:VERSION,sync};
})();
