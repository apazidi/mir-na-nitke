const spriteBounds = new Map();
export function fitSpriteHitArea(target, visual, slot, world) {
 if (!visual.complete || !visual.naturalWidth) return;
 let bounds = spriteBounds.get(visual.src);
 if (!bounds) {
  const canvas = document.createElement('canvas');
  canvas.width = visual.naturalWidth; canvas.height = visual.naturalHeight;
  const context = canvas.getContext('2d', {willReadFrequently:true});
  try {
   context.drawImage(visual, 0, 0);
   const pixels = context.getImageData(0,0,canvas.width,canvas.height).data;
   let left=canvas.width, top=canvas.height, right=-1, bottom=-1;
   for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>=16){
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
   }
   bounds = right>=left ? {left,top,right:right+1,bottom:bottom+1} : {left:0,top:0,right:canvas.width,bottom:canvas.height};
  } catch {
   bounds = {left:0,top:0,right:canvas.width,bottom:canvas.height};
  }
  spriteBounds.set(visual.src,bounds);
 }
 const width=world.clientWidth*.5*slot.scale, height=width*1.25;
 const scale=Math.min(width/visual.naturalWidth,height/visual.naturalHeight);
 const paintWidth=visual.naturalWidth*scale, paintHeight=visual.naturalHeight*scale;
 const offsetX=(width-paintWidth)/2+(bounds.left+bounds.right)*scale/2-width/2;
 const offsetY=(height-paintHeight)/2+(bounds.top+bounds.bottom)*scale/2-height/2;
 const hitWidth=Math.max(44,(bounds.right-bounds.left)*scale);
 const hitHeight=Math.max(44,(bounds.bottom-bounds.top)*scale);
 Object.assign(target.style,{left:(slot.x*world.clientWidth+offsetX)+'px',top:(slot.y*world.clientHeight+offsetY)+'px',width:hitWidth+'px',height:hitHeight+'px',aspectRatio:'auto'});
 Object.assign(visual.style,{position:'absolute',width:width+'px',height:height+'px',left:((hitWidth-width)/2-offsetX)+'px',top:((hitHeight-height)/2-offsetY)+'px'});
}
