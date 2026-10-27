import assert from 'node:assert/strict';
import {SharedWorld,sub,normalize} from '../src/world.js';
import {FlightDirector,FAST_TYPES} from '../src/flight.js';
import {defaultDecorations} from '../src/decorations.js';
import {artPose,artParts,FLIGHT_ART,ART_SHEETS} from '../src/artwork.js';
import {readFileSync} from 'node:fs';
import {decorationMatrix,localPoint} from '../src/renderer.js';
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
for(const forward of [[1,0,0],[0,0,1],[0,0,-1],normalize([.8,-.2,.6])]){const o={id:'paperplanes',point:[4,9,2],forward,size:1,bank:.17},m=decorationMatrix(o),nose=localPoint(m,[1.6,0,0]);assert.ok(dot(normalize(sub(nose,o.point)),forward)>.999999,'3D paper nose follows actual flight direction even when banked')}
let frames=0,events=0;
for(const id of FAST_TYPES){const w=new SharedWorld('flight-v16-'+id),d=new FlightDirector(w);d.unicornPresent=true;const enabled=Object.fromEntries(Object.keys(defaultDecorations()).map(k=>[k,k===id])),p=[0,1,2].map(lane=>({lane,distance:400+lane*50,speed:60,finishTime:null})),old=new Map(),phases=new Set();
 for(let k=0;k<60*55;k++){const t=k/60;p.forEach((p,i)=>p.distance=400+i*50+t*60/3.6);const items=d.instances(p,t,[],enabled,'rich',{backgroundStyle:'aurora'});assert.equal(new Set(items.map(o=>o.key)).size,items.length,'one shared identity, no view copies');
  for(const o of items){if(!o.escort)continue;assert.equal(o.ownerLane,null);assert.ok(o.point.every(Number.isFinite));const prev=old.get(o.key);if(prev){const delta=sub(o.point,prev.point);assert.ok(Math.hypot(...delta)<3,'bounded interframe displacement');if(Math.hypot(...delta)>.001)assert.ok(dot(normalize(delta),o.forward)>.999,'heading follows actual world velocity');assert.ok(Math.abs(o.alpha-prev.alpha)<.04)}else events++;old.set(o.key,{point:[...o.point],alpha:o.alpha});phases.add(o.flightPhase);frames++;}
 }
 assert.ok(frames>0);assert.ok(phases.has(id==='ufos'?'hovering':'crossing')||phases.has('cruising'),id+' has natural phases');assert.ok(phases.has('departing')||phases.has('crossing'));
}
for(const id of ['jellyfish','kites','balloons','paperplanes','whales','butterflies']){const w=new SharedWorld('local-'+id),d=new FlightDirector(w),en={[id]:true},p=[0,1,2].map(lane=>({lane,distance:700,speed:60,finishTime:null}));let a=d.instances(p,20,[],en,'medium'),b=d.instances(p,21,[],en,'medium');assert.ok(a.length);for(const x of a){const y=b.find(z=>z.key===x.key);if(y)assert.ok(Math.hypot(...sub(y.point,x.point))<6,id+' cannot match cart speed');if(id==='kites')assert.ok(x.anchor);if(['paperplanes','kites'].includes(id))assert.equal(x.count,1)}
 const moved=p.map(x=>({...x,distance:720})),c=d.instances(moved,21,[],en,'medium');for(const y of b){const z=c.find(x=>x.key===y.key);if(z)assert.deepEqual(z.point,y.point,'moving the cart does not transport local creatures')}
}
const w=new SharedWorld('far-island'),d=new FlightDirector(w),p=[0,1,2].map(lane=>({lane,distance:0,speed:60,finishTime:null}));let previous;
for(const distance of [0,1000,2500,4000,5000]){p.forEach(x=>x.distance=distance);const island=d.instances(p,distance/20,[],{islands:true},'medium')[0];if(previous)assert.deepEqual(island.point,previous);previous=island.point;for(const x of p)assert.ok(Math.hypot(...sub(island.point,w.sample(x.lane,distance).point))>24000)}
const camera={eye:[-10,3,0],target:[10,3,0]};for(const id of Object.keys(FLIGHT_ART).filter(id=>FLIGHT_ART[id].multi)){for(const side of[-1,1]){const pose=artPose(id,id,{point:[0,3,0],forward:[0,0,side],phase:0}, {lane:0,camera},0,new Map());assert.equal(pose.index,1,'lateral movement requires side profile');assert.equal(pose.flip,side<0)}const rear=artPose(id,id,{point:[0,3,0],forward:[1,0,0]}, {lane:0,camera},0,new Map()),front=artPose(id,id,{point:[0,3,0],forward:[-1,0,0]}, {lane:0,camera},0,new Map());assert.equal(rear.index,0);assert.equal(front.index,2)}
assert.equal(artParts({id:'kites',point:[0,4,0],size:1,count:9},0).length,1);assert.equal(artParts({id:'birds',point:[0,4,0],size:1,count:2},0).length,2);
for(const sheet of Object.values(ART_SHEETS)){const b=readFileSync(new URL('../assets/'+sheet.file,import.meta.url));assert.equal(b[25],6);assert.ok(b.readUInt32BE(16)>=1024)}
console.log(`PASS V1.6: ${frames} motion frames, ${events} shared encounters, velocity-aligned headings, four directional views, single kites, local drift independent of carts and unreachable island`);
