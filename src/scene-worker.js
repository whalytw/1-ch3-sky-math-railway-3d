import {SharedWorld} from './world.js?v=1.6.0';
import {makeChunk} from './scenery.js?v=1.6.0';
let world=null,queue=[],running=false;
self.onmessage=({data})=>{if(data.type==='init'){world=new SharedWorld(data.seed);queue=[];self.postMessage({type:'ready',seed:world.seed})}else if(data.type==='chunks'&&world?.seed===data.seed){queue=[...new Set([...data.indices,...queue])];if(!running)work()}};
function work(){if(!world||!queue.length){running=false;return}running=true;const index=queue.shift(),seed=world.seed,data=makeChunk(world,index);self.postMessage({type:'chunk',seed,index,data},[data.buffer]);setTimeout(work,0)}
