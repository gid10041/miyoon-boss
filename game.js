/* ===== 게임 로직 (data.js를 먼저 불러온 뒤 실행) ===== */
const $=s=>document.querySelector(s), ui=$('#ui'), TOUCH=matchMedia('(hover:none)').matches;
const OK={}; let G, msgQ=[], msgDone=null;
const preload=src=>new Promise(r=>{if(!src)return r();const im=new Image();im.onload=()=>{OK[src]=1;r()};im.onerror=()=>r();im.src=src;});
const art=src=>src&&OK[src]?src:null;
const alive=c=>c.hp>0, rnd=(a,b)=>a+Math.random()*(b-a);
/* ----- 대화 텍스트: 이름 색칠 + 데미지 숫자 볼드 ----- */
const NAME_RE=new RegExp(Object.keys(NAME_COLORS).join('|'),'g');
const colorize=t=>t.replace(NAME_RE,n=>`<span style="color:${NAME_COLORS[n]}">${n}</span>`);
const fmt=t=>colorize(t).replace(/(\d+)(?=의 데미지)/g,'<b>$1</b>');
/* ----- 상태 효과: 목록에 {k,from,to}(절대 턴 번호)로 저장 ----- */
const addSt=(list,k,f)=>list.push({k,from:G.turn+f.from,to:G.turn+f.to});
const has=(list,k)=>list.some(s=>s.k===k&&s.from<=G.turn&&G.turn<=s.to);
const canAct=c=>c.hp>0&&!c.panic;
const atkOf=c=>c.atk*(has(c.st,'weak')?FX.summonDebuff.atk:1);
const dodgeOf=c=>Math.min(.9,(c.dodge||0)+(has(c.st,'dodge')?FX.coffee.dodge:0));
const liveAnimals=()=>G.animals.filter(a=>a.hp>0);
function syncPanic(c){ // HP가 panicAt 이하면 패닉(행동불능), 회복하면 해제. 새로 바뀌면 메시지 반환
  if(!c.panicAt) return null;
  const p=c.hp>0&&c.hp/c.maxHp<=c.panicAt;
  if(p&&!c.panic){c.panic=true;sfx('panic');return `${c.name}은(는) 공포에 질려 패닉에 빠졌다! 더는 움직일 수 없다...`;}
  if(!p&&c.panic){c.panic=false;return c.hp>0?`${c.name}은(는) 간신히 정신을 차렸다.`:null;}
  return null;
}

function setupArt(){
  const set=(id,src)=>{$(id).style.backgroundImage=src?`url(${src})`:'';};
  const p2=!!(G&&G.phase===2); // 2페이즈 이미지가 없으면 1페이즈 이미지를 그대로 사용
  set('#bgL',(p2&&art(ART.bg2))||art(ART.bg));
  set('#atkL',(p2&&art(ART.starAttack2))||art(ART.starAttack));
  [[p2&&art(ART.starP2)?'starP2':'star1','#star1'],['star2','#star2']].forEach(([k,id])=>{
    set(id,art(ART[k]));$(id).style.transformOrigin=STAR_PIVOT[k];$(id).style.display=art(ART[k])?'':'none';
  });
  $('.ph').classList.toggle('off',!!art(ART.boss));
  $('#bossbar').classList.toggle('on',CONFIG.SHOW_BOSS_HP);
}
function init(){
  G={turn:1,phase:1,p2n:0,recalled:[],boss:BOSS.maxHp,idx:0,cmds:[],over:false,back:null,cur:null,
     bossSt:[],animals:[],
     p:PARTY.map(d=>({...d,hp:d.maxHp,mp:d.maxMp,def:false,panic:false,st:[],items:d.items.map(i=>({...i}))}))};
  msgQ=[];Ending.reset();$('#cover').style.display='none';$('#game').classList.remove('thump','recalling','finale','drone','vanish');bgmDuck(false);stopNoise();bgm('p1');{const b=document.getElementById('blackout');if(b)b.remove();}$('#recall').className='';$('#recall').innerHTML='';
  setupArt();render();startTurn();
}
/* ===== 화면 갱신 ===== */
const firstArt=(A,keys)=>{for(const k of keys){const s=art(A[k]);if(s)return s;}return null;};
function portrait(c){ // 우선순위: 피격 > 쓰러짐 > 패닉 > 힘들어함 > 평소 (피격은 HP 30% 이하면 weakHit, 패닉이면 panicHit 전용 이미지)
  const A=ART[c.id],low=c.hp/c.maxHp<=0.3,weak=c.hp>0&&low;
  if(c.hit){const s=firstArt(A,(c.panic||c.hitAsPanic)?['panicHit','ko','weakHit','hit']:c.shock?['shockHit','shock','ko','weakHit','hit']:low?['weakHit','hit']:['hit']);if(s)return s;} // hitAsPanic: 패닉 중에 맞은 경우(맞고 쓰러져 패닉이 풀려도 panicHit 유지)
  if(c.hp<=0&&art(A.ko)) return art(A.ko);
  if(c.shock){const s=firstArt(A,['shock','ko']);if(s)return s;} // 바다 회상 뒤 행동불능(전용 이미지가 없으면 ko 이미지)
  if(c.panic&&art(A.panic)) return art(A.panic);
  if(weak&&art(A.weak)) return art(A.weak);
  return art(A.normal);
}
const bossWeak=()=>G.boss/BOSS.maxHp<=BOSS_WEAK_AT;
function bossImg(hit){ // 현재 페이즈·HP에 맞는 미윤 이미지 (없으면 다음 후보로 대체)
  const r=G.boss/BOSS.maxHp;let k;
  if(G.phase===2){const low=r<=P2.weakAt;
    k=hit?(low?['boss2WeakHit','boss2Hit','bossWeakHit','bossHit']:['boss2Hit','bossWeakHit','bossHit'])
         :(low?['boss2Weak','boss2','bossWeak','boss']:['boss2','bossWeak','boss']);
  }else{const w=bossWeak();k=hit?(w?['bossWeakHit','bossHit']:['bossHit']):(w?['bossWeak','boss']:['boss']);}
  return firstArt(ART,k);
}
function setBossArt(){
  const set=(id,src)=>{$(id).style.backgroundImage=src?`url(${src})`:'';};
  set('#bossL',bossImg(false));
  set('#bossHitL',bossImg(true));
}
const pc=v=>Math.round(Math.abs(v-1)*100);
const SPEC={ // 받는 효과만 간단히 (스킬 이름 제외). 수치는 FX 값에서 자동 계산
  weak:()=>[`공격력 -${pc(FX.summonDebuff.atk)}%`,`받는 피해 +${pc(FX.summonDebuff.takeMul)}%`],
  dodge:()=>[`회피 +${Math.round(FX.coffee.dodge*100)}%`],
  dominate:()=>[`공격력 -${pc(FX.dominate.atk)}%`,`받는 피해 +${pc(FX.dominate.def)}%`],
  bind:()=>['행동 불가']
};
const chips=list=>list.filter(s=>s.to>=G.turn).flatMap(s=>{
  const n=s.from>G.turn?`다음 턴부터 ${s.to-s.from+1}턴`:`${s.to-G.turn+1}턴`;
  return SPEC[s.k]().map(t=>`${t}(${n})`);
}).map(t=>`<span class="chip">${t}</span>`).join('');
const passives=c=>[c.dodge?`회피 ${Math.round(c.dodge*100)}%`:'',c.guard?`받는 피해 -${Math.round(c.guard*100)}%`:'',
  ...(c.tags||[])].filter(Boolean);
