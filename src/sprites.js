import {normalize,cross,sub} from './world.js?v=1.6.0';
// Compatibility mode reuses the real original 3D meshes as cached painted sprites.
// Rasterize once when a map/seat changes, never rebuild triangles during gameplay.
export function makeSprite(data,front=false){
 if(typeof document==='undefined'&&typeof OffscreenCanvas==='undefined')return null;
 const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(320,320):document.createElement('canvas');canvas.width=320;canvas.height=320;const ctx=canvas.getContext('2d');if(!ctx)return null;
 const forward=normalize(front?[-7,-3,-6]:[7,-3,-6]),right=normalize(cross(forward,[0,1,0])),up=normalize(cross(right,forward)),dot=(p,v)=>p.reduce((a,x,i)=>a+x*v[i],0),verts=[];
 let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
 for(let i=0;i<data.length;i+=9){const p=[data[i],data[i+1],data[i+2]],x=dot(p,right),y=-dot(p,up),depth=dot(p,forward);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);verts.push({x,y,depth,index:i})}
 const span=Math.max(x1-x0,y1-y0,.01),factor=310/span,ox=(320-(x1-x0)*factor)/2,oy=(320-(y1-y0)*factor)/2;
 // A real depth buffer avoids average-depth painter errors on a number plate over a large wall.
 const image=ctx.createImageData(320,320),pixels=image.data,depths=new Float32Array(320*320);depths.fill(Infinity);
 for(const p of verts){p.x=ox+(p.x-x0)*factor;p.y=oy+(p.y-y0)*factor}
 for(let i=0;i<verts.length;i+=3){const a=verts[i],b=verts[i+1],c=verts[i+2],det=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(det)<1e-6)continue;
  const loX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),hiX=Math.min(319,Math.ceil(Math.max(a.x,b.x,c.x))),loY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),hiY=Math.min(319,Math.ceil(Math.max(a.y,b.y,c.y))),n=a.index,light=.72+.28*Math.max(0,(-.4*data[n+3]+.85*data[n+4]+.5*data[n+5])/.99),color=[data[n+6],data[n+7],data[n+8]].map(c=>Math.round(c*255*light));
  for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){const A=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/det,B=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/det,C=1-A-B;if(A<0||B<0||C<0)continue;const depth=A*a.depth+B*b.depth+C*c.depth,index=y*320+x;if(depth>=depths[index])continue;depths[index]=depth;const p=index*4;pixels[p]=color[0];pixels[p+1]=color[1];pixels[p+2]=color[2];pixels[p+3]=255}
 }
 ctx.putImageData(image,0,0);
 return {canvas,x:x0-ox/factor,y:y0-oy/factor,size:320/factor,content:{x:ox,y:oy,width:(x1-x0)*factor,height:(y1-y0)*factor}};
}
export function paintSprite(ctx,sprite,x,y,scale){if(sprite)ctx.drawImage(sprite.canvas,x+sprite.x*scale,y+sprite.y*scale,sprite.size*scale,sprite.size*scale)}
