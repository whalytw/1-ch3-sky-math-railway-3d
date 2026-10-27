import {Geometry} from './geometry.js?v=1.6.0';
import {random,clamp,hash32} from './math.js?v=1.6.0';
import {artBounds} from './artwork.js?v=1.6.0';
import {FlightDirector,FLIGHT_TYPES} from './flight.js?v=1.6.0';
import {skyEvents,nightAt} from './lighting.js?v=1.6.0';
import {WORLD_END,WORLD_DRAW_END,sub,add,normalize} from './world.js?v=1.6.0';

export const DECORATIONS=Object.freeze([
 ['snow','雪地飄雪','weather'],['fireballs','火山火球','sky'],['birds','飛過的鳥群','sky'],['balloons','繽紛熱氣球','sky'],['crowds','沿途加油人群','ground'],['windmills','旋轉風車','ground'],['whales','飛翔鯨魚','sky'],['dragons','巨大火龍','sky'],['witches','掃把巫婆','sky'],['heroes','披風飛行英雄','sky'],['biplanes','雙翼螺旋槳飛機','sky'],['tumbleweeds','滾動風滾草','ground'],['dinosaurs','漫步巨型恐龍','ground'],['rain','陣雨','weather'],['rainbows','雨後彩虹','sky'],
 ['fireflies','螢火蟲光舞','ground'],['butterflies','彩蝶花群','sky'],['airships','蒸汽飛船','sky'],['paperplanes','滑翔紙飛機','sky'],['islands','遠方天空古城','sky'],['meteors','夜空流星與流星雨','sky'],['cloudsheep','雲朵綿羊','sky'],['robots','噴射郵差機器人','sky'],['jellyfish','發光天空水母','sky'],['kites','繫線彩色風箏','sky'],['unicorns','月光有翼獨角獸','sky'],['satellites','遠方人造衛星','sky'],['ufos','神秘飛碟','sky']
].map(([id,label,zone],i)=>Object.freeze({id,label,zone,extra:i>=15})));
export const DENSITY_BUDGET=Object.freeze({rich:30,medium:16,sparse:7,off:0});
export const DECORATION_RADII=Object.freeze({snow:20,fireballs:3,birds:8,balloons:5,crowds:5,windmills:7,whales:7,dragons:9,witches:4,heroes:4,biplanes:5,tumbleweeds:2,dinosaurs:9,rain:20,rainbows:11,fireflies:5,butterflies:5,airships:6,paperplanes:8,islands:6,meteors:7,cloudsheep:4,robots:3,jellyfish:5,kites:7,unicorns:6,satellites:3,ufos:5});
const MODEL_BOUNDS=new Map();
export function decorationBounds(id){if(artBounds(id))return artBounds(id);if(!MODEL_BOUNDS.has(id))makeDecoration(id);return MODEL_BOUNDS.get(id)}
export function crowdPositions(world,item){return Array.from({length:7},(_,j)=>{const x=item.point[0]+(j-3)*.8,z=item.point[2]+(j%2)*.7;return [x,world.footingY(x,z,.25),z]})}
export const defaultDecorations=()=>Object.fromEntries(DECORATIONS.map(d=>[d.id,true]));
export function normalizeDecorations(raw){return Object.fromEntries(DECORATIONS.map(d=>[d.id,raw?.[d.id]!==false]))}
const wing=(g,x,y,z,s,color)=>{g.triangle([x+.3*s,y,z],[x-.8*s,y,z+2*s],[x-1.4*s,y,z+.3*s],color)};
function person(g,x=0,y=0,z=0,s=1,shirt='#f1bb73'){
 g.box(x,y+.8*s,z,.42*s,.65*s,.38*s,shirt);g.ellipsoid(x,y+1.35*s,z,.23*s,.26*s,.22*s,'#efc5a4',9,6);
 for(const k of[-1,1]){g.rod([x+k*s*.13,y+.5*s,z],[x+k*s*.17,y+.05*s,z],s*.14,s*.14,'#385467');g.rod([x+k*s*.25,y+.98*s,z],[x+k*s*.5,y+1.55*s,z],s*.12,s*.12,'#efc5a4')}
}
export function makeDecoration(id,variant=0){
 const g=new Geometry(),r=random('mesh:'+id),gold='#eeb857',cream='#f5e9c4',dark='#3b5361';
 if(id==='birds')for(let j=0;j<3;j++){const x=-j*.65,z=j===1?-.9:j===2?.9:0;g.ellipsoid(x,.1,z,.43,.27,.25,'#4b9eaf',12,7);g.ellipsoid(x+.25,.30,z,.25,.24,.22,'#67b4bf',12,7);g.ellipsoid(x+.12,-.025,z,.34,.19,.23,'#f2e5bd',12,6);for(const side of[-1,1]){g.ellipsoid(x+.38,.35,z+side*.17,.045,.055,.027,'#253f4c',9,5);g.ellipsoid(x-.10,.16,z+side*.43,.32,.065,.38,'#4c9aac',12,6);g.ellipsoid(x-.5,.09,z+side*.09,.31,.04,.10,'#447f93',10,5)}for(const side of[-1,1])g.triangle([x+.48,.23,z+side*.09],[x+.70,.28,z],[x+.48,.34,z],'#e0ae58')}
 else if(id==='paperplanes'){
  const nose=[1.6,0,0],keel=[-1,-.24,0];for(const side of[-1,1]){const tip=[-.9,.08,side*1.2],fold=[-.8,.12,side*.23],rear=[-1.15,.06,side*.16];g.triangle(nose,tip,fold,side>0?'#fff3cf':'#e7d5ab');g.triangle(nose,fold,keel,'#ccad70');g.triangle(keel,fold,rear,'#efdcae');g.rod(nose,fold,.012,.012,'#c5a96e');g.rod(fold,tip,.009,.009,'#fdf6df')}
 }
 else if(id==='ufos'){
  const rings=[[0,.23],[.6,.40],[1.35,.26],[2.1,.04],[2.22,-.10],[1.75,-.27],[.8,-.46],[0,-.5]];
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<64;j++){const a=j*Math.PI/32,b=(j+1)*Math.PI/32,[r,y]=rings[i],[R,Y]=rings[i+1],v=(q,r,h)=>[Math.cos(q)*r,h,Math.sin(q)*r];g.quad(v(a,r,y),v(b,r,y),v(b,R,Y),v(a,R,Y),['#dae4e4','#b7d2d6','#a8bec9','#e6d69d','#708b9b','#506673','#344d61'][i])}
  g.ellipsoid(0,.30,0,.90,.76,.90,'#82c8d3',32,12,0,Math.PI/2);g.ellipsoid(0,.40,0,.69,.58,.69,'#abdfe2',24,10,0,Math.PI/2);
  for(let j=0;j<16;j++){const a=j*Math.PI/8;g.ellipsoid(Math.cos(a)*2.20,-.10,Math.sin(a)*2.20,.10,.045,.10,j%2?'#8ff8ed':'#fff2bb',8,5)}
  g.ellipsoid(0,-.49,0,.53,.06,.53,'#9deee4',24,6);
 }
 else if(id==='ufoLights'){for(let j=0;j<16;j++){const a=j*Math.PI/8;g.ellipsoid(Math.cos(a)*2.20,-.10,Math.sin(a)*2.20,.105,.05,.105,j%2?'#8ff8ed':'#fff2bb',8,5)}g.ellipsoid(0,-.50,0,.53,.062,.53,'#9deee4',24,6)}
 else if(id==='satellites')g.ellipsoid(0,0,0,.65,.65,.65,'#f3f5e6',8,5);
 else if(id==='unicorns'){g.ellipsoid(0,0,0,1.2,.6,.5,'#f3efff',14,8);g.ellipsoid(.95,.6,0,.45,.6,.4,'#fff9ed',12,8);g.cone(1.1,1,1.8,0,.10,'#e9d7a2',10);for(const side of[-1,1])g.triangle([0,.4,side*.3],[-.5,1.5,side*2],[-1,0,side*.5],'#faf9ff')}
 else if(id==='balloons'){
  g.ellipsoid(0,2,0,2,2.5,2,'#e89875',14,8);g.ellipsoid(.1,2.2,0,1.91,2.44,1.94,'#e9be69',10,8);
  g.box(0,-1.5,0,1.1,.65,.9,'#987552');for(const side of[-1,1])g.rod([side*.5,-1.2,0],[side*.9,.2,0],.045,.045,cream);
 }
 else if(id==='whales'){
  g.ellipsoid(0,0,0,3,1.05,1.3,'#67b4c9',16,8);g.ellipsoid(.3,-.43,0,2.5,.65,1.1,'#d7eee6',14,6);
  g.rod([-2,0,0],[-4,.25,0],.6,.6,'#67b4c9');for(const side of[-1,1])g.triangle([-4,.2,0],[-4.8,.65,side*1.6],[-3.2,.3,side*.6],'#5294ad');
  for(const side of[-1,1]){g.ellipsoid(1.8,.26,side*1.07,.11,.12,.06,dark,8,5);g.triangle([0,-.2,side],[-1,-.7,side*2.1],[1,-.4,side*1.1],'#67b4c9')}
 }
 else if(id==='dragons'){
  g.ellipsoid(0,0,0,2.4,.85,.75,'#ce6d53',12,7);g.rod([1.2,.3,0],[2.7,1,0],.7,.65,'#d8815b');g.ellipsoid(2.8,1,0,1,.5,.5,'#df9567',12,6);
  g.rod([-1.6,0,0],[-4,-.3,0],.3,.3,'#bd6650');for(const side of[-1,1]){g.triangle([.6,.3,side*.3],[-.7,1.1,side*4],[-2,.1,side*1.2],'#e6aa62');g.rod([2.2,1.2,side*.35],[1.7,2,side*.55],.12,.12,cream);g.ellipsoid(3,.99,side*.46,.09,.09,.05,dark,7,4)}
  for(let j=0;j<4;j++)g.cone(-1.4+j*.7,.6,1.25,0,.20,gold,5);
 }
 else if(id==='witches'){
  const skin='#f0c8aa',dress='#8966a4',hair='#815744';
  g.ellipsoid(-.03,.10,0,.28,.36,.31,dress,14,8);g.cone(-.08,-.40,.02,0,.43,'#75518e',12);
  g.ellipsoid(.18,.71,0,.29,.30,.27,skin,14,9);g.ellipsoid(-.04,.70,0,.20,.33,.29,hair,12,8);
  g.ellipsoid(.12,1.00,0,.52,.055,.46,'#79568f',16,6);g.cone(.03,1.01,1.63,0,.38,'#75518b',14);g.ellipsoid(-.15,1.55,0,.25,.09,.12,'#75518b',12,6);
  for(const side of[-1,1]){const z=side*.27;g.rod([-.05,-.15,z],[.30,-.41,z],.16,.17,skin);g.rod([.30,-.41,z],[.20,-.77,z],.13,.13,skin);g.ellipsoid(.30,-.87,z,.20,.12,.115,'#705046',12,6);g.rod([.06,.30,side*.27],[.40,.08,side*.29],.13,.13,skin);g.rod([.40,.08,side*.29],[.76,-.17,side*.12],.115,.115,skin);g.ellipsoid(.76,-.17,side*.12,.09,.085,.08,skin,10,6);g.ellipsoid(.425,.76,side*.10,.04,.047,.032,'#374352',9,5)}
  g.rod([-1.2,-.25,0],[1.35,-.25,0],.09,.09,'#9c7148');for(let j=0;j<9;j++){const a=j*Math.PI*2/9;g.rod([-1.10,-.25,0],[-1.9,-.25+Math.cos(a)*.21,Math.sin(a)*.28],.065,.065,'#e2bc70')}
 }
 else if(id==='heroes'){g.ellipsoid(0,0,0,.55,.20,.25,'#4ba7ac',12,6);g.ellipsoid(.65,.15,0,.23,.25,.22,'#efc5a4',12,7);for(const side of[-1,1]){g.rod([.2,.05,side*.22],[1.12,.06,side*.2],.13,.13,'#4ba7ac');g.rod([-.3,0,side*.15],[-1.05,-.15,side*.14],.16,.16,'#38576c')}g.quad([.2,.20,-.25],[-1.3,.1,-.6],[-1.3,.1,.6],[.2,.2,.25],'#e9a56b')}
 else if(id==='biplanes'||id==='airships'){
  g.ellipsoid(0,0,0,id==='airships'?3.7:1.6,id==='airships'?1.4:.35,id==='airships'?1.2:.35,id==='airships'?'#acc8ba':gold,14,7);
  if(id==='airships'){g.box(0,-1.35,0,1.6,.55,.7,'#926b51');g.box(-3,.3,0,1,.12,2,'#cc9d64')}
  else {for(const h of[-.3,.75]){g.box(-.15,h,0,.75,.12,4.8,'#f2ce79');for(const side of[-1,1])g.rod([-.15,-.3,side*1.7],[-.15,.75,side*1.7],.06,.06,dark)}g.box(-1.2,.25,0,.6,.1,1.4,'#f6e2a3');g.rod([1.6,-.65,0],[1.6,.65,0],.09,.08,dark)}
 }
 else if(id==='windmills'){
  g.cone(0,0,4.8,0,1.15,'#ded7ba',8);g.cone(0,4.5,5.8,0,1.4,'#a77961',8);
 }
 else if(id==='rotor'){for(const side of[-1,1]){g.box(0,side*1.35,0,.26,2.6,.10,cream);g.box(side*1.35,0,0,2.6,.26,.10,cream)}g.ellipsoid(0,0,0,.25,.25,.18,gold,8,5)}
 else if(id==='spectator')person(g,0,0,0,.75,['#efbb74','#a8cc9b','#b4b3d9'][variant%3]);
 else if(id==='crowds')for(let j=0;j<7;j++)person(g,(j-3)*.8,0,(j%2)*.7,.75,['#efbb74','#a8cc9b','#b4b3d9'][j%3]);
 else if(id==='dinosaurs'){
  const c=['#94b682','#a0b6be','#d4ad78'][variant%3];g.ellipsoid(0,1.8,0,2.8,1.3,1.1,c,12,7);
  g.rod([-2,1.7,0],[-4,.8,0],.45,.45,c);
  if(variant%3===0){g.rod([1.7,2,0],[2.7,5.2,0],.66,.66,c);g.ellipsoid(3,5.1,0,.85,.45,.45,c,10,6)}
  else {g.ellipsoid(2.6,2.1,0,1,.7,.7,c,10,6);if(variant%3===1){g.ellipsoid(1.8,2.5,0,.25,1.2,1.3,c,10,5);for(const k of[-1,1])g.rod([2.8,2.5,k*.36],[3.8,3,k*.45],.16,.14,cream)}else for(let j=0;j<5;j++)g.cone(-1.7+j*.65,2.7,3.8,0,.44,gold,5)}
  for(const side of[-1,1]){const hy=variant%3===0?5.2:2.35,hx=variant%3===0?3.38:3.05;g.ellipsoid(hx,hy,side*(variant%3===0?.37:.61),.15,.18,.075,'#f4edc9',10,6);g.ellipsoid(hx+.03,hy,side*(variant%3===0?.43:.68),.065,.085,.035,'#35454d',9,5)}
  for(const x of[-1.6,1.2])for(const side of[-1,1])g.rod([x,1.5,side*.7],[x+.2,.1,side*.8],.43,.43,c);
 }
 else if(id==='tumbleweeds'){
  g.ellipsoid(0,.7,0,.8,.8,.8,'#b8a06d',8,6);for(let j=0;j<12;j++){const a=j*Math.PI/6;g.rod([Math.cos(a),.7+Math.sin(a),-.1],[Math.cos(a+2),.7+Math.sin(a+2),.3],.05,.05,'#d7c491')}
 }
 else if(id==='snow'||id==='rain')for(let j=0;j<52;j++){
  const x=(r()-.5)*26,y=(r()-.5)*24,z=(r()-.5)*12;
  if(id==='snow')g.box(x,y,z,.07,.07,.07,'#f6fbff');else g.rod([x,y,z],[x-.08,y-.6,z],.025,.025,'#bbdce6');
 }
 else if(id==='fireballs'){g.ellipsoid(0,0,0,.65,.65,.65,'#ffac51',9,6);g.ellipsoid(.1,0,0,.4,.45,.45,'#ffe1a0',8,5);g.rod([-.1,0,0],[-1.4,-1.7,0],.35,.35,'#ee7751')}
 else if(id==='volcanoVent'){g.cone(0,0,5.4,0,4,'#55575d',9);g.ellipsoid(0,5.15,0,.8,.28,.8,'#f4a05e',10,5)}
 else if(id==='rainbows'){
  const colors=['#e88c83','#e8b074','#ebd382','#a9ca98','#86c8d5','#91a7cf','#b39acb'];for(let c=0;c<7;c++)for(let j=0;j<36;j++){const a=j*Math.PI/36,b=(j+1)*Math.PI/36,R=10-c*.3;g.quad([0,Math.sin(a)*R,Math.cos(a)*R],[0,Math.sin(b)*R,Math.cos(b)*R],[0,Math.sin(b)*(R-.28),Math.cos(b)*(R-.28)],[0,Math.sin(a)*(R-.28),Math.cos(a)*(R-.28)],colors[c])}
 }
 else if(id==='fireflies')for(let j=0;j<20;j++)g.ellipsoid((r()-.5)*5,r()*2,(r()-.5)*4,.07,.085,.07,'#f8e496',6,3);
 else if(id==='butterflies')for(let j=0;j<7;j++){const x=(r()-.5)*4,y=r()*2,z=(r()-.5)*4;for(const side of[-1,1])g.ellipsoid(x,y,z+side*.22,.19,.035,.28,j%2?'#e7a5c8':'#f0c97e',8,4)}
 else if(id==='islands'){
  g.cone(0,0,-3,0,3,'#92978a',9);g.ellipsoid(0,.15,0,3,.45,2.5,'#9cbc82',12,6);for(let j=0;j<4;j++){g.rod([j-1.5,.3,0],[j-1.5,1,0],.06,.06,'#75955d');g.ellipsoid(j-1.5,1,0,.25,.2,.25,j%2?'#dfada9':'#f2d986',8,4)}
 }
 else if(id==='meteors'){g.ellipsoid(0,0,0,.23,.23,.23,'#fff5bb',8,5);for(let j=0;j<6;j++)g.rod([-j*.8,-j*.13,0],[-(j+1)*.8,-(j+1)*.13,0],.17-j*.02,.17-j*.02,j<2?'#eed99a':'#d8cfba')}
 else if(id==='cloudsheep'){
  for(let j=0;j<6;j++)g.ellipsoid((j%3-1)*.65,Math.floor(j/3)*.5,0,.75,.65,.8,'#f1efe1',10,6);g.ellipsoid(1.5,-.1,0,.55,.55,.45,'#bcae9a',10,6);for(const z of[-.28,.28])g.ellipsoid(1.87,.03,z,.05,.06,.04,dark,6,4);
 }
 else if(id==='robots'){
  g.box(0,0,0,.6,.65,.55,'#9fc5cc');g.box(0,.6,0,.72,.52,.62,'#cadbdd');g.box(.37,.62,0,.04,.20,.40,dark);for(const side of[-1,1]){g.box(0,-.6,side*.2,.22,.5,.22,dark);g.rod([0,.15,side*.45],[.4,-.15,side*.65],.16,.16,'#a6bec4');g.cone(-.34,-.4,-1.3,side*.27,.17,gold,6)}g.box(.40,-.05,0,.18,.36,.45,'#e8c886');
 }
 else if(id==='jellyfish'){
  g.ellipsoid(0,.2,0,1.6,.9,1.6,'#d8b6d5',14,8,0,Math.PI/2);for(let j=0;j<8;j++){const a=j*Math.PI/4;g.rod([Math.cos(a),.2,Math.sin(a)],[Math.cos(a)*.8,-2.3,Math.sin(a)*.8],.08,.08,j%2?'#b7d8d8':'#e4c2db')}
 }
 else if(id==='kites')for(let j=0;j<4;j++){
  const x=-j*.9,y=j*.8,z=j*.7,c=['#e5a585','#e6cd8d','#9bbebb','#bca7ce'][j];g.quad([x,y+1,z],[x+.6,y,z],[x,y-.6,z],[x-.6,y,z],c);g.rod([x,y-.6,z],[x-.8,y-2,z],.025,.025,cream);
 }
 const data=g.array();if(!variant){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];let radius=0;for(let i=0;i<data.length;i+=9){for(let k=0;k<3;k++){min[k]=Math.min(min[k],data[i+k]);max[k]=Math.max(max[k],data[i+k])}radius=Math.max(radius,Math.hypot(data[i],data[i+1],data[i+2]))}MODEL_BOUNDS.set(id,{min,max,radius})}return data;
}
export function safeFromRiders(point,radius,world,players){return players.every(p=>{const a=world.sample(p.lane,p.renderDistance??p.distance).point;return Math.hypot(...sub(point,[a[0],a[1]+1,a[2]]))>radius+4.2})}
export function safeDecoration(item,world,players){if(item.id==='tumbleweeds'&&players.some(p=>Math.abs(world.sample(p.lane,p.renderDistance??p.distance).point[0]-item.point[0])<18))return false;if(item.id==='crowds')return crowdPositions(world,item).every(point=>safeFromRiders(point,1.5,world,players));if(item.id==='windmills')return players.every(p=>{const a=add(world.sample(p.lane,p.renderDistance??p.distance).point,[0,1,0]),q=item.point,dx=Math.max(0,Math.abs(a[0]-q[0])-2.8),dz=Math.max(0,Math.abs(a[2]-q[2])-1.3),dy=Math.max(0,q[1]-a[1],a[1]-q[1]-6);return Math.hypot(dx,dy,dz)>4.2});return safeFromRiders(item.point,item.radius,world,players)}
export function fadeWindow(x,start,end,ramp=1,exitRamp=ramp){const a=ramp?clamp((x-start)/ramp,0,1):1,b=exitRamp?clamp((end-x)/exitRamp,0,1):1;return a*a*(3-2*a)*b*b*(3-2*b)}
export class DecorationSystem{
 constructor(world,settings={}){this.world=world;this.visible=new Map();this.lastClock=null;this.escorts=new FlightDirector(world);this.setSettings(settings)}
 setSettings(settings){this.settings=settings;this.enabled=normalizeDecorations(settings.decorations);this.density=settings.decorationDensity||'medium'}
 instances(players,clock,quality='medium',views=[]){
  const budget=Math.min(DENSITY_BUDGET[this.density]??16,quality==='low'?12:30);if(!budget){this.visible.clear();return[]}const dt=this.lastClock===null||clock<this.lastClock?0:Math.min(.25,clock-this.lastClock);if(this.lastClock!==null&&clock<this.lastClock)this.visible.clear();this.lastClock=clock;
  const escorts=[...this.escorts.instances(players,clock,views,this.enabled,this.density,this.settings),...skyEvents(this.world,clock,this.enabled)];const w=this.world,positions=players.map(p=>w.sample(p.lane,p.renderDistance??p.distance).point),slots=new Set(),out=[];
  for(const p of positions)for(let i=Math.max(1,Math.floor((p[0]-100)/30));i<=Math.ceil((p[0]+110)/30)&&i*30<WORLD_DRAW_END-35;i++)slots.add(i);
  for(const slot of slots){
   const anchor=slot*30,r=random(w.seed+':decor:'+slot),theme=w.themeAtX(anchor).id;
   const pool=DECORATIONS.filter(d=>this.enabled[d.id]&&!FLIGHT_TYPES.includes(d.id)&&(d.id!=='snow'||theme==='snow')&&(d.id!=='fireballs'||theme==='volcano'));
   if(!pool.length)continue;const def=pool[(slot+hash32(w.seed)%pool.length)%pool.length],id=def.id,side=r()>.5?1:-1,phase=r()*6.283,track=w.routes.map((_,i)=>w.pointAtX(i,anchor));
   const weather=clock%40;let alpha=1;if(id==='rain')alpha=fadeWindow(weather,0,15,2);if(id==='rainbows')alpha=fadeWindow(weather,15,40,2);if(id==='fireflies')alpha*=nightAt(w,anchor,this.settings);if(alpha===0)continue;
   let x=anchor,z=(side<0?Math.min(...track.map(p=>p[2])):Math.max(...track.map(p=>p[2])))+side*(7+r()*6),y=w.terrainY(x,z),size=1,radius=3,motion=0,rotation=0,variant=0,source=null,forward=null;
   if(def.zone==='sky'){
    x+=Math.sin(clock*.15+phase)*8;y=track[(slot%3)][1]+7+r()*5+Math.sin(clock*.7+phase)*.6;z+=side*4;
    if(['whales','dragons','airships','islands'].includes(id)){size=1.35;radius=8;y+=2}
    if(['birds','dragons','butterflies','paperplanes'].includes(id))motion=1;
    if(id==='fireballs'){source=[anchor,w.terrainY(anchor,z),z];const t=(clock*.3+phase)%1;x=anchor+Math.sin(phase)*t*7;y=source[1]+5.5+Math.sin(t*Math.PI)*13;radius=2;alpha*=fadeWindow(t,0,1,.12)}
    if(id==='meteors'){const t=((clock*6+phase*10)%24)/24;x=anchor+t*24-12;y+=6;radius=6;alpha*=fadeWindow(t,0,1,.12)}
    if(id==='rainbows'){y=Math.max(...track.map(p=>p[1]))+8;radius=11}
    if(id==='jellyfish')motion=3;
   }else if(def.zone==='weather'){y=Math.max(...track.map(p=>p[1]))+7;z+=side*8;radius=20;motion=id==='snow'?4:5}
   else if(id==='dinosaurs'){const t=clock*.2+phase;x+=Math.sin(t)*4;z+=Math.cos(t)*.8;y=w.footingY(x,z,2.9);forward=normalize([Math.cos(t),0,-Math.sin(t)*.2]);radius=6;variant=slot%3;motion=2}
   else if(id==='tumbleweeds'){
    // It crosses the shared tracks only when every cart is safely away from the whole crossing.
    const t=(clock*.13+phase)%1;x=anchor;const lo=Math.min(...track.map(p=>p[2]))-12,hi=Math.max(...track.map(p=>p[2]))+12;z=lo+(hi-lo)*t;
    if(positions.some(p=>Math.abs(p[0]-anchor)<18))continue;y=w.footingY(x,z,.9)+.10;radius=1.7;rotation=clock*2;alpha*=fadeWindow(t,0,1,.12);
   }else if(id==='windmills'){radius=4;z=(side<0?track[0][2]:track[2][2])+side*6.5;y=w.footingY(x,z,.8)}
   else if(id==='crowds'){motion=6;z=(side<0?track[0][2]:track[2][2])+side*6.2;y=w.footingY(x,z,.25)}
   else if(id==='fireflies'){motion=7;y+=1}
   radius=Math.max(radius,DECORATION_RADII[id]*size);const point=[x,y,z];if(!safeDecoration({id,point,radius},w,players)||source&&!safeFromRiders(source,7,w,players))continue;
   const nearest=Math.min(...positions.map(p=>Math.abs(p[0]-x)));if(id==='tumbleweeds')alpha*=fadeWindow(nearest,18,Infinity,15,0);out.push({id,key:`ambient:${slot}:${id}`,point,size,radius,phase,motion,rotation,variant,nearest,side,source,forward,sourceAlpha:fadeWindow(nearest,0,110,0,22),alpha:alpha*fadeWindow(nearest,0,110,0,22)});
  }
  // Reserve three companion places so a new flight cannot evict a visible roadside object.
  const slotsAvailable=Math.max(0,budget-escorts.filter(o=>!o.distant).length),chosen=out.sort((a,b)=>a.nearest-b.nearest).slice(0,slotsAvailable),keys=new Set(chosen.map(v=>v.key)),candidates=new Map(out.map(v=>[v.key,v]));
  for(const [key,state] of this.visible){
   if(candidates.has(key))state.item=candidates.get(key);
   state.opacity=keys.has(key)?Math.min(1,state.opacity+dt/1.1):Math.max(0,state.opacity-dt/.9);
   if(!this.enabled[state.item.id]||!safeDecoration(state.item,w,players)||state.opacity===0&&!keys.has(key))this.visible.delete(key);
  }
  for(const item of chosen)if(!this.visible.has(item.key)&&this.visible.size<slotsAvailable)this.visible.set(item.key,{item,opacity:0});
  const ambient=[...this.visible.values()].slice(0,slotsAvailable).map(s=>({...s.item,alpha:s.item.alpha*s.opacity,sourceAlpha:s.item.sourceAlpha*s.opacity}));const close=escorts.filter(o=>!o.distant).sort((a,b)=>Math.min(...positions.map(p=>Math.hypot(...sub(p,a.point))))-Math.min(...positions.map(p=>Math.hypot(...sub(p,b.point)))));return [...escorts.filter(o=>o.distant),...close.slice(0,budget),...ambient.slice(0,Math.max(0,budget-close.length))];
 }
}
