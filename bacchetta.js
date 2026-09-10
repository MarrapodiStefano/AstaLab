/* Bacchetta Magica v5 — scelta slot con dati Fantacalcio 2025/26 */
(function(){
  'use strict';

  const VERSION='3.4.40';
  const ROLE_WEIGHT={P:1,D:1,C:1.05,A:1.1};
  const PRIORITY_VALUE={max:1,high:.9,base:.78,low:.62,bet:.52};
  const HIST_WEIGHT={P:.35,D:.40,C:.40,A:.40};

  function all(){return typeof allPlayers==='function'?allPlayers():[];}
  function limits(){return typeof roleLimits==='function'?roleLimits():{P:2,D:9,C:9,A:7};}
  function myTeam(){return typeof brainMyTeam==='function'?brainMyTeam():current?.teams?.[0]||null;}
  function soldIds(){const s=new Set();(current?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>s.add(String(p.id))));return s;}
  function activeStrategy(){return typeof activeBrainStrategy==='function'?activeBrainStrategy():current?.brainStrategies?.find(s=>s.id===current?.activeBrainStrategyId);}
  function strategySlots(s){return typeof brainStrategySlots==='function'?brainStrategySlots(s):limits();}
  function slotPct(s,r){return typeof brainStrategySlotAllocation==='function'?brainStrategySlotAllocation(s,r):Array.from({length:strategySlots(s)[r]||0},()=>100/(strategySlots(s)[r]||1));}
  function targetFor(s,r,i){const raw=s?.slotTargets?.[r];const t=Array.isArray(raw)&&raw[i]?raw[i]:null;return t?{priority:t.priority||'base',playerId:t.playerId??null}:{priority:'base',playerId:null};}

  let playersCache=null,priceCache=new Map();
  function players(){return playersCache||(playersCache=all());}
  function refPrice(p){const x=Number(p?.pmv);if(Number.isFinite(x)&&x>0)return x;const y=Number(p?.credits);return Number.isFinite(y)&&y>0?y:Math.max(1,Number(p?.price)||1);}

  function soldHistory(){return Array.isArray(current?.history)?current.history:[];}
  function marketStats(role,appeal){
    const roleRows=[],near=[],byId=new Map(players().map(p=>[String(p.id),p]));
    for(const h of soldHistory()){
      if(h?.role!==role||!(Number(h.price)>0))continue;
      const p=byId.get(String(h.playerId));if(!p)continue;
      const rp=refPrice(p);if(!(rp>0))continue;
      const ratio=Number(h.price)/rp;if(!Number.isFinite(ratio)||ratio<=0)continue;
      roleRows.push(ratio);
      if(Number.isFinite(Number(p.appeal))&&Math.abs(Number(p.appeal)-appeal)<=1.25)near.push(ratio);
    }
    const med=a=>{if(!a.length)return 1;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
    const roleMed=med(roleRows),nearMed=med(near),q=near.length>=3?.7:near.length?.35:0;
    return {mult:Math.max(.55,Math.min(1.6,roleMed*(1-q)+nearMed*q))};
  }
  function priceEstimate(p){const key=String(p.id);if(priceCache.has(key))return priceCache.get(key);const ms=marketStats(p.role,Number(p.appeal)||0);const v=Math.max(1,Math.round(refPrice(p)*ms.mult));priceCache.set(key,v);return v;}

  function historicalProfile(p){
    if(typeof window.ASTA_HISTORICAL?.profile!=='function')return null;
    try{return window.ASTA_HISTORICAL.profile(p);}catch(e){return null;}
  }

  /* Punteggio qualitativo: l'appeal/Listone resta la base, mentre il dato
     Fantacalcio 2025/26 corregge la scelta quando esiste una stagione utile. */
  function playerScore(p,role){
    const appeal=Math.max(0,Math.min(10,Number(p.appeal)||0));
    const ctx=teamContext(p);
    let score=appeal*(1-(role==='P'?ctx.rotation*.65:ctx.rotation));
    const hist=historicalProfile(p);
    if(hist?.found&&hist.pv>0){
      const hw=HIST_WEIGHT[role]||.40;
      score=score*(1-hw)+Number(hist.historicalScore||0)*hw;
    }
    score+=targetPriorityBonus(p);
    return Math.max(0,score*ROLE_WEIGHT[role]);
  }

  function sameTeamPenalty(p,chosen,role){const n=chosen.filter(x=>x.p.role===role&&String(x.p.team||'')===String(p.team||'')).length;return n?Math.min(.8,n*.32):0;}
  function teamContext(p){
    const team=String(p.team||'');
    const comp=(team==='Como'||team==='Inter'||team==='Napoli'||team==='Roma')?'Champions':(team==='Milan'||team==='Juventus')?'Europa League':team==='Atalanta'?'Conference':'';
    const rotation=comp==='Champions'?.10:comp==='Europa League'?.07:comp==='Conference'?.035:0;
    return {rotation,comp};
  }
  function targetPriorityBonus(p){const obj=typeof objectivePriority==='function'?objectivePriority(p.id):'base';return (PRIORITY_VALUE[obj]||PRIORITY_VALUE.base)*.55;}

  function makeSlots(s){
    const t=myTeam(),counts={P:0,D:0,C:0,A:0};
    (t?.players||[]).forEach(p=>{if(counts[p.role]!=null)counts[p.role]++;});
    const budget=Math.max(0,(Number(current.initialCredits)||0)-(Number(t?.spent)||0));
    const alloc=s?.allocation||{},sum=['P','D','C','A'].reduce((n,r)=>n+Math.max(0,Number(alloc[r])||0),0)||100;
    const slots=[];
    for(const r of ['P','D','C','A']){
      const total=Number(strategySlots(s)[r])||limits()[r],pcts=slotPct(s,r),roleBudget=budget*Math.max(0,Number(alloc[r])||0)/sum;
      for(let i=counts[r];i<total;i++){
        const pct=Number(pcts[i])||0;
        slots.push({r,i,pct,budget:roleBudget*pct/100,priority:targetFor(s,r,i).priority||'base'});
      }
    }
    return slots;
  }

  function candidateRows(s,slot,used){
    const sold=soldIds();
    const rows=players().filter(p=>p.role===slot.r&&!sold.has(String(p.id))&&!used.has(String(p.id))).map(p=>{
      const est=priceEstimate(p),score=playerScore(p,slot.r),target=targetFor(s,slot.r,slot.i),hist=historicalProfile(p);
      const selected=target.playerId!=null&&String(target.playerId)===String(p.id)?1.18:1;
      const priority=PRIORITY_VALUE[target.priority]||PRIORITY_VALUE.base;
      const historicalFound=!!(hist?.found&&hist.pv>0);
      return {p,est,score,priority,preferred:selected,historicalFound,historicalScore:Number(hist?.historicalScore)||0,utility:score*selected*(.75+.25*priority)};
    });
    rows.sort((a,b)=>b.utility-a.utility||b.historicalScore-a.historicalScore||a.est-b.est);
    const cheap=[...rows].sort((a,b)=>a.est-b.est).slice(0,5);
    const top=rows.slice(0,30);
    const map=new Map();[...top,...cheap].forEach(x=>map.set(String(x.p.id),x));
    return [...map.values()];
  }

  function cheapestFuture(slots,start,used){
    let total=0;
    for(let j=start;j<slots.length;j++){
      const rows=candidateRows(null,slots[j],used);let best=Infinity;
      for(const c of rows)if(c.est<best)best=c.est;
      if(!Number.isFinite(best))return Infinity;
      total+=best;
    }
    return total;
  }

  function optimize(s){
    const budget=Math.max(0,(Number(current.initialCredits)||0)-(Number(myTeam()?.spent)||0));
    const slots=makeSlots(s);
    if(!slots.length)return {budget,slots,best:{chosen:[],spent:0,value:0,roleSpent:{P:0,D:0,C:0,A:0}},complete:true};

    const ordered=[...slots].sort((a,b)=>b.budget-a.budget||((PRIORITY_VALUE[b.priority]||0)-(PRIORITY_VALUE[a.priority]||0)));
    const chosen=[],used=new Set();
    let spent=0,value=0,roleSpent={P:0,D:0,C:0,A:0};

    for(let i=0;i<ordered.length;i++){
      const slot=ordered[i],rows=candidateRows(s,slot,used),feasible=[];
      for(const c of rows){
        if(spent+c.est>budget)continue;
        const nextUsed=new Set(used);nextUsed.add(String(c.p.id));
        const future=cheapestFuture(ordered,i+1,nextUsed);
        if(spent+c.est+future>budget)continue;
        const penalty=sameTeamPenalty(c.p,chosen,slot.r);
        const over=Math.max(0,c.est-slot.budget),under=Math.max(0,slot.budget-c.est);
        const fit=Math.min(.45,under/Math.max(50,slot.budget)*.45)-Math.min(.65,over/Math.max(50,slot.budget)*.65);
        feasible.push({...c,adjusted:c.utility+fit-penalty});
      }
      feasible.sort((a,b)=>b.adjusted-a.adjusted||b.historicalScore-a.historicalScore||a.est-b.est);
      let c=feasible[0];
      if(!c){
        const fallback=rows.filter(x=>spent+x.est<=budget).sort((a,b)=>a.est-b.est||b.utility-a.utility)[0];
        c=fallback;
      }
      if(!c)continue;
      const penalty=sameTeamPenalty(c.p,chosen,slot.r),over=Math.max(0,c.est-slot.budget),under=Math.max(0,slot.budget-c.est);
      chosen.push({...c,slot});used.add(String(c.p.id));spent+=c.est;roleSpent[slot.r]+=c.est;
      value+=c.utility+Math.min(.45,under/Math.max(50,slot.budget)*.45)-Math.min(.65,over/Math.max(50,slot.budget)*.65)-penalty;
    }
    return {budget,slots,best:{chosen,spent,value,roleSpent},complete:chosen.length===slots.length};
  }

  function applyToActiveStrategy(result){
    const s=activeStrategy();if(!s||!result?.best)return false;
    if(!s.slotTargets||typeof s.slotTargets!=='object')s.slotTargets={};
    const counts=strategySlots(s);
    for(const r of ['P','D','C','A']){
      const n=Number(counts[r])||0;
      const existing=Array.isArray(s.slotTargets[r])?s.slotTargets[r].slice():[];
      while(existing.length<n)existing.push({priority:'base',playerId:null});
      for(let i=0;i<n;i++)if(!existing[i])existing[i]={priority:'base',playerId:null};
      result.best.chosen.filter(x=>x.slot.r===r).forEach(x=>{
        const old=existing[x.slot.i]||{priority:'base',playerId:null};
        existing[x.slot.i]={priority:old.priority||'base',playerId:x.p.id};
      });
      s.slotTargets[r]=existing;
    }
    if(typeof brainExpandedId!=='undefined')brainExpandedId=s.id;
    if(typeof persist==='function')persist();
    if(typeof renderBrain==='function')renderBrain();
    return true;
  }

  function setBusy(btn,busy){
    if(!btn)return;
    btn.disabled=busy;btn.classList.toggle('magic-wand-running',busy);btn.setAttribute('aria-busy',busy?'true':'false');btn.textContent=busy?'✨':'🪄';
  }

  function runWand(sourceButton){
    const btn=sourceButton||document.getElementById('magicWandFixed')||document.querySelector('.magic-wand-btn');
    if(!current){alert('Apri prima un’asta.');return;}
    if(btn?.disabled)return;
    setBusy(btn,true);playersCache=null;priceCache=new Map();
    requestAnimationFrame(()=>setTimeout(()=>{
      try{
        const s=activeStrategy();
        if(!s){alert('Nessuna strategia attiva.');return;}
        const result=optimize(s);
        if(!result?.best?.chosen?.length){alert('Non ci sono giocatori disponibili per compilare gli slot rimasti.');return;}
        if(!applyToActiveStrategy(result))alert('Non è stato possibile scrivere la proposta negli slot della strategia attiva.');
        else if(!result.complete)console.warn('Bacchetta Magica: completamento parziale per limiti reali di giocatori/budget.',result);
      }catch(e){console.error('Bacchetta Magica',e);alert('Errore Bacchetta Magica: '+(e?.message||e));}
      finally{setBusy(btn,false);}
    },20));
  }

  window.runMagicWand=runWand;

  function inject(){
    const version=document.querySelector('.app-version');if(version)version.textContent=VERSION;
    const brain=document.getElementById('brain');if(!brain)return;
    const head=brain.querySelector('.h2')?.parentElement;if(!head)return;
    let btn=head.querySelector('.magic-wand-btn');
    if(!btn){
      btn=document.createElement('button');btn.type='button';btn.className='magic-wand-btn';btn.textContent='🪄';btn.title='Compila automaticamente gli slot';btn.setAttribute('aria-label','Compila automaticamente gli slot');
      btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();runWand(btn);});head.appendChild(btn);
    }
  }

  function style(){
    if(document.getElementById('magicWandStyle'))return;
    const s=document.createElement('style');s.id='magicWandStyle';
    s.textContent=`
      .magic-wand-btn{width:42px;height:42px;flex:0 0 42px;border:1px solid #dfe4e9;border-radius:13px;background:#fff;font-size:23px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(20,30,45,.06);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
      .magic-wand-btn:active{transform:scale(.92)}
      .magic-wand-btn.magic-wand-running{animation:magicWandPulse .72s ease-in-out infinite;box-shadow:0 0 0 6px rgba(8,120,79,.10),0 3px 14px rgba(8,120,79,.20);background:#f2fbf7}
      .magic-wand-btn:disabled{cursor:wait}
      #magicWandFixed.magic-wand-running{animation:magicWandPulse .72s ease-in-out infinite;box-shadow:0 0 0 7px rgba(8,120,79,.11),0 4px 16px rgba(8,120,79,.22);background:#f2fbf7}
      @keyframes magicWandPulse{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.10) rotate(8deg)}}
    `;
    document.head.appendChild(s);
  }

  function start(){
    style();inject();
    const oldRender=window.renderBrain;
    if(typeof oldRender==='function'&&!oldRender.__magicWandWrappedV5){
      window.renderBrain=function(){
        const original=window.brainSlotPlayers;
        if(typeof original==='function'){
          window.brainSlotPlayers=function(role,priority){
            const base=original(role,priority)||[];
            const s=activeStrategy();
            const targets=s?.slotTargets?.[role]||[];
            const sold=soldIds();
            const extra=[];
            for(const t of targets){
              if((t?.priority||'base')!==priority||t?.playerId==null||sold.has(String(t.playerId)))continue;
              const p=players().find(x=>String(x.id)===String(t.playerId));
              if(p&&!base.some(x=>String(x.id)===String(p.id)))extra.push(p);
            }
            return [...base,...extra];
          };
        }
        try{return oldRender.apply(this,arguments);}finally{if(original)window.brainSlotPlayers=original;inject();}
      };
      window.renderBrain.__magicWandWrappedV5=true;
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  window.refreshApp=function(){
    const btn=document.getElementById('refreshAppBtn');
    if(btn){btn.disabled=true;btn.classList.add('loading');btn.setAttribute('aria-label','Aggiornamento in corso');}
    window.location.replace(window.location.pathname+'?update='+Date.now());
  };
})();
