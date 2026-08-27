(() => {
  'use strict';
  const KEY='danpcArcadeScoresV1';
  function all(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return {}}}
  function player(){return new URLSearchParams(location.search).get('player')||localStorage.getItem('danpcPlayerName')||'PLAYER'}
  function record(game,score,display,detail=''){
    const numeric=Number(score);if(!game||!Number.isFinite(numeric))return;
    const data=all(),rows=data[game]||[],entry={name:player().trim().slice(0,18)||'PLAYER',score:numeric,display:String(display??numeric),detail:String(detail),at:Date.now()};
    rows.push(entry);rows.sort((a,b)=>b.score-a.score||a.at-b.at);data[game]=rows.slice(0,10);localStorage.setItem(KEY,JSON.stringify(data));return entry;
  }
  window.DanArcadeScores={record,list:(game)=>(all()[game]||[]),player};
})();
