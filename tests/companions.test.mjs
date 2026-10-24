import assert from 'node:assert/strict';
import {SharedWorld,normalize,sub} from '../src/world.js';
import {EscortDirector,projectedBounds} from '../src/encounters.js';
import {decorationBounds,defaultDecorations,makeDecoration} from '../src/decorations.js';
import {cameraFor,fieldOfView,actorTransforms,sceneView} from '../src/renderer.js';
import {matMul,perspective,lookAt} from '../src/geometry.js';
import {ART_SHEETS,FLIGHT_ART,artParts,artPose,artBounds} from '../src/artwork.js';
import {readFileSync} from 'node:fs';
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),viewFor=(w,p,W=630,H=835)=>{const camera=cameraFor(w,p),vp=matMul(perspective(fieldOfView(p),W/H,.1,140),lookAt(camera.eye,camera.target,[0,1,0])),renderer={windows:[0,1,2].map(()=>({getBoundingClientRect:()=>({left:0,top:0}),querySelectorAll:()=>[{getBoundingClientRect:()=>({left:0,right:W,top:0,bottom:H*.38,width:W,height:H*.38})},{getBoundingClientRect:()=>({left:W*.70,right:W,top:H*.65,bottom:H,width:W*.30,height:H*.35})}]}))};return sceneView(renderer,p.lane,p,camera,vp,{cssW:W,cssH:H},actorTransforms(w,p))};
let frames=0,flights=0,departures=0;const types=new Set();
for(const id of['witches','birds','whales','dragons','heroes','biplanes','jellyfish']){
 const world=new SharedWorld('continuous-'+id),director=new EscortDirector(world,decorationBounds),enabled=Object.fromEntries(Object.keys(defaultDecorations()).map(k=>[k,k===id])),previous=new Map(),first=new Map(),last=new Map();
 const players=[0,1,2].map(lane=>({lane,distance:700+lane*80,renderDistance:700+lane*80,speed:60,finishTime:null,jump:0,wave:0,phase:'question',questionNumber:1,question:{mode:'number'}}));
 for(let step=0;step<=45*60;step++){
  const clock=step/60;players.forEach((p,i)=>{p.distance=700+i*80+clock*60/3.6;p.renderDistance=p.distance});
  const views=players.map(p=>viewFor(world,p)),items=director.instances(players,clock,views,enabled,'medium');
  for(const item of items){assert.ok(item.point.every(Number.isFinite));assert.ok(item.alpha>=0&&item.alpha<=1);assert.equal(item.id,id);types.add(item.id);const heading=world.sample(item.ownerLane,players[item.ownerLane].distance).forward;assert.ok(dot(normalize([item.forward[0],0,item.forward[2]]),normalize([heading[0],0,heading[2]]))>.995,'companion must face the same forward heading as its cart');
   const old=previous.get(item.encounterKey);if(!first.has(item.encounterKey)){first.set(item.encounterKey,clock);assert.equal(item.alpha,0);flights++}
   if(old){assert.ok(Math.abs(item.alpha-old.alpha)<.08,'no instant opacity change');assert.ok(Math.abs(item.size-old.size)<1e-10,'no per-frame resizing or re-planning');const travelled=sub(world.sample(item.ownerLane,players[item.ownerLane].distance).point,old.car),relative=sub(sub(item.point,old.point),travelled);assert.ok(Math.hypot(...relative)<.65,'no position teleport')}
   assert.ok(projectedBounds(views[item.ownerLane],item,artBounds(item.id)));previous.set(item.encounterKey,{alpha:item.alpha,size:item.size,point:[...item.point],car:world.sample(item.ownerLane,players[item.ownerLane].distance).point});last.set(item.encounterKey,clock);frames++;
  }
 }
 for(const event of director.history.filter(e=>e.type==='gone')){assert.equal(event.lastAlpha,0);assert.ok(last.get(event.key)-first.get(event.key)>5,`${id} ${event.key} must persist: ${JSON.stringify(director.history.filter(e=>e.key===event.key))}`);departures++}
}
assert.equal(types.size,7);assert.ok(flights>=15);assert.ok(departures>=10);
// A newly opened question/keyboard must retire an existing companion gradually.
{
 const world=new SharedWorld('continuous-witches'),director=new EscortDirector(world,decorationBounds),players=[0,1,2].map(lane=>({lane,distance:700+lane*80,renderDistance:700+lane*80,speed:60,finishTime:null,jump:0,wave:0,phase:'question',questionNumber:1,question:{mode:'number'}}));let key=null,changeAt=Infinity,lastAlpha=0,checked=0;
 for(let frame=0;frame<=20*60;frame++){const clock=frame/60;players.forEach((p,i)=>{p.distance=700+i*80+clock*60/3.6;p.renderDistance=p.distance});const view=viewFor(world,players[0]);if(clock>=changeAt)view.avoid.push({left:0,right:view.W,top:0,bottom:view.H});const items=director.instances(players,clock,[view],{witches:true},'medium'),item=items.find(x=>x.encounterKey===key)||items[0];if(!key&&item){key=item.encounterKey;changeAt=clock+4}if(item&&item.encounterKey===key){assert.ok(Math.abs(item.alpha-lastAlpha)<.08,'question layout must not pop the companion away');lastAlpha=item.alpha;if(clock>=changeAt)checked++}}
 const exit=director.history.find(e=>e.key===key&&e.type==='gone'),depart=director.history.find(e=>e.key===key&&e.type==='depart');assert.ok(checked>90,'a changed layout must retain visible exit frames');assert.equal(depart.reason,'layout');assert.ok(exit.clock-depart.clock>=1.8);assert.equal(exit.lastAlpha,0);
}
for(const [key,sheet]of Object.entries(ART_SHEETS)){const bytes=readFileSync(new URL('../assets/'+sheet.file,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes[25],6,'production atlas must have an alpha channel');assert.ok(bytes.length>100000);assert.ok(bytes.readUInt32BE(16)>=1000)}
const states=new Map(),item={id:'witches',point:[0,0,0],forward:[1,0,0],phase:0,size:1};const rear=artPose('witches','a',item,{lane:0,camera:{eye:[-5,2,-3]}},0,states),front=artPose('witches','a',item,{lane:0,camera:{eye:[5,2,-3]}},.01,states);assert.deepEqual(rear.from,[0,0]);assert.equal(front.mix,0);assert.deepEqual(front.to,[0,1]);
const birds=artParts({...item,id:'birds'},1);assert.equal(birds.length,3);assert.equal(new Set(birds.map(b=>b.phase)).size,3);assert.equal(Object.keys(FLIGHT_ART).length,16);
const witch=makeDecoration('witches');let feet=Infinity,hat=-Infinity;for(let i=1;i<witch.length;i+=9){feet=Math.min(feet,witch[i]);hat=Math.max(hat,witch[i])}assert.ok(feet<-.85&&hat>1.6,'witch fallback must have hanging legs below the broom and a hat');
console.log(`PASS V1.4: ${frames} continuous companion frames, ${flights} identities, ${departures} smooth exits, cart-aligned headings, no teleports/alpha pops, gradual exit after question layout change, 5 real RGBA art atlases, 16 cute subjects, independent bird flaps and angle crossfades`);
