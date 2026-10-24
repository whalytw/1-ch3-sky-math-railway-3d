const minus=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const normalize=a=>{let n=Math.hypot(...a)||1;return a.map(v=>v/n)};
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const mul=(a,k)=>a.map(v=>v*k);
const hex=s=>{const n=parseInt(s.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
export function matMul(a,b){const out=Array(16).fill(0);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];return out}
export function perspective(fovy,aspect,n,f){const t=1/Math.tan(fovy/2),v=1/(n-f);return [t/aspect,0,0,0,0,t,0,0,0,0,(f+n)*v,-1,0,0,(2*f*n)*v,0]}
export function lookAt(eye,at,up){const z=normalize(minus(eye,at)),x=normalize(cross(up,z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]}
export class Geometry{
 constructor(){this.v=[]}
 triangle(a,b,c,col){const norm=normalize(cross(minus(b,a),minus(c,a))),clr=typeof col==='string'?hex(col):col;for(const p of [a,b,c])this.v.push(...p,...norm,...clr)}
 quad(a,b,c,d,col){this.triangle(a,b,c,col);this.triangle(a,c,d,col)}
 box(x,y,z,w,h,d,c){const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],c);this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],c);this.quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],c);this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],c);this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],c);this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],c)}
 rod(a,b,width,depth,c){const d=normalize(minus(b,a)),side=normalize(cross(d,Math.abs(d[1])>.98?[0,0,1]:[0,1,0])),up=normalize(cross(side,d));const w=mul(side,width/2),t=mul(up,depth/2);const A=add(a,w),B=minus(a,w),C=add(b,w),D=minus(b,w);this.quad(add(A,t),add(C,t),add(D,t),add(B,t),c);this.quad(minus(B,t),minus(D,t),minus(C,t),minus(A,t),c);this.quad(add(A,t),minus(A,t),minus(C,t),add(C,t),c);this.quad(add(D,t),minus(D,t),minus(B,t),add(B,t),c);this.quad(add(C,t),minus(C,t),minus(D,t),add(D,t),c);this.quad(add(B,t),minus(B,t),minus(A,t),add(A,t),c)}

 sphere(x,y,z,r,c,sections=8,rings=5){for(let i=0;i<rings;i++){let lat1=-Math.PI/2+i*Math.PI/rings,lat2=-Math.PI/2+(i+1)*Math.PI/rings;for(let j=0;j<sections;j++){let lon1=j*2*Math.PI/sections,lon2=(j+1)*2*Math.PI/sections;const p=(lat,lon)=>[x+r*Math.cos(lat)*Math.cos(lon),y+r*Math.sin(lat),z+r*Math.cos(lat)*Math.sin(lon)];this.quad(p(lat1,lon1),p(lat1,lon2),p(lat2,lon2),p(lat2,lon1),c)}}}
 ellipsoid(x,y,z,rx,ry,rz,c,sections=14,rings=8,latMin=-Math.PI/2,latMax=Math.PI/2){const clr=typeof c==='string'?hex(c):c;const vertex=(lat,lon)=>{const nx=Math.cos(lat)*Math.cos(lon),ny=Math.sin(lat),nz=Math.cos(lat)*Math.sin(lon);return [[x+rx*nx,y+ry*ny,z+rz*nz],normalize([nx/rx,ny/ry,nz/rz])]};for(let i=0;i<rings;i++)for(let j=0;j<sections;j++){const a=latMin+(latMax-latMin)*i/rings,b=latMin+(latMax-latMin)*(i+1)/rings,c=j*2*Math.PI/sections,d=(j+1)*2*Math.PI/sections,A=vertex(a,c),B=vertex(a,d),C=vertex(b,d),D=vertex(b,c);for(const [p,n]of[A,B,C,A,C,D])this.v.push(...p,...n,...clr)}}
 cone(x,topY,bottomY,z,radius,c,sides=7){for(let i=0;i<sides;i++){const t=i*2*Math.PI/sides,u=(i+1)*2*Math.PI/sides;const a=[x+Math.cos(t)*radius,topY,z+Math.sin(t)*radius],b=[x+Math.cos(u)*radius,topY,z+Math.sin(u)*radius];this.triangle([x,bottomY,z],b,a,c);this.triangle([x,topY,z],a,b,c)}}
 pyramid(x,y,z,w,h,c){this.cone(x,y-h/2,y+h/2,z,w/2,c,4)}
 clear(){this.v=[]}
 array(){return new Float32Array(this.v)}
}
