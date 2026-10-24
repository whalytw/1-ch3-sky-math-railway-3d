import {FLIGHT_ART,artBounds,artParts,billboardModel} from './artwork.js?v=1.4.0';
import {clamp,hash32} from './math.js?v=1.4.0';
import {add,sub,scale,normalize,cross} from './world.js?v=1.4.0';

export const ESCORT_TYPES=['birds','whales','dragons','witches','heroes','biplanes','butterflies','airships','paperplanes','cloudsheep','robots','jellyfish','kites'];
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
export class EscortDirector{
 constructor(world,getBounds){this.world=world;this.getBounds=id=>artBounds(id)||getBounds(id);this.active=new Map();this.nextAt=[7,8.3,9.6];this.serial=[0,0,0];this.lastClock=null;this.history=[]}
 reset(clock=0){this.active.clear();this.nextAt=[clock+1,clock+2.3,clock+3.6];this.lastClock=clock}
 safe(point,bounds,size,players,clearance=.25){const radius=bounds.radius*size+.08,vertical=bounds.height?bounds.height/2*size:Math.max(Math.abs(bounds.min[1]),Math.abs(bounds.max[1]))*size;if(point[1]-vertical<this.world.footingY(point[0],point[2],bounds.width/2*size)+clearance)return false;return players.every(p=>Math.hypot(...sub(point,add(this.world.sample(p.lane,p.renderDistance??p.distance).point,[0,1,0])))>radius+4.2)}
 plan(view,p,id,clock,players){const bounds=this.getBounds(id),sample=this.world.sample(p.lane,p.renderDistance??p.distance),forward=normalize([sample.forward[0],sample.forward[1]*.25,sample.forward[2]]);
  for(const depth of[12,10.5,15,18,22]){const item={id,point:rayPoint(view,view.W*.53,view.H*.56,depth),size:1,forward,yaw:0,phase:0,visualTime:clock},box=projectedBounds(view,item,bounds);if(!box)continue;const stage=findStage(view,(box.right-box.left)/(box.bottom-box.top));if(!stage)continue;
   item.size=clamp(Math.min((stage.right-stage.left)/(box.right-box.left),(stage.bottom-stage.top)/(box.bottom-box.top))*.75,.10,1.8);
   const center=[(stage.left+stage.right)/2,(stage.top+stage.bottom)/2];item.point=rayPoint(view,center[0],center[1],depth);
   const b=projectedBounds(view,item,bounds);if(!b||view.avoid.some(o=>overlaps(b,o,5))||!this.safe(item.point,bounds,item.size,players)||!lineClear(this.world,view.camera.eye,item.point,bounds.height*item.size*.15))continue;
   let entry=0;for(const extra of[12,6]){const point=rayPoint(view,center[0],center[1],depth+extra);if(this.safe(point,bounds,item.size,players)&&lineClear(this.world,view.camera.eye,point,bounds.height*item.size*.1)){entry=extra;break}}
   return {bounds,size:item.size,depth,entry,stage,anchor:[center[0]/view.W,center[1]/view.H],forward};
  }return null;
 }
 retire(state,clock,reason,duration=5){if(state.departAt!==null)return;state.departAt=clock;state.departDuration=duration;state.departReason=reason;this.history.push({key:state.key,type:'depart',clock,reason});if(this.history.length>100)this.history.shift()}
 instances(players,clock,views,enabled,density){if(!views?.length)return[];if(density==='off'||!ESCORT_TYPES.some(id=>enabled[id])){this.active.clear();this.lastClock=clock;return[]}
  if(this.lastClock!==null&&clock<this.lastClock-1e-5)this.reset(clock);this.lastClock=clock;const types=ESCORT_TYPES.filter(id=>enabled[id]),out=[];
  for(const view of views){const p=players[view.lane];if(!p)continue;const car=this.world.sample(p.lane,p.renderDistance??p.distance).point;let state=this.active.get(p.lane);
   if(state&&Math.hypot(...sub(car,state.lastCar))>90){this.active.delete(p.lane);this.nextAt[p.lane]=clock+.25;state=null}
   if(!state){if(clock<this.nextAt[p.lane]||p.distance<35||p.distance>4760||p.finishTime!==null||p.reviewOpen)continue;
    const serial=this.serial[p.lane],seed=hash32(this.world.seed+':companion:'+p.lane+':'+serial),startIndex=seed%types.length;let plan,id;
    for(let j=0;j<types.length;j++){id=types[(startIndex+j)%types.length];plan=this.plan(view,p,id,clock,players);if(plan)break}if(!plan){this.nextAt[p.lane]=clock+.5;continue}
    this.serial[p.lane]++;state={...plan,id,key:`${p.lane}:${serial}`,born:clock,lastClock:clock,lastCar:car,point:rayPoint(view,plan.anchor[0]*view.W,plan.anchor[1]*view.H,plan.depth+plan.entry),forward:plan.forward,phase:(seed%628)/100,cruiseDuration:14+seed%4,departAt:null,departDuration:5,invalidFor:0,alpha:0,ownerLane:p.lane};this.active.set(p.lane,state);this.history.push({key:state.key,type:'enter',clock,id});
   }
   const dt=Math.max(0,clock-state.lastClock),age=clock-state.born;
   if(!enabled[state.id]||p.finishTime!==null||p.reviewOpen||p.distance>4800)this.retire(state,clock,'finish-or-setting',2);
   if(age>=3+state.cruiseDuration)this.retire(state,clock,'scheduled',5);
   const departure=state.departAt===null?0:clamp((clock-state.departAt)/state.departDuration,0,1),entrance=smooth(age/3),currentDepth=state.depth+state.entry*(1-entrance)+(state.departAt===null?0:(state.departReason==='scheduled'?40:9)*smooth(departure));
   const sway=Math.sin(age*.65+state.phase),lift=Math.sin(age*.83+state.phase),anchorX=state.anchor[0]*view.W+sway*(state.stage.right-state.stage.left)*.045,anchorY=state.anchor[1]*view.H+lift*(state.stage.bottom-state.stage.top)*.045;
   let goal=rayPoint(view,anchorX,anchorY,currentDepth),vertical=state.bounds.height/2*state.size;
   const ground=this.world.footingY(goal[0],goal[2],state.bounds.width/2*state.size);goal[1]=Math.max(goal[1],ground+vertical+.30);
   for(const other of players){const c=add(this.world.sample(other.lane,other.renderDistance??other.distance).point,[0,1,0]),delta=sub(goal,c),n=Math.hypot(...delta),limit=state.bounds.radius*state.size+4.35;if(n<limit){goal=add(c,scale(normalize(add(delta,[0,.25,0])),limit));this.retire(state,clock,'clearance',1.8)}}
   const transported=add(state.point,sub(car,state.lastCar)),a=1-Math.exp(-dt*6);state.point=transported.map((v,i)=>v+(goal[i]-v)*a);state.point[1]=Math.max(state.point[1],this.world.footingY(state.point[0],state.point[2],state.bounds.width/2*state.size)+vertical+.22);for(const other of players){const c=add(this.world.sample(other.lane,other.renderDistance??other.distance).point,[0,1,0]),delta=sub(state.point,c),n=Math.hypot(...delta),limit=state.bounds.radius*state.size+4.23;if(n<limit)state.point=add(c,scale(normalize(add(delta,[0,.10,0])),limit))}
   // Follow the cart's heading; the small bank is independent of forward direction.
   const sample=this.world.sample(p.lane,p.renderDistance??p.distance),heading=normalize([sample.forward[0],sample.forward[1]*.25,sample.forward[2]]),h=1-Math.exp(-dt*5);state.forward=normalize(state.forward.map((v,i)=>v+(heading[i]-v)*h));
   state.alpha=smooth(age/1.4)*(state.departAt===null?1:state.departReason==='scheduled'?1-smooth((departure-.55)/.45):1-smooth(departure));
   const item={id:state.id,key:state.key,encounterKey:state.key,point:state.point,forward:state.forward,yaw:0,bank:Math.sin(age*.6+state.phase)*.035,size:state.size,radius:state.bounds.radius*state.size+.08,alpha:state.alpha,ownerLane:p.lane,escort:true,phase:state.phase,motion:0,variant:0,side:1,rotation:0,visualTime:clock,age,duration:3+state.cruiseDuration+5,flightPhase:state.departAt!==null?'departing':age<3?'approaching':'cruising'};
   const box=projectedBounds(view,item,state.bounds);item.screenBounds=box;
   if(box&&view.avoid.some(o=>overlaps(box,o,2))&&age>2){state.invalidFor+=dt;if(state.invalidFor>.35)this.retire(state,clock,'layout',1.8)}else state.invalidFor=0;
   if(departure>=1){this.active.delete(p.lane);this.nextAt[p.lane]=clock+(density==='sparse'?16:8);this.history.push({key:state.key,type:'gone',clock,lastAlpha:state.alpha});continue}
   state.lastCar=car;state.lastClock=clock;out.push(item);
  }return out;
 }
}
