import assert from 'node:assert/strict';
import {SkyRenderer} from '../src/renderer.js';
import {generateQuestion,defaultConfig} from '../src/math.js';
const renderer=Object.create(SkyRenderer.prototype);
const config=defaultConfig();
let checks=0;
for(let lane=0;lane<3;lane++){
 for(let island=0;island<8;island++){
  const p={lane,phase:'travel',currentIsland:island,question:generateQuestion(island,config.stars[island],`camera-${lane}-${island}`,'cam'),reply:{},cameraMode:'chase',animProgress:0.4};
  const scene=renderer.makeScene(p);assert(scene.data.length>2000);assert(scene.data.every(Number.isFinite));checks++;
  const train=renderer.makeTrain(p,-8,scene.height);assert(train.length>900);assert(train.every(Number.isFinite));
  // 礦車 3D 頂點必須圍繞指定沿軌座標，不能被第二個同名函式誤當成動畫進度。
  const verticesX=[];for(let k=0;k<train.length;k+=9)verticesX.push(train[k]);
  assert(Math.min(...verticesX)>-10&&Math.max(...verticesX)<-6, 'Train should stay at x=-8, not jump ahead');checks++;
  for(const progress of [0,.15,.5,.8,1]){for(const phase of ['travel','success']){p.phase=phase;p.animProgress=progress;const cam=renderer.followCamera(p,1111,scene.height);const body=renderer.makeTrain(p,cam.x,scene.height);let mn=Infinity,mx=-Infinity;for(let k=0;k<body.length;k+=9){mn=Math.min(mn,body[k]);mx=Math.max(mx,body[k]);}assert(mn>cam.x-1&&mx<cam.x+1,'Train must remain next to chase camera');checks++}}p.phase='travel';
  const cockpit=renderer.makeCockpit(p,-8,scene.height);assert(cockpit.length>450);assert(cockpit.every(Number.isFinite));checks++;
  for(const cameraMode of ['chase','inside']){
   p.cameraMode=cameraMode;p.animProgress=.4;
   const a=renderer.followCamera(p,1111,scene.height);
   p.animProgress=.8;
   const b=renderer.followCamera(p,2222,scene.height);
   assert(b.x>a.x,'車輛與鏡頭路徑應往前');
   assert(Number.isFinite(a.eye[0])&&Number.isFinite(b.target[0]));
   assert(a.target[0]>a.eye[0],'攝影機必須面向行車方向');
   checks++;
  }
 }
}
console.log(`PASS ${checks} camera/geometry checks across three lanes and eight islands; both follow and onboard camera modes.`);
