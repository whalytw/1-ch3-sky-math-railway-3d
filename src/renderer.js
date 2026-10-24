import {matMul,perspective,lookAt} from './geometry.js?v=1.1.0';
import {normalize,sub,add,scale,cross,lerp,WORLD_END,WORLD_DRAW_END} from './world.js?v=1.1.0';
import {clamp,random} from './math.js?v=1.1.0';
import {CHUNK_SIZE,makeChunk,makeCart,makeCharacter,makeArm,makeJet,makeFlame,makeCrowd} from './scenery.js?v=1.1.0';
export const PLAYER_COLORS=['#69dfed','#ffba75','#a4e799'];
const IDENTITY=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export function model(point,forward=[1,0,0],yaw=0){const right=normalize(cross(forward,[0,1,0])),up=normalize(cross(right,forward));let f=forward,r=right;if(yaw){f=add(scale(forward,Math.cos(yaw)),scale(right,Math.sin(yaw)));r=add(scale(right,Math.cos(yaw)),scale(forward,-Math.sin(yaw)))}return new Float32Array([f[0],f[1],f[2],0,up[0],up[1],up[2],0,r[0],r[1],r[2],0,...point,1])}
export function localPoint(m,p){return [m[12]+m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[13]+m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[14]+m[2]*p[0]+m[6]*p[1]+m[10]*p[2]]}
function offsetModel(m,point,s=[1,1,1]){const a=m.slice();const p=localPoint(m,point);a[12]=p[0];a[13]=p[1];a[14]=p[2];for(let j=0;j<3;j++){a[j]*=s[0];a[4+j]*=s[1];a[8+j]*=s[2]}return a}
export function jumpLift(p){return p.jump>0?Math.sin(Math.PI*(1-p.jump/1.15))*1.10:0}
export function fieldOfView(p){return 1.00+.10*clamp((p.speed-60)/40,0,1)+.18*(1-smooth((p.distance||0)/55))}
export function cameraFor(world,p,heading=null){const s=world.sample(p.lane,p.renderDistance??p.distance),f=heading||normalize([s.forward[0],s.forward[1]*.12,s.forward[2]]),r=normalize(cross(f,[0,1,0])),u=normalize(cross(r,f)),orbit=p.finishTime!==null&&p.finishTime!==undefined?smooth((p.coastElapsed||0)/2)*Math.PI:0;
 const side=add(scale(r,Math.cos(orbit)),scale(f,Math.sin(orbit))),lift=jumpLift(p)*.65,anchor=add(s.point,scale(u,lift)),radius=7.5+4.5*(1-smooth((p.distance||0)/55));
 const eye=add(add(add(add(anchor,scale(f,-radius*Math.cos(orbit))),scale(r,radius*Math.sin(orbit))),scale(u,3.5)),scale(side,1.3));
 eye[1]=Math.max(eye[1],world.terrainY(eye[0],eye[2])+1.8);
 const target=add(add(add(anchor,scale(f,4.2*Math.cos(orbit))),scale(u,2.95)),scale(side,.65));
 return {eye,target,point:s.point,forward:f,orbit};
}
export function actorTransforms(world,p){const s=world.sample(p.lane,p.renderDistance??p.distance),car=model(add(s.point,[0,.12,0]),s.forward),jump=p.jump>0?1-p.jump/1.15:0,character=model(localPoint(car,[0,1.05+jumpLift(p),0]),s.forward,jump*Math.PI*2),armPos=localPoint(character,[0,.19,-.27]);
 const wave=p.finishTime!==null&&p.finishTime!==undefined?2.45+.45*Math.sin((p.coastElapsed||0)*5):p.wave>0?Math.sin(Math.PI*(1-p.wave/2.2))**2*2.8:.48,arm=character.slice();arm[12]=armPos[0];arm[13]=armPos[1];arm[14]=armPos[2];for(let j=0;j<3;j++){arm[4+j]=character[4+j]*Math.cos(wave)+character[8+j]*Math.sin(wave);arm[8+j]=character[8+j]*Math.cos(wave)-character[4+j]*Math.sin(wave)}
 const jets=[-1,1].map(side=>offsetModel(car,[-.05,.54,side*.88],Array(3).fill(p.jetScale||0)));
 return {point:s.point,car,character,arm,jets,head:localPoint(character,[0,1.25,0])};
}
const vs=`#version 300 es
in vec3 aPosition;in vec3 aNormal;in vec3 aColor;
uniform mat4 uMvp;uniform mat4 uModel;uniform vec3 uEye;uniform float uFar;uniform vec2 uViewport;uniform float uOutlinePixels;uniform float uTime;uniform float uBob;
out vec3 vColor;out float vFog;
void main(){vec3 p=(uModel*vec4(aPosition,1.0)).xyz;if(uBob>0.5)p.y+=sin(uTime*8.0+p.x*2.1+p.z*.25)*.055;vec4 clip=uMvp*vec4(p,1.0);vec3 n=normalize(mat3(uModel)*aNormal);if(uOutlinePixels>0.0){vec2 direction=(uMvp*vec4(n,0.0)).xy;direction/=max(length(direction),.001);clip.xy+=direction*(2.0/uViewport)*uOutlinePixels*clip.w;}gl_Position=clip;float light=max(0.0,dot(n,normalize(vec3(-.4,.85,.5))));vColor=aColor*(.67+.33*light);vFog=smoothstep(uFar*.35,uFar,distance(p,uEye));}`;
const fs=`#version 300 es
precision mediump float;in vec3 vColor;in float vFog;uniform vec3 uFog;uniform vec3 uOutlineColor;uniform float uMode;uniform float uAlpha;out vec4 fragColor;
void main(){vec3 c=uMode>1.5?vColor*1.35:mix(vColor,uFog,vFog*.96);if(uMode>.5&&uMode<1.5)c=uOutlineColor;fragColor=vec4(c,uAlpha);}`;
const rgb=c=>{const n=parseInt(c.slice(1),16);return [n>>16&255,n>>8&255,n&255].map(x=>x/255)};
const mixColor=(a,b,t)=>rgb(a).map((v,i)=>lerp(v,rgb(b)[i],t));
function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
export class SharedRenderer{
 constructor(canvas,board,windows){
  this.canvas=canvas;this.board=board;this.windows=windows;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,stencil:true,depth:true,powerPreference:'high-performance'});if(!this.gl)throw Error('WebGL2 無法使用');const gl=this.gl,p=this.program=gl.createProgram();
  for(const [type,src]of[[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=compile(gl,type,src);gl.attachShader(p,s);gl.deleteShader(s)}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  this.attr=['aPosition','aNormal','aColor'].map(n=>gl.getAttribLocation(p,n));this.uniform=Object.fromEntries(['uMvp','uModel','uEye','uFog','uFar','uViewport','uOutlinePixels','uOutlineColor','uMode','uAlpha','uTime','uBob'].map(n=>[n,gl.getUniformLocation(p,n)]));
  this.carts=PLAYER_COLORS.map(c=>this.upload(makeCart(c)));this.characters=PLAYER_COLORS.map(c=>this.upload(makeCharacter(c)));this.jumpCharacters=PLAYER_COLORS.map(c=>this.upload(makeCharacter(c,true)));this.arm=this.upload(makeArm());this.jet=this.upload(makeJet());this.flame=this.upload(makeFlame());this.flameCore=this.upload(makeFlame('#fff0aa'));
  this.chunks=new Map();this.pending=new Set();this.quality='auto';this.effective='medium';this.resolution=.76;this.realFps=0;this.frameStart=0;this.frameCount=0;this.lastDraw=0;this.projections=[];this.lost=false;this.mode='3D';this.headings=[];this.lastStream=-Infinity;this.fallbackQueue=[];this.hasStencil=gl.getParameter(gl.STENCIL_BITS)>0;
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.SCISSOR_TEST);gl.disable(gl.CULL_FACE);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(board);this.resize();
 }
 upload(data){const gl=this.gl,buffer=gl.createBuffer(),vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);for(let j=0;j<3;j++){gl.enableVertexAttribArray(this.attr[j]);gl.vertexAttribPointer(this.attr[j],3,gl.FLOAT,false,36,j*12)}gl.bindVertexArray(null);return {buffer,vao,count:data.length/9,used:0}}
 disposeMesh(m){if(!m)return;this.gl.deleteBuffer(m.buffer);this.gl.deleteVertexArray(m.vao)}
 setWorld(world){
  for(const m of this.chunks.values())this.disposeMesh(m);this.chunks.clear();this.pending.clear();this.fallbackQueue=[];this.worker?.terminate();this.worker=null;this.disposeMesh(this.crowd);this.crowd=this.upload(makeCrowd(world));this.world=world;this.headings=[];this.lastDraw=0;this.lastStream=-Infinity;
  for(let i=-2;i<=7;i++)this.chunks.set(i,this.upload(makeChunk(world,i)));
  try{if(typeof Worker!=='undefined'){this.worker=new Worker(new URL('./scene-worker.js?v=1.1.0',import.meta.url),{type:'module'});this.worker.onmessage=({data})=>{if(this.destroyed||!this.world||data.seed!==this.world.seed||data.type!=='chunk')return;this.pending.delete(data.index);this.disposeMesh(this.chunks.get(data.index));this.chunks.set(data.index,this.upload(data.data))};this.worker.onerror=()=>{this.worker?.terminate();this.worker=null;this.pending.clear();this.lastStream=-Infinity};this.worker.postMessage({type:'init',seed:world.seed})}}catch{this.worker=null}
 }
 setQuality(q){this.quality=q;this.effective=q==='auto'?'medium':q;this.resolution=q==='low'?.55:q==='high'?1:q==='medium'?.85:.76;this.resize()}
 resize(){const b=this.board.getBoundingClientRect(),ratio=this.resolution*Math.min(devicePixelRatio||1,1.2);this.ratio=ratio;const w=Math.max(1,Math.round(b.width*ratio)),h=Math.max(1,Math.round(b.height*ratio));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h}this.viewports=this.windows.map(el=>{const a=el.getBoundingClientRect();return{x:Math.round((a.left-b.left)*ratio),y:Math.round((b.bottom-a.bottom)*ratio),w:Math.round(a.width*ratio),h:Math.round(a.height*ratio),cssW:a.width,cssH:a.height}})}
 drawMesh(mesh,m){if(!mesh?.count)return;const gl=this.gl;gl.bindVertexArray(mesh.vao);gl.uniformMatrix4fv(this.uniform.uModel,false,m);gl.drawArrays(gl.TRIANGLES,0,mesh.count)}
 stream(players,now,far){
  if(now-this.lastStream<200)return;this.lastStream=now;const wanted=new Set(),maxIndex=Math.floor(WORLD_DRAW_END/CHUNK_SIZE);
  for(const p of players){const x=this.world.sample(p.lane,p.renderDistance??p.distance).point[0];for(let i=Math.max(-2,Math.floor((x-far-20)/CHUNK_SIZE));i<=Math.min(maxIndex,Math.ceil((x+far+70)/CHUNK_SIZE));i++)wanted.add(i)}
  const missing=[];for(const i of wanted){const m=this.chunks.get(i);if(m)m.used=now;else if(!this.pending.has(i)){this.pending.add(i);missing.push(i)}}
  if(this.worker&&missing.length)this.worker.postMessage({type:'chunks',seed:this.world.seed,indices:missing});else if(missing.length)this.fallbackQueue.push(...missing);
  const candidates=[...this.chunks].filter(([i])=>!wanted.has(i)).sort((a,b)=>a[1].used-b[1].used);while(this.chunks.size>60&&candidates.length){const [i,m]=candidates.shift();this.disposeMesh(m);this.chunks.delete(i)}
 }
 processFallback(){if(this.worker||this.idleScheduled||!this.fallbackQueue.length)return;this.idleScheduled=true;const run=()=>{this.idleScheduled=false;if(this.destroyed)return;const index=this.fallbackQueue.shift();if(index!==undefined&&this.world){this.chunks.set(index,this.upload(makeChunk(this.world,index)));this.pending.delete(index)}};if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:80});else setTimeout(run,0)}
 drawPerson(p,t){const body=p.jump>0?this.jumpCharacters[p.lane]:this.characters[p.lane];this.drawMesh(this.carts[p.lane],t.car);this.drawMesh(body,t.character);this.drawMesh(this.arm,t.arm)}
 drawJets(p,t,clock){if(!(p.jetScale>.002))return;const gl=this.gl;for(const jet of t.jets)this.drawMesh(this.jet,jet);if(!p.boostLevel||p.finishTime!==null)return;
  const pulse=.93+.10*Math.sin(clock*43+p.lane),length=[0,1.45,2.2,3.0][p.boostLevel]*pulse;gl.uniform1f(this.uniform.uMode,2);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
  for(const side of [-1,1]){const outer=offsetModel(t.car,[-.81,.54,side*.88],[length,p.jetScale*(1+.12*p.boostLevel),p.jetScale*(1+.12*p.boostLevel)]);gl.uniform1f(this.uniform.uAlpha,.75);this.drawMesh(this.flame,outer);const core=offsetModel(t.car,[-.82,.54,side*.88],[length*.73,p.jetScale*.58,p.jetScale*.58]);gl.uniform1f(this.uniform.uAlpha,.95);this.drawMesh(this.flameCore,core)}
  gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(this.uniform.uMode,0);gl.uniform1f(this.uniform.uAlpha,1);
 }
 outlineSelf(p,t){if(!this.hasStencil)return;const gl=this.gl;gl.enable(gl.STENCIL_TEST);gl.stencilMask(0xff);gl.stencilFunc(gl.ALWAYS,1,0xff);gl.stencilOp(gl.KEEP,gl.KEEP,gl.REPLACE);gl.disable(gl.DEPTH_TEST);gl.colorMask(false,false,false,false);gl.depthMask(false);this.drawPerson(p,t);
  gl.colorMask(true,true,true,true);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.GREATER);gl.stencilMask(0);gl.stencilFunc(gl.NOTEQUAL,1,0xff);gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);gl.uniform1f(this.uniform.uMode,1);gl.uniform1f(this.uniform.uOutlinePixels,2.4*this.ratio);gl.uniform3fv(this.uniform.uOutlineColor,rgb(PLAYER_COLORS[p.lane]));this.drawPerson(p,t);
  gl.uniform1f(this.uniform.uMode,0);gl.uniform1f(this.uniform.uOutlinePixels,0);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);gl.disable(gl.STENCIL_TEST);gl.stencilMask(0xff);
 }
 frame(players,now,force=false,clock=now/1000){
  if(this.lost||!this.world)return;if(!force&&this.quality!=='high'&&now-this.lastDraw<10)return;
  const dt=this.lastDraw?clamp((now-this.lastDraw)/1000,0,.1):1/60;this.lastDraw=now;this.frameStart||=now;this.frameCount++;if(now-this.frameStart>=1600){this.realFps=Math.round(this.frameCount*1000/(now-this.frameStart));if(this.quality==='auto'&&this.realFps<50&&this.resolution>.48){this.resolution=Math.max(.48,this.resolution-.08);this.effective=this.resolution<.65?'low':'medium';this.resize()}this.frameStart=now;this.frameCount=0}
  const gl=this.gl,w=this.world,far=this.quality==='low'||this.effective==='low'?62:this.quality==='high'?108:84;this.stream(players,now,far);gl.useProgram(this.program);gl.uniform1f(this.uniform.uFar,far);gl.uniform1f(this.uniform.uTime,clock);gl.uniform1f(this.uniform.uMode,0);gl.uniform1f(this.uniform.uAlpha,1);gl.uniform1f(this.uniform.uBob,0);gl.uniform1f(this.uniform.uOutlinePixels,0);
  const transforms=players.map(p=>actorTransforms(w,p));
  for(let i=0;i<3;i++){
   const v=this.viewports[i];if(!v?.w||!v.h)continue;gl.viewport(v.x,v.y,v.w,v.h);gl.scissor(v.x,v.y,v.w,v.h);gl.stencilMask(0xff);gl.clearStencil(0);
   const sample=w.sample(i,players[i].renderDistance??players[i].distance),raw=normalize([sample.forward[0],sample.forward[1]*.12,sample.forward[2]]),old=this.headings[i]||raw,a=1-Math.exp(-dt*16);this.headings[i]=normalize(old.map((x,j)=>lerp(x,raw[j],a)));
   const camera=cameraFor(w,players[i],this.headings[i]),blend=w.blendAt(camera.point[0]),sky=mixColor(w.themes[0].sky,w.themes[1].sky,blend),fog=mixColor(w.themes[0].fog,w.themes[1].fog,blend);gl.clearColor(...sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);gl.uniform3fv(this.uniform.uFog,fog);gl.uniform3fv(this.uniform.uEye,camera.eye);gl.uniform2f(this.uniform.uViewport,v.w,v.h);
   const vp=matMul(perspective(fieldOfView(players[i]),v.w/v.h,.10,far+22),lookAt(camera.eye,camera.target,[0,1,0]));gl.uniformMatrix4fv(this.uniform.uMvp,false,vp);
   for(const [index,mesh]of this.chunks)if(Math.abs(index*CHUNK_SIZE+CHUNK_SIZE/2-camera.point[0])<far+CHUNK_SIZE/2)this.drawMesh(mesh,IDENTITY);
   if(Math.abs(camera.point[0])<far+20||camera.point[0]>WORLD_END-far-20){gl.uniform1f(this.uniform.uBob,1);this.drawMesh(this.crowd,IDENTITY);gl.uniform1f(this.uniform.uBob,0)}
   for(let j=0;j<3;j++)if(Math.hypot(...sub(transforms[j].point,camera.eye))<far){this.drawPerson(players[j],transforms[j]);this.drawJets(players[j],transforms[j],clock)}
   this.outlineSelf(players[i],transforms[i]);this.projections[i]=project(vp,transforms[i].head,v.cssW,v.cssH);
  }
  this.processFallback();
 }
 destroy(){this.destroyed=true;this.worker?.terminate();this.resizeObserver.disconnect();for(const m of [...this.carts,...this.characters,...this.jumpCharacters,this.arm,this.jet,this.flame,this.flameCore,this.crowd,...this.chunks.values()])this.disposeMesh(m);this.gl.deleteProgram(this.program)}
}
export function project(m,p,width,height){const a=[...p,1],v=[0,0,0,0];for(let row=0;row<4;row++)for(let col=0;col<4;col++)v[row]+=m[col*4+row]*a[col];return{x:(v[0]/v[3]*.5+.5)*width,y:(.5-v[1]/v[3]*.5)*height,visible:v[3]>0}}

