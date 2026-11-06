// An isolated study of making. No economy, idle claims or access to game saves.
// All visible yarn comes from one existing master. Masks are renderer geometry.
const $=id=>document.getElementById(id), canvas=$('work'),ctx=canvas.getContext('2d');
const surface=$('surface'),craft=$('craft'),next=$('next'),phase=$('phase'),hint=$('hint');
const atelier=document.querySelector('.atelier'),backdrop=document.querySelector('.backdrop');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const KEY='mir-craft-feel-study-v1',PORTIONS=4;
const flower=new Image();flower.src='./assets/flower.webp';
const foundation=new Image();foundation.src='./assets/flower-base.webp';
// Individual petal silhouettes; the common centre remains material throughout.
const groups=[
 {name:'Ромашка',centre:[380,780],camera:[370,785,570],petals:[
  [[350,735],[280,700],[267,648],[291,601],[343,584],[393,610],[407,643],[411,666],[403,694],[392,725]],
  [[413,742],[416,676],[453,625],[494,615],[539,644],[551,691],[524,742],[459,783]],
  [[449,788],[500,741],[546,746],[580,786],[578,832],[546,865],[482,853],[434,821]],
  [[418,831],[477,845],[486,903],[459,953],[410,982],[368,957],[350,901],[360,838]],
  [[330,825],[374,858],[353,918],[295,944],[240,929],[204,890],[217,844],[281,803]],
  [[323,786],[277,825],[216,831],[171,802],[158,756],[184,705],[230,681],[283,706],[340,745]]
 ]},
 {name:'Розовый цветок',centre:[630,1000],camera:[635,1004,555],petals:[
  [[583,963],[540,929],[529,883],[559,852],[611,851],[648,890],[650,955]],
  [[653,965],[646,903],[677,849],[729,832],[771,853],[782,904],[746,955],[685,994]],
  [[690,1000],[752,953],[803,972],[834,1014],[824,1064],[781,1095],[718,1079],[670,1039]],
  [[653,1055],[715,1083],[750,1128],[728,1165],[682,1181],[631,1160],[601,1107],[602,1054]],
  [[582,1031],[613,1070],[581,1128],[535,1156],[489,1142],[463,1106],[470,1054],[520,1016]],
  [[573,1002],[522,1030],[476,1023],[440,995],[440,958],[472,926],[516,923],[575,963]]
 ]}
];
let state={amounts:Array(12).fill(0),step:0,mode:'craft'},notice='';
try{
 const saved=JSON.parse(localStorage.getItem(KEY));
 if(saved){
  const valid=Array.isArray(saved.amounts)&&saved.amounts.length===12&&saved.amounts.every(n=>Number.isInteger(n)&&n>=0&&n<=PORTIONS)&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<=12&&
   saved.amounts.every((n,i)=>i<saved.step?n===PORTIONS:i===saved.step?n<PORTIONS:n===0)&&
   (saved.step===12?['finish','meadow'].includes(saved.mode):saved.mode==='craft');
  if(valid)state={amounts:saved.amounts,step:saved.step,mode:saved.mode};else notice='Сохранённый этюд повреждён. Можно начать новую работу.';
 }
}catch{notice='Сохранение недоступно. Можно сделать этюд в этой вкладке.';}
const petals=groups.flatMap((g,gi)=>g.petals.map((points,pi)=>({points,group:gi,part:pi,centre:g.centre})));
const firstPetal=new Path2D();groups[0].petals[0].forEach(([x,y],i)=>i?firstPetal.lineTo(x,y):firstPetal.moveTo(x,y));firstPetal.closePath();
const material=document.createElement('canvas');material.width=1024;material.height=1820;
const mc=material.getContext('2d');
let pointer=null,repeat=0,holdStartStep=-1,lastMove=null,raf=0,lastTime=0,keyHolding=null,keyStartStep=-1;
let camera=[370,785,570],ready=false,displayed=state.amounts.map(n=>n/PORTIONS);
const daisyPause=()=>state.step===6&&state.amounts[6]===0;
const targetCamera=()=>state.mode==='meadow'?[512,980,1600]:state.mode==='finish'?[512,980,1050]:groups[state.step>=6&&!daisyPause()?1:0].camera;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));notice='';}catch{notice='Прогресс сохраняется только в этой вкладке.';}}
function stop(){pointer=null;clearTimeout(repeat);repeat=0;craft.classList.remove('pressed');}
function update(){
 const complete=state.step>=12;surface.disabled=complete;craft.hidden=complete;next.hidden=!complete;
 atelier.dataset.mode=state.mode;atelier.dataset.step=state.step;atelier.dataset.portions=state.amounts.reduce((a,b)=>a+b,0);
 if(state.mode==='meadow'){
  phase.textContent='Ваша первая цветочная группа';hint.textContent='Этюд завершён. В мастерской можно рассмотреть работу.';
  next.setAttribute('aria-label','Мастерская');next.querySelector('img').src='./assets/workshop-button.webp';
 }else if(complete){
  phase.textContent='Цветочная группа готова';hint.textContent='Рассмотрите фактуру. Теперь можно перенести работу на полянку.';
  next.setAttribute('aria-label','Разместить');next.querySelector('img').src='./assets/place.webp';
 }else{
  const p=petals[state.step];phase.textContent=groups[p.group].name+' · лепесток '+(p.part+1)+' из 6';
  hint.textContent=state.amounts.reduce((a,b)=>a+b,0)===0?'Касайтесь изделия или удерживайте «Вязать».':state.amounts[state.step]===0?'Новый лепесток — новое касание. Можно удерживать.':'Фрагменты остаются. Продолжайте в своём темпе.';
  if(daisyPause()){phase.textContent='Ромашка готова';hint.textContent='Следующее касание начнёт розовый цветок.';}
 }
 if(notice)hint.textContent=notice;
 document.querySelector('.eyebrow').textContent='МИР НА НИТОЧКЕ · '+(state.mode==='meadow'?'ПОЛЯНКА':'МАСТЕРСКАЯ');
}
function add(){
 if(!ready||state.mode!=='craft'||state.step>=12)return;
 const current=state.step;state.amounts[current]=Math.min(PORTIONS,state.amounts[current]+1);
 if(state.amounts[current]===PORTIONS){
  state.step++;stop();
  if(state.step===12){state.mode='finish';$('announcement').textContent='Цветочная композиция готова.';}
  else $('announcement').textContent='Лепесток готов. '+(state.step===6?'Переходим к розовому цветку.':'Следующий — новым касанием.');
 }
 save();update();wake();
}
function begin(event){
 if(event.button!==0||pointer!==null||!ready||state.step>=12)return;
 event.preventDefault();pointer=event.pointerId;event.currentTarget.setPointerCapture(pointer);holdStartStep=state.step;
 lastMove=[event.clientX,event.clientY];craft.classList.add('pressed');add();
 const again=()=>{if(pointer===null||state.step!==holdStartStep)return;add();if(pointer!==null)repeat=setTimeout(again,350);};
 if(pointer!==null)repeat=setTimeout(again,380);
}
for(const control of [surface,craft]){
 control.addEventListener('pointerdown',begin);
 control.addEventListener('pointerup',stop);control.addEventListener('pointercancel',stop);control.addEventListener('lostpointercapture',stop);
 control.addEventListener('click',event=>{if(event.detail===0)add();});
 control.addEventListener('keydown',event=>{
  if(!['Enter',' '].includes(event.key))return;event.preventDefault();
  if(keyHolding===null){if(event.repeat)return;keyHolding=event.key;keyStartStep=state.step;}
  if(keyHolding===event.key&&state.step===keyStartStep)add();
 });
 control.addEventListener('contextmenu',event=>event.preventDefault());
}
surface.addEventListener('pointermove',event=>{
 if(pointer!==event.pointerId||state.step!==holdStartStep||!lastMove)return;
 if(Math.hypot(event.clientX-lastMove[0],event.clientY-lastMove[1])>30){lastMove=[event.clientX,event.clientY];add();}
});
next.addEventListener('click',()=>{stop();state.mode=state.mode==='meadow'?'finish':'meadow';backdrop.src=state.mode==='meadow'?'./assets/meadow.webp':'./assets/workshop.webp';save();update();wake();});
$('restart').addEventListener('click',()=>{stop();state={amounts:Array(12).fill(0),step:0,mode:'craft'};displayed=state.amounts.map(()=>0);camera=[...groups[0].camera];backdrop.src='./assets/workshop.webp';save();update();wake();craft.focus({preventScroll:true});});
function petalClip(context,i){
 const p=petals[i],g=p.group,c=p.centre;
 // Adjacent masks meet in the actual valleys. A separate local reveal is used
 // for each petal; this never sweeps over the plant, stem or finished parts.
 const boundaries=g===0?[-140,-68,-10,39,102,164,220]:[-147,-90,-23,36,99,159,213];
 const a=boundaries[p.part]*Math.PI/180,b=boundaries[p.part+1]*Math.PI/180;
 const sector=new Path2D();sector.moveTo(...c);sector.arc(...c,300,a,b);sector.closePath();context.clip(sector);
 const outline=new Path2D();outline.ellipse(g?635:375,g?1005:785,g?205:212,g?183:196,0,0,Math.PI*2);context.clip(outline);
 const separation=new Path2D();
 if(g){separation.moveTo(0,1396);separation.lineTo(1024,372);separation.lineTo(1024,1820);separation.lineTo(0,1820);}
 else{separation.moveTo(0,0);separation.lineTo(1024,0);separation.lineTo(1024,372);separation.lineTo(0,1396);}
 separation.closePath();context.clip(separation);
 if(i===0)context.clip(firstPetal);
}
function drawMaterial(now){
 mc.clearRect(0,0,1024,1820);mc.drawImage(foundation,0,0);
 if(displayed.every(n=>n>.999)){mc.clearRect(0,0,1024,1820);mc.drawImage(flower,0,0);return;}
 for(let i=0;i<petals.length;i++){
  const value=displayed[i];if(value<=0)continue;
  mc.save();petalClip(mc,i);
  if(value<.999){
   const p=petals[i],out=p.points.reduce((best,v)=>Math.hypot(v[0]-p.centre[0],v[1]-p.centre[1])>Math.hypot(best[0]-p.centre[0],best[1]-p.centre[1])?v:best,p.points[0]);
   const angle=Math.atan2(out[1]-p.centre[1],out[0]-p.centre[0]);
   const extent=Math.hypot(out[0]-p.centre[0],out[1]-p.centre[1]),radius=53+(extent-53)*value;
   // Local scalloped working edge, clipped inside this one petal. Never a world-size sweep.
   const edge=new Path2D();edge.moveTo(...p.centre);
   for(let n=0;n<=50;n++){const a=angle-1.6+n*3.2/50,r=radius+Math.sin(n*2.1)*2.4;edge.lineTo(p.centre[0]+Math.cos(a)*r,p.centre[1]+Math.sin(a)*r);}edge.closePath();mc.clip(edge);
  }
  mc.drawImage(flower,0,0);mc.restore();
 }
}
function draw(now){
 raf=0;if(!ready)return;const dt=Math.min(50,now-(lastTime||now));lastTime=now;
 let moving=false;const target=targetCamera();
 for(let i=0;i<3;i++){if(Math.abs(camera[i]-target[i])>.1)moving=true;camera[i]=reduced.matches?target[i]:camera[i]+(target[i]-camera[i])*Math.min(1,dt/150);}
 for(let i=0;i<displayed.length;i++){const t=state.amounts[i]/PORTIONS;if(Math.abs(displayed[i]-t)>.001)moving=true;displayed[i]=reduced.matches?t:displayed[i]+(t-displayed[i])*Math.min(1,dt/45);}
 drawMaterial(now);
 const {width:w,height:h}=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const scale=w/camera[2];ctx.save();ctx.translate(w/2-camera[0]*scale,h*.52-camera[1]*scale);ctx.scale(scale,scale);
 ctx.shadowColor='#4c301f30';ctx.shadowBlur=12;ctx.shadowOffsetY=9;ctx.drawImage(material,0,0);ctx.restore();
 // A small mark at the attached edge indicates where the next material appears.
 if(state.mode==='craft'&&state.step<12&&!daisyPause()){
  const p=petals[state.step],point=p.points[0],x=w/2+(point[0]-camera[0])*scale,y=h*.52+(point[1]-camera[1])*scale;
  ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle='#fff4dc';ctx.fill();ctx.strokeStyle='#866441';ctx.lineWidth=1;ctx.stroke();
 }
 if(moving)wake();
}
function wake(){if(!raf)raf=requestAnimationFrame(draw);}
new ResizeObserver(wake).observe(canvas);reduced.addEventListener('change',wake);
window.addEventListener('keyup',event=>{if(event.key===keyHolding)keyHolding=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();keyHolding=null;save();}else wake();});window.addEventListener('blur',()=>{stop();keyHolding=null;});window.addEventListener('pagehide',()=>{stop();save();});
try{
 await Promise.all([flower.decode(),foundation.decode()]);
 ready=true;camera=[...targetCamera()];if(state.mode==='meadow')backdrop.src='./assets/meadow.webp';update();wake();
}catch{$('error').hidden=false;$('error').textContent='Не удалось загрузить арт. Обновите страницу, когда появится соединение.';craft.disabled=true;surface.disabled=true;}
