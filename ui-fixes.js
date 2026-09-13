/* UI fixes 3.5.67 — Brain: acquisti reali dalla sezione Squadre */
(function(){
'use strict';
const VERSION='3.5.67';
let timer=null,target=null,fired=false;
function state(){try{return JSON.parse(localStorage.getItem('AF_CURRENT')||'null')}catch(e){return null}}
function version(){const v=document.querySelector('.app-version');if(v)v.textContent='V. '+VERSION}
function setupLongPress(){if(document.documentElement.dataset.brainLongPressReady==='1')return;document.documentElement.dataset.brainLongPressReady='1';document.addEventListener('pointerdown',function(e){const b=e.target?.closest?.('.brain-strategy-name');if(!b)return;const m=String(b.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);if(!m)return;target=b;fired=false;clearTimeout(timer);timer=setTimeout(function(){if(!target)return;const id=Number(m[1]);if(typeof window.selectBrainStrategy==='function')window.selectBrainStrategy(id);fired=true;target=null},550)},true);const cancel=function(){clearTimeout(timer);timer=null;target=null};document.addEventListener('pointerup',cancel,true);document.addEventListener('pointercancel',cancel,true);document.addEventListener('pointermove',function(e){if(target&&e.pointerType==='touch')cancel()},true);document.addEventListener('click',function(e){if(fired){e.preventDefault();e.stopImmediatePropagation();fired=false}},true)}
function addInfo(){document.querySelectorAll('.brain-slot').forEach(function(slot){if(slot.dataset.infoReady==='1')return;const p=slot.querySelector('.brain-slot-player');if(!p||!p.classList.contains('has-player'))return;const name=p.textContent.trim();if(!name||name==='Scegli giocatore'||typeof window.allPlayers!=='function')return;const found=window.allPlayers().find(x=>String(x.name||'').trim()===name);if(!found)return;const wrap=document.createElement('div');wrap.className='brain-slot-player-wrap';const info=document.createElement('button');info.type='button';info.className='brain-slot-player-info';info.setAttribute('aria-label','Apri scheda giocatore');info.textContent='ⓘ';info.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(typeof window.openPlayer==='function')window.openPlayer(Number(found.id),'auction')});p.parentNode.insertBefore(wrap,p);wrap.appendChild(p);wrap.appendChild(info);slot.dataset.infoReady='1'})}
function addBudgets(){const s=state();if(!s)return;document.querySelectorAll('.brain-strategy').forEach(function(card){const title=card.querySelector('.brain-strategy-name');const m=String(title?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/);if(!m)return;const st=(s.brainStrategies||[]).find(x=>Number(x.id)===Number(m[1]));if(!st)return;card.querySelectorAll('.brain-slot').forEach(function(slot){if(slot.dataset.budgetReady==='1')return;const n=slot.querySelector('.brain-slot-name'),b=slot.querySelector('.brain-slot-budget'),row=slot.closest('.brain-role-row');if(!n||!b||!row)return;const r=(row.className.match(/\brole-([PDCA])\b/)||[])[1];if(!r)return;const i=Math.max(0,Number(n.textContent.trim())-1),f=st.slotFrozen?.[r]?.[i],arr=Array.isArray(st.slotBudgets?.[r])?st.slotBudgets[r]:[];if(f){b.textContent=String(Math.round(Number(f.price)||0));b.classList.add('brain-slot-budget-frozen');b.setAttribute('aria-disabled','true');b.setAttribute('tabindex','-1');slot.classList.add('is-frozen','purchased');slot.dataset.budgetReady='1';return}const old=Number(arr[i]),value=Number.isFinite(old)&&old>=0?old:(Number(b.textContent.trim())||0);const input=document.createElement('input');input.type='number';input.min='0';input.step='1';input.inputMode='numeric';input.value=String(value);input.className='brain-slot-budget-input';input.setAttribute('aria-label','Budget slot '+(i+1));input.addEventListener('change',function(){const v=Math.max(0,Math.round(Number(input.value)||0)),fresh=state(),fs=(fresh?.brainStrategies||[]).find(x=>Number(x.id)===Number(m[1]));if(!fs)return;fs.slotBudgets=fs.slotBudgets&&typeof fs.slotBudgets==='object'?fs.slotBudgets:{};fs.slotBudgetManual=fs.slotBudgetManual&&typeof fs.slotBudgetManual==='object'?fs.slotBudgetManual:{};fs.slotBudgets[r]=Array.isArray(fs.slotBudgets[r])?fs.slotBudgets[r]:[];fs.slotBudgetManual[r]=Array.isArray(fs.slotBudgetManual[r])?fs.slotBudgetManual[r]:[];fs.slotBudgets[r][i]=v;fs.slotBudgetManual[r][i]=true;localStorage.setItem('AF_CURRENT',JSON.stringify(fresh));try{const db=JSON.parse(localStorage.getItem('AF_DB')||'[]'),di=db.findIndex(x=>Number(x.id)===Number(fresh.id));if(di>=0){db[di]=fresh;localStorage.setItem('AF_DB',JSON.stringify(db))}}catch(e){}});b.replaceWith(input);slot.dataset.budgetReady='1'})})}
/*
   FONTE DI VERITÀ DEGLI ACQUISTI:
   esclusivamente current.teams[myTeam].players.
   Gli obiettivi della strategia NON vengono mai trattati come acquisti.
   Gli acquisti vengono inseriti negli slot del relativo ruolo in ordine
   di acquisto; il prezzo è quello realmente pagato e la percentuale è
   prezzo / budget pianificato del ruolo.
*/
function syncPurchasedSlotsFromTeams(){
  const s=state();
  if(!s||!Array.isArray(s.teams)||!Array.isArray(s.brainStrategies))return;
  const my=s.teams.find(t=>Number(t.id)===Number(s.myTeamId))||s.teams[0];
  if(!my)return;
  const strategy=s.brainStrategies.find(x=>Number(x.id)===Number(s.activeBrainStrategyId));
  if(!strategy)return;
  const roles=['P','D','C','A'];
  roles.forEach(function(role){
    const purchased=(my.players||[]).filter(p=>String(p.role||'').toUpperCase()===role);
    const row=[...document.querySelectorAll('#brainContent .brain-role-row')].find(x=>x.classList.contains('role-'+role));
    if(!row)return;
    const slots=[...row.querySelectorAll('.brain-slot')];
    const rolePercent=Math.max(0,Number(strategy.allocation?.[role])||0);
    const roleBudget=(Number(s.initialCredits)||0)*rolePercent/100;
    purchased.forEach(function(player,index){
      const slot=slots[index];
      if(!slot)return;
      const price=Math.max(0,Math.round(Number(player.price)||0));
      const pct=roleBudget>0?Math.round(price/roleBudget*100):0;
      const playerButton=slot.querySelector('.brain-slot-player');
      const budget=slot.querySelector('.brain-slot-budget');
      const pctInput=slot.querySelector('.brain-slot-percent input');
      const priority=slot.querySelector('.brain-slot-priority');
      if(playerButton){
        playerButton.textContent=String(player.name||'Giocatore acquistato');
        playerButton.classList.add('has-player');
        playerButton.disabled=true;
        playerButton.setAttribute('aria-disabled','true');
        playerButton.removeAttribute('onclick');
      }
      if(budget){
        budget.textContent=String(price);
        budget.classList.add('brain-slot-budget-frozen');
        budget.setAttribute('aria-disabled','true');
        budget.setAttribute('tabindex','-1');
      }
      if(pctInput){
        pctInput.value=String(pct);
        pctInput.disabled=true;
        pctInput.setAttribute('aria-disabled','true');
      }
      if(priority){
        priority.disabled=true;
        priority.setAttribute('aria-disabled','true');
        priority.style.pointerEvents='none';
      }
      slot.classList.add('is-frozen','purchased');
      slot.dataset.purchasedPlayerId=String(player.id);
      slot.dataset.purchasedPrice=String(price);
    });
  });
}
function style(){if(document.getElementById('brainUi367'))return;const c=document.createElement('style');c.id='brainUi367';c.textContent='.brain-strategy-title,.brain-strategy-title *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none}.brain-slot-player-wrap{display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden}.brain-slot-player-wrap .brain-slot-player{flex:1 1 auto;min-width:0;width:auto!important;overflow:hidden;text-overflow:ellipsis}.brain-slot-player-info{width:28px;height:35px;min-width:28px;padding:0;border:1px solid rgba(80,90,100,.20);border-radius:9px;background:#fff;color:var(--muted);font-size:17px;font-weight:850;line-height:1;display:flex;align-items:center;justify-content:center;flex:0 0 28px}.brain-slot-player-info:active{transform:scale(.94)}.brain-slot-budget{display:flex;align-items:center;justify-content:center;min-width:0;padding:0 1px}.brain-slot-budget-input{width:100%!important;height:35px!important;min-height:35px!important;padding:0 2px!important;border:1px solid rgba(80,90,100,.18)!important;border-radius:9px!important;background:rgba(255,255,255,.42)!important;box-shadow:none!important;text-align:center!important;font-size:14px!important;font-weight:850!important}.brain-slot-budget-frozen{pointer-events:none!important;user-select:none!important;cursor:default!important;color:var(--green)!important;font-weight:900!important}.brain-slot.is-frozen,.brain-slot.purchased{border:2px solid var(--green)!important;border-radius:12px!important;background:var(--greenbg)!important;box-shadow:none!important;padding:3px 5px!important;margin:3px 0!important}.brain-slot.is-frozen .brain-slot-player,.brain-slot.purchased .brain-slot-player{border-color:rgba(80,90,100,.20)!important;background:rgba(255,255,255,.42)!important;color:var(--ink)!important;box-shadow:none!important}.brain-slot.is-frozen .brain-slot-budget,.brain-slot.is-frozen .brain-slot-percent{pointer-events:none!important;user-select:none!important}.brain-slot.is-frozen .brain-slot-percent input{pointer-events:none!important;color:var(--green)!important}.brain-slot.is-frozen .brain-slot-player{pointer-events:none!important;cursor:default!important}@media(max-width:390px){.brain-slot-player-info{width:26px;height:35px;min-width:26px;flex-basis:26px;font-size:16px}.brain-slot-budget-input{height:35px!important;min-height:35px!important;font-size:13px!important}}#appRefreshOverlay{display:none!important}';document.head.appendChild(c)}
function loadOracolo(){if(window.Oracolo?.run)return;const old=document.querySelector('script[data-oracolo]');if(old)old.remove();if(document.querySelector('script[data-oracolo-ui-367]'))return;const x=document.createElement('script');x.src='./oracolo.js?v=3.5.67';x.setAttribute('data-oracolo','1');x.setAttribute('data-oracolo-ui-367','1');x.async=false;document.body.appendChild(x)}
function installStableRefresh(){window.refreshApp=function(){if(document.documentElement.dataset.refreshing==='1')return;document.documentElement.dataset.refreshing='1';const btn=document.getElementById('refreshAppBtn');if(btn){btn.disabled=true;btn.classList.add('loading');btn.setAttribute('aria-label','Aggiornamento in corso')}try{if(navigator.serviceWorker?.getRegistrations)navigator.serviceWorker.getRegistrations().then(regs=>{regs.forEach(r=>{try{r.update()}catch(e){}})}).catch(()=>{});}catch(e){}setTimeout(()=>window.location.replace(window.location.pathname+'?update='+Date.now()),350)}}
function boot(){version();setupLongPress();style();installStableRefresh();addInfo();addBudgets();loadOracolo();syncPurchasedSlotsFromTeams();const obs=new MutationObserver(function(){version();syncPurchasedSlotsFromTeams();addInfo();addBudgets()});obs.observe(document.getElementById('brainContent')||document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
