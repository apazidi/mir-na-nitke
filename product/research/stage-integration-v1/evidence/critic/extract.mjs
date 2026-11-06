// Contact sheets from unmodified recorded UI; optionally set FFMPEG_PATH.
import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('.',import.meta.url)),bin=process.env.FFMPEG_PATH||'ffmpeg';
const sheets=[
 ['fresh','rabbit-start-motion',1.5,18,1,'230:300:60:310','6x3'],
 ['fresh','rabbit-body-head-motion',18,24,1,'230:300:60:310','6x4'],
 ['fresh','flower-corolla-motion',66,12,1,'190:220:190:390','4x3'],
 ['fresh','tree-early-motion',87.1,18,1,'240:300:10:240','6x3'],
 ['fresh','tree-later-motion',104,22,1,'240:300:10:240','6x4'],
 ['fresh','cat-body-head-motion',129,24,.5,'190:260:75:350','4x3'],
 ['rabbit-start','first-twelve-motion',1.6,12,1,'230:300:60:310','4x3'],
 ['max-fixture','tree-max-motion',2,20,1,'240:300:10:240','5x4'],
 ['repair','tree-early-motion',6.7,18,1,'240:300:5:180','6x3'],
 ['repair','placement-motion',31.6,2.5,8,'240:300:5:180','5x4'],
];
for(const [dir,name,start,duration,fps,crop,tile]of sheets)execFileSync(bin,['-hide_banner','-loglevel','error','-y','-ss',String(start),'-i',`${dir}/process.webm`,'-t',String(duration),'-vf',`fps=${fps},crop=${crop},tile=${tile}`,'-frames:v','1',`${dir}/${name}.png`],{cwd});
