import {loadFlowerSections} from './staged-flower.mjs';
const cache=new Map();
let planPromise;
function plans(){return planPromise??=fetch(new URL('./staged-plan.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Section plan unavailable');return r.json();}).catch(error=>{planPromise=null;throw error;});}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function bounds(data,w,h,threshold=1){let l=w,t=h,r=-1,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>=threshold){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}return r<l?[0,0,1,1]:[l,t,r-l+1,b-t+1];}
function crop(full,meta){const ctx=full.getContext('2d'),data=ctx.getImageData(0,0,full.width,full.height).data,b=bounds(data,full.width,full.height),out=canvas(b[2],b[3]);out.getContext('2d').drawImage(full,...b,0,0,b[2],b[3]);
 // Component filtering affects sparks only. The artwork's alpha is untouched.
 const step=4,cols=Math.ceil(b[2]/step),rows=Math.ceil(b[3]/step),solid=new Uint8Array(cols*rows),seen=new Uint8Array(cols*rows),edge=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)solid[y*cols+x]=data[((b[1]+y*step)*full.width+b[0]+x*step)*4+3]>=128;
 const neighbors=i=>{const x=i%cols,y=Math.floor(i/cols),a=[];if(x)a.push(i-1);if(x+1<cols)a.push(i+1);if(y)a.push(i-cols);if(y+1<rows)a.push(i+cols);return a;};
 for(let i=0;i<solid.length;i++)if(solid[i]&&!seen[i]){const component=[i];seen[i]=1;for(let j=0;j<component.length;j++)for(const n of neighbors(component[j]))if(solid[n]&&!seen[n]){seen[n]=1;component.push(n);}if(component.length>=12)for(const n of component)if(neighbors(n).length<4||neighbors(n).some(q=>!solid[q]))edge.push([b[0]+n%cols*step,b[1]+Math.floor(n/cols)*step]);}
 return {...meta,image:out,bounds:b,edge};
}
async function load(item){
 let sections,w,h;
 if(item.id==='flower'){sections=await loadFlowerSections();w=1024;h=1820;}
 else {
  const plan=item.art.sectionPlan??(await plans()).find(p=>p.id===item.id);if(!plan)throw Error('No semantic plan: '+item.id);
  const source=new Image();source.src=new URL(item.art.finishedSprite,new URL('../',import.meta.url)).href;await source.decode();w=source.naturalWidth;h=source.naturalHeight;
  const full=canvas(w,h),ctx=full.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);const pixels=ctx.getImageData(0,0,w,h),owners=new Uint8Array(w*h).fill(255),layers=new Map();
  for(const id of plan.ownershipPriority){const section=plan.sections.find(s=>s.id===id),mask=canvas(w,h),m=mask.getContext('2d',{willReadFrequently:true});
   if(section.mask.type==='path'){m.fill(new Path2D(section.mask.d));const alpha=m.getImageData(0,0,w,h).data;for(let i=0;i<owners.length;i++)if(owners[i]===255&&alpha[i*4+3]>=128)owners[i]=plan.sequence.indexOf(id);}
   else for(let i=0;i<owners.length;i++)if(owners[i]===255)owners[i]=plan.sequence.indexOf(id);
  }
  for(const [index,id]of plan.sequence.entries()){const section=plan.sections.find(s=>s.id===id),image=canvas(w,h),c=image.getContext('2d'),data=c.createImageData(w,h);for(let i=0;i<owners.length;i++)if(owners[i]===index)data.data.set(pixels.data.subarray(i*4,i*4+4),i*4);c.putImageData(data,0,0);layers.set(id,crop(image,{id,name:section.label,anchor:section.anchor,z:index}));}
  sections=plan.sequence.map(id=>layers.get(id));
 }
 const composite=canvas(w,h),c=composite.getContext('2d');for(const s of [...sections].sort((a,b)=>a.z-b.z))c.drawImage(s.image,s.bounds[0],s.bounds[1]);
 const visibleBounds=bounds(c.getImageData(0,0,w,h).data,w,h,64);
 return {sections,width:w,height:h,visibleBounds,composite,finishedUrl:composite.toDataURL('image/png')};
}
export function loadStagedArt(item){if(!cache.has(item.id))cache.set(item.id,load(item).catch(error=>{cache.delete(item.id);throw error;}));return cache.get(item.id);}
