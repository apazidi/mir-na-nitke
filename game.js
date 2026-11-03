/* Мир на ниточке — v2 / real stitch growth experiment.
 * No external runtime dependencies. Uses Canvas2D to DRAW INDIVIDUAL STITCHES.
 * This is a technological/art experiment for the bunny's BODY, not the full bunny.
 */
(() => {
  'use strict';

  const W = 800, H = 560, SAVE_KEY = 'mir-na-nitochke/v2/body/01';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const radii = [23,49,71,89,103,114,121,125,127,127,125,120,114,106,97,84,71,57,41,25];
  const rows = radii.map((radius, i) => ({
    index: i,
    radius,
    y: 471 - i * 12.7,
    count: Math.round(7 + radius * .142),
  }));
  const TOTAL = rows.reduce((sum, r) => sum + r.count, 0);
  const $ = id => document.getElementById(id);
  const canvas = $('work-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const backing = document.createElement('canvas'), stitchesLayer = document.createElement('canvas');
  for (const layer of [canvas, backing, stitchesLayer]) {
    layer.width = Math.round(W * dpr);
    layer.height = Math.round(H * dpr);
  }
  const bg = backing.getContext('2d'), body = stitchesLayer.getContext('2d');
  for (const c of [ctx, bg, body]) c.setTransform(dpr, 0, 0, dpr, 0, 0);

  const defaults = () => ({ stitches: 0, coins: 30, clickLevel: 0, idleLevel: 0, lastAt: Date.now(), totalClicks: 0 });
  let state = defaults();
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Number.isFinite(parsed.stitches) && Number.isFinite(parsed.coins)) {
        state = { ...state, ...parsed };
        state.clickLevel = Math.max(0, Math.min(25, Number(state.clickLevel) || 0));
        state.idleLevel = Math.max(0, Math.min(25, Number(state.idleLevel) || 0));
        state.stitches = Math.max(0, Math.min(TOTAL, state.stitches));
        const offline = Math.max(0, Math.min(8 * 3600, (Date.now() - state.lastAt) / 1000));
        if (offline && state.stitches < TOTAL) {
          const gained = Math.min(offline * (.6 + .6 * state.idleLevel), TOTAL - state.stitches);
          state.stitches += gained;
          state.coins += gained * .35;
        }
        if (offline > 30) window.addEventListener('load', () => showToast(`Пока тебя не было, волшебные спицы связали ${Math.floor(offline * idleRate())} петель ✧`), { once: true });
      }
    }
  } catch (e) { /* Private browsing / disabled storage: the game remains playable. */ }

  let previousStitchCount = -1;
  let lastT = performance.now();
  let lastSavedAt = performance.now();
  let lastUiAt = 0;
  let needlePulse = 0;
  let particles = [];
  let toastTimer;
  let completedNotified = state.stitches >= TOTAL;
  let sliderHeld = false;
  const clickGain = () => 8 + 4 * state.clickLevel;
  const idleRate = () => .6 + .6 * state.idleLevel;
  const clickCost = () => Math.ceil(25 * Math.pow(1.65, state.clickLevel));
  const idleCost = () => Math.ceil(40 * Math.pow(1.75, state.idleLevel));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const progress = () => clamp(state.stitches / TOTAL, 0, 1);

  function rowPosition(index) {
    let n = Math.floor(clamp(index, 0, TOTAL - .0001));
    for (const row of rows) {
      if (n < row.count) return { row, column: n };
      n -= row.count;
    }
    return { row: rows.at(-1), column: rows.at(-1).count - 1 };
  }

  function addStitches(amount, visual = false) {
    if (state.stitches >= TOTAL) return 0;
    const before = state.stitches;
    state.stitches = clamp(before + Math.max(0, amount), 0, TOTAL);
    const actual = state.stitches - before;
    state.coins += actual * .35;
    if (visual) {
      needlePulse = 1;
      const { row, column } = rowPosition(Math.min(TOTAL - 1, Math.floor(state.stitches)));
      const p = stitchCoordinates(row, column);
      for (let i = 0; i < 8; i++) particles.push({ x: p.x + (Math.random() - .5) * 22, y: p.y, vx: (Math.random() - .5) * 1.9, vy: -1 - Math.random() * 2, life: 1, size: Math.random() * 2.6 + 1 });
    }
    if (state.stitches >= TOTAL && !completedNotified) {
      completedNotified = true;
      showToast('Туловище готово! ✧ Можно переходить к голове и ушкам.');
      for (let i = 0; i < 26; i++) particles.push({ x: 440 + (Math.random() - .5) * 260, y: 350 + (Math.random() - .5) * 180, vx: (Math.random() - .5) * 3, vy: -1 - Math.random() * 3, life: 1, size: Math.random() * 3 + 2 });
    }
    return actual;
  }

  function save() {
    try {
      state.lastAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) { /* Saving is best effort in file:// and private modes. */ }
  }

  function showToast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
  }

  function makeClick() {
    if (state.stitches >= TOTAL) return;
    const gain = addStitches(clickGain(), true);
    state.totalClicks++;
    $('tap-guide').classList.add('is-hidden');
    if (window.Telegram?.WebApp?.HapticFeedback) {
      try { window.Telegram.WebApp.HapticFeedback.impactOccurred('light'); } catch (e) {}
    }
    updateUi(true);
    save();
    return gain;
  }

  function purchase(type) {
    const price = type === 'click' ? clickCost() : idleCost();
    if (state.coins < price) return;
    state.coins -= price;
    if (type === 'click') state.clickLevel++;
    else state.idleLevel++;
    showToast(type === 'click' ? 'Крючок стал ловчее! ✦' : 'Волшебные спицы вяжут быстрее! ✦');
    updateUi(true);
    save();
  }

  $('stitch-button').addEventListener('click', makeClick);
  $('canvas-frame').addEventListener('pointerdown', makeClick);
  $('upgrade-click').addEventListener('click', () => purchase('click'));
  $('upgrade-idle').addEventListener('click', () => purchase('idle'));
  $('reset').addEventListener('click', () => {
    state = defaults();
    completedNotified = false;
    previousStitchCount = -1;
    needlePulse = 0;
    particles = [];
    $('tap-guide').classList.remove('is-hidden');
    updateUi(true);
    save();
    showToast('Новая ниточка — новая история!');
  });
  $('scrub').addEventListener('pointerdown', () => { sliderHeld = true; });
  $('scrub').addEventListener('pointerup', () => { sliderHeld = false; });
  $('scrub').addEventListener('input', e => {
    const next = Number(e.target.value) / 100;
    state.stitches = next * TOTAL;
    completedNotified = state.stitches >= TOTAL;
    previousStitchCount = -1;
    updateUi(true);
    save();
  });
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
    else {
      const elapsed = clamp((Date.now() - state.lastAt) / 1000, 0, 8 * 3600);
      addStitches(elapsed * idleRate(), false);
      lastT = performance.now();
      updateUi(true);
    }
  });

  function updateUi(force = false) {
    const pct = Math.round(progress() * 100);
    const completed = state.stitches >= TOTAL;
    const pos = rowPosition(state.stitches);
    $('progress-percent').textContent = pct + '%';
    $('scrub-percent').textContent = pct + '%';
    $('progress-fill').style.width = pct + '%';
    $('stitch-count').textContent = `${Math.floor(state.stitches)} / ${TOTAL} петель`;
    $('current-row').textContent = completed ? 'Туловище готово' : `Круг ${pos.row.index + 1} из ${rows.length}`;
    $('stage-label').textContent = completed ? '✧ Готовая деталь' : `Круг ${pos.row.index + 1} из ${rows.length}`;
    $('coins').textContent = Math.floor(state.coins).toLocaleString('ru-RU');
    $('idle-rate').textContent = idleRate().toFixed(1);
    $('click-gain').textContent = `+${clickGain()} петель за нажатие`;
    $('click-price').textContent = clickCost();
    $('idle-price').textContent = idleCost();
    $('click-description').textContent = `Ур. ${state.clickLevel} · +4 петли за клик`;
    $('idle-description').textContent = `Ур. ${state.idleLevel} · +0.6 петли/сек`;
    $('upgrade-click').disabled = state.coins < clickCost() || completed;
    $('upgrade-idle').disabled = state.coins < idleCost() || completed;
    $('stitch-button').disabled = completed;
    $('stitch-button').querySelector('span:nth-child(2)').childNodes[0].textContent = completed ? 'Туловище связано' : 'Провязать петли';
    $('progress-caption').textContent = completed
      ? 'Связанная деталь готова. Следующие этапы: голова, ушки, лапки и оживание.'
      : pos.row.index < 4 ? 'Из первых колечек постепенно возникает объём.'
      : pos.row.index < 12 ? 'Стежок за стежком туловище становится круглее.'
      : 'Ряды становятся уже — скоро закончим форму.';
    if (!sliderHeld || force) $('scrub').value = pct;
  }

  function seeded(i) {
    let x = Math.sin(i * 84.718 + 14.131) * 43758.5453;
    return x - Math.floor(x);
  }
  function fillRoundRect(c, x, y, w, h, r) {
    c.beginPath(); c.roundRect(x,y,w,h,r); c.fill();
  }

  function drawEnvironment() {
    bg.clearRect(0,0,W,H);
    const wood = bg.createLinearGradient(0,0,0,H);
    wood.addColorStop(0,'#e7cdb6'); wood.addColorStop(.5,'#d8b599'); wood.addColorStop(1,'#c99e7f');
    bg.fillStyle = wood; bg.fillRect(0,0,W,H);
    for(let i=0;i<150;i++) {
      const y=(i*29.8) % H, jitter=seeded(i)*14;
      bg.strokeStyle=i%5===0?'rgba(111,71,57,.09)':'rgba(255,237,212,.10)';
      bg.lineWidth=i%8===0?2.4:.7;
      bg.beginPath(); bg.moveTo(-40,y); bg.bezierCurveTo(170,y+jitter,500,y-jitter,830,y+jitter*.4); bg.stroke();
    }
    bg.fillStyle='rgba(126,84,65,.18)'; bg.fillRect(0,152,W,2); bg.fillRect(0,402,W,2);
    const light = bg.createRadialGradient(410,140,20,410,310,510);
    light.addColorStop(0,'rgba(255,251,232,.69)'); light.addColorStop(.65,'rgba(255,248,225,.19)'); light.addColorStop(1,'rgba(83,56,45,.12)');
    bg.fillStyle=light;bg.fillRect(0,0,W,H);
    // Tailor's fabric mat, raised over the wooden desk.
    bg.save();bg.shadowColor='rgba(80,62,52,.32)';bg.shadowBlur=22;bg.shadowOffsetY=12;
    bg.fillStyle='#8e9e7c';bg.beginPath();bg.ellipse(444,478,263,68,0,0,Math.PI*2);bg.fill();bg.restore();
    const felt=bg.createLinearGradient(0,420,0,540);felt.addColorStop(0,'#c8d0a9');felt.addColorStop(1,'#a5b78e');
    bg.fillStyle=felt;bg.beginPath();bg.ellipse(440,465,259,70,0,0,Math.PI*2);bg.fill();
    bg.strokeStyle='#e7e5c9';bg.lineWidth=4;bg.setLineDash([5,8]);
    bg.beginPath();bg.ellipse(440,462,249,61,0,0,Math.PI*2);bg.stroke();bg.setLineDash([]);
    // Felt fibers make the surface feel handmade.
    for(let i=0;i<650;i++) {
      const ang=seeded(i+100)*Math.PI*2, r=Math.sqrt(seeded(i+1200));
      const x=440+Math.cos(ang)*252*r, y=465+Math.sin(ang)*65*r;
      bg.strokeStyle=i%3===0?'rgba(243,241,209,.25)':'rgba(65,96,62,.10)';bg.lineWidth=.7;
      bg.beginPath();bg.moveTo(x,y);bg.lineTo(x+seeded(i+240)*4,y-2);bg.stroke();
    }
    // A tiny embroidered wildflower at the rim.
    for(let i=0;i<5;i++){
      bg.save();bg.translate(634,481);bg.rotate(i*Math.PI*2/5);bg.fillStyle='#fff4df';
      bg.beginPath();bg.ellipse(0,-8,4,8,0,0,Math.PI*2);bg.fill();bg.restore();
    }
    bg.fillStyle='#e3ab60';bg.beginPath();bg.arc(634,481,5,0,Math.PI*2);bg.fill();
    // Contrasting hoop of embroidery on the corner of the desk.
    bg.save();bg.translate(688,145);bg.rotate(.11);
    bg.shadowColor='rgba(83,56,43,.18)';bg.shadowBlur=12;bg.shadowOffsetY=7;
    bg.fillStyle='#ead7bd';bg.beginPath();bg.ellipse(0,0,58,58,0,0,Math.PI*2);bg.fill();bg.restore();
    bg.strokeStyle='#bb916e';bg.lineWidth=8;bg.beginPath();bg.ellipse(688,145,57,57,.11,0,Math.PI*2);bg.stroke();
    bg.strokeStyle='#8ea882';bg.lineWidth=7;bg.lineCap='round';
    bg.beginPath();bg.moveTo(668,164);bg.quadraticCurveTo(685,141,703,117);bg.stroke();
    for (const [x,y,r] of [[672,144,-.7],[693,133,.7],[687,159,-.4]]) {
      bg.save();bg.translate(x,y);bg.rotate(r);bg.fillStyle='#a3b99a';bg.beginPath();bg.ellipse(0,0,8,15,0,0,Math.PI*2);bg.fill();bg.restore();
    }
    bg.fillStyle='#d89c9e';for(const [x,y] of [[709,111],[715,115],[710,120],[704,117]]){bg.beginPath();bg.arc(x,y,5,0,Math.PI*2);bg.fill()}
    drawBall(bg);
  }

  function drawBall(c) {
    const x=146,y=433;
    c.save();c.shadowColor='rgba(84,49,38,.26)';c.shadowBlur=16;c.shadowOffsetY=9;
    const g=c.createRadialGradient(120,400,7,146,438,86);
    g.addColorStop(0,'#fff6e7');g.addColorStop(.38,'#f7dfc9');g.addColorStop(.8,'#dfbda4');g.addColorStop(1,'#ad8573');
    c.fillStyle=g;c.beginPath();c.ellipse(x,y,67,52,.21,0,Math.PI*2);c.fill();c.restore();
    c.save();c.beginPath();c.ellipse(x,y,67,52,.21,0,Math.PI*2);c.clip();
    for(let i=-20;i<35;i++){
      c.beginPath();c.moveTo(74+i*7,385);c.bezierCurveTo(143+i*5,407,121-i*3,451,200+i*3,480);
      c.strokeStyle=i%4===0?'#bd9983':i%3===0?'#fff5e7':'#eed0bb';c.lineWidth=3.5;c.stroke();
      c.beginPath();c.moveTo(65,378+i*6);c.bezierCurveTo(112,395+i*2,157,420+i*2,218,465+i*5);
      c.strokeStyle=i%3===0?'rgba(255,255,255,.35)':'rgba(176,128,113,.18)';c.lineWidth=1.5;c.stroke();
    }
    c.restore();
    c.strokeStyle='#fff4e5';c.lineWidth=4;c.beginPath();c.arc(143,432,24,4.1,6.9);c.stroke();
  }

  function stitchCoordinates(row, j) {
    const fract=(j+.5)/row.count, u=fract*2-1;
    return {
      x:443 + u * row.radius + (row.index % 2 ? 2.8 : 0),
      y:row.y + 1.9 * Math.cos(u*3.1) + 1.4*Math.sin(j*3 + row.index),
      u,
    };
  }

  function drawStitch(c,row,j) {
    const {x,y,u}=stitchCoordinates(row,j);
    const shade=Math.abs(u);
    const a=clamp(1-shade*.17,.71,1);
    const w=clamp((row.radius*2/row.count)*1.22,9.1,16.5);
    const h=11.9;
    const left=x-w*.51, right=x+w*.5;
    c.save(); c.globalAlpha=a; c.lineCap='round';c.lineJoin='round';
    // Plush convex wool knot: volume changes with lighting across each round.
    const wool=c.createRadialGradient(x-w*.24,y-2.6,1,x,y+1.8,w*.81);
    wool.addColorStop(0,shade>.7?'#fff0dd':'#fff9e9');
    wool.addColorStop(.46,shade>.7?'#f0d7c1':'#f4ddc6');
    wool.addColorStop(.88,shade>.7?'#c7a48e':'#dab69e');
    wool.addColorStop(1,'#ac8a7b');
    c.fillStyle=wool;
    c.beginPath();c.ellipse(x,y+1,w*.63,6.5,0,0,Math.PI*2);c.fill();
    // Looped cord: two separately shaded branches, not a static image reveal.
    c.strokeStyle='rgba(115,78,67,.25)';c.lineWidth=9.4;
    c.beginPath();c.moveTo(left,y-h*.38);c.bezierCurveTo(left+1,y+2,x-1,y+7,x,y+4);
    c.moveTo(right,y-h*.38);c.bezierCurveTo(right-1,y+2,x+1,y+7,x,y+4);c.stroke();
    c.strokeStyle=shade>.7?'#d5baa4':'#e0c7b1';c.lineWidth=8.3;c.stroke();
    c.strokeStyle=shade>.7?'#eee0cf':'#ffeedc';c.lineWidth=6.8;
    c.beginPath();c.moveTo(left,y-h*.44);c.bezierCurveTo(left+.4,y+1,x-2,y+5,x,y+3);
    c.moveTo(right,y-h*.44);c.bezierCurveTo(right-.4,y+1,x+2,y+5,x,y+3);c.stroke();
    c.strokeStyle='rgba(255,255,251,.8)';c.lineWidth=1.6;
    c.beginPath();c.moveTo(left+.8,y-h*.44);c.quadraticCurveTo(x-w*.37,y+1,x-.5,y+2);
    c.moveTo(x+w*.5-.9,y-h*.44);c.quadraticCurveTo(x+w*.33,y+1,x+1,y+2);c.stroke();
    // Natural stitch groove and a few stray yarn fibers.
    c.strokeStyle='rgba(157,108,99,.20)';c.lineWidth=.8;
    c.beginPath();c.moveTo(x-1.2,y+1.8);c.lineTo(x+1.1,y+4.7);c.stroke();
    if ((row.index*71 + j*17)%6===0) {
      c.strokeStyle='rgba(255,246,233,.61)';c.beginPath();c.moveTo(x-w*.5,y-2);c.lineTo(x-w*.5-2,y-3.4);c.stroke();
    }
    c.restore();
  }

  function paintStitches() {
    body.clearRect(0,0,W,H);
    const done=Math.floor(state.stitches);
    if(!done) return;
    // Body has a subtle contact shadow that grows with actual stitched matter.
    const growth=clamp(done/TOTAL,0,1);
    body.fillStyle=`rgba(76,56,49,${.06+.15*growth})`;
    body.beginPath();body.ellipse(443,493,27+96*growth,7+10*growth,0,0,Math.PI*2);body.fill();
    let left=done;
    for (const row of rows) {
      if(left<=0) break;
      const n=Math.min(left,row.count);
      if(n===row.count){
        // A narrow yarn-colored bridge below the independent loops; physically present only for completed rounds.
        const v=body.createLinearGradient(443-row.radius,row.y,443+row.radius,row.y);
        v.addColorStop(0,'#cbb198');v.addColorStop(.22,'#e6cdb7');v.addColorStop(.5,'#f2dac2');v.addColorStop(.8,'#ddc2a9');v.addColorStop(1,'#bb9e8d');
        body.strokeStyle=v;body.lineCap='round';body.lineWidth=7.2;
        body.beginPath();body.moveTo(443-row.radius+5,row.y+1);body.lineTo(443+row.radius-5,row.y+1);body.stroke();
      }
      for(let j=0;j<n;j++) drawStitch(body,row,j);
      left-=row.count;
    }
    // Small opening at the active circular rim to communicate round crocheting.
    const p = rowPosition(state.stitches);
    if (p.row.index>1 && done<TOTAL) {
      const radius=p.row.radius;
      body.strokeStyle='rgba(153,105,89,.18)';body.lineWidth=2;
      body.beginPath();body.ellipse(443,p.row.y-5,radius*.66,7,0,Math.PI,Math.PI*2);body.stroke();
    }
  }

  function needleLocation() {
    if(state.stitches>=TOTAL) return {x:498,y:214};
    const {row,column}=rowPosition(state.stitches);
    return stitchCoordinates(row,column);
  }

  function drawWorkingYarn(c,x,y,t) {
    // Working yarn links the spool with the single currently active loop.
    c.save();c.lineCap='round';c.lineJoin='round';
    const sway=Math.sin(t*.0014)*3;
    c.beginPath();c.moveTo(178,403);c.bezierCurveTo(260,374+sway,273,272,315,229);c.bezierCurveTo(344,207,358,185,x-6,y-3);
    c.strokeStyle='rgba(129,90,79,.27)';c.lineWidth=6;c.stroke();
    c.strokeStyle='#f1d1b5';c.lineWidth=4.3;c.stroke();
    c.strokeStyle='#ffefe0';c.lineWidth=1.3;c.stroke();
    c.restore();
  }

  function drawHook(c,x,y,t) {
    const activity=state.stitches>=TOTAL?0:Math.sin(t*.012)*(1+needlePulse*5);
    const yy=y-8+activity;
    c.save();c.translate(x+4,yy-3);c.rotate(-.45+Math.sin(t*.003)*.016);c.shadowBlur=11;c.shadowColor='rgba(69,43,40,.23)';c.shadowOffsetY=5;
    // Golden metal shaft pointing into the latest stitch.
    const gold=c.createLinearGradient(0,0,0,-8);gold.addColorStop(0,'#976232');gold.addColorStop(.27,'#f0c66e');gold.addColorStop(.60,'#ffdf8e');gold.addColorStop(1,'#a8733d');
    c.strokeStyle=gold;c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(110,-65);c.stroke();
    c.shadowBlur=0;
    c.strokeStyle='#cf8b53';c.lineWidth=11;c.beginPath();c.moveTo(80,-48);c.lineTo(148,-89);c.stroke();
    c.strokeStyle='#d9919b';c.lineWidth=15;c.beginPath();c.moveTo(104,-63);c.lineTo(167,-100);c.stroke();
    c.strokeStyle='rgba(255,238,228,.6)';c.lineWidth=3;c.beginPath();c.moveTo(109,-67);c.lineTo(164,-99);c.stroke();
    c.strokeStyle='#9a6235';c.lineWidth=6;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-11,-7,-11,-14);c.stroke();
    c.strokeStyle='#ffe4a1';c.lineWidth=3.6;c.beginPath();c.moveTo(-1,-1);c.quadraticCurveTo(-9,-8,-9,-13);c.stroke();
    c.restore();
  }

  function drawFrame(t) {
    ctx.drawImage(backing,0,0,W,H);
    ctx.drawImage(stitchesLayer,0,0,W,H);
    const active=needleLocation();
    if (state.stitches < TOTAL) {
      drawWorkingYarn(ctx,active.x,active.y,t);
      drawHook(ctx,active.x,active.y,t);
      // Highlight loop being worked on.
      const glint=ctx.createRadialGradient(active.x,active.y,0,active.x,active.y,20);
      glint.addColorStop(0,`rgba(255,249,212,${.12+needlePulse*.4})`);glint.addColorStop(1,'rgba(255,249,212,0)');
      ctx.fillStyle=glint;ctx.fillRect(active.x-24,active.y-24,48,48);
    } else {
      // Finished body remains fully knitted and material, no opacity reveal.
      const alpha=.4+.25*Math.sin(t*.003);
      ctx.strokeStyle=`rgba(255,252,228,${alpha})`;ctx.lineWidth=2;
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const x=443+Math.cos(a)*142,y=335+Math.sin(a)*119;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}
    }
    particles=particles.filter(p=>p.life>0);
    for(const p of particles){
      ctx.save();ctx.globalAlpha=clamp(p.life,0,1);ctx.fillStyle='#fff9dc';
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.restore();
      p.x+=p.vx;p.y+=p.vy;p.vy+=.042;p.life-=.027;
    }
    needlePulse=Math.max(0,needlePulse-.05);
  }

  drawEnvironment();
  updateUi(true);

  function frame(t) {
    const dt=clamp((t-lastT)/1000,0,.15);lastT=t;
    if (document.visibilityState !== 'hidden' && state.stitches<TOTAL) addStitches(idleRate()*dt,false);
    if (Math.floor(state.stitches)!==previousStitchCount) {
      paintStitches();previousStitchCount=Math.floor(state.stitches);
    }
    drawFrame(t);
    if (t-lastUiAt>160){updateUi();lastUiAt=t;}
    if (t-lastSavedAt>2500){save();lastSavedAt=t;}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Helpful for repeatable browser QA; not a game feature.
  window.__knitDemo = { getState: () => ({...state,total:TOTAL,rows:rows.length}), reset:()=>$('reset').click(), knit:makeClick };
})();
