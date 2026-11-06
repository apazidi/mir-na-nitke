export const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function viewTools(buttonArt,onError){
 const cache=new Map();
 const image=(src,alt='',cls)=>{const n=el('img',undefined,cls);n.src=src;n.alt=alt;n.draggable=false;n.addEventListener('error',()=>{n.hidden=true;onError('Часть рисунков недоступна. Это черновая сборка.');},{once:true});return n;};
 const button=(label,fn,{disabled=false,cls='button soft',key=label,art=false}={})=>{
  const n=el('button',label,cls);n.type='button';n.disabled=disabled;n.dataset.focusKey=key;n.addEventListener('click',fn);
  const states=art?buttonArt?.[label]:null;
  if(states){n.classList.add('art-button');n.setAttribute('aria-label',label);const img=image(disabled?states.disabled:states.normal,'','button-art');n.replaceChildren(img);
   const rest=()=>{if(!disabled)img.src=states.normal;};n.addEventListener('pointerdown',()=>{if(!disabled)img.src=states.pressed;});for(const event of ['pointerup','pointercancel','pointerleave','blur','keyup'])n.addEventListener(event,rest);n.addEventListener('keydown',event=>{if(!disabled&&[' ','Enter'].includes(event.key))img.src=states.pressed;});
   img.addEventListener('error',()=>{n.classList.remove('art-button');n.removeAttribute('aria-label');n.textContent=label;},{once:true});
  }return n;
 };
 const preload=async()=>{if(buttonArt)await Promise.all([...new Set(Object.values(buttonArt).flatMap(Object.values))].map(async src=>{const img=new Image();cache.set(src,img);img.src=src;try{await img.decode();}catch{onError('Часть кнопок недоступна. Это черновая сборка.');}}));};
 return {image,button,preload};
}
export const duration=seconds=>seconds==null?'—':seconds<60?Math.max(0,Math.ceil(seconds))+' с':Math.ceil(seconds/60)+' мин';
export const amount=value=>Number(value.toFixed(1)).toLocaleString('ru-RU');
