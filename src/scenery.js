import {Geometry} from './geometry.js?v=1.4.0';
import {WORLD_END,WORLD_DRAW_END,TERRAIN_STEP,normalize,sub,add,scale} from './world.js?v=1.4.0';
import {random,clamp} from './math.js?v=1.4.0';
export const CHUNK_SIZE=17;
const offset=(p,n,k)=>add(p,scale(n,k));
function tree(g,x,y,z,s,t,snow=false){
 g.box(x,y+s*.6,z,s*.22,s*1.2,s*.22,'#70543e');
 for(let j=0;j<2;j++)g.cone(x,y+s*(1+j*.63),y+s*(2.35+j*.5),z,s*(1-j*.18),snow?(j?'#eef3ed':t.tree):j?t.light:t.tree,6);
}
function house(g,x,y,z,s,t,r){g.box(x,y+s*.7,z,s*1.8,s*1.4,s*1.4,r()>.5?'#eed4a1':'#e4c4ae');g.pyramid(x,y+s*1.8,z,s*2.3,s*.9,t.id==='pastoral'?'#b96a4d':'#785b51');g.box(x-.3*s,y+s*.5,z+s*.72,.4*s,s,.045,'#4f6267');g.box(x+.5*s,y+s*.8,z+s*.72,.4*s,.4*s,.05,'#a0d2de')}
function prop(g,w,t,x,z,r){
 const y=w.terrainY(x,z),s=.85+r()*1.1,v=r();
 if(t.id==='forest'){tree(g,x,y,z,s,t);if(v<.2)g.sphere(x+1,y+.3,z+.8,s*.45,'#7f8d79',5,3)}
 else if(t.id==='hills'){if(v<.35)tree(g,x,y,z,s*.8,t);else if(v<.43)tree(g,x,y,z,s*.8,t);else g.sphere(x,y-.4,z,s*2.3,v<.7?'#abc57c':'#8baa68',7,4)}
 else if(t.id==='snow'){if(v<.7)tree(g,x,y,z,s,t,true);else {g.cone(x,y,y+s*3,z,s*1.9,'#a6bdc4',6);g.cone(x,y+s*1.9,y+s*3.05,z,s*.7,'#f5f5eb',6)}}
 else if(t.id==='volcano'){if(v<.35){g.cone(x,y,y+s*3.6,z,s*2,'#42474e',7);g.cone(x,y+s*3.2,y+s*3.65,z,s*.35,'#f39750',7);g.sphere(x+.2,y+s*4,z,s*.4,'#9b9b98',6,3)}else {g.sphere(x,y+.4,z,s,'#454951',6,3);if(v>.65)g.rod([x-1,y+.5,z],[x+1,y+.6,z+.5],.24,.05,'#ff9b4f')}}
 else if(t.id==='desert'){if(v<.45){g.box(x,y+s,z,s*.45,s*2,s*.4,t.tree);for(const k of [-1,1]){g.rod([x,y+s*.9,z],[x+k*s*.7,y+s*.9,z],s*.25,s*.25,t.tree);g.box(x+k*s*.7,y+s*1.25,z,s*.25,s*.7,s*.25,t.tree)}}else if(v<.8)g.sphere(x,y-s*.5,z,s*3,t.light,7,4);else {g.box(x,y+1.5*s,z,1.7*s,3*s,1.4*s,'#b18b68');g.box(x,y+3.2*s,z,2.4*s,.5*s,1.8*s,'#d8b68b')}}
 else if(t.id==='pastoral'){if(v<.3)house(g,x,y,z,s,t,r);else if(v<.6){g.box(x,y+.45,z,1.2*s,.9,1.2*s,'#e8c576');g.box(x,y+.95,z,.9*s,.2,.9*s,'#b79a50')}else for(let j=0;j<3;j++)g.box(x+j*.8,y+.12,z,.55,.25,3*s,j%2?'#dac96e':'#719b57')}
 else if(t.id==='country'){if(v<.5)house(g,x,y,z,s,t,r);else if(v<.63)house(g,x,y,z,s*.7,t,r);else tree(g,x,y,z,s*.8,t)}
 else {if(v<.7)tree(g,x,y,z,s*.9,t);else {g.sphere(x,y+.4,z,s,'#a3b5a6',6,3);for(let j=0;j<3;j++)g.rod([x+j*.3,y,z+1],[x+j*.3,y+1,z+1],.05,.05,'#5b8a62')}}
}
export function makeChunk(w,index){
 const g=new Geometry(),r=random(`${w.seed}:chunk:${index}`),x0=index*CHUNK_SIZE,x1=Math.min(WORLD_DRAW_END,x0+CHUNK_SIZE),xc=(x0+x1)/2,t=w.themeAtX(xc);
 // One deterministic terrain and prop batch, shared by all three cameras.
 for(let x=x0;x<x1-.01;x+=TERRAIN_STEP){const a=w.terrainRow(x),b=w.terrainRow(Math.min(x1,x+TERRAIN_STEP));for(let j=0;j<a.length-1;j++)g.quad(a[j],b[j],b[j+1],a[j+1],t.ground)}
 // Long distant ridges give depth at little GPU cost.
 for(const side of [-1,1]){
  const x=xc,z=w.centerZ(clamp(x/WORLD_END,0,1))+side*(51+r()*9),s=6+r()*8,y=w.terrainY(x,z)-.5;
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
  if(Math.abs(x)<14||Math.abs(x-WORLD_END)<18)continue;
  if(w.routes.some((_,i)=>Math.abs(w.pointAtX(i,x)[2]-z)<2.8))continue;
  if(t.id==='lake'&&z>w.centerZ(x/WORLD_END)+17&&z<w.centerZ(x/WORLD_END)+37)continue;
  prop(g,w,t,x,z,r);
 }
 for(let lane=0;lane<3;lane++){
  for(let x=x0;x<x1-.001;x+=.85){const a=w.pointAtX(lane,x),b=w.pointAtX(lane,Math.min(x1,x+.85)),n=normalize([-(b[2]-a[2]),0,b[0]-a[0]]);
   for(const side of [-1,1])g.rod(offset(a,n,side*.46),offset(b,n,side*.46),.09,.095,'#c5d2cc');
   if(w.trackClearance(lane,x)<=.6)g.rod(add(a,[0,-.20,0]),add(b,[0,-.20,0]),1.65,.18,'#899080');
   if(w.trackClearance(lane,x)>.6){g.rod([a[0],a[1]-.27,a[2]],[b[0],b[1]-.27,b[2]],1.65,.19,'#a88c68');for(const side of[-1,1]){g.rod(offset(add(a,[0,.48,0]),n,side*.94),offset(add(b,[0,.48,0]),n,side*.94),.045,.045,'#b9c9bb');if(Math.floor(x*2)%5===0)g.rod(offset(add(a,[0,-.18,0]),n,side*.94),offset(add(a,[0,.48,0]),n,side*.94),.065,.065,'#b9c9bb')}}
  }
  for(let x=Math.ceil(x0/.68)*.68;x<x1;x+=.68){const p=w.pointAtX(lane,x),b=w.pointAtX(lane,x+.05),n=normalize([-(b[2]-p[2]),0,b[0]-p[0]]);g.rod(offset([p[0],p[1]-.1,p[2]],n,-.72),offset([p[0],p[1]-.1,p[2]],n,.72),.14,.13,'#79644f')}
  for(let x=Math.ceil(x0/5)*5;x<x1;x+=5){const p=w.pointAtX(lane,x),ground=w.terrainY(x,p[2]),h=p[1]-ground;if(h>.8)g.box(x,ground+h*.5-.25,p[2],.24,h+.3,.32,'#7f8d83')}
 }
 makeLandmarks(g,w,index,x0,x1,r);
 if(index===0)makeArch(g,0,0,'#79dcc5',false);
 if(x0<=WORLD_END&&x1>WORLD_END)makeArch(g,WORLD_END,0,'#ffce82',true);
 // A single shared biome checkpoint; each route is exactly 2.5 km here.
 if(x0<WORLD_END/2&&x1>=WORLD_END/2){const x=WORLD_END/2;for(let lane=0;lane<3;lane++){const p=w.pointAtX(lane,x);for(const side of [-1,1]){g.box(x,p[1]+1,p[2]+side*1.25,.14,2,.14,'#e7d58f');g.box(x,p[1]+1.6,p[2]+side*1.25,.12,.5,.5,lane===0?'#72dce6':lane===1?'#ffb76a':'#95e1a2')}}}
 return g.array();
}
function makeLandmarks(g,w,index,x0,x1,r){
 const xc=(x0+x1)/2,t=w.themeAtX(xc),f=w.featureAt(1,xc),mid=w.pointAtX(1,xc),ps=w.routes.map((_,i)=>w.pointAtX(i,xc));
 if(f){
  const floor=Math.min(...ps.map((p,i)=>p[1]-w.trackClearance(i,xc)));
  if(f.kind==='river'&&w.trackClearance(1,xc)>1){
   g.box(xc,floor+.18,mid[2],x1-x0+.03,.10,39,'#458f9f');
   for(let j=0;j<4;j++)g.box(x0+(j+.5)*(x1-x0)/4,floor+.24,mid[2]-14+r()*28,.08,.02,2+r()*4,'#a5d5d9');
  }
  if(f.kind==='canyon')for(const side of[-1,1]){
   const z=mid[2]+side*24,y=w.terrainY(xc,z);g.ellipsoid(xc,y-2,z,6,6,4,'#ad805d',9,5);g.box(xc,y-1,z,8,.42,7,'#dfb285');
  }
 }
 if(index%9===4)for(const side of[-1,1]){
  const z=(side<0?ps[0][2]:ps[2][2])+side*(12+r()*7),y=w.terrainY(xc,z),s=2+r()*3;
  g.ellipsoid(xc,y+s*.6,z,s,s*1.2,s*.8,t.id==='snow'?'#bfced1':'#8d938c',8,5);
 }
 if(index%23===11&&t.id!=='volcano'&&t.id!=='desert'){
  const z=ps[2][2]+20,y=w.terrainY(xc,z)-.1;
  g.ellipsoid(xc,y-.3,z,10,.45,6,'#568f9a',14,5);g.ellipsoid(xc,y-.22,z,8,.39,4.5,'#76b5bf',14,4);
 }
 // Individual tunnels follow each track, with a clear opening above both cart and camera.
 for(const d of w.caves)for(let lane=0;lane<3;lane++){
  const p=w.sample(lane,d).point;if(p[0]<x0||p[0]>=x1||w.trackClearance(lane,p[0])>.4)continue;
  const a=w.pointAtX(lane,p[0]-5),b=w.pointAtX(lane,p[0]+5),right=normalize([-(b[2]-a[2]),0,b[0]-a[0]]);
  for(const side of[-1,1])g.rod(offset(add(a,[0,1.9,0]),right,side*1.7),offset(add(b,[0,1.9,0]),right,side*1.7),.55,4.1,'#7c8278');
  g.rod(add(a,[0,4.18,0]),add(b,[0,4.18,0]),3.9,.52,'#959b88');
  for(const end of[a,b])for(let j=0;j<5;j++){const angle=(j+.5)*Math.PI/5;g.ellipsoid(end[0],end[1]+3.4+Math.sin(angle)*.7,end[2]+Math.cos(angle)*1.8,.6,.65,.6,'#a2a48f',7,4)}
 }
}
const GLYPHS={
 S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],A:['01110','10001','10001','11111','10001','10001','10001'],R:['11110','10001','10001','11110','10100','10010','10001'],G:['01111','10000','10000','10111','10001','10001','01110'],O:['01110','10001','10001','10001','10001','10001','01110'],L:['10000','10000','10000','10000','10000','10000','11111']};
