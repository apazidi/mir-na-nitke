import {loadStagedArt} from './staged-art.mjs';
import {sectionAt} from './staged-catalog.mjs';
import {stagedFit} from './staged-layout.mjs';
export function sectionOpacity(p,itemId,index){p=Math.max(0,Math.min(1,p));return itemId==='flower'&&index===0?(p<=.08?p/.08*.5:.5+(p-.08)/.92*.5):p**.65;}
/** A single canvas survives the shell's DOM rebuilds. Game state stays in session. */
export function createStagedRenderer(onError=()=>{}){
 const canvas=document.createElement('canvas');canvas.className='staged-canvas';canvas.setAttribute('aria-hidden','true');
 const ctx=canvas.getContext('2d'),native=document.createElement('canvas'),nativeCtx=native.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let item=null,art=null,ready=false,work=0,auto=false,raf=0,last=0,shown=0,shownIndex=-1,width=0,height=0,scale=1,x=0,y=0,serial=0,lastAuto=0,glints=[],flights=[],error=null;
 const screen=p=>({x:x+p[0]*scale,y:y+p[1]*scale});
 const wake=()=>{if(!raf&&art&&canvas.isConnected)raf=requestAnimationFrame(draw);};
 function accent(index,now,count=3){const s=art?.sections[Math.min(index,art.sections.length-1)];if(!s)return;for(let n=0;n<count;n++)glints.push({point:s.edge[(serial++*71+n*137)%s.edge.length]??s.anchor,born:now+n*15,duration:340+n*12,size:n%2?1.5:2.2});glints=glints.slice(-16);}
 function fit(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(r.width===width&&r.height===height)return;
  ready=false;document.documentElement.dataset.stageReady='false';width=r.width;height=r.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  if(art)({scale,x,y}=stagedFit(item.id,art,width,height));
 }
 function draw(now){raf=0;if(!canvas.isConnected||!art)return;fit();const dt=Math.min(80,now-(last||now));last=now;
  const stage=sectionAt(item.id,work);if(shownIndex!==stage.index){shownIndex=stage.index;shown=0;}const target=sectionOpacity(stage.progress,item.id,stage.index);shown=reduced.matches?target:shown+(target-shown)*Math.min(1,dt/65);if(Math.abs(target-shown)<.0001)shown=target;
  ctx.clearRect(0,0,width,height);
  if(work>0){const [l,t,w,h]=art.visibleBounds,p=screen([l+w/2,t+h]);ctx.save();ctx.globalAlpha=(stage.index?1:shown)*.2;ctx.fillStyle='#38451d';ctx.filter='blur(5px)';ctx.beginPath();ctx.ellipse(p.x,p.y+2,Math.min(57,w*scale*.4),8,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  // Composite at source resolution before a single resampling. Independently
  // scaling touching masks creates semi-transparent seams at fractional pixels.
  nativeCtx.clearRect(0,0,native.width,native.height);
  for(const {s,i}of art.sections.map((s,i)=>({s,i})).sort((a,b)=>a.s.z-b.s.z)){const alpha=i<stage.index?1:i===stage.index?shown:0;if(!alpha)continue;nativeCtx.globalAlpha=alpha;nativeCtx.drawImage(s.image,s.bounds[0],s.bounds[1]);}nativeCtx.globalAlpha=1;
  ctx.drawImage(native,x,y,art.width*scale,art.height*scale);
  if(auto&&stage.index<art.sections.length&&!reduced.matches&&now-lastAuto>1800){accent(stage.index,now,2);lastAuto=now;}
  const pending=[];for(const f of flights){const t=Math.max(0,(now-f.born)/210);if(t>=1){accent(f.index,now,reduced.matches?1:3);continue;}pending.push(f);if(reduced.matches)continue;const to=screen(art.sections[Math.min(f.index,art.sections.length-1)].anchor),px=f.from.x+(to.x-f.from.x)*t+Math.sin(t*Math.PI)*24,py=f.from.y+(to.y-f.from.y)*t,light=ctx.createRadialGradient(px,py,0,px,py,8);light.addColorStop(0,'#fffbd4');light.addColorStop(.25,'#ffe7a4d9');light.addColorStop(1,'#ffe6a400');ctx.fillStyle=light;ctx.fillRect(px-8,py-8,16,16);const a=1-Math.min(1,t*3);if(a>0){ctx.strokeStyle=`rgba(255,244,196,${a*.8})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.from.x,f.from.y,8+t*20,0,Math.PI*2);ctx.stroke();}}
  flights=pending;glints=glints.filter(g=>now-g.born<g.duration);for(const g of glints){const t=(now-g.born)/g.duration;if(t<0)continue;const p=screen(g.point);ctx.fillStyle=`rgba(255,244,192,${Math.sin(t*Math.PI)*.85})`;ctx.shadowColor='#ffd88c';ctx.shadowBlur=5;ctx.beginPath();ctx.arc(p.x,p.y-(reduced.matches?0:t*5),g.size,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
  ready=true;document.documentElement.dataset.stageReady='true';if(flights.length||glints.length||target!==shown||auto&&stage.index<art.sections.length)wake();
 }
 new ResizeObserver(()=>{fit();wake();}).observe(canvas);reduced.addEventListener('change',wake);
 return {
  refresh(){wake();},
  mount(world,next,nextWork,isAuto,z=10){const changed=item?.id!==next.id;item=next;auto=isAuto;canvas.style.zIndex=String(z);
   if(changed){art=null;ready=false;error=null;glints=[];flights=[];shownIndex=-1;work=nextWork;document.documentElement.dataset.stageReady='false';const id=next.id;loadStagedArt(next).then(a=>{if(item?.id!==id)return;art=a;native.width=a.width;native.height=a.height;width=0;wake();}).catch(e=>{error=e.message;onError('Не удалось загрузить изделие. Попробуйте обновить страницу.');});}
   else{const before=sectionAt(next.id,work),after=sectionAt(next.id,nextWork);for(let i=before.index;i<after.index;i++)accent(i,performance.now()+160,reduced.matches?2:6);if(before.index<6&&after.index===6)for(let i=0;i<6;i++)accent(i,performance.now()+280+i*25,1);work=nextWork;}
   world.append(canvas);wake();
  },
  detach(){canvas.remove();ready=false;document.documentElement.dataset.stageReady='true';},
  pulse(event){if(!art)return;const r=canvas.getBoundingClientRect(),b=document.querySelector('[data-focus-key="craft"]')?.getBoundingClientRect();flights.push({from:{x:(event?.detail?event.clientX:b?b.x+b.width/2:r.x+width/2)-r.x,y:(event?.detail?event.clientY:b?b.y+b.height/2:r.y+height*.8)-r.y},index:sectionAt(item.id,work).index,born:performance.now()});flights=flights.slice(-4);wake();},
  snapshot(){const stage=item?sectionAt(item.id,work):null;return {itemId:item?.id??null,sectionIndex:stage?.index??null,sectionProgress:stage?.progress??0,ready:ready&&canvas.isConnected,error};},
  points(){const r=canvas.getBoundingClientRect(),rect={x:r.x,y:r.y,width:r.width,height:r.height};return {canvas:rect,item:art?{x:r.x+x+art.visibleBounds[0]*scale,y:r.y+y+art.visibleBounds[1]*scale,width:art.visibleBounds[2]*scale,height:art.visibleBounds[3]*scale}:null,sections:art?.sections.map(s=>{const p=screen(s.anchor);return {id:s.id,name:s.name,x:r.x+p.x,y:r.y+p.y};})??[]};},
 };
}
