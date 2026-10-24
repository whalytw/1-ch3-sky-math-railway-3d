import assert from 'node:assert/strict';
import {generateQuestion} from '../src/math.js';
import {SharedWorld,WORLD_END} from '../src/world.js';
import {DECORATIONS,DENSITY_BUDGET,DECORATION_RADII,DecorationSystem,makeDecoration,defaultDecorations,safeFromRiders,safeDecoration} from '../src/decorations.js';
import {defaultSettings,normalizeSettings,formatRaceTime} from '../src/race.js';
import {makeCart,makeCharacter} from '../src/scenery.js';
import {BACKGROUNDS,makePanorama} from '../src/background.js';
const settings=defaultSettings();assert.equal(settings.seatMax,30);assert.equal(settings.scoreFormat,'seconds');assert.equal(settings.decorationDensity,'medium');assert.equal(settings.background,true);
assert.equal(normalizeSettings({seatMax:2}).seatMax,3);assert.equal(normalizeSettings({seatMax:999}).seatMax,99);assert.equal(normalizeSettings({quality:'unknown'}).quality,'auto');assert.equal(normalizeSettings({decorationDensity:'garbage'}).decorationDensity,'medium');assert.equal(normalizeSettings(null).scoreFormat,'seconds');
const changed=normalizeSettings({...settings,seatMax:42,scoreFormat:'clock',background:false,backgroundStyle:'castle',decorationDensity:'sparse',decorations:{dragons:false,snow:false}});assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(changed))),changed);
assert.equal(formatRaceTime(98.9),'98.9 秒');assert.equal(formatRaceTime(98.9,'clock'),'01:38.9');assert.equal(formatRaceTime(359.999),'359.9 秒');assert.equal(formatRaceTime(60,'clock'),'01:00.0');
const types=new Set();let parameterQuestions=0;
for(let st=1;st<=5;st++)for(let i=0;i<180;i++){
 const q=generateQuestion(3,st,'wording-'+i,'shared-'+i);types.add(q.subtype);assert.ok(q.parameterFormula);for(const key of Object.keys(q.correct))assert.ok(q.parameterFormula.includes(key),`${key} missing from ${q.parameterFormula}`);parameterQuestions++;
 const linear=generateQuestion(2,st,'linear-'+i,'shared-'+i);assert.equal(linear.parameterFormula,'待調整軌道：y=ax+b');
}
assert.ok(types.has('width'));assert.ok(types.has('opening'));assert.ok(types.has('horizontal'));assert.ok(types.has('vertical'));assert.ok(types.has('multi-shift'));
let checked=0;const fractions=[];
for(let seed=0;seed<12;seed++){
 const w=new SharedWorld('ground-upgrade-'+seed);assert.ok(w.groundFraction>=.50&&w.groundFraction<=.85);fractions.push(w.groundFraction);
 for(let lane=0;lane<3;lane++){
  let grounded=0;for(let d=0;d<=5000;d+=10){const p=w.sample(lane,d).point,clearance=p[1]-w.terrainY(p[0],p[2]);assert.ok(clearance>.15,'terrain must stay below rails');if(clearance<.181)grounded++;checked++}
  const ratio=grounded/501;assert.ok(ratio>=.49&&ratio<=.86);assert.ok(Math.abs(ratio-w.groundFraction)<.015);
  for(const d of[0,10,30,4990,5000,5150]){const p=w.sample(lane,d).point;assert.ok(Math.abs(p[1]-w.terrainY(p[0],p[2])-.18)<1e-5)}
  for(const d of w.caves){const x=w.sample(lane,d).point[0];assert.ok(w.trackClearance(lane,x)<.19,'tunnel must be on ground')}
 }
}
assert.ok(Math.max(...fractions)-Math.min(...fractions)>.18);
assert.equal(DECORATIONS.length,25);assert.equal(DECORATIONS.filter(d=>d.extra).length,10);assert.equal(new Set(DECORATIONS.map(d=>d.id)).size,25);
for(const d of DECORATIONS)for(let variant=0;variant<(d.id==='dinosaurs'?3:1);variant++){
 const mesh=makeDecoration(d.id,variant);assert.ok(mesh.length>0);assert.ok(mesh.every(Number.isFinite));let radius=0;for(let i=0;i<mesh.length;i+=9)radius=Math.max(radius,Math.hypot(mesh[i],mesh[i+1],mesh[i+2]));assert.ok(radius<DECORATION_RADII[d.id],`${d.id} unsafe bound ${radius}`);
}
const seen=new Set();let instances=0;
for(let seed=0;seed<8;seed++){
 const w=new SharedWorld('decor-upgrade-'+seed),players=[0,1,2].map(lane=>({lane,distance:0,renderDistance:0}));
 const sys=new DecorationSystem(w,{...settings,decorationDensity:'rich'});
 for(let distance=0;distance<=5000;distance+=100){players.forEach((p,i)=>{p.distance=Math.max(0,distance-i*20);p.renderDistance=p.distance});const clock=distance/12,items=sys.instances(players,clock);assert.ok(items.length<=30);for(const item of items){assert.ok(safeDecoration(item,w,players));assert.ok(item.point.every(Number.isFinite));seen.add(item.id);if(item.id==='snow')assert.equal(w.themeAtX(Math.round(item.point[0]/30)*30).id,'snow');if(item.id==='tumbleweeds')assert.ok(players.every(p=>Math.abs(w.sample(p.lane,p.distance).point[0]-item.point[0])>=18));instances++}}
 sys.setSettings({...settings,decorationDensity:'off'});assert.deepEqual(sys.instances(players,20),[]);
 sys.setSettings({...settings,decorations:Object.fromEntries(DECORATIONS.map(d=>[d.id,false]))});assert.deepEqual(sys.instances(players,20),[]);
 sys.setSettings({...settings,decorationDensity:'sparse',decorations:{...defaultDecorations(),dragons:false}});const items=sys.instances(players,20);assert.ok(items.length<=7);assert.ok(items.every(d=>d.id!=='dragons'));
}
assert.deepEqual([...seen].sort(),DECORATIONS.map(d=>d.id).sort());
assert.notDeepEqual(makeCart('#69dfed',12),makeCart('#69dfed',21));assert.ok(makeCharacter('#69dfed',true).every(Number.isFinite));
// Exercise every procedural panorama with a minimal canvas API, without external assets.
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(const b of BACKGROUNDS){const out=makePanorama('backdrop',{id:'snow',sky:'#bcddee',fog:'#dae8ee'},b.id,()=>({getContext:()=>ctx}));assert.ok(out);assert.equal(out.canvas.width,1536);assert.notEqual(out.style,'auto')}
console.log(`PASS V1.2: ${parameterQuestions} parameter prompts, ${checked} ground checks, 25 bounded independent decorations (${instances} placements), density/off switches, 10 panoramas, seat migration and score formats`);
