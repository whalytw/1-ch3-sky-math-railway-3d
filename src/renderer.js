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
 makeHeightFn(p){const graph=this.curveInfo(p);if(!graph||graph.type==='points')return x=>.2+0.32*Math.sin(x*0.95+(p.currentIsland||0)*.8);
  let hi=0;for(let i=0;i<=50;i++){let x=-3.4+i*6.8/50;hi=Math.max(hi,Math.abs(graphValue(graph,x)))}const scale=1/Math.max(1,hi/4.6);return x=>clamp(0.35+graphValue(graph,x)*scale*.40,-1.6,2.6);
 }
 makeScene(p){const g=new Geometry(),index=p.currentIsland??0,palette=PALETTES[index],height=this.makeHeightFn(p),accent=palette.accent;
  // 島嶼：分層低面數岩石、上層草皮與小島群，三區共用材質概念而不複製 WebGL Context。
  for(let j=0;j<6;j++){const x=-7+j*2.65+(j%2)*.35,z=-3.4-(j%3)*1.9,y=-2.6+Math.sin(j+index)*.36,r=1.25+(j%3)*.33;g.cone(x,y+.5,y-1.55,z,r,palette.soil,7);g.cone(x,y+.54,y+.33,z,r*1.04,palette.grass,7);g.box(x,y+.55,z,r*1.4,.13,r*1.3,palette.grass)}
  for(let j=0;j<5;j++){const x=-6.1+j*3.1,z=-7.0-(j%2)*1.5,y=-1.8+(j%3)*.31;g.sphere(x,y,z,.72,'#e7f3f0',7,5);g.sphere(x+.7,y-.08,z+.2,.53,'#d4e8ed',7,5);g.sphere(x-.6,y-.1,z-.1,.49,'#d8e7ed',7,5)}
  // 靠近鏡頭的懸浮軌道支架，避免整個場景看起來只有一條漂浮線。
  for(let j=0;j<5;j++){const x=-5.3+j*2.65,z=-1.65;j%2===0&&g.cone(x,-1.8,-4.5,z,.82,palette.soil,7);}
  const pts=[];for(let i=0;i<=62;i++){let x=-4+i*8/62;pts.push([x,height(x),0]);}
  for(let k=0;k<pts.length-1;k++){let a=pts[k],b=pts[k+1];for(let side of [-1,1])g.rod([a[0],a[1],side*.20],[b[0],b[1],side*.20],.062,.073,k%6===0?'#bceef3':'#88c8d6');g.rod([a[0],a[1]-.07,0],[b[0],b[1]-.07,0],.11,.56,'#3b596a')}
  for(let k=0;k<=32;k++){const x=-4+k*.25,y=height(x)-.07;g.box(x,y-.055,0,.08,.08,.65,k%4===0?'#d29f64':'#916b56');}
  for(let k=0;k<9;k++){const x=-3.8+k*.95,y=height(x)-.15;g.box(x,y-.44,0,.055,.86,.07,'#568095');}
  for(let j=0;j<6;j++){const x=-6+j*2.25,z=-3.7-(j%3);const y=-1.5;g.box(x,y+.58,z,.12,1.16,.12,'#6d746f');g.cone(x,y+2.05,y+.66,z,.45,palette.tree,7)}
  // 島嶼特色機關：同一幾何基礎，替換主題裝置。
  if(index===0){for(let s of [-1,1]){g.box(2.6*s,.2,-1.2,.12,2,.12,'#a7ecf6');g.box(2.6*s,1.18,-1.2,.82,.14,.28,accent);g.box(2.6*s,-.64,-1.2,.82,.14,.28,accent);}}
  if(index===1){for(let s of [-1,1]){g.box(s*2.3,-.68,-1.5,.9,1.1,.8,'#30576b');g.sphere(s*2.3,.25,-1.5,.35,accent,8,5)}}
  if(index===2){g.rod([-3,-1.7,-1.2],[1,1.4,-1.2],.16,.16,'#d3b17a');g.rod([-2.8,-1.7,-1.7],[1.2,1.4,-1.7],.12,.1,'#efcf9b')}
  if(index===3){for(let s of [-1,1]){g.box(s*2.6,-1.4,-2.1,.8,.9,.9,'#6e598b');g.sphere(s*2.6,.1,-2.1,.35,'#f0bee9',8,4)}}
  if(index===4){g.box(2.6,-1.35,-1.6,1.25,1.4,.8,'#6685ae');g.box(2.6,-.48,-1.6,1.6,.16,.99,'#a7c7ea');g.pyramid(2.6,.4,-1.6,1,.5,'#a7c7ea')}
  if(index===5){for(let j=0;j<3;j++){const x=(j-1)*1.9;g.box(x,-1.18,-2.3,.35,1.3,.45,'#769db9');g.sphere(x,-.45,-2.3,.28,accent,7,5)}}
  if(index===6){for(let j=0;j<5;j++){const x=-3.6+j*1.8;g.pyramid(x,-.65,-2,0.55,1.2,j%2?'#ffc875':'#71d8a7')}}
  if(index===7){for(let j=0;j<5;j++){const x=-3.8+j*1.9;g.box(x,-1.25,-2.7,1.05,.9,.85,j%2?'#de9fab':'#ca8799');g.pyramid(x,-.52,-2.7,1.3,.66,'#f3d19a')}}
  // 終點傳送門。
  let gy=height(3.6);g.box(3.65,gy+.93,0,.13,1.8,.9,accent);g.box(3.65,gy+1.87,0,.13,.11,.9,'#f7e1a0');g.sphere(3.65,gy+2.12,0,.15,'#ffe49a',7,5);
  return {data:g.array(),height};
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
    let camPhase=p.phase==='travel'||p.phase==='success'?(now/1500)%6:0;
    const eye=[Math.sin(now/6000+i)*.31,3.75+Math.sin(camPhase)*.08,11.2];const at=[.1,.05,0];const view=lookAt(eye,at,[0,1,0]);const proj=perspective(Math.PI/3.8,rw/rh,.1,70),mvp=matMul(proj,view);
    this.drawGeometry(this.staticBuf[i],this.staticCount[i],mvp,eye);
    const train=this.makeTrain(p,p.animProgress??0,this.sceneHeights?.[i]||(()=>0));gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuf);gl.bufferData(gl.ARRAY_BUFFER,train,gl.DYNAMIC_DRAW);this.drawGeometry(this.dynamicBuf,train.length/9,mvp,eye);
  }
 }
 destroy(){const gl=this.gl;this.staticBuf.forEach(b=>gl.deleteBuffer(b));gl.deleteBuffer(this.dynamicBuf);gl.deleteProgram(this.program)}
}

