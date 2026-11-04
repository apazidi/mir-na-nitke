import {KEY,EVENTS,safeState,summarizeReturn,isEvening} from './meadow-engine.mjs';
(()=>{'use strict';
 const $=id=>document.getElementById(id),now=Date.now();
 let raw=null;try{raw=JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){}
 const ret=summarizeReturn(safeState(raw,now),now);let state=ret.updated;
 function persist(){state.lastAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){}}
 const speech=$('speech'),rabbit=$('rabbit');let speechTimer=0,hopTimer=0;
 const morning=['Как хорошо, что ты заглянул! ♡','Ты снова здесь! Ура!','Погуляем по полянке?'];
 function say(s){speech.textContent=s;speech.classList.add('show');clearTimeout(speechTimer);speechTimer=setTimeout(()=>speech.classList.remove('show'),3100)}
 function lighting(){const evening=isEvening(state.light,new Date().getHours());$('meadow').classList.toggle('evening',evening);$('light-label').textContent=evening?'Вечер':'День';$('light-toggle').firstChild.textContent=evening?'🌙 ':'🌤️ '}
 function heart(){const h=document.createElement('span');h.className='heart';h.textContent=state.pets%3===0?'✿':'♥';h.style.left=(45+Math.random()*18)+'%';h.style.top=(57+Math.random()*12)+'%';$('heart-layer').append(h);h.addEventListener('animationend',()=>h.remove(),{once:true});setTimeout(()=>h.remove(),1700)}
 function pet(){state.pets++;rabbit.classList.remove('hop');void rabbit.offsetWidth;rabbit.classList.add('hop');heart();
    say(['Мурр... почти!','Как уютно! ♡','Поймаем бабочку?','Прыг! ✨'][state.pets%4]);clearTimeout(hopTimer);hopTimer=setTimeout(()=>rabbit.classList.remove('hop'),750);persist();
    try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch(_){}
 }
 rabbit.addEventListener('click',pet);$('pet').addEventListener('click',pet);
 $('light-toggle').addEventListener('click',()=>{state.light=isEvening(state.light,new Date().getHours())?'day':'evening';lighting();persist()});
 $('visit-count').textContent='Визит '+state.visits;
 $('event-text').textContent=ret.event||'Сегодня кролик отдыхает на своей полянке. Он очень рад тебе!';
 lighting();setTimeout(()=>say(ret.event?'Я тебя ждал! ♡':morning[(state.visits-1)%morning.length]),300);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)persist()});window.addEventListener('pagehide',persist);
 window.__livingMeadow={getState:()=>({...state}),pet,lighting,reset:()=>{state={visits:1,pets:0,lastAt:Date.now(),light:'auto',lastEvent:null};persist();lighting()},forceReturn:(ms=600000)=>{state.lastAt=Date.now()-ms;persist()}};
})();
