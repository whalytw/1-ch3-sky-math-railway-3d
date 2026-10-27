import assert from 'node:assert/strict';
import {SharedWorld} from '../src/world.js';
import {buildShadowGeometry,receiverY,shadowCenter} from '../src/shadows.js';
import {nightAt,skyEvents} from '../src/lighting.js';
import {defaultSettings,normalizeSettings} from '../src/race.js';
const w=new SharedWorld('shadows-v16'),players=[0,1,2].map(lane=>({lane,distance:700}));
for(let lane=0;lane<3;lane++)for(let d=50;d<4900;d+=31){const p=w.sample(lane,d).point,y=receiverY(w,p[0],p[2]);assert.ok(Number.isFinite(y));assert.ok(y<p[1]&&y>p[1]-.21,'shadow receiver stays on the bed/deck, not on the valley floor');}
const p=w.sample(1,700).point,a=shadowCenter(w,[p[0],p[1]+4,p[2]+8]),b=shadowCenter(w,[p[0],p[1]+12,p[2]+8]);assert.ok(b.height>a.height);assert.ok(b.point[0]>a.point[0]);
const data=buildShadowGeometry(w,players,[{id:'unicorns',point:[p[0]+3,p[1]+8,p[2]+6],size:1,alpha:1,forward:[1,0,0]}],2);assert.ok(data.shadow.length>0&&data.glow.length>0);assert.ok(data.shadow.every(Number.isFinite));assert.equal(buildShadowGeometry(w,players,[],2,'off').shadow.length,0);
const bird={id:'birds',point:[p[0],p[1]+6,p[2]+6],size:1,alpha:1,forward:[1,0,0]},solo=buildShadowGeometry(w,players,[{...bird,count:1}],2),flock=buildShadowGeometry(w,players,[{...bird,count:3}],2);assert.ok(flock.shadow.length>solo.shadow.length,'each bird casts a separate shadow');
for(const mode of ['off','standard','fine'])assert.equal(normalizeSettings(JSON.parse(JSON.stringify({...defaultSettings(),shadows:mode}))).shadows,mode,'teacher selection must survive normalization and persistence');
assert.equal(defaultSettings().shadows,'standard');assert.equal(normalizeSettings({shadows:'garbage'}).shadows,'standard');assert.equal(nightAt(w,0,{backgroundStyle:'aurora'}),1);assert.equal(nightAt(w,0,{backgroundStyle:'alpine'}),0);
let meteors=0;for(let t=0;t<160;t+=.25){const es=skyEvents(w,t,{meteors:true,satellites:true});assert.ok(es.every(e=>e.distant&&e.nightOnly&&e.alpha>=0&&e.alpha<=1));meteors+=es.filter(e=>e.id==='meteors').length;}assert.ok(meteors>0);
console.log('PASS V1.6: terrain/deck receivers, height-dependent offset, night glow, shadow settings, distant meteors and slow satellites');
