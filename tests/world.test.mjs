import assert from 'node:assert/strict';
import {SharedWorld,WORLD_END,METRES_PER_UNIT,WORLD_DRAW_END,normalize,sub} from '../src/world.js';
import {cameraFor,fieldOfView,actorTransforms,project} from '../src/renderer.js';
import {matMul,perspective,lookAt} from '../src/geometry.js';
import {makeChunk,makeCharacter,makeJet,makeCrowd} from '../src/scenery.js';
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} ≠ ${b}`),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),themes=new Set();let samples=0;
for(let n=0;n<20;n++){
 const w=new SharedWorld('world-v11-'+n);assert.notEqual(w.themes[0].id,w.themes[1].id);w.themes.forEach(t=>themes.add(t.id));
 for(let lane=0;lane<3;lane++){
  const route=w.routes[lane];near(route.length,5000);near(route.distances[800],2500);near(w.sample(lane,2500).point[0],WORLD_END/2);assert.deepEqual(w.sample(lane,0).point,[0,0,(lane-1)*3.2]);
  for(let d=0;d<=5000;d+=100){const p={lane,distance:d,renderDistance:d,speed:100,finishTime:null,jump:0,wave:0},s=w.sample(lane,d),c=cameraFor(w,p);assert.ok(c.eye.every(Number.isFinite));assert.ok(s.point.every(Number.isFinite));near(Math.hypot(...s.forward),1);assert.ok(c.eye[1]>w.terrainY(c.eye[0],c.eye[2])+1.7);
   // Smooth heading through former five-metre sample boundaries.
   if(d>0&&d<5000){const a=w.sample(lane,d-1e-3).forward,b=w.sample(lane,d+1e-3).forward;assert.ok(dot(a,b)>.9999999)}
   for(const jump of[0,.575]){p.jump=jump;const cc=cameraFor(w,p),actor=actorTransforms(w,p);for(const [W,H]of[[426,668],[853,1382]]){const vp=matMul(perspective(fieldOfView(p),W/H,.1,120),lookAt(cc.eye,cc.target,[0,1,0])),head=project(vp,[actor.character[12],actor.character[13]+.82,actor.character[14]],W,H);assert.ok(head.visible);assert.ok(head.y/H>.51&&head.y/H<.95,`head overlaps UI: ${head.y/H}`);assert.ok(head.x/W>.03&&head.x/W<.6)}}samples++;
  }
  const beyond=w.sample(lane,5200);near(beyond.point[0],WORLD_END+200/METRES_PER_UNIT);near(beyond.point[1],0);assert.ok(WORLD_DRAW_END>beyond.point[0]+100);
  const start={lane,distance:5000,renderDistance:5000,finishTime:100,coastElapsed:0,speed:100,jump:0},a=cameraFor(w,start),b=cameraFor(w,{...start,coastElapsed:2}),c=cameraFor(w,{...start,coastElapsed:1});assert.ok(dot(sub(a.eye,a.point),[1,0,0])<0);assert.ok(dot(sub(b.eye,b.point),[1,0,0])>0);near(b.orbit,Math.PI);assert.ok(c.orbit>0&&c.orbit<Math.PI);
 }
 if(n<8){for(const index of[0,12,Math.floor(WORLD_END/17),Math.floor((WORLD_END+160)/17)]){const data=makeChunk(w,index);assert.ok(data.length>1000);assert.ok(data.every(Number.isFinite));assert.ok(data.length<900000)}}
}
assert.equal(themes.size,8);assert.equal(METRES_PER_UNIT,1.6);const w=new SharedWorld('speed');const x0=w.sample(0,0).point[0],x1=w.sample(0,60/3.6).point[0];assert.ok(x1-x0>9.5,'60 km/h must move about ten model units per second, rather than 1.67');
const a=new SharedWorld('repeat'),b=new SharedWorld('repeat');assert.deepEqual(a.routes.map(r=>r.points),b.routes.map(r=>r.points));
const standing=makeCharacter('#69dfed',true);let minY=Infinity;for(let i=1;i<standing.length;i+=9)minY=Math.min(minY,standing[i]);assert.ok(minY<-.75,'standing mesh must have boots and full lower legs');assert.ok(makeJet().every(Number.isFinite));assert.ok(makeCrowd(w).every(Number.isFinite));
console.log(`PASS V1.1 world: ${samples} samples, continuous tangents, realistic speed scale, 600 m runout, two-second front orbit, full legs, eight themes, safe character framing and finite scenery`);
