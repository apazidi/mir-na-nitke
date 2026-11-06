export const VERSION=1, FIBER_COUNT=3600, DEFAULT_SEED=281119, MIN_LENGTH=.035;
const cache=new Map();
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function random(seed){let n=seed>>>0;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}

/** Project the exposed part of a dense 3D bundle, with tips distributed over a
 * sphere. Front-facing strands are foreshortened; depth also determines light
 * and occlusion order. The hidden tied roots are not a solid backing bitmap. */
export function makeFibers(seed=DEFAULT_SEED){
 if(cache.has(seed))return cache.get(seed);
 const rnd=random(seed),fibers=[];
 for(let id=0;id<FIBER_COUNT;id++){
  const a=rnd()*Math.PI*2,nz=id%4===0?.55+rnd()*.45:rnd()*2-1,r=Math.sqrt(1-nz*nz),nx=Math.cos(a)*r,ny=Math.sin(a)*r;
  const inner=.62+rnd()*.18;
  const root={x:nx*inner+(rnd()-.5)*.035,y:ny*inner+(rnd()-.5)*.035,z:nz*inner};
  const bulge=1+.055*Math.sin(a*3+.4)+.035*Math.sin(a*5-1.3);
  const radius=bulge*(.89+rnd()*.21)+(id%23===0?.06:0);
  const end={x:nx*radius,y:ny*radius,z:nz*radius};
  const dx=end.x-root.x,dy=end.y-root.y,dz=end.z-root.z;
  const tangent={x:-Math.sin(a),y:Math.cos(a)},cross={x:-nz*Math.cos(a),y:-nz*Math.sin(a)};
  const curl=(rnd()-.5)*.23,phase=rnd()*Math.PI*2,otherCurl=(rnd()-.5)*.20;
  const points=[];
  for(let j=0;j<=28;j++){
   const t=j/28;
   const bend=Math.sin(Math.PI*t)*curl,other=Math.sin(Math.PI*t)*otherCurl;
   points.push({x:root.x+dx*t+tangent.x*bend+cross.x*other,y:root.y+dy*t+tangent.y*bend+cross.y*other,z:root.z+dz*t+r*other});
  }
  const bounds=Object.freeze({left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))});
  fibers.push(Object.freeze({id,points:Object.freeze(points.map(Object.freeze)),bounds,normal:Object.freeze({x:nx,y:ny,z:nz}),depth:end.z,width:.014+rnd()*.012,tone:rnd(),phase}));
 }
 const result=Object.freeze(fibers.sort((a,b)=>a.depth-b.depth));
 cache.set(seed,result);if(cache.size>2)cache.delete(cache.keys().next().value);return result;
}
export function createState(seed=DEFAULT_SEED){return{version:VERSION,seed:seed>>>0,lengths:Array(FIBER_COUNT).fill(1),history:[],active:false,finished:false,cutOperations:0,cutCount:0};}
export function beginPass(state){return state.finished?state:{...state,active:false};}
export function endPass(state){return state.active?{...state,active:false}:state;}
export function pointAt(fiber,length){const n=clamp(length,0,1)*28,i=Math.min(27,Math.floor(n)),t=n-i,a=fiber.points[i],b=fiber.points[i+1];return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
export function visiblePoints(fiber,length){const end=clamp(length,0,1)*28,result=fiber.points.slice(0,Math.floor(end)+1);if(end%1)result.push(pointAt(fiber,length));return result;}
function intersection(a,b,c,d){
 const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;
 if(Math.abs(den)<1e-9)return null;
 const qx=c.x-a.x,qy=c.y-a.y,t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den;
 return t>=0&&t<=1&&u>=0&&u<=1?{t,u}:null;
}
export function cutSegment(state,a,b){
 if(state.finished||![a.x,a.y,b.x,b.y].every(Number.isFinite)||Math.hypot(a.x-b.x,a.y-b.y)<.001)return{state,fragments:[],changed:0};
 const fibers=makeFibers(state.seed),changes=[],fragments=[],left=Math.min(a.x,b.x),right=Math.max(a.x,b.x),top=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y);
 for(const fiber of fibers){
  const box=fiber.bounds;if(box.right<left||box.left>right||box.bottom<top||box.top>bottom)continue;
  const old=state.lengths[fiber.id];let hit=old;
  const max=Math.ceil(old*28);
  for(let j=0;j<max;j++){
   const from=j/28,to=Math.min((j+1)/28,old);
   const meet=intersection(fiber.points[j],to===(j+1)/28?fiber.points[j+1]:pointAt(fiber,to),a,b);
   if(!meet)continue;
   const length=from+(to-from)*meet.t;
   if(length>=MIN_LENGTH&&length<hit-.004)hit=length;
  }
  if(hit<old-.004){
   changes.push([fiber.id,hit]);
   const tail=[pointAt(fiber,hit),...fiber.points.slice(Math.floor(hit*28)+1,Math.floor(old*28)+1),pointAt(fiber,old)];
   fragments.push({id:fiber.id,points:tail,width:fiber.width,tone:fiber.tone});
  }
 }
 if(!changes.length)return{state,fragments:[],changed:0};
 const lengths=state.lengths.slice();for(const[id,length]of changes)lengths[id]=length;
 const history=state.active?state.history:[...state.history.slice(-11),{lengths:state.lengths.slice(),cutOperations:state.cutOperations,cutCount:state.cutCount}];
 return{state:{...state,lengths,history,active:true,cutOperations:state.cutOperations+1,cutCount:state.cutCount+changes.length},fragments,changed:changes.length};
}
export function undo(state){if(!state.history.length)return state;const before=state.history.at(-1);return{...state,...before,lengths:before.lengths.slice(),history:state.history.slice(0,-1),active:false,finished:false};}
export function finish(state){return{...endPass(state),finished:true};}
export function resume(state){return{...state,finished:false,active:false};}
export function save(state){return JSON.stringify({...state,active:false});}
export function load(text){
 try{
  const state=JSON.parse(text);
  const validLengths=a=>Array.isArray(a)&&a.length===FIBER_COUNT&&a.every(n=>Number.isFinite(n)&&n>=MIN_LENGTH&&n<=1);
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  if(state.version!==VERSION||!Number.isSafeInteger(state.seed)||state.seed<0||state.seed>4294967295||!validLengths(state.lengths)||!Array.isArray(state.history)||state.history.length>12||!count(state.cutOperations)||!count(state.cutCount)||typeof state.finished!=='boolean')return null;
  if(!state.history.every(h=>validLengths(h.lengths)&&count(h.cutOperations)&&count(h.cutCount)))return null;
  return{version:VERSION,seed:state.seed,lengths:state.lengths.slice(),history:state.history.map(h=>({lengths:h.lengths.slice(),cutOperations:h.cutOperations,cutCount:h.cutCount})),active:false,finished:state.finished,cutOperations:state.cutOperations,cutCount:state.cutCount};
 }catch{return null;}
}
export function snapshot(state){
 const fibers=makeFibers(state.seed),bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
 for(const f of fibers)for(const p of visiblePoints(f,state.lengths[f.id])){bounds.left=Math.min(bounds.left,p.x);bounds.right=Math.max(bounds.right,p.x);bounds.top=Math.min(bounds.top,p.y);bounds.bottom=Math.max(bounds.bottom,p.y);}
 return{version:VERSION,seed:state.seed,lengths:state.lengths.slice(),changedFibers:state.lengths.filter(n=>n<1).length,cutOperations:state.cutOperations,undoDepth:state.history.length,finished:state.finished,profileBounds:bounds};
}
