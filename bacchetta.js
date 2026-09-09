/* Bacchetta Magica v1 - motore economico/ottimizzazione globale */
(function(){
  'use strict';

  const VERSION='3.4.26';
  const ROLE_NAMES={P:'Portieri',D:'Difensori',C:'Centrocampo',A:'Attacco'};
  const ROLE_WEIGHT={P:1,D:1,C:1.05,A:1.1};
  const PRIORITY_VALUE={max:1,high:.9,base:.78,low:.62,bet:.52};
  const BEAM_WIDTH=90;
  const CANDIDATES_PER_SLOT=14;

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function all(){return typeof allPlayers==='function'?allPlayers():[];}
  function limits(){return typeof roleLimits==='function'?roleLimits():{P:2,D:9,C:9,A:7};}
  function myTeam(){return typeof brainMyTeam==='function'?brainMyTeam():current?.teams?.[0]||null;}
  function soldIds(){const s=new Set();(current?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>s.add(String(p.id))));return s;}
  function activeStrategy(){return typeof activeBrainStrategy==='function'?activeBrainStrategy():current?.brainStrategies?.find(s=>s.id===current?.activeBrainStrategyId);}
  function strategySlots(s){return typeof brainStrategySlots==='function'?brainStrategySlots(s):limits();}
  function slotPct(s,r){return typeof brainStrategySlotAllocation==='function'?brainStrategySlotAllocation(s,r):Array.from({length:strategySlots(s)[r]||0},()=>100/(strategySlots(s)[r]||1));}
  function targetFor(s,r,i){const a=typeof brainSlotTargets==='function'?brainSlotTargets(s,r):[];return a[i]||{priority:'base',playerId:null};}

  function refPrice(p){
    const x=Number(p?.pmv); if(Number.isFinite(x)&&x>0)return x;
    const y=Number(p?.credits); return Number.isFinite(y)&&y>0?y:Math.max(1,Number(p?.price)||1);
  }
  function soldHistory(){return Array.isArray(current?.history)?current.history:[];}

  function marketStats(role,appeal){
    const roleRows=[],near=[];
    for(const h of soldHistory()){
      if(h?.role!==role || !(Number(h.price)>0))continue;
      const p=all().find(x=>String(x.id)===String(h.playerId));
      const rp=refPrice(p); if(!(rp>0))continue;
      const ratio=Number(h.price)/rp;
      if(!Number.isFinite(ratio)||ratio<=0)continue;
      roleRows.push(ratio);
      if(p && Number.isFinite(Number(p.appeal)) && Math.abs(Number(p.appeal)-appeal)<=1.25)near.push(ratio);
    }
    const med=a=>{if(!a.length)return 1;const b=[...a].sort((x,y)=>x-y);const m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
    const roleMed=med(roleRows),nearMed=med(near),q=near.length>=3?.7:near.length?.35:0;
    return {mult:Math.max(.55,Math.min(1.6,roleMed*(1-q)+nearMed*q)),samples:roleRows.length};
  }
  function priceEstimate(p){const ms=marketStats(p.role,Number(p.appeal)||0);return Math.max(1,Math.round(refPrice(p)*ms.mult));}

  function teamContext(p){
    const team=String(p.team||'');
    const comp=(team==='Como'||team==='Inter'||team==='Napoli'||team==='Roma')?'Champions':(team==='Milan'||team==='Juventus')?'Europa League':team==='Atalanta'?'Conference':'';
    const rotation=comp==='Champions'?.10:comp==='Europa League'?.07:comp==='Conference'?.035:0;
    return {rotation,comp};
  }
  function targetPriorityBonus(p){const obj=typeof objectivePriority==='function'?objectivePriority(p.id):'base';return (PRIORITY_VALUE[obj]||PRIORITY_VALUE.base)*.55;}
  function playerScore(p,role){
    const appeal=Math.max(0,Math.min(10,Number(p.appeal)||0));
    const ctx=teamContext(p);
    let score=appeal*(1-(role==='P'?ctx.rotation*.65:ctx.rotation));
    score+=targetPriorityBonus(p);
    return Math.max(0,score*ROLE_WEIGHT[role]);
  }
  function sameTeamPenalty(p,chosen,role){const n=chosen.filter(x=>x.p.role===role&&String(x.p.team||'')===String(p.team||'')).length;return n?Math.min(.8,n*.32):0;}

  function candidatesForSlot(s,r,i){
    const sold=soldIds(),target=targetFor(s,r,i),selected=target.playerId;
    return all().filter(p=>p.role===r&&!sold.has(String(p.id))).map(p=>{
      const est=priceEstimate(p),score=playerScore(p,r),efficiency=score/Math.sqrt(Math.max(1,est)),preferred=selected!=null&&String(selected)===String(p.id)?1.15:1;
      return {p,est,score,efficiency,preferred};
    }).sort((a,b)=>(b.score*b.preferred-a.score*a.preferred)||(b.efficiency-a.efficiency)).slice(0,CANDIDATES_PER_SLOT);
  }
  function currentRoleStats(){
    const out={P:{count:0,spent:0},D:{count:0,spent:0},C:{count:0,spent:0},A:{count:0,spent:0}},t=myTeam();
    (t?.players||[]).forEach(p=>{if(out[p.role]){out[p.role].count++;out[p.role].spent+=Number(p.price)||0;}});return out;
  }
  function roleBaseBudgets(s,totalBudget){
    const a=s?.allocation||{},sum=['P','D','C','A'].reduce((n,r)=>n+Math.max(0,Number(a[r])||0),0)||100,out={};
    ['P','D','C','A'].forEach(r=>out[r]=totalBudget*Math.max(0,Number(a[r])||0)/sum);return out;
  }
  function makeSlots(s){
    const stats=currentRoleStats(),slots=[],roleBudget=roleBaseBudgets(s,Math.max(0,(Number(current.initialCredits)||0)-(Number(myTeam()?.spent)||0)));
    for(const r of ['P','D','C','A']){
      const need=Math.max(0,(strategySlots(s)[r]||limits()[r])-stats[r].count),pcts=slotPct(s,r);
      let k=0;
      for(let i=0;i<(strategySlots(s)[r]||0)&&k<need;i++){
        if(stats[r].count>i&&i<stats[r].count)continue;
        const target=targetFor(s,r,i);slots.push({r,i,pct:Number(pcts[i])||0,budget:roleBudget[r]*(Number(pcts[i])||0)/100,priority:target.priority||'base'});k++;
      }
    }
    slots.sort((a,b)=>b.budget-a.budget||(PRIORITY_VALUE[b.priority]||0)-(PRIORITY_VALUE[a.priority]||0));return slots;
  }

  function optimize(s){
    const budget=Math.max(0,(Number(current.initialCredits)||0)-(Number(myTeam()?.spent)||0)),slots=makeSlots(s),pool=slots.map(sl=>({slot:sl,cands:candidatesForSlot(s,sl.r,sl.i)}));
    let beam=[{chosen:[],spent:0,value:0,roleSpent:{P:0,D:0,C:0,A:0}}];
    for(const item of pool){
      const next=[];
      for(const state of beam){
        for(const c of item.cands){
          const spent=state.spent+c.est;if(spent>budget)continue;
          const penalty=sameTeamPenalty(c.p,state.chosen,item.slot.r),over=Math.max(0,c.est-item.slot.budget),under=Math.max(0,item.slot.budget-c.est);
          const value=c.score+Math.min(.45,under/Math.max(50,item.slot.budget)*.45)-Math.min(.65,over/Math.max(50,item.slot.budget)*.65)-penalty;
          next.push({chosen:[...state.chosen,{...c,slot:item.slot}],spent,value:state.value+value,roleSpent:{...state.roleSpent,[item.slot.r]:state.roleSpent[item.slot.r]+c.est}});
        }
      }
      if(!next.length)continue;
      next.sort((a,b)=>b.value-a.value||a.spent-b.spent);const seen=new Set(),ded=[];
      for(const st of next){const key=st.chosen.map(x=>x.p.id).sort().join(',');if(seen.has(key))continue;seen.add(key);ded.push(st);if(ded.length>=BEAM_WIDTH)break;}beam=ded;
    }
    if(!beam.length)return null;beam.sort((a,b)=>b.value-a.value);const best=beam[0],roleBud=roleBaseBudgets(s,budget),shifts=[];
    for(const r of ['P','D','C','A']){const delta=best.roleSpent[r]-roleBud[r];if(Math.abs(delta)>=3)shifts.push({role:r,delta});}
    return {budget,slots,best,roleBud,shifts,marketSamples:soldHistory().length};
  }
  function globalAlternative(){const results=[];for(const s of current?.brainStrategies||[]){const o=optimize(s);if(o)results.push({s,o});}results.sort((a,b)=>b.o.best.value-a.o.best.value);return results;}
  function fmt(n){return Math.round(n).toLocaleString('it-IT');}
  function roleLabel(r){return ROLE_NAMES[r]||r;}

  function renderWandModal(results){
    if(!results.length){openModal('<div class="h2">🪄 Bacchetta Magica</div><div class="empty">Non ci sono abbastanza slot o giocatori disponibili per costruire una configurazione.</div><button class="btn secondary" style="width:100%" onclick="closeModal()">Chiudi</button>');return;}
    const activeId=current.activeBrainStrategyId,best=results[0],active=results.find(x=>x.s.id===activeId)||best,marketCount=soldHistory().length;
    const rows=best.o.best.chosen.map(x=>`<div class="wand-row"><span><b>${esc(x.p.name)}</b><small>${roleLabel(x.slot.r)} · slot ${x.slot.i+1}</small></span><b>${fmt(x.est)} cr</b></div>`).join('');
    const shifts=best.o.shifts.map(x=>`<span class="wand-shift">${roleLabel(x.role)} ${x.delta>0?'+':'−'}${fmt(Math.abs(x.delta))}</span>`).join('');
    let suggestion='';
    if(best.s.id!==activeId){const diff=best.o.best.value-(active?.o.best.value||0);suggestion=`<div class="wand-alert"><b>🪄 Strategia alternativa consigliata</b><br>«${esc(best.s.name)}» produce una configurazione migliore di circa <b>${diff.toFixed(1)}</b> punti rispetto alla strategia attiva.</div>`;}
    const marketText=marketCount?`Il calcolo ha usato anche <b>${marketCount}</b> prezzi reali già registrati nell'asta.`:'Nessun prezzo reale disponibile: la stima parte dai valori del listone e si aggiornerà con l’asta.';
    openModal(`<div class="wand-head"><div><div class="h2">🪄 Bacchetta Magica</div><div class="sub">Ottimizzazione globale della rosa</div></div><button class="brain-picker-close" onclick="closeModal()">×</button></div>${suggestion}<div class="wand-card"><div><b>Strategia analizzata</b><br><span>${esc(best.s.name)}</span></div><div class="wand-kpi"><span>Valore config.</span><b>${best.o.best.value.toFixed(1)}</b></div><div class="wand-kpi"><span>Budget usato</span><b>${fmt(best.o.best.spent)} cr</b></div></div><div class="wand-section"><b>Configurazione proposta</b>${rows||'<div class="muted small">Nessun nuovo slot da riempire.</div>'}</div>${shifts?`<div class="wand-section"><b>Redistribuzione suggerita</b><div class="wand-shifts">${shifts}</div></div>`:''}<div class="wand-note">${marketText}</div><button class="btn primary" style="width:100%;margin-top:10px" onclick="closeModal()">Ok, analizzo questa proposta</button>`);
  }
  function runWand(){if(!current){alert('Apri prima un’asta.');return;}try{renderWandModal(globalAlternative());}catch(e){console.error('Bacchetta Magica',e);alert('La Bacchetta Magica non è riuscita a completare il calcolo.');}}
  window.runMagicWand=runWand;

  function inject(){
    const version=document.querySelector('.app-version');if(version)version.textContent=VERSION;
    const brain=document.getElementById('brain');if(!brain)return;const head=brain.querySelector('.h2')?.parentElement;if(!head)return;
    if(head.querySelector('.magic-wand-btn'))return;const btn=document.createElement('button');btn.type='button';btn.className='magic-wand-btn';btn.textContent='🪄';btn.title='Bacchetta Magica';btn.setAttribute('aria-label','Bacchetta Magica');btn.onclick=runWand;head.appendChild(btn);
  }
  function style(){if(document.getElementById('magicWandStyle'))return;const s=document.createElement('style');s.id='magicWandStyle';s.textContent=`
    .magic-wand-btn{width:42px;height:42px;flex:0 0 42px;border:1px solid #dfe4e9;border-radius:13px;background:#fff;font-size:23px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(20,30,45,.06);cursor:pointer}.magic-wand-btn:active{transform:scale(.94)}
    .wand-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.wand-card{display:grid;grid-template-columns:1fr auto;gap:8px;padding:12px;background:#f7f8fa;border-radius:14px;margin:12px 0}.wand-kpi{display:flex;flex-direction:column;text-align:right}.wand-kpi span{font-size:11px;color:#697386}.wand-kpi b{font-size:18px}.wand-section{margin-top:12px}.wand-row{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #e3e6eb}.wand-row:last-child{border-bottom:0}.wand-row small{display:block;color:#697386;font-size:11px;margin-top:2px}.wand-alert{padding:11px 12px;border-radius:12px;background:#fff7dc;border:1px solid #f0df9c;margin:10px 0}.wand-shifts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.wand-shift{padding:6px 8px;border-radius:9px;background:#eef5f1;color:#08784f;font-weight:800;font-size:12px}.wand-note{margin-top:12px;padding:10px 12px;border-radius:12px;background:#f4f5f7;color:#697386;font-size:12px;line-height:1.4}
  `;document.head.appendChild(s);}
  function start(){style();inject();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  const oldRender=window.renderBrain;if(typeof oldRender==='function')window.renderBrain=function(){const r=oldRender.apply(this,arguments);inject();return r;};
})();
