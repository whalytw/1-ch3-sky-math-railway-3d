import {clamp} from './math.js?v=1.6.1';
import {add,sub,scale,normalize,cross} from './world.js?v=1.6.1';
import {ANIMATIONS,animationPhase} from './animation.js?v=1.6.1';
const single=file=>({file:'single-'+file+'.png',cols:1,rows:1});
const views=file=>({file:'views-'+file+'.png',cols:2,rows:2,isolatedViews:true});
export const ART_SHEETS=Object.freeze({witch:views('witch'),whale:views('whale'),bird:views('bird'),dragon:views('dragon'),hero:views('hero'),robot:views('robot'),biplane:views('biplane'),airship:views('airship'),unicorn:views('unicorn'),butterfly:single('butterfly'),jellyfish:single('jellyfish'),cloudsheep:single('cloudsheep'),kite:single('kite'),balloon:single('balloon'),island:{file:'distant-castle-island.png',cols:1,rows:1}});
const entry=(sheet,w,h,multi=false)=>({sheet,w,h,multi});
export const FLIGHT_ART=Object.freeze({witches:entry('witch',3.4,3.4,true),whales:entry('whale',5,5,true),birds:entry('bird',1.7,1.7,true),dragons:entry('dragon',4.5,4.5,true),butterflies:entry('butterfly',1.5,1.5),jellyfish:entry('jellyfish',3.2,3.6),heroes:entry('hero',2.8,2.8,true),robots:entry('robot',2.8,2.8,true),biplanes:entry('biplane',4.2,4.2,true),airships:entry('airship',5,5,true),cloudsheep:entry('cloudsheep',3.5,3.5),kites:entry('kite',2.6,3),balloons:entry('balloon',4.3,4.3),islands:entry('island',4.8,4.8),unicorns:entry('unicorn',4.2,4.2,true)});
export function artBounds(id){const a=FLIGHT_ART[id];if(!a)return null;const group=['birds','butterflies'].includes(id),w=a.w*(group?3:1.1),h=a.h*1.1;return {min:[-w/2,-h/2,-.15],max:[w/2,h/2,.15],width:w,height:h,radius:Math.hypot(w,h)/2,billboard:true}}
export function artParts(item,clock){const a=FLIGHT_ART[item.id];if(!a)return [];const f=normalize(item.forward||[1,0,0]),r=normalize(cross(f,[0,1,0])),s=item.size||1,phase=item.phase||0,count=['birds','butterflies'].includes(item.id)?item.count??1:1;
 return Array.from({length:count},(_,j)=>{const off=j? (j%2?-.9:1.3):0,lift=j?.25*Math.sin(clock*.8+phase+j*2)+j*.14:0;return {point:add(add(item.point,scale(f,-j*.85*s)),add(scale(r,off*s),[0,lift*s,0])),w:a.w*s*(j&&item.id==='butterflies'?.82:1),h:a.h*s*(j&&item.id==='butterflies'?.82:1),phase:phase+j*1.73,bank:item.bank||0}});
}
export function billboardModel(view,part){const f=normalize(sub(view.camera.target||part.point,view.camera.eye)),r=normalize(cross(f,[0,1,0])),u=normalize(cross(r,f)),b=part.bank||0,R=add(scale(r,Math.cos(b)),scale(u,Math.sin(b))),U=add(scale(u,Math.cos(b)),scale(r,-Math.sin(b)));return new Float32Array([...scale(R,part.w/2),0,...scale(U,part.h/2),0,...scale(f,-1),0,...part.point,1])}
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
export function desiredView(item,camera){const dir=normalize(item.forward||[1,0,0]),to=normalize(sub(camera.eye,item.point)),f=normalize(sub(camera.target||item.point,camera.eye)),r=normalize(cross(f,[0,1,0])),u=normalize(cross(r,f)),front=dot(to,dir),sx=dot(dir,r),sy=dot(dir,u);return {index:Math.abs(front)>.78?(front>0?2:0):to[1]<-.46?3:1,front:front>0,side:sx,sx,sy}}
export function cellFor(id,index){return FLIGHT_ART[id].multi?[index%2,Math.floor(index/2)]:[0,0]}
export function artPose(id,key,item,view,clock,states){const def=FLIGHT_ART[id],desired=desiredView(item,view.camera),index=def.multi?desired.index:0,sideView=index===1||index===3,flip=(def.multi&&sideView||id==='cloudsheep')&&desired.sx<0;let kind=ANIMATIONS[id].kind,bank=item.bank||0;
 if(def.multi&&sideView){const screenAngle=Math.atan2(desired.sy,desired.sx),base=index===3?.25:0;bank=screenAngle-(flip?Math.PI-base:base);bank=Math.atan2(Math.sin(bank),Math.cos(bank));if(['birds','dragons','unicorns'].includes(id))kind=16}
 else if(def.multi&&['heroes','robots','witches','whales'].includes(id))kind=18;
 states?.set(key+':'+view.lane,{index,time:clock});if(states?.size>180)states.delete(states.keys().next().value);
 return {index,from:cellFor(id,index),to:cellFor(id,index),mix:0,flap:0,flip,sheet:ART_SHEETS[def.sheet],def,turnScale:1,kind,phase:id==='cloudsheep'&&Number.isFinite(item.hopPhase)?item.hopPhase*Math.PI*2:animationPhase(id,clock,item.phase||0),mirror:1,bank};
}
// Runtime texture isolation: label four disconnected characters, retain only that
// character's alpha and edge pixels, and fit each to a padded equal cell.
// The source PNGs stay untouched. This prevents neighbouring wings from leaking.
export function isolateViewAtlas(image){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),W=canvas.width,H=canvas.height,n=W*H,labels=new Int32Array(n),queue=new Int32Array(n),parts=[];let label=0;
 for(let start=0;start<n;start++){if(labels[start]||pixels.data[start*4+3]<90)continue;label++;let lo=0,hi=1,minX=W,maxX=0,minY=H,maxY=0;queue[0]=start;labels[start]=label;
  while(lo<hi){const q=queue[lo++],x=q%W,y=Math.floor(q/W);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const k of [x>0?q-1:-1,x<W-1?q+1:-1,y>0?q-W:-1,y<H-1?q+W:-1])if(k>=0&&!labels[k]&&pixels.data[k*4+3]>=90){labels[k]=label;queue[hi++]=k}}
  if(hi>500)parts.push({label,size:hi,minX,maxX,minY,maxY});
 }
 const four=parts.sort((a,b)=>b.size-a.size).slice(0,4);if(four.length!==4)throw Error('角色四視角未分離');four.sort((a,b)=>(a.minY+a.maxY)/2-(b.minY+b.maxY)/2);const ordered=[...four.slice(0,2).sort((a,b)=>a.minX-b.minX),...four.slice(2).sort((a,b)=>a.minX-b.minX)];const packed=document.createElement('canvas');packed.width=packed.height=1024;const pc=packed.getContext('2d');
 for(const [index,p]of ordered.entries()){const x0=Math.max(0,p.minX-3),y0=Math.max(0,p.minY-3),ww=Math.min(W,p.maxX+4)-x0,hh=Math.min(H,p.maxY+4)-y0,c=document.createElement('canvas');c.width=ww;c.height=hh;const cc=c.getContext('2d'),dest=cc.createImageData(ww,hh);
  for(let y=0;y<hh;y++)for(let x=0;x<ww;x++){const k=(y+y0)*W+x+x0;let own=labels[k]===p.label;if(!own&&pixels.data[k*4+3]>0)for(let dy=-2;dy<=2&&!own;dy++)for(let dx=-2;dx<=2&&!own;dx++){const xx=x+x0+dx,yy=y+y0+dy;if(xx>=0&&xx<W&&yy>=0&&yy<H&&labels[yy*W+xx]===p.label)own=true}if(own)for(let a=0;a<4;a++)dest.data[(y*ww+x)*4+a]=pixels.data[k*4+a]}
  cc.putImageData(dest,0,0);const ratio=404/Math.max(ww,hh),dw=ww*ratio,dh=hh*ratio;pc.drawImage(c,index%2*512+(512-dw)/2,Math.floor(index/2)*512+(512-dh)/2,dw,dh);
 }return packed;
}
let bank;export function artworkBank(){if(bank)return bank;return bank={images:new Map(),ready:false,error:null,promise:null}}
export function loadArtwork(){const b=artworkBank();if(b.promise)return b.promise;if(typeof Image==='undefined'){b.ready=true;return b.promise=Promise.resolve(b)}b.promise=Promise.all(Object.entries(ART_SHEETS).map(([key,sheet])=>new Promise((resolve,reject)=>{const im=new Image();im.decoding='async';im.onload=()=>{try{b.images.set(key,sheet.isolatedViews?isolateViewAtlas(im):im);resolve()}catch(e){reject(e)}};im.onerror=()=>reject(Error('無法載入 '+sheet.file));im.src=new URL('../assets/'+sheet.file+'?v=1.6.1',import.meta.url).href}))).then(()=>{b.ready=true;return b}).catch(e=>{b.error=e;throw e});return b.promise}
