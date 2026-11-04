import {KEY,EVENTS,safeState,summarizeReturn,isEvening} from './meadow-engine.mjs';
(()=>{'use strict';
 const $=id=>document.getElementById(id),now=Date.now();
 let raw=null;try{raw=JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){}
 const ret=summarizeReturn(safeState(raw,now),now);let state=ret.updated;
 function persist(){state.lastAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){}}
 const speech=$('speech'),rabbit=$('rabbit'),butterfly=$('butterfly');
 let speechTimer=0,reactTimer=0,butterflyTimer=0,butterflyResting=false,suppressClickUntil=0;
 const morning=['Как хорошо, что ты заглянул! ♡','Ты снова здесь! Ура!','Погуляем по полянке?'];
 function say(s){speech.textContent=s;speech.classList.add('show');clearTimeout(speechTimer);speechTimer=setTimeout(()=>speech.classList.remove('show'),3100)}
 function lighting(){const evening=isEvening(state.light,new Date().getHours());$('meadow').classList.toggle('evening',evening);$('light-label').textContent=evening?'Вечер':'День';$('light-toggle').firstChild.textContent=evening?'🌙 ':'🌤️ '}
 function heart(){const h=document.createElement('span');h.className='heart';h.textContent=state.pets%3===0?'✿':'♥';h.style.left=(45+Math.random()*18)+'%';h.style.top=(57+Math.random()*12)+'%';$('heart-layer').append(h);h.addEventListener('animationend',()=>h.remove(),{once:true});setTimeout(()=>h.remove(),1700)}
 function react(type,duration=850){rabbit.classList.remove('nuzzle','hello');void rabbit.offsetWidth;rabbit.classList.add(type);clearTimeout(reactTimer);reactTimer=setTimeout(()=>rabbit.classList.remove(type),duration)}
 function greet(){react('hello',680);say(['Привет! Я тебя заметил! ♡','Здорово, что ты пришёл!','Хочешь меня погладить?'][state.visits%3]);try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch(_){}}
 function pet(){state.pets++;react('nuzzle',940);heart();say(['Так приятно! ♡','Спасибо за ласку!','Мне здесь уютно с тобой. ♡','Мурр... почти!'][state.pets%4]);persist();try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch(_){}}
 let stroke=null;
 rabbit.addEventListener('pointerdown',e=>{stroke={x:e.clientX,y:e.clientY,id:e.pointerId};});
 rabbit.addEventListener('pointerup',e=>{if(!stroke||stroke.id!==e.pointerId)return;const dx=e.clientX-stroke.x,dy=e.clientY-stroke.y;stroke=null;if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy)*1.25){suppressClickUntil=Date.now()+400;pet();}});
 rabbit.addEventListener('pointercancel',()=>{stroke=null});
 rabbit.addEventListener('click',()=>{if(Date.now()<suppressClickUntil)return;greet()});
 $('pet').addEventListener('click',pet);
 butterfly.addEventListener('click',()=>{if(butterflyResting)return;butterflyResting=true;butterfly.classList.add('resting');butterfly.setAttribute('aria-label','Бабочка присела рядом');say('Поймали бабочку! Посмотрели и отпустили 🦋');clearTimeout(butterflyTimer);butterflyTimer=setTimeout(()=>{butterflyResting=false;butterfly.classList.remove('resting');butterfly.setAttribute('aria-label','Поймать бабочку')},2600);});
 $('light-toggle').addEventListener('click',()=>{state.light=isEvening(state.light,new Date().getHours())?'day':'evening';lighting();persist()});
 $('visit-count').textContent='Визит '+state.visits;
 $('event-text').textContent=ret.event||'Сегодня кролик отдыхает на своей полянке. Он очень рад тебе!';
 lighting();setTimeout(()=>say(ret.event?'Я тебя ждал! ♡':morning[(state.visits-1)%morning.length]),300);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)persist()});window.addEventListener('pagehide',persist);
 window.__livingMeadow={getState:()=>({...state}),pet,lighting,reset:()=>{state={visits:1,pets:0,lastAt:Date.now(),light:'auto',lastEvent:null};persist();lighting()},forceReturn:(ms=600000)=>{state.lastAt=Date.now()-ms;persist()}};
})();
