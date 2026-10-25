import {random, clamp} from './math.js?v=1.5.0';
export const METRES_PER_UNIT=1.6, ROUTE_METRES=5000, WORLD_END=4700/METRES_PER_UNIT;
export const RUNOUT_METRES=600, WORLD_DRAW_END=WORLD_END+RUNOUT_METRES/METRES_PER_UNIT;
export const TERRAIN_STEP=17/16, TRACK_SHOULDER=1.42;
const LAND_SCALE=10/METRES_PER_UNIT;
export const THEMES=[
 {id:'forest',name:'森林',sky:'#8bc6d8',fog:'#a5c9bb',ground:'#6b9f62',tree:'#296947',light:'#8bba69'},
 {id:'hills',name:'丘陵',sky:'#9ecbdc',fog:'#b9d2b3',ground:'#96b96a',tree:'#527d4a',light:'#c5ce80'},
 {id:'snow',name:'雪地',sky:'#accfe8',fog:'#dae8ee',ground:'#e3eced',tree:'#4e7a7c',light:'#f6f8ec'},
 {id:'volcano',name:'火山',sky:'#b99d98',fog:'#bba99a',ground:'#5c5e60',tree:'#353c47',light:'#f88342'},
 {id:'pastoral',name:'田園',sky:'#a4d1db',fog:'#b5d1aa',ground:'#a7ba64',tree:'#567b46',light:'#e7cb77'},
 {id:'desert',name:'沙漠',sky:'#bad3d6',fog:'#e4c89e',ground:'#dcb77d',tree:'#5d8872',light:'#f3d39a'},
 {id:'country',name:'鄉下',sky:'#9cc8da',fog:'#b9d2b5',ground:'#7ca36d',tree:'#3f7551',light:'#d5ba78'},
 {id:'lake',name:'湖畔',sky:'#98cadb',fog:'#a3c8c7',ground:'#82ad83',tree:'#477d63',light:'#c3d7a4'}
];
export const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const vlerp=(a,b,t)=>a.map((x,i)=>lerp(x,b[i],t));
export const normalize=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n)};
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const scale=(v,k)=>v.map(x=>x*k);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export class SharedWorld{
 constructor(seed){
  this.seed=String(seed);const r=random(this.seed+':world');
  const first=Math.floor(r()*8);let second=Math.floor(r()*7);if(second>=first)second++;
  this.themes=[THEMES[first],THEMES[second]];
  this.phases=Array.from({length:6},()=>r()*Math.PI*2);
  this.turns=1.2+r()*.65;
  this.routes=Array.from({length:3},(_,lane)=>this.makeRoute(lane,r));
  // Raised stretches occupy a seeded fraction of arc length; the rest hugs the ground.
  this.groundFraction=.50+r()*.35;
  const width=(1-this.groundFraction)*ROUTE_METRES/5;
  this.landforms=Array.from({length:5},(_,i)=>({center:650+i*920,start:650+i*920-width/2,end:650+i*920+width/2,kind:i%2?'canyon':'river',depth:i%2?10:4.2}));
  this.caves=[1110,2030,3870];
  this.terrainRows=new Map();
 }
 envelope(t){return smooth(t/.1)*smooth((1-t)/.1)}
 centerZ(t){return this.envelope(t)*LAND_SCALE*(12*Math.sin(2*Math.PI*this.turns*t+this.phases[0])+5*Math.sin(6*Math.PI*t+this.phases[1]))}
 baseY(t){return this.envelope(t)*LAND_SCALE*(2.2+2*Math.sin(4*Math.PI*t+this.phases[2]))}
 terrainY(x,z){
  const t=clamp(x/WORLD_END,0,1),base=this.baseY(t);let h=base-.18;
  if(this.routes){const ps=this.routes.map((_,i)=>this.pointAtX(i,x));
   const ys=ps.map((p,i)=>{const dz=(this.pointAtX(i,x+.05)[2]-this.pointAtX(i,x-.05)[2])/.10,xc=x+dz*(z-p[2])/(1+dz*dz);return this.pointAtX(i,xc)[1]-this.trackClearance(i,xc)}),inside=ps.findIndex(p=>Math.abs(z-p[2])<=TRACK_SHOULDER);
   if(inside>=0)h=ys[inside];
   else if(z<ps[0][2])h=lerp(ys[0],base-.18,smooth((ps[0][2]-z-8)/36));
   else if(z>ps[2][2])h=lerp(ys[2],base-.18,smooth((z-ps[2][2]-8)/36));
   else {const j=z<ps[1][2]?0:1;h=lerp(ys[j],ys[j+1],clamp((z-ps[j][2]-TRACK_SHOULDER)/(ps[j+1][2]-ps[j][2]-2*TRACK_SHOULDER),0,1));}
  }
  const near=Math.min(...this.routes.map((_,i)=>Math.abs(this.pointAtX(i,x)[2]-z)));
  const gate=Math.min(Math.abs(x),Math.abs(x-WORLD_END));
  return h+.22*Math.sin(x*.031+z*.09)*smooth((near-8)/14)*smooth((gate-25)/35);
 }
 terrainRow(x){
  const cached=this.terrainRows?.get(x);if(cached)return cached;
  const c=this.centerZ(clamp(x/WORLD_END,0,1)),ps=this.routes.map((_,i)=>this.pointAtX(i,x)[2]);
  const zs=[c-65,c-44,ps[0]-16,ps[0]-8,...ps.flatMap(z=>[z-TRACK_SHOULDER,z,z+TRACK_SHOULDER]),ps[2]+8,ps[2]+16,c+44,c+65].sort((a,b)=>a-b);
  const row=zs.filter((z,i)=>!i||z-zs[i-1]>1e-6).map(z=>[x,this.terrainY(x,z),z]);
  if(this.terrainRows){this.terrainRows.set(x,row);if(this.terrainRows.size>384)this.terrainRows.delete(this.terrainRows.keys().next().value)}return row;
 }
 surfaceY(x,z){
  const x0=Math.floor(x/TERRAIN_STEP)*TERRAIN_STEP,x1=Math.min(WORLD_DRAW_END,x0+TERRAIN_STEP);if(x1<=x0)return this.terrainY(x,z);
  const a=this.terrainRow(x0),b=this.terrainRow(x1),t=(x-x0)/(x1-x0);
  for(let j=0;j<a.length-1;j++)if(z>=lerp(a[j][2],b[j][2],t)-1e-8&&z<=lerp(a[j+1][2],b[j+1][2],t)+1e-8){
   for(const tri of[[a[j],b[j],b[j+1]],[a[j],b[j+1],a[j+1]]]){const [A,B,C]=tri,det=(B[2]-C[2])*(A[0]-C[0])+(C[0]-B[0])*(A[2]-C[2]);if(Math.abs(det)<1e-12)continue;const u=((B[2]-C[2])*(x-C[0])+(C[0]-B[0])*(z-C[2]))/det,v=((C[2]-A[2])*(x-C[0])+(A[0]-C[0])*(z-C[2]))/det;if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)return A[1]*u+B[1]*v+C[1]*(1-u-v)}
  }return this.terrainY(x,z);
 }
 footingY(x,z,r=.35){let y=-Infinity;for(const dx of[-r,0,r])for(const dz of[-r,0,r])y=Math.max(y,this.surfaceY(x+dx,z+dz));return y+.055}
 distanceAtX(lane,x){const route=this.routes[lane],v=clamp(x/WORLD_END,0,1)*(route.distances.length-1),i=Math.floor(v);return lerp(route.distances[i],route.distances[Math.min(i+1,route.distances.length-1)],v-i)}
 featureAt(lane,x){const d=this.distanceAtX(lane,x);return this.landforms?.find(f=>d>=f.start&&d<=f.end)||null}
 trackClearance(lane,x){if(x<=0||x>=WORLD_END||!this.landforms)return .18;const d=this.distanceAtX(lane,x),f=this.featureAt(lane,x);if(!f)return .18;return .18+(f.depth-.18)*smooth(Math.min(d-f.start,f.end-d)/28)}
 makeRoute(lane,r){
  const side=lane-1,fs=[1.4,1.55],phases=[this.phases[4],this.phases[5]],turn=r()*1.2+.8;
  const raw=(t,amps)=>{
   const half=t<.5?0:1,u=half?2*t-1:2*t;
   const hill=smooth(u/.12)*smooth((1-u)/.12)*Math.sin(2*Math.PI*fs[half]*u+phases[half])**2;
   const env=this.envelope(t),separation=3.2+5*Math.sin(Math.PI*t)**2*(.5+.5*Math.sin(4*Math.PI*t+this.phases[3]))**2;
   return [WORLD_END*t,this.baseY(t)+amps[half]*hill,
    this.centerZ(t)+side*separation+env*.09*Math.sin(2*Math.PI*turn*t+phases[0])];
  };
  const count=1600,length=(amp,half)=>{const amps=[amp,amp];let prev=raw(half/2,amps),len=0;for(let j=1;j<=count/2;j++){const p=raw(half/2+j/count,amps);len+=Math.hypot(...sub(p,prev));prev=p}return len};
  // Each half is exactly 2.5 km, so every player enters the shared second biome at 50%.
  const amplitudes=[0,1].map(half=>{let lo=0,hi=WORLD_END*.07;for(let j=0;j<38;j++){const mid=(lo+hi)/2;if(length(mid,half)<ROUTE_METRES/METRES_PER_UNIT/2)lo=mid;else hi=mid}return (lo+hi)/2});
  const points=[],distances=[0];
  for(let j=0;j<=count;j++){const p=raw(j/count,amplitudes);points.push(p);if(j)distances.push(distances.at(-1)+Math.hypot(...sub(p,points[j-1]))*METRES_PER_UNIT)}
  return {points,distances,length:distances.at(-1),amplitudes,evaluate:t=>raw(clamp(t,0,1),amplitudes)};
 }
 sample(lane,metres){
  if(metres<=0||metres>=ROUTE_METRES){const x=metres<=0?metres/METRES_PER_UNIT:WORLD_END+(metres-ROUTE_METRES)/METRES_PER_UNIT;return {point:[x,0,(lane-1)*3.2],forward:[1,0,0],right:[0,0,1]}}
  const route=this.routes[lane],ds=route.distances,n=ds.length-1;let lo=0,hi=n;
  while(lo+1<hi){const m=(lo+hi)>>1;if(ds[m]<=metres)lo=m;else hi=m}
  const f=clamp((metres-ds[lo])/(ds[hi]-ds[lo]),0,1),t=(lo+f)/n,point=route.evaluate(t);
  // Evaluate a continuous tangent, rather than holding one tangent for each five-metre segment.
  const e=1e-5,forward=normalize(sub(route.evaluate(Math.min(1,t+e)),route.evaluate(Math.max(0,t-e))));
  return {point,forward,right:normalize(cross(forward,[0,1,0]))};
 }
 pointAtX(lane,x){if(x<=0||x>=WORLD_END)return [x,0,(lane-1)*3.2];return this.routes[lane].evaluate(x/WORLD_END)}
 themeAtX(x){return this.themes[x<WORLD_END*.5?0:1]}
 themeAt(lane,metres){return this.themeAtX(this.sample(lane,metres).point[0])}
 blendAt(x){return smooth((x-WORLD_END*.5+9)/18)}
}
