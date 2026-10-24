import {clamp,hash32} from './math.js?v=1.3.0';
import {add,sub,scale,normalize,cross} from './world.js?v=1.3.0';

export const ESCORT_TYPES=['birds','whales','dragons','witches','heroes','biplanes','butterflies','airships','paperplanes','cloudsheep','robots','jellyfish','kites'];
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export function projectPoint(m,p,W,H){const v=[0,0,0,0];for(let row=0;row<4;row++)for(let col=0;col<4;col++)v[row]+=m[col*4+row]*(col===3?1:p[col]);return{x:(v[0]/v[3]*.5+.5)*W,y:(.5-v[1]/v[3]*.5)*H,visible:v[3]>.05}}
export function rayPoint(view,x,y,depth){const {camera,W,H,fov}=view,f=normalize(sub(camera.target,camera.eye)),r=normalize(cross(f,[0,1,0])),u=normalize(cross(r,f)),t=Math.tan(fov/2);return add(add(add(camera.eye,scale(f,depth)),scale(r,(x/W*2-1)*t*depth*W/H)),scale(u,(1-y/H*2)*t*depth))}
export function encounterMatrix(item){const f0=item.forward||[1,0,0],r0=normalize(cross(f0,[0,1,0])),yaw=item.yaw||0,f=add(scale(f0,Math.cos(yaw)),scale(r0,Math.sin(yaw))),r=normalize(cross(f,[0,1,0])),u=normalize(cross(r,f)),s=item.size,bank=item.bank||0,up=add(scale(u,Math.cos(bank)),scale(r,Math.sin(bank))),right=add(scale(r,Math.cos(bank)),scale(u,-Math.sin(bank)));return [...scale(f,s),0,...scale(up,s),0,...scale(right,s),0,...item.point,1]}
export function projectedBounds(view,item,bounds){const m=encounterMatrix(item),points=[];for(const x of[bounds.min[0],bounds.max[0]])for(const y of[bounds.min[1],bounds.max[1]])for(const z of[bounds.min[2],bounds.max[2]]){const p=[m[12]+m[0]*x+m[4]*y+m[8]*z,m[13]+m[1]*x+m[5]*y+m[9]*z,m[14]+m[2]*x+m[6]*y+m[10]*z];points.push(projectPoint(view.vp,p,view.W,view.H))}if(points.some(p=>!p.visible))return null;return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))}}
export const overlaps=(a,b,pad=0)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
export function findStage(view,aspect){const {W,H}=view;for(const fraction of[.36,.32,.28,.24,.20,.17,.14,.12,.10]){
 const width=W*fraction,height=width/aspect;if(height>H*.26)continue;let best=null;
 const xs=[.51,.61,.41,.71,.31,.81,.21].map(x=>x*W),ys=[.55,.60,.49,.66,.43,.72].map(y=>y*H);
 for(const o of view.avoid){xs.push(o.left-10-width/2,o.right+10+width/2);ys.push(o.top-10-height/2,o.bottom+10+height/2)}
 for(const y of ys)for(const x of xs){const r={left:x-width/2,right:x+width/2,top:y-height/2,bottom:y+height/2};if(r.left<12||r.right>W-12||r.top<H*.20||r.bottom>H*.82||view.avoid.some(o=>overlaps(r,o,9)))continue;const score=-Math.abs(x/W-.53)*.3-Math.abs(y/H-.56)*.5;if(!best||score>best.score)best={...r,score}}
 if(best)return best;
 }return null}
