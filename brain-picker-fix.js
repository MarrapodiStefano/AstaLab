/* Brain player picker fix v3.4.46
   Mostra tutti gli obiettivi della stessa appetibilità e aggiunge
   un piccolo pulsante Scheda accanto al giocatore selezionato negli slot Brain.
*/
(function(){
'use strict';
const VERSION='3.4.46';

function sameId(a,b){
  return String(a)===String(b);
}

function isObjective(id){
  const list=current?.objectives;
  if(!Array.isArray(list)) return false;
  return list.some(x=>sameId(x,id));
}

function priorityOf(id){
  const map=current?.objectivePriorities||{};
  return map[id] || map[String(id)] || map[Number(id)] || 'low';
}

function soldIds(){
  const sold=new Set();
  (current?.teams||[]).forEach(t=>(t.players||[]).forEach(p=>sold.add(String(p.id))));
  return sold;
}

function fixedBrainSlotPlayers(role,priority){
  const sold=soldIds();
  return allPlayers()
    .filter(p=>{
      if(p.role!==role) return false;
      if(sold.has(String(p.id))) return false;
      if(!isObjective(p.id)) return false;
      return priorityOf(p.id)===priority;
    })
    .sort((a,b)=>Number(b.appeal||0)-Number(a.appeal||0)||String(a.name||'').localeCompare(String(b.name||''),'it'));
}

function addSheetButtons(){
  const brain=document.getElementById('brain');
  if(!brain || typeof activeBrainStrategy!=='function') return;
  const strategy=activeBrainStrategy();
  if(!strategy) return;

  brain.querySelectorAll('.brain-slot').forEach(slot=>{
    const playerBtn=slot.querySelector('.brain-slot-player.has-player');
    if(!playerBtn || slot.querySelector('.brain-slot-sheet-btn')) return;

    const onclick=playerBtn.getAttribute('onclick')||'';
    const match=onclick.match(/openBrainSlotPlayerPicker\(\s*\d+\s*,\s*['\"]([PDCA])['\"]\s*,\s*(\d+)/);
    if(!match) return;

    const role=match[1];
    const index=Number(match[2]);
    const target=strategy.slotTargets?.[role]?.[index];
    const playerId=target?.playerId ?? null;
    if(playerId==null) return;

    const player=allPlayers().find(p=>sameId(p.id,playerId));
    if(!player) return;

    const btn=document.createElement('button');
    btn.type='button';
    btn.className='brain-slot-sheet-btn';
    btn.textContent='ⓘ';
    btn.title='Apri scheda giocatore';
    btn.setAttribute('aria-label','Apri scheda di '+(player.name||'giocatore'));
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      if(typeof openPlayer==='function') openPlayer(player.id,'brain');
    });

    playerBtn.insertAdjacentElement('afterend',btn);
  });
}

function addStyles(){
  if(document.getElementById('brainPickerFixStyle')) return;
  const style=document.createElement('style');
  style.id='brainPickerFixStyle';
  style.textContent=`
    .brain-slot-sheet-btn{
      width:42px;
      height:42px;
      flex:0 0 42px;
      margin-left:6px;
      border:1px solid #dfe4e9;
      border-radius:13px;
      background:#fff;
      color:#68758a;
      font-size:22px;
      font-weight:700;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    .brain-slot-sheet-btn:active{transform:scale(.94)}
    .brain-slot-sheet-btn:focus-visible{outline:2px solid currentColor;outline-offset:2px}
  `;
  document.head.appendChild(style);
}

function install(){
  if(typeof allPlayers!=='function') return false;
  window.brainSlotPlayers=fixedBrainSlotPlayers;
  addStyles();
  addSheetButtons();
  const v=document.querySelector('.app-version');
  if(v) v.textContent=VERSION;
  return true;
}

function wrapRender(){
  if(typeof window.renderBrain!=='function' || window.renderBrain.__brainPickerFixWrapped) return;
  const original=window.renderBrain;
  window.renderBrain=function(){
    const result=original.apply(this,arguments);
    setTimeout(addSheetButtons,0);
    return result;
  };
  window.renderBrain.__brainPickerFixWrapped=true;
}

function boot(){
  install();
  wrapRender();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    install();
    wrapRender();
    if(tries>=40) clearInterval(timer);
  },100);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
