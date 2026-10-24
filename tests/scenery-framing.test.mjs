import assert from 'node:assert/strict';
import {SharedWorld,sub} from '../src/world.js';
import {DecorationSystem,crowdPositions,safeDecoration,decorationBounds} from '../src/decorations.js';
import {cameraFor,fieldOfView,actorTransforms,sceneView,rotorMatrix,localPoint} from '../src/renderer.js';
import {matMul,perspective,lookAt} from '../src/geometry.js';
import {projectedBounds,overlaps} from '../src/encounters.js';
import {defaultSettings} from '../src/race.js';
let railChecks=0,peopleChecks=0,encounters=0;const seen=new Set(),sizes=[];
const player=(lane,distance)=>({lane,distance,renderDistance:distance,speed:60,finishTime:null,jump:0,wave:0,phase:'question',questionNumber:1,question:{mode:'number'}});
const viewFor=(world,p,W=420,H=668)=>{const camera=cameraFor(world,p),vp=matMul(perspective(fieldOfView(p),W/H,.1,130),lookAt(camera.eye,camera.target,[0,1,0])),renderer={windows:[0,1,2].map(()=>({getBoundingClientRect:()=>({left:0,top:0})}))};return sceneView(renderer,p.lane,p,camera,vp,{cssW:W,cssH:H},actorTransforms(world,p))};
for(let seed=0;seed<14;seed++){
 const world=new SharedWorld('corridor-'+seed);for(let x=0;x<2937;x+=29){const ps=[0,1,2].map(i=>world.pointAtX(i,x));for(let i=0;i<2;i++){assert.ok(ps[i+1][2]-ps[i][2]>2.95,'adjacent rail corridors must not overlap');assert.ok(Math.abs(ps[i+1][1]-ps[i][1])<3,'adjacent tracks must not create a giant retaining wall')}}
 for(let lane=0;lane<3;lane++)for(let d=12.3;d<5000;d+=37.17){const p=world.sample(lane,d);for(const side of[-1.20,-.72,-.46,0,.46,.72,1.20]){const x=p.point[0]+p.right[0]*side,z=p.point[2]+p.right[2]*side,y=world.surfaceY(x,z);assert.ok(y<p.point[1]-.055,`terrain crossed rail/shoulder at ${seed}/${lane}/${d}/${side}: ${y-p.point[1]}`);railChecks++}}
 for(let d=100;d<5000;d+=233){const p=world.sample(1,d).point,ps=world.routes.map((_,i)=>world.pointAtX(i,p[0]));for(const side of[-1,1]){
  const item={id:'crowds',point:[p[0],0,(side<0?ps[0][2]:ps[2][2])+side*6.2]};for(const point of crowdPositions(world,item))for(const dx of[-.22,.22])for(const dz of[-.22,.22]){assert.ok(point[1]>=world.surfaceY(point[0]+dx,point[2]+dz)+.04);peopleChecks++}
 }}
 }
for(const side of[-1,1]){const item={id:'windmills',point:[10,2,side*7],size:1,side,phase:.3},a=rotorMatrix(item,0),b=rotorMatrix(item,.5);assert.notDeepEqual([...a],[...b]);assert.deepEqual([...a.slice(12,15)],[...b.slice(12,15)]);assert.ok(a[14]*a[10]<0);assert.ok(Math.hypot(...sub(localPoint(a,[0,2,0]),localPoint(b,[0,2,0])))>.5)}
console.log(`PASS scenery: ${railChecks} actual terrain-mesh clearances, ${peopleChecks} spectator foot checks and rotating track-facing windmill blades`);
