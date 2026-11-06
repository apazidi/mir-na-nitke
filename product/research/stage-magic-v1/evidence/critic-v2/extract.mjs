// Evidence-only contact sheets. Source PNG/WebM files are left untouched.
// Requires a full FFmpeg build (fps/crop/tile); optionally set FFMPEG_PATH.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('.', import.meta.url));
const bin = process.env.FFMPEG_PATH || 'ffmpeg';
const run = args => execFileSync(bin, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd });
for (const [name, start, duration, fps, tile] of [
  ['green-motion', .5, 3, 6, '6x3'],
  ['heart-motion', 12.65, 4.5, 4, '6x3'],
  ['corolla-motion', 16.7, 12, 2, '6x4'],
  ['corolla-late-motion', 26.8, 3.3, 6, '5x4'],
  ['final-motion', 50, 4, 4, '4x4']
]) run(['-ss', String(start), '-i', 'process.webm', '-t', String(duration), '-vf', `fps=${fps},crop=200:230:105:340,tile=${tile}`, '-frames:v', '1', `${name}.png`]);
const inputs = [20, 23, 26, 28];
run([
  ...inputs.flatMap(n => ['-i', `click-${n}.png`]),
  '-filter_complex', inputs.map((_, i) => `[${i}:v]crop=200:230:105:340[c${i}]`).join(';') + ';[c0][c1][c2][c3]hstack=inputs=4[out]',
  '-map', '[out]', '-frames:v', '1', 'corolla-quarters.png'
]);
