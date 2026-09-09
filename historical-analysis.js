/* Analisi storica Centrale Asta — dati 2023/24, 2024/25, 2025/26 */
(function(){
  'use strict';

  const WEIGHTS={
    '2023-2024':0.20,
    '2024-2025':0.30,
    '2025-2026':0.50
  };

  const ROLE_LABEL={P:'Portieri',D:'Difensori',C:'Centrocampisti',A:'Attaccanti'};

  function normName(v){
    return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  }

  function seasonRows(season){
    return Array.isArray(window.HISTORICAL_DATA?.seasons?.[season])
      ? window.HISTORICAL_DATA.seasons[season]
      : [];
  }

  function indexSeason(season){
    const m=new Map();
    seasonRows(season).forEach(p=>{
      const key=normName(p.name)+'|'+String(p.role||'');
      if(!m.has(key))m.set(key,p);
    });
    return m;
  }

  const indexes={};
  Object.keys(WEIGHTS).forEach(s=>indexes[s]=indexSeason(s));

  function findSeasonPlayer(player,season){
    const role=String(player?.role||'').toUpperCase();
    const name=normName(player?.name);
    if(!name)return null;
    const exact=indexes[season]?.get(name+'|'+role);
    if(exact)return exact;
    /* fallback prudente: nome contenuto solo se il ruolo coincide */
    const rows=seasonRows(season);
    return rows.find(p=>String(p.role||'').toUpperCase()===role && (normName(p.name).includes(name)||name.includes(normName(p.name))))||null;
  }

  function production(row,field){
    const pv=Number(row?.pv)||0;
    const value=Number(row?.[field])||0;
    return pv>0?value/pv:0;
  }

  function playerHistory(player){
    const out={name:player?.name||'',role:player?.role||'',seasons:{}};
    Object.keys(WEIGHTS).forEach(season=>{
      const p=findSeasonPlayer(player,season);
      out.seasons[season]=p?{
        pv:Number(p.pv)||0,
        mv:p.mv==null?null:Number(p.mv),
        fm:p.fm==null?null:Number(p.fm),
        gf:Number(p.gf)||0,
        ass:Number(p.ass)||0,
        gs:p.gs==null?null:Number(p.gs),
        rp:p.rp==null?null:Number(p.rp),
        rc:p.rc==null?null:Number(p.rc),
        rg:p.rg==null?null:Number(p.rg),
        rs:p.rs==null?null:Number(p.rs),
        amm:p.amm==null?null:Number(p.amm),
        esp:p.esp==null?null:Number(p.esp),
        au:p.au==null?null:Number(p.au),
        goalRate:production(p,'gf'),
        assistRate:production(p,'ass')
      }:null;
    });
    return out;
  }

  function weightedProduction(history,field){
    let score=0,weight=0;
    Object.entries(WEIGHTS).forEach(([season,w])=>{
      const row=history.seasons[season];
      if(!row || !(Number(row.pv)>0))return;
      const key=field==='gf'?'goalRate':'assistRate';
      score+=Number(row[key]||0)*w;
      weight+=w;
    });
    return weight?score/weight:0;
  }

  /* API pubblica: la fase attuale conserva MV/FM ma il punteggio storico
     Gol/Assist usa produzione per presenza e i pesi 20/30/50 già stabiliti. */
  function profile(player){
    const h=playerHistory(player);
    return {
      ...h,
      goalsPerAppearance:weightedProduction(h,'gf'),
      assistsPerAppearance:weightedProduction(h,'ass')
    };
  }

  window.ASTA_HISTORICAL={
    WEIGHTS,
    ROLE_LABEL,
    normalizeName:normName,
    playerHistory,
    profile,
    seasonRows,
    available:()=>!!window.HISTORICAL_DATA
  };
})();
