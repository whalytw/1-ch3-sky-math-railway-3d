/* 原生 WebGL2 輕量 3D 引擎：單一 Context，三個 scissor viewport。免 CDN、免 npm，能在 GitHub Pages 直接執行。 */
import {graphValue,clamp} from './math.js';
const vs=`#version 300 es
in vec3 aPosition;in vec3 aNormal;in vec3 aColor;
uniform mat4 uMvp;uniform vec3 uEye;
out vec3 vColor;out float vFog;
void main(){gl_Position=uMvp*vec4(aPosition,1.0);float light=max(0.0,dot(normalize(aNormal),normalize(vec3(-0.3,0.85,0.75))));vColor=aColor*(0.66+0.34*light);vFog=clamp((distance(aPosition,uEye)-12.0)/32.0,0.0,0.72);}`;
const fs=`#version 300 es
precision mediump float;in vec3 vColor;in float vFog;out vec4 fragColor;
void main(){fragColor=vec4(mix(vColor,vec3(0.28,0.51,0.65),vFog),1.0);}`;
function compile(gl,kind,code){const s=gl.createShader(kind);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
function shaderProgram(gl){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
const minus=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const normalize=a=>{let n=Math.hypot(...a)||1;return a.map(v=>v/n)};
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const mul=(a,k)=>a.map(v=>v*k);
const hex=s=>{const n=parseInt(s.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
function matMul(a,b){const out=Array(16).fill(0);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];return out}
function perspective(fovy,aspect,n,f){const t=1/Math.tan(fovy/2),v=1/(n-f);return [t/aspect,0,0,0,0,t,0,0,0,0,(f+n)*v,-1,0,0,(2*f*n)*v,0]}
function lookAt(eye,at,up){const z=normalize(minus(eye,at)),x=normalize(cross(up,z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]}
class Geometry{
 constructor(){this.v=[]}
 triangle(a,b,c,col){const norm=normalize(cross(minus(b,a),minus(c,a))),clr=typeof col==='string'?hex(col):col;for(const p of [a,b,c])this.v.push(...p,...norm,...clr)}
 quad(a,b,c,d,col){this.triangle(a,b,c,col);this.triangle(a,c,d,col)}
 box(x,y,z,w,h,d,c){const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],c);this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],c);this.quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],c);this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],c);this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],c);this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],c)}
 rod(a,b,width,depth,c){const d=normalize(minus(b,a)),side=normalize(cross([0,0,1],d));const w=mul(side,width/2),t=[0,0,depth/2];const A=add(a,w),B=minus(a,w),C=add(b,w),D=minus(b,w);this.quad(add(A,t),add(C,t),add(D,t),add(B,t),c);this.quad(minus(B,t),minus(D,t),minus(C,t),minus(A,t),c);this.quad(add(A,t),minus(A,t),minus(C,t),add(C,t),c);this.quad(add(D,t),minus(D,t),minus(B,t),add(B,t),c);this.quad(add(C,t),minus(C,t),minus(D,t),add(D,t),c)}
 sphere(x,y,z,r,c,sections=8,rings=5){for(let i=0;i<rings;i++){let lat1=-Math.PI/2+i*Math.PI/rings,lat2=-Math.PI/2+(i+1)*Math.PI/rings;for(let j=0;j<sections;j++){let lon1=j*2*Math.PI/sections,lon2=(j+1)*2*Math.PI/sections;const p=(lat,lon)=>[x+r*Math.cos(lat)*Math.cos(lon),y+r*Math.sin(lat),z+r*Math.cos(lat)*Math.sin(lon)];this.quad(p(lat1,lon1),p(lat1,lon2),p(lat2,lon2),p(lat2,lon1),c)}}}
 cone(x,topY,bottomY,z,radius,c,sides=7){for(let i=0;i<sides;i++){const t=i*2*Math.PI/sides,u=(i+1)*2*Math.PI/sides;const a=[x+Math.cos(t)*radius,topY,z+Math.sin(t)*radius],b=[x+Math.cos(u)*radius,topY,z+Math.sin(u)*radius];this.triangle([x,bottomY,z],b,a,c);this.triangle([x,topY,z],a,b,c)}}
 pyramid(x,y,z,w,h,c){this.cone(x,y+h/2,y-h/2,z,w/2,c,4)}
 clear(){this.v=[]}
 array(){return new Float32Array(this.v)}
}
const PALETTES=[
 {grass:'#6bd0a5',soil:'#436c86',accent:'#73e6dc',tree:'#4ecda5'},
 {grass:'#71d9d1',soil:'#39648a',accent:'#72e5ee',tree:'#2eafb4'},
 {grass:'#ebc887',soil:'#7c658b',accent:'#ffda91',tree:'#e3ab6b'},
 {grass:'#aa8ed9',soil:'#675989',accent:'#e1b3fc',tree:'#8d83da'},
 {grass:'#91bbec',soil:'#3e698d',accent:'#c6dafa',tree:'#79abd1'},
 {grass:'#84afd9',soil:'#365879',accent:'#ffe5a4',tree:'#73a6d5'},
 {grass:'#a6d88f',soil:'#567967',accent:'#f6d17f',tree:'#67bb7b'},
 {grass:'#eab4bd',soil:'#866576',accent:'#fdd79a',tree:'#bb7d9e'}
];
export class SkyRenderer{
 constructor(canvas,board,laneWindows){this.canvas=canvas;this.board=board;this.windows=laneWindows;this.gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'high-performance'});if(!this.gl)throw Error('瀏覽器無法建立 WebGL2 內容，請檢查瀏覽器硬體加速設定。');let gl=this.gl;this.program=shaderProgram(gl);gl.useProgram(this.program);this.pos=gl.getAttribLocation(this.program,'aPosition');this.norm=gl.getAttribLocation(this.program,'aNormal');this.color=gl.getAttribLocation(this.program,'aColor');this.mvp=gl.getUniformLocation(this.program,'uMvp');this.eye=gl.getUniformLocation(this.program,'uEye');this.staticBuf=Array.from({length:3},()=>gl.createBuffer());this.dynamicBuf=gl.createBuffer();this.staticCount=[0,0,0];this.cacheKeys=['','',''];this.quality='medium';this.realFps=0;this.lastTime=0;this.frameCount=0;this.framesSince=0;this.frameStart=0;this.shownError=false;gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.enable(gl.SCISSOR_TEST)}
 setQuality(value){this.quality=value;this.canvas.width=1;this.cacheKeys=['','','']}
 resize(){let b=this.board.getBoundingClientRect();let dpr=Math.min(devicePixelRatio||1,1.25);let q=this.quality==='low'?.65:this.quality==='medium'?.82:this.quality==='high'?1:dpr>1?.76:.86;let w=Math.max(1,Math.floor(b.width*dpr*q)),h=Math.max(1,Math.floor(b.height*dpr*q));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.ratio=w/Math.max(1,b.width)}
 bindBuffer(buffer){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const stride=9*4;gl.enableVertexAttribArray(this.pos);gl.enableVertexAttribArray(this.norm);gl.enableVertexAttribArray(this.color);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,stride,0);gl.vertexAttribPointer(this.norm,3,gl.FLOAT,false,stride,3*4);gl.vertexAttribPointer(this.color,3,gl.FLOAT,false,stride,6*4)}
 sceneKey(p){const q=p.question;const answer=p.reply||{};return JSON.stringify([p.phase,p.currentIsland,q?.seed,answer,p.explainingGraph])}
 curveInfo(p){const q=p.question;const index=p.currentIsland??0;let graph=q?.graph||null;
  if(q&&p.phase==='question'){
    if(index===2){const a=Number(p.reply?.a??1),b=Number(p.reply?.b??0);graph={type:'linear',a,b}}
    if(index===3){const key=q.controls?.[0]?.key;let a=Number(p.reply?.a??1),h=Number(p.reply?.h??0),k=Number(p.reply?.k??0);if(key==='a'&&q.controls?.length===1){h=0;k=0}graph={type:'quadratic',a,b:-2*a*h,c:a*h*h+k}}
    if(index===4){const h=Number(p.reply?.h??0),k=Number(p.reply?.k??0);graph={type:'quadratic',a:q.graph.a,b:-2*q.graph.a*h,c:q.graph.a*h*h+k}}
  }
  return graph;
 }
 makeHeightFn(p){
  // 只在中央 -4..4 區間保留課本函數的形狀；前後是供駕駛鏡頭體驗的接近與離站軌道。
  const graph=this.curveInfo(p); const island=p.currentIsland||0;
  const base=(!graph||graph.type==='points')?(x=>0.24+0.18*Math.sin(x*.86+island)):(()=>{
    let max=0;for(let i=0;i<=60;i++){const x=-4+i*8/60;max=Math.max(max,Math.abs(graphValue(graph,x)));}
    const scale=1/Math.max(1,max/5);return x=>clamp(.3+graphValue(graph,x)*scale*.43,-1.6,2.6);
  })();
  return x=>{
    if(x<-4){const d=x+4;return base(-4)+.18*Math.sin(d*.52)+.035*d;}
    if(x>4){const d=x-4;return base(4)+.22*Math.sin(d*.46)-.025*d;}
    return base(x);
  };
 }
 pathZ(x){
   // 與數學內容分開的空間轉彎；數學主軌 -4..4 在 z=0 平面，側面看仍是正確函數圖。
   if(x<-4){const d=x+4;return 1.2*Math.sin(d*.28)*(1-Math.exp(d*.44));}
   if(x>4){const d=x-4;return 1.9*Math.sin(d*.20)*(1-Math.exp(-d*.42));}
   return 0;
 }
 pointAt(x,height){return [x,height(x),this.pathZ(x)];}
 makeScene(p){const g=new Geometry(),index=p.currentIsland??0,palette=PALETTES[index],height=this.makeHeightFn(p),accent=palette.accent;
   // 世界沿礦車行車方向延伸，景物有遠近差異，車內攝影機可感受視差與迎面而來的軌道。
   for(let j=0;j<29;j++){
     const x=-17+j*1.28,side=j%2?1:-1,z=this.pathZ(x)+side*(3.0+(j%4)*1.55);
     const y=-3.4+(j%4)*.29,rad=1.25+(j%3)*.52;
     g.cone(x,y+.48,y-1.65,z,rad,palette.soil,7);
     g.cone(x,y+.58,y+.34,z,rad*1.04,palette.grass,7);
     g.box(x,y+.63,z,rad*1.30,.14,rad*1.33,palette.grass);
     if(j%3!==0){g.box(x-.15,y+1.2,z,.13,1.1,.13,'#56746c');g.cone(x-.15,y+2.06,y+1.42,z,.59,palette.tree,7);}
     if(j%5===0){g.sphere(x+1.7,y+2.75,z,.68,'#e5f4ed',8,5);g.sphere(x+2.3,y+2.64,z+.35,.48,'#d7ebf1',7,4);}
   }
   // 主行車線：木枕、兩條金屬軌、中央承托樑，前方各節可看見彎曲方向。
   const pts=[];const segments=170;for(let j=0;j<=segments;j++){const x=-15+j*33/segments;pts.push(this.pointAt(x,height));}
   for(let j=0;j<segments;j++){
     const a=pts[j],b=pts[j+1];
     for(const side of [-1,1]){
       g.rod([a[0],a[1]+.10,a[2]+side*.32],[b[0],b[1]+.10,b[2]+side*.32],.085,.080,j%9===0?'#f9e7bd':'#b7d9e0');
     }
     g.rod([a[0],a[1]-.06,a[2]],[b[0],b[1]-.06,b[2]],.14,.57,'#436477');
   }
   for(let j=0;j<=82;j++){const x=-14.9+j*.39,pt=this.pointAt(x,height);g.box(x,pt[1]-.055,pt[2],.14,.13,.88,j%5===0?'#c9975e':'#9b7457');}
   // 懸空橋墩及發光導引燈。
   for(let j=0;j<19;j++){
      const x=-14+j*1.75,pt=this.pointAt(x,height),z=pt[2];
      g.box(x,pt[1]-1.0,z,.10,1.85,.14,'#557e93');
      for(const side of [-1,1]){
        g.box(x,pt[1]+.08,z+side*.65,.12,.15,.10,'#42768a');
        g.sphere(x,pt[1]+.21,z+side*.65,.11,j%2?'#f4d58b':'#9deceb',6,4);
      }
   }
   // 穿越拱門讓車速與距離感更明顯；拱門位置選在中央數學軌道之外。
   for(const ax of [-11.0,-7.4,6.3,11.5,15.4]){
      const pt=this.pointAt(ax,height),y=pt[1],z=pt[2];
      g.box(ax,y+1.35,z-1.35,.24,2.65,.28,palette.soil);
      g.box(ax,y+1.35,z+1.35,.24,2.65,.28,palette.soil);
      g.box(ax,y+2.63,z,.25,.20,3.0,accent);
      g.sphere(ax,y+2.87,z,.19,'#fff3c2',8,5);
   }
   // 每座島的主題機關設置於軌道附近，玩家接近時能看見其形狀。
   if(index===0){for(const z of [-2.5,2.5]){g.box(0,.3,z,.3,2.2,.18,'#a7ecf6');g.box(0,1.48,z,1.25,.16,.22,accent);}}
   if(index===1){for(const z of [-2.4,2.4]){g.box(1,-.6,z,1.0,1.6,.7,'#30576b');g.sphere(1,.5,z,.42,accent,8,5)}}
   if(index===2){g.rod([-2,-1.7,-2.2],[2,1.6,-2.2],.22,.22,'#f4d398')}
   if(index===3){for(const z of [-2.3,2.3]){g.box(1,-1.25,z,.9,1.0,.9,'#6e598b');g.sphere(1,.1,z,.45,'#f0bee9',8,4)}}
   if(index===4){g.box(0,-1.0,-2.3,1.5,1.3,1.1,'#6685ae');g.pyramid(0,-.1,-2.3,1.35,.65,'#b5d8f6')}
   if(index===5){for(let j=0;j<3;j++){g.box(j*1.6-2,-1.1,-2.5,.45,1.6,.6,'#769db9');g.sphere(j*1.6-2,-.15,-2.5,.35,accent,7,5)}}
   if(index===6){for(let j=0;j<4;j++)g.pyramid(j*1.45-2,-.5,-2.5,.8,1.3,j%2?'#f5d08d':'#79d8ab')}
   if(index===7){for(let j=0;j<4;j++){const x=-2+j*1.5;g.box(x,-1.25,-2.9,1.1,1,.9,'#ca8799');g.pyramid(x,-.5,-2.9,1.3,.7,'#f3d19a')}}
   const gate=this.pointAt(4.5,height);
   g.box(gate[0],gate[1]+1.12,gate[2]-1.05,.18,2.2,.18,accent);
   g.box(gate[0],gate[1]+1.12,gate[2]+1.05,.18,2.2,.18,accent);
   g.box(gate[0],gate[1]+2.20,gate[2],.18,.16,2.18,'#f7e1a0');
   return {data:g.array(),height};
 }
 makeCockpit(p,camX,height){
   const g=new Geometry(),pt=this.pointAt(camX,height),x=pt[0],y=pt[1],z=pt[2];
   const paint=['#39bfd9','#e8a45d','#64ce99'][p.lane];
   // 車內視角：眼前的礦車鼻端與前方護欄，攝影機位於兩側護欄後方。
   g.box(x+.70,y+.30,z,.84,.18,.92,paint);
   g.box(x+.94,y+.40,z,.30,.18,.77,'#f4cf88');
   g.box(x+.52,y+.33,z-.52,.82,.29,.17,'#315a6b');
   g.box(x+.52,y+.33,z+.52,.82,.29,.17,'#315a6b');
   g.rod([x+.10,y+.38,z-.48],[x+.91,y+.64,z-.48],.12,.13,'#d9ece4');
   g.rod([x+.10,y+.38,z+.48],[x+.91,y+.64,z+.48],.12,.13,'#d9ece4');
   g.box(x+.93,y+.55,z,.09,.27,1.05,'#e6f4ee');
   for(const side of [-1,1])g.sphere(x+.98,y+.66,z+side*.49,.095,'#fff4b9',7,4);
   return g.array();
 }
 makeTrain(p,x,height){
   const g=new Geometry(),pt=this.pointAt(x,height),y=pt[1],z=pt[2];
   const paint=['#51ccdd','#e5a15c','#7dd19c'][p.lane];
   // 第三人稱追隨攝影機能看見：軌道車的箱體、車輪、護欄，以及確實坐在礦車裡的卡通主角。
   g.box(x,y+.29,z,.96,.34,.78,paint);
   g.box(x+.39,y+.39,z,.18,.33,.84,'#e8d49e');
   g.box(x-.41,y+.44,z,.16,.50,.82,'#214c66');
   g.box(x,y+.17,z-.47,.85,.28,.11,'#244e64');
   g.box(x,y+.17,z+.47,.85,.28,.11,'#244e64');
   for(const dx of [-.31,.29])for(const side of [-1,1]){
     g.sphere(x+dx,y+.005,z+side*.46,.15,'#162937',8,5);
     g.sphere(x+dx,y+.005,z+side*.49,.068,'#a6c8da',6,4);
   }
   // 主角面向行車方向 x 正向，從後方鏡頭可以看到帽子、頭、身體與雙臂。
   g.box(x-.14,y+.70,z,.30,.43,.32,'#f4d8a2');
   g.box(x-.20,y+.81,z,.34,.31,.37,'#284d86');
   g.sphere(x-.22,y+1.12,z,.22,'#f7d9b8',10,6);
   g.sphere(x-.25,y+1.23,z,.235,'#59432c',9,4);
   g.box(x-.07,y+1.25,z,.27,.06,.43,'#edb16a');
   g.rod([x-.13,y+.82,z-.22],[x+.29,y+.49,z-.34],.13,.13,'#f6d1b2');
   g.rod([x-.13,y+.82,z+.22],[x+.29,y+.49,z+.34],.13,.13,'#f6d1b2');
   g.sphere(x+.49,y+.43,z,.105,'#fff5bb',8,5);
   return g.array();
 }
 followCamera(p,now,height){
   let x=-12.8;
   const progress=clamp(p.animProgress||0,0,1),ease=t=>t*t*(3-2*t);
   if(p.phase==='travel')x=-13.4+8.8*ease(progress);
   else if(p.phase==='success')x=-4.6+20.0*ease(progress);
   else if(p.phase==='question'||p.phase==='explain')x=-4.6;
   else if(p.phase==='complete')x=14.9;
   const targetPoint=this.pointAt(Math.min(x+2.4,17.5),height),pt=this.pointAt(x,height);
   const moving=p.phase==='travel'||p.phase==='success',bob=moving?Math.sin(now*.009+p.lane*2)*.026:0;
   if(p.cameraMode==='inside'){
     const eye=[x-.13,pt[1]+.89+bob,pt[2]];
     return {x,eye,target:[targetPoint[0],targetPoint[1]+.24,targetPoint[2]]};
   }
   // 攝影機追隨礦車後方稍高的位置，讓主角留在畫面近處，視線朝軌道前景。
   const behind=this.pointAt(x-2.8,height);
   const eye=[behind[0],behind[1]+1.88+bob,behind[2]+.56];
   const at=[x+1.50,(pt[1]*.45+targetPoint[1]*.55)+.49,pt[2]*.45+targetPoint[2]*.55];
   return {x,eye,target:at};
 }

 drawGeometry(buf,count,mvp,eye){if(!count)return;const gl=this.gl;this.bindBuffer(buf);gl.uniformMatrix4fv(this.mvp,false,new Float32Array(mvp));gl.uniform3fv(this.eye,new Float32Array(eye));gl.drawArrays(gl.TRIANGLES,0,count)}
 makeTrain(p,t,graphHeight){const g=new Geometry();let x=-3.25;
  if(p.phase==='travel'||p.phase==='success'){const ease=t*t*(3-2*t);x=-3.9+7.5*ease;}else if(p.phase==='question'||p.phase==='explain')x=-2.95;else if(p.phase==='complete')x=3.55;
  const y=graphHeight(clamp(x,-4,4))+.16,paint=['#51ccdd','#e5a15c','#7dd19c'][p.lane];
  g.box(x,y+.18,0,.68,.23,.56,paint);g.box(x-.09,y+.38,0,.42,.27,.45,'#274963');g.box(x-.09,y+.54,0,.50,.10,.51,'#f5d18b');g.box(x+.32,y+.27,0,.22,.15,.42,'#f4ebc7');
  for(let offset of [-.23,.24])for(let z of [-.30,.30])g.sphere(x+offset,y-.02,z,.125,'#142b37',8,5);
  g.sphere(x+.43,y+.31,0,.10,'#fff7b8',8,5);
  if(p.phase==='success'){for(let i=0;i<9;i++){let phi=i*2.399+t*4;g.sphere(x+Math.sin(phi)*.58,y+.4+Math.cos(phi)*.54,.2*Math.sin(phi*2),.065,i%2?'#fff0a9':'#73f7df',5,3)}}
  return g.array();
 }
 frame(players,now=performance.now()){
  if(this.lastTime){this.framesSince++;if(now-this.frameStart>=1000){this.realFps=Math.round(1000*this.framesSince/(now-this.frameStart));this.frameStart=now;this.framesSince=0}}else this.frameStart=now;this.lastTime=now;
  this.resize();const gl=this.gl,bb=this.board.getBoundingClientRect(),w=this.canvas.width,h=this.canvas.height;gl.useProgram(this.program);
  for(let i=0;i<3;i++){
    const rr=this.windows[i].getBoundingClientRect();if(rr.width<=0||rr.height<=0)continue;
    const x=Math.max(0,Math.floor((rr.left-bb.left)*this.ratio));const y=Math.max(0,Math.floor((bb.bottom-rr.bottom)*this.ratio));const rw=Math.min(w-x,Math.ceil(rr.width*this.ratio)),rh=Math.min(h-y,Math.ceil(rr.height*this.ratio));if(rw<=0||rh<=0)continue;
    gl.viewport(x,y,rw,rh);gl.scissor(x,y,rw,rh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const p=players[i];if(!p)continue;
    const key=this.sceneKey(p);if(key!==this.cacheKeys[i]){const scene=this.makeScene(p);this.cacheKeys[i]=key;this.sceneHeights??=[null,null,null];this.sceneHeights[i]=scene.height;gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuf[i]);gl.bufferData(gl.ARRAY_BUFFER,scene.data,gl.STATIC_DRAW);this.staticCount[i]=scene.data.length/9;}
    const height=this.sceneHeights?.[i]||(()=>0);
    const camera=this.followCamera(p,now,height);
    const eye=camera.eye,view=lookAt(eye,camera.target,[0,1,0]);
    const proj=perspective(Math.PI/2.9,rw/rh,.07,90),mvp=matMul(proj,view);
    this.drawGeometry(this.staticBuf[i],this.staticCount[i],mvp,eye);
    const cockpit=p.cameraMode==='inside'?this.makeCockpit(p,camera.x,height):this.makeTrain(p,camera.x,height);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuf);gl.bufferData(gl.ARRAY_BUFFER,cockpit,gl.DYNAMIC_DRAW);
    this.drawGeometry(this.dynamicBuf,cockpit.length/9,mvp,eye);
  }
 }
 destroy(){const gl=this.gl;this.staticBuf.forEach(b=>gl.deleteBuffer(b));gl.deleteBuffer(this.dynamicBuf);gl.deleteProgram(this.program)}
}

