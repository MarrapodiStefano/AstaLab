/* Bacchetta Magica v1 - motore economico/ottimizzazione globale */
(function(){
  'use strict';

  const VERSION='3.4.27';
  const ROLE_NAMES={P:'Portieri',D:'Difensori',C:'Centrocampo',A:'Attacco'};
  const ROLE_WEIGHT={P:1,D:1,C:1.05,A:1.1};
  const PRIORITY_VALUE={max:1,high:.9,base:.78,low:.62,bet:.52};
  const BEAM_WIDTH=70;
  const CANDIDATES_PER_SLOT=18;

  function all(){return typeof allPlayers==='function'?allPlayers():[];}
  function limits(){return typeof roleLimits==='function'?roleLimits():{P:2,D:9,C:9,A:7};}
  function myTeam(){return typeof brainMyTeam==='function'?brainMyTeam():current?.teams?.[0]||null;}
  function soldIds(){const s=new Set();(current?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>s.add(String(p.id))));return s;}
  function activeStrategy(){return typeof activeBrainStrategy==='function'?activeBrainStrategy():current?.brainStrategies?.find(s=>s.id===current?.activeBrainStrategyId);}
  function strategySlots(s){return typeof brainStrategySlots==='function'?brainStrategySlots(s):limits();}
  function slotPct(s,r){return typeof brainStrategySlotAllocation==='function'?brainStrategySlotAllocation(s,r):Array.from({length:strategySlots(s)[r]||0},()=>100/(strategySlots(s)[r]||1));}
  function targetFor(s,r,i){const a=typeof brainSlotTargets==='function'?brainSlotTargets(s,r):[];return a[i]||{priority:'base',playerId:null};}

  let playersCache=null;
  let priceCache=new Map();
  function players(){return playersCache||(playersCache=all());}

  function refPrice(p){
    const x=Number(p?.pmv); if(Number.isFinite(x)&&x>0)return x;
    const y=Number(p?.credits); return Number.isFinite(y)&&y>0?y:Math.max(1,Number(p?.price)||1);
  }
  function soldHistory(){return Array.isArray(current?.history)?current.history:[];}

  function marketStats(role,appeal){
    const roleRows=[],near=[],byId=new Map(players().map(p=>[String(p.id),p]));
    for(const h of soldHistory()){
      if(h?.role!==role || !(Number(h.price)>0))continue;
      const p=byId.get(String(h.playerId));
      if(!p)continue;
      const rp=refPrice(p); if(!(rp>0))continue;
      const ratio=Number(h.price)/rp;
      if(!Number.isFinite(ratio)||ratio<=0)continue;
      roleRows.push(ratio);
      if(Number.isFinite(Number(p.appeal)) && Math.abs(Number(p.appeal)-appeal)<=1.25)near.push(ratio);
    }
    const med=a=>{if(!a.length)return 1;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
    const roleMed=med(roleRows),nearMed=med(near),q=near.length>=3?.7:near.length?.35:0;
    return {mult:Math.max(.55,Math.min(1.6,roleMed*(1-q)+nearMed*q)),samples:roleRows.length};
  }
  function priceEstimate(p){
    const key=String(p.id);
    if(priceCache.has(key))return priceCache.get(key);
    const ms=marketStats(p.role,Number(p.appeal)||0);
    const v=Math.max(1,Math.round(refPrice(p)*ms.mult));
    priceCache.set(key,v);
    return v;
  }

  function teamContext(p){
    const team=String(p.team||'');
    const comp=(team==='Como'||team==='Inter'||team==='Napoli'||team==='Roma')?'Champions':(team==='Milan'||team==='Juventus')?'Europa League':team==='Atalanta'?'Conference':'';
    const rotation=comp==='Champions'?.10:comp==='Europa League'?.07:comp==='Conference'?.035:0;
    return {rotation,comp};
  }
  function targetPriorityBonus(p){
    const obj=typeof objectivePriority==='function'?objectivePriority(p.id):'base';
    return (PRIORITY_VALUE[obj]||PRIORITY_VALUE.base)*.55;
  }
  function playerScore(p,role){
    const appeal=Math.max(0,Math.min(10,Number(p.appeal)||0));
    const ctx=teamContext(p);
    let score=appeal*(1-(role==='P'?ctx.rotation*.65:ctx.rotation));
    score+=targetPriorityBonus(p);
    return Math.max(0,score*ROLE_WEIGHT[role]);
  }
  function sameTeamPenalty(p,chosen,role){
    const n=chosen.filter(x=>x.p.role===role&&String(x.p.team||'')===String(p.team||'')).length;
    return n?Math.min(.8,n*.32):0;
  }

  function candidatesForSlot(s,r,i){
    const sold=soldIds(),target=targetFor(s,r,i),selected=target.playerId;
    const rows=players().filter(p=>p.role===r&&!sold.has(String(p.id))).map(p=>{
      const est=priceEstimate(p),score=playerScore(p,r),efficiency=score/Math.sqrt(Math.max(1,est)),preferred=selected!=null&&String(selected)===String(p.id)?1.15:1;
      return {p,est,score,efficiency,preferred};
    });
    rows.sort((a,b)=>(b.score*b.preferred-a.score*a.preferred)||(b.efficiency-a.efficiency));
    const cheap=[...rows].sort((a,b)=>a.est-b.est||b.score-a.score).slice(0,4);
    const best=rows.slice(0,CANDIDATES_PER_SLOT);
    const seen=new Set(best.map(x=>String(x.p.id)));
    cheap.forEach(x=>{if(!seen.has(String(x.p.id))){best.push(x);seen.add(String(x.p.id));}});
    return best;
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
      const totalSlots=strategySlots(s)[r]||limits()[r],need=Math.max(0,totalSlots-stats[r].count),pcts=slotPct(s,r);
      let added=0;
      for(let i=0;i<totalSlots&&added<need;i++){
        if(i<stats[r].count)continue;
        const target=targetFor(s,r,i);
        slots.push({r,i,pct:Number(pcts[i])||0,budget:roleBudget[r]*(Number(pcts[i])||0)/100,priority:target.priority||'base'});
        added++;
      }
    }
    slots.sort((a,b)=>b.budget-a.budget||(PRIORITY_VALUE[b.priority]||0)-(PRIORITY_VALUE[a.priority]||0));
    return slots;
  }

  function optimize(s){
    const budget=Math.max(0,(Number(current.initialCredits)||0)-(Number(myTeam()?.spent)||0));
    const slots=makeSlots(s);
    if(!slots.length)return {budget,slots,best:{chosen:[],spent:0,value:0,roleSpent:{P:0,D:0,C:0,A:0}},shifts:[],marketSamples:soldHistory().length};
    const pool=slots.map(sl=>({slot:sl,cands:candidatesForSlot(s,sl.r,sl.i)}));
    let beam=[{chosen:[],spent:0,value:0,roleSpent:{P:0,D:0,C:0,A:0}}];

    for(const item of pool){
      const next=[];
      for(const state of beam){
        for(const c of item.cands){
          if(state.chosen.some(x=>String(x.p.id)===String(c.p.id)))continue;
          const spent=state.spent+c.est;
          if(spent>budget)continue;
          const penalty=sameTeamPenalty(c.p,state.chosen,item.slot.r);
          const over=Math.max(0,c.est-item.slot.budget);
          const under=Math.max(0,item.slot.budget-c.est);
          const value=c.score+Math.min(.45,under/Math.max(50,item.slot.budget)*.45)-Math.min(.65,over/Math.max(50,item.slot.budget)*.65)-penalty;
          next.push({chosen:[...state.chosen,{...c,slot:item.slot}],spent,value:state.value+value,roleSpent:{...state.roleSpent,[item.slot.r]:state.roleSpent[item.slot.r]+c.est}});
        }
      }
      if(!next.length){
        /* Nessuna combinazione completa con il budget: manteniamo comunque
           gli stati migliori già costruiti, senza lasciare la Bacchetta muta. */
        break;
      }
      next.sort((a,b)=>b.value-a.value||a.spent-b.spent);
      const seen=new Set(),ded=[];
      for(const st of next){
        const key=st.chosen.map(x=>x.p.id).sort().join(',');
        if(seen.has(key))continue;
        seen.add(key);ded.push(st);
        if(ded.length>=BEAM_WIDTH)break;
      }
      beam=ded;
    }
    beam.sort((a,b)=>b.chosen.length-a.chosen.length||b.value-a.value||a.spent-b.spent);
    const best=beam[0],roleBud=roleBaseBudgets(s,budget),shifts=[];
    for(const r of ['P','D','C','A']){const delta=best.roleSpent[r]-roleBud[r];if(Math.abs(delta)>=3)shifts.push({role:r,delta});}
    return {budget,slots,best,roleBud,shifts,marketSamples:soldHistory().length};
  }

  function applyToActiveStrategy(result){
    const s=activeStrategy();
    if(!s||!result?.best?.chosen?.length)return false;
    if(!s.slotTargets||typeof s.slotTargets!=='object')s.slotTargets={};
    const byRole={P:[],D:[],C:[],A:[]};
    result.best.chosen.forEach(x=>byRole[x.slot.r].push(x));
    ['P','D','C','A'].forEach(r=>{
      const targets=typeof brainSlotTargets==='function'?brainSlotTargets(s,r):[];
      byRole[r].forEach(x=>{
        const i=x.slot.i;
        if(targets[i])targets[i].playerId=x.p.id;
      });
      s.slotTargets[r]=targets;
    });
    if(typeof brainExpandedId!=='undefined')brainExpandedId=s.id;
    if(typeof persist==='function')persist();
    if(typeof renderBrain==='function')renderBrain();
    return true;
  }

  function runWand(){
    if(!current){alert('Apri prima un’asta.');return;}
    try{
      playersCache=null;
      priceCache=new Map();
      const s=activeStrategy();
      if(!s){alert('Nessuna strategia attiva.');return;}
      const result=optimize(s);
      if(!result?.best?.chosen?.length){
        alert('Non ci sono giocatori disponibili o budget sufficiente per compilare gli slot rimasti.');
        return;
      }
      const applied=applyToActiveStrategy(result);
      if(!applied)alert('Non è stato possibile scrivere la proposta negli slot della strategia attiva.');
    }catch(e){
      console.error('Bacchetta Magica',e);
      alert('La Bacchetta Magica non è riuscita a completare il calcolo.');
    }
  }
  window.runMagicWand=runWand;

  function inject(){
    const version=document.querySelector('.app-version');if(version)version.textContent=VERSION;
    const brain=document.getElementById('brain');if(!brain)return;
    const head=brain.querySelector('.h2')?.parentElement;if(!head)return;
    if(head.querySelector('.magic-wand-btn'))return;
    const btn=document.createElement('button');
    btn.type='button';btn.className='magic-wand-btn';btn.textContent='🪄';
    btn.title='Compila automaticamente gli slot';btn.setAttribute('aria-label','Compila automaticamente gli slot');btn.onclick=runWand;
    head.appendChild(btn);
  }
  function style(){if(document.getElementById('magicWandStyle'))return;const s=document.createElement('style');s.id='magicWandStyle';s.textContent=`
    .magic-wand-btn{width:42px;height:42px;flex:0 0 42px;border:1px solid #dfe4e9;border-radius:13px;background:#fff;font-size:23px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(20,30,45,.06);cursor:pointer}.magic-wand-btn:active{transform:scale(.94)}
  `;document.head.appendChild(s);}
  function start(){style();inject();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  const oldRender=window.renderBrain;if(typeof oldRender==='function')window.renderBrain=function(){const r=oldRender.apply(this,arguments);inject();return r;};
})();
