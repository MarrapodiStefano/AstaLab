/* Analisi 2025/26 Centrale Asta — sorgente unica Fantacalcio */
(function(){
  'use strict';

  const SEASON='2025-2026';
  const ROLE_LABEL={P:'Portieri',D:'Difensori',C:'Centrocampisti',A:'Attaccanti'};

  function normName(v){
    return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  }

  function seasonRows(){
    return Array.isArray(window.HISTORICAL_DATA?.seasons?.[SEASON])
      ? window.HISTORICAL_DATA.seasons[SEASON]
      : [];
  }

  const rows=seasonRows();
  const byId=new Map();
  const byNameRole=new Map();
  const byName=new Map();
  const norms={P:{g:0,a:0,fm:0},D:{g:0,a:0,fm:0},C:{g:0,a:0,fm:0},A:{g:0,a:0,fm:0}};

  rows.forEach(p=>{
    if(p?.id!=null)byId.set(String(p.id),p);
    const n=normName(p?.name),r=String(p?.role||'').toUpperCase();
    if(n&&r&&!byNameRole.has(n+'|'+r))byNameRole.set(n+'|'+r,p);
    if(n&&!byName.has(n))byName.set(n,p);
    if(!norms[r])return;
    const pv=Number(p.pv)||0;
    const g=pv>0?(Number(p.gf)||0)/pv:0;
    const a=pv>0?(Number(p.ass)||0)/pv:0;
    const fm=p.fm==null?0:Number(p.fm);
    norms[r].g=Math.max(norms[r].g,g);
    norms[r].a=Math.max(norms[r].a,a);
    norms[r].fm=Math.max(norms[r].fm,fm);
  });

  function findSeasonPlayer(player){
    const id=player?.id;
    if(id!=null){const exact=byId.get(String(id));if(exact)return exact;}
    const role=String(player?.role||'').toUpperCase();
    const name=normName(player?.name);
    if(!name)return null;
    const exactRole=byNameRole.get(name+'|'+role);
    if(exactRole)return exactRole;
    /* Fallback per nome: copre anche i cambi ruolo già verificati. */
    return byName.get(name)||null;
  }

  function rate(row,field){
    const pv=Number(row?.pv)||0;
    return pv>0?(Number(row?.[field])||0)/pv:0;
  }

  function score10(value,max){
    if(!(max>0)||!(value>0))return 0;
    return Math.max(0,Math.min(10,(value/max)*10));
  }

  function playerHistory(player){
    const p=findSeasonPlayer(player);
    if(!p)return {
      found:false,season:SEASON,name:player?.name||'',role:player?.role||'',
      pv:0,mv:null,fm:null,gf:0,gs:null,ass:0,amm:null,esp:null,au:null,
      goalRate:0,assistRate:0,goalScore:0,assistScore:0,formScore:0
    };

    const role=String(player?.role||p?.role||'').toUpperCase();
    const pv=Number(p.pv)||0;
    const goalRate=rate(p,'gf');
    const assistRate=rate(p,'ass');
    const fm=p.fm==null?null:Number(p.fm);
    const rnorm=norms[role]||norms[String(p.role||'').toUpperCase()]||{g:0,a:0,fm:0};
    return {
      found:true,season:SEASON,name:p.name||player?.name||'',role:player?.role||p.role||'',
      pv,mv:p.mv==null?null:Number(p.mv),fm,gf:Number(p.gf)||0,gs:p.gs==null?null:Number(p.gs),
      ass:Number(p.ass)||0,amm:p.amm==null?null:Number(p.amm),esp:p.esp==null?null:Number(p.esp),
      au:p.au==null?null:Number(p.au),
      goalRate,assistRate,
      goalScore:score10(goalRate,rnorm.g),
      assistScore:score10(assistRate,rnorm.a),
      formScore:score10(fm,rnorm.fm)
    };
  }

  function profile(player){
    const h=playerHistory(player);
    let historicalScore=0;
    const r=String(player?.role||h.role||'').toUpperCase();
    if(h.found && h.pv>0){
      if(r==='D')historicalScore=h.goalScore*.65+h.assistScore*.35;
      else if(r==='C')historicalScore=h.goalScore*.55+h.assistScore*.45;
      else if(r==='A')historicalScore=h.goalScore*.75+h.assistScore*.25;
      else historicalScore=h.formScore;
    }
    return {...h,goalsPerAppearance:h.goalRate,assistsPerAppearance:h.assistRate,historicalScore};
  }

  window.ASTA_HISTORICAL={
    SEASON,
    ROLE_LABEL,
    normalizeName:normName,
    playerHistory,
    profile,
    seasonRows:()=>seasonRows(),
    available:()=>rows.length>0
  };
})();
