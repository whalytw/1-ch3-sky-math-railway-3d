import {random,hash32,clamp} from './math.js?v=1.6.1';
import {WORLD_END,add,sub,scale,normalize,cross} from './world.js?v=1.6.1';
import {nightAt} from './lighting.js?v=1.6.1';

export const FAST_TYPES=['birds','dragons','witches','heroes','biplanes','robots','unicorns','ufos'];
export const LOCAL_TYPES=['balloons','whales','butterflies','paperplanes','cloudsheep','jellyfish','kites','robots'];
export const FLIGHT_TYPES=[...new Set([...FAST_TYPES,...LOCAL_TYPES,'airships','islands','meteors','satellites'])];
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const sizes={birds:1,dragons:1.3,witches:1,heroes:1,biplanes:1.4,robots:1,unicorns:1.4,ufos:1.4,balloons:1.6,whales:2.1,butterflies:.55,paperplanes:.8,cloudsheep:1.1,jellyfish:1.3,kites:1};
export function routePoint(w,lane,d,lateral,height){const s=w.sample(lane,d),r=normalize(cross([s.forward[0],0,s.forward[2]],[0,1,0]));return add(add(s.point,scale(r,lateral)),[0,height,0])}
export function directionalVelocity(at,t){return normalize(sub(at(t+.01),at(t-.01)))}
export const SHEEP_HOP=Object.freeze({period:2.2,stride:8.8,height:1.1,hops:6,direction:[.6,0,.8]});
// A run of broad parabolas: each landing is farther along the same heading.
// The run wraps only while fully transparent, never reversing in view.
export function sheepHop(clock,phase=0){
 const {period,stride,height,hops}=SHEEP_HOP,duration=period*hops,age=((clock+phase*period)%duration+duration)%duration,q=(age/period)%1;
 return {age,phase:q,travel:age/period*stride-hops*stride/2,lift:4*height*q*(1-q),alpha:ease(age/.75)*ease((duration-age)/.75)};
}
export function sheepPoint(base,clock,phase=0){const h=sheepHop(clock,phase);return add(add(base,scale(SHEEP_HOP.direction,h.travel)),[0,h.lift,0])}
export function distantCastle(){return {id:'islands',key:'distant-castle',point:[30000,4200,-3200],forward:[1,0,0],size:450,radius:3000,alpha:.76,phase:0,motion:0,rotation:0,variant:0,distant:true,skyAnchored:true}}
export function ufoPath(origin,f,right,age){
 const a=add(add(origin,scale(f,65)),add(scale(right,-48),[0,18,0])),b=add(add(origin,scale(f,45)),add(scale(right,9),[0,15,0]));
 if(age<4)return mix(a,b,ease(age/4));
 if(age<7)return add(b,[Math.sin((age-4)*2)*.16,Math.sin((age-4)*2.6)*.30,Math.sin((age-4)*1.7)*.14]);
 return add(b,add(scale(f,Math.pow(age-7,2)*12),add(scale(right,Math.pow(age-7,2)*7),[0,Math.pow(age-7,2)*4,0])));
}
export class FlightDirector{
 constructor(world){this.world=world;this.active=new Map();this.sheepFloors=new Map();this.serial=0;this.nextAt=7;this.lastClock=null;this.history=[];this.airshipPresent=hash32(world.seed+':airship')%100<40;this.unicornPresent=hash32(world.seed+':unicorn')%100<25}
 reset(clock=0){this.active.clear();this.serial=0;this.nextAt=clock+7;this.lastClock=clock}
 spawn(players,clock,enabled,settings){
  const candidates=players.filter(p=>p.distance>25&&p.distance<4700&&p.finishTime===null);
  if(!candidates.length)return;const focus=candidates[this.serial%candidates.length],at=this.world.sample(focus.lane,focus.distance),n=nightAt(this.world,at.point[0],settings),pool=FAST_TYPES.filter(id=>enabled[id]&&![...this.active.values()].some(e=>e.id===id)&&(id!=='unicorns'||n>.6&&this.unicornPresent));if(!pool.length)return;
  const seed=hash32(this.world.seed+':flight:'+this.serial),id=pool[seed%pool.length],crossing=id!=='ufos'&&seed%3===0;
  const e={id,key:'flight:'+this.serial++,born:clock,lane:focus.lane,d:focus.distance-48,speed:Math.max(12,focus.speed/3.6),origin:at.point,f:normalize([at.forward[0],0,at.forward[2]]),side:seed%2?1:-1,phase:seed%628/100,crossing,cruise:3+seed%4,alpha:1};e.r=normalize(cross(e.f,[0,1,0]));e.duration=id==='ufos'?11:crossing?11:4+e.cruise+8;this.active.set(e.key,e);this.history.push({key:e.key,id,clock,type:'enter'});if(this.history.length>80)this.history.shift();
 }
 instances(players,clock,views,enabled,density,settings={}){
  if(this.lastClock!==null&&clock<this.lastClock)this.reset(clock);const dt=this.lastClock===null?0:clamp(clock-this.lastClock,0,.1);this.lastClock=clock;
  if(density==='off'){this.active.clear();return[]}const w=this.world,out=[];
  if(clock>=this.nextAt&&this.active.size<2){this.spawn(players,clock,enabled,settings);this.nextAt=clock+(density==='sparse'?28:density==='rich'?13:18)}
  for(const [key,e]of this.active){const age=clock-e.born;if(age>=e.duration||!enabled[e.id]){this.active.delete(key);continue}const p=players[e.lane];let at,flightPhase;
   if(e.id==='ufos'){at=t=>ufoPath(e.origin,e.f,e.r,t);flightPhase=age<4?'approaching':age<7?'hovering':'departing'}
   else if(e.crossing){at=t=>add(add(e.origin,scale(e.f,48+t*1.3)),add(scale(e.r,e.side*(-48+t*9)),[0,8+Math.sin(t*.35)*2,0]));flightPhase='crossing'}
   else {flightPhase=age<4?'approaching':age<4+e.cruise?'cruising':'departing';const target=flightPhase==='approaching'?Math.max(22,p.speed/3.6+13):flightPhase==='cruising'?Math.max(8,p.speed/3.6+clamp((p.distance+4-e.d)*.7,-7,7)):Math.max(38,p.speed/3.6+20);e.speed+=(target-e.speed)*(1-Math.exp(-dt*2));e.d+=e.speed*dt;const depart=Math.max(0,age-4-e.cruise),side=e.side*(5.3+Math.max(0,depart)*.65),height=5.2+Math.sin(age*.75+e.phase)*.35+depart*.85;at=t=>routePoint(w,e.lane,e.d+(t-age)*e.speed,side+(t-age)*e.side*.15,height);}
   const point=at(age),forward=directionalVelocity(at,age);point[1]=Math.max(point[1],w.surfaceY(point[0],point[2])+3.8);const last=e.point||point,velocity=dt>.0001?scale(sub(point,last),1/dt):scale(forward,e.speed);e.point=point;
   const alpha=age>e.duration-1?ease(e.duration-age):1;out.push({id:e.id,key,point,forward:Math.hypot(...velocity)>.03?normalize(velocity):forward,velocity,size:sizes[e.id],radius:(e.id==='ufos'?4:3)*sizes[e.id],alpha,phase:e.phase,motion:0,rotation:0,variant:0,bank:e.id==='ufos'?Math.sin(age*1.4)*.09:e.crossing?e.side*.12:Math.sin(age*.6)*.035,flightPhase,age,escort:true,ownerLane:null,count:e.id==='birds'?1+hash32(key)%3:1,nightOnly:e.id==='unicorns'});
  }
  const slots=new Set();for(const p of players){const x=w.sample(p.lane,p.renderDistance??p.distance).point[0];for(let s=Math.max(1,Math.floor((x-90)/70));s<=Math.ceil((x+150)/70)&&s*70<WORLD_END;s++)slots.add(s)}
  const pool=LOCAL_TYPES.filter(id=>enabled[id]);if(pool.length)for(const slot of slots){const r=random(w.seed+':local-flight:'+slot),id=pool[(slot+hash32(w.seed+':local-order'))%pool.length],x=slot*70,side=r()>.5?1:-1,lane=side<0?0:2,track=w.pointAtX(lane,x),z=track[2]+side*(8+r()*5),phase=r()*6.28,base=[x,track[1]+(id==='butterflies'?2:id==='jellyfish'?8:id==='cloudsheep'?6.5:11),z];let alpha=1,anchor=null;
   if(id==='cloudsheep'){let floor=this.sheepFloors.get(slot);if(floor===undefined){floor=base[1];for(let j=0;j<=12;j++){const p=add(base,scale(SHEEP_HOP.direction,(j/12-.5)*SHEEP_HOP.stride*SHEEP_HOP.hops));floor=Math.max(floor,w.surfaceY(p[0],p[2])+4.5)}this.sheepFloors.set(slot,floor);if(this.sheepFloors.size>64)this.sheepFloors.delete(this.sheepFloors.keys().next().value)}base[1]=floor}
   const hop=id==='cloudsheep'?sheepHop(clock,phase):null;
   const at=t=>{if(id==='cloudsheep')return sheepPoint(base,t,phase);if(id==='jellyfish')return add(base,[Math.sin(t*.16+phase)*.45,Math.sin(t*.7+phase)*.65,Math.sin(t*.12+phase)*.7]);if(id==='balloons')return add(base,[Math.sin(t*.035+phase)*3,Math.sin(t*.14+phase)*1.3,Math.sin(t*.04+phase)*3]);if(id==='kites')return add(base,[Math.sin(t*.6+phase)*1.3,Math.sin(t*.85+phase)*.6,Math.sin(t*.35+phase)*1.2]);if(id==='butterflies')return add(base,[Math.sin(t*.8+phase)*1.6,Math.sin(t*1.4+phase)*.65,Math.sin(t*.61+phase)*1.4]);if(id==='robots'){const q=((t+phase*3)%32+32)%32;return add(base,[q<8?Math.sin(q)*.15:q<20?(q-8)*1.8:(32-q)*1.8, -7+Math.sin(t*2)*.15,0])}if(id==='paperplanes'){const q=((t+phase*4)%26+26)%26;return add(base,[-8+q*.9,4-q*.23+Math.sin(q*.8)*.25,-side*(q*.48-4)])}if(id==='whales')return add(base,[Math.sin(t*.035+phase)*12,Math.sin(t*.18+phase)*1.2,Math.sin(t*.04+phase)*4]);return add(base,[Math.sin(t*.06+phase)*3,Math.sin(t*.55+phase)*.5,Math.sin(t*.045+phase)*3])};
   const point=at(clock);point[1]=Math.max(point[1],w.surfaceY(point[0],point[2])+(id==='butterflies'?1.3:id==='whales'?6.5:4));const nearest=Math.min(...players.map(p=>Math.abs(w.sample(p.lane,p.distance).point[0]-point[0])));if(nearest>150)continue;alpha*=1-ease((nearest-120)/30);if(id==='paperplanes'){const q=((clock+phase*4)%26+26)%26;alpha*=ease(q/1.2)*ease((26-q)/1.5)}if(hop)alpha*=hop.alpha;if(id==='robots')anchor=[base[0],w.footingY(base[0],z,.3),z];if(id==='kites')anchor=[base[0]-2,w.footingY(base[0]-2,z,.3),z];out.push({id,key:'local:'+slot,point,forward:directionalVelocity(at,clock),size:sizes[id],radius:id==='whales'?10:4,alpha,phase,hopPhase:hop?.phase,bank:hop?Math.sin(hop.phase*Math.PI*2)*.07:id==='paperplanes'?Math.sin(clock*.8+phase)*.13:Math.sin(clock*.6+phase)*.035,motion:0,rotation:0,variant:0,anchor,worldAnchored:true,count:id==='butterflies'?1+slot%3:1,nearest});}
  if(enabled.airships&&this.airshipPresent){const x=150+clock*.06,base=w.pointAtX(1,150),point=[x,base[1]+25,base[2]-4+clock*.22];out.push({id:'airships',key:'shared-airship',point,forward:normalize([.06,0,.22]),size:3.5,radius:16,alpha:1,phase:0,motion:0,rotation:0,variant:0,worldAnchored:true,extended:true})}
  if(enabled.islands)out.push(distantCastle());
  return out;
 }
}
