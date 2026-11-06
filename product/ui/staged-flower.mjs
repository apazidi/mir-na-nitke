// All source pixels stay unchanged. Canvas clipping only selects semantic
// sections at runtime; completed sections keep the same source and placement.
const WIDTH=1024, HEIGHT=1820;
const WHITE_COROLLA_PATH='M344 596 C375 597 405 615 414 652 C431 633 455 623 481 625 C511 627 538 650 542 679 C545 704 534 730 516 748 C548 742 570 762 574 791 C588 825 565 849 538 859 C518 866 496 858 477 849 C485 872 482 900 466 926 C450 951 424 961 400 950 C369 940 349 915 344 889 C328 916 299 935 269 930 C234 927 208 909 202 883 C195 856 210 833 229 817 C202 821 178 808 170 785 C154 758 167 729 191 709 C220 684 249 687 278 705 C269 679 269 652 284 626 C300 604 322 594 344 596 Z';
const PINK_COROLLA_PATH='M529 928 C511 900 522 869 549 854 C577 838 609 844 632 871 C648 849 670 835 696 839 C730 841 749 863 751 894 C755 920 748 938 732 950 C764 937 793 947 813 974 C837 1000 840 1034 820 1056 C802 1078 773 1082 744 1070 C761 1090 768 1124 750 1147 C730 1170 701 1174 674 1161 C648 1153 627 1133 614 1113 C597 1139 572 1150 545 1142 C515 1136 488 1122 480 1095 C470 1070 481 1046 500 1027 C475 1031 449 1014 443 991 C435 967 447 942 469 930 C487 919 510 919 529 928 Z';
const WHITE_CENTRE_PATH='M374 716 C416 713 449 742 451 777 C452 810 424 836 391 839 C355 845 326 829 313 802 C300 775 306 744 330 730 C343 722 359 717 374 716 Z';
const zones={pink:[630,1003,68,60],bud:[650,778,99,105]};
function ellipse(values){const p=new Path2D();p.ellipse(...values,0,0,Math.PI*2);return p;}

function source(path){const image=new Image();image.src=new URL(path,import.meta.url).href;return image.decode().then(()=>image);}
function effectContour(data,[left,top,w,h]){
  const cols=Math.ceil(w/4),rows=Math.ceil(h/4),solid=new Uint8Array(cols*rows),seen=new Uint8Array(cols*rows),edge=[];
  for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++)solid[gy*cols+gx]=data[((top+gy*4)*WIDTH+left+gx*4)*4+3]>=140?1:0;
  const neighbors=id=>{const x=id%cols,y=Math.floor(id/cols),out=[];if(x)out.push(id-1);if(x+1<cols)out.push(id+1);if(y)out.push(id-cols);if(y+1<rows)out.push(id+cols);return out;};
  for(let start=0;start<solid.length;start++)if(solid[start]&&!seen[start]){
    const component=[start];seen[start]=1;
    for(let at=0;at<component.length;at++)for(const next of neighbors(component[at]))if(solid[next]&&!seen[next]){seen[next]=1;component.push(next);}
    if(component.length<12)continue;
    for(const id of component){const adjacent=neighbors(id);if(adjacent.length<4||adjacent.some(next=>!solid[next]))edge.push([left+(id%cols)*4,top+Math.floor(id/cols)*4]);}
  }
  return edge;
}
function layer(sourceImage,clip,exclude=[]){
  const full=document.createElement('canvas');full.width=WIDTH;full.height=HEIGHT;
  const context=full.getContext('2d',{willReadFrequently:true});
  if(clip){context.save();context.clip(clip);context.drawImage(sourceImage,0,0);context.restore();}else context.drawImage(sourceImage,0,0);
  if(exclude.length){context.globalCompositeOperation='destination-out';for(const path of exclude)context.fill(path);context.globalCompositeOperation='source-over';}
  const data=context.getImageData(0,0,WIDTH,HEIGHT).data;
  let left=WIDTH,top=HEIGHT,right=0,bottom=0;
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)if(data[(y*WIDTH+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  if(right<left)throw new Error('Empty art section');
  left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(WIDTH-1,right+2);bottom=Math.min(HEIGHT-1,bottom+2);
  const w=right-left+1,h=bottom-top+1,image=document.createElement('canvas');image.width=w;image.height=h;
  image.getContext('2d').drawImage(full,left,top,w,h,0,0,w,h);
  // Threshold/component filtering applies only to FX positions, never to art.
  const edge=effectContour(data,[left,top,w,h]);
  return{image,bounds:[left,top,w,h],edge};
}

export async function loadFlowerSections(){
  const [base,finished]=await Promise.all([
    source('../content/items/meadow-flower/art/stage-02.webp'),
    source('../content/items/meadow-flower/art/finished.webp'),
  ]);
  const white=new Path2D(WHITE_CENTRE_PATH),pink=ellipse(zones.pink),bud=ellipse(zones.bud);
  // Exact corolla selections are supplied by the art-direction review.
  if(!WHITE_COROLLA_PATH||!PINK_COROLLA_PATH)throw new Error('Art contour review is not complete');
  const whiteCorolla=new Path2D(WHITE_COROLLA_PATH),pinkCorolla=new Path2D(PINK_COROLLA_PATH);
  return[
    {id:'green-foundation',name:'Мох, стебли и листья',anchor:[470,1220],z:0,...layer(base,null,[white,pink,bud])},
    {id:'white-centre',name:'Сердцевина ромашки',anchor:[379,782],z:4,...layer(base,white)},
    {id:'white-corolla',name:'Белый венчик',anchor:[365,735],z:2,...layer(finished,whiteCorolla)},
    {id:'pink-centre',name:'Тёплая сердцевина',anchor:[638,999],z:5,...layer(base,pink)},
    {id:'pink-corolla',name:'Розовый венчик',anchor:[690,947],z:3,...layer(finished,pinkCorolla)},
    {id:'closed-bud',name:'Последний бутон',anchor:[650,778],z:1,...layer(base,bud)},
  ];
}
