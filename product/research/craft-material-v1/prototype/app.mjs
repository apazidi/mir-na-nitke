import * as model from './model.mjs';
const KEY='mir-craft-material-pompom-v2';
const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d'),undoButton=document.querySelector('#undo'),finishButton=document.querySelector('#finish'),status=document.querySelector('#status');
const materialCache=document.createElement('canvas'),materialContext=materialCache.getContext('2d');
let paintedLengths=null,paintedWidth=0,paintedHeight=0,dirtyBounds=null;
let state=model.createState(),storageAvailable=true;
try{const saved=localStorage.getItem(KEY);if(saved){const restored=model.load(saved);if(restored)state=restored;else status.textContent='Сохранение не прочиталось; открыта новая заготовка.';}}catch{storageAvailable=false;}
let fibers=model.makeFibers(state.seed),width=390,height=590,scale=106,center={x:195,y:280},drag=null,particles=[],closedAt=-1000,framePending=false;
const tool={x:1.05,y:-.36,angle:Math.PI/4,visible:true};
const gripDistance=.40;
function placeToolFromGrip(p){tool.x=p.x-Math.cos(tool.angle)*gripDistance;tool.y=p.y-Math.sin(tool.angle)*gripDistance;tool.visible=true;}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const screen=p=>({x:center.x+p.x*scale,y:center.y+p.y*scale});
const world=p=>({x:(p.x-center.x)/scale,y:(p.y-center.y)/scale});
const local=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
function persist(){try{localStorage.setItem(KEY,model.save(state));}catch{storageAvailable=false;status.textContent='Можно работать; браузер сейчас не сохраняет результат.';}}
function sync(){undoButton.disabled=!state.history.length;finishButton.textContent=state.finished?'Продолжить подрезку':'Оставить эту форму';canvas.dataset.finished=String(state.finished);canvas.dataset.changed=String(state.lengths.filter(n=>n<1).length);if(state.finished)status.textContent='Сохранена ваша форма. Её можно поправить.';else if(storageAvailable)status.textContent='Подравнивайте край понемногу. Последний проход можно отменить.';}
function requestDraw(){if(!framePending){framePending=true;requestAnimationFrame(draw);}}
function resize(){const box=canvas.getBoundingClientRect();width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scale=Math.min(108,width*.282,height*.265);center={x:width*.5,y:height*.48};requestDraw();}
function trace(points){if(!points.length)return;ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length-1;i+=3){const p=points[i],q=points[Math.min(points.length-1,i+3)];ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}if(points.length>1)ctx.lineTo(points.at(-1).x,points.at(-1).y);}
function yarnColor(fiber,alpha=1,add=0){const n=fiber.normal,light=Math.max(0,Math.min(1,.29+n.z*.64-n.x*.25-n.y*.30)),tone=(fiber.tone-.5)*14;return`rgba(${Math.round(142+light*91+tone+add)},${Math.round(76+light*108+tone+add)},${Math.round(76+light*101+tone+add)},${alpha})`;}
function table(){
 const wood=ctx.createLinearGradient(0,0,width,height);wood.addColorStop(0,'#ebc896');wood.addColorStop(1,'#bc8b54');ctx.fillStyle=wood;ctx.fillRect(0,0,width,height);
 ctx.save();ctx.globalAlpha=.13;ctx.strokeStyle='#805a30';ctx.lineWidth=1;for(let y=10;y<height;y+=17){ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(width*.25,y+9,width*.64,y-8,width,y+2);ctx.stroke();}ctx.restore();
 ctx.save();ctx.translate(width*.5,height*.47);ctx.rotate(-.045);ctx.shadowColor='#63472d35';ctx.shadowBlur=15;ctx.shadowOffsetY=7;ctx.fillStyle='#eee0c5';ctx.beginPath();ctx.roundRect(-width*.43,-height*.39,width*.86,height*.78,16);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.strokeStyle='#ccb58d';ctx.setLineDash([3,4]);ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-width*.43+9,-height*.39+9,width*.86-18,height*.78-18,10);ctx.stroke();ctx.setLineDash([]);
 ctx.globalAlpha=.10;ctx.strokeStyle='#8c795b';ctx.lineWidth=.5;for(let x=-width*.42;x<width*.42;x+=3){ctx.beginPath();ctx.moveTo(x,-height*.38);ctx.lineTo(x,height*.38);ctx.stroke();}for(let y=-height*.38;y<height*.38;y+=3){ctx.beginPath();ctx.moveTo(-width*.42,y);ctx.lineTo(width*.42,y);ctx.stroke();}ctx.restore();
 const light=ctx.createRadialGradient(width*.18,height*.04,10,width*.38,height*.28,height*.8);light.addColorStop(0,'#fff5d746');light.addColorStop(1,'#fff5d700');ctx.fillStyle=light;ctx.fillRect(0,0,width,height);
}
function material(region=null){
 const visible=(region?fibers.filter(f=>f.bounds.right>=region.left&&f.bounds.left<=region.right&&f.bounds.bottom>=region.top&&f.bounds.top<=region.bottom):fibers).map(f=>({f,depth:model.pointAt(f,state.lengths[f.id]).z})).sort((a,b)=>a.depth-b.depth).map(entry=>entry.f);
 ctx.save();ctx.translate(center.x,center.y);ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';
 // Every body stroke is generated from the current remaining strand lengths.
 // No finished-ball bitmap, invariant silhouette or opaque sphere sits below it.
 ctx.save();ctx.translate(.035,.065);ctx.filter=`blur(${Math.max(3,scale*.04)}px)`;ctx.strokeStyle='#6e4a2440';ctx.lineWidth=.043;ctx.beginPath();for(const f of visible)trace(model.surfacePoints(f,state.lengths[f.id]));ctx.stroke();ctx.restore();
 for(const f of visible){
  const points=model.surfacePoints(f,state.lengths[f.id]);
  ctx.beginPath();trace(points);ctx.strokeStyle=yarnColor(f,.18);ctx.lineWidth=f.width*2.4;ctx.stroke();
  ctx.beginPath();trace(points);ctx.strokeStyle=yarnColor(f);ctx.lineWidth=f.width;ctx.stroke();
  for(let strand=-1;strand<=1;strand++){ctx.beginPath();trace(points.map((p,i)=>({x:p.x+strand*f.width*.4+Math.sin(i*.17+f.phase+strand)*.004,y:p.y+strand*f.width*.27+Math.cos(i*.13+f.phase)*.004})));ctx.strokeStyle=yarnColor(f,.44,strand===-1?14:4);ctx.lineWidth=.003;ctx.stroke();}
  if(state.lengths[f.id]<1){const p=points.at(-1);ctx.fillStyle=yarnColor(f,.85,10);ctx.beginPath();ctx.arc(p.x,p.y,f.width*.45,0,Math.PI*2);ctx.fill();}
 }
 ctx.restore();
}
function bladePoints(){const half=.118,c=Math.cos(tool.angle),s=Math.sin(tool.angle);return{a:{x:tool.x-c*half,y:tool.y-s*half},b:{x:tool.x+c*half,y:tool.y+s*half}};}
function scissors(now){
 if(!tool.visible||state.finished)return;
 const p=screen(tool),angle=tool.angle,closure=Math.max(0,1-(now-closedAt)/130),spread=.20*(1-closure);
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.lineCap='round';ctx.lineJoin='round';
 const half=.118*scale,pivot=half+2;
 ctx.shadowColor='#4d392e38';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
 for(const side of [-1,1]){ctx.save();ctx.translate(pivot,0);ctx.rotate(side*spread);const steel=ctx.createLinearGradient(0,-4,0,4);steel.addColorStop(0,'#fffdf5');steel.addColorStop(.45,'#b7c1be');steel.addColorStop(1,'#66736e');ctx.fillStyle=steel;ctx.strokeStyle='#727d76';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(1,side*3);ctx.lineTo(-pivot-half,0);ctx.quadraticCurveTo(-pivot-half*.5,side*3,-6,side*6);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#8d6846';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,side*2);ctx.lineTo(14,side*10);ctx.stroke();ctx.beginPath();ctx.ellipse(23,side*14,10,7,side*.25,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#d8bc8c';ctx.lineWidth=1;ctx.stroke();ctx.restore();}
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#a58c6a';ctx.beginPath();ctx.arc(pivot,0,3.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#5c645c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pivot-2,-1);ctx.lineTo(pivot+2,1);ctx.stroke();ctx.restore();
}
function draw(now){framePending=false;ctx.clearRect(0,0,width,height);
 if(paintedLengths!==state.lengths||paintedWidth!==canvas.width||paintedHeight!==canvas.height){
  const partial=paintedLengths&&dirtyBounds&&paintedWidth===canvas.width&&paintedHeight===canvas.height;
  if(partial){ctx.drawImage(materialCache,0,0,width,height);const b={left:dirtyBounds.left-.16,right:dirtyBounds.right+.16,top:dirtyBounds.top-.16,bottom:dirtyBounds.bottom+.16},p=screen({x:b.left,y:b.top});ctx.save();ctx.beginPath();ctx.rect(Math.floor(p.x),Math.floor(p.y),Math.ceil((b.right-b.left)*scale)+2,Math.ceil((b.bottom-b.top)*scale)+2);ctx.clip();table();material({left:b.left-.16,right:b.right+.16,top:b.top-.16,bottom:b.bottom+.16});ctx.restore();}else{table();material();}
  materialCache.width=canvas.width;materialCache.height=canvas.height;materialContext.drawImage(canvas,0,0);paintedLengths=state.lengths;paintedWidth=canvas.width;paintedHeight=canvas.height;dirtyBounds=null;
 }else ctx.drawImage(materialCache,0,0,width,height);
 particles=particles.filter(p=>now-p.time<900);
 for(const p of particles){const age=(now-p.time)/900,fall=reduced.matches?0:age*age*48;ctx.save();ctx.globalAlpha=1-age;ctx.translate(center.x+p.dx*age,center.y+fall);ctx.scale(scale,scale);ctx.lineCap='round';ctx.strokeStyle=`rgba(207,141,131,.85)`;ctx.lineWidth=p.width;ctx.beginPath();trace(p.points);ctx.stroke();ctx.restore();}
 scissors(now);document.documentElement.dataset.ready='true';if(particles.length||now-closedAt<140)requestDraw();
}
function snip(previousBlade=null){const blade=bladePoints(),before=state,result=previousBlade?model.cutSweep(state,previousBlade,blade):model.cutSegment(state,blade.a,blade.b);closedAt=performance.now();if(result.changed){state=result.state;const now=performance.now();if(!dirtyBounds)dirtyBounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};const ids=new Set(result.fragments.map(f=>f.id)),exposed=fibers.filter(f=>ids.has(f.id)).flatMap(f=>[...model.surfacePoints(f,before.lengths[f.id]),...model.surfacePoints(f,state.lengths[f.id])]);for(const p of [...result.fragments.flatMap(f=>f.points),...exposed]){dirtyBounds.left=Math.min(dirtyBounds.left,p.x);dirtyBounds.right=Math.max(dirtyBounds.right,p.x);dirtyBounds.top=Math.min(dirtyBounds.top,p.y);dirtyBounds.bottom=Math.max(dirtyBounds.bottom,p.y);}for(const f of result.fragments.slice(0,35)){particles.push({...f,time:now,dx:((f.id%11)-5)*3});}particles=particles.slice(-100);}requestDraw();return result.changed;}
canvas.addEventListener('pointerdown',e=>{if(state.finished||e.button!==0)return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);const p=world(local(e));placeToolFromGrip(p);drag={id:e.pointerId,last:p};state=model.beginPass(state);requestDraw();});
canvas.addEventListener('pointermove',e=>{const p=world(local(e));if(!drag){if(e.pointerType==='mouse'){placeToolFromGrip(p);requestDraw();}return;}if(e.pointerId!==drag.id)return;e.preventDefault();const dx=p.x-drag.last.x,dy=p.y-drag.last.y,distance=Math.hypot(dx,dy);if(distance<.037)return;const steps=Math.min(20,Math.ceil(distance/.028)),from={...drag.last};let changed=0;for(let i=1;i<=steps;i++){const previousBlade=bladePoints();placeToolFromGrip({x:from.x+dx*i/steps,y:from.y+dy*i/steps});changed+=snip(previousBlade);}drag.last=p;if(changed){persist();sync();}});
function end(e){if(!drag||e.pointerId!==drag.id)return;state=model.endPass(state);drag=null;persist();sync();requestDraw();}
canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);canvas.addEventListener('pointerleave',()=>{if(!drag){tool.visible=false;requestDraw();}});
canvas.addEventListener('keydown',e=>{if(state.finished)return;const step=e.shiftKey?.08:.035;let moved=true;if(e.key==='ArrowLeft')tool.x-=step;else if(e.key==='ArrowRight')tool.x+=step;else if(e.key==='ArrowUp')tool.y-=step;else if(e.key==='ArrowDown')tool.y+=step;else moved=false;if(moved){e.preventDefault();tool.x=Math.max(-1.7,Math.min(1.7,tool.x));tool.y=Math.max(-1.7,Math.min(1.7,tool.y));tool.visible=true;requestDraw();}if(e.code==='Space'){e.preventDefault();if(e.repeat)return;tool.visible=true;state=model.beginPass(state);snip();state=model.endPass(state);persist();sync();}if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undoButton.click();}});
undoButton.addEventListener('click',()=>{state=model.undo(state);particles=[];paintedLengths=null;dirtyBounds=null;persist();sync();requestDraw();});
finishButton.addEventListener('click',()=>{state=state.finished?model.resume(state):model.finish(state);drag=null;tool.visible=false;particles=[];persist();sync();requestDraw();});
document.querySelector('#reset').addEventListener('click',()=>{state=model.createState((state.seed+1)>>>0);fibers=model.makeFibers(state.seed);particles=[];drag=null;paintedLengths=null;dirtyBounds=null;tool.visible=true;tool.x=1.05;tool.y=-.36;persist();sync();requestDraw();});
addEventListener('pagehide',()=>{state=model.endPass(state);persist();});
new ResizeObserver(resize).observe(canvas);reduced.addEventListener('change',requestDraw);
window.__craftStudy=Object.freeze({snapshot:()=>structuredClone({...model.snapshot(state),storageAvailable}),points:()=>{const r=canvas.getBoundingClientRect(),blade=bladePoints(),bounds=model.snapshot(state).profileBounds,absolute=p=>{const s=screen(p);return{x:r.x+s.x,y:r.y+s.y};},gripOffset={x:Math.cos(tool.angle)*gripDistance*scale,y:Math.sin(tool.angle)*gripDistance*scale};return{canvas:{x:r.x,y:r.y,width:r.width,height:r.height},center:absolute({x:0,y:0}),scale,materialBounds:{left:absolute({x:bounds.left,y:0}).x,right:absolute({x:bounds.right,y:0}).x,top:absolute({x:0,y:bounds.top}).y,bottom:absolute({x:0,y:bounds.bottom}).y},tool:{...absolute(tool),angle:tool.angle,visible:tool.visible},gripOffset,handle:{x:absolute(tool).x+gripOffset.x,y:absolute(tool).y+gripOffset.y},blade:{a:absolute(blade.a),b:absolute(blade.b)},endpoints:fibers.map(f=>({id:f.id,...absolute(model.pointAt(f,state.lengths[f.id]))}))};}});
sync();resize();
