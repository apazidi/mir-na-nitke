import * as model from './model.mjs';
import { loadSections } from './sections.mjs';

const $ = id => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d');
const KEY = 'mir-stage-magic-v1';
const effect = new URLSearchParams(location.search).get('effect') === 'wave' ? 'wave' : 'sparks';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const storageFailure = 'Прогресс доступен только пока открыта страница: сохранение недоступно.';
let state = model.createState(Date.now()), storageAvailable = true, storageWarning = '', offlineMessage = '';
try {
  const text = localStorage.getItem(KEY);
  if (text !== null) {
    const saved = model.deserialize(text);
    if (saved) {
      state = model.advance(saved, Date.now());
      if (state.work - saved.work > .03) offlineMessage = state.work === model.SECTION_COUNT
        ? 'Пока вас не было, цветы появились на полянке.'
        : `Пока вас не было, работа продолжалась. Готовых частей: ${Math.floor(state.work)}.`;
      persist();
    } else storageWarning = 'Сохранение не прочиталось. Открыта пустая полянка.';
  }
} catch { storageAvailable = false; storageWarning = storageFailure; }

let sections = [], ready = false, raf = 0, width = 390, height = 828;
let artScale = .25, artX = 67, artY = 205;
let shownOpacity=opacity(state.work%1,Math.floor(state.work)),shownStage=Math.floor(state.work);
let lastFrame = 0, lastPersist = 0, lastAutoSpark = 0, lastArrival = -1000, offlineUntil = 0;
let flights = [], glints = [], accents = [], finaleAt = -10_000, serial = 0;
const waveCanvas = document.createElement('canvas'), waveCtx = waveCanvas.getContext('2d');

function persist() {
  try { localStorage.setItem(KEY, model.serialize(state)); storageAvailable = true; storageWarning = ''; }
  catch { storageAvailable = false; storageWarning = storageFailure; }
}

function sync() {
  const s = model.snapshot(state);
  $('phase').textContent = s.complete ? 'Цветы готовы' : (s.started && sections.length ? sections[s.stageIndex].name : 'Первые цветы');
  $('step').textContent = s.started ? `${s.complete ? model.SECTION_COUNT : s.stageIndex + 1} / ${model.SECTION_COUNT}` : '';
  $('meter').style.width = `${s.stageProgress * 100}%`;
  $('hint').textContent = s.complete ? 'Они останутся здесь, на вашей полянке.'
    : s.auto ? 'Авто работает. Нажатия ускоряют появление.'
      : s.started ? 'Каждое нажатие добавляет пряжу новой части.' : 'Нажимайте «Вязать» — появится первая часть.';
  $('auto').textContent = s.auto ? 'Авто: вкл.' : 'Авто: выкл.';
  $('auto').setAttribute('aria-pressed', String(s.auto));
  $('craft').hidden = s.complete; $('auto').hidden = s.complete; $('reset').hidden = !s.complete;
  $('craft').disabled = !ready; $('auto').disabled = !ready;
  const message = storageWarning || (s.complete ? 'Сохранено на этом устройстве.' : '');
  if ($('status').textContent !== message) $('status').textContent = message;
}

function wake() { if (!raf && ready) raf = requestAnimationFrame(draw); }
function resize() {
  document.documentElement.dataset.ready = 'false';
  const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  width = box.width; height = box.height;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  artScale = Math.min(184, width * .48) / 730;
  artX = width * .52 - 500 * artScale;
  artY = height * .65 - 1365 * artScale;
  wake();
}
const screen = point => ({ x: artX + point[0] * artScale, y: artY + point[1] * artScale });
function opacity(progress, section) {
  const p=Math.max(0,Math.min(1,progress));
  return section===0 ? (p<=.08 ? p/.08*.5 : .5+(p-.08)/.92*.5) : Math.pow(p,.65);
}

function sectionDraw(section, alpha) {
  if (alpha <= 0) return;
  const [x,y,w,h] = section.bounds;
  ctx.globalAlpha = alpha;
  ctx.drawImage(section.image, artX + x * artScale, artY + y * artScale, w * artScale, h * artScale);
  ctx.globalAlpha = 1;
}

function makeGlints(sectionIndex, now, count = 4) {
  const section = sections[Math.min(sectionIndex, sections.length - 1)];
  for (let n = 0; n < count; n++) {
    const index = (serial++ * 71 + n * 137) % section.edge.length;
    const point = section.edge[index] || section.anchor;
    glints.push({ point, born: now + n * 15, duration: 340 + n * 12, size: n % 2 ? 1.5 : 2.2 });
  }
  glints = glints.slice(-16);
}

