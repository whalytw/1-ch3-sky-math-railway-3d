import assert from 'node:assert/strict';
import {Race,RULES,defaultSettings} from '../src/race.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const create=()=>{const r=new Race(defaultSettings(),'race-test');assert.ok(r.start());r.step(3);assert.equal(r.status,'racing');r.drainEvents();return r};
{
 const r=create();near(r.elapsed,0);r.step(2.5);for(const p of r.players){near(p.speed,30);near(p.distance,10.4166666667)}
 r.step(2.5);for(const p of r.players)near(p.speed,60);r.step(2.99);assert.equal(r.players[0].question,null);r.step(.01);assert.ok(r.players.every(p=>p.phase==='question'));near(r.elapsed,8);near(r.players[0].remaining,45);
 const p=r.players[0];r.submit(0,p.question.correct);near(p.boost,45);near(p.wait,5);r.step(4.99);assert.equal(p.phase,'feedback');r.step(.01);assert.equal(p.phase,'question');assert.equal(p.questionNumber,2);
 r.step(5);near(p.speed,80);near(p.boost,35);assert.equal(r.players[1].speed,60);r.submit(0,p.question.correct);near(p.boost,75);
 // A bonus ending during acceleration changes the target immediately, without a speed jump.
 p.boost=1;p.speed=68;r.step(1);near(p.speed,70);near(p.boost,0);r.step(2);near(p.speed,66);r.step(10);near(p.speed,60);
}
{
 const r=create();r.step(8);const p=r.players[0];p.remaining=6;assert.equal(r.hint(0),true);near(p.remaining,0);assert.equal(p.phase,'feedback');assert.equal(p.notice,'timeout');assert.equal(r.hint(0),false);near(p.wait,5);assert.equal(r.players[1].remaining,45);
 r.step(5);assert.equal(p.phase,'question');near(p.remaining,45);assert.equal(p.hintUsed,false);r.hint(0);near(p.remaining,35);assert.equal(r.hint(0),false);near(p.remaining,35);
 r.submit(0,'obviously wrong');assert.equal(p.results.at(-1).correct,false);near(p.boost,0);r.step(4.999);assert.equal(p.phase,'feedback');r.step(.001);assert.equal(p.phase,'question');
}
{
 const r=create();r.step(10);for(const p of r.players){p.distance=200;p.speed=60}r.players[0].distance=210;r.step(.01);r.drainEvents();r.players[1].speed=80;r.players[1].boost=30;r.step(2);const e=r.drainEvents().filter(e=>e.type==='overtake');assert.equal(e.length,1);assert.equal(e[0].lane,1);assert.ok(r.players[1].jump>0);assert.ok(r.players[0].exclaim>0);r.step(2.01);near(r.players[0].exclaim,0);near(r.players[1].jump,0);
 for(const p of r.players)p.distance=2499.99;r.step(.02);assert.ok(r.players.every(p=>p.midpointPassed&&p.wave>0));r.drainEvents();r.step(.1);assert.equal(r.drainEvents().filter(e=>e.type==='midpoint').length,0);
}
{
 const r=create();r.step(303);assert.equal(r.status,'complete');for(const p of r.players){near(p.finishTime,302.5,1e-5);near(p.distance,5000);near(p.speed,0);assert.equal(p.phase,'finished')}
}
{
 const r=create();r.step(8);for(const p of r.players){p.distance=4999;p.speed=80;p.boost=30}r.players[0].distance=4999.5;r.players[1].distance=4999.7;r.step(.1);assert.deepEqual(r.order,[1,0,2]);assert.ok(r.players[1].finishTime<r.players[0].finishTime);
}
{
 // A whole race with rapid independent answers; no negative timers, premature next questions or cross-lane reply writes.
 const r=create();for(let j=0;j<18000&&r.status!=='complete';j++){for(const p of r.players)if(p.phase==='question'&&p.remaining<43-p.lane*.5)r.submit(p.lane,p.lane===2?'wrong':p.question.correct);r.step(1/30);for(const p of r.players){assert.ok(p.boost>=0&&p.speed>=0&&p.speed<=80+1e-7);assert.ok(p.remaining>=0);assert.ok(p.distance<=5000)}}assert.equal(r.status,'complete');assert.ok(r.players[0].finishTime<r.players[2].finishTime);assert.ok(r.players[2].results.every(x=>!x.correct));
}
console.log('PASS race: countdown, 0→60, 60→80, accumulated boost, deceleration, first question at 8 s, 5 s cooldown, hint timeout, lead changes, exact finish times, full three-player race');
