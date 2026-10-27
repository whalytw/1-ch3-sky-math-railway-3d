import assert from 'node:assert/strict';
import {SharedWorld,add,sub} from '../src/world.js';
import {FlightDirector,distantCastle,SHEEP_HOP,sheepHop,sheepPoint} from '../src/flight.js';
import {distantSceneView,fieldOfView,project} from '../src/renderer.js';
import {artPose} from '../src/artwork.js';
import {projectedBounds} from '../src/encounters.js';
import {decorationBounds,DecorationSystem,defaultDecorations} from '../src/decorations.js';

const island=distantCastle(),view=(eye=[0,4,0],pitch=0,speed=60,distance=0,yaw=0)=>({lane:0,W:480,H:810,fov:fieldOfView({speed,distance}),camera:{eye,target:add(eye,[Math.cos(yaw),pitch,Math.sin(yaw)]),forward:[Math.cos(yaw),pitch,Math.sin(yaw)],orbit:0}});
const measure=v=>{v=distantSceneView(v,island);return {center:project(v.vp,island.point,v.W,v.H),bounds:projectedBounds(v,island,decorationBounds('islands'))}};
const reference=measure(view());
for(const distance of [0,50,700,2000,5000])for(const speed of [0,60,75,100])for(const pitch of [-.5,0,.5]){
 const got=measure(view([distance,20+distance/50,80],pitch,speed,distance));
 assert.deepEqual(got,reference,'straight travel, slope, jump and speed zoom cannot move or enlarge the sky island');
}
const width=reference.bounds.right-reference.bounds.left;
assert.ok(width>480*.04&&width<480*.18,'island reads as a small remote landmark');
assert.ok(measure(view([0,4,0],0,60,0,-.12)).center.x>reference.center.x);
assert.ok(measure(view([0,4,0],0,60,0,.12)).center.x<reference.center.x,'turning pans the island in the expected direction');

const {period,stride,height,hops}=SHEEP_HOP,base=[100,12,0];
for(let j=0;j<hops;j++){
 const start=sheepHop(j*period),apex=sheepHop((j+.5)*period),end=sheepHop((j+1)*period-1e-7);
 assert.ok(Math.abs(start.lift)<1e-10);assert.ok(Math.abs(apex.lift-height)<1e-10);assert.ok(end.lift<1e-6);
 assert.ok(Math.abs(apex.travel-start.travel-stride/2)<1e-10);assert.ok(stride/height>=7,'a wide, shallow arc');
 for(const q of [.1,.25,.75,.9])assert.ok(Math.abs(sheepHop((j+q)*period).lift-4*height*q*(1-q))<1e-10);
}
let previous;
for(let frame=0;frame<60*40;frame++){
 const t=frame/60,h=sheepHop(t),point=sheepPoint(base,t);
 if(previous){if(h.age<previous.h.age){assert.ok(h.alpha<.01&&previous.h.alpha<.01,'reset only while invisible')}else{assert.ok(h.travel>previous.h.travel);assert.ok(Math.hypot(...sub(point,previous.point))<.1,'continuous hop motion')}}
 previous={h,point};
}
const world=new SharedWorld('sky-sheep-fix'),director=new FlightDirector(world),players=[0,1,2].map(lane=>({lane,distance:700,speed:60,finishTime:null}));
const a=director.instances(players,20,[],{cloudsheep:true},'medium'),b=director.instances(players.map(p=>({...p,distance:720,speed:100})),20,[],{cloudsheep:true},'medium');
assert.ok(a.length);for(const item of a){const other=b.find(o=>o.key===item.key);if(other)assert.deepEqual(other.point,item.point,'sheep motion is independent of cart movement');const pose=artPose('cloudsheep',item.key,item,view(),20,new Map());assert.ok(Math.abs(pose.phase-item.hopPhase*Math.PI*2)<1e-10,'leg animation follows the hop')}
const enabled=Object.fromEntries(Object.keys(defaultDecorations()).map(id=>[id,id==='islands'])),system=new DecorationSystem(world,{decorations:enabled});
for(const distance of [0,150,1000,4000,5000]){players.forEach(p=>p.distance=distance);const items=system.instances(players,distance/20);assert.equal(items.length,1);assert.ok(items[0].distant&&items[0].skyAnchored,'no local or per-camera island copies')}
console.log('PASS V1.6.1: stable distant island under translation/pitch/zoom, turn-only panning, single sky identity; broad advancing sheep parabolas, hidden resets and hop-synchronized legs');