function workingAccent(section, now) {
  if (now-lastArrival<90) return;
  lastArrival=now;makeGlints(section,now,reduced.matches?1:3);
  if(effect==='wave'){
    accents=accents.filter(a=>!a.working||a.section!==section);
    accents.push({section,born:now,duration:500,working:true});
  }
}

function noteCrossings(before, after, now) {
  for (let i = Math.floor(before.work); i < Math.floor(after.work); i++) {
    if(effect==='wave')accents.push({section:i,born:now+160,duration:460});
    else makeGlints(i,now+160,reduced.matches?2:6);
  }
  if (before.work < model.SECTION_COUNT && after.work === model.SECTION_COUNT) {
    finaleAt=now+180;
    for(let i=0;i<model.SECTION_COUNT;i++)makeGlints(i,now+280+i*25,1);
  }
}

function drawWave(section, age, strength) {
  const [x,y,w,h] = section.bounds;
  waveCanvas.width = w; waveCanvas.height = h;
  waveCtx.drawImage(section.image, 0, 0);
  waveCtx.globalCompositeOperation = 'source-in';
  const at = h * (1.15 - age * 1.4), band = Math.max(50, h * .16);
  const light = waveCtx.createLinearGradient(0, at - band, 0, at + band);
  light.addColorStop(0, '#fff2bf00'); light.addColorStop(.5, '#fff4bfe6'); light.addColorStop(1, '#fff2bf00');
  waveCtx.fillStyle = light; waveCtx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = strength * Math.sin(age * Math.PI);
  ctx.drawImage(waveCanvas, artX + x * artScale, artY + y * artScale, w * artScale, h * artScale);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

function draw(now) {
  raf = 0;
  const dt = Math.min(80, now - (lastFrame || now)); lastFrame = now;
  const before = state;
  state = model.advance(state, Date.now());
  if (state.work !== before.work) { noteCrossings(before, state, now); sync(); }
  if (state.auto && now - lastPersist > 1000) { persist(); lastPersist = now; sync(); }
  if (before.auto && !state.auto) { persist(); sync(); }
  const completed = Math.floor(state.work);
  if(completed!==shownStage){shownStage=completed;shownOpacity=0;}
  const targetOpacity=opacity(state.work-completed,completed);
  shownOpacity=reduced.matches?targetOpacity:shownOpacity+(targetOpacity-shownOpacity)*Math.min(1,dt/65);
  if(Math.abs(targetOpacity-shownOpacity)<.0001)shownOpacity=targetOpacity;
  ctx.clearRect(0, 0, width, height);
  if (state.work > 0) {
    const ground = screen([505, 1342]);
    ctx.save(); ctx.globalAlpha = (completed?1:shownOpacity) * .24;
    ctx.fillStyle = '#38451d'; ctx.filter = 'blur(5px)'; ctx.beginPath();
    ctx.ellipse(ground.x, ground.y + 3, 57, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  for (const {section,index} of sections.map((section,index)=>({section,index})).sort((a,b)=>a.section.z-b.section.z)) sectionDraw(section, index < completed ? 1 : index === completed ? shownOpacity : 0);

  if (state.auto && !reduced.matches && now - lastAutoSpark > 1800) {
    makeGlints(Math.min(completed, sections.length - 1), now, 2);
    if (effect === 'wave') accents.push({ section: completed, born: now, duration: 650, working: true });
    lastAutoSpark = now;
  }

  const remainingFlights = [];
  for (const flight of flights) {
    const t = Math.max(0, (now - flight.born) / 210), target = screen(sections[flight.section].anchor);
    if (t >= 1) {
      workingAccent(flight.section,now);
      continue;
    }
    remainingFlights.push(flight);
    if (reduced.matches) continue;
    const x = flight.from.x + (target.x - flight.from.x) * t + Math.sin(t * Math.PI) * 24;
    const y = flight.from.y + (target.y - flight.from.y) * t;
    const glow = ctx.createRadialGradient(x,y,0,x,y,8);
    glow.addColorStop(0,'#fffbd4'); glow.addColorStop(.25,'#ffe7a4d9'); glow.addColorStop(1,'#ffe6a400');
    ctx.fillStyle = glow; ctx.fillRect(x-8,y-8,16,16);
    const flash = 1 - Math.min(1,t*3);
    if (flash > 0) { ctx.strokeStyle = `rgba(255,244,196,${flash*.8})`; ctx.lineWidth=2;ctx.beginPath();ctx.arc(flight.from.x,flight.from.y,8+t*20,0,Math.PI*2);ctx.stroke(); }
  }
  flights = remainingFlights;

  glints = glints.filter(g => now - g.born < g.duration);
  for (const g of glints) {
    const t = (now - g.born) / g.duration;
    if (t < 0) continue;
    const p = screen(g.point), alpha = Math.sin(t*Math.PI) * .85;
    ctx.fillStyle=`rgba(255,244,192,${alpha})`;ctx.shadowColor='#ffd88c';ctx.shadowBlur=5;
    ctx.beginPath();ctx.arc(p.x,p.y-(reduced.matches?0:t*5),g.size,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }
  accents = accents.filter(a => now - a.born < a.duration);
  for (const a of accents) {
    const t = (now-a.born)/a.duration;
    if (t < 0 || a.section >= sections.length) continue;
    if (effect === 'wave' && !reduced.matches) drawWave(sections[a.section],t,a.working?.34:.46);
  }
  const finishAge=(now-finaleAt)/1000;
  if (offlineMessage && now < offlineUntil) { $('offline').hidden=false;$('offline').textContent=offlineMessage; } else $('offline').hidden=true;
  document.documentElement.dataset.ready='true';
  if(state.auto || flights.length || glints.length || accents.length || targetOpacity!==shownOpacity || finishAge<1 && finishAge>-.2 || offlineMessage && now<offlineUntil)wake();
}

$('craft').addEventListener('click', event => {
  if (!ready) return;
  const now=performance.now(), settled=model.advance(state,Date.now());
  lastFrame=now;
  if(settled.work===model.SECTION_COUNT)return;
  state=model.click(settled,Date.now());
  const box=canvas.getBoundingClientRect(),button=$('craft').getBoundingClientRect();
  const from={x:(event.detail?event.clientX:button.x+button.width/2)-box.x,y:(event.detail?event.clientY:button.y+button.height/2)-box.y};
  flights.push({from,section:Math.floor(settled.work),born:now});flights=flights.slice(-4);
  $('craft').classList.add('flashing');setTimeout(()=>$('craft').classList.remove('flashing'),160);
  noteCrossings(settled,state,now);persist();sync();wake();
});
$('auto').addEventListener('click',()=>{state=model.setAuto(state,!state.auto,Date.now());persist();sync();wake();});
$('reset').addEventListener('click',()=>{if(state.work!==model.SECTION_COUNT)return;state=model.createState(Date.now());shownOpacity=0;shownStage=0;flights=[];glints=[];accents=[];offlineMessage='';finaleAt=-10_000;persist();sync();wake();$('craft').focus({preventScroll:true});});
function settleAndSave(){state=model.advance(state,Date.now());persist();sync();}
addEventListener('pagehide',settleAndSave);
document.addEventListener('visibilitychange',()=>{settleAndSave();if(!document.hidden)wake();});
new ResizeObserver(resize).observe(canvas);reduced.addEventListener('change',wake);

window.__stageStudy=Object.freeze({snapshot:()=>structuredClone({...model.snapshot(state),effect,storageAvailable,artReady:ready}),points:()=>{
  const box=canvas.getBoundingClientRect(),rect=id=>{const r=$(id).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,center:{x:r.x+r.width/2,y:r.y+r.height/2}};};
  return{canvas:rect('scene'),craft:rect('craft'),auto:rect('auto'),reset:rect('reset'),artScale,
    sections:sections.map(s=>{const p=screen(s.anchor),b=screen([s.bounds[0],s.bounds[1]]);return{id:s.id,name:s.name,x:box.x+p.x,y:box.y+p.y,bounds:{x:box.x+b.x,y:box.y+b.y,width:s.bounds[2]*artScale,height:s.bounds[3]*artScale}};}),item:{x:box.x+artX+140*artScale,y:box.y+artY+585*artScale,width:730*artScale,height:785*artScale},ground:{x:box.x+screen([505,1365]).x,y:box.y+screen([505,1365]).y}};
}});

sync();
try{const loaded=await Promise.all([loadSections(),...Array.from(document.images,image=>image.decode())]);sections=loaded[0];if(sections.length!==model.SECTION_COUNT)throw new Error('Section count mismatch');ready=true;offlineUntil=performance.now()+5500;sync();resize();}
catch(error){$('error').hidden=false;$('craft').disabled=true;$('auto').disabled=true;console.error(error);}
