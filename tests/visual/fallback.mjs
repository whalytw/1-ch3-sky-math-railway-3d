import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const {createCanvas,loadImage}=require('@napi-rs/canvas');
import fs from 'node:fs';
import {CanvasFallbackRenderer,GAME_SHADERS} from '../../src/renderer.js';
import {SharedWorld,add,scale,normalize,cross} from '../../src/world.js';
import {defaultSettings} from '../../src/race.js';
import {artworkBank,ART_SHEETS,isolateViewAtlas,loadArtwork} from '../../src/artwork.js?v=1.6.0';
import {makeChunk,CHUNK_SIZE} from '../../src/scenery.js';
const dir='qa/replay';fs.mkdirSync(dir,{recursive:true});
globalThis.document={createElement:()=>createCanvas(1,1)};globalThis.OffscreenCanvas=class{constructor(w,h){return createCanvas(w,h)}};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestIdleCallback=()=>{};globalThis.devicePixelRatio=1;
await loadArtwork();const bank=artworkBank();for(const [key,def]of Object.entries(ART_SHEETS)){const im=await loadImage('assets/'+def.file),packed=def.isolatedViews?isolateViewAtlas(im):im;bank.images.set(key,packed);if(def.isolatedViews)fs.writeFileSync('qa/'+key+'-packed.png',packed.toBuffer('image/png'));}
const board={getBoundingClientRect:()=>({left:0,top:0,bottom:810,width:1440,height:810})},windows=[0,1,2].map(i=>({getBoundingClientRect:()=>({left:i*480,top:0,bottom:810,width:480,height:810}),querySelectorAll:()=>[]}));
for(const scenario of ['day','night','bridge']){
 const canvas=createCanvas(1440,810),renderer=new CanvasFallbackRenderer(canvas,board,windows),w=new SharedWorld('v16-gallery'),settings={...defaultSettings(),quality:'high',shadows:'fine',backgroundStyle:scenario==='night'?'aurora':'alpine'};renderer.setQuality('high');renderer.setSceneSettings(settings);renderer.setWorld(w);await renderer.artReady;
 const distance=scenario==='bridge'?650:150,players=[0,1,2].map(lane=>({lane,distance,renderDistance:distance,speed:60,finishTime:null,jump:0,wave:0,jetScale:0,phase:'between',questionNumber:0}));
 
 const anchor=w.sample(1,distance+38).point;
 const make=(id,dx,y,z,size,forward)=>({id,key:id,point:add(anchor,[dx,y,z]),size,forward,radius:8,extended:id==='airships',alpha:1,phase:0,motion:0,rotation:0,variant:0,side:1,count:1});
 const island={...make('islands',0,0,0,930,[1,0,0]),point:[26937,5400,-3500],distant:true,alpha:.85};
 const fixtures=scenario==='night'?[make('unicorns',0,5,-4,1.9,[0,0,1]),make('ufos',14,8,3,1.5,[1,0,.5]),make('jellyfish',8,6,-9,1.5,[1,0,0]),island]:[make('paperplanes',-4,4,-4,1.5,[0,0,-1]),make('airships',42,17,2,4,[0,0,1]),make('birds',8,6,6,1.5,[0,0,1]),island];
 renderer.decorations.instances=()=>fixtures;renderer.frame(players,1000,true,12);fs.writeFileSync(dir+'/'+scenario+'-fallback.png',canvas.toBuffer('image/png'));renderer.destroy();console.log('PASS Canvas fallback',scenario);
}
