'use strict';
const $=id=>document.getElementById(id),canvas=$('village'),size=Landscape.size;
const kinds={
  school:['학교','학교를 옮길 빈 칸을 눌러요.'],clinic:['병원','병원을 옮길 빈 칸을 눌러요.'],
  home:['집','빈 땅에 집을 놓아요.'],apartment:['아파트','여러 가족이 사는 아파트를 놓아요.'],
  tower:['빌딩','빈 땅에 빌딩을 놓아요. 1층의 침수 여부는 땅 높이와 물높이로 살펴봐요.'],shop:['가게','사람들이 찾아올 가게를 놓아요.'],
  tree:['나무','주변 한 칸에 그늘을 만들어요.'],shelter:['그늘 쉼터','주변 한 칸에 그늘을 만들어요.'],
  garden:['빗물 정원','빈 땅이나 녹지에 놓아요. 같은 높이 또는 더 높은 이웃 칸에서 흘러온 빗물이 스며들어요.'],
  basin:['빗물 저류지','빈 땅이나 녹지에 놓아요. 저류지와 바로 이웃한 곳에서 흘러온 빗물을 잠시 모아요. 담을 수 있는 양은 한정돼요.'],
  seawall:['해안 둑','지도에서 해안 구간을 눌러 둑을 세워요. 세운 구간을 다시 누르면 둑을 거둬요.'],permeable:['물이 스미는 길','집중호우 때 빗물이 스며드는 길을 놓아요.'],
  road:['일반 길','학교와 병원을 잇는 길을 만들어요.'],raised:['높은 길','길을 높여 물이 찰 때 통행을 도와요.'],
  move:['옮기기','시설이나 길을 빈 땅으로 끌어 놓아요. 옮길 것과 빈 땅을 차례로 눌러도 돼요.'],erase:['지우기','지울 시설이나 길을 눌러요.'],
  look:['둘러보기','시설을 끌거나, 시설과 빈 땅을 차례로 눌러 옮겨요. 빈 곳을 끌면 마을이 돌아요.']
};
const groups={building:['school','clinic','home','apartment','tower','shop'],road:['road','permeable','raised'],nature:['tree','garden','shelter']};
const safetyTools={flood:['garden','basin','permeable','raised'],sea:['seawall','move','raised'],heat:['tree','shelter']};
const questions={flood:'빗물을 어디에 모으면 집과 길이 덜 잠길까요?',sea:'바닷물이 어디로 들어올까요? 둑과 건물, 길의 위치를 정해 보세요.',heat:'어디에 그늘을 만들면 걷기 편할까요?'};
const buildings=Object.fromEntries(groups.building.map(k=>[k,kinds[k][0]]));
const hazards={flood:'집중호우',sea:'해수면 상승',heat:'폭염'};
const terrain=Landscape.heights;
// The original neighbourhood occupies the central nine rows and columns.
const originalSize=9;
const margin=Math.floor((size-originalSize)/2);
const originalLegacy={};for(let x=1;x<originalSize;x++)originalLegacy[36+x]='road';
Object.assign(originalLegacy,{29:'school',32:'clinic',48:'home',22:'home',60:'tree',69:'tree',57:'tree'});
const originalCity={};
for(const row of [1,4,7])for(let x=row===1?2:1;x<=8;x++)originalCity[row*originalSize+x]='road';
for(const x of [2,5,7])for(let row=1;row<=7;row++)originalCity[row*originalSize+x]='road';
Object.assign(originalCity,{2:'home',4:'apartment',6:'tower',8:'tree',
  19:'garden',21:'home',22:'apartment',24:'tower',26:'shop',
  28:'school',30:'home',32:'road',33:'clinic',35:'tree',
  46:'home',48:'shop',51:'apartment',53:'tower',55:'shelter',57:'tree',60:'apartment',
  65:'road',73:'tree',76:'home',78:'garden',80:'tree'});

function expandBoard(original){
  const board={};
  for(const [key,value] of Object.entries(original)){
    if(key==='walls'){board.walls=[...value];continue;}
    const i=Number(key);
    if(!Number.isInteger(i)||i<0||i>=originalSize*originalSize)continue;
    const x=i%originalSize+margin, z=Math.floor(i/originalSize)+margin;
    board[z*size+x]=value;
  }
  return board;
}
const legacy=expandBoard(originalLegacy), cityPlan=expandBoard(originalCity);
let saved=null;
try{saved=JSON.parse(localStorage.getItem('safe-village-v1'));}catch{}
const version=saved?.board && saved.layoutVersion!==2?1:2;
let baseline=version===1?legacy:cityPlan;
const migrating=Boolean(saved?.board && saved.gridSize!==size);
let state={hazard:'flood',severity:2,title:'',note:'',...saved,gridSize:size,layoutVersion:version,
  board:migrating?expandBoard(saved.board):{...(saved?.board||baseline)}};
