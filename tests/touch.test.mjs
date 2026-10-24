import assert from 'node:assert/strict';
import {bindPress} from '../src/touch.js';
class Target{constructor(){this.listeners={}}addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}emit(type,event){event.preventDefault??=()=>{};for(const fn of this.listeners[type]||[])fn(event)}setPointerCapture(){}}
class Button{constructor(lane){this.dataset={action:'key'};this.disabled=false;this.lane=lane;this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c)}}closest(s){return s==='[data-lane]'?{dataset:{lane:String(this.lane)}}:this}}
globalThis.window=new Target();window.PointerEvent=class{};globalThis.document=new Target();document.hidden=false;
const root=new Target(),a=new Button(0),b=new Button(1),c=new Button(2),received=[[],[],[]],data=[];
const input=bindPress(root,(button)=>received[button.lane].push(button.dataset.action),s=>data.push(s));
for(const [id,target]of[[11,a],[12,b],[13,c]])root.emit('pointerdown',{pointerId:id,target,button:0,isPrimary:id===11});assert.deepEqual(received.map(x=>x.length),[1,1,1]);assert.equal(input.max,3);assert.equal(input.active.size,3);
root.emit('pointerdown',{pointerId:11,target:a,button:0});assert.equal(received[0].length,1); // holding does not repeat
for(const [id,target]of[[11,a],[12,b],[13,c]]){root.emit('pointerup',{pointerId:id,target});root.emit('click',{target,detail:1,pointerType:'touch'})}assert.deepEqual(received.map(x=>x.length),[1,1,1]);assert.equal(input.active.size,0);
for(let j=0;j<30;j++)for(const [id,target]of[[31,a],[32,b],[33,c]]){root.emit('pointerdown',{pointerId:id,target,button:0,isPrimary:false});root.emit('pointerup',{pointerId:id,target})}assert.deepEqual(received.map(x=>x.length),[31,31,31]);
root.emit('click',{target:a,detail:0});assert.equal(received[0].length,32); // keyboard / assistive tech
root.emit('pointerdown',{pointerId:71,target:b,button:0});root.emit('pointercancel',{pointerId:71,target:b});root.emit('pointerdown',{pointerId:71,target:b,button:0});assert.equal(received[1].length,33);
window.emit('blur',{});assert.equal(input.active.size,0);assert.equal(b.classes.size,0);
a.dataset.nativeClick='true';root.emit('pointerdown',{pointerId:88,target:a,button:0});assert.equal(received[0].length,32);root.emit('click',{target:a,detail:1,pointerType:'touch'});assert.equal(received[0].length,33);
console.log('PASS touch: three overlapping IDs, non-primary pointers, 90 interleaved rapid presses, hold, click deduplication, assistive click, cancellation, blur cleanup, native fullscreen/start clicks');
// Legacy Touch Events fallback: simultaneous changedTouches stay independent.
window.PointerEvent=undefined;document.elementFromPoint=x=>[a,b,c][x];delete a.dataset.nativeClick;
const oldRoot=new Target(),oldCounts=[0,0,0];const old=bindPress(oldRoot,b=>oldCounts[b.lane]++);
oldRoot.emit('touchstart',{changedTouches:[{identifier:1,clientX:0},{identifier:2,clientX:1},{identifier:3,clientX:2}]});assert.equal(old.active.size,3);assert.deepEqual(oldCounts,[1,1,1]);
window.emit('touchcancel',{changedTouches:[{identifier:1},{identifier:2},{identifier:3}]});assert.equal(old.active.size,0);
oldRoot.emit('click',{target:c,detail:1,pointerType:'touch'});assert.deepEqual(oldCounts,[1,1,1]);
console.log('PASS legacy touch fallback and simultaneous cancellation');
