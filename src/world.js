import {random, clamp} from './math.js?v=1.0.0';
export const METRES_PER_UNIT=10, ROUTE_METRES=5000, WORLD_END=470;
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
 }
 envelope(t){return smooth(t/.1)*smooth((1-t)/.1)}
 centerZ(t){return this.envelope(t)*(12*Math.sin(2*Math.PI*this.turns*t+this.phases[0])+5*Math.sin(6*Math.PI*t+this.phases[1]))}
 baseY(t){return this.envelope(t)*(2.2+2*Math.sin(4*Math.PI*t+this.phases[2]))}
 terrainY(x,z){
  const t=clamp(x/WORLD_END,0,1),base=this.baseY(t);let h=base;
  if(this.routes){const ps=this.routes.map((_,i)=>this.pointAtX(i,x));
   if(z<ps[0][2])h=lerp(ps[0][1],base,smooth((ps[0][2]-z)/23));
   else if(z>ps[2][2])h=lerp(ps[2][1],base,smooth((z-ps[2][2])/23));
   else {const j=z<ps[1][2]?0:1;h=lerp(ps[j][1],ps[j+1][1],(z-ps[j][2])/(ps[j+1][2]-ps[j][2]));}
  }
  return h-3.4+.16*Math.sin(x*.19+z*.1);
 }
 makeRoute(lane,r){
  const side=lane-1,fs=[1.4+side*.055,1.55-side*.05],phases=[this.phases[4]+side*.12,this.phases[5]-side*.12],turn=r()*1.2+.8;
  const raw=(t,amps)=>{
   const half=t<.5?0:1,u=half?2*t-1:2*t;
   const hill=smooth(u/.12)*smooth((1-u)/.12)*Math.sin(2*Math.PI*fs[half]*u+phases[half])**2;
   const env=this.envelope(t),separation=3.2+5*Math.sin(Math.PI*t)**2*(.5+.5*Math.sin(4*Math.PI*t+this.phases[3]))**2;
   return [WORLD_END*t,this.baseY(t)+amps[half]*hill,
    this.centerZ(t)+side*separation+env*1.05*Math.sin(2*Math.PI*turn*t+phases[0])];
  };
  const count=1000,length=(amp,half)=>{const amps=[amp,amp];let prev=raw(half/2,amps),len=0;for(let j=1;j<=count/2;j++){const p=raw(half/2+j/count,amps);len+=Math.hypot(...sub(p,prev));prev=p}return len};
  // Each half is exactly 2.5 km, so every player enters the shared second biome at 50%.
  const amplitudes=[0,1].map(half=>{let lo=0,hi=60;for(let j=0;j<42;j++){const mid=(lo+hi)/2;if(length(mid,half)<ROUTE_METRES/METRES_PER_UNIT/2)lo=mid;else hi=mid}return (lo+hi)/2});
  const points=[],distances=[0];
  for(let j=0;j<=count;j++){const p=raw(j/count,amplitudes);points.push(p);if(j)distances.push(distances.at(-1)+Math.hypot(...sub(p,points[j-1]))*METRES_PER_UNIT)}
  return {points,distances,length:distances.at(-1),amplitudes};
 }
 sample(lane,metres){
  const route=this.routes[lane],ds=route.distances,n=ds.length-1,d=clamp(metres,0,ROUTE_METRES);let lo=0,hi=n;
  while(lo+1<hi){const m=(lo+hi)>>1;if(ds[m]<=d)lo=m;else hi=m}
  const f=clamp((d-ds[lo])/(ds[hi]-ds[lo]),0,1),point=vlerp(route.points[lo],route.points[hi],f);
  // Centred tangents keep the chase camera steady across polyline samples.
  const a=route.points[Math.max(0,lo-1)],b=route.points[Math.min(n,hi+1)],forward=normalize(sub(b,a));
  return {point,forward,right:normalize(cross(forward,[0,1,0]))};
 }
 pointAtX(lane,x){const points=this.routes[lane].points,t=clamp(x/WORLD_END,0,1)*1000,i=Math.min(999,Math.floor(t));return vlerp(points[i],points[i+1],t-i)}
 themeAtX(x){return this.themes[x<WORLD_END*.5?0:1]}
 themeAt(lane,metres){return this.themeAtX(this.sample(lane,metres).point[0])}
 blendAt(x){return smooth((x-WORLD_END*.5+9)/18)}
}
