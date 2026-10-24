import {ISLANDS,BASE_STARS,BASE_TIMES,clamp,generateQuestion,isCorrect} from './math.js?v=1.3.0';
import {ROUTE_METRES} from './world.js?v=1.3.0';
import {defaultDecorations,normalizeDecorations,DENSITY_BUDGET} from './decorations.js?v=1.3.0';
import {BACKGROUNDS} from './background.js?v=1.3.0';
export const RULES=Object.freeze({distance:ROUTE_METRES,countdown:3,firstQuestion:8,cooldown:5,baseSpeed:60,maxSpeed:100,tierCaps:[60,75,90,100],startAcceleration:12,boostRamp:1.5,deceleration:5,hintCost:10,finishCoast:15,finishOrbit:2});
export const defaultSettings=()=>({enabled:ISLANDS.map((_,i)=>i<4),stars:[...BASE_STARS],timeMode:'fixed',seconds:45,quality:'auto',sound:true,seatMax:30,scoreFormat:'seconds',decorationDensity:'medium',decorations:defaultDecorations(),background:true,backgroundStyle:'auto'});
export function normalizeSettings(raw={}){raw=raw&&typeof raw==='object'?raw:{};const d=defaultSettings();return {...d,enabled:d.enabled.map((v,i)=>typeof raw.enabled?.[i]==='boolean'?raw.enabled[i]:v),stars:d.stars.map((v,i)=>clamp(Math.round(Number(raw.stars?.[i])||v),1,5)),seconds:clamp(Number(raw.seconds)||45,10,180),timeMode:raw.timeMode==='topic'?'topic':'fixed',quality:['auto','low','medium','high'].includes(raw.quality)?raw.quality:'auto',sound:raw.sound!==false,seatMax:clamp(Math.round(Number(raw.seatMax)||30),3,99),scoreFormat:raw.scoreFormat==='clock'?'clock':'seconds',decorationDensity:Object.hasOwn(DENSITY_BUDGET,raw.decorationDensity)?raw.decorationDensity:'medium',decorations:normalizeDecorations(raw.decorations),background:raw.background!==false,backgroundStyle:BACKGROUNDS.some(b=>b.id===raw.backgroundStyle)?raw.backgroundStyle:'auto'}}
export function formatRaceTime(t,mode='seconds'){t=Math.max(0,Number(t)||0);const tenth=Math.floor((t+1e-8)*10);return mode==='clock'?`${Math.floor(tenth/600).toString().padStart(2,'0')}:${Math.floor(tenth/10)%60<10?'0':''}${Math.floor(tenth/10)%60}.${tenth%10}`:`${Math.floor(tenth/10)}.${tenth%10} 秒`}
const newPlayer=(lane,seat)=>({lane,seat,distance:0,renderDistance:0,speed:0,boost:0,boostSegments:[],boostHistory:[],boostLevel:0,boostRampRate:0,engineAge:0,engineRetireAge:1,engineRetireFrom:0,jetScale:0,phase:'travel',remaining:0,wait:8,question:null,reply:null,activeField:0,hintUsed:false,questionNumber:0,results:[],finishTime:null,finishSpeed:0,coastElapsed:0,coastDistance:0,reviewOpen:false,wave:0,jump:0,exclaim:0,midpointPassed:false,bonusAwarded:0,notice:''});
const EPS=1e-8;
export function engineBounce(age){const knots=[[0,0],[.16,1.1],[.28,.9],[.4,1.05],[.53,1]];if(age>=.53)return 1;for(let i=1;i<knots.length;i++)if(age<=knots[i][0]){const [a,x]=knots[i-1],[b,y]=knots[i],t=clamp((age-a)/(b-a),0,1);return x+(y-x)*(t*t*(3-2*t))}return 0}
export class Race{
 constructor(settings,seed,seats=['01','02','03']){this.settings=normalizeSettings(settings);this.seed=String(seed);this.players=seats.map((s,i)=>newPlayer(i,s));this.status='lobby';this.countdown=3;this.elapsed=0;this.events=[];this.leader=null;this.topics=this.settings.enabled.flatMap((yes,i)=>yes?[i]:[]);this.order=[];this.countBeat=3}
 emit(type,data={}){this.events.push({type,...data})}
 drainEvents(){const e=this.events;this.events=[];return e}
 start(){if(!this.topics.length)return false;this.status='countdown';this.emit('count',{value:3});return true}
 step(dt){if(!Number.isFinite(dt)||dt<=0)return;let left=dt;while(left>EPS){const h=Math.min(left,1/120);this.substep(h);left-=h}}
 refreshBoost(p,time=this.elapsed){
  p.boostSegments=p.boostSegments.filter(s=>s.end>time+EPS);const old=p.boostLevel,level=Math.min(3,p.boostSegments.length);
  p.boost=Math.max(0,(p.boostSegments.at(-1)?.end??time)-time);p.boostLevel=level;
  if(old!==level){
   const cap=RULES.tierCaps[level];p.boostRampRate=level>old?Math.max(0,(cap-p.speed)/RULES.boostRamp):p.boostRampRate;
   if(!old&&level){p.engineAge=0;p.engineRetireAge=0;this.emit('jet-on',{lane:p.lane,level})}
   if(old&&!level){p.engineRetireFrom=p.jetScale;p.engineRetireAge=0;this.emit('jet-off',{lane:p.lane})}
   this.emit('level',{lane:p.lane,level});
  }
 }
 awardBoost(p,seconds){if(!(seconds>EPS)||p.finishTime!==null)return;
  const start=Math.max(this.elapsed,p.boostSegments.at(-1)?.end??this.elapsed),segment={start,end:start+seconds,earnedAt:this.elapsed,seconds};
  p.boostSegments.push(segment);p.boostHistory.push({...segment});this.refreshBoost(p);
 }
 motion(p){if(this.elapsed<5-EPS)return {target:60,acc:12};const target=RULES.tierCaps[p.boostLevel];return {target,acc:p.speed>target?-5:p.speed<target?Math.max(p.boostRampRate,EPS):0}}
 animate(p,h){p.wave=Math.max(0,p.wave-h);p.jump=Math.max(0,p.jump-h);p.exclaim=Math.max(0,p.exclaim-h);
  if(p.boostLevel&&p.finishTime===null){p.engineAge+=h;p.jetScale=engineBounce(p.engineAge)}else{p.engineRetireAge+=h;p.jetScale=p.engineRetireFrom*Math.max(0,1-p.engineRetireAge/.28)**2}
 }
 coast(p,h){const previous=p.coastElapsed;p.coastElapsed=Math.min(15,previous+h);const a=previous,b=p.coastElapsed;p.coastDistance+=p.finishSpeed/3.6*((b-a)-(b*b-a*a)/30);p.renderDistance=5000+p.coastDistance;p.speed=p.finishSpeed*Math.max(0,1-b/15);if(b>=15-EPS){p.speed=0;p.phase='finished'}}
 crossFinish(p,within,dt,v0,acc){
  p.finishTime=this.elapsed+within;p.finishSpeed=v0+acc*within;p.distance=5000;p.renderDistance=5000;p.phase='coasting';p.coastElapsed=0;p.coastDistance=0;
  p.engineRetireFrom=p.jetScale;p.engineRetireAge=0;p.boostSegments=[];p.boost=0;p.boostLevel=0;p.jump=0;p.wave=0;this.coast(p,Math.max(0,dt-within));
 }
 substep(dt){
  if(this.status==='countdown'){const h=Math.min(dt,this.countdown);this.countdown=Math.max(0,this.countdown-h);const beat=Math.ceil(this.countdown-EPS);if(beat>0&&beat!==this.countBeat){this.countBeat=beat;this.emit('count',{value:beat})}if(this.countdown<=EPS){this.countdown=0;this.status='racing';this.emit('go');if(dt-h>EPS)this.substep(dt-h)}return}
  if(!['racing','coasting'].includes(this.status))return;
  for(const p of this.players)if(p.finishTime===null)this.refreshBoost(p);
  let h=dt;if(this.elapsed<5-EPS)h=Math.min(h,5-this.elapsed);
  for(const p of this.players){if(p.finishTime!==null){if(p.phase==='coasting')h=Math.min(h,15-p.coastElapsed);continue}
   if(p.phase==='question'&&p.remaining>EPS)h=Math.min(h,p.remaining);
   if(['travel','feedback'].includes(p.phase)&&p.wait>EPS)h=Math.min(h,p.wait);
   const end=p.boostSegments[0]?.end;if(end>this.elapsed+EPS)h=Math.min(h,end-this.elapsed);
   const {target,acc}=this.motion(p);if(Math.abs(p.speed-target)>EPS&&Math.abs(acc)>EPS)h=Math.min(h,Math.abs((target-p.speed)/acc));
  }
  if(h<EPS)h=dt;
  const finishers=[];
  for(const p of this.players){this.animate(p,h);if(p.finishTime!==null){if(p.phase==='coasting')this.coast(p,h);continue}
   const {target,acc}=this.motion(p),v0=p.speed,v1=acc>=0?Math.min(target,v0+acc*h):Math.max(target,v0+acc*h),actualAcc=(v1-v0)/h,advance=(v0+v1)/2/3.6*h,old=p.distance;
   if(old+advance>=5000-EPS){const left=5000-old,v=v0/3.6,a=actualAcc/3.6,within=Math.abs(a)<1e-10?left/Math.max(v,1e-10):2*left/(v+Math.sqrt(Math.max(0,v*v+2*a*left)));this.crossFinish(p,clamp(within,0,h),h,v0,actualAcc);finishers.push(p);continue}
   p.distance+=advance;p.renderDistance=p.distance;p.speed=v1;
   if(!p.midpointPassed&&p.distance>=2500){p.midpointPassed=true;p.wave=2.2;this.emit('midpoint',{lane:p.lane})}
   if(p.phase==='question'){p.remaining=Math.max(0,p.remaining-h);if(p.remaining<EPS){p.remaining=0;this.settle(p,false,'timeout')}}
   else if(['feedback','travel'].includes(p.phase)){p.wait=Math.max(0,p.wait-h);if(p.wait<EPS)this.nextQuestion(p)}
  }
  this.elapsed+=h;for(const p of this.players)if(p.finishTime===null)this.refreshBoost(p);
  // One celebration per actual pass, including passes from third to second.
  if(this.status==='racing')for(const a of this.players)for(const b of this.players){if(a.lane>=b.lane||a.finishTime!==null||b.finishTime!==null)continue;const key=`${a.lane}:${b.lane}`,diff=a.distance-b.distance;this.pairLeaders??={};const previous=this.pairLeaders[key];const leader=Math.abs(diff)<1e-7?previous:diff>0?a.lane:b.lane;if(previous!==undefined&&leader!==previous){const overtaker=this.players[leader],passed=this.players[previous];overtaker.jump=1.15;passed.exclaim=2;this.emit('overtake',{lane:leader,previous})}if(leader!==undefined)this.pairLeaders[key]=leader}
  finishers.sort((a,b)=>a.finishTime-b.finishTime||a.lane-b.lane);for(const p of finishers){this.order.push(p.lane);this.emit('finish',{lane:p.lane})}
  if(this.status==='racing'&&this.players.every(p=>p.finishTime!==null)){this.status='coasting';this.emit('all-finished')}
  if(this.players.every(p=>p.phase==='finished')){this.status='complete';this.emit('complete')}
  if(dt-h>EPS)this.substep(dt-h);
 }
 nextQuestion(p){const index=p.questionNumber,topic=this.topics[index%this.topics.length],shared=`${this.seed}:question:${index}`;p.question=generateQuestion(topic,this.settings.stars[topic],`${shared}:lane:${p.lane}`,shared);p.reply=structuredClone(p.question.initial);p.activeField=0;p.hintUsed=false;p.questionNumber++;p.bonusAwarded=0;p.phase='question';p.remaining=this.settings.timeMode==='topic'?BASE_TIMES[topic]:this.settings.seconds;p.wait=0;this.emit('question',{lane:p.lane})}
 submit(lane,reply){const p=this.players[lane];if(this.status!=='racing'||p.phase!=='question'||p.finishTime!==null)return false;p.reply=reply;return this.settle(p,isCorrect(p.question,reply),'answer')}
 settle(p,correct,reason){if(p.phase!=='question')return false;const bonus=correct?p.remaining:0;this.awardBoost(p,bonus);p.bonusAwarded=bonus;p.results.push({number:p.questionNumber,island:p.question.island,stars:p.question.stars,correct,reason,hint:p.hintUsed,bonus,remaining:p.remaining,reply:structuredClone(p.reply),question:p.question});p.phase='feedback';p.wait=5;p.notice=reason;this.emit(correct?'correct':'wrong',{lane:p.lane,bonus});return true}
 hint(lane){const p=this.players[lane];if(this.status!=='racing'||p.phase!=='question'||p.hintUsed)return false;p.hintUsed=true;p.remaining=Math.max(0,p.remaining-10);this.emit('hint',{lane});if(p.remaining<=EPS){p.remaining=0;this.settle(p,false,'timeout')}return true}
}
