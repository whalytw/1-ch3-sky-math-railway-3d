import {writeFileSync} from 'node:fs';
import {GAME_SHADERS,makeArtFx,artAttachmentMatrix} from '../../src/renderer.js';
import {ART_SHEETS,FLIGHT_ART} from '../../src/artwork.js';
import {ANIMATIONS,animationPhase,artMeshData,artAttachments,ART_DEFORM_GLSL,deformArt} from '../../src/animation.js';
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const ids=Object.keys(FLIGHT_ART);
const data={shaders:GAME_SHADERS,deformGLSL:ART_DEFORM_GLSL,mesh:Array.from(artMeshData()),fx:Object.fromEntries(['propeller','steam','flame','drop'].map(k=>[k,Array.from(makeArtFx(k))])),ids,art:ids.map(id=>({id,...ART_SHEETS[FLIGHT_ART[id].sheet],...ANIMATIONS[id]})),frames:[]};
for(let frame=0;frame<240;frame++){const clock=frame/30;data.frames.push(ids.map(id=>({phase:animationPhase(id,clock),attachments:artAttachments(id,clock).map(fx=>({...fx,matrix:Array.from(artAttachmentMatrix(identity,fx))}))})))}
data.probes=[];for(const a of [...Object.values(ANIMATIONS),{kind:16},{kind:18}])for(const mirror of [-1,1])for(let i=0;i<15;i++){const x=-.95+(i%5)*.475,y=-.85+Math.floor(i/5)*.8,t=i*.39;data.probes.push({kind:a.kind,x,y,t,mirror,expected:deformArt(a.kind,x,y,t,mirror)})}
writeFileSync('qa/deformation-v16.json',JSON.stringify(data));console.log('Exported production shader and '+data.probes.length+' CPU/GPU probes');