export function archLettering(g,word,x,y,front){const cell=.145,width=(word.length*6-1)*cell;for(let k=0;k<word.length;k++)for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(GLYPHS[word[k]][row][col]==='1'){const z=front*(-width/2+(k*6+col+.5)*cell);g.box(x,y+(3-row)*cell,z,.035,cell*.84,cell*.84,'#fff7dc')}}
export function makeArch(g,x,y,color,finish){
 for(const side of [-1,1]){g.box(x,y+2.3,side*5.6,.7,4.6,.8,'#ede4c5');g.box(x,y+.1,side*5.6,1.2,.3,1.3,'#7c8d87')}
 g.box(x,y+4.7,0,.9,1.3,12,color);g.box(x-.47,y+4.7,0,.035,1.12,5.6,'#1e4a4f');g.box(x+.47,y+4.7,0,.035,1.12,5.6,'#1e4a4f');
 archLettering(g,finish?'GOAL':'START',x-.50,y+4.7,1);archLettering(g,finish?'GOAL':'START',x+.50,y+4.7,-1);
 for(let j=0;j<12;j++)g.box(x,y+5.45,(j-5.5)*.9,.9,.18,.86,j%2?'#edf2d6':finish?'#52646b':'#538c76');
}
const DIGITS={0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','010','010','010'],8:['111','101','111','101','111'],9:['111','101','111','001','111']};
export function makeCart(color,seat=''){
 const g=new Geometry();
 // Separate watertight floor and four walls: no overlapping coplanar rear faces.
 g.box(0,.30,0,1.52,.19,1.18,'#304b58');
 g.box(.70,.74,0,.14,.70,1.18,color);g.box(-.70,.74,0,.14,.70,1.18,color);
 for(const side of[-1,1]){g.box(0,.74,side*.55,1.26,.70,.12,color);g.rod([-.64,1.10,side*.55],[.64,1.10,side*.55],.07,.07,'#e7e5ce')}
 g.box(-.782,.76,0,.025,.48,.78,'#203c4c');
 const text=String(seat).replace(/[^0-9]/g,'').slice(0,2),cell=.061,width=(text.length*4-1)*cell;
 for(let k=0;k<text.length;k++)for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(DIGITS[text[k]][row][col]==='1')g.box(-.806,.76+(2-row)*cell,-width/2+(k*4+col+.5)*cell,.013,cell*.85,cell*.85,'#fff2cc');
 for(const x of[-.46,.46])for(const side of[-1,1]){g.sphere(x,.13,side*.53,.22,'#34444b',8,4);g.sphere(x,.13,side*.69,.08,'#b7c7b8',6,3)}g.sphere(.79,.72,0,.10,'#fff3b4',6,3);return g.array();
}
export function makeCharacter(color,standing=false){
 const g=new Geometry(),skin='#f1c9a8',pants='#344c61',boot='#624f42';
 // Original round-faced expedition rider with overalls, a scarf and a smooth helmet.
 g.ellipsoid(0,.13,0,.23,.31,.25,color,12,7);g.box(.19,.07,0,.05,.28,.31,pants);g.box(.222,.14,0,.02,.10,.12,'#e6c777');
 g.box(0,-.14,0,.35,.20,.43,pants);
 for(const side of[-1,1]){const z=side*.14;if(standing){g.rod([0,-.15,z],[.01,-.62,z],.145,.15,pants);g.ellipsoid(.10,-.72,z,.18,.11,.105,boot,10,5)}else{g.rod([0,-.15,z],[.30,-.28,z],.17,.17,pants);g.rod([.30,-.28,z],[.33,-.57,z],.15,.15,pants);g.ellipsoid(.42,-.64,z,.17,.09,.11,boot,10,5)}}
 g.ellipsoid(0,.59,0,.265,.30,.25,skin,16,10);
 g.ellipsoid(-.13,.63,0,.17,.23,.253,'#695044',12,7);
 g.ellipsoid(-.02,.73,0,.30,.23,.30,'#edbe5c',16,6,.0,Math.PI/2);
 g.box(.065,.735,0,.48,.045,.64,'#f5d080');g.ellipsoid(.285,.81,0,.046,.056,.065,'#f9f1c7',10,5);
 const faceX=(y,z)=>.265*Math.sqrt(Math.max(.05,1-((y-.59)/.30)**2-(z/.25)**2));
 for(const side of[-1,1]){
  g.ellipsoid(.0,.59,side*.249,.06,.08,.05,skin,10,5);
  const z=side*.094;g.ellipsoid(faceX(.625,z)+.010,.625,z,.018,.049,.037,'#fff7e7',10,6);
  g.ellipsoid(faceX(.625,z)+.029,.625,z-.005,.012,.029,.019,'#35465a',10,6);g.ellipsoid(faceX(.638,z)+.041,.638,z-.010,.005,.009,.007,'#ffffff',8,4);
  g.rod([faceX(.696,z-.028)+.009,.696,z-.028],[faceX(.696,z+.028)+.009,.696,z+.028],.014,.015,'#71564b');
  g.ellipsoid(faceX(.536,side*.145)+.008,.536,side*.145,.010,.023,.034,'#e8a593',10,5);
  if(side===1){g.rod([.02,.22,.25],[.29,-.08,.39],.13,.13,skin);g.ellipsoid(.29,-.08,.39,.08,.09,.08,skin,9,5)}
 }
 g.ellipsoid(.275,.569,0,.030,.032,.031,skin,10,5);
 for(let j=0;j<10;j++){const z0=-.09+j*.018,z1=z0+.018,y=z=>.474+.028*(z/.09)**2;g.rod([faceX(y(z0),z0)+.014,y(z0),z0],[faceX(y(z1),z1)+.014,y(z1),z1],.012,.012,'#976357')}
 g.ellipsoid(.05,.355,0,.24,.055,.26,'#e6b36f',12,5);return g.array();
}
export function makeArm(){const g=new Geometry();g.rod([0,0,0],[0,-.58,0],.15,.15,'#f3d0ab');g.sphere(0,-.64,0,.095,'#f3d0ab',6,4);return g.array()}
function cylinderX(g,x0,x1,r,color,sides=8){for(let j=0;j<sides;j++){const a=j*Math.PI*2/sides,b=(j+1)*Math.PI*2/sides,p=(x,t)=>[x,Math.cos(t)*r,Math.sin(t)*r];g.quad(p(x0,a),p(x1,a),p(x1,b),p(x0,b),color);g.triangle([x0,0,0],p(x0,b),p(x0,a),color);g.triangle([x1,0,0],p(x1,a),p(x1,b),color)}}
export function makeJet(){const g=new Geometry();cylinderX(g,-.61,.37,.245,'#b7c8ca',9);cylinderX(g,-.73,-.56,.285,'#405969',9);cylinderX(g,-.745,-.738,.21,'#21323d',9);g.box(.04,-.23,0,.7,.14,.35,'#d8a64d');for(let j=0;j<8;j++){const a=j*Math.PI/4,b=(j+1)*Math.PI/4;g.triangle([.63,0,0],[.36,Math.cos(a)*.245,Math.sin(a)*.245],[.36,Math.cos(b)*.245,Math.sin(b)*.245],'#e7dabe')}return g.array()}
export function makeFlame(color='#ff9c35'){const g=new Geometry();for(let j=0;j<7;j++){const a=j*Math.PI*2/7,b=(j+1)*Math.PI*2/7;g.triangle([0,Math.cos(a)*.22,Math.sin(a)*.22],[-1,0,0],[0,Math.cos(b)*.22,Math.sin(b)*.22],color)}return g.array()}
export function makeCrowd(world){
 const g=new Geometry(),r=random(world.seed+':crowds'),shirts=['#e8b66b','#80bac4','#dc8e81','#9cbe7b','#c5a2d3'];
 for(const gate of [0,WORLD_END])for(const side of [-1,1])for(let j=0;j<15;j++){
  const x=gate+(gate===0?-10+j*2.5:-12+j*10),z=side*(6.5+(j%2)*1.1),y=world.footingY(x,z,.28),s=.68+r()*.22,shirt=shirts[j%shirts.length],skin=j%3===0?'#c89472':'#efd0ad';
  g.box(x,y+s*.75,z,s*.42,s*.62,s*.38,shirt);g.sphere(x,y+s*1.32,z,s*.25,skin,6,4);g.box(x,y+s*1.49,z,s*.52,s*.08,s*.49,j%2?'#ead59c':'#62776b');
  for(const k of [-1,1]){g.rod([x+k*s*.13,y+s*.5,z],[x+k*s*.16,y+s*.07,z],s*.14,s*.15,'#3c5260');g.rod([x+k*s*.25,y+s*.96,z],[x+k*s*.53,y+s*1.5,z],s*.12,s*.12,skin);g.sphere(x+k*s*.53,y+s*1.52,z,s*.075,skin,5,3)}
 }
 return g.array();
}
