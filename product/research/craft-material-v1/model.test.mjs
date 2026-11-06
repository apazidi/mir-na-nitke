import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from './prototype/model.mjs';
const cut=(s,x=-.9)=>m.endPass(m.cutSegment(m.beginPass(s),{x,y:-.35},{x,y:.35}).state);
test('a local cut removes real strand portions and leaves other strands untouched',()=>{
 const before=m.createState(),after=cut(before),changed=after.lengths.filter((n,i)=>n!==before.lengths[i]);
 assert.ok(changed.length>0&&changed.length<before.lengths.length*.3);
 for(let i=0;i<after.lengths.length;i++)assert.ok(after.lengths[i]<=before.lengths[i]);
 assert.deepEqual(before.lengths,Array(m.FIBER_COUNT).fill(1),'input state is not mutated');
});
test('an empty, stationary or repeated cut cannot become global progress',()=>{
 const s=m.createState();assert.deepEqual(m.cutSegment(s,{x:2,y:2},{x:3,y:2}).state,s);
 assert.deepEqual(m.cutSegment(s,{x:0,y:0},{x:0,y:0}).state,s);
 const once=cut(s);assert.deepEqual(cut(once).lengths,once.lengths);
});
test('a deep cut is possible and undo restores precisely the preceding material',()=>{
 const a=cut(m.createState()),b=cut(a,.35);assert.notDeepEqual(a.lengths,b.lengths);
 assert.deepEqual(m.undo(b).lengths,a.lengths);
});
test('deep cuts change the silhouette, with no stranded roots beyond the cutting line',()=>{
 const state=m.createState(),fibers=m.makeFibers(state.seed);
 const left=m.cutSegment(state,{x:-.47,y:-1.5},{x:-.47,y:1.5}).state;
 const cap=m.cutSegment(state,{x:-1.5,y:-.72},{x:1.5,y:-.72}).state;
 const leftEdge=Math.min(...fibers.flatMap(f=>m.visiblePoints(f,left.lengths[f.id]).map(p=>p.x)));
 const topEdge=Math.min(...fibers.flatMap(f=>m.visiblePoints(f,cap.lengths[f.id]).map(p=>p.y)));
 assert.ok(leftEdge>=-.470001,`unremoved left material at ${leftEdge}`);
 assert.ok(topEdge>=-.720001,`unremoved top material at ${topEdge}`);
});
test('save, load and finish keep the chosen irregular material instead of a target',()=>{
 const a=cut(m.createState()),b=m.finish(a),c=m.load(m.save(b));
 assert.deepEqual(b.lengths,a.lengths);assert.deepEqual(m.snapshot(c),m.snapshot(b));
 assert.deepEqual(m.undo(c).lengths,m.createState().lengths);
});
test('malformed material saves cannot enter the renderer',()=>{
 for(const value of [null,'{}','false','{"lengths":[null]}',JSON.stringify({...m.createState(),seed:-1}),JSON.stringify({...m.createState(),lengths:Array(m.FIBER_COUNT).fill(9)})])assert.equal(m.load(value),null);
});
