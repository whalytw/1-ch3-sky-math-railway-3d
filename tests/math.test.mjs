import assert from 'node:assert/strict';
import {generateQuestion,isCorrect,routeSummary,defaultConfig,subtypeFor,graphValue} from '../src/math.js';
const conf=defaultConfig();assert.equal(routeSummary(conf).count,4);assert.equal(routeSummary(conf).stars,6);
let cases=0;for(let island=0;island<8;island++)for(let star=1;star<=5;star++)for(let i=0;i<180;i++){
 const q=generateQuestion(island,star,`${island}-${star}-${i}`,'test-shared-'+i);
 assert.ok(q.title&&q.formula&&q.steps.length>0);
 assert.equal(q.island,island);assert.equal(q.stars,star);
 assert.ok(isCorrect(q,q.correct),`Correct rejected ${island} ${star} ${i}`);
 assert.ok(Number.isFinite(q.graph?.type==='points'?0:graphValue(q.graph||{type:'linear',a:0,b:0},1)));
 if(island===5){const D=q.graph.b*q.graph.b-4*q.graph.a*q.graph.c;assert.equal(D>0?'2':D===0?'1':'0',q.correct)}
 if(island===6){const {a,b,c}=q.graph;let x=-b/(2*a);if(q.graph.interval)x=Math.max(q.graph.interval[0],Math.min(q.graph.interval[1],x));assert.equal(x,q.correct.x);assert.equal(graphValue(q.graph,x),q.correct.value)}
 if(island===7){let best=-Infinity,bestX=null;for(let x=q.min;x<=q.max;x+=q.step){const value=q.metric(x);if(value>best){best=value;bestX=x}}assert.equal(bestX,q.correct.x)}
 cases++;
}
console.log(`PASS ${cases} 題自動驗證；預設前四島、星等總和6；判別式、極值、最佳化答案一致。`);
