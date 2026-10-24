import {ISLANDS,BASE_STARS,BASE_TIMES,clamp,generateQuestion,isCorrect,random} from './math.js?v=1.0.0';
import {ROUTE_METRES} from './world.js?v=1.0.0';
export const RULES=Object.freeze({distance:ROUTE_METRES,countdown:3,firstQuestion:8,cooldown:5,baseSpeed:60,maxSpeed:80,startAcceleration:12,boostAcceleration:2,deceleration:2,hintCost:10});
export const defaultSettings=()=>({enabled:ISLANDS.map((_,i)=>i<4),stars:[...BASE_STARS],timeMode:'fixed',seconds:45,quality:'auto',sound:true});
export function normalizeSettings(raw={}){const d=defaultSettings();return {...d,enabled:d.enabled.map((v,i)=>typeof raw.enabled?.[i]==='boolean'?raw.enabled[i]:v),stars:d.stars.map((v,i)=>clamp(Math.round(Number(raw.stars?.[i])||v),1,5)),seconds:clamp(Number(raw.seconds)||45,10,180),timeMode:raw.timeMode==='topic'?'topic':'fixed',quality:['auto','low','medium','high'].includes(raw.quality)?raw.quality:'auto',sound:raw.sound!==false}}
const newPlayer=(lane,seat)=>({lane,seat,distance:0,speed:0,boost:0,phase:'travel',remaining:0,wait:8,question:null,reply:null,activeField:0,hintUsed:false,questionNumber:0,results:[],finishTime:null,wave:0,jump:0,exclaim:0,midpointPassed:false,bonusAwarded:0,notice:''});
export class Race{
 constructor(settings,seed,seats=['01','02','03']){this.settings=normalizeSettings(settings);this.seed=String(seed);this.players=seats.map((s,i)=>newPlayer(i,s));this.status='lobby';this.countdown=3;this.elapsed=0;this.events=[];this.leader=null;this.topics=this.settings.enabled.flatMap((yes,i)=>yes?[i]:[]);this.questionSchedule=[...this.topics];this.order=[];this.countBeat=3}
 emit(type,data={}){this.events.push({type,...data})}
 drainEvents(){const e=this.events;this.events=[];return e}
 start(){if(!this.topics.length)return false;this.status='countdown';this.emit('count',{value:3});return true}
 step(dt){if(!Number.isFinite(dt)||dt<=0)return;let remain=dt;while(remain>1e-9){const h=Math.min(remain,1/60);this.substep(h);remain-=h}}
 substep(dt){
  if(this.status==='countdown'){
   const part=Math.min(dt,this.countdown);this.countdown=Math.max(0,this.countdown-part);
   const beat=Math.ceil(this.countdown-1e-8);if(beat>0&&beat!==this.countBeat){this.countBeat=beat;this.emit('count',{value:beat})}
   if(this.countdown<=1e-8){this.countdown=0;this.status='racing';this.emit('go');if(dt-part>1e-9)this.substep(dt-part)}return;
  }
  if(this.status!=='racing')return;
  // Split at clocks and speed boundaries. Timed bonuses are never rounded down.
  let h=dt;for(const p of this.players){if(p.finishTime!==null)continue;
   if(p.phase==='question'&&p.remaining>1e-8)h=Math.min(h,p.remaining);
   if((p.phase==='travel'||p.phase==='feedback')&&p.wait>1e-8)h=Math.min(h,p.wait);
   if(p.boost>1e-8)h=Math.min(h,p.boost);
   const target=this.elapsed<5-1e-8?60:p.boost>1e-8?80:60,rate=this.elapsed<5-1e-8?12:2;
   if(Math.abs(p.speed-target)>1e-8)h=Math.min(h,Math.abs(p.speed-target)/rate);
  }
  if(this.elapsed<5-1e-8)h=Math.min(h,5-this.elapsed);
  const finishers=[];
  for(const p of this.players){
   p.wave=Math.max(0,p.wave-h);p.jump=Math.max(0,p.jump-h);p.exclaim=Math.max(0,p.exclaim-h);
   if(p.finishTime!==null)continue;
   const target=this.elapsed<5-1e-8?60:p.boost>1e-8?80:60,rate=this.elapsed<5-1e-8?12:2;
   const v0=p.speed,acc=Math.sign(target-v0)*rate,v1=clamp(v0+acc*h,Math.min(v0,target),Math.max(v0,target));
   const advance=(v0+v1)/2/3.6*h,old=p.distance;
   p.distance=Math.min(RULES.distance,old+advance);p.speed=v1;p.boost=Math.max(0,p.boost-h);
   if(!p.midpointPassed&&p.distance>=2500){p.midpointPassed=true;p.wave=2.2;this.emit('midpoint',{lane:p.lane})}
   if(p.distance>=RULES.distance-1e-8){
    const left=RULES.distance-old;
    const a=(v1-v0)/h/3.6,v=v0/3.6;
    const within=Math.abs(a)<1e-10?left/Math.max(v,1e-10):2*left/(v+Math.sqrt(Math.max(0,v*v+2*a*left)));
    p.finishTime=this.elapsed+clamp(within,0,h);p.distance=RULES.distance;p.speed=0;p.boost=0;p.phase='finished';
    finishers.push(p);continue;
   }
   if(p.phase==='question'){p.remaining=Math.max(0,p.remaining-h);if(p.remaining<1e-8){p.remaining=0;this.settle(p,false,'timeout')}}
   else if(p.phase==='feedback'||p.phase==='travel'){p.wait=Math.max(0,p.wait-h);if(p.wait<1e-8)this.nextQuestion(p)}
  }
  this.elapsed+=h;
  // Compare distance, never screen x or route parameter. The launch tie is not an overtake.
  const max=Math.max(...this.players.map(p=>p.distance)),leaders=this.players.filter(p=>max-p.distance<1e-7);
  if(leaders.length===1){const candidate=leaders[0];if(this.leader!==null&&candidate.lane!==this.leader){const previous=this.players[this.leader];if(previous.finishTime===null&&candidate.finishTime===null){candidate.jump=1.15;previous.exclaim=2;this.emit('overtake',{lane:candidate.lane,previous:previous.lane})}}this.leader=candidate.lane}
  finishers.sort((a,b)=>a.finishTime-b.finishTime||a.lane-b.lane);for(const p of finishers){this.order.push(p.lane);this.emit('finish',{lane:p.lane})}
  if(this.players.every(p=>p.finishTime!==null)){this.status='complete';this.emit('complete')}
  if(dt-h>1e-8)this.substep(dt-h);
 }
 nextQuestion(p){const index=p.questionNumber,topic=this.questionSchedule[index%this.topics.length],shared=`${this.seed}:question:${index}`;
  p.question=generateQuestion(topic,this.settings.stars[topic],`${shared}:lane:${p.lane}`,shared);
  p.reply=structuredClone(p.question.initial);p.activeField=0;p.hintUsed=false;p.questionNumber++;p.bonusAwarded=0;
  p.phase='question';p.remaining=this.settings.timeMode==='topic'?BASE_TIMES[topic]:this.settings.seconds;p.wait=0;
  this.emit('question',{lane:p.lane});
 }
 submit(lane,reply){const p=this.players[lane];if(this.status!=='racing'||p.phase!=='question')return false;p.reply=reply;return this.settle(p,isCorrect(p.question,reply),'answer')}
 settle(p,correct,reason){if(p.phase!=='question')return false;
  const bonus=correct?p.remaining:0;p.boost+=bonus;p.bonusAwarded=bonus;
  p.results.push({number:p.questionNumber,island:p.question.island,stars:p.question.stars,correct,reason,hint:p.hintUsed,bonus,remaining:p.remaining,reply:structuredClone(p.reply),question:p.question});
  p.phase='feedback';p.wait=RULES.cooldown;p.notice=reason;this.emit(correct?'correct':'wrong',{lane:p.lane,bonus});return true;
 }
 hint(lane){const p=this.players[lane];if(this.status!=='racing'||p.phase!=='question'||p.hintUsed)return false;
  p.hintUsed=true;p.remaining=Math.max(0,p.remaining-RULES.hintCost);this.emit('hint',{lane});if(p.remaining<=1e-8){p.remaining=0;this.settle(p,false,'timeout')}return true;
 }
}
