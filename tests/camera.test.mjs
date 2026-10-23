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
  const train=renderer.makeTrain(p,-8,scene.height);assert(train.length>900);assert(train.every(Number.isFinite));checks++;
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
