import assert from 'node:assert/strict';
import {SharedWorld,WORLD_END,sub,add,scale,normalize,cross} from '../src/world.js';
import {cameraFor,project} from '../src/renderer.js';
import {matMul,perspective,lookAt} from '../src/geometry.js';
import {makeChunk} from '../src/scenery.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const themes=new Set();let checked=0;
for(let n=0;n<36;n++){
 const w=new SharedWorld('test-map-'+n);assert.notEqual(w.themes[0].id,w.themes[1].id);for(const t of w.themes)themes.add(t.id);
 for(let lane=0;lane<3;lane++){
  const r=w.routes[lane];near(r.length,5000,1e-6);near(r.distances[500],2500,1e-6);near(w.sample(lane,2500).point[0],WORLD_END/2,1e-6);
  assert.deepEqual(w.sample(lane,0).point,[0,0,(lane-1)*3.2]);const end=w.sample(lane,5000).point;near(end[0],WORLD_END);near(end[1],0);near(end[2],(lane-1)*3.2);
  for(let d=0;d<=5000;d+=100){const p={lane,distance:d},s=w.sample(lane,d);assert.ok(s.point.every(Number.isFinite));near(Math.hypot(...s.forward),1);const c=cameraFor(w,p);assert.ok(c.eye.every(Number.isFinite));assert.ok(Math.hypot(...sub(c.eye,s.point))>5);
   for(const [width,height]of[[426,668],[853,1382]]){const vp=matMul(perspective(.97,width/height,.12,100),lookAt(c.eye,c.target,[0,1,0])),subject=project(vp,add(s.point,scale(normalize(cross(s.right,s.forward)),1.8)),width,height);assert.ok(subject.visible);assert.ok(subject.y>height*.5&&subject.y<height*.99,`subject y ${subject.y/height}`);assert.ok(subject.x>0&&subject.x<width*.6,`subject x ${subject.x/width}`)}const c2=cameraFor(w,p),vp2=matMul(perspective(.97,426/668,.12,100),lookAt(c2.eye,c2.target,[0,1,0])),jumpHead=project(vp2,add(s.point,scale(normalize(cross(s.right,s.forward)),2.75)),426,668);assert.ok(jumpHead.y/668>.53,`jump overlaps question: ${jumpHead.y/668}`);assert.ok(c2.eye[1]>w.terrainY(c2.eye[0],c2.eye[2])+1.7);checked++;
  }
 }
 if(n<8){const mesh=makeChunk(w,4);assert.ok(mesh.length<650000,`mesh too large: ${mesh.length}`);assert.ok(mesh.every(Number.isFinite));}
}
assert.equal(themes.size,8);const a=new SharedWorld('repeat'),b=new SharedWorld('repeat');assert.deepEqual(a.routes,b.routes);assert.deepEqual(a.themes,b.themes);console.log(`PASS world: ${checked} route/camera samples; 36 seeds, eight themes, exact 5 km and 2.5 km halves, shared aligned gates, deterministic geometry`);
