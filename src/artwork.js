import {clamp} from './math.js?v=1.4.0';
import {add,sub,scale,normalize,cross} from './world.js?v=1.4.0';

export const ART_SHEETS=Object.freeze({
 witch:{file:'cute-witch.png',cols:2,rows:2},birds:{file:'cute-birds.png',cols:4,rows:2},
 whale:{file:'cute-whale.png',cols:2,rows:2},dragon:{file:'cute-dragon.png',cols:4,rows:2},
 cast:{file:'cute-cast.png',cols:4,rows:3}
});
const entry=(sheet,w,h,cell=null,flap=false)=>({sheet,w,h,cell,flap});
export const FLIGHT_ART=Object.freeze({
 witches:entry('witch',3.4,3.4),birds:entry('birds',1.7,1.7,null,true),whales:entry('whale',5,5),dragons:entry('dragon',4.5,4.5,null,true),
 biplanes:entry('cast',4.2,4.2,[0,0]),heroes:entry('cast',2.8,2.8,[1,0]),robots:entry('cast',2.6,2.6,[2,0]),airships:entry('cast',5,5,[3,0]),
 cloudsheep:entry('cast',3.5,3.5,[0,1]),jellyfish:entry('cast',3.2,3.2,[1,1]),butterflies:entry('cast',2.7,2.7,[2,1]),paperplanes:entry('cast',3.5,3.5,[3,1]),
 kites:entry('cast',3.8,3.8,[0,2]),balloons:entry('cast',4.3,4.3,[1,2]),islands:entry('cast',4.8,4.8,[2,2]),fireflies:entry('cast',2.2,2.2,[3,2])
});
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export function artBounds(id){const a=FLIGHT_ART[id];if(!a)return null;const w=id==='birds'?4.8:a.w,h=id==='birds'?2.7:a.h;return {min:[-w/2,-h/2,-.1],max:[w/2,h/2,.1],width:w,height:h,radius:Math.hypot(w,h)/2,billboard:true}}
export function artParts(item,clock){const a=FLIGHT_ART[item.id];if(!a)return[];const f=normalize(item.forward||[1,0,0]),r=normalize(cross(f,[0,1,0])),s=item.size;
 if(item.id==='birds')return [0,1,2].map(j=>({point:add(add(item.point,scale(f,(j?-.65-j*.20:0)*s)),add(scale(r,(j===1?-1.45:j===2?1.45:0)*s),[0,Math.sin(clock*2.1+(item.phase||0)+j)*.055*s,0])),w:a.w*s,h:a.h*s,phase:(item.phase||0)+j*1.7,bank:Math.sin(clock*1.4+j)*.035}));
 return [{point:item.point,w:a.w*s,h:a.h*s,phase:item.phase||0,bank:(item.bank||0)*.35}];
}
export function billboardModel(view,part){const f=normalize(sub(view.camera.target,view.camera.eye)),r=normalize(cross(f,[0,1,0])),u=normalize(cross(r,f)),b=part.bank||0,R=add(scale(r,Math.cos(b)),scale(u,Math.sin(b))),U=add(scale(u,Math.cos(b)),scale(r,-Math.sin(b)));return new Float32Array([...scale(R,part.w/2),0,...scale(U,part.h/2),0,...scale(f,-1),0,...part.point,1])}
export function desiredView(item,camera){const f=normalize(item.forward||[1,0,0]),r=normalize(cross(f,[0,1,0])),to=normalize(sub(camera.eye,item.point)),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),front=dot(to,f)>0,side=dot(to,r);return {index:(front?2:0)+(side>0?1:0),front,side}}
export function cellFor(id,view,down=false){const a=FLIGHT_ART[id],sheet=ART_SHEETS[a.sheet];if(a.cell)return a.cell;if(a.flap)return [view,down?1:0];return [view%2,Math.floor(view/2)]}
export function artPose(id,key,item,view,clock,states){const def=FLIGHT_ART[id],desired=desiredView(item,view.camera),stateKey=key+':'+view.lane;let state=states.get(stateKey);
 if(!state){state={from:desired.index,to:desired.index,at:clock};states.set(stateKey,state)}
 if(desired.index!==state.to&&Math.abs(desired.side)>.18){state.from=state.to;state.to=desired.index;state.at=clock}
 if(states.size>96)states.delete(states.keys().next().value);
 const mix=smooth((clock-state.at)/.4),flap=def.flap?(.5-.5*Math.cos(clock*(id==='birds'?10:5.7)+(item.phase||0))):0;
 return {from:cellFor(id,state.from),to:cellFor(id,state.to),mix,flap,flip:!!def.cell&&desired.side>0,sheet:ART_SHEETS[def.sheet],def};
}
let bank;
export function artworkBank(){if(bank)return bank;bank={images:new Map(),ready:false,error:null,promise:null};return bank}
export function loadArtwork(){const b=artworkBank();if(b.promise)return b.promise;if(typeof Image==='undefined'){b.ready=true;return b.promise=Promise.resolve(b)}
 b.promise=Promise.all(Object.entries(ART_SHEETS).map(([key,sheet])=>new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>{b.images.set(key,image);resolve()};image.onerror=()=>reject(new Error('無法載入 '+sheet.file));image.src=new URL('../assets/'+sheet.file+'?v=1.4.0',import.meta.url).href}))).then(()=>{b.ready=true;return b}).catch(e=>{b.error=e;throw e});return b.promise;
}