/* 當硬體加速被禁止時的 2D 相容景觀：遊戲邏輯仍能玩，支援 WebGL2 的電腦會使用上方真正的 3D 引擎。 */
export class CanvasFallbackRenderer{
 constructor(canvas,board,windows){this.canvas=canvas;this.board=board;this.windows=windows;this.ctx=canvas.getContext('2d',{alpha:true});if(!this.ctx)throw Error('Canvas 2D 也無法使用');this.quality='low';this.realFps=0;this.framesSince=0;this.frameStart=0;this.lastDraw=0;this.ratio=1}
 setQuality(q){this.quality=q}
 resize(){const b=this.board.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,1.25)*.9;const w=Math.round(b.width*scale),h=Math.round(b.height*scale);if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}this.ratio=scale}
 drawBackdrop(ctx,w,h,index,now){const pal=PALETTES[index],gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#245372');gradient.addColorStop(.7,'#5092a0');gradient.addColorStop(1,'#8ec3bd');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
   const sun=ctx.createRadialGradient(w*.77,h*.22,4,w*.77,h*.22,w*.42);sun.addColorStop(0,'#fff6c34d');sun.addColorStop(1,'#fff6c300');ctx.fillStyle=sun;ctx.fillRect(0,0,w,h);
   for(let j=0;j<5;j++){const xx=w*(.05+j*.23)+Math.sin(now/9000+j)*8,yy=h*(.14+(j%3)*.12);ctx.fillStyle='#e6f7fb50';for(let c=0;c<3;c++){ctx.beginPath();ctx.ellipse(xx+c*18,yy+8-c%2*6,28-c*5,10,0,0,Math.PI*2);ctx.fill();}}
   for(let j=0;j<5;j++){const x=w*(.02+j*.25),y=h*(.73-(j%3)*.12),rw=30+j%3*10;ctx.beginPath();ctx.moveTo(x-rw,y);ctx.lineTo(x+rw,y);ctx.lineTo(x+rw*.45,y+35);ctx.lineTo(x,y+65);ctx.lineTo(x-rw*.45,y+35);ctx.closePath();ctx.fillStyle=pal.soil;ctx.fill();ctx.beginPath();ctx.ellipse(x,y,rw,9,0,0,Math.PI*2);ctx.fillStyle=pal.grass;ctx.fill();ctx.fillStyle=pal.tree;ctx.fillRect(x-2,y-21,4,15);ctx.beginPath();ctx.moveTo(x-14,y-17);ctx.lineTo(x+14,y-17);ctx.lineTo(x,y-42);ctx.fill()}
   ctx.save();ctx.strokeStyle='#dbf7ff44';ctx.lineWidth=1;for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(w*.78,h*.31,25+i*17,Math.PI*.1,Math.PI*.88);ctx.stroke()}ctx.restore();
 }
 frame(players,now=performance.now()){
  if(now-this.lastDraw<34)return;this.lastDraw=now;this.framesSince++;if(!this.frameStart)this.frameStart=now;if(now-this.frameStart>=1000){this.realFps=Math.round(this.framesSince*1000/(now-this.frameStart));this.frameStart=now;this.framesSince=0;}
  this.resize();const ctx=this.ctx,bb=this.board.getBoundingClientRect(),ratio=this.ratio;ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
  for(let i=0;i<3;i++){const rect=this.windows[i].getBoundingClientRect(),w=rect.width,h=rect.height;if(w<10||h<10)continue;const x=(rect.left-bb.left),y=rect.top-bb.top,p=players[i],ind=p.currentIsland??0,pl=PALETTES[ind];
   ctx.save();ctx.beginPath();ctx.rect(x*ratio,y*ratio,w*ratio,h*ratio);ctx.clip();ctx.translate(x*ratio,y*ratio);ctx.scale(ratio,ratio);this.drawBackdrop(ctx,w,h,ind,now);
   let graph=p.question?.graph;
   if(p.phase==='question'&&graph){if(ind===2)graph={type:'linear',a:Number(p.reply?.a??1),b:Number(p.reply?.b??0)};else if(ind===3){let a=Number(p.reply?.a??1),hh=Number(p.reply?.h??0),k=Number(p.reply?.k??0);graph={type:'quadratic',a,b:-2*a*hh,c:a*hh*hh+k}}else if(ind===4){const a=graph.a,hh=Number(p.reply?.h??0),k=Number(p.reply?.k??0);graph={type:'quadratic',a,b:-2*a*hh,c:a*hh*hh+k}}}
   let maxY=3;for(let j=0;j<22;j++){const t=-3+j*6/21;maxY=Math.max(maxY,Math.abs(graph&&graph.type!=='points'?graphValue(graph,t):3))}const norm=1/Math.max(1,maxY/4);
   const yy=t=>h*.53-(graph&&graph.type!=='points'?graphValue(graph,t)*norm*.17*h:Math.sin(t*1.3+ind)*.07*h);
   const xx=t=>w*.5+t*w*.119;
   // 橋面支架、下層陰影與兩條軌道。
   ctx.strokeStyle='#25576c';ctx.lineWidth=13;ctx.beginPath();for(let s=0;s<=64;s++){let t=-3.8+s*7.6/64;if(s===0)ctx.moveTo(xx(t),yy(t)+13);else ctx.lineTo(xx(t),yy(t)+13)}ctx.stroke();
   ctx.strokeStyle='#39506b';ctx.lineWidth=8;ctx.beginPath();for(let s=0;s<=64;s++){let t=-3.8+s*7.6/64;if(s===0)ctx.moveTo(xx(t),yy(t)+4);else ctx.lineTo(xx(t),yy(t)+4)}ctx.stroke();
   for(let s=0;s<=28;s++){let t=-3.7+s*7.4/28;const X=xx(t),Y=yy(t);ctx.strokeStyle='#8a6a51';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(X-2,Y-6);ctx.lineTo(X+2,Y+14);ctx.stroke();}
   for(let offset of [-5,5]){ctx.lineWidth=4;ctx.strokeStyle=offset<0?'#bff5f3':'#6bd7e1';ctx.beginPath();for(let s=0;s<=64;s++){let t=-3.8+s*7.6/64;if(s===0)ctx.moveTo(xx(t),yy(t)+offset);else ctx.lineTo(xx(t),yy(t)+offset)}ctx.stroke()}
   for(let s=0;s<6;s++){const t=-3.2+s*1.17,X=xx(t),Y=yy(t);ctx.strokeStyle='#c6e7ea88';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X,Y+10);ctx.lineTo(X,Y+35);ctx.stroke()}
   let tx=-2.8;if(p.phase==='travel'||p.phase==='success')tx=-3.8+7.2*(p.animProgress||0);else if(p.phase==='complete')tx=3.2;const X=xx(tx),Y=yy(tx)-12;
   ctx.save();ctx.translate(X,Y);ctx.shadowColor='#122e3c';ctx.shadowBlur=10;ctx.shadowOffsetY=5;ctx.fillStyle=['#54c8d7','#e6a65e','#7ccc9d'][i];ctx.fillRect(-20,-9,40,22);ctx.fillStyle='#e6d9a3';ctx.fillRect(-14,-20,27,12);ctx.fillStyle='#26445b';ctx.fillRect(-11,-18,18,10);ctx.fillStyle='#fff4b4';ctx.fillRect(14,-2,8,8);ctx.shadowBlur=0;for(let wx of [-12,12]){ctx.fillStyle='#143145';ctx.beginPath();ctx.arc(wx,16,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a9d9e6';ctx.beginPath();ctx.arc(wx,16,3,0,Math.PI*2);ctx.fill()}ctx.restore();
   if(p.phase==='success'){for(let j=0;j<14;j++){let phi=j*2.399+now/800;ctx.fillStyle=j%2?'#ffda88':'#89ffed';ctx.beginPath();ctx.arc(X+Math.cos(phi)*(25+j%3*11),Y+Math.sin(phi)*(13+j%3*12),2.5,0,Math.PI*2);ctx.fill()}}
   ctx.restore();
  }
 }
}
