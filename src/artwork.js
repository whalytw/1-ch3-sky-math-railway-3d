import {clamp} from './math.js?v=1.5.0';
import {add,sub,scale,normalize,cross} from './world.js?v=1.5.0';
import {ANIMATIONS,animationPhase} from './animation.js?v=1.5.0';
const single=file=>({file:'single-'+file+'.png',cols:1,rows:1});
export const ART_SHEETS=Object.freeze({witch:{file:'cute-witch.png',cols:2,rows:2},whale:{file:'cute-whale.png',cols:2,rows:2},bird:single('bird'),dragon:single('dragon'),butterfly:single('butterfly'),jellyfish:single('jellyfish'),hero:single('hero'),robot:single('robot'),biplane:single('biplane'),airship:single('airship'),cloudsheep:single('cloudsheep'),paperplane:single('paperplane'),kite:single('kite'),balloon:single('balloon'),island:single('island')});
const entry=(sheet,w,h,multi=false)=>({sheet,w,h,multi});
export const FLIGHT_ART=Object.freeze({witches:entry('witch',3.4,3.4,true),whales:entry('whale',5,5,true),birds:entry('bird',1.7,1.7),dragons:entry('dragon',4.5,4.5),butterflies:entry('butterfly',1.5,1.5),jellyfish:entry('jellyfish',3.2,3.6),heroes:entry('hero',2.8,2.8),robots:entry('robot',2.8,2.8),biplanes:entry('biplane',4.2,4.2),airships:entry('airship',5,5),cloudsheep:entry('cloudsheep',3.5,3.5),paperplanes:entry('paperplane',2.4,2.4),kites:entry('kite',2.6,3.0),balloons:entry('balloon',4.3,4.3),islands:entry('island',4.8,4.8)});
export function artBounds(id){const a=FLIGHT_ART[id];if(!a)return null;const sizes={birds:[4.8,2.7],butterflies:[4.0,3.0],paperplanes:[5.1,3.5],kites:[4.4,4.0]},[w,h]=sizes[id]||[a.w*1.08,a.h*1.08];return {min:[-w/2,-h/2,-.15],max:[w/2,h/2,.15],width:w,height:h,radius:Math.hypot(w,h)/2,billboard:true}}
export function artParts(item,clock){const a=FLIGHT_ART[item.id];if(!a)return[];const f=normalize(item.forward||[1,0,0]),r=normalize(cross(f,[0,1,0])),s=item.size,phase=item.phase||0;
 if(['birds','butterflies','paperplanes','kites'].includes(item.id)){const bird=item.id==='birds',kite=item.id==='kites',butterfly=item.id==='butterflies';return Array.from({length:kite?2:3},(_,j)=>{const side=j===1?-1:j===2?1:0,offset=bird?1.45:butterfly?1.12:kite?1.65:1.4,vertical=bird?Math.sin(clock*2.1+phase+j)*.055:butterfly?Math.sin(clock*1.3+phase+j*2)*.30:kite?j*.40:Math.sin(clock*.8+j)*.12;return {point:add(add(item.point,scale(f,(j?-.65-j*.2:0)*s)),add(scale(r,side*offset*s),[0,vertical*s,0])),w:a.w*s*(j&&butterfly?.84:1),h:a.h*s*(j&&butterfly?.84:1),phase:phase+j*1.7,bank:Math.sin(clock*(butterfly?1.6:1.1)+j)*.075}})}
 return [{point:item.point,w:a.w*s,h:a.h*s,phase,bank:(item.bank||0)*.35}];
}
export function billboardModel(view,part){const f=normalize(sub(view.camera.target,view.camera.eye)),r=normalize(cross(f,[0,1,0])),u=normalize(cross(r,f)),b=part.bank||0,R=add(scale(r,Math.cos(b)),scale(u,Math.sin(b))),U=add(scale(u,Math.cos(b)),scale(r,-Math.sin(b)));return new Float32Array([...scale(R,part.w/2),0,...scale(U,part.h/2),0,...scale(f,-1),0,...part.point,1])}
export function desiredView(item,camera){const f=normalize(item.forward||[1,0,0]),r=normalize(cross(f,[0,1,0])),to=normalize(sub(camera.eye,item.point)),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),front=dot(to,f)>0,side=dot(to,r);return {index:(front?2:0)+(side>0?1:0),front,side}}
export function cellFor(id,view){return FLIGHT_ART[id].multi?[view%2,Math.floor(view/2)]:[0,0]}
export function artPose(id,key,item,view,clock,states){const def=FLIGHT_ART[id],desired=desiredView(item,view.camera),stateKey=key+':'+view.lane;let state=states.get(stateKey);
 if(!state){state={index:desired.index,target:desired.index,from:desired.index,at:-10};states.set(stateKey,state)}const elapsed=clock-state.at;if(elapsed>=.36)state.index=state.target;
 if(elapsed>=.36&&desired.index!==state.target&&Math.abs(desired.side)>.22){state.from=state.index;state.target=desired.index;state.at=clock}
 const turn=clamp((clock-state.at)/.36,0,1),index=turn<.5?state.from:state.target,turnScale=turn<1?.72+.28*Math.abs(Math.cos(turn*Math.PI)):1;if(states.size>128)states.delete(states.keys().next().value);
 const fixed=['birds','dragons','butterflies','jellyfish'].includes(id),flip=!def.multi&&!fixed&&index%2===1;
 return {index,from:cellFor(id,index),to:cellFor(id,index),mix:0,flap:0,flip,sheet:ART_SHEETS[def.sheet],def,turnScale,kind:ANIMATIONS[id].kind,phase:animationPhase(id,clock,item.phase||0),mirror:def.multi&&(id==='whales'?(index===1||index===2):index%2)?-1:1};
}
let bank;
export function artworkBank(){if(bank)return bank;bank={images:new Map(),ready:false,error:null,promise:null};return bank}
export function loadArtwork(){const b=artworkBank();if(b.promise)return b.promise;if(typeof Image==='undefined'){b.ready=true;return b.promise=Promise.resolve(b)}
 b.promise=Promise.all(Object.entries(ART_SHEETS).map(([key,sheet])=>new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>{b.images.set(key,image);resolve()};image.onerror=()=>reject(new Error('無法載入 '+sheet.file));image.src=new URL('../assets/'+sheet.file+'?v=1.5.0',import.meta.url).href}))).then(()=>{b.ready=true;return b}).catch(e=>{b.error=e;throw e});return b.promise;
}
