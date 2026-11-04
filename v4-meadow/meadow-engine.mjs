/** Pure, deterministic state helpers for the Living Meadow prototype. */
export const KEY='mir-na-nitke/v4/meadow';
export const MIN_RETURN_MS=5*60*1000;
export const MAX_AWAY_MS=8*60*60*1000;
export const EVENTS=[
  'К полянке прилетела бабочка. Кролик долго наблюдал за ней.',
  'Кролик устроился поудобнее и отдохнул на мягкой траве.',
  'Солнышко согрело полянку, а кролик осмотрел знакомые цветы.',
  'На полянке было тихо. Кролик немного погулял и вернулся на своё место.'
];
export function initialState(now=Date.now()){return {visits:0,pets:0,lastAt:now,light:'auto',lastEvent:null}}
export function safeState(raw,now=Date.now()){
  const d=initialState(now),r=raw&&typeof raw==='object'?raw:{};
  return {visits:clampInt(r.visits,0,1e9),pets:clampInt(r.pets,0,1e9),lastAt:clampNum(r.lastAt,0,now)||now,
    light:r.light==='day'||r.light==='evening'?r.light:'auto',lastEvent:typeof r.lastEvent==='string'?r.lastEvent:null};
}
function clampNum(n,min,max){n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):0}
function clampInt(n,min,max){return Math.floor(clampNum(n,min,max))}
export function summarizeReturn(state,now=Date.now()){
 const away=Math.max(0,Math.min(MAX_AWAY_MS,now-state.lastAt));
 const event=away>=MIN_RETURN_MS && state.visits>0 ? EVENTS[Math.floor(state.lastAt/60000)%EVENTS.length] : null;
 return {event,away,updated:{...state,visits:state.visits+1,lastAt:now,lastEvent:event||state.lastEvent}};
}
export function isEvening(mode='auto',hour=12){return mode==='evening'||(mode==='auto'&&(hour>=19||hour<7))}