function lineClear(world,eye,point,margin){for(let j=1;j<=12;j++){const t=j/12,p=add(eye,scale(sub(point,eye),t));if(p[1]<world.surfaceY(p[0],p[2])+margin)return false}return true}
export class EscortDirector{
 constructor(world,getBounds){this.world=world;this.getBounds=getBounds;this.events=new Map();this.stages=new Map()}
 instances(players,clock,views,enabled,density){if(!views?.length||density==='off')return[];const types=ESCORT_TYPES.filter(id=>enabled[id]);if(!types.length)return[];const out=[];
  for(const view of views){const p=players[view.lane];if(!p||p.distance<35||p.distance>4860||p.finishTime!==null||p.reviewOpen)continue;
   const interval=density==='sparse'?37:28,start=4+p.lane*1.3,cycle=Math.floor((clock-start)/interval);if(cycle<0)continue;const age=clock-start-cycle*interval,key=`${p.lane}:${cycle}:${interval}`,seed=hash32(this.world.seed+':escort:'+key),duration=16+seed%4;if(age>duration)continue;
   const id=types[seed%types.length],bounds=this.getBounds(id),sample=this.world.sample(p.lane,p.renderDistance??p.distance),forward=normalize([sample.forward[0],sample.forward[1]*.18,sample.forward[2]]),phase=(seed%628)/100,yaw=1.9+Math.sin(clock*.44+phase)*.12,bank=Math.sin(clock*.55+phase)*.08;
   let accepted=null;for(const depth of[22,17,13,12,10.5,28,35]){
    let item={id,point:rayPoint(view,view.W*.53,view.H*.57,depth),size:1,forward,yaw,bank,alpha:smooth(age/1.25)*smooth((duration-age)/1.75),ownerLane:p.lane,escort:true,phase,motion:['birds','dragons','butterflies','paperplanes'].includes(id)?1:id==='jellyfish'?3:0,variant:0,side:1,rotation:0};
    let box=projectedBounds(view,item,bounds);if(!box)continue;const aspect=(box.right-box.left)/(box.bottom-box.top),stageKey=[p.lane,view.layoutKey,view.W,view.H,aspect.toFixed(1),...view.avoid.flatMap(r=>[r.left,r.top,r.right,r.bottom].map(n=>Math.round(n/16)))].join(':'),stage=this.stages.get(stageKey)||findStage(view,aspect);if(stage){this.stages.set(stageKey,stage);if(this.stages.size>128)this.stages.delete(this.stages.keys().next().value)}if(!stage)continue;
    const fit=Math.min((stage.right-stage.left)/(box.right-box.left),(stage.bottom-stage.top)/(box.bottom-box.top))*.80;item.size=clamp(fit,.14,2.2);
    const usableW=(stage.right-stage.left)*.12,usableH=(stage.bottom-stage.top)*.10,entry=(1-smooth(age/1.7))*usableW*2,exit=(1-smooth((duration-age)/2))*usableW*2;
    const x=(stage.left+stage.right)/2+Math.sin(clock*.57+phase)*usableW+entry-exit,y=(stage.top+stage.bottom)/2+Math.sin(clock*.79+phase)*usableH;
    item.point=rayPoint(view,x,y,depth+Math.sin(clock*.45+phase)*1.5);
    for(let j=0;j<2;j++){box=projectedBounds(view,item,bounds);if(!box)break;item.point=add(item.point,sub(rayPoint(view,x,y,depth),rayPoint(view,(box.left+box.right)/2,(box.top+box.bottom)/2,depth)))}
    box=projectedBounds(view,item,bounds);if(!box||box.left<5||box.right>view.W-5||box.top<5||box.bottom>view.H-5||view.avoid.some(o=>overlaps(box,o,3)))continue;
    const radius=bounds.radius*item.size+item.size*.35,vertical=Math.max(Math.abs(bounds.min[1]),Math.abs(bounds.max[1]))*item.size;
    if(players.some(other=>{const a=this.world.sample(other.lane,other.renderDistance??other.distance).point;return Math.hypot(...sub(item.point,add(a,[0,1,0])))<=radius+4.2}))continue;
    if(item.point[1]-vertical<this.world.surfaceY(item.point[0],item.point[2])+.25||!lineClear(this.world,view.camera.eye,item.point,vertical*.35))continue;
    item.radius=radius;item.screenBounds=box;item.encounterKey=key;item.age=age;item.duration=duration;accepted=item;break;
   }
   if(accepted){const previous=this.events.get(p.lane);if(previous?.key===key&&previous.id===id&&clock>=previous.clock){const dt=Math.min(.12,clock-previous.clock),a=1-Math.exp(-dt*3.8);accepted.size=Math.min(accepted.size,previous.size+(accepted.size-previous.size)*a)}
    accepted.radius=bounds.radius*accepted.size+accepted.size*.35;accepted.screenBounds=projectedBounds(view,accepted,bounds);this.events.set(p.lane,{key,id,clock,size:accepted.size});out.push(accepted)}
  }return out;
 }
}
