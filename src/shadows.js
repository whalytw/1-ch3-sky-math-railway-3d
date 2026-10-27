import {Geometry} from './geometry.js?v=1.6.0';
import {normalize,sub} from './world.js?v=1.6.0';
import {clamp} from './math.js?v=1.6.0';
import {artParts} from './artwork.js?v=1.6.0';

// Receivers are actual terrain and track beds/decks, never a camera-facing decal.
export function receiverY(w,x,z){const row=w.terrainRow(Math.floor(x));if(z<row[0][2]||z>row.at(-1)[2])return null;let y=w.surfaceY(x,z);
 for(let lane=0;lane<3;lane++){const a=w.pointAtX(lane,x),t=(w.pointAtX(lane,x+.1)[2]-w.pointAtX(lane,x-.1)[2])/.2,xx=x+t*(z-a[2])/(1+t*t),b=w.pointAtX(lane,xx);if(Math.hypot(x-xx,z-b[2])<.825)y=Math.max(y,b[1]-(w.trackClearance(lane,xx)>.6?.175:.11))}return y+.012;
}
function ellipse(g,w,c,rx,rz,angle,opacity,steps=18){const ca=Math.cos(angle),sa=Math.sin(angle),rings=[0,.55,1],alphas=[opacity,opacity*.72,0],point=(r,a)=>{const x=c[0]+Math.cos(a)*rx*r*ca-Math.sin(a)*rz*r*sa,z=c[2]+Math.cos(a)*rx*r*sa+Math.sin(a)*rz*r*ca,y=receiverY(w,x,z);return y===null?null:[x,y,z]};
 const tri=(a,b,c,aa,ab,ac)=>{if(!a||!b||!c||Math.max(a[1],b[1],c[1])-Math.min(a[1],b[1],c[1])>1.2)return;for(const [p,v]of[[a,aa],[b,ab],[c,ac]])g.v.push(...p,0,1,0,v,v,v)};
 for(let k=0;k<2;k++)for(let j=0;j<steps;j++){const a=j*Math.PI*2/steps,b=(j+1)*Math.PI*2/steps,A=point(rings[k],a),B=point(rings[k+1],a),C=point(rings[k+1],b),D=point(rings[k],b);tri(A,B,C,alphas[k],alphas[k+1],alphas[k+1]);if(k)tri(A,C,D,alphas[k],alphas[k+1],alphas[k])}
}
export function shadowCenter(w,point){let y=receiverY(w,point[0],point[2]);if(y===null)return null;let h=Math.max(0,point[1]-y),x=point[0]+h*.33,z=point[2]-h*.31;for(let j=0;j<2;j++){y=receiverY(w,x,z);if(y===null)return null;h=Math.max(0,point[1]-y);x=point[0]+h*.33;z=point[2]-h*.31}return {point:[x,y,z],height:h};}
export function buildShadowGeometry(w,players,items,clock,mode='standard'){
 const g=new Geometry(),glow=new Geometry();if(mode==='off')return {shadow:g.array(),glow:glow.array()};const steps=mode==='fine'?24:14,positions=players.map(p=>w.sample(p.lane,p.renderDistance??p.distance).point);
 for(const p of players){const s=w.sample(p.lane,p.renderDistance??p.distance),a=Math.atan2(s.forward[2],s.forward[0]),c=shadowCenter(w,[s.point[0],s.point[1]+.8,s.point[2]]);ellipse(g,w,s.point,1.02,.72,a,.34,steps);if(c)ellipse(g,w,c.point,1.25,.83,a,.18,steps)}
 const casters=items.flatMap(o=>['birds','butterflies'].includes(o.id)?artParts(o,clock).map(part=>({...o,point:part.point,phase:part.phase,count:1})):o);
 for(const o of casters){if(o.distant||o.alpha<.02||['snow','rain','fireballs','rainbows','meteors','satellites','fireflies'].includes(o.id))continue;if(Math.min(...positions.map(p=>Math.hypot(...sub(p,o.point))))>95)continue;const c=shadowCenter(w,o.point);if(!c||c.height>48)continue;const s=o.size||1,f=normalize(o.forward||[1,0,0]),a=Math.atan2(f[2],f[0]),blur=1+c.height*.025,alpha=(o.alpha??1)*clamp(.31-c.height*.005,.045,.31),radius={airships:3.1,balloons:1.6,whales:2.4,dragons:1.4,unicorns:1.3,biplanes:1.4,ufos:2.0,dinosaurs:2.7,windmills:1.4,crowds:3,birds:.5,butterflies:.25,kites:.65,paperplanes:.7,jellyfish:1.1}[o.id]||.8;
  ellipse(g,w,c.point,radius*s*blur,radius*s*.65*blur,a,alpha,steps);
  if(['birds','dragons','unicorns','biplanes','paperplanes'].includes(o.id)){const spread=(o.id==='biplanes'||o.id==='paperplanes'?1: .72+.23*Math.cos(clock*(o.id==='birds'?10.3:4.8)+(o.phase||0)))*s;for(const side of[-1,1]){const p=[c.point[0]-f[2]*side*spread,c.point[1],c.point[2]+f[0]*side*spread];ellipse(g,w,p,.65*s*blur,.8*spread*blur,a,alpha*.7,steps)}}
  if(o.id==='windmills'){for(let k=0;k<4;k++){const angle=clock*1.25+k*Math.PI/2,p=[c.point[0]+Math.cos(angle)*1.8,c.point[1],c.point[2]+Math.sin(angle)*1.1];ellipse(g,w,p,.85,.18,angle,alpha*.7,steps)}}
  if(['unicorns','jellyfish','ufos'].includes(o.id)&&c.height<18)ellipse(glow,w,[o.point[0],0,o.point[2]],radius*s*1.7,radius*s*1.7,0,(o.alpha??1)*.12*(1-c.height/18),steps);
 }
 return {shadow:g.array(),glow:glow.array()};
}
