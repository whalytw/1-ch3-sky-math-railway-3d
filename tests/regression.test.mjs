import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quadraticText, vertexText, generateQuestion} from '../src/math.js';

const html=readFileSync(new URL('../index.html', import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js', import.meta.url),'utf8');
const renderer=readFileSync(new URL('../src/renderer.js', import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css', import.meta.url),'utf8');

assert.match(html, /id="fullscreenBtn"/);
assert.match(app, /function toggleFullscreen\(\)/);
assert.match(app, /addEventListener\('fullscreenchange',syncFullscreenButton\)/);
assert.match(app, /addEventListener\('click',toggleFullscreen\)/);
assert.match(css, /#app:fullscreen/);
assert.equal((renderer.match(/\bmakeTrain\(p,[^)]+\)\s*\{/g)||[]).length,1,'Exactly one makeTrain implementation');
assert.equal(quadraticText(1,3,-1),'x²+3x−1');
assert.equal(quadraticText(1,3,1),'x²+3x+1');
assert.equal(vertexText(1,-2,-1),'(x+2)²−1');

// 所有星等、每個場次的 -1/+1 都必須完整顯示。
let foundMinus=0,foundPlus=0;
for(let star=1;star<=5;star++)for(let k=0;k<3000;k++){
  const q=generateQuestion(1,star,`reg-${star}-${k}`,'scenario');
  if(q.subtype!=='evaluate')continue;
  const c=q.graph?.c;
  if(c===-1){assert.match(q.formula,/−1(?:\s|　|,|，|$)/);foundMinus++}
  if(c===1){assert.match(q.formula,/\+1(?:\s|　|,|，|$)/);foundPlus++}
}
assert(foundMinus>100&&foundPlus>100,`coverage ${foundMinus} ${foundPlus}`);
console.log(`PASS fullscreen source & camera duplicate checks; math formula ±1 cases: ${foundMinus} negative, ${foundPlus} positive`);
