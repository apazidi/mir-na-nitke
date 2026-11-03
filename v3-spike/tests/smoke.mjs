import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const code=readFileSync(path.join(root,'game.js'),'utf8');
function harness(initialSave){
  const listeners=new Map(), store=new Map();
  if(initialSave)store.set('mir-na-nitke/v3/art-row-spike',JSON.stringify(initialSave));
  const elements=new Map();
  const grad={addColorStop(){}};
  const canvasContext=new Proxy({}, {get:(_,p)=>['createLinearGradient','createRadialGradient'].includes(p)?()=>grad:()=>{}});
  function get(id){
    if(!elements.has(id)){
      elements.set(id,{id,value:'0',disabled:false,style:{},classList:{add(){},remove(){}},
        setAttribute(){},addEventListener(k,fn){listeners.set(id+':'+k,fn)},
        querySelector(){return {firstChild:{textContent:''}}},
        getContext(){return canvasContext},
        textContent:''});
    }return elements.get(id);
  }
  class ImageStub {constructor(){this.complete=true;this.naturalWidth=471;this.naturalHeight=349;this.onload=null;this.onerror=null;}set src(s){this._src=s;queueMicrotask(()=>this.onload?.())}get src(){return this._src}}
  const raf=[];const now=Date.now();
  const env={Math,Date,JSON,Number,Promise,Image:ImageStub,queueMicrotask,
    devicePixelRatio:1,performance:{now(){return 100}},setTimeout:setTimeout,clearTimeout:clearTimeout,
    document:{getElementById:get,visibilityState:'visible',addEventListener(k,fn){listeners.set('document:'+k,fn)}},
    window:{addEventListener(k,fn){listeners.set('window:'+k,fn)}},
    localStorage:{getItem(k){return store.get(k)||null},setItem(k,v){store.set(k,v)}},
    requestAnimationFrame(fn){raf.push(fn)}
  };
  vm.runInNewContext(code,env,{filename:'game.js',timeout:1000});
  return {state:()=>env.window.__knitSpike.getState(),api:()=>env.window.__knitSpike,
    click:()=>listeners.get('stitch-button:click')?.(),purchase:(id)=>listeners.get(id+':click')?.(),
    el:get,store,raf,runFrame:(ms)=>raf.shift()?.(ms)};
}
test('click adds stitches and never exceeds experiment total', async()=>{
 const h=harness();await new Promise(r=>setTimeout(r,0));assert.equal(h.state().stitches,0);
 h.click();assert.equal(h.state().stitches,6);
 h.api().setStitches(9999);assert.equal(h.state().stitches,h.state().total);
 h.click();assert.equal(h.state().stitches,h.state().total);
});
test('reset restores first row and upgrades cost earned yarn',async()=>{
 const h=harness();await new Promise(r=>setTimeout(r,0));
 h.api().setStitches(120);
 h.purchase('upgrade-click');assert.equal(h.state().clickLevel,1);
 h.click();assert.equal(h.state().stitches,129);
 h.api().reset();assert.equal(h.state().stitches,0);assert.equal(h.state().clickLevel,0);
});
test('saved state earns capped offline progress',async()=>{
 const h=harness({stitches:14,coins:70,clickLevel:0,idleLevel:1,totalClicks:2,lastAt:Date.now()-100_000});
 await new Promise(r=>setTimeout(r,0));
 assert.equal(Math.floor(h.state().stitches),134);
 assert.equal(h.state().coins>=70,true);
});
test('game frame renders after all art assets become ready',async()=>{
 const h=harness();await new Promise(r=>setTimeout(r,0));
 assert.equal(h.state().loaded,true);assert.equal(h.raf.length,1);
 h.runFrame(110);assert.equal(h.raf.length,1);
});
