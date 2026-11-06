import {readFile,writeFile} from 'node:fs/promises';
import {makeFibers,visiblePoints} from '../../prototype/model.mjs';
const data=JSON.parse(await readFile(new URL('./observations.json',import.meta.url),'utf8'));
const top=data.records.find(r=>r.name==='06-top-released'),fibers=makeFibers(top.state.seed),minBladeY=-.72-Math.sin(Math.PI/4)*.118;
const remaining=fibers.map(f=>({id:f.id,root:f.points[0],length:top.state.lengths[f.id],points:visiblePoints(f,top.state.lengths[f.id])})).filter(f=>f.points.every(p=>p.y<minBladeY));
const report={bladeSweptY:{top:minBladeY,bottom:-.72+Math.sin(Math.PI/4)*.118},entireStrandsAboveSweep:remaining.length,examples:remaining.slice(0,8).map(f=>({id:f.id,root:f.root,length:f.length,tip:f.points.at(-1)})),note:'Read-only model analysis of actual UI-generated state; no pose/state is injected into browser.'};
await writeFile(new URL('./root-analysis.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