export class CanvasFallbackRenderer{
 constructor(canvas,board,windows){this.canvas=canvas;this.board=board;this.windows=windows;this.ctx=canvas.getContext('2d');if(!this.ctx)throw Error('無法建立繪圖畫布');this.mode='2D 相容';this.effective='low';this.realFps=0;this.projections=[];this.lastDraw=0;this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(board);this.resize()}
 setWorld(w){this.world=w;this.crowdPeople=[];for(const gate of [0,WORLD_END])for(const side of [-1,1])for(let j=0;j<12;j++){const x=gate+(gate===0?-10+j*3:-12+j*12),z=side*(6.5+(j%2)*1.1);this.crowdPeople.push({x,z,y:w.terrainY(x,z),variant:j%4})}const r=random(w.seed+':compat-props');this.props=[];for(let x=-5;x<WORLD_DRAW_END;x+=1.9){const z=w.centerZ(clamp(x/WORLD_END,0,1))+(r()>.5?1:-1)*(6+r()*33);if(w.routes.some((_,i)=>Math.abs(w.pointAtX(i,x)[2]-z)<2.6))continue;this.props.push({x,z,y:w.terrainY(x,z),s:.9+r(),v:r(),theme:w.themeAtX(x)})}}
 setQuality(){this.resize()}
 resize(){const b=this.board.getBoundingClientRect();this.canvas.width=Math.round(b.width);this.canvas.height=Math.round(b.height);this.viewports=this.windows.map(e=>{const r=e.getBoundingClientRect();return{x:r.left-b.left,y:r.top-b.top,w:r.width,h:r.height}})}
 frame(players,now,force=false,clock=now/1000){if(!this.world||!force&&now-this.lastDraw<10)return;this.lastDraw=now;const ctx=this.ctx,w=this.world;
  for(let i=0;i<3;i++){
   const v=this.viewports[i],p=players[i],cam=cameraFor(w,p),vp=matMul(perspective(fieldOfView(p),v.w/v.h,.10,110),lookAt(cam.eye,cam.target,[0,1,0])),proj=point=>project(vp,point,v.w,v.h),theme=w.themeAt(i,p.renderDistance??p.distance),x=cam.point[0];
   ctx.save();ctx.translate(v.x,v.y);ctx.beginPath();ctx.rect(0,0,v.w,v.h);ctx.clip();const sky=ctx.createLinearGradient(0,0,0,v.h);sky.addColorStop(0,theme.sky);sky.addColorStop(1,theme.fog);ctx.fillStyle=sky;ctx.fillRect(0,0,v.w,v.h);ctx.fillStyle=theme.ground;ctx.fillRect(0,v.h*.49,v.w,v.h*.51);
   const poly=(ps,color)=>{const qs=ps.map(proj);if(qs.some(q=>!q.visible))return;ctx.fillStyle=color;ctx.beginPath();qs.forEach((q,j)=>j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fill()};
   const line=(a,b,color,width)=>{const q=proj(a),r=proj(b);if(!q.visible||!r.visible)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.stroke()};
   // Shared low-detail scenery in the same 3D coordinates as the WebGL scene.
   for(let xx=x+75;xx>x-8;xx-=5){const t=w.themeAtX(xx),z=w.centerZ(clamp(xx/WORLD_END,0,1));poly([[xx,w.terrainY(xx,z-60),z-60],[xx+5,w.terrainY(xx+5,z-60),z-60],[xx+5,w.terrainY(xx+5,z+60),z+60],[xx,w.terrainY(xx,z+60),z+60]],t.ground);if(t.id==='lake'){const y=w.terrainY(xx,z+25)+.15;poly([[xx,y,z+16],[xx+5,y,z+16],[xx+5,y,z+39],[xx,y,z+39]],'#66a9b5')}}
   const items=this.props.filter(o=>Math.abs(o.x-x)<65).map(o=>({type:'prop',o,depth:Math.hypot(...sub([o.x,o.y,o.z],cam.eye))}));
   for(let lane=0;lane<3;lane++)for(let xx=Math.max(0,x-9);xx<Math.min(WORLD_DRAW_END,x+72);xx+=.85)items.push({type:'rail',lane,x:xx,depth:Math.hypot(...sub(w.pointAtX(lane,xx),cam.eye))});
   for(const other of players){const s=w.sample(other.lane,other.renderDistance??other.distance);if(Math.abs(s.point[0]-x)<70)items.push({type:'cart',p:other,s,depth:Math.hypot(...sub(s.point,cam.eye))})}
   for(const person of this.crowdPeople)if(Math.abs(person.x-x)<75)items.push({type:'crowd',o:person,depth:Math.hypot(...sub([person.x,person.y,person.z],cam.eye))});
   for(const ax of [0,WORLD_END])if(Math.abs(ax-x)<75)items.push({type:'arch',x:ax,depth:Math.hypot(...sub([ax,0,0],cam.eye))});
   items.sort((a,b)=>b.depth-a.depth);
   for(const item of items){
    if(item.type==='rail'){const a=w.pointAtX(item.lane,item.x),b=w.pointAtX(item.lane,item.x+.85),n=normalize([-(b[2]-a[2]),0,b[0]-a[0]]),width=clamp(100/item.depth,1,6);for(const side of [-1,1])line(add(a,scale(n,side*.46)),add(b,scale(n,side*.46)),'#e1ddbc',width);line(add(a,scale(n,-.7)),add(a,scale(n,.7)),'#7c6b50',width*1.5);continue}
    if(item.type==='crowd'){const o=item.o,q=proj([o.x,o.y+1,o.z]);if(!q.visible)continue;const z=clamp(v.h*.40/item.depth,2,55),bob=Math.sin(clock*8+o.x)*z*.05;ctx.fillStyle=['#e8b66b','#80bac4','#dc8e81','#9cbe7b'][o.variant];ctx.fillRect(q.x-z*.25,q.y-z*.1+bob,z*.5,z*.7);ctx.fillStyle='#efd0ad';ctx.beginPath();ctx.arc(q.x,q.y-z*.35+bob,z*.22,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#efd0ad';ctx.lineWidth=Math.max(1,z*.10);for(const k of [-1,1]){ctx.beginPath();ctx.moveTo(q.x+k*z*.24,q.y+z*.1);ctx.lineTo(q.x+k*z*.6,q.y-z*.68+bob);ctx.stroke()}continue}
    if(item.type==='arch'){const ax=item.x;for(const side of [-1,1])line([ax,0,side*5.6],[ax,4.5,side*5.6],'#efe3bf',clamp(500/item.depth,2,25));line([ax,4.5,-5.6],[ax,4.5,5.6],ax?'#efcb7c':'#9ee6c2',clamp(500/item.depth,2,25));const label=proj([ax,4.5,0]);if(label.visible){ctx.fillStyle='#fff4d7';ctx.font=`900 ${clamp(v.h*1.5/item.depth,13,60)}px system-ui`;ctx.textAlign='center';ctx.fillText(ax?'GOAL':'START',label.x,label.y+5)}continue}
    if(item.type==='prop'){const o=item.o,q=proj([o.x,o.y,o.z]);if(!q.visible)continue;const z=clamp(v.h*.51/item.depth,1,v.h*.1)*o.s,t=o.theme;
     ctx.globalAlpha=clamp(1-(item.depth-22)/90,.18,1);
     if(t.id==='desert'&&o.v<.6){ctx.strokeStyle=t.tree;ctx.lineWidth=z*.28;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x,q.y-z*2);ctx.moveTo(q.x,q.y-z);ctx.lineTo(q.x+z*.6,q.y-z);ctx.lineTo(q.x+z*.6,q.y-z*1.6);ctx.stroke();ctx.lineCap='butt'}
     else if(t.id==='volcano'||t.id==='hills'&&o.v>.5||t.id==='desert'){ctx.fillStyle=t.id==='volcano'?'#56585c':t.light;ctx.beginPath();ctx.moveTo(q.x-z*2,q.y);ctx.lineTo(q.x,q.y-z*(t.id==='volcano'?3:1.1));ctx.lineTo(q.x+z*2,q.y);ctx.fill();if(t.id==='volcano'){ctx.fillStyle='#f8a15d';ctx.beginPath();ctx.moveTo(q.x-z*.3,q.y-z*2.7);ctx.lineTo(q.x,q.y-z*3);ctx.lineTo(q.x+z*.3,q.y-z*2.7);ctx.fill()}}
     else if((t.id==='country'||t.id==='pastoral')&&o.v<.55){ctx.fillStyle='#e9d8ad';ctx.fillRect(q.x-z,q.y-z*1.4,z*2,z*1.4);ctx.fillStyle='#9d6955';ctx.beginPath();ctx.moveTo(q.x-z*1.2,q.y-z*1.4);ctx.lineTo(q.x,q.y-z*2.2);ctx.lineTo(q.x+z*1.2,q.y-z*1.4);ctx.fill();ctx.fillStyle='#75949c';ctx.fillRect(q.x-z*.55,q.y-z,z*.5,z*.5)}
     else {ctx.fillStyle='#81694e';ctx.fillRect(q.x-z*.12,q.y-z*1.4,z*.24,z*1.4);for(let j=0;j<2;j++){ctx.fillStyle=t.id==='snow'?j?'#f5f8eb':'#8faeb0':j?t.light:t.tree;ctx.beginPath();ctx.moveTo(q.x-z*(1-j*.2),q.y-z*(.65+j*.6));ctx.lineTo(q.x,q.y-z*(2.6+j*.4));ctx.lineTo(q.x+z*(1-j*.2),q.y-z*(.65+j*.6));ctx.fill()}}
     ctx.globalAlpha=1;continue;
    }
    const {p:other,s}=item,q=proj(add(s.point,scale(normalize(cross(s.right,s.forward)),1.05)));if(!q.visible)continue;const size=clamp(v.h*.8/Math.max(3,item.depth),4,v.h*.11),jump=other.jump>0?Math.sin(Math.PI*(1-other.jump/1.15))*size*.65:0;
    if(other.jetScale>.002){const scale=other.jetScale;for(const side of [-1,1]){ctx.fillStyle='#bccbd0';ctx.fillRect(q.x+side*size*.82-size*.15*scale,q.y-size*.2*scale,size*.30*scale,size*.7*scale);ctx.fillStyle='#395561';ctx.fillRect(q.x+side*size*.82-size*.18*scale,q.y+size*.43*scale,size*.36*scale,size*.15*scale);if(other.boostLevel&&other.finishTime===null){const flame=size*(.45+other.boostLevel*.35)*(.94+.1*Math.sin(clock*43));ctx.fillStyle=other.boostLevel===3?'#ffe3a0':'#ffad46';ctx.beginPath();ctx.moveTo(q.x+side*size*.82-size*.17,q.y+size*.55);ctx.lineTo(q.x+side*size*.82,q.y+size*.55+flame);ctx.lineTo(q.x+side*size*.82+size*.17,q.y+size*.55);ctx.fill()}}}
    ctx.fillStyle='#344853';ctx.beginPath();ctx.arc(q.x-size*.38,q.y+size*.32,size*.16,0,Math.PI*2);ctx.arc(q.x+size*.38,q.y+size*.32,size*.16,0,Math.PI*2);ctx.fill();ctx.fillStyle=PLAYER_COLORS[other.lane];ctx.fillRect(q.x-size*.56,q.y-size*.05,size*1.12,size*.42);ctx.strokeStyle='#d9e5cb';ctx.lineWidth=2;ctx.strokeRect(q.x-size*.56,q.y-size*.05,size*1.12,size*.42);
    ctx.save();ctx.translate(q.x,q.y-size*.33-jump);if(other.jump>0)ctx.rotate((1-other.jump/1.15)*Math.PI*2);if(other.jump>0){ctx.strokeStyle='#2e4352';ctx.lineWidth=size*.13;for(const k of [-1,1]){ctx.beginPath();ctx.moveTo(k*size*.10,size*.22);ctx.lineTo(k*size*.15,size*.63);ctx.stroke();ctx.fillStyle='#303936';ctx.fillRect(k*size*.15-size*.1,size*.60,size*.22,size*.13)}}ctx.fillStyle='#3f6670';ctx.fillRect(-size*.18,-size*.1,size*.36,size*.4);ctx.fillStyle='#f4d5ad';ctx.beginPath();ctx.arc(0,-size*.25,size*.22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e4bc64';ctx.fillRect(-size*.26,-size*.47,size*.55,size*.12);if(cam.orbit>1.3){ctx.fillStyle='#243948';for(const k of [-1,1]){ctx.beginPath();ctx.arc(k*size*.08,-size*.27,size*.025,0,Math.PI*2);ctx.fill()}ctx.strokeStyle='#704d41';ctx.lineWidth=Math.max(1,size*.025);ctx.beginPath();ctx.arc(0,-size*.23,size*.10,.15,Math.PI-.15);ctx.stroke()}if(other.finishTime!==null||other.wave>0){ctx.strokeStyle='#f4d5ad';ctx.lineWidth=size*.12;ctx.beginPath();ctx.moveTo(-size*.1,0);ctx.lineTo(-size*.5,-size*.8);ctx.stroke()}ctx.restore();
   }
   this.projections[i]=proj(add(w.sample(i,p.renderDistance??p.distance).point,[0,2.4,0]));ctx.restore();
  }this.frames=(this.frames||0)+1;if(!this.fpsStart)this.fpsStart=now;if(now-this.fpsStart>=1500){this.realFps=Math.round(this.frames*1000/(now-this.fpsStart));this.frames=0;this.fpsStart=now}
 }
 destroy(){this.resizeObserver.disconnect()}
}
