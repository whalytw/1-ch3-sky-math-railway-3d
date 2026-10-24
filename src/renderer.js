import {Geometry,matMul,perspective,lookAt} from './geometry.js?v=1.0.0';
import {normalize,sub,add,scale,cross,lerp,WORLD_END} from './world.js?v=1.0.0';
import {clamp,random} from './math.js?v=1.0.0';
import {CHUNK_SIZE,makeChunk,makeCart,makeCharacter,makeArm} from './scenery.js?v=1.0.0';
export const PLAYER_COLORS=['#69dfed','#ffba75','#a4e799'];
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function model(point,forward=[1,0,0],yaw=0){const right=normalize(cross(forward,[0,1,0])),up=normalize(cross(right,forward));let f=forward,r=right;if(yaw){f=add(scale(forward,Math.cos(yaw)),scale(right,Math.sin(yaw)));r=add(scale(right,Math.cos(yaw)),scale(forward,-Math.sin(yaw)))}return [f[0],f[1],f[2],0,up[0],up[1],up[2],0,r[0],r[1],r[2],0,...point,1]}
function localPoint(m,p){return [m[12]+m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[13]+m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[14]+m[2]*p[0]+m[6]*p[1]+m[10]*p[2]]}
export function cameraFor(world,p){const s=world.sample(p.lane,p.distance),f=normalize([s.forward[0],s.forward[1]*.12,s.forward[2]]),r=s.right,u=normalize(cross(r,f));
 const eye=add(add(add(s.point,scale(f,-7.5)),scale(u,3.5)),scale(r,1.3));
 eye[1]=Math.max(eye[1],world.terrainY(eye[0],eye[2])+1.8);
 const target=add(add(add(s.point,scale(f,4.2)),scale(u,2.95)),scale(r,.65));
 return {eye,target,point:s.point,forward:f};
}
const vs=`#version 300 es
in vec3 aPosition;in vec3 aNormal;in vec3 aColor;
uniform mat4 uMvp;uniform mat4 uModel;uniform vec3 uEye;uniform float uFar;
out vec3 vColor;out float vFog;
void main(){vec3 p=(uModel*vec4(aPosition,1.0)).xyz;gl_Position=uMvp*vec4(p,1.0);vec3 n=normalize(mat3(uModel)*aNormal);float light=max(0.0,dot(n,normalize(vec3(-.4,.85,.5))));vColor=aColor*(.67+.33*light);vFog=smoothstep(uFar*.35,uFar,distance(p,uEye));}`;
const fs=`#version 300 es
precision mediump float;in vec3 vColor;in float vFog;uniform vec3 uFog;out vec4 fragColor;
void main(){fragColor=vec4(mix(vColor,uFog,vFog*.96),1.0);}`;
const rgb=c=>{const n=parseInt(c.slice(1),16);return [n>>16&255,n>>8&255,n&255].map(x=>x/255)};
const mixColor=(a,b,t)=>rgb(a).map((v,i)=>lerp(v,rgb(b)[i],t));
function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
export class SharedRenderer{
 constructor(canvas,board,windows){
  this.canvas=canvas;this.board=board;this.windows=windows;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'low-power'});if(!this.gl)throw Error('WebGL2 無法使用');const gl=this.gl;
  const p=this.program=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=compile(gl,type,src);gl.attachShader(p,s);gl.deleteShader(s)}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  this.attr=['aPosition','aNormal','aColor'].map(n=>gl.getAttribLocation(p,n));this.uniform=Object.fromEntries(['uMvp','uModel','uEye','uFog','uFar'].map(n=>[n,gl.getUniformLocation(p,n)]));
  this.carts=PLAYER_COLORS.map(c=>this.upload(makeCart(c)));this.characters=PLAYER_COLORS.map(c=>this.upload(makeCharacter(c)));this.arm=this.upload(makeArm());this.chunks=[];this.quality='auto';this.effective='medium';this.realFps=0;this.frameStart=0;this.frameCount=0;this.lastDraw=0;this.slow=0;this.viewports=[];this.projections=[];this.lost=false;this.mode='3D';
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.SCISSOR_TEST);gl.disable(gl.CULL_FACE);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(board);this.resize();
 }
 upload(data){const gl=this.gl,buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {buffer,count:data.length/9}}
 setWorld(world){const gl=this.gl;for(const c of this.chunks)gl.deleteBuffer(c.mesh.buffer);this.world=world;this.chunks=[];for(let i=-1;i<=Math.floor(WORLD_END/CHUNK_SIZE);i++)this.chunks.push({index:i,mesh:this.upload(makeChunk(world,i)),center:i*CHUNK_SIZE+CHUNK_SIZE*.5});this.lastDraw=0}
 setQuality(q){this.quality=q;this.effective=q==='auto'?'medium':q;this.slow=0;this.resize()}
 resize(){const b=this.board.getBoundingClientRect(),res=this.effective==='low'?.64:this.effective==='high'?1:.82,dpr=Math.min(devicePixelRatio||1,1.25);this.ratio=res*dpr;const w=Math.max(1,Math.round(b.width*this.ratio)),h=Math.max(1,Math.round(b.height*this.ratio));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h}this.viewports=this.windows.map(el=>{const a=el.getBoundingClientRect();return {x:Math.round((a.left-b.left)*this.ratio),y:Math.round((b.bottom-a.bottom)*this.ratio),w:Math.round(a.width*this.ratio),h:Math.round(a.height*this.ratio),cssW:a.width,cssH:a.height}})}
 drawMesh(mesh,m){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);for(let j=0;j<3;j++){gl.enableVertexAttribArray(this.attr[j]);gl.vertexAttribPointer(this.attr[j],3,gl.FLOAT,false,36,j*12)}gl.uniformMatrix4fv(this.uniform.uModel,false,m);gl.drawArrays(gl.TRIANGLES,0,mesh.count)}
 frame(players,now,force=false){
  if(this.lost||!this.world)return;
  const interval=this.effective==='high'?1000/60:1000/30;if(!force&&now-this.lastDraw<interval-.8)return;
  const gap=now-this.lastDraw;this.lastDraw=now;if(!this.frameStart)this.frameStart=now;this.frameCount++;if(now-this.frameStart>=1500){this.realFps=Math.round(this.frameCount*1000/(now-this.frameStart));if(this.quality==='auto'&&this.realFps<23){this.slow++;if(this.slow>=2&&this.effective!=='low'){this.effective='low';this.resize()}}else this.slow=0;this.frameStart=now;this.frameCount=0}
  const gl=this.gl,w=this.world,far=this.effective==='low'?53:this.effective==='high'?88:68;gl.useProgram(this.program);gl.uniform1f(this.uniform.uFar,far);
  const transforms=players.map(p=>{const s=w.sample(p.lane,p.distance),car=model(add(s.point,[0,.12,0]),s.forward),jump=p.jump>0?1-p.jump/1.15:0;const character=model(localPoint(car,[0,1.05+(p.jump>0?Math.sin(Math.PI*jump)*.85:0),0]),s.forward,jump*Math.PI*2);
   const armPos=localPoint(character,[0,.19,-.27]),angle=p.wave>0?Math.sin(Math.PI*(1-p.wave/2.2))**2*2.8:.48,arm=character.slice();arm[12]=armPos[0];arm[13]=armPos[1];arm[14]=armPos[2];for(let j=0;j<3;j++){arm[4+j]=character[4+j]*Math.cos(angle)+character[8+j]*Math.sin(angle);arm[8+j]=character[8+j]*Math.cos(angle)-character[4+j]*Math.sin(angle)}
   return {point:s.point,car,character,arm,head:localPoint(character,[0,1.3,0])};});
  for(let i=0;i<3;i++){
   const v=this.viewports[i];if(!v||!v.w||!v.h)continue;gl.viewport(v.x,v.y,v.w,v.h);gl.scissor(v.x,v.y,v.w,v.h);
   const camera=cameraFor(w,players[i]),blend=w.blendAt(camera.point[0]),sky=mixColor(w.themes[0].sky,w.themes[1].sky,blend),fog=mixColor(w.themes[0].fog,w.themes[1].fog,blend);
   gl.clearColor(...sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform3fv(this.uniform.uFog,fog);gl.uniform3fv(this.uniform.uEye,camera.eye);
   const vp=matMul(perspective(.97,v.w/v.h,.12,far+20),lookAt(camera.eye,camera.target,[0,1,0]));gl.uniformMatrix4fv(this.uniform.uMvp,false,vp);
   // Static geometry is shared. Never regenerate a player's cart in another location.
   for(const c of this.chunks)if(Math.abs(c.center-camera.point[0])<far+CHUNK_SIZE/2)this.drawMesh(c.mesh,identity());
   for(let j=0;j<3;j++){if(Math.hypot(...sub(transforms[j].point,camera.eye))>far)continue;this.drawMesh(this.carts[j],transforms[j].car);this.drawMesh(this.characters[j],transforms[j].character);this.drawMesh(this.arm,transforms[j].arm)}
   this.projections[i]=project(vp,transforms[i].head,v.cssW,v.cssH);
  }
 }
 destroy(){this.resizeObserver.disconnect();const gl=this.gl;for(const m of [...this.carts,...this.characters,this.arm,...this.chunks.map(c=>c.mesh)])gl.deleteBuffer(m.buffer);gl.deleteProgram(this.program)}
}
export function project(m,p,width,height){const a=[...p,1],v=[0,0,0,0];for(let row=0;row<4;row++)for(let col=0;col<4;col++)v[row]+=m[col*4+row]*a[col];return {x:(v[0]/v[3]*.5+.5)*width,y:(.5-v[1]/v[3]*.5)*height,visible:v[3]>0}}
// Compatibility mode projects the exact shared map and all carts; race rules stay identical.
export class CanvasFallbackRenderer{
 constructor(canvas,board,windows){this.canvas=canvas;this.board=board;this.windows=windows;this.ctx=canvas.getContext('2d');if(!this.ctx)throw Error('無法建立繪圖畫布');this.mode='2D 相容';this.effective='low';this.realFps=0;this.projections=[];this.lastDraw=0;this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(board);this.resize()}
 setWorld(w){this.world=w;const r=random(w.seed+':compat-props');this.props=[];for(let x=-5;x<WORLD_END+12;x+=1.9){const z=w.centerZ(clamp(x/WORLD_END,0,1))+(r()>.5?1:-1)*(6+r()*33);if(w.routes.some((_,i)=>Math.abs(w.pointAtX(i,x)[2]-z)<2.6))continue;this.props.push({x,z,y:w.terrainY(x,z),s:.9+r(),v:r(),theme:w.themeAtX(x)})}}
 setQuality(){this.resize()}
 resize(){const b=this.board.getBoundingClientRect();this.canvas.width=Math.round(b.width);this.canvas.height=Math.round(b.height);this.viewports=this.windows.map(e=>{const r=e.getBoundingClientRect();return{x:r.left-b.left,y:r.top-b.top,w:r.width,h:r.height}})}
 frame(players,now,force=false){if(!this.world||!force&&now-this.lastDraw<40)return;this.lastDraw=now;const ctx=this.ctx,w=this.world;
  for(let i=0;i<3;i++){
   const v=this.viewports[i],p=players[i],cam=cameraFor(w,p),vp=matMul(perspective(.97,v.w/v.h,.12,100),lookAt(cam.eye,cam.target,[0,1,0])),proj=point=>project(vp,point,v.w,v.h),theme=w.themeAt(i,p.distance),x=cam.point[0];
   ctx.save();ctx.translate(v.x,v.y);ctx.beginPath();ctx.rect(0,0,v.w,v.h);ctx.clip();const sky=ctx.createLinearGradient(0,0,0,v.h);sky.addColorStop(0,theme.sky);sky.addColorStop(1,theme.fog);ctx.fillStyle=sky;ctx.fillRect(0,0,v.w,v.h);ctx.fillStyle=theme.ground;ctx.fillRect(0,v.h*.49,v.w,v.h*.51);
   const poly=(ps,color)=>{const qs=ps.map(proj);if(qs.some(q=>!q.visible))return;ctx.fillStyle=color;ctx.beginPath();qs.forEach((q,j)=>j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fill()};
   const line=(a,b,color,width)=>{const q=proj(a),r=proj(b);if(!q.visible||!r.visible)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.stroke()};
   // Shared low-detail scenery in the same 3D coordinates as the WebGL scene.
   for(let xx=x+75;xx>x-8;xx-=5){const t=w.themeAtX(xx),z=w.centerZ(clamp(xx/WORLD_END,0,1));poly([[xx,w.terrainY(xx,z-60),z-60],[xx+5,w.terrainY(xx+5,z-60),z-60],[xx+5,w.terrainY(xx+5,z+60),z+60],[xx,w.terrainY(xx,z+60),z+60]],t.ground);if(t.id==='lake'){const y=w.terrainY(xx,z+25)+.15;poly([[xx,y,z+16],[xx+5,y,z+16],[xx+5,y,z+39],[xx,y,z+39]],'#66a9b5')}}
   const items=this.props.filter(o=>Math.abs(o.x-x)<65).map(o=>({type:'prop',o,depth:Math.hypot(...sub([o.x,o.y,o.z],cam.eye))}));
   for(let lane=0;lane<3;lane++)for(let xx=Math.max(0,x-9);xx<Math.min(WORLD_END,x+72);xx+=.85)items.push({type:'rail',lane,x:xx,depth:Math.hypot(...sub(w.pointAtX(lane,xx),cam.eye))});
   for(const other of players){const s=w.sample(other.lane,other.distance);if(Math.abs(s.point[0]-x)<70)items.push({type:'cart',p:other,s,depth:Math.hypot(...sub(s.point,cam.eye))})}
   for(const ax of [0,WORLD_END])if(Math.abs(ax-x)<75)items.push({type:'arch',x:ax,depth:Math.hypot(...sub([ax,0,0],cam.eye))});
   items.sort((a,b)=>b.depth-a.depth);
   for(const item of items){
    if(item.type==='rail'){const a=w.pointAtX(item.lane,item.x),b=w.pointAtX(item.lane,item.x+.85),n=normalize([-(b[2]-a[2]),0,b[0]-a[0]]),width=clamp(100/item.depth,1,6);for(const side of [-1,1])line(add(a,scale(n,side*.46)),add(b,scale(n,side*.46)),'#e1ddbc',width);line(add(a,scale(n,-.7)),add(a,scale(n,.7)),'#7c6b50',width*1.5);continue}
    if(item.type==='arch'){const ax=item.x;for(const side of [-1,1])line([ax,0,side*5.6],[ax,4.5,side*5.6],'#efe3bf',clamp(500/item.depth,2,25));line([ax,4.5,-5.6],[ax,4.5,5.6],ax?'#efcb7c':'#9ee6c2',clamp(500/item.depth,2,25));continue}
    if(item.type==='prop'){const o=item.o,q=proj([o.x,o.y,o.z]);if(!q.visible)continue;const z=clamp(v.h*.51/item.depth,1,v.h*.1)*o.s,t=o.theme;
     ctx.globalAlpha=clamp(1-(item.depth-22)/90,.18,1);
     if(t.id==='desert'&&o.v<.6){ctx.strokeStyle=t.tree;ctx.lineWidth=z*.28;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x,q.y-z*2);ctx.moveTo(q.x,q.y-z);ctx.lineTo(q.x+z*.6,q.y-z);ctx.lineTo(q.x+z*.6,q.y-z*1.6);ctx.stroke();ctx.lineCap='butt'}
     else if(t.id==='volcano'||t.id==='hills'&&o.v>.5||t.id==='desert'){ctx.fillStyle=t.id==='volcano'?'#56585c':t.light;ctx.beginPath();ctx.moveTo(q.x-z*2,q.y);ctx.lineTo(q.x,q.y-z*(t.id==='volcano'?3:1.1));ctx.lineTo(q.x+z*2,q.y);ctx.fill();if(t.id==='volcano'){ctx.fillStyle='#f8a15d';ctx.beginPath();ctx.moveTo(q.x-z*.3,q.y-z*2.7);ctx.lineTo(q.x,q.y-z*3);ctx.lineTo(q.x+z*.3,q.y-z*2.7);ctx.fill()}}
     else if((t.id==='country'||t.id==='pastoral')&&o.v<.55){ctx.fillStyle='#e9d8ad';ctx.fillRect(q.x-z,q.y-z*1.4,z*2,z*1.4);ctx.fillStyle='#9d6955';ctx.beginPath();ctx.moveTo(q.x-z*1.2,q.y-z*1.4);ctx.lineTo(q.x,q.y-z*2.2);ctx.lineTo(q.x+z*1.2,q.y-z*1.4);ctx.fill();ctx.fillStyle='#75949c';ctx.fillRect(q.x-z*.55,q.y-z,z*.5,z*.5)}
     else {ctx.fillStyle='#81694e';ctx.fillRect(q.x-z*.12,q.y-z*1.4,z*.24,z*1.4);for(let j=0;j<2;j++){ctx.fillStyle=t.id==='snow'?j?'#f5f8eb':'#8faeb0':j?t.light:t.tree;ctx.beginPath();ctx.moveTo(q.x-z*(1-j*.2),q.y-z*(.65+j*.6));ctx.lineTo(q.x,q.y-z*(2.6+j*.4));ctx.lineTo(q.x+z*(1-j*.2),q.y-z*(.65+j*.6));ctx.fill()}}
     ctx.globalAlpha=1;continue;
    }
    const {p:other,s}=item,q=proj(add(s.point,scale(normalize(cross(s.right,s.forward)),1.05)));if(!q.visible)continue;const size=clamp(v.h*.8/Math.max(3,item.depth),4,v.h*.11),jump=other.jump>0?Math.sin(Math.PI*(1-other.jump/1.15))*size*.65:0;
    ctx.fillStyle='#344853';ctx.beginPath();ctx.arc(q.x-size*.38,q.y+size*.32,size*.16,0,Math.PI*2);ctx.arc(q.x+size*.38,q.y+size*.32,size*.16,0,Math.PI*2);ctx.fill();ctx.fillStyle=PLAYER_COLORS[other.lane];ctx.fillRect(q.x-size*.56,q.y-size*.05,size*1.12,size*.42);ctx.strokeStyle='#d9e5cb';ctx.lineWidth=2;ctx.strokeRect(q.x-size*.56,q.y-size*.05,size*1.12,size*.42);
    ctx.save();ctx.translate(q.x,q.y-size*.33-jump);if(other.jump>0)ctx.rotate((1-other.jump/1.15)*Math.PI*2);ctx.fillStyle='#3f6670';ctx.fillRect(-size*.18,-size*.1,size*.36,size*.4);ctx.fillStyle='#f4d5ad';ctx.beginPath();ctx.arc(0,-size*.25,size*.22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e4bc64';ctx.fillRect(-size*.26,-size*.47,size*.55,size*.12);if(other.wave>0){ctx.strokeStyle='#f4d5ad';ctx.lineWidth=size*.12;ctx.beginPath();ctx.moveTo(-size*.1,0);ctx.lineTo(-size*.5,-size*.8);ctx.stroke()}ctx.restore();
   }
   this.projections[i]=proj(add(w.sample(i,p.distance).point,[0,2.4,0]));ctx.restore();
  }this.frames=(this.frames||0)+1;if(!this.fpsStart)this.fpsStart=now;if(now-this.fpsStart>=1500){this.realFps=Math.round(this.frames*1000/(now-this.fpsStart));this.frames=0;this.fpsStart=now}
 }
 destroy(){this.resizeObserver.disconnect()}
}
