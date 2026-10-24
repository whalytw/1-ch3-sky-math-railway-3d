import assert from 'node:assert/strict';
import {Race,defaultSettings,engineBounce} from '../src/race.js';
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} ≠ ${b}`);
const create=()=>{const r=new Race(defaultSettings(),'v1.1-test');r.start();r.step(3);assert.equal(r.status,'racing');r.drainEvents();return r};
{
 const r=create();r.step(2.5);near(r.players[0].speed,30);near(r.players[0].distance,10.4166667);r.step(2.5);near(r.players[0].speed,60);r.step(2.999);assert.equal(r.players[0].question,null);r.step(.001);assert.equal(r.players[0].phase,'question');near(r.players[0].remaining,45);
}
{
 // The user's exact 25.1 → 35.1 / 35.1 → 55.1 example.
 const r=create(),p=r.players[0];r.step(25.1);p.remaining=10;r.submit(0,p.question.correct);assert.equal(p.boostLevel,1);near(p.boostHistory[0].start,25.1);near(p.boostHistory[0].end,35.1);r.step(1.5);near(p.speed,75);r.step(3.5);p.remaining=20;r.submit(0,p.question.correct);assert.equal(p.boostLevel,2);near(p.boostHistory[1].start,35.1);near(p.boostHistory[1].end,55.1);near(p.boost,25);
 r.step(1.5);near(p.speed,90);r.step(3.5);near(r.elapsed,35.1);assert.equal(p.boostLevel,1);near(p.boost,20);near(p.speed,90);r.step(1);near(p.speed,85);r.step(2);near(p.speed,75);r.step(17);near(r.elapsed,55.1);assert.equal(p.boostLevel,0);near(p.boost,0);r.step(3);near(p.speed,60);assert.ok(p.jetScale===0);
}
{
 const r=create(),p=r.players[0];r.step(10);r.awardBoost(p,3);r.step(1);near(p.speed,70);r.awardBoost(p,4);r.awardBoost(p,5);assert.equal(p.boostLevel,3);r.step(1.5);near(p.speed,100);r.awardBoost(p,8);assert.equal(p.boostLevel,3);r.step(.5);assert.equal(p.boostLevel,3);r.step(4);assert.equal(p.boostLevel,2);r.step(5);assert.equal(p.boostLevel,1);assert.ok(p.speed>=75);
}
{
 // Re-ignite before speed has returned to 60.
 const r=create(),p=r.players[0];r.step(10);r.awardBoost(p,2);r.step(2);near(p.speed,75);r.step(1);near(p.speed,70);r.awardBoost(p,10);assert.equal(p.boostLevel,1);r.step(1.5);near(p.speed,75);assert.ok(p.jetScale>0);assert.deepEqual([0,.16,.28,.4,.53].map(engineBounce),[0,1.1,.9,1.05,1]);
}
{
 const r=create(),p=r.players[0];r.step(8);p.remaining=7;r.hint(0);near(p.remaining,0);assert.equal(p.phase,'feedback');assert.equal(p.notice,'timeout');near(p.wait,5);assert.equal(r.hint(0),false);r.step(4.999);assert.equal(p.phase,'feedback');r.step(.001);assert.equal(p.phase,'question');near(p.remaining,45);r.hint(0);near(p.remaining,35);near(r.players[1].remaining,40);r.submit(0,'wrong');assert.equal(p.results.at(-1).correct,false);
}
{
 // Official finish is fixed while the cart drives beyond GOAL, braking for exactly 15 s.
 const r=create();r.step(302.5);assert.equal(r.status,'coasting');for(const p of r.players){near(p.finishTime,302.5);near(p.distance,5000);near(p.speed,60);assert.equal(p.phase,'coasting')}
 r.step(7.5);for(const p of r.players){near(p.speed,30);near(p.renderDistance,5093.75);near(p.finishTime,302.5)}r.step(7.5);assert.equal(r.status,'complete');for(const p of r.players){near(p.speed,0);near(p.renderDistance,5125);assert.equal(p.phase,'finished')}
}
{
 const r=create();r.step(8);const p=r.players[0];p.distance=4999;p.speed=100;r.awardBoost(p,100);r.step(.05);assert.notEqual(p.finishTime,null);assert.equal(r.players[1].finishTime,null);assert.equal(p.boostLevel,0);assert.equal(p.boost,0);const finishTime=p.finishTime;p.reviewOpen=true;const otherTime=r.players[1].remaining,otherDistance=r.players[1].distance;r.step(1);assert.ok(r.players[1].distance>otherDistance);near(r.players[1].remaining,otherTime-1);assert.equal(p.finishTime,finishTime);assert.ok(p.speed<100&&p.speed>0);r.step(14);near(p.speed,0);near(p.renderDistance,5000+p.finishSpeed*15/7.2);assert.equal(r.status,'racing');
}
{
 const r=create();r.step(10);for(const p of r.players){p.distance=200;p.speed=60}r.players[0].distance=240;r.players[1].distance=210;r.players[2].distance=200;r.step(.01);r.drainEvents();r.awardBoost(r.players[2],10);r.step(4);const passes=r.drainEvents().filter(e=>e.type==='overtake');assert.ok(passes.some(e=>e.lane===2&&e.previous===1),'passing second place must celebrate');assert.ok(r.players[1].exclaim>0);assert.ok(r.players[2].jump>0);r.step(2.01);near(r.players[1].exclaim,0);
}
{
 const r=create();for(let j=0;j<13000&&r.status!=='complete';j++){for(const p of r.players)if(p.phase==='question'&&p.remaining<44-p.lane)r.submit(p.lane,p.lane===2?'wrong':p.question.correct);r.step(1/30);for(const p of r.players){assert.ok(p.speed>=0&&p.speed<=100+1e-5);assert.ok(p.boost>=0);if(p.finishTime===null&&r.elapsed>=5)assert.ok(p.speed>=60-1e-5);assert.ok(p.distance<=5000)}}assert.equal(r.status,'complete');assert.ok(r.players[0].finishTime<r.players[2].finishTime);assert.ok(r.players[2].results.every(x=>!x.correct));
}
console.log('PASS V1.1: exact queued boost example, three caps, 1.5 s ramps, 5 km/h/s decay, re-ignition, bounce sequence, 5 s question interval, hint expiry, 15 s runout, fixed finish times, per-player review independence, full race');
