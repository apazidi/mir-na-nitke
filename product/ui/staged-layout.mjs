// Visible-material anchors, separate from legacy transparent-artboard slots.
// The same fit is used while crafting and after placement; saves keep slot IDs.
export const STAGED_LAYOUT=Object.freeze({
 rabbit:{x:.38,foot:.69,maxWidth:130,maxHeight:230},
 flower:{x:.73,foot:.70,maxWidth:150,maxHeight:170},
 tree:{x:.25,foot:.47,maxWidth:150,maxHeight:175},
 'kot-cat':{x:.43,foot:.70,maxWidth:155,maxHeight:230},
});
export function stagedFit(id,art,width,height){
 const pose=STAGED_LAYOUT[id],[l,t,w,h]=art.visibleBounds;
 const scale=Math.min(pose.maxWidth/w,pose.maxHeight/h,width*.45/w);
 return {scale,x:width*pose.x-(l+w/2)*scale,y:height*pose.foot-(t+h)*scale};
}
export function fitStagedSprite(target,image,art,itemId,world){
 if(!world.isConnected)return;
 const {scale,x,y}=stagedFit(itemId,art,world.clientWidth,world.clientHeight),[l,t,w,h]=art.visibleBounds;
 Object.assign(target.style,{left:x+(l+w/2)*scale+'px',top:y+(t+h/2)*scale+'px',width:w*scale+'px',height:h*scale+'px',aspectRatio:'auto'});
 Object.assign(image.style,{position:'absolute',left:-l*scale+'px',top:-t*scale+'px',width:art.width*scale+'px',height:art.height*scale+'px',objectFit:'fill'});
}
