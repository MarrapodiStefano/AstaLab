/* ORACOLO v1.0.1 — assistente Smart dell'asta */
(function(){
  'use strict';
  const VERSION='1.0.1';
  const ROLES=['P','D','C','A'];
  const ROLE_NAMES={P:'Portieri',D:'Difensori',C:'Centrocampisti',A:'Attaccanti'};
  function state(){try{return JSON.parse(localStorage.getItem('AF_CURRENT')||'null');}catch(e){return null;}}
  function players(){return typeof window.allPlayers==='function'?window.allPlayers():[];}
  function activeStrategy(){const c=state();return c?.brainStrategies?.find(s=>Number(s.id)===Number(c.activeBrainStrategyId))||null;}
  function rolePlan(s,r){const c=state();return Math.round((Number(c?.initialCredits)||0)*(Number(s?.allocation?.[r])||0)/100);}
  function soldIds(){const c=state(),set=new Set();(c?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>set.add(String(p.id))));return set;}
  function myPlayers(){const c=state(),t=(c?.teams||[]).find(t=>Number(t.id)===0);return t?.players||[];}
  function player(id){return players().find(p=>String(p.id)===String(id));}
  function slotTargets(s,r){if(typeof window.brainSlotTargets==='function')return window.brainSlotTargets(s,r)||[];return Array.isArray(s?.slotTargets?.[r])?s.slotTargets[r]:[];}
  function slotBudget(s,r,i){const v=s?.slotBudgets?.[r]?.[i];if(Number.isFinite(Number(v)))return Number(v);const t=slotTargets(s,r)[i],p=player(t?.playerId);return p?Math.round(Number(p.credits)||0):0;}
  function slotAppeal(s,r,i){const t=slotTargets(s,r)[i]||{};if(Number.isFinite(Number(t.priority)))return Number(t.priority);return Number(player(t.playerId)?.appeal)||0;}
  function roleSpent(s,r){return (s?.slotBudgets?.[r]||[]).reduce((a,v)=>a+(Number(v)||0),0);}
  function smartScore(p,context){const appeal=Number(p.appeal)||0,pmv=Number(p.pmv)||0,credits=Math.max(1,Number(p.credits)||1);let score=appeal*100+(pmv/credits)*20+pmv*.05;const sameTeam=context.owned.filter(x=>String(x.team||'')===String(p.team||'')).length;return score-sameTeam*3;}
  function candidates(s,r,i){const sold=soldIds(),targets=slotTargets(s,r),used=new Set();targets.forEach((t,idx)=>{if(idx!==i&&t?.playerId!=null)used.add(String(t.playerId));});const appeal=slotAppeal(s,r,i),budget=slotBudget(s,r,i),remaining=Math.max(0,rolePlan(s,r)-roleSpent(s,r)+budget),owned=myPlayers().map(x=>Object.assign({},x,player(x.id)||{}));return players().filter(p=>p.role===r&&!sold.has(String(p.id))&&!used.has(String(p.id))&&Number(p.appeal)===appeal&&Number(p.credits)>0&&Number(p.credits)<=remaining).map(p=>({p,score:smartScore(p,{owned})})).sort((a,b)=>b.score-a.score);}
  function chooseSlot(s,r,i){return candidates(s,r,i)[0]?.p||null;}
  function applyPlayer(s,r,i,p){if(!p||typeof window.updateBrainSlotPlayer!=='function')return false;window.updateBrainSlotPlayer(s.id,r,i,p.id);return true;}
  function run(){const s=activeStrategy();if(!s){alert('Seleziona una strategia Brain attiva.');return;}let changed=0,warnings=[];ROLES.forEach(r=>{slotTargets(s,r).forEach((t,i)=>{if(t?.playerId!=null)return;const p=chooseSlot(s,r,i);if(p){if(applyPlayer(s,r,i,p))changed++;}else warnings.push(ROLE_NAMES[r]+' · slot '+(i+1));});});if(changed===0&&warnings.length)alert('🔮 Oracolo non ha trovato una proposta compatibile per:\n\n'+warnings.join('\n')+'\n\nPuoi modificare manualmente appetibilità o budget degli slot.');else if(warnings.length)alert('🔮 Oracolo ha compilato '+changed+' slot.\n\nNessuna proposta compatibile per:\n'+warnings.join('\n'));if(typeof window.renderBrain==='function')window.renderBrain();}
  function button(){const b=document.createElement('button');b.type='button';b.className='oracolo-button';b.innerHTML='<span class="oracolo-icon" aria-hidden="true">🔮</span><span>Oracolo</span>';b.setAttribute('aria-label','Attiva Oracolo');b.title='Attiva Oracolo';b.addEventListener('click',function(){b.classList.remove('oracolo-pulse');void b.offsetWidth;b.classList.add('oracolo-pulse');run();});return b;}
  function installStyle(){if(document.getElementById('oracoloStyle'))return;const css=document.createElement('style');css.id='oracoloStyle';css.textContent=`
    .oracolo-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;min-width:40px;padding:0 10px;border:1px solid rgba(185,121,0,.25);border-radius:12px;background:linear-gradient(180deg,#fffdf5,#fff7dc);color:#765300;font:800 13px/1 inherit;box-shadow:0 3px 10px rgba(118,83,0,.10);cursor:pointer;vertical-align:middle;}
    .oracolo-button:active{transform:scale(.96);}.oracolo-icon{font-size:23px;line-height:1;display:inline-block;transform-origin:center;}.oracolo-pulse .oracolo-icon{animation:oracoloReveal .72s cubic-bezier(.2,.8,.2,1);}
    @keyframes oracoloReveal{0%{transform:scale(.65) rotate(-18deg)}35%{transform:scale(1.28) rotate(8deg);filter:brightness(1.18)}65%{transform:scale(.92) rotate(-3deg)}100%{transform:scale(1) rotate(0)}}
  `;document.head.appendChild(css);}
  function budgetAnchor(card){const c=state(),initial=String(c?.initialCredits??'');if(!initial)return null;const nodes=[...card.querySelectorAll('*')].filter(el=>{const t=el.textContent.trim();return t===initial||t.includes(initial+' crediti')||t.includes('Piano '+initial)});nodes.sort((a,b)=>a.textContent.length-b.textContent.length);return nodes[0]||null;}
  function insert(){document.querySelectorAll('.brain-strategy').forEach(card=>{if(card.querySelector('.oracolo-button'))return;const btn=button(),anchor=budgetAnchor(card);if(anchor&&anchor.parentElement){anchor.parentElement.insertBefore(btn,anchor.nextSibling);return;}const title=card.querySelector('.brain-strategy-name');if(title&&title.parentElement)title.parentElement.appendChild(btn);else card.insertBefore(btn,card.firstChild);});}
  function boot(){installStyle();insert();}
  const observer=new MutationObserver(insert);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();observer.observe(document.body,{childList:true,subtree:true});
  window.Oracolo={version:VERSION,run:run,chooseSlot:chooseSlot};
})();