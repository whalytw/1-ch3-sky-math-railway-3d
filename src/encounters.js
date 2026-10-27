import {FLIGHT_ART,artBounds,artParts,billboardModel} from './artwork.js?v=1.6.0';
import {clamp,hash32} from './math.js?v=1.6.0';
import {add,sub,scale,normalize,cross} from './world.js?v=1.6.0';

export {FLIGHT_TYPES as ESCORT_TYPES} from './flight.js?v=1.6.0';
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export function projectPoint(m,p,W,H){const v=[0,0,0,0];for(let row=0;row<4;row++)for(let col=0;col<4;col++)v[row]+=m[col*4+row]*(col===3?1:p[col]);return{x:(v[0]/v[3]*.5+.5)*W,y:(.5-v[1]/v[3]*.5)*H,visible:v[3]>.05}}
export function rayPoint(view,x,y,depth){const {camera,W,H,fov}=view,f=normalize(sub(camera.target,camera.eye)),r=normalize(cross(f,[0,1,0])),u=normalize(cross(r,f)),t=Math.tan(fov/2);return add(add(add(camera.eye,scale(f,depth)),scale(r,(x/W*2-1)*t*depth*W/H)),scale(u,(1-y/H*2)*t*depth))}
export function encounterMatrix(item){const f0=item.forward||[1,0,0],r0=normalize(cross(f0,[0,1,0])),yaw=item.yaw||0,f=add(scale(f0,Math.cos(yaw)),scale(r0,Math.sin(yaw))),r=normalize(cross(f,[0,1,0])),u=normalize(cross(r,f)),s=item.size,bank=item.bank||0,up=add(scale(u,Math.cos(bank)),scale(r,Math.sin(bank))),right=add(scale(r,Math.cos(bank)),scale(u,-Math.sin(bank)));return [...scale(f,s),0,...scale(up,s),0,...scale(right,s),0,...item.point,1]}
export function projectedBounds(view,item,bounds){const points=[];
 if(bounds.billboard){for(const part of artParts(item,item.visualTime||0)){const m=billboardModel(view,part);for(const x of[-1,1])for(const y of[-1,1])points.push(projectPoint(view.vp,[m[12]+m[0]*x+m[4]*y,m[13]+m[1]*x+m[5]*y,m[14]+m[2]*x+m[6]*y],view.W,view.H))}}
 else {const m=encounterMatrix(item);for(const x of[bounds.min[0],bounds.max[0]])for(const y of[bounds.min[1],bounds.max[1]])for(const z of[bounds.min[2],bounds.max[2]])points.push(projectPoint(view.vp,[m[12]+m[0]*x+m[4]*y+m[8]*z,m[13]+m[1]*x+m[5]*y+m[9]*z,m[14]+m[2]*x+m[6]*y+m[10]*z],view.W,view.H))}
 if(!points.length||points.some(p=>!p.visible))return null;return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
}
export const overlaps=(a,b,pad=0)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
export function findStage(view,aspect){const {W,H}=view;for(const fraction of[.36,.32,.28,.24,.20,.17,.14,.12,.10]){
 const width=W*fraction,height=width/aspect;if(height>H*.26)continue;let best=null;
 const xs=[.51,.61,.41,.71,.31,.81,.21].map(x=>x*W),ys=[.55,.60,.49,.66,.43,.72].map(y=>y*H);
 for(const o of view.avoid){xs.push(o.left-10-width/2,o.right+10+width/2);ys.push(o.top-10-height/2,o.bottom+10+height/2)}
 for(const y of ys)for(const x of xs){const r={left:x-width/2,right:x+width/2,top:y-height/2,bottom:y+height/2};if(r.left<12||r.right>W-12||r.top<H*.20||r.bottom>H*.82||view.avoid.some(o=>overlaps(r,o,9)))continue;const score=-Math.abs(x/W-.53)*.3-Math.abs(y/H-.56)*.5;if(!best||score>best.score)best={...r,score}}
 if(best)return best;
 }return null}
function lineClear(world,eye,point,margin){for(let j=1;j<=12;j++){const t=j/12,p=add(eye,scale(sub(point,eye),t));if(p[1]<world.surfaceY(p[0],p[2])+margin)return false}return true}
export {FlightDirector as EscortDirector} from './flight.js?v=1.6.0';
