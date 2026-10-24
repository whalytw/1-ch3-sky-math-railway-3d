import {Geometry} from './geometry.js?v=1.0.0';
import {WORLD_END,normalize,sub,add,scale} from './world.js?v=1.0.0';
import {random,clamp} from './math.js?v=1.0.0';
export const CHUNK_SIZE=17;
const offset=(p,n,k)=>add(p,scale(n,k));
function tree(g,x,y,z,s,t,snow=false){
 g.box(x,y+s*.6,z,s*.22,s*1.2,s*.22,'#70543e');
 for(let j=0;j<2;j++)g.cone(x,y+s*(1+j*.63),y+s*(2.35+j*.5),z,s*(1-j*.18),snow?(j?'#eef3ed':t.tree):j?t.light:t.tree,6);
}
function house(g,x,y,z,s,t,r){g.box(x,y+s*.7,z,s*1.8,s*1.4,s*1.4,r()>.5?'#eed4a1':'#e4c4ae');g.pyramid(x,y+s*1.8,z,s*2.3,s*.9,t.id==='pastoral'?'#b96a4d':'#785b51');g.box(x-.3*s,y+s*.5,z+s*.72,.4*s,s,.045,'#4f6267');g.box(x+.5*s,y+s*.8,z+s*.72,.4*s,.4*s,.05,'#a0d2de')}
function windmill(g,x,y,z,s){g.box(x,y+1.5*s,z,.8*s,3*s,.8*s,'#e3d8b4');g.pyramid(x,y+3.3*s,z,1.3*s,.8*s,'#976453');for(const k of [-1,1]){g.rod([x-1.6*s,y+(2.6+k*1.5)*s,z+.5*s],[x+1.6*s,y+(2.6-k*1.5)*s,z+.5*s],.25*s,.1*s,'#efebd4')}}
function prop(g,w,t,x,z,r){
 const y=w.terrainY(x,z),s=.85+r()*1.1,v=r();
 if(t.id==='forest'){tree(g,x,y,z,s,t);if(v<.2)g.sphere(x+1,y+.3,z+.8,s*.45,'#7f8d79',5,3)}
 else if(t.id==='hills'){if(v<.35)tree(g,x,y,z,s*.8,t);else if(v<.43)windmill(g,x,y,z,s*.8);else g.sphere(x,y-.4,z,s*2.3,v<.7?'#abc57c':'#8baa68',7,4)}
 else if(t.id==='snow'){if(v<.7)tree(g,x,y,z,s,t,true);else {g.cone(x,y,y+s*3,z,s*1.9,'#a6bdc4',6);g.cone(x,y+s*1.9,y+s*3.05,z,s*.7,'#f5f5eb',6)}}
 else if(t.id==='volcano'){if(v<.35){g.cone(x,y,y+s*3.6,z,s*2,'#42474e',7);g.cone(x,y+s*3.2,y+s*3.65,z,s*.35,'#f39750',7);g.sphere(x+.2,y+s*4,z,s*.4,'#9b9b98',6,3)}else {g.sphere(x,y+.4,z,s,'#454951',6,3);if(v>.65)g.rod([x-1,y+.5,z],[x+1,y+.6,z+.5],.24,.05,'#ff9b4f')}}
 else if(t.id==='desert'){if(v<.45){g.box(x,y+s,z,s*.45,s*2,s*.4,t.tree);for(const k of [-1,1]){g.rod([x,y+s*.9,z],[x+k*s*.7,y+s*.9,z],s*.25,s*.25,t.tree);g.box(x+k*s*.7,y+s*1.25,z,s*.25,s*.7,s*.25,t.tree)}}else if(v<.8)g.sphere(x,y-s*.5,z,s*3,t.light,7,4);else {g.box(x,y+1.5*s,z,1.7*s,3*s,1.4*s,'#b18b68');g.box(x,y+3.2*s,z,2.4*s,.5*s,1.8*s,'#d8b68b')}}
 else if(t.id==='pastoral'){if(v<.3)house(g,x,y,z,s,t,r);else if(v<.6){g.box(x,y+.45,z,1.2*s,.9,1.2*s,'#e8c576');g.box(x,y+.95,z,.9*s,.2,.9*s,'#b79a50')}else for(let j=0;j<3;j++)g.box(x+j*.8,y+.12,z,.55,.25,3*s,j%2?'#dac96e':'#719b57')}
 else if(t.id==='country'){if(v<.5)house(g,x,y,z,s,t,r);else if(v<.63)windmill(g,x,y,z,s*.65);else tree(g,x,y,z,s*.8,t)}
 else {if(v<.7)tree(g,x,y,z,s*.9,t);else {g.sphere(x,y+.4,z,s,'#a3b5a6',6,3);for(let j=0;j<3;j++)g.rod([x+j*.3,y,z+1],[x+j*.3,y+1,z+1],.05,.05,'#5b8a62')}}
}
export function makeChunk(w,index){
 const g=new Geometry(),r=random(`${w.seed}:chunk:${index}`),x0=index*CHUNK_SIZE,x1=Math.min(WORLD_END+15,x0+CHUNK_SIZE),xc=(x0+x1)/2,t=w.themeAtX(xc);
 // One deterministic terrain and prop batch, shared by all three cameras.
 const terrainRow=x=>{const c=w.centerZ(clamp(x/WORLD_END,0,1)),ps=w.routes.map((_,i)=>w.pointAtX(i,x)[2]);return [c-65,c-40,ps[0]-14,ps[0]-5,ps[0],ps[1],ps[2],ps[2]+5,ps[2]+14,c+40,c+65].map(z=>[x,w.terrainY(x,z),z])};
 for(let x=x0;x<x1-.01;x+=2.125){const a=terrainRow(x),b=terrainRow(Math.min(x1,x+2.125));for(let j=0;j<a.length-1;j++)g.quad(a[j],b[j],b[j+1],a[j+1],t.ground)}
 // Long distant ridges give depth at little GPU cost.
 for(const side of [-1,1]){
  const x=xc,z=side*(51+r()*9),s=6+r()*8,y=w.terrainY(x,z)-.5;
  g.cone(x,y,y+s*.75,z,s,t.id==='snow'?'#cfdee1':t.id==='desert'?'#d8ad7a':t.id==='volcano'?'#6a6564':'#7a9b78',7);
  if(t.id==='snow')g.cone(x,y+s*.48,y+s*.78,z,s*.35,'#f8faf5',7);
 }
 if(t.id==='lake'){
  const z=w.centerZ(clamp(xc/WORLD_END,0,1))+27;
  const y=w.terrainY(xc,z)+.25;g.box(xc,y,z,CHUNK_SIZE+.1,.12,18,'#559da8');
  for(let j=0;j<4;j++)g.box(x0+r()*CHUNK_SIZE,y+.08,z-6+r()*12,1.2+r()*2,.025,.05,'#a6d5d5');
  if(index%3===0){g.box(xc,y+.18,z,1.8,.35,.8,'#e2d8ad');g.rod([xc,y+.3,z],[xc,y+3,z],.06,.06,'#eae1c9');g.triangle([xc,y+3,z],[xc,y+.6,z],[xc+1.5,y+.6,z],'#fff0ce')}
 }
 for(let j=0;j<17;j++){
  const x=x0+r()*(x1-x0),z=w.centerZ(clamp(x/WORLD_END,0,1))+(r()>.5?1:-1)*(5+r()*35);
  if(w.routes.some((_,i)=>Math.abs(w.pointAtX(i,x)[2]-z)<2.8))continue;
  if(t.id==='lake'&&z>w.centerZ(x/WORLD_END)+17&&z<w.centerZ(x/WORLD_END)+37)continue;
  prop(g,w,t,x,z,r);
 }
 for(let lane=0;lane<3;lane++){
  const route=w.routes[lane];const j0=Math.max(0,Math.floor(x0/WORLD_END*1000)),j1=Math.min(1000,Math.ceil(x1/WORLD_END*1000));
  for(let j=j0;j<j1;j+=2){const a=route.points[j],b=route.points[Math.min(j+2,1000)],n=normalize([-(b[2]-a[2]),0,b[0]-a[0]]);
   for(const side of [-1,1])g.rod(offset(a,n,side*.46),offset(b,n,side*.46),.09,.095,'#c5d2cc');
   const p=route.points[j];g.rod(offset([p[0],p[1]-.1,p[2]],n,-.72),offset([p[0],p[1]-.1,p[2]],n,.72),.17,.15,'#79644f');
   if(j%12===0){const ground=w.terrainY(p[0],p[2]),h=p[1]-ground;g.box(p[0],ground+h*.5-.25,p[2],.23,h+.3,.3,'#778577');g.rod([p[0],p[1]-.3,p[2]-.65],[p[0],p[1]-.3,p[2]+.65],.2,.22,'#596962')}
  }
 }
 if(index===0)makeArch(g,0,0,'#79dcc5',false);
 if(x0<=WORLD_END&&x1>WORLD_END)makeArch(g,WORLD_END,0,'#ffce82',true);
 // A single shared biome checkpoint; each route is exactly 2.5 km here.
 if(x0<WORLD_END/2&&x1>=WORLD_END/2){const x=WORLD_END/2;for(let lane=0;lane<3;lane++){const p=w.pointAtX(lane,x);for(const side of [-1,1]){g.box(x,p[1]+1,p[2]+side*1.25,.14,2,.14,'#e7d58f');g.box(x,p[1]+1.6,p[2]+side*1.25,.12,.5,.5,lane===0?'#72dce6':lane===1?'#ffb76a':'#95e1a2')}}}
 return g.array();
}
function makeArch(g,x,y,color,finish){
 for(const side of [-1,1]){g.box(x,y+2.3,side*5.6,.7,4.6,.8,'#ede4c5');g.box(x,y+.1,side*5.6,1.2,.3,1.3,'#7c8d87')}
 g.box(x,y+4.5,0,.9,.7,12,color);
 for(let j=0;j<12;j++)g.box(x+.46,y+4.5,(j-5.5)*.9,.04,.5,.86,finish?(j%2?'#334653':'#f9f5dc'):j%2?'#c5f0da':color);
}
export function makeCart(color){const g=new Geometry();g.box(0,.42,0,1.45,.56,1.05,color);g.box(.64,.65,0,.18,.7,1.12,color);g.box(-.65,.65,0,.17,.7,1.12,'#345266');for(const side of [-1,1]){g.box(0,.65,side*.53,1.4,.65,.13,color);g.rod([-.6,1,side*.59],[.65,1,side*.59],.07,.07,'#e3e9d4')}
 for(const x of [-.46,.46])for(const side of [-1,1]){g.sphere(x,.13,side*.53,.22,'#34444b',8,4);g.sphere(x,.13,side*.67,.08,'#b7c7b8',6,3)}g.sphere(.76,.72,0,.12,'#fff3b4',6,3);return g.array()}
export function makeCharacter(color){const g=new Geometry();g.box(0,.12,0,.37,.48,.46,color);g.box(.2,-.08,0,.42,.18,.5,'#263f50');g.sphere(0,.54,0,.25,'#f3d0ab',8,5);g.sphere(-.05,.69,0,.28,'#675748',8,4);g.box(.12,.72,0,.43,.07,.59,'#f0c55c');g.sphere(.2,.73,0,.075,'#f9edb7',6,3);for(const side of [-1,1]){g.sphere(.24,.56,side*.09,.03,'#273940',5,3);if(side===1)g.rod([.02,.19,.27],[.29,-.1,.39],.14,.14,'#f3d0ab')}return g.array()}
export function makeArm(){const g=new Geometry();g.rod([0,0,0],[0,-.58,0],.15,.15,'#f3d0ab');g.sphere(0,-.64,0,.095,'#f3d0ab',6,4);return g.array()}
