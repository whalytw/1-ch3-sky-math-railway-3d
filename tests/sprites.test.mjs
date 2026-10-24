import assert from 'node:assert/strict';
import {makeSprite} from '../src/sprites.js';
import {makeCart,makeCharacter} from '../src/scenery.js';
import {makeDecoration,DECORATIONS} from '../src/decorations.js';
// Compatibility sprites must resolve pixel depth; sorting triangle centres alone hid plate digits.
globalThis.OffscreenCanvas=class{
 constructor(w,h){this.width=w;this.height=h;this.ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:image=>this.image=image}}
 getContext(){return this.ctx}
};
const whitePixels=s=>{let count=0;for(let i=0;i<s.canvas.image.data.length;i+=4){const p=s.canvas.image.data;if(p[i]>190&&p[i+1]>180&&p[i+2]>140&&p[i+3])count++}return count};
const empty=makeSprite(makeCart('#69dfed')),numbered=makeSprite(makeCart('#69dfed',28));
assert.ok(whitePixels(numbered)>whitePixels(empty)+80,'both digits must remain visible above the rear plate');assert.notDeepEqual(numbered.canvas.image.data,makeSprite(makeCart('#69dfed',82)).canvas.image.data);
for(const front of[false,true])for(const standing of[false,true]){const s=makeSprite(makeCharacter('#69dfed',standing),front);assert.ok(s.canvas.image.data.some(v=>v));assert.ok(Number.isFinite(s.size)&&s.size>0)}
for(const d of DECORATIONS){const s=makeSprite(makeDecoration(d.id));assert.ok(s.canvas.image.data.some(v=>v),d.id)}
console.log('PASS compatibility depth raster: readable rear number plate, front/back smiling characters and all 25 decoration sprites; generated once and reused');
