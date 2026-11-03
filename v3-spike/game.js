/* Мир на ниточке • v3 art-first row prototype.
 * The knitted texture is taken from a SINGLE illustrated master, not eight
 * independently generated pictures.  Each click adds visible material within
 * the current row; completed rows remain.  This is an art/animation test, not
 * a physically accurate crochet simulator.
 */
(() => {
  'use strict';
  const W=720, H=650;
  const ROWS=[14,18,22,27,30,33,32,28];
  const TOTAL=ROWS.reduce((s,n)=>s+n,0);
  const STORAGE_KEY='mir-na-nitke/v3/art-row-spike';
  const photo={x:156,y:224,w:438,h:324};
  const PHOTO_BOTTOM=326,PHOTO_TOP=24;
  const $=id=>document.getElementById(id);
  const canvas=$('work-canvas');
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  const imgs={};
  const urls={
    body:'./assets/crochet-body.webp',hook:'./assets/crochet-hook.webp',
    ball:'./assets/yarn-ball.webp',left:'./assets/left-workbench.webp',
    right:'./assets/right-workbench.webp',stitch:'./assets/stitch-texture.webp',rim:'./assets/open-rim.webp',ambience:'./assets/room-ambience.webp'
  };
  let loaded=false;
  let state={stitches:0,coins:30,clickLevel:0,idleLevel:0,totalClicks:0,lastAt:Date.now()};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const clickGain=()=>6+3*state.clickLevel;
  const idleRate=()=>.8+.4*state.idleLevel;
  const clickCost=()=>Math.ceil(20*Math.pow(1.8,state.clickLevel));
  const idleCost=()=>Math.ceil(35*Math.pow(1.85,state.idleLevel));
  const pct=()=>clamp(state.stitches/TOTAL,0,1);
  const rowState=()=>{
    let n=clamp(state.stitches,0,TOTAL);
    for(let i=0;i<ROWS.length;i++){
      if(n<ROWS[i])return {index:i,fill:n/ROWS[i]};
      n-=ROWS[i];
    }
    return {index:7,fill:1};
  };
  let toastTimer=null,previousFrame=performance.now(),lastSave=performance.now(),lastUI=0;
  let wobble=0,particles=[],completed=false;
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(saved&&Number.isFinite(saved.stitches)){
      state={...state,...saved};
      state.stitches=clamp(state.stitches,0,TOTAL);
      state.coins=Math.max(0,Number(state.coins)||0);
      state.clickLevel=clamp(Math.floor(Number(state.clickLevel)||0),0,20);
      state.idleLevel=clamp(Math.floor(Number(state.idleLevel)||0),0,20);
      const seconds=clamp((Date.now()-(Number(state.lastAt)||Date.now()))/1000,0,8*3600);
      if(seconds>0 && state.stitches<TOTAL){
        const gain=Math.min(TOTAL-state.stitches,seconds*idleRate());
        state.stitches+=gain;state.coins+=gain*.66;
        if(seconds>45)window.addEventListener('load',()=>setTimeout(()=>toast(`Пока тебя не было, связалось ещё ${Math.floor(gain)} петель ✨`),350),{once:true});
      }
    }
  }catch(_){/* Private mode and file: protocol remain usable. */}
  completed=state.stitches>=TOTAL;
  function save(){try{state.lastAt=Date.now();localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(_){}}
  function toast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800)}
  function spawn(){const p=currentWorkingPoint();wobble=1;for(let i=0;i<8;i++)particles.push({x:p.x+(Math.random()-.5)*20,y:p.y,vx:(Math.random()-.5)*2.7,vy:-Math.random()*2.4-.4,life:1,r:1+Math.random()*3})}
  function add(amount,animated=false){if(state.stitches>=TOTAL)return 0;const before=state.stitches;const diff=Math.min(TOTAL-before,Math.max(0,amount));state.stitches+=diff;state.coins+=diff*.66;if(animated)spawn();if(state.stitches>=TOTAL&&!completed){completed=true;toast('Туловище готово! Следом — голова и ушки ✧');for(let i=0;i<36;i++)spawn()}return diff}
  function tap(){if(state.stitches>=TOTAL){toast('Восемь рядов готовы! Это проба анимации, не весь кролик.');return;}add(clickGain(),true);state.totalClicks++;updateUI();save();try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch(_){} }
  function purchase(which){const price=which==='click'?clickCost():idleCost();if(state.stitches>=TOTAL||state.coins<price)return;state.coins-=price;if(which==='click')state.clickLevel++;else state.idleLevel++;toast(which==='click'?'Крючок стал ловчее ✧':'Клубочек работает быстрее ✧');updateUI();save()}
  $('stitch-button').addEventListener('click',tap);
  $('scene-touch').addEventListener('pointerdown',tap);
  $('scene-touch').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tap()}});
  $('upgrade-click').addEventListener('click',()=>purchase('click'));
  $('upgrade-idle').addEventListener('click',()=>purchase('idle'));
  function reset(){state={stitches:0,coins:30,clickLevel:0,idleLevel:0,totalClicks:0,lastAt:Date.now()};completed=false;wobble=0;particles=[];updateUI();save();toast('Новая ниточка — новая история!')}
  $('reset').addEventListener('click',reset);
  const scrub=$('scrub');let scrubHeld=false;
  scrub.addEventListener('pointerdown',()=>scrubHeld=true);
  scrub.addEventListener('pointerup',()=>scrubHeld=false);
  scrub.addEventListener('input',()=>{state.stitches=TOTAL*Number(scrub.value)/100;completed=state.stitches>=TOTAL;updateUI(true);save()});
  function updateUI(force=false){const percentage=Math.round(pct()*100),row=rowState();
    $('progress-percent').textContent=percentage+'%';
    $('progress-track').setAttribute('aria-valuenow',String(percentage));
    $('progress-fill').style.width=percentage+'%';
    $('current-row').textContent=completed?'8 рядов связаны':'Ряд '+(row.index+1)+' из 8';
    $('stitch-count').textContent=Math.floor(state.stitches)+' / '+TOTAL;
    $('coins').textContent=Math.floor(state.coins).toLocaleString('ru-RU');
    $('idle-rate').textContent=idleRate().toFixed(1).replace('.',',');
    $('click-gain').textContent='+'+clickGain()+' петель';
    $('click-description').textContent='+3 петли за клик · ур. '+state.clickLevel;
    $('idle-description').textContent='+0,4 петли/сек · ур. '+state.idleLevel;
    $('click-price').textContent=clickCost();$('idle-price').textContent=idleCost();
    $('upgrade-click').disabled=state.coins<clickCost()||completed;
    $('upgrade-idle').disabled=state.coins<idleCost()||completed;
    $('stage-message').textContent=completed?'Первая деталь готова!':'Ряд '+(row.index+1)+': вяжем по кругу';
    if(!scrubHeld||force)scrub.value=percentage;
    $('scrub-percent').textContent=percentage+'%';
    const btn=$('stitch-button');btn.disabled=completed;
    btn.querySelector('span:nth-child(2)').firstChild.textContent=completed?'Готово!':'Вязать!';
  }
  function seed(n){const v=Math.sin(n*19.459+6.3)*19731.426;return v-Math.floor(v)}
  function drawPhoto(image,x,y,w,h,opacity=1){if(!image?.complete||!image.naturalWidth)return;ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(image,x,y,w,h);ctx.restore()}
  function ell(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
  function background(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#a47c5e');g.addColorStop(.4,'#d7aa81');g.addColorStop(1,'#966447');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    drawPhoto(imgs.ambience,-35,-30,790,730,.85);
    // Real craft-room artwork at both sides, softly subordinate to the yarn.
    drawPhoto(imgs.left,-85,35,290,565,.62);drawPhoto(imgs.right,566,45,258,590,.6);
    const light=ctx.createRadialGradient(370,150,14,370,300,550);light.addColorStop(0,'#ffefc877');light.addColorStop(.7,'#f6d6af37');light.addColorStop(1,'#49251399');ctx.fillStyle=light;ctx.fillRect(0,0,W,H);
    // Continuous grain of the wooden table.
    for(let i=0;i<130;i++){const y=(i*37.9)%H;ctx.beginPath();ctx.moveTo(-20,y);ctx.bezierCurveTo(130,y+seed(i)*9,510,y-seed(i+20)*6,750,y+seed(i+3)*8);ctx.strokeStyle=i%6===0?'rgba(86,43,25,.06)':'rgba(255,232,191,.045)';ctx.lineWidth=i%7===0?2:.7;ctx.stroke();}
    // Felt oval with subtle woven threads.
    ctx.save();ctx.shadowColor='rgba(60,36,30,.54)';ctx.shadowBlur=28;ctx.shadowOffsetY=16;ell(374,552,284,76,'#7a784c');ctx.restore();
    const felt=ctx.createRadialGradient(345,510,2,385,556,310);felt.addColorStop(0,'#bdc69b');felt.addColorStop(.75,'#869864');felt.addColorStop(1,'#626e4d');ctx.fillStyle=felt;ctx.beginPath();ctx.ellipse(374,548,280,75,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e6e1ba';ctx.lineWidth=4;ctx.setLineDash([4,8]);ctx.beginPath();ctx.ellipse(374,544,270,65,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    for(let i=0;i<470;i++){const angle=seed(i+11)*Math.PI*2;const r=Math.sqrt(seed(i+100));const x=374+Math.cos(angle)*265*r,y=545+Math.sin(angle)*65*r;ctx.strokeStyle=i%2===0?'rgba(255,241,196,.24)':'rgba(60,74,44,.17)';ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+seed(i+78)*5-2,y-1.8);ctx.stroke()}
    // A small stitched flower on the near edge.
    for(let i=0;i<6;i++){ctx.save();ctx.translate(191,561);ctx.rotate(i*Math.PI/3);ell(0,-10,5.2,9.5,'#fff4df');ctx.restore()}ell(191,561,6,6,'#dfa967');
    drawPhoto(imgs.ball,-82,264,265,347,.92);
    const vig=ctx.createRadialGradient(365,280,135,365,320,540);vig.addColorStop(0,'#00000000');vig.addColorStop(1,'#48241b66');ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
  }
  function rowLocation(){const r=rowState();const slice=(PHOTO_BOTTOM-PHOTO_TOP)/ROWS.length;return {row:r.index,frac:r.fill,ySource:PHOTO_BOTTOM-(r.index+1)*slice,slice};}
  function imageToCanvas(x,y){return {x:photo.x+x*photo.w/471,y:photo.y+y*photo.h/349}}
  function body(){if(!imgs.body?.complete||!imgs.body.naturalWidth||state.stitches<=0)return;
    ctx.save();
    // Draw every individual photographic row as a retained, bounded region.
    // Partial row is uncovered across its row only, not a global image fade.
    const slice=(PHOTO_BOTTOM-PHOTO_TOP)/ROWS.length;
    const row=rowState();
    for(let i=0;i<ROWS.length;i++){
      if(i>row.index)break;
      const frac=i<row.index?1:row.fill;
      if(frac<=0)break;
      const yTop=PHOTO_BOTTOM-(i+1)*slice;
      const yBot=PHOTO_BOTTOM-i*slice;
      const dstTop=photo.y+(yTop/349)*photo.h;
      const dstHeight=slice/349*photo.h+1.1;
      const left=photo.x, right=photo.x+photo.w*frac;
      ctx.save();ctx.beginPath();ctx.rect(left,dstTop,Math.max(0,right-left),dstHeight);ctx.clip();
      ctx.drawImage(imgs.body,photo.x,photo.y,photo.w,photo.h);
      ctx.restore();
    }
    // The open, irregular crocheted rim comes from the SAME photographic master.
    // It is relocated to the live work edge instead of revealing a flat photo cut.
    if (state.stitches > 2 && imgs.rim?.naturalWidth) {
      const fill=(row.index+row.fill)/ROWS.length;
      const rimWidth=photo.w*(.54+.44*Math.sin(Math.PI*(fill*.77+.03)));
      const rimHeight=rimWidth*(imgs.rim.naturalHeight/imgs.rim.naturalWidth);
      const currentBoundary=PHOTO_BOTTOM-(row.index+row.fill)*slice;
      const edgeY=photo.y+(currentBoundary/349)*photo.h;
      const rimX=photo.x+photo.w/2-rimWidth/2;
      const rimY=edgeY-rimHeight*.78;
      ctx.drawImage(imgs.rim,rimX,rimY,rimWidth,rimHeight);
    }
    // The current working edge has real soft wool texture, stitched incrementally.
    const boundary=PHOTO_BOTTOM-(row.index+row.fill)*slice;
    const pY=photo.y+(boundary/349)*photo.h;
    const startX=photo.x+58;
    const finishX=photo.x+photo.w*.84;
    const count=Math.floor(row.fill*ROWS[row.index]);
    if(state.stitches<TOTAL){
      for(let i=0;i<count;i++){
        const x=startX+(i/ROWS[row.index])*(finishX-startX);
        const wave=3*Math.sin(i*.76+row.index);
        drawPhoto(imgs.stitch,x-8,pY-6+wave,18,16,.73);
      }
      // a soft rounded ridge where the most recent row is being woven
      ctx.lineCap='round';ctx.strokeStyle='rgba(255,245,226,.18)';ctx.lineWidth=2.2;
      ctx.beginPath();ctx.moveTo(startX,pY);ctx.quadraticCurveTo((startX+finishX)/2,pY-5,Math.max(startX+2,startX+row.fill*(finishX-startX)),pY);ctx.stroke();
    }
    ctx.restore();
  }
  function currentWorkingPoint(){
    const row=rowState();
    const slice=(PHOTO_BOTTOM-PHOTO_TOP)/ROWS.length;
    const currentBoundary=PHOTO_BOTTOM-(row.index+row.fill)*slice;
    const edgeY=photo.y+currentBoundary/349*photo.h;
    const fullness=(row.index+row.fill)/ROWS.length;
    const rimWidth=photo.w*(.54+.44*Math.sin(Math.PI*(fullness*.77+.03)));
    const rimHeight=rimWidth*(103/399);
    const rimX=photo.x+photo.w/2-rimWidth/2;
    return {x:rimX+rimWidth*(.18+row.fill*.65),y:edgeY-rimHeight*.22};
  }
  function workingYarn(x,y,t){
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';const sway=Math.sin(t*.0015)*4;
    ctx.beginPath();ctx.moveTo(143,427);ctx.bezierCurveTo(193,411+sway,250,389,267,348);ctx.bezierCurveTo(285,295,310,255,x-4,y-3);
    ctx.strokeStyle='rgba(91,45,35,.37)';ctx.lineWidth=8;ctx.stroke();
    ctx.strokeStyle='#ead3b8';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#fff1d8';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  function hook(x,y,t){if(!imgs.hook?.naturalWidth)return;
    ctx.save();ctx.translate(x-53,y-102+Math.sin(t*.008)*3*wobble);ctx.rotate(Math.sin(t*.008)*.017*wobble);
    ctx.shadowColor='rgba(65,35,28,.4)';ctx.shadowBlur=7;ctx.shadowOffsetY=6;
    ctx.drawImage(imgs.hook,0,0,390,162);ctx.restore();
    // gold gleam around active stitch
    const g=ctx.createRadialGradient(x,y,0,x,y,31);g.addColorStop(0,'rgba(255,241,173,'+(wobble*.36)+')');g.addColorStop(1,'rgba(255,241,173,0)');ctx.fillStyle=g;ctx.fillRect(x-33,y-33,66,66);
  }
  function decorations(t){particles=particles.filter(p=>p.life>0);for(const p of particles){ctx.save();ctx.globalAlpha=p.life;ell(p.x,p.y,p.r,p.r,'#fff4cb');ctx.restore();p.x+=p.vx;p.y+=p.vy;p.vy+=.037;p.life-=.024;}wobble=Math.max(0,wobble-.027)}
  function frame(t){const dt=clamp((t-previousFrame)/1000,0,.15);previousFrame=t;
    if(document.visibilityState==='visible'&&state.stitches<TOTAL)add(idleRate()*dt,false);
    ctx.clearRect(0,0,W,H);background();body();
    if(state.stitches<TOTAL){const p=currentWorkingPoint();workingYarn(p.x,p.y,t);hook(p.x,p.y,t)}
    else{const alpha=.28+.18*Math.sin(t*.003);ctx.strokeStyle='rgba(255,245,189,'+alpha+')';ctx.lineWidth=3;for(let i=0;i<5;i++){const a=i*Math.PI*2/5, x=380+Math.cos(a)*215,y=354+Math.sin(a)*120;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke()}}
    decorations(t);
    if(t-lastUI>145){updateUI();lastUI=t}
    if(t-lastSave>2300){save();lastSave=t}
    requestAnimationFrame(frame);
  }
  const entries=Object.entries(urls);
  Promise.all(entries.map(([key,url])=>new Promise(resolve=>{const img=new Image();img.onload=()=>{imgs[key]=img;resolve()};img.onerror=()=>{resolve()};img.src=url}))).then(()=>{loaded=true;requestAnimationFrame(frame)});
  updateUI(true);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();else{const s=clamp((Date.now()-state.lastAt)/1000,0,8*3600);if(s>.1)add(s*idleRate());previousFrame=performance.now();updateUI();save()}});
  window.addEventListener('pagehide',save);
  window.__knitSpike={getState:()=>({...state,total:TOTAL,loaded,stage:rowState()}),click:tap,setStitches:n=>{state.stitches=clamp(Number(n)||0,0,TOTAL);completed=state.stitches>=TOTAL;updateUI(true);save()},reset};
})();