function addDesign(input){
  const design=Inventions.register(input);
  if(design)kinds[design.id]=[design.name,design.name+' · 빈 땅을 눌러 놓아요. '+Inventions.notes[design.effect]+(design.idea?' '+design.idea:'')];
  return design;
}
for(const item of Array.isArray(state.inventions)?state.inventions:[])addDesign(item);
state.inventions=[...Inventions.catalog.values()];
let step='reading',tool='look',group='safety',side='after',selected=-1,inspected=-1,busy=false,history=[];
const defaultCam={yaw:-.53,pitch:.68,zoom:1,span:size*1.48,vertical:size*1.06,center:[size/2+.22,.68,size/2]};
let heightOnly=false;
let camera={...defaultCam},viewName='orbit',rendered=null,frame=0;
const replay=()=>{try{localStorage.setItem('safe-village-v1',JSON.stringify(state));}catch{}};
if(migrating)replay();
const tell=text=>{$('status').textContent=text;};
const neighbors=Landscape.neighbors;
function simulate(placed,hazard=state.hazard,severity=state.severity){
  // Compare inventions using their chosen classroom function. The map retains the original model.
  const board={...placed};
  for(const i of Object.keys(board))if(i!=='walls')board[i]=Inventions.role(board[i]);
  const flooding=Landscape.flooding(board,hazard,severity),water=flooding.water,hot=new Set();
  const land=terrain.map((_,i)=>i).filter(i=>terrain[i]>=0);
  const routes=new Set(land.filter(i=>['road','permeable','raised'].includes(board[i])));
  if(hazard==='heat'){
    for(const i of land) {
      const shaded=[i,...neighbors(i)].some(j=>['tree','shelter'].includes(board[j]));
      if(!shaded && (severity>1 || routes.has(i) || buildings[board[i]])) hot.add(i);
    }
  }
  const safe=i=>!water.has(i);
  const school=land.find(i=>board[i]==='school'), clinic=land.find(i=>board[i]==='clinic');
  function connected(start,end){
    if(start===undefined||end===undefined||!safe(start)||!safe(end)) return false;
    const pending=[start], seen=new Set(pending);
    for(let j=0;j<pending.length;j++) for(const i of neighbors(pending[j])) {
      if(i===end)return true;
      if(!seen.has(i)&&routes.has(i)&&safe(i)){seen.add(i);pending.push(i);}
    }
    return false;
  }
  return {...flooding,heldDesigns:[...new Set([...flooding.held].map(i=>Inventions.catalog.get(placed[i])?.name).filter(Boolean))],hot,mode:hazard,strength:severity,schoolWet:water.has(school),clinicWet:water.has(clinic),buildings:land.filter(i=>buildings[board[i]]&&water.has(i)).length,
    hotRoads:[...routes].filter(i=>hot.has(i)).length, shadedRoads:[...routes].filter(i=>!hot.has(i)).length,
    broken:[...routes].filter(i=>water.has(i)).length, connected:connected(school,clinic)};
}
function summary(r) {
  return r.mode==='heat'
    ? '그늘 없는 길 '+r.hotRoads+'칸 · 그늘 있는 길 '+r.shadedRoads+'칸'
    : '침수 건물 '+r.buildings+'곳 · 잠긴 길 '+r.broken+'칸';
}
function pathSummary(r){return '학교–병원 길 '+(r.connected?'이어짐':'끊김');}
function coastalObservation(r){
  const names=areas=>[...areas].map(k=>Landscape.coastNames[k]).join('·');
  const open=[...r.intakes].filter(k=>!r.overtopped.has(k));
  const notes=[];
  if(open.length)notes.push('둑이 없는 '+names(open)+' 해안으로 바닷물이 들어왔어요.');
  if(r.overtopped.size)notes.push(names(r.overtopped)+' 해안의 낮은 땅에서 바닷물이 둑을 넘었어요.');
  if(!notes.length)notes.push('이번 밀물은 둑을 넘지 못해서 마을 땅이 잠기지 않았어요.');
  if(r.strength===3&&r.intakes.size)notes.push('높은 땅은 물 위에 남았어요.');
  return notes.join(' ');
}
function visibleBoard(){return step==='test'&&side==='before'?baseline:state.board;}
function labelHeights(target,basis,ratio=1){
  const c=target.getContext('2d'),unit=Math.max(.76,Math.min(1.1,basis.w/ratio/800))*ratio;
  const {middleStart,highStart}=Landscape;
  const centers=[(1+middleStart)/2,(middleStart+highStart)/2,(highStart+size)/2];
  const anchors=centers.map(x=>[x,size-.45]);
  c.save();c.font='bold '+Math.round(unit*14)+'px system-ui';c.textAlign='center';c.textBaseline='middle';
  const placed=[];
  Landscape.bands.forEach((band,level)=>{
    const [ax,az]=anchors[level];
    const [x,y]=CityEngine.project(ax,Landscape.ground(level)+.14,az,basis);
    const text=(level+1)+' '+band.name,w=c.measureText(text).width+unit*14,h=unit*26;
    if(x<4||x>basis.w-4||y<9||y>basis.h-9)return;
    const px=Math.min(basis.w-w/2-3,Math.max(w/2+3,x));
    let py=y+unit*19;
    while(placed.some(p=>Math.abs(px-p.x)<(w+p.w)/2+3 && Math.abs(py-p.y)<h+2))py+=h+unit*2;
    if(py>basis.h-h/2)py=y-h;
    placed.push({x:px,y:py,w});
    c.strokeStyle=band.ink;c.lineWidth=unit*2;c.beginPath();c.moveTo(x,y);c.lineTo(px,py);c.stroke();
    c.beginPath();c.arc(x,y,unit*3,0,Math.PI*2);c.fillStyle=band.ink;c.fill();
    c.beginPath();c.roundRect(px-w/2,py-h/2,w,h,unit*7);c.fillStyle=band.flag;c.fill();c.stroke();
    c.fillStyle=band.ink;c.fillText(text,px,py+unit*.6);
  });
  c.restore();
}
const shoreAnchors={west:[.85,0,size/2],north:[size/2,.48,-.10],south:[size/2,.45,size+.08],east:[size+.1,.9,size/2]};
function updateCoastButtons(basis,ratio,enabled){
  const holder=$('coastControls');holder.hidden=!enabled;if(!enabled)return;
  for(const node of holder.children){
    const k=node.dataset.area,[px,py]=CityEngine.project(...shoreAnchors[k],basis);
    const on=state.board.walls?.includes(k)||false;
    node.setAttribute('aria-pressed',on);node.textContent=Landscape.coastNames[k]+' '+(on?'둑 철거':'둑 설치');
    const x=px/ratio,y=py/ratio,margin=48;
    node.hidden=x<0||x>basis.w/ratio||y<0||y>basis.h/ratio;
    node.style.left=Math.max(margin,Math.min(basis.w/ratio-margin,x))+'px';
    node.style.top=Math.max(24,Math.min(basis.h/ratio-48,y))+'px';
  }
}
function drawMap(){
  frame=0;
  if(step==='reading')return;
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5,1500/Math.max(1,rect.width));
  const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
  const board=visibleBoard(),effects=step==='test'?simulate(board):null;
  const mesh=CoastalCity.scene(board,terrain,heightOnly?null:effects,selected,heightOnly);
  const basis=CityEngine.draw(canvas,mesh,camera);rendered={mesh,basis};
  const placingWall=step==='design'&&tool==='seawall'&&!heightOnly;
  if(!placingWall)labelHeights(canvas,basis,dpr);
  updateCoastButtons(basis,dpr,placingWall);
  $('compass').style.transform='rotate('+(-90-camera.yaw*180/Math.PI)+'deg)';
  const i=selected>=0?selected:inspected,tag=$('placeTag');tag.hidden=true;
  if(i>=0&&terrain[i]>=0){
    const type=board[i],heights={tower:2.45,apartment:1.5,clinic:.83,school:.88,home:.60,tree:.70,shelter:.54};
    const [px,py]=CityEngine.project(i%size+.5,Math.max(CoastalCity.groundHeight(terrain[i])+(heightOnly?.10:(heights[type]||.18)),heightOnly?0:(effects?.groundWater.get(i)||0)),Math.floor(i/size)+.5,basis);
    const x=px/dpr,y=py/dpr;
    if(x>27&&x<rect.width-27&&y>30&&y<rect.height-24){
      const detail=effects&&!heightOnly?(effects.water.has(i)?' · 침수':effects.groundWater.has(i)?' · 길 위 통행 가능':''):'';
      tag.textContent=[(selected>=0?'옮길 ':'')+(kinds[type]?.[0]||'빈 땅'),Landscape.bands[terrain[i]].name].filter(Boolean).join(' · ')+detail;
      tag.style.left=x+'px';tag.style.top=y+'px';tag.hidden=false;
    }
  }
}
function queueDraw(){if(!frame)frame=requestAnimationFrame(drawMap);}
function setPalette(){
  const safety=group==='safety';
  $('safetyPanel').hidden=!safety;$('palette').classList.toggle('safety',safety);
  $('designHazard').value=state.hazard;$('strategy').textContent=questions[state.hazard];
  const custom=[...Inventions.catalog.keys()];
  $('myCatalog').hidden=!custom.length;
  $('myCatalog').textContent='내 구조물 ('+custom.length+')';
  const choices=group==='inventions'?custom:safety?safetyTools[state.hazard]:groups[group];
  $('palette').replaceChildren(...choices.map(k=>{
    const b=document.createElement('button');b.className='tile';b.dataset.tool=k;
    const img=document.createElement('img');img.alt='';img.src=CoastalCity.icon(k);
    const label=document.createElement('span');label.textContent=k==='move'?'시설 옮기기':kinds[k][0];
    b.append(img,label);return b;
  }));
}
function update(){
  const reading=step==='reading';
  document.querySelector('main').classList.toggle('is-reading',reading);
  document.querySelector('.stage').hidden=reading;
  document.querySelector('aside').hidden=reading;
  for(const node of document.querySelectorAll('nav button')){
    const active=node.dataset.step===step;node.classList.toggle('active',active);
    node.setAttribute('aria-current',active?'step':'false');$(node.dataset.step).hidden=!active;
  }
  for(const node of document.querySelectorAll('[data-tool]'))node.setAttribute('aria-pressed',node.dataset.tool===tool);
  for(const node of document.querySelectorAll('[data-group]'))node.setAttribute('aria-pressed',node.dataset.group===group);
  if(step==='design'){
    const open=terrain.filter((h,i)=>h>=0&&!state.board[i]).length;
    $('freePlots').textContent='빈 땅 '+open+'칸 · 시설을 고르고 놓을 곳을 눌러요.';
  }
  $('scene').textContent=state.title||'우리 모둠의 마을';
  $('sceneState').textContent=step==='test'?(side==='before'?'설계 전':'설계 후')+' · '+hazards[state.hazard]:step==='export'?'발표할 마을':'마을 설계';
  $('heightMap').setAttribute('aria-pressed',heightOnly);$('heightMap').textContent=heightOnly?'마을 지도로 돌아가기':'땅 높이 지도';
  $('designHazard').value=state.hazard;$('hazard').value=state.hazard;
  $('riskKey').hidden=step!=='test'||heightOnly;$('riskLabel').textContent=state.hazard==='heat'?'그늘 없는 곳':'침수';
  document.querySelector('.risk').style.background=state.hazard==='heat'?'#e5a16a':'#70b8c7';
  if(heightOnly)$('sceneState').textContent='땅 높이 지도';
  $('before').setAttribute('aria-pressed',side==='before');$('after').setAttribute('aria-pressed',side==='after');
  $('undo').disabled=!history.length;$('newCity').hidden=state.layoutVersion!==1;
  canvas.classList.toggle('placing',step==='design'&&tool!=='look');
  $('toolHint').textContent=selected>=0?(kinds[state.board[selected]][0]+' 선택 · 옮길 빈 땅을 눌러요. 같은 시설을 다시 누르면 선택이 풀려요.'):kinds[tool][1];
  if(heightOnly)$('toolHint').textContent='땅을 눌러 높이를 확인해요. 시설을 놓으려면 마을 지도로 돌아가요.';
  if(step==='test'){
    const current=simulate(visibleBoard());
    const observations={
      flood:'비가 땅에 스며들거나 저류지에 모이면 주변의 침수가 줄어들 수 있어요.',
      sea:coastalObservation(current),
      heat:'나무와 쉼터를 걷는 길 가까이에 놓고 그늘이 있는 길의 수를 비교해요.'
    };
    $('testObservation').textContent=observations[state.hazard];
    $('modelNote').textContent=state.hazard==='sea'
      ? '평균 해수면이 달라졌을 때 한 차례 밀물 동안 들어오는 바닷물을 같은 시간만큼 비교하는 수업용 모형이에요.'
      : '수업용 모형이에요. 실제 침수 범위와 기온은 지역의 조건에 따라 달라져요.';
    $('result').replaceChildren(...[['설계 전',simulate(baseline)],['설계 후',simulate(state.board)]].map(([name,r])=>{
      const p=document.createElement('p'),strong=document.createElement('b');strong.textContent=name;
      p.append(strong,document.createElement('br'),summary(r),document.createElement('br'),pathSummary(r));
      if(r.mode!=='heat')p.append(document.createElement('br'),'땅에 물이 찬 곳 '+r.groundWater.size+'칸');
      if(r.mode==='sea')p.append(document.createElement('br'),'학교 '+(r.schoolWet?'잠김':'물 밖')+' · 병원 '+(r.clinicWet?'잠김':'물 밖'));
      if(r.mode==='flood'&&r.held.size){
        const names=r.heldDesigns.length?' · '+r.heldDesigns.join(', '):'';
        p.append(document.createElement('br'),'빗물을 모은 시설 '+r.held.size+'곳'+names);
      }
      return p;
    }));
  }
  queueDraw();
}
function openStep(next){
  cancelGesture();
  step=next;heightOnly=false;selected=inspected=-1;tell('');update();
  window.scrollTo(0,0);
}
for(const node of document.querySelectorAll('nav button'))node.onclick=()=>openStep(node.dataset.step);
CaseReader.init(saved && hazards[state.hazard] ? state.hazard : 'heat', hazard=>{
  state.hazard=hazard;group='safety';tool='look';
  replay();setPalette();openStep('design');
  document.querySelector('nav [data-step="design"]').focus({preventScroll:true});
});
$('design').addEventListener('click',event=>{
  const node=event.target.closest('button');if(!node)return;
  cancelGesture();
  if(node.dataset.group){group=node.dataset.group;tool='look';setPalette();}
  else if(node.dataset.tool){tool=node.dataset.tool;heightOnly=false;}
  else return;
  selected=inspected=-1;tell('');update();
});
$('heightMap').onclick=()=>{cancelGesture();heightOnly=!heightOnly;selected=inspected=-1;tell('');update();};
$('designHazard').onchange=()=>{
  cancelGesture();
  state.hazard=$('designHazard').value;tool='look';heightOnly=false;selected=inspected=-1;
  replay();setPalette();tell('');update();
};
function toggleWall(area){
  if(step!=='design'||heightOnly||tool!=='seawall')return;
  const walls=new Set(state.board.walls||[]),remove=walls.has(area);
  if(remove)walls.delete(area);else walls.add(area);
  change({...state.board,walls:[...walls]});
  tell(Landscape.coastNames[area]+' 해안 둑을 '+(remove?'거뒀어요.':'세웠어요.'));
}
for(const area of Object.keys(shoreAnchors)){
  const node=document.createElement('button');node.dataset.area=area;
  node.onclick=()=>toggleWall(area);$('coastControls').append(node);
}
for(const key of ['before','after'])$(key).onclick=()=>{side=key;inspected=-1;tell('');update();};
function change(board,layout=state.layoutVersion){cancelGesture();history.push({board:state.board,layout:state.layoutVersion});state.layoutVersion=layout;baseline=layout===1?legacy:cityPlan;state.board=board;selected=-1;replay();update();}
$('undo').onclick=()=>{if(!history.length)return;cancelGesture();const prior=history.pop();state.board=prior.board;state.layoutVersion=prior.layout;baseline=prior.layout===1?legacy:cityPlan;selected=inspected=-1;tell('한 단계 되돌렸어요.');replay();update();};
$('newCity').onclick=()=>{if(confirm('기존 마을 대신 항구 도시 배치로 시작할까요? 되돌리기로 돌아갈 수 있어요.')){inspected=-1;change({...cityPlan},2);tell('항구 도시 배치를 열었어요.');}};
$('reset').onclick=()=>{if(confirm('마을을 처음 배치로 되돌릴까요?')){inspected=-1;change({...baseline});tell('처음 배치로 되돌렸어요.');}};
for(const key of ['hazard','severity','title','note']){
  const field=$(key);field.value=state[key];field.addEventListener(key==='title'||key==='note'?'input':'change',()=>{
    state[key]=key==='severity'?Number(field.value):field.value;if(key==='hazard'){tool='look';setPalette();}replay();update();
  });
}
function pickPlot(clientX,clientY){
  if(!rendered||document.elementFromPoint(clientX,clientY)!==canvas)return -1;
  const r=canvas.getBoundingClientRect();
  return CityEngine.pick(rendered.mesh,rendered.basis,(clientX-r.left)*canvas.width/r.width,(clientY-r.top)*canvas.height/r.height);
}
function canMove(){return step==='design'&&!heightOnly&&tool!=='erase'&&tool!=='seawall';}
function selectPlot(i){
  selected=selected===i?-1:i;inspected=-1;tell('');update();
}
function movePlot(from,to){
  const current=state.board,type=current[from];
  if(!canMove()||!type)return;
  if(to===from||to<0||terrain[to]<0||current[to]){
    selected=from;inspected=-1;update();
    tell(to===from?'옮길 빈 땅을 눌러요.':'시설이 없는 빈 땅을 골라요.');return;
  }
  const board={...current,[to]:type};
  delete board[from];
  inspected=to;change(board);tell(kinds[type][0]+' 이동 완료 · '+Landscape.bands[terrain[to]].name);
}
function tap(clientX,clientY){
  const i=pickPlot(clientX,clientY);
  if(i<0){inspected=-1;tell(selected>=0?'옮길 빈 땅을 눌러요.':tool==='look'||step!=='design'?'':'마을 안의 땅을 눌러요.');queueDraw();return;}
  const type=state.board[i];
  if(heightOnly||step!=='design'){inspected=i;queueDraw();return;}
  if(canMove()&&(selected>=0||tool==='move'||tool==='look')){
    if(type)selectPlot(i);
    else if(selected>=0)movePlot(selected,i);
    else if(tool==='move')tell('먼저 옮길 시설이나 길을 눌러요.');
    else {inspected=i;queueDraw();}
    return;
  }
  if(tool==='seawall'){
    const edges=Landscape.edges[i];
    if(edges.length===1)toggleWall(edges[0].area);
    else tell('설치하거나 거둘 해안의 둑 버튼을 눌러요.');
    return;
  }
  const board={...state.board};
  if(tool==='erase'){
    if(!type)return;
    if(type==='school'||type==='clinic'){tell('학교와 병원은 ‘옮기기’로 위치를 바꿔요.');return;}
    delete board[i];
  }else{
    const oldRoad=['road','permeable','raised'].includes(type),newRoad=['road','permeable','raised'].includes(tool);
    const greens=['garden','basin','shelter','tree'],replaceGreen=greens.includes(type)&&greens.includes(tool);
    if(type&&(tool===type||(!(oldRoad&&newRoad)&&!replaceGreen))){selectPlot(i);return;}
    if(tool==='school'||tool==='clinic'){
      const old=Object.keys(board).find(k=>board[k]===tool);
      if(old!==undefined)delete board[old];
    }
    board[i]=tool;
  }
  inspected=i;change(board);tell('배치를 바꿨어요.');
}
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function setCamera(key='orbit'){
  viewName=key;$('view').value=key;$('minus').disabled=camera.zoom<=.721;$('plus').disabled=camera.zoom>=3.999;queueDraw();
}
$('view').onchange=e=>{
  const key=e.target.value,angles={front:0,right:Math.PI/2,back:Math.PI,left:-Math.PI/2};
  if(key==='orbit'){camera={...camera,pitch:.68,yaw:-.53};}
  else if(key==='top')camera={...camera,yaw:0,pitch:Math.PI/2};
  else camera={...camera,yaw:angles[key],pitch:.34};
  setCamera(key);
};
function rotate(dx,dy=0){camera.yaw+=dx;camera.pitch=clamp(camera.pitch+dy,.16,Math.PI/2);setCamera();}
function zoom(f){camera.zoom=clamp(camera.zoom*f,.72,4);setCamera(viewName);}
function fit(){camera={...defaultCam};setCamera();}
$('turnLeft').onclick=()=>rotate(-Math.PI/6);$('turnRight').onclick=()=>rotate(Math.PI/6);
$('plus').onclick=()=>zoom(1.23);$('minus').onclick=()=>zoom(1/1.23);$('fit').onclick=fit;
const pointers=new Map();let gesture=null;
function pair(){
  const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};
}
function pan(dx,dy){
  const units=rendered?canvas.width/canvas.clientWidth/rendered.basis.scale:.014;
  const Y=camera.yaw,sin=Math.sin(Y),cos=Math.cos(Y),horizontal=dy/Math.max(.32,Math.sin(camera.pitch));
  const [x,h,z]=camera.center;camera.center=[clamp(x+(-dx*cos-horizontal*sin)*units,-1,size+1),h,clamp(z+(dx*sin-horizontal*cos)*units,-1,size+1)];
}
const movePreview=$('movePreview'),moveBadge=$('moveBadge'),moveTarget=$('moveTarget');
let previewFrame=0;
function clearPreview(){
  cancelAnimationFrame(previewFrame);previewFrame=0;
  movePreview.hidden=true;canvas.classList.remove('dragging');
}
function cancelGesture(){
  pointers.clear();gesture=null;clearPreview();
}
function showDropTarget(){
  previewFrame=0;
  if(!gesture?.dragging)return;
  const point=pointers.values().next().value,r=canvas.getBoundingClientRect();
  const i=pickPlot(point.x,point.y),valid=i>=0&&!state.board[i];
  movePreview.classList.toggle('blocked',!valid);
  moveBadge.lastElementChild.textContent=kinds[state.board[gesture.source]][0]+(valid?' · 여기에 놓기':' · 빈 땅을 찾아요');
  const x=clamp(point.x-r.left,moveBadge.offsetWidth/2+4,r.width-moveBadge.offsetWidth/2-4);
  moveBadge.style.left=x+'px';moveBadge.style.top=Math.max(moveBadge.offsetHeight+4,point.y-r.top-14)+'px';
  let corners='';
  if(i>=0){
    const x=i%size,z=Math.floor(i/size),y=Landscape.ground(terrain[i])+.045;
    corners=[[0,0],[1,0],[1,1],[0,1]].map(([dx,dz])=>{
      const [px,py]=CityEngine.project(x+dx,y,z+dz,rendered.basis);
      return (px*r.width/canvas.width)+','+(py*r.height/canvas.height);
    }).join(' ');
  }
  moveTarget.setAttribute('points',corners);
}
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.button!==1&&e.button!==2)return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1){
    const pan=e.shiftKey||e.button!==0;
    const i=!pan&&canMove()?pickPlot(e.clientX,e.clientY):-1;
    gesture={sx:e.clientX,sy:e.clientY,moved:false,pan,source:state.board[i]?i:-1,dragging:false};
  }else{
    gesture.source=-1;gesture.dragging=false;gesture.moved=true;gesture.pair=pair();clearPreview();
  }
});
canvas.addEventListener('pointermove',e=>{
  const old=pointers.get(e.pointerId);if(!old||!gesture)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size>=2){
    const next=pair(),prev=gesture.pair||next;gesture.moved=true;
    if(prev.d>4)camera.zoom=clamp(camera.zoom*next.d/prev.d,.72,4);
    pan(next.x-prev.x,next.y-prev.y);gesture.pair=next;setCamera(viewName);return;
  }
  if(!gesture.moved&&Math.hypot(e.clientX-gesture.sx,e.clientY-gesture.sy)<6)return;
  gesture.moved=true;
  if(gesture.source>=0){
    if(!gesture.dragging){
      gesture.dragging=true;canvas.classList.add('dragging');
      moveBadge.firstElementChild.src=CoastalCity.icon(state.board[gesture.source]);movePreview.hidden=false;
    }
    if(!previewFrame)previewFrame=requestAnimationFrame(showDropTarget);
    return;
  }
  const dx=e.clientX-old.x,dy=e.clientY-old.y;
  if(gesture.pan){pan(dx,dy);setCamera(viewName);}else rotate(-dx*.009,dy*.006);
});
function endPointer(e,cancelled=false){
  if(!pointers.has(e.pointerId)||!gesture)return;
  const {source,sx,sy,moved,pan}=gesture;
  pointers.delete(e.pointerId);
  if(pointers.size){gesture.moved=true;gesture.pair=pointers.size>1?pair():null;return;}
  gesture=null;clearPreview();
  if(cancelled||pan)return;
  if(!moved&&Math.hypot(e.clientX-sx,e.clientY-sy)<6)tap(e.clientX,e.clientY);
  else if(source>=0)movePlot(source,pickPlot(e.clientX,e.clientY));
}
canvas.addEventListener('pointerup',e=>endPointer(e));canvas.addEventListener('pointercancel',e=>endPointer(e,true));
canvas.addEventListener('lostpointercapture',e=>endPointer(e,true));canvas.oncontextmenu=e=>e.preventDefault();
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-clamp(e.deltaY,-160,160)*.0018));},{passive:false});
canvas.addEventListener('keydown',e=>{
  const keys={'ArrowLeft':()=>rotate(-.18),'ArrowRight':()=>rotate(.18),'ArrowUp':()=>rotate(0,.1),'ArrowDown':()=>rotate(0,-.1),'+':()=>zoom(1.18),'-':()=>zoom(1/1.18),'Home':fit};
  if(keys[e.key]){e.preventDefault();keys[e.key]();}
});
new ResizeObserver(queueDraw).observe(canvas);
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function download(blob, suffix){
  const link=document.createElement('a'), url=URL.createObjectURL(blob);
  link.download=(state.title.trim()||'기후안심마을').replace(/[\\/:*?"<>|]/g,'_')+'_'+suffix;
  link.href=url;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function line(c,text,x,y,px=30,max=1450){
  c.fillStyle='#173b34';c.font='bold '+px+'px system-ui';c.textAlign='left';c.fillText(text,x,y,max);
}
function wrap(c,text,x,y,max){
  let row='';
  c.font='24px system-ui';
  for(const letter of text.replace(/\s+/g,' ')){
    if(row&&c.measureText(row+letter).width>max){line(c,row,x,y,24,max);row='';y+=30;}
    row+=letter;
  }
  if(row)line(c,row,x,y,24,max);
}
$('png').onclick=()=>{
  const out=makeCanvas(1600,900), panel=makeCanvas(735,510), c=out.getContext('2d');
  c.fillStyle='#f7f5e8';c.fillRect(0,0,1600,900);
  line(c,state.title.trim()||'기후 안심 마을',48,67,50);
  line(c,hazards[state.hazard]+' · 위험 세기 '+['','낮음','보통','높음'][state.severity]+' · 같은 조건에서 비교',50,116);
  [[baseline,'설계 전',49],[state.board,'설계 후',816]].forEach(([board,label,x])=>{
    const result=simulate(board);
    const basis=CityEngine.draw(panel,CoastalCity.scene(board,terrain,result),{...defaultCam,yaw:camera.yaw,pitch:camera.pitch});
    labelHeights(panel,basis);
    c.drawImage(panel,x,176);
    line(c,label,x,161);
    line(c,summary(result),x,725,27,720);
    line(c,pathSummary(result),x,762,24,720);
  });
  if(state.note.trim())wrap(c,state.note.trim(),50,805,1495);
  line(c,'초등 과학 · 수업용 모형',50,877,18);
  out.toBlob(blob=>{if(blob){download(blob,'설계전후.png');tell('비교 이미지를 저장했어요.');}else tell('이미지를 저장하지 못했어요. 다시 시도해 주세요.');},'image/png');
};
$('video').onclick=async()=>{
  if(busy)return;
  const out=makeCanvas(1280,720), panel=makeCanvas(1280,610), c=out.getContext('2d');
  const board={...state.board}, result=simulate(board), hazard=hazards[state.hazard], strength=['','낮음','보통','높음'][state.severity];
  const title=state.title.trim()||'기후 안심 마을', startAngle=camera.yaw;
  const scenes=[CoastalCity.scene(board,terrain,null),CoastalCity.scene(board,terrain,result)];
  busy=true;$('video').disabled=true;
  try {
    function render(progress){
      const tested=progress>=.36;
      const basis=CityEngine.draw(panel,scenes[tested?1:0],{...defaultCam,yaw:startAngle+progress*Math.PI*2});
      labelHeights(panel,basis);
      c.fillStyle='#f7f5e8';c.fillRect(0,0,out.width,out.height);
      c.drawImage(panel,0,78);
      line(c,title,32,51,38,690);
      line(c,tested?hazard+' · '+strength:'설계한 마을',770,51,28,470);
      line(c,tested?summary(result)+' · '+pathSummary(result):'마을을 한 바퀴 돌며 배치를 살펴봐요.',32,704,24,1200);
    }
    const blob=await OrbitMovie.create(out,render,progress=>tell('3D 영상 만드는 중 '+Math.round(progress*100)+'% · 이 화면을 열어 두세요.'));
    if(!blob.size)throw new Error('Empty recording');
    download(blob,blob.type.includes('mp4')?'3D영상.mp4':'3D영상.webm');
    tell('3D 영상을 저장했어요. 캔바의 업로드에서 파일을 선택해요.');
  } catch {
    tell('영상 저장에 실패했어요. 이 화면을 열어 둔 채 다시 시도하거나 Chrome으로 열어 주세요.');
  } finally {
    busy=false;$('video').disabled=false;
  }
};
Workshop.init(draft=>{
  const design=addDesign(draft);if(!design)return;
  state.inventions=[...Inventions.catalog.values()];group='inventions';tool=design.id;
  heightOnly=false;selected=inspected=-1;
  replay();setPalette();update();tell('빈 땅을 눌러 '+design.name+' 구조물을 놓아 보세요.');
});
$('openWorkshop').onclick=()=>{cancelGesture();Workshop.open();};
setPalette();
update();
