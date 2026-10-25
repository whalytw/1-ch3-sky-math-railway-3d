import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ANIMATIONS,TAU,deformArt,artAttachments,artMeshData} from '../src/animation.js';
import {ART_SHEETS,FLIGHT_ART,artPose} from '../src/artwork.js';
import {GAME_SHADERS,decorationMatrix,localPoint,rotorMatrix} from '../src/renderer.js';
import {DECORATIONS,fadeWindow} from '../src/decorations.js';
// These subjects previously remained rigid, doubled their wings, or sampled adjacent art.
for(const id of Object.keys(FLIGHT_ART)){
 const kind=ANIMATIONS[id].kind,poses=new Set();let maxShape=0;
 for(let f=0;f<48;f++){
  const t=f/48*TAU,pts=[[-.8,.2],[.8,.2],[-.5,-.7],[.5,-.7],[0,.6]].map(([x,y])=>deformArt(kind,x,y,t));
  poses.add(pts.flat().map(x=>x.toFixed(5)).join(','));
  const distance=Math.hypot(...pts[0].map((v,k)=>v-pts[1][k]));maxShape=Math.max(maxShape,Math.abs(distance-1.6));
  for(const [x,y]of [[-.8,.2],[.8,.2],[-.5,-.7],[.5,-.7]]){
   const a=deformArt(kind,x,y,t),b=deformArt(kind,x,y,t+TAU),next=deformArt(kind,x,y,t+1e-4);
   assert.ok(a.every(Number.isFinite));assert.ok(Math.hypot(...a.map((v,k)=>v-b[k]))<1e-6,'loop has no discontinuity');assert.ok(Math.hypot(...a.map((v,k)=>v-next[k]))<.001,'continuous motion, no discrete image swap');
  }
 }
 assert.ok(poses.size>=(['birds','dragons','butterflies','jellyfish'].includes(id)?24:20),`${id}: sufficient distinct poses in 48 samples (symmetric return strokes may repeat)`);
 if(['birds','butterflies','jellyfish','dragons'].includes(id))assert.ok(maxShape>.04,`${id}: local shape must change, not a drifting static sticker`);
 const sheet=ART_SHEETS[FLIGHT_ART[id].sheet],png=readFileSync(new URL('../assets/'+sheet.file,import.meta.url));assert.equal(png[25],6);assert.ok(png.readUInt32BE(16)>=1024);
}
for(const id of ['birds','dragons','butterflies']){
 const kind=ANIMATIONS[id].kind;
 for(let f=0;f<120;f++){
  const t=f/120*TAU,left=deformArt(kind,-.75,.2,t),right=deformArt(kind,.75,.2,t),body=deformArt(kind,0,.2,t);
  assert.ok(left[0]<0&&right[0]>0,'one wing remains on each side of the body');assert.ok(Math.abs(body[0])+Math.abs(body[1]-.2)+Math.abs(body[2])<1e-10,'wing root must not move the head/body');
 }
}
const uvShader=GAME_SHADERS.fragment.split('if(uSky')[0];assert.equal((uvShader.match(/texture\(uSpriteTexture/g)||[]).length,1,'one pose per pixel; no two-frame wing ghosts');assert.ok(!/uSpriteNext|uSpriteBlend/.test(GAME_SHADERS.fragment));
assert.equal(artMeshData().length/27,1152,'fixed shared mesh, no per-frame tessellation');
assert.equal(Object.values(ART_SHEETS).filter(s=>s.cols===1&&s.rows===1).length,13,'all cast cells that could cross boundaries now have independent files');
for(const d of DECORATIONS)assert.ok(ANIMATIONS[d.id]||['snow','rain','rainbows','fireballs','crowds','windmills','tumbleweeds','dinosaurs','fireflies','meteors'].includes(d.id),d.id+' is included in the motion audit');
for(const id of ['biplanes','airships','balloons','islands']){const a=artAttachments(id,0),b=artAttachments(id,.25);assert.ok(a.length);assert.notDeepEqual(a,b)}
for(const x of[0,1])assert.equal(fadeWindow(x,0,1,.12),0,'wrapped particles must be invisible when position resets');assert.equal(fadeWindow(.5,0,1,.12),1);
const tumble={id:'tumbleweeds',point:[1,3,5],size:1,side:1};let centre;
for(let i=0;i<24;i++){const c=localPoint(decorationMatrix({...tumble,rotation:i*TAU/24}),[0,.7,0]);centre??=c;assert.ok(Math.hypot(...c.map((v,k)=>v-centre[k]))<1e-5,'tumbleweed rolls around its centre, not below the ground')}
const mill={id:'windmills',point:[0,0,0],size:1,side:1,phase:0};const a=rotorMatrix(mill,0),b=rotorMatrix(mill,.5);assert.notDeepEqual(a,b);assert.deepEqual([...a].slice(12),[...b].slice(12),'windmill hub stays fixed while blades rotate');
console.log('PASS V1.5 animation: 15 continuous articulated loops, stable wing roots, single-pose sampling, 13 isolated images, all 25 decoration types covered, rotating attachments, wrap fades and stable rolling pivot');

// Front whale views reverse where the tail is drawn; animation must follow that tail.
for(const [eye,mirror]of[[[-5,2,-3],1],[[-5,2,3],-1],[[5,2,-3],-1],[[5,2,3],1]]){const pose=artPose('whales','whale-test',{point:[0,0,0],forward:[1,0,0],phase:0},{lane:0,camera:{eye}},0,new Map());assert.equal(pose.mirror,mirror)}
