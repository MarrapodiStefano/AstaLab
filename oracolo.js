/* ORACOLO 1.0.0 — motore Smart isolato dal Brain */
(function(){
  'use strict';
  const VERSION='3.5.6';
  let busy=false;
  let renderWrapped=false;
  const ROLE_LABEL={P:'Portieri',D:'Difensori',C:'Centrocampisti',A:'Attaccanti'};
  const PRIORITY={max:5,high:4,low:3,base:2,bet:1};

  function state(){return JSON.parse(localStorage.getItem('AF_CURRENT')||'null');}
  function players(){return typeof window.allPlayers==='function'?window.allPlayers():[];}
  function statsFor(id){
    const db=JSON.parse(localStorage.getItem('AF_ORACOLO_STATS')||'{}');
    return db[String(id)]||null;
  }
  function myTeam(s){return (s?.teams||[]).find(t=>Number(t.id)===Number(s.myTeamId??0))||(s?.teams||[])[0];}
  function soldMap(s){
    const m=new Map();
    (s?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>m.set(String(p.id),t.id)));
    return m;
  }
  function strategy(s){return (s?.brainStrategies||[]).find(x=>Number(x.id)===Number(s.activeBrainStrategyId));}
  function slotTargets(st,role){
    const arr=Array.isArray(st?.slotTargets?.[role])?st.slotTargets[role].slice():[];
    const n=Number(st?.slots?.[role]||0);
    while(arr.length<n)arr.push({priority:'base',playerId:null});
    return arr.slice(0,n);
  }
  function slotPcts(st,role){
    const arr=Array.isArray(st?.slotAllocation?.[role])?st.slotAllocation[role].slice():[];
    const n=Number(st?.slots?.[role]||0);
    while(arr.length<n)arr.push(0);
    return arr.slice(0,n);
  }
  function playerById(id){return players().find(p=>String(p.id)===String(id));}
  function candidatePool(s,role,priority,used){
    const sold=soldMap(s);
    return players().filter(p=>p.role===role && !sold.has(String(p.id)) && !used.has(String(p.id)) && typeof window.objectivePriority==='function' && window.objectivePriority(p.id)===priority);
  }
  function score(p,s,role,remaining,used){
    const st=statsFor(p.id)||{};
    const my=myTeam(s);
    const owned=(my?.players||[]).filter(x=>x.role===role);
    const sameClub=owned.filter(x=>String(x.realTeam||x.team||'').toLowerCase()===String(p.team||'').toLowerCase()).length;
    const goals=Number(st.goals)||0, assists=Number(st.assists)||0, pres=Number(st.pres)||0, fm=Number(st.fm)||0, pmv=Number(st.pmv)||Number(p.pmv)||0;
    const price=Math.max(0,Number(p.credits)||0);
    if(price>remaining)return -Infinity;
    let v=0;
    v+=(Number(p.appeal)||0)*18;
    v+=Math.min(pres,38)*0.9;
    v+=Math.max(0,goals)*2.8;
    v+=Math.max(0,assists)*2.6;
    v+=Math.max(0,fm)*4.5;
    v+=Math.max(0,pmv)*0.05;
    v-=Math.max(0,Number(st.yellow)||0)*0.35;
    v-=Math.max(0,Number(st.red)||0)*1.5;
    v-=sameClub*9;
    const priceRatio=Number(p.pct)>0?price/(Number(s.initialCredits)||1200):0;
    v-=priceRatio*18;
    if(sameClub===0)v+=5;
    return v;
  }
  function setBudgetInput(role,index,value){
    const row=document.querySelector('.brain-role-row.role-'+role);
    const slot=row?.querySelectorAll('.brain-slot')[index];
    const input=slot?.querySelector('.brain-slot-budget-input');
    if(!input)return;
    input.value=String(Math.round(value));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function chooseForSlot(s,st,role,index,used,roleRemaining){
    const targets=slotTargets(st,role);
    const priority=(targets[index]?.priority)||'base';
    const pool=candidatePool(s,role,priority,used);
    const ranked=pool.map(p=>({p,v:score(p,s,role,roleRemaining,used)})).filter(x=>Number.isFinite(x.v)).sort((a,b)=>b.v-a.v);
    return ranked[0]?.p||null;
  }
  function applyPlayer(st,role,index,p){
    if(typeof window.updateBrainSlotAllocation==='function'){
      const pct=Number(p.pct)<=1?Number(p.pct)*100:Number(p.pct||0);
      window.updateBrainSlotAllocation(st.id,role,index,Math.max(0,Math.min(99,Math.round(pct*10)/10)));
    }
    if(typeof window.updateBrainSlotPlayer==='function')window.updateBrainSlotPlayer(st.id,role,index,p.id);
    setTimeout(()=>setBudgetInput(role,index,Number(p.credits)||0),0);
  }
  function lockPurchasedSlots(s,st){
    const mine=myTeam(s); if(!mine)return;
    const mineMap=new Map((mine.players||[]).map(p=>[String(p.id),p]));
    ['P','D','C','A'].forEach(role=>{
      const targets=slotTargets(st,role);
      const row=document.querySelector('.brain-role-row.role-'+role);
      if(!row)return;
      row.querySelectorAll('.brain-slot').forEach((slot,i)=>{
        const id=targets[i]?.playerId;
        const owned=mineMap.get(String(id));
        slot.classList.toggle('oracolo-owned',!!owned);
        if(owned){
          const budget=slot.querySelector('.brain-slot-budget-input');
          if(budget){budget.value=String(Number(owned.price??owned.credits??0));budget.disabled=true;}
          slot.querySelectorAll('input,button,select').forEach(x=>x.disabled=true);
        }else{
          slot.querySelectorAll('input,button,select').forEach(x=>x.disabled=false);
        }
      });
    });
  }
  function reconcileOpponents(s,st){
    if(busy)return;
    const sold=soldMap(s), mine=myTeam(s);
    const used=new Set();
    ['P','D','C','A'].forEach(role=>{
      const targets=slotTargets(st,role), pcts=slotPcts(st,role);
      let committed=0;
      targets.forEach((t,i)=>{
        const id=t?.playerId;
        if(id==null)return;
        const owner=sold.get(String(id));
        if(owner!=null && Number(owner)!==Number(mine?.id)){
          const planned=Number(st.allocation?.[role]||0)*(Number(s.initialCredits)||1200)/100;
          const budgets=Array.isArray(st.slotBudgets?.[role])?st.slotBudgets[role]:[];
          committed+=Number(budgets[i]??Math.round(planned*Number(pcts[i]||0)/100))||0;
          const remaining=Math.max(0,planned-committed+Number(budgets[i]??0));
          const replacement=chooseForSlot(s,st,role,i,used,remaining);
          if(replacement){
            used.add(String(replacement.id));
            busy=true;
            applyPlayer(st,role,i,replacement);
            setTimeout(()=>{busy=false;},120);
          }else{
            const key='AF_ORACOLO_WARN_'+s.id+'_'+st.id+'_'+role+'_'+i+'_'+Math.round(remaining);
            if(!sessionStorage.getItem(key)){
              sessionStorage.setItem(key,'1');
              alert('Oracolo: non trovo un sostituto della stessa appetibilità sostenibile per '+ROLE_LABEL[role]+'.\n\nModifica il budget assegnato al ruolo oppure rivedi il budget di un altro ruolo ancora disponibile.');
            }
          }
        }
      });
    });
  }
  function fillStrategy(){
    if(busy)return;
    const s=state(),st=strategy(s); if(!s||!st)return;
    busy=true;
    const used=new Set();
    const mine=myTeam(s); (mine?.players||[]).forEach(p=>used.add(String(p.id)));
    ['P','D','C','A'].forEach(role=>{
      const targets=slotTargets(st,role), pcts=slotPcts(st,role);
      const planned=Math.round((Number(s.initialCredits)||1200)*(Number(st.allocation?.[role])||0)/100);
      let committed=0;
      targets.forEach((t,i)=>{
        if(t?.playerId!=null){
          const p=playerById(t.playerId); if(p)used.add(String(p.id));
          const stored=Array.isArray(st.slotBudgets?.[role])?st.slotBudgets[role][i]:null;
          committed+=Number(stored??Math.round(planned*(Number(pcts[i])||0)/100))||0;
        }
      });
      targets.forEach((t,i)=>{
        if(t?.playerId!=null)return;
        const remaining=Math.max(0,planned-committed);
        const p=chooseForSlot(s,st,role,i,used,remaining);
        if(!p)return;
        used.add(String(p.id));
        committed+=Number(p.credits)||0;
        applyPlayer(st,role,i,p);
      });
    });
    setTimeout(()=>{busy=false; if(typeof window.renderBrain==='function')window.renderBrain();},250);
  }
  function loadStatsFromFile(){
    const input=document.createElement('input'); input.type='file'; input.accept='.csv,text/csv';
    input.onchange=()=>{
      const file=input.files?.[0]; if(!file)return;
      const reader=new FileReader();
      reader.onload=()=>{
        try{
          const lines=String(reader.result||'').split(/\r?\n/).filter(Boolean);
          if(!lines.length)throw new Error('CSV vuoto');
          const parse=line=>line.split(',').map(x=>x.trim());
          const head=parse(lines[0]); const idx={}; head.forEach((x,i)=>idx[x]=i);
          const out={};
          lines.slice(1).forEach(line=>{
            const a=parse(line),id=a[idx.Id]; if(!id)return;
            const n=k=>{const v=Number(a[idx[k]]);return Number.isFinite(v)?v:null;};
            out[String(id)]=[n('Pv'),n('Mv'),n('Fm'),n('Gf'),n('Ass'),n('Amm'),n('Esp'),n('Au'),n('Gs'),n('PMV')];
          });
          localStorage.setItem('AF_ORACOLO_STATS',JSON.stringify(out));
          alert('Statistiche caricate: '+Object.keys(out).length+' calciatori.');
        }catch(e){alert('Impossibile leggere il file statistiche. Verifica che sia il CSV della stagione precedente.');}
      };
      reader.readAsText(file,'UTF-8');
    };
    input.click();
  }
  function addButton(){
    document.querySelectorAll('.brain-strategy.expanded').forEach(card=>{
      if(card.querySelector('.oracolo-button'))return;
      const total=card.querySelector('.brain-total'); if(!total)return;
      const title=card.querySelector('.brain-strategy-name');
      const m=String(title?.getAttribute('onclick')||'').match(/toggleBrainStrategy\((\d+)\)/); if(!m)return;
      const id=Number(m[1]);
      const wrap=document.createElement('span'); wrap.className='oracolo-wrap';
      const b=document.createElement('button'); b.type='button'; b.className='oracolo-button'; b.innerHTML='<span class="oracolo-icon">🔮</span><span>Oracolo</span>';
      b.title='Consigli Smart per gli slot vuoti'; b.onclick=e=>{e.preventDefault();e.stopPropagation(); fillStrategy();};
      const s=document.createElement('button'); s.type='button'; s.className='oracolo-stats-button'; s.textContent='⚙'; s.title='Carica statistiche stagione precedente'; s.onclick=e=>{e.preventDefault();e.stopPropagation();loadStatsFromFile();};
      wrap.appendChild(b);wrap.appendChild(s);total.appendChild(wrap);
      total.dataset.oracoloStrategy=id;
    });
  }
  function style(){
    if(document.getElementById('oracoloStyle'))return;
    const css=document.createElement('style');css.id='oracoloStyle';css.textContent=`
      .brain-total{display:flex!important;align-items:center;justify-content:space-between;gap:6px;flex-wrap:nowrap!important;}
      .oracolo-wrap{display:inline-flex;align-items:center;gap:4px;margin-left:auto;flex:0 0 auto;}
      .oracolo-button{height:30px;padding:0 9px;border:1px solid rgba(93,63,145,.28);border-radius:10px;background:linear-gradient(135deg,#fff,#f2edff);color:#5b3b8f;font-weight:850;font-size:12px;display:inline-flex;align-items:center;gap:4px;box-shadow:0 2px 7px rgba(75,45,120,.12);}
      .oracolo-button:active,.oracolo-stats-button:active{transform:scale(.96);}
      .oracolo-icon{font-size:16px;line-height:1;}
      .oracolo-stats-button{width:30px;height:30px;padding:0;border:1px solid rgba(80,90,100,.18);border-radius:9px;background:#fff;font-size:13px;}
      .brain-slot.oracolo-owned>*{border-color:#28a745!important;}
      .brain-slot.oracolo-owned .brain-slot-player-info{border-color:#28a745!important;}
      .brain-slot.oracolo-owned{box-shadow:inset 0 0 0 1px rgba(40,167,69,.18);border-radius:9px;}
      .brain-slot.oracolo-owned input,.brain-slot.oracolo-owned button{cursor:default!important;}
    `;document.head.appendChild(css);
  }
  function boot(){
    style();
    if(renderWrapped)return;
    const old=window.renderBrain;
    if(typeof old==='function'){
      window.renderBrain=function(){const r=old.apply(this,arguments);setTimeout(()=>{const s=state(),st=strategy(s);if(st){reconcileOpponents(s,st);addButton();lockPurchasedSlots(s,st);}},0);return r;};
      renderWrapped=true;
      window.renderBrain();
    }else{setTimeout(boot,100);}
  }
  window.Oracolo={version:VERSION,run:fillStrategy,loadStats:loadStatsFromFile};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
