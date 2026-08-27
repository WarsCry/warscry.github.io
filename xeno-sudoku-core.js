(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.XenoSudokuCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SECTORS=[
    {id:'scout',name:'SCOUT SIGNALS',difficulty:'EASY',start:1,end:9,target:45,color:'#8dff70'},
    {id:'navigator',name:'ORBITAL NAVIGATION',difficulty:'NORMAL',start:10,end:18,target:39,color:'#65ffe2'},
    {id:'hunter',name:'HIVE HUNTER',difficulty:'HARD',start:19,end:27,target:33,color:'#ffbd59'},
    {id:'overmind',name:'OVERMIND PROTOCOL',difficulty:'EXPERT',start:28,end:36,target:28,color:'#ff5c94'}
  ];
  const NAMES=['AWAKENING BEACON','DARK MOON RELAY','ORBITAL ECHO','CRYOGLASS CODE','NESTED SIGNAL','REACTOR WHISPER','STAR MAP FRACTURE','BIO-CORE PULSE','THE NINTH GLYPH'];
  function random(seed){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  function shuffle(items,rng){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
  function solutionFor(seed){const rng=random(seed),groups=shuffle([0,1,2],rng),rows=groups.flatMap(group=>shuffle([0,1,2],rng).map(row=>group*3+row)),stacks=shuffle([0,1,2],rng),cols=stacks.flatMap(stack=>shuffle([0,1,2],rng).map(col=>stack*3+col)),digits=shuffle([1,2,3,4,5,6,7,8,9],rng);return rows.flatMap(row=>cols.map(col=>digits[(row*3+Math.floor(row/3)+col)%9]))}
  function candidates(board,index){const row=Math.floor(index/9),col=index%9,used=new Set();for(let i=0;i<9;i++){used.add(board[row*9+i]);used.add(board[i*9+col])}const br=Math.floor(row/3)*3,bc=Math.floor(col/3)*3;for(let r=0;r<3;r++)for(let c=0;c<3;c++)used.add(board[(br+r)*9+bc+c]);return[1,2,3,4,5,6,7,8,9].filter(value=>!used.has(value))}
  function countSolutions(input,limit=2){const board=[...input];let found=0;function solve(){if(found>=limit)return;let best=-1,options=null;for(let i=0;i<81;i++)if(!board[i]){const next=candidates(board,i);if(!next.length)return;if(!options||next.length<options.length){best=i;options=next;if(next.length===1)break}}if(best<0){found++;return}for(const value of options){board[best]=value;solve();board[best]=0;if(found>=limit)return}}solve();return found}
  function missionInfo(level){const safe=Math.max(1,Math.min(36,Math.floor(level)||1)),sector=SECTORS.find(item=>safe>=item.start&&safe<=item.end)||SECTORS[0],within=safe-sector.start;return{level:safe,sector,within,title:NAMES[within]}}
  function generateMission(level){const info=missionInfo(level),seed=(0x91E10DA5^Math.imul(info.level,0x9E3779B1))>>>0,rng=random(seed),solution=solutionFor(seed),puzzle=[...solution],variation=[0,1,-1,0,2,-1,1,0,-2][info.within],target=Math.max(26,info.sector.target+variation),pairs=shuffle(Array.from({length:41},(_,i)=>i),rng);let clues=81;
    for(const index of pairs){const mirror=80-index,remove=index===mirror?1:2;if(clues-remove<target)continue;const a=puzzle[index],b=puzzle[mirror];puzzle[index]=0;puzzle[mirror]=0;if(countSolutions(puzzle,2)!==1){puzzle[index]=a;puzzle[mirror]=b}else clues-=remove;if(clues<=target)break}
    if(clues>target){for(const index of shuffle(Array.from({length:81},(_,i)=>i).filter(i=>puzzle[i]),rng)){if(clues<=target)break;const old=puzzle[index];puzzle[index]=0;if(countSolutions(puzzle,2)!==1)puzzle[index]=old;else clues--}}
    return{...info,seed,solution,puzzle,clues}
  }
  return{SECTORS,NAMES,candidates,countSolutions,missionInfo,generateMission};
});