/* 當硬體加速被禁止時的 2D 相容景觀：遊戲邏輯仍能玩，支援 WebGL2 的電腦會使用上方真正的 3D 引擎。 */
export class CanvasFallbackRenderer{
 constructor(canvas,board,windows){this.canvas=canvas;this.board=board;this.windows=windows;this.ctx=canvas.getContext('2d',{alpha:true});if(!this.ctx)throw Error('Canvas 2D 也無法使用');this.quality='low';this.realFps=0;this.framesSince=0;this.frameStart=0;this.lastDraw=0;this.ratio=1}
 setQuality(q){this.quality=q}
 resize(){const b=this.board.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,1.25)*.9;const w=Math.round(b.width*scale),h=Math.round(b.height*scale);if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}this.ratio=scale}
 drawBackdrop(ctx,w,h,index,now){
   const pal=PALETTES[index],gradient=ctx.createLinearGradient(0,0,0,h);
   gradient.addColorStop(0,'#275d85');gradient.addColorStop(.58,'#80b6c8');gradient.addColorStop(1,'#d3c3a8');
   ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
   const sun=ctx.createRadialGradient(w*.80,h*.17,5,w*.80,h*.17,w*.40);
   sun.addColorStop(0,'#ffecd599');sun.addColorStop(1,'#ffecd500');ctx.fillStyle=sun;ctx.fillRect(0,0,w,h);
   for(let j=0;j<5;j++){
     const xx=w*(.08+j*.23)+Math.sin(now/7000+j)*8,yy=h*(.12+(j%3)*.1);
     ctx.fillStyle='#f3faff70';for(let c=0;c<3;c++){ctx.beginPath();ctx.ellipse(xx+c*16,yy+6-(c%2)*5,27-c*5,11,0,0,Math.PI*2);ctx.fill();}
   }
 }
 frame(players,now=performance.now()){
   if(now-this.lastDraw<34)return;this.lastDraw=now;this.framesSince++;if(!this.frameStart)this.frameStart=now;
   if(now-this.frameStart>=1000){this.realFps=Math.round(this.framesSince*1000/(now-this.frameStart));this.frameStart=now;this.framesSince=0;}
   this.resize();const ctx=this.ctx,bb=this.board.getBoundingClientRect(),ratio=this.ratio;
   ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
   for(let i=0;i<3;i++){
     const rect=this.windows[i].getBoundingClientRect(),w=rect.width,h=rect.height;if(w<10||h<10)continue;
     const x=rect.left-bb.left,y=rect.top-bb.top,p=players[i],ind=p.currentIsland??0,pal=PALETTES[ind];
     ctx.save();ctx.beginPath();ctx.rect(x*ratio,y*ratio,w*ratio,h*ratio);ctx.clip();ctx.translate(x*ratio,y*ratio);ctx.scale(ratio,ratio);
     this.drawBackdrop(ctx,w,h,ind,now);
     // 無 WebGL 的降級方案仍用坐在車內的透視構圖，而非上一版第三人稱側視圖。
     const prog=p.phase==='travel'||p.phase==='success'?(p.animProgress||0):0;
     const sway=Math.sin((prog*9+ind)*1.3)*w*.11, horizonY=h*.52;
     const sx=depth=>w*.5+sway*(1-depth);
     const sy=depth=>horizonY+Math.pow(1-depth,1.38)*h*.48;
     for(let j=0;j<9;j++){
       const depth=(j+.3)/10,center=sx(depth),Y=sy(depth);
       ctx.fillStyle=j%2?pal.soil:pal.grass;
       const bw=(1-depth)*w*.10;
       ctx.beginPath();ctx.moveTo(center-bw*3,Y+22);ctx.lineTo(center-bw*.9,Y);ctx.lineTo(center-bw*.7,Y-7);ctx.lineTo(center-bw*2.2,Y-16);ctx.closePath();ctx.fill();
       ctx.beginPath();ctx.moveTo(center+bw*3,Y+22);ctx.lineTo(center+bw*.9,Y);ctx.lineTo(center+bw*.7,Y-7);ctx.lineTo(center+bw*2.2,Y-16);ctx.closePath();ctx.fill();
     }
     for(let side of [-1,1]){
       ctx.beginPath();for(let j=0;j<=36;j++){
          const d=j/36,spread=7+(1-d)*w*.48,X=sx(d)+side*spread,Y=sy(d);
          if(!j)ctx.moveTo(X,Y);else ctx.lineTo(X,Y);
       }
       ctx.strokeStyle=side===1?'#c9f5ee':'#f2efce';ctx.lineWidth=5;ctx.stroke();
     }
     for(let j=0;j<22;j++){
       const d=j/23,spread=8+(1-d)*w*.48,Y=sy(d),X=sx(d);
       ctx.strokeStyle='#a98560';ctx.lineWidth=Math.max(1,5*(1-d));ctx.beginPath();ctx.moveTo(X-spread*1.1,Y);ctx.lineTo(X+spread*1.1,Y);ctx.stroke();
     }
     if(p.cameraMode==='inside'){
       // 第一人稱：車頭、護欄留在視野下方。
       ctx.fillStyle=['#329fb9','#d3934c','#64bd89'][i];ctx.beginPath();ctx.moveTo(w*.2,h);ctx.lineTo(w*.34,h*.80);ctx.lineTo(w*.66,h*.80);ctx.lineTo(w*.80,h);ctx.closePath();ctx.fill();
       ctx.strokeStyle='#e2f4ee';ctx.lineWidth=8;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(w*.5+side*w*.43,h);ctx.lineTo(w*.5+side*w*.22,h*.79);ctx.stroke();}
     }else{
       // 第三人稱相容構圖：從後方能看到車廂以及坐在其中的主角。
       const cx=w*.5, cy=h*.79;
       ctx.fillStyle='#1c394b';ctx.beginPath();ctx.ellipse(cx,cy+15,w*.18,18,0,0,Math.PI*2);ctx.fill();
       ctx.fillStyle=['#329fb9','#d3934c','#64bd89'][i];ctx.fillRect(cx-w*.16,cy-9,w*.32,38);
       ctx.fillStyle='#244e64';ctx.fillRect(cx-w*.16,cy-12,w*.32,9);
       ctx.fillStyle='#f1d9bd';ctx.fillRect(cx-9,cy-32,18,25);
       ctx.beginPath();ctx.arc(cx,cy-40,17,0,Math.PI*2);ctx.fill();
       ctx.fillStyle='#573d30';ctx.beginPath();ctx.arc(cx,cy-46,17,Math.PI,Math.PI*2);ctx.fill();
       ctx.fillStyle='#e4a66b';ctx.fillRect(cx-20,cy-57,40,6);
       ctx.fillStyle='#132e3d';for(const dx of [-w*.12,w*.12]){ctx.beginPath();ctx.arc(cx+dx,cy+29,9,0,Math.PI*2);ctx.fill();}
     }
     ctx.restore();
   }
 }
}