function render(){
  setBossArt();
  $('#bossHp').style.width=Math.max(0,G.boss/BOSS.maxHp*100)+'%';
  $('#bossSt').innerHTML=chips(G.bossSt);
  $('#animals').innerHTML=liveAnimals().length?G.animals.map((a,k)=>
    `<div class="an ${a.hp<=0?'dead':''}"><span>소동물${k+1}</span><div class="bar hp"><i style="width:${a.hp/ANIMAL.hp*100}%"></i></div></div>`).join(''):'';
  const cs=G.p.map(c=>({c,src:portrait(c),weak:c.hp>0&&c.hp/c.maxHp<=0.3}));
  $('#portraits').innerHTML=cs.map(({c,src,weak})=>src?
    `<div class="pl ${c.hp<=0&&!art(ART[c.id].ko)?'ko':''} ${weak?'weak':''}" style="background-image:url(${src})"></div>`:'').join('');
  $('#party').innerHTML=cs.map(({c,src,weak},i)=>
    `<div class="m ${src?'':'noart'} ${G.cur===i?'cur':''} ${c.hp<=0?'ko':''} ${c.hit?'hit':''} ${c.skillFx?'skill':''} ${art(ART[c.id].hit)?'':'nohitart'}" id="m${i}" style="left:${c.x/9}%;--c:${c.color}">
     <div class="chips">${chips(c.st)}</div>
     <div class="passives">${passives(c).map(p=>`<span>${p}</span>`).join('')}</div>
     ${src?'':`<div class="ic">${c.icon}</div>`}
     <div class="rows"><div class="row">HP<div class="bar hp"><i style="width:${c.hp/c.maxHp*100}%"></i></div></div>
     <div class="row">MP<div class="bar mp"><i style="width:${c.mp/c.maxMp*100}%"></i></div></div></div></div>`).join('');
  $('#back').disabled=!G.back;
}
/* ===== 1초 연출: 아군 피격 초상화 / 미윤 피격 초상화 / 미윤 공격 이펙트 (연속으로 맞아도 매번 1초 유지) ===== */
const TM={};
function flashHit(i){
  sfx('ally_hit');const g=G,c=G.p[i];c.hit=true;render();
  clearTimeout(TM['h'+i]);
  TM['h'+i]=setTimeout(()=>{if(g!==G)return;c.hit=false;c.hitAsPanic=false;render();},HIT_MS);
}
function flashAttack(){
  const el=$('#atkL');el.classList.add('on');
  clearTimeout(TM.atk);TM.atk=setTimeout(()=>el.classList.remove('on'),HIT_MS);
}
function flashBossHit(){
  const w=$('#bossWrap'),h=$('#bossHitL'),b=$('#bossL');
  w.classList.add('hit');setTimeout(()=>w.classList.remove('hit'),120);
  setBossArt();
  if(!bossImg(true)) return;
  h.classList.add('on');b.style.opacity=0;
  clearTimeout(TM.boss);
  TM.boss=setTimeout(()=>{h.classList.remove('on');b.style.opacity='';},HIT_MS);
}
/* ===== 스킬 연출: 스킬 초상화(맨 위 레이어) + 전체 화면 이펙트, 각 1초 ===== */
function flashSkill(i){
  const c=G.p[i],A=ART[c.id],low=c.hp/c.maxHp<=0.3;
  const src=firstArt(A,low?['weakSkill','skill']:['skill']),el=$('#skillPortrait');
  if(!src) return;
  el.style.backgroundImage=`url(${src})`;el.classList.add('on');
  clearTimeout(TM.skill);TM.skill=setTimeout(()=>el.classList.remove('on'),SKILL_MS);
  const gm=G;c.skillFx=true;render();clearTimeout(TM['s'+i]);
  TM['s'+i]=setTimeout(()=>{if(gm!==G)return;c.skillFx=false;render();},SKILL_MS);
}
function playVfx(type,color,sparkle){
  if(!type) return;
  if(type==='burst'||type==='diamonds') return playCanvasVfx($('#fx'),type,color||'#fff',sparkle,SKILL_MS); // vfx.js
  const w=document.createElement('div');w.className='vfx';w.style.setProperty('--c',color||'#fff');
  if(type==='vignette') w.classList.add('vig');
  else if(type==='slash'){
    for(let k=0;k<16;k++){const l=document.createElement('i');l.className='slash';
      l.style.cssText=`top:${rnd(-5,100).toFixed(1)}%;--d:${Math.round(rnd(0,700))}ms;--h:${rnd(.3,1.3).toFixed(2)}`;w.appendChild(l);}
  }
  $('#fx').appendChild(w);setTimeout(()=>w.remove(),SKILL_MS+100);
}
function pop(el,text,color){
  const r=el.getBoundingClientRect(),g=$('#game').getBoundingClientRect(),d=document.createElement('div');
  d.className='pop';d.textContent=text;d.style.color=color;
  d.style.left=(r.left-g.left+r.width/2-16)+'px';d.style.top=(r.top-g.top+r.height/3)+'px';
  $('#game').appendChild(d);setTimeout(()=>d.remove(),900);
}
function delta(i,kind,n){ // 아군 HP(빨강)/MP(파랑) 변화 수치를 HP바 위쪽에 띄움
  const el=$('#m'+i);if(!n||!el)return;
  const r=el.getBoundingClientRect(),g=$('#game').getBoundingClientRect(),d=document.createElement('div');
  d.className='pop sm';d.textContent=(n>0?'+':'')+n;d.style.color=kind==='hp'?'#ff4d5a':'#4da3ff';
  d.style.left=(r.left-g.left+r.width*(kind==='hp'?.18:.6))+'px';d.style.top=(r.top-g.top+r.height*.55)+'px';
  d.style.animationDuration=DELTA_MS+'ms';
  $('#game').appendChild(d);setTimeout(()=>d.remove(),DELTA_MS);
}
/* ===== 대화창: 화면 아무 곳이나 좌클릭(터치)하면 진행 ===== */
function say(lines,done){
  G.cur=null;G.back=null;render();
  msgQ=lines.map(l=>typeof l==='string'?[l,'k']:l);msgDone=done;showMsg();
}
function showMsg(){ // 줄 = [글, 색('k' 검정·흰 글씨 / 'b' 파랑 / '#rrggbb' 직접 지정), 자동으로 넘어갈 ms(선택)]
  clearTimeout(TM.auto);
  const cur=msgQ[0],[t,c,auto]=cur,st=c&&c[0]==='#'?` style="color:${c}"`:'';
  const body=c&&c!=='k'?t.replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])):fmt(t); // 색이 지정된(화자) 줄은 글 안의 이름을 따로 색칠하지 않음
  ui.innerHTML=`<div class="panel dlg"><span class="${c==='b'?'blue':''}"${st}>${body}</span><span class="tip">▼</span></div>`;
  if(auto){const g=G;TM.auto=setTimeout(()=>{if(g===G&&msgQ[0]===cur)advance();},auto);}
}
function advance(){
  clearTimeout(TM.auto);msgQ.shift();
  if(msgQ.length) showMsg(); else {const f=msgDone;msgDone=null;ui.innerHTML='';f&&f();}
}
const msgLocked=()=>!!(msgQ[0]&&msgQ[0][2]); // 자동으로 넘어가는 줄이 나오는 동안은 클릭/키로 넘길 수 없음
$('#game').addEventListener('click',e=>{
  if(!msgQ.length||G.over||msgLocked()||e.target.closest('.btn,#back,#gear,#settings')) return;
  advance();
});
/* ===== 키보드 조작: Enter/Space = 왼쪽 클릭, 방향키 = 버튼 이동 (미니게임 중에는 mini.js가 담당) ===== */
let kbMode=false,swallowSpace=false;
window.addEventListener('keydown',()=>{kbMode=true;},true);
window.addEventListener('pointerdown',()=>{kbMode=false;},true);
function focusFirst(){ // 키보드로 조작 중이면 새 메뉴의 첫 버튼에 포커스
  if(!kbMode) return;
  const b=ui.querySelector('.btn:not(.off)')||ui.querySelector('.btn');
  if(b) b.focus({preventScroll:true});
}
function navKey(dir){
  const els=[...document.querySelectorAll('#ui .btn,#back:not(:disabled)')];
  if(!els.length) return false;
  const cur=els.indexOf(document.activeElement);
  if(cur<0){const f=els.find(e=>e.classList.contains('btn')&&!e.classList.contains('off'))||els[0];f.focus({preventScroll:true});return true;}
  const r=els[cur].getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let best=null,bs=1e9;
  els.forEach((e,k)=>{
    if(k===cur) return;
    const q=e.getBoundingClientRect(),dx=q.left+q.width/2-cx,dy=q.top+q.height/2-cy;
    const along=dir==='L'?-dx:dir==='R'?dx:dir==='U'?-dy:dy,across=(dir==='L'||dir==='R')?Math.abs(dy):Math.abs(dx);
    if(along<=1) return;
    const sc=along+across*2;if(sc<bs){bs=sc;best=e;}
  });
  if(best) best.focus({preventScroll:true});
  return true;
}
window.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||document.body.classList.contains('mini-on')) return;
  if(e.key==='Escape'&&$('#settings').classList.contains('on')){$('#settings').classList.remove('on');return;} // 설정창 닫기
  if(e.target.closest&&e.target.closest('#settings,#gear')) return;
  if(e.key==='Escape'||e.key==='Backspace'){          // 오른쪽 클릭처럼 되돌아가기(↩ 버튼과 동일)
    e.preventDefault();
    const bk=$('#back');if(!e.repeat&&!G.over&&!bk.disabled)bk.click();
    return;
  }
  if(e.key==='Enter'||e.key===' '){
    if(e.repeat){e.preventDefault();return;}          // 꾹 눌러도 연속 클릭되지 않게
    if(msgQ.length&&!G.over){e.preventDefault();if(msgLocked())return;swallowSpace=e.key===' ';advance();}
    return;                                            // 버튼에 포커스가 있으면 기본 동작(클릭)
  }
  const d={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D'}[e.key];
  if(d&&!G.over&&navKey(d)) e.preventDefault();
},true);
window.addEventListener('keyup',e=>{if(e.key===' '&&swallowSpace){swallowSpace=false;e.preventDefault();}},true);
/* ===== 턴 진행 ===== */
function startTurn(){
  G.p.forEach(c=>{c.def=false;c.st=c.st.filter(s=>s.to>=G.turn);});
  G.bossSt=G.bossSt.filter(s=>s.to>=G.turn);G.idx=0;G.cmds=[];
  if(G.phase===2) G.p2n++;
  const L=G.phase===2?[...BOSS2_LINES[Math.min(G.p2n-1,BOSS2_LINES.length-1)]]:[BOSS_LINES[Math.min(G.turn-1,BOSS_LINES.length-1)]];
  if(isKillTurn()) L.push(...P2_OMEN);
  G.p.forEach(c=>{if(c.panic&&c.hp>0)L.push(`${c.name}은(는) 패닉에 빠져 움직이지 못한다...`);});
  say(L,()=>chooseFor(0));
}
function nextAlive(i,d){while(i>=0&&i<3&&!canAct(G.p[i]))i+=d;return i;}
function chooseFor(i){
  i=nextAlive(i,1);
  if(i>=3) return execute();
  G.idx=i;G.cur=i;G.cmds[i]=null;showMain(i);
}
function backFrom(i){const j=nextAlive(i-1,-1);return j>=0?()=>chooseFor(j):null;}
function showMain(i){
  G.back=backFrom(i);render();
  ui.innerHTML=`<div class="main" style="display:flex;flex-direction:column;gap:1.2%;height:100%">
   <button class="btn" id="a-atk">공격</button><button class="btn" id="a-skl">스킬</button>
   <button class="btn" id="a-itm">아이템</button><button class="btn" id="a-def">방어</button>${G.phase===2?'<button class="btn" id="a-run">도망가기</button>':''}</div>`;
  ui.firstChild.className='main';ui.firstChild.style.cssText='display:flex;flex-direction:column;gap:1.2%;flex:1';
  if(G.p[i].shock){ // 행동불능(바다 회상 이후 파시아): 도망가기 외에는 무엇을 눌러도 아무것도 하지 못하고 턴이 넘어감
    ['#a-atk','#a-skl','#a-itm','#a-def'].forEach(id=>{$(id).onclick=()=>noAction(i);});
  }else{
    $('#a-atk').onclick=()=>commit(i,{t:'atk'});
    $('#a-skl').onclick=()=>showSkills(i);
    $('#a-itm').onclick=()=>showItems(i);
    $('#a-def').onclick=()=>commit(i,{t:'def'});
  }
  if(G.phase===2) $('#a-run').onclick=()=>tryEscape(i);
  focusFirst();
}
/* 도망가기: 턴을 쓰지 않고 거절 대사만 보여준 뒤 같은 메뉴로 돌아와요 */
function tryEscape(i){
  const c=G.p[i];
  if(c.shock) return fleeAsk(i,0); // 행동불능 파시아는 진짜로 도망갈 수 있음(되묻기)
  const L=G.boss/BOSS.maxHp<=P2.escapeLowAt?ESCAPE_LINES_LOW:ESCAPE_LINES; // 미윤 HP 25% 이하면 다른 대사
  say([[L[c.id],NAME_COLORS[c.name]]],()=>{G.cur=i;showMain(i);});
}
function noAction(i){ // 아무 행동도 하지 못하고 다음 캐릭터로 (G.cmds[i]는 null이라 실행 단계에서 건너뜀)
  say(['하지만 아무것도 하지 못했다.'],()=>chooseFor(i+1));
}
function fleeAsk(i,k){ // 도망가기 되묻기: FLEE_ASK를 차례로 묻고, 매번 [도망간다]를 고르면 엔딩3. [돌아간다]/↩ 는 메뉴로 돌아감
  say([[FLEE_ASK[k],'k']],()=>{
    G.cur=i;G.back=()=>showMain(i);render();
    ui.innerHTML='<div class="main"><button class="btn" id="f-yes">도망간다</button><button class="btn" id="f-no">돌아간다</button></div>';
    ui.firstChild.style.cssText='display:flex;flex-direction:column;gap:1.2%;flex:1';
    $('#f-yes').onclick=()=>k+1>=FLEE_ASK.length?end('flee'):fleeAsk(i,k+1);
    $('#f-no').onclick=()=>showMain(i);
    focusFirst();
  });
}
/* 선택 창: 위쪽 버튼 격자 + 아래 설명창. PC는 마우스를 올리면 설명, 터치는 한 번 누르면 설명/한 번 더 누르면 확정 */
function pickMenu(entries,hint,onPick){
  ui.innerHTML=`<div class="panel pick">${entries.map((e,k)=>`<button class="btn ${e.off?'off':''}" data-k="${k}" style="${e.color?`color:${e.color}`:''}">${e.label}</button>`).join('')}</div><div class="panel desc">${hint}</div>`;
  const desc=ui.querySelector('.desc');let sel=-1;
  ui.querySelectorAll('.btn').forEach(b=>{
    const k=+b.dataset.k,e=entries[k];
    b.onmouseenter=b.onfocus=()=>{if(!TOUCH)desc.innerHTML=colorize(e.desc);};
    b.onclick=()=>{
      if(TOUCH&&sel!==k){sel=k;desc.innerHTML=colorize(e.desc);ui.querySelectorAll('.btn').forEach(x=>x.classList.toggle('sel',x===b));return;}
      if(!e.off) onPick(k);
    };
  });
  focusFirst();
}
function showSkills(i){
  const c=G.p[i];G.back=()=>showMain(i);render();
  pickMenu(c.skills.map(s=>{
    const off=(s.fx==='bind'&&isKillTurn())||c.mp<s.mp||c.hp<=s.hp||(s.needLow&&c.hp/c.maxHp>0.6)||(s.fx==='summon'&&liveAnimals().length>=ANIMAL.count);
    return {label:s.n,off,desc:`${s.n}  (MP ${s.mp}${s.hp?` / HP ${s.hp}`:''})\n${s.desc}`};
  }),'스킬을 선택하세요.',k=>commit(i,{t:'skill',s:c.skills[k]}));
}
function showItems(i){
  const c=G.p[i];G.back=()=>showMain(i);render();
  pickMenu(c.items.map(it=>({label:`${it.n} × ${it.q}`,off:it.q<=0,desc:`${it.n}\n${it.desc}`})),
    '아이템을 선택하세요.',k=>showTargets(i,c.items[k]));
}
function showTargets(i,it){
  G.back=()=>showItems(i);render();
  pickMenu(G.p.map(t=>({label:t.name,color:NAME_COLORS[t.name],off:it.revive?t.hp>0:t.hp<=0,
    desc:`${t.name}\nHP ${t.hp}/${t.maxHp}  MP ${t.mp}/${t.maxMp}`})),
    `${it.n}을(를) 누구에게 사용할까요?`,k=>commit(i,{t:'item',it,to:k}));
}
function commit(i,cmd){G.cmds[i]=cmd;chooseFor(i+1);}
/* ===== 행동 실행 ===== */
function execute(){
  G.cur=null;G.back=null;
  const steps=G.cmds.map((cmd,i)=>cmd?()=>doAct(i,cmd):null).filter(Boolean);
  liveAnimals().forEach(()=>steps.push(animalAct));
  (function run(){
    if(G.over) return;
    if(G.boss<=0) return startFinale(); // 미윤 HP 0: 남은 행동은 중단하고 마지막 일격
    const s=steps.shift();
    if(!s) return afterActions();
    const g=G;
    Promise.resolve(s()).then(lines=>{if(g!==G||G.over)return;render();say(lines,run);}); // 미니게임이 있으면 끝난 뒤 결과 출력
  })();
}
/* 미윤 HP가 내려갈 수 있는 최저값: 1페이즈이거나 아직 안 본 회상이 남아 있으면 1에서 멈춰요(한 방에 쓰러뜨려도 2페이즈·회상을 건너뛰지 않음) */
const floorHp=()=>(G.phase===1||RECALLS.some(r=>!G.recalled.includes(r.id)))?1:0;
function hitBoss(dmg){ // 실제로 들어간 데미지를 반환
  if(has(G.bossSt,'dominate')) dmg*=FX.dominate.def;
  dmg=Math.round(dmg);G.boss=Math.max(floorHp(),G.boss-dmg);sfx('boss_hit');flashBossHit();pop($('#bossWrap'),dmg,'#ffd166');return dmg;
}
function animalAct(){
  const d=hitBoss(ANIMAL.dmg*rnd(.9,1.1));
  return [`소동물이 미윤에게 달려들었다! ${d}의 데미지.`];
}
/* 스킬 결과 처리: 미니게임 성공 여부와 상관없이 MP/HP는 소모, 실패하면 효과 없이 "빗나갔다" */
function skillResult(i,c,s,ok){
  const L=[`${c.name}의 「${s.n}」!`];
  const hp0=c.hp;c.mp-=s.mp;c.hp=Math.max(1,c.hp-(s.hp||0));
  delta(i,'mp',-s.mp);delta(i,'hp',c.hp-hp0);
  if(!ok){L.push('하지만 빗나갔다...');const pm=syncPanic(c);if(pm)L.push(pm);return L;}
  sfx('skill');flashSkill(i);playVfx(s.vfx,s.vfxColor,s.sparkle);
  if(s.fx==='summon'){
    let n=0;for(let k=0;k<ANIMAL.count;k++)if(!G.animals[k]||G.animals[k].hp<=0){G.animals[k]={hp:ANIMAL.hp};n++;}
    addSt(c.st,'weak',FX.summonDebuff);
    L.push(`소동물 ${n}마리가 나타났다! 하지만 힘을 쓴 ${c.name}은(는) 다음 2턴 동안 힘이 빠질 것 같다.`);
  }else if(s.fx==='dominate'){
    addSt(G.bossSt,'dominate',FX.dominate);
    L.push(`${c.name}의 눈빛이 미윤을 사로잡았다! 미윤의 공격력과 방어력이 크게 떨어졌다.`);
  }else if(s.fx==='bind'){
    if(Math.random()<s.rate){addSt(G.bossSt,'bind',FX.bind);L.push('늘어난 꼬리가 미윤을 휘감았다! 미윤은 움직일 수 없다.');}
    else L.push('하지만 꼬리는 미윤에게 닿지 못했다...');
  }else{
    const d=hitBoss(atkOf(c)*s.pow*rnd(.9,1.1));L.push(`미윤에게 ${d}의 데미지.`);
  }
  const pm=syncPanic(c);if(pm)L.push(pm);
  return L;
}
function doAct(i,cmd){
  const c=G.p[i];
  if(cmd.t==='def'){sfx('guard');c.def=true;return [`${c.name}은(는) 몸을 웅크려 방어 태세를 취했다.`];}
  if(cmd.t==='atk'){ // 일반공격은 미니게임 없이 바로 적용(미니게임은 스킬에만)
    sfx('atk');const d=hitBoss(atkOf(c)*rnd(.9,1.1));
    return [`${c.name}의 공격! 미윤에게 ${d}의 데미지.`];
  }
  if(cmd.t==='skill'){
    const s=cmd.s;
    if(s.fx==='dominate'&&has(G.bossSt,'dominate')) // 이미 장악 중이면 발동하지 않고 비용도 쓰지 않음
      return [`${c.name}의 「${s.n}」! 하지만 미윤은 이미 장악되어 있어 효과가 발동되지 않았다.`];
    return runMini(i,s.game,`${c.name} · ${s.n}`).then(ok=>skillResult(i,c,s,ok));
  }
  const it=cmd.it,t=G.p[cmd.to];it.q--;let msg;
  if(it.heal){const h=Math.min(it.heal,t.maxHp-t.hp);t.hp+=h;sfx('heal');delta(cmd.to,'hp',h);msg=`${t.name}의 HP가 ${h} 회복되었다.`;}
  else if(it.mp){const m=Math.min(it.mp,t.maxMp-t.mp);t.mp+=m;sfx('mp');delta(cmd.to,'mp',m);msg=`${t.name}의 MP가 ${m} 회복되었다.`;
    if(it.dodge){addSt(t.st,'dodge',FX.coffee);msg+=' 몸이 가벼워졌다!';}}
  else{sfx('revive');t.hp=it.revive;delta(cmd.to,'hp',it.revive);msg=`${t.name}이(가) 정신을 차리고 일어났다!`;}
  const L=[`${c.name}은(는) ${it.n}을(를) 사용했다. ${msg}`],pm=syncPanic(t);if(pm)L.push(pm);
  return L;
}
/* ===== 보스 턴: 일반 3회 + 전체 1회 ===== */
function afterBoss(){render();if(!G.p.some(canAct))return end('lose');G.turn++;startTurn();}
const isKillTurn=()=>G.phase===2&&G.p2n===1; // 2페이즈 첫 턴 = 전체 즉사기
function afterActions(){ // 아군 행동이 모두 끝난 뒤, 미윤 공격 직전
  if(G.phase===1) return checkRecalls(()=>{if(G.boss/BOSS.maxHp<=P2.at) enterPhase2(); else bossTurn();},P2.at); // 1페이즈 회상(50% 위쪽)을 먼저 보고 나서 2페이즈 진입
  checkRecalls(bossTurn);
}
/* ----- 마지막 일격: 미윤 HP 0 → 레이시·듀크·파시아 순서(FINAL_BLOW, data.js) → 소멸 → 엔딩2 ----- */
function startFinale(){
  G.finale=true;G.cur=null;G.back=null;
  $('#game').classList.add('finale'); // 초상화·보스 HP 바 숨김 (대화창과 공격 버튼만 남음)
  render();runFinal(0);
}
function runFinal(i){
  if(G.over) return;
  const it=FINAL_BLOW[i],next=()=>runFinal(i+1);
  if(!it) return vanishBoss();
  if(it.say) return say(it.say,next);
  if(it.btn) return finalBtn(it.btn,next);
  if(it.drone){$('#game').classList.add('drone');return next();}
  if(it.stab) return finalStab(next);
  if(it.vanish) return vanishBoss();
  next();
}
function finalBtn(o,done){ // 큰 '공격하기' 버튼 하나. 글자색은 그 캐릭터의 대표색
  const c=G.p.find(x=>x.id===o.who),col=NAME_COLORS[c.name],need=o.clicks||1;
  ui.innerHTML=`<div class="main"><button class="btn fbtn${o.tremble?' trem'+o.tremble:''}" id="f-atk" style="color:${col}"><i class="gauge" style="background:${col}"></i><span>공격하기</span></button></div>`;
  ui.firstChild.style.cssText='display:flex;flex-direction:column;gap:1.2%;flex:1';
  const b=$('#f-atk'),gauge=b.querySelector('.gauge');let n=0;
  b.onclick=()=>{
    if(b.disabled) return;
    n++;
    if(need>1) gauge.style.width=(n/need*100)+'%'; // 눌릴 때마다 게이지가 차오름
    if(n<need) return;
    b.disabled=true;
    if(o.hit){finalHit(o.who);setTimeout(done,800);} // 공격이 들어가는 연출을 보여준 뒤 다음으로
    else setTimeout(done,need>1?300:0);              // 공격하지 않음: 그냥 다음으로
  };
  focusFirst();
}
function finalHit(who){
  const fx={lacie:['slash','#e0283c'],duke:['burst','#f0d53a'],fascia:['burst','#3fbfe8']}[who];
  playVfx(fx[0],fx[1],10);flashBossHit();
  const g=$('#game');g.classList.add('shake');setTimeout(()=>g.classList.remove('shake'),400);
  sfx('final_hit');
}
function finalStab(done){ // 미윤이 파시아의 지팡이로 스스로를 찌름: 공격 이펙트 + 일러스트(있으면)
  const host=$('#recall'),game=$('#game');
  playVfx('burst','#3fbfe8',14);flashScreen();bigShake();flashBossHit();sfx('final_stab');
  const has=!!art(FINAL_ILLUST);
  if(has){host.className='on';host.innerHTML='';game.classList.add('recalling');recallShow(FINAL_ILLUST);requestAnimationFrame(()=>requestAnimationFrame(()=>host.classList.add('show')));}
  setTimeout(done,has?1000:700);
}
function vanishBoss(){ // 일러스트를 걷고, 미윤이 빛으로 흩어져 소멸한 뒤 엔딩2(임시 화면)
  const g=$('#game'),host=$('#recall');
  g.classList.remove('thump','drone');stopNoise();
  host.classList.remove('show');g.classList.remove('recalling');setTimeout(()=>{host.className='';host.innerHTML='';},600);
  ui.innerHTML='';g.classList.add('vanish');sfx('vanish');bgmStop(2400);
  [0,500,1000,1500].forEach(t=>setTimeout(()=>{if(!G.over)playVfx('diamonds','#bcd2ff',10);},t));
  setTimeout(()=>end('win'),3400);
}
/* ----- 회상씬: 조건을 만족한 안 본 회상을 at이 큰 순서대로 하나씩 재생한 뒤 done ----- */
function checkRecalls(done,above){ // above를 주면 at이 above보다 큰 회상만 확인
  const r=[...RECALLS].sort((a,b)=>b.at-a.at).find(r=>!G.recalled.includes(r.id)&&G.boss/BOSS.maxHp<=r.at&&(above==null||r.at>above));
  if(!r) return done();
  G.recalled.push(r.id);
  playRecall(r,()=>checkRecalls(done,above));
}
function bgmDuck(on){try{if(typeof window.setBgmDuck==='function')window.setBgmDuck(on);}catch(e){}} // 회상 중 브금 볼륨을 줄이는 자리(5단계에서 window.setBgmDuck(true/false) 연결)
function recallShow(src,optional){ // 일러스트 교체(이전 장면 위에 새 장면이 서서히 덮임). src가 없으면 검은 화면, optional인데 파일이 없으면 이전 일러스트 유지
  const host=$('#recall'),n=document.createElement('div'),a=src?art(src):null;
  if(src&&!a&&optional) return;
  n.className='ri'+(!src?' black':a?'':' noimg');
  if(a) n.style.backgroundImage=`url(${a})`; else if(src) n.textContent=`(회상 일러스트 없음: ${src})`;
  host.appendChild(n);
  requestAnimationFrame(()=>requestAnimationFrame(()=>n.classList.add('on')));
  setTimeout(()=>{let o=n.previousElementSibling;while(o){const q=o.previousElementSibling;o.remove();o=q;}},560); // 이 장면보다 먼저 깔린 장면만 치움(빨리 넘겨서 더 새로운 장면이 있어도 지우지 않음)
}
function playRecall(r,done){
  const host=$('#recall'),game=$('#game');
  host.className='on';host.innerHTML='';game.classList.add('recalling');bgmDuck(true);
  requestAnimationFrame(()=>requestAnimationFrame(()=>host.classList.add('show')));
  let k=0;
  const shockThen=()=>{ // 회상 끝에 캐릭터가 행동불능이 되는 경우(바다 회상): 반응 대사가 끝난 뒤 안내 대사 (행동불능 상태 자체는 회상이 끝나는 순간 이미 적용됨)
    if(!r.shock||!r.shock.lines||!r.shock.lines.length) return done();
    say(r.shock.lines,done);
  };
  const segs=r.react?(Array.isArray(r.react)?r.react:[r.react]):[];let si=0;
  const react=()=>{ // 회상이 끝난 뒤 캐릭터들의 반응 대사. 말하는 캐릭터마다 파란 테두리 + 대표색 글자(문자열 줄은 자동으로 대표색, [글,색] 줄은 지정한 색)
    if(si>=segs.length) return shockThen();
    const sg=segs[si++],ci=G.p.findIndex(c=>c.id===sg.who);
    if(ci<0||!sg.lines.length) return react();
    say(sg.lines.map(t=>typeof t==='string'?[t,NAME_COLORS[G.p[ci].name]]:t),react);
    G.cur=ci;render();
  };
  const next=()=>{
    if(k>=r.scenes.length){
      bgmDuck(false);host.classList.remove('show');game.classList.remove('recalling');
      if(r.shock){const c=G.p.find(x=>x.id===r.shock.who);if(c&&c.hp>0){c.shock=true;render();}} // 회상이 끝나는 순간 바로 행동불능 이미지로
      setTimeout(()=>{if(!host.classList.contains('show')){host.className='';host.innerHTML='';}},600);
      return react();
    }
    const sc=r.scenes[k++];recallShow(sc.img,sc.optional);
    if(sc.lines&&sc.lines.length) say(sc.lines,next); else setTimeout(next,1200);
  };
  next();
}
/* ----- 2페이즈 쿵쿵의 노이즈 알갱이: 박자 직후 잠깐 보이는 동안만 그려요 ----- */
let noiseT=0;
function stopNoise(){clearInterval(noiseT);noiseT=0;}
function startNoise(){
  stopNoise();
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const cv=$('#noise'),cx=cv.getContext('2d'),W=cv.width,H=cv.height,im=cx.createImageData(W,H),beat=60000/P2.bpm,t0=performance.now();
  noiseT=setInterval(()=>{
    let ph=((performance.now()-t0)%beat)/beat;
    try{ // 확대·노이즈 두 애니메이션이 어떤 이유로든 어긋나면 확대 박자에 맞춰 되돌리고, 알갱이도 그 박자 기준으로 그려요
      const f=(id,nm)=>$(id).getAnimations().find(a=>a.animationName===nm),a=f('#world','thumpZoom'),n=f('#noise','noisePulse');
      if(a&&n&&a.currentTime!=null&&n.currentTime!=null){
        let df=((a.currentTime-n.currentTime)%beat+beat)%beat;if(df>beat/2)df-=beat;
        if(Math.abs(df)>12) n.currentTime=a.currentTime;
        ph=(a.currentTime%beat)/beat;
      }
    }catch(e){}
    if(document.hidden||(ph>0.4&&!$('#game').classList.contains('drone'))) return;
    const d=im.data;
    for(let i=0;i<d.length;i+=4){const v=Math.random()<.5?Math.random()*90:150+Math.random()*105;d[i]=d[i+1]=d[i+2]=v;d[i+3]=200;}
    cx.putImageData(im,0,0);
    for(let k=0;k<4;k++){const y=Math.random()*H|0,h=2+Math.random()*7|0,x=Math.random()*40|0;cx.fillStyle='rgba(255,255,255,.35)';cx.fillRect(x,y,W-x,h);}
  },50);
}
function flashScreen(){const w=document.createElement('div');w.className='flash';$('#fx').appendChild(w);setTimeout(()=>w.remove(),800);}
function bigShake(){const g=$('#game');g.classList.add('shake','big');setTimeout(()=>g.classList.remove('shake','big'),650);}
function bgm(n,o){try{if(window.Snd)Snd.bgm(n,o);}catch(e){}} // BGM 시작: 'p1'(1페이즈) 'p2'(2페이즈) 'end2' 'end3' (곡 파일은 data.js 의 AUDIO.bgm)
function bgmStop(ms){try{if(window.Snd)Snd.stopBgm(ms);}catch(e){}}
function bgmWarm(a){try{if(window.Snd)Snd.warm(a);}catch(e){}}
function sfx(name){try{if(typeof window.playSfx==='function')window.playSfx(name);}catch(e){}} // 효과음 자리(5단계에서 window.playSfx 연결). 이름: 'rip' = 2페이즈 진입 때 찢어지는 소리
function enterPhase2(){ // 진입 연출. 이번 턴 미윤의 공격은 생략하고 다음 턴(전조 + 즉사기)으로 넘어감
  bgmStop(2500);bgmWarm(['p2','end2','end3']); // 미윤이 '왜 아직도 안 도망갔냐'고 할 때 1페이즈 브금 페이드 아웃
  say(P2_PRE_LINES,()=>{ // ① 아직 1페이즈 모습(이미지·배경 그대로)
    const bo=document.createElement('div');bo.id='blackout';$('#game').appendChild(bo);
    requestAnimationFrame(()=>requestAnimationFrame(()=>bo.classList.add('on'))); // ② 대화창만 남기고 서서히 암전
    say(P2_BLACK_LINES,()=>{
      sfx('rip');bgm('p2',{fade:0}); // ③ 번쩍이며 2페이즈에 들어갈 때 2페이즈 브금 시작(쿵쿵 박자는 이 곡 기준) 찢어지는 소리 + 2페이즈로 전환(암전 아래에서 이미지 교체 후 걷힘)
      G.phase=2;G.p2n=0;
      setupArt();setBossArt();render();
      const g=$('#game');g.style.setProperty('--beat',(60/P2.bpm)+'s');g.classList.add('thump');startNoise(); // 이후 계속 쿵쿵(배경·별·미윤 확대 + 노이즈)
      bigShake();flashScreen();
      bo.classList.add('fast');bo.classList.remove('on');setTimeout(()=>bo.remove(),400);
      say(P2_ENTER_LINES,()=>checkRecalls(()=>{G.turn++;startTurn();}));
    });
  });
}
function killAttack(){ // 전체 즉사기: 회피·소동물 대신 맞기 무효, 패닉 중인 캐릭터는 자동 방어, 방어하면 현재 HP의 P2.guardRatio만 잃고 버팀
  const lines=['미윤의 힘이 세계를 집어삼킬 듯 쏟아진다...!'],hitIdx=[];
  G.p.filter(alive).forEach(t=>{
    const ti=G.p.indexOf(t);let d;t.hitAsPanic=t.panic;
    if(t.def||t.panic){d=Math.min(t.hp-1,Math.floor(t.hp*P2.guardRatio));t.hp-=d;lines.push(t.def?`${t.name}은(는) 온 힘을 다해 막아내 간신히 버텼다! ${d}의 데미지를 받았다.`:`${t.name}은(는) 패닉 속에서도 본능적으로 몸을 웅크려 버텨냈다! ${d}의 데미지를 받았다.`);}
    else{d=t.hp;t.hp=0;lines.push(`${t.name}은(는) 버티지 못하고 쓰러졌다...`);}
    const pm=syncPanic(t);if(pm)lines.push(pm);
    delta(ti,'hp',-d);hitIdx.push(ti);
  });
  if(liveAnimals().length){G.animals.forEach(a=>a.hp=0);lines.push('소동물들도 휩쓸려 쓰러졌다...');}
  sfx('kill_hit');bigShake();flashAttack();hitIdx.forEach(flashHit);
  say(lines,afterBoss);
}
function bossTurn(){
  if(has(G.bossSt,'bind')) return say(['미윤은 꼬리에 묶여 움직이지 못한다!'],afterBoss);
  if(isKillTurn()) return killAttack();
  const p2=G.phase===2,D=p2?P2:BOSS;
  const all=p2?(G.p2n>1&&G.p2n%4===1):G.turn%4===0,al=G.p.filter(alive),lines=[],hitIdx=[]; // 일반 3회 + 전체 1회 (2페이즈는 즉사기 다음 턴부터 세기 시작)
  const base=(all?D.allDmg:D.normalDmg)*(has(G.bossSt,'dominate')?FX.dominate.atk:1);
  const targets=all?al:[al[Math.floor(Math.random()*al.length)]];
  lines.push(all?'미윤의 힘이 폭주한다! 제어하지 못한 힘이 모두를 덮쳤다!':'미윤의 힘이 날뛴다!');
  targets.forEach(t=>{
    const ti=G.p.indexOf(t);
    if(Math.random()<dodgeOf(t)){sfx('dodge');lines.push(`${t.name}은(는) 공격을 피했다!`);return;}
    if(!all&&ti===0&&liveAnimals().length){ // 소동물이 파시아 대신 맞는다
      const a=liveAnimals()[0],d=Math.round(base*rnd(.9,1.1));a.hp=Math.max(0,a.hp-d);
      lines.push(`소동물이 ${t.name} 앞을 막아섰다! 소동물이 ${d}의 데미지를 받았다.`+(a.hp<=0?' 소동물이 쓰러졌다...':''));
      pop($('#m0'),d,'#ff6b81');return;
    }
    t.hitAsPanic=t.panic;
    let d=base*rnd(.9,1.1);
    if(t.def)d*=.5; if(t.guard)d*=(1-t.guard); if(has(t.st,'weak'))d*=FX.summonDebuff.takeMul;
    d=Math.round(d);t.hp=Math.max(0,t.hp-d);
    lines.push(`${t.name}은(는) ${d}의 데미지를 받았다.`+(t.hp<=0?` ${t.name}은(는) 쓰러졌다...`:''));
    const pm=syncPanic(t);if(pm)lines.push(pm);
    delta(ti,'hp',-d);hitIdx.push(ti);
  });
  if(all&&liveAnimals().length){ // 전체공격은 소동물도 휩쓴다
    const d=Math.round(base*rnd(.9,1.1));liveAnimals().forEach(a=>a.hp=Math.max(0,a.hp-d));
    lines.push(`소동물들도 ${d}의 데미지를 받았다.`);
  }
  const g=$('#game');g.classList.add('shake');setTimeout(()=>g.classList.remove('shake'),350);
  sfx(all?'boss_all':'boss_atk');if(al.some(t=>t.hp<=0))sfx('ko');
  flashAttack();hitIdx.forEach(flashHit);
  say(lines,afterBoss);
}
function end(r){ // 엔딩 연출은 ending.js(Ending) 가 data.js 의 ENDINGS[r] 로 실행: lose=엔딩1, win=엔딩2, flee=엔딩3
  G.over=true;ui.innerHTML='';
  Ending.play(r);
}
$('#back').onclick=()=>{if(G.back)G.back();};
$('#retry').onclick=init;
const srcs=[...Object.values(ART).flatMap(v=>typeof v==='string'?[v]:Object.values(v)),...RECALLS.flatMap(r=>r.scenes.map(s=>s.img))
  .filter(Boolean).concat([FINAL_ILLUST])];
Promise.all(srcs.map(preload)).then(()=>{setupArt();init();});
