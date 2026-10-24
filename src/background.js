import {random,hash32} from './math.js?v=1.4.0';
export const BACKGROUNDS=Object.freeze([
 ['auto','每場隨機'],['sunset','晚霞與落日'],['alpine','雄偉群山'],['fuji','富士山與薄雲'],['castle','湖畔城堡'],['aurora','極光與星空'],['sea','海上群島'],['spires','沙漠古城'],['planet','星環行星'],['cloudpalace','雲端宮殿']
].map(([id,label])=>({id,label})));
export function makePanorama(seed,theme,style='auto',factory=null){
 const create=factory||(()=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1536,512):typeof document!=='undefined'?document.createElement('canvas'):null),canvas=create();if(!canvas)return null;
 canvas.width=1536;canvas.height=512;const c=canvas.getContext('2d');if(!c)return null;
 const W=1536,H=512,r=random(seed+':panorama:'+theme.id),pick=style==='auto'?BACKGROUNDS[1+hash32(seed+theme.id)%9].id:style;
 const night=['aurora','planet'].includes(pick),warm=pick==='sunset',grad=c.createLinearGradient(0,0,0,H);
 grad.addColorStop(0,night?'#20334f':warm?'#bd8aa2':'#6da9c5');grad.addColorStop(.6,night?'#60738c':warm?'#e9bba4':theme.sky);grad.addColorStop(1,night?'#9bacb5':warm?'#f0cfad':theme.fog);c.fillStyle=grad;c.fillRect(0,0,W,H);
 const disc=(x,y,rad,col)=>{c.fillStyle=col;c.beginPath();c.arc(x,y,rad,0,Math.PI*2);c.fill()};
 if(night){for(let j=0;j<100;j++)disc(r()*W,r()*H*.67,1+r(),j%4?'#d5e2dc':'#f6e6ba')}
 else {disc(W*(warm?.70:.56),H*.30,warm?40:25,warm?'#f8ddad':'#f8f1d1')}
 if(pick==='planet'){disc(W*.64,H*.27,53,'#dbc7ad');c.strokeStyle='#a6c5c9';c.lineWidth=10;c.beginPath();c.ellipse(W*.64,H*.27,85,20,-.25,0,Math.PI*2);c.stroke()}
 if(pick==='aurora')for(let j=0;j<4;j++){c.strokeStyle=['#90d7c24d','#b9abcf55','#a6d3d74d','#d9c5cb33'][j];c.lineWidth=24;c.beginPath();for(let x=0;x<=W;x+=30){const y=140+Math.sin(x*.008+j*.7)*35+j*12;x?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}
 const ridge=(layer,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(0,H);for(let x=0;x<=W;x+=24){const y=H*(.65+layer*.085)-Math.abs(Math.sin(x*.004+layer*2))*(55+layer*10)-Math.abs(Math.sin(x*.013+layer))*18;c.lineTo(x,y)}c.lineTo(W,H);c.closePath();c.fill()};
 ridge(0,night?'#687b8e':warm?'#af9eac':'#99b6bf');ridge(1,night?'#657b82':warm?'#a1a6a6':'#86a8b0');
 if(pick==='fuji'||pick==='alpine'){
  const peak=(x,y,w,h)=>{c.fillStyle='#748fa1';c.beginPath();c.moveTo(x-w,H*.86);c.lineTo(x,y);c.lineTo(x+w,H*.86);c.fill();c.fillStyle='#eef0e7';c.beginPath();c.moveTo(x,y);c.lineTo(x-w*.30,y+h*.30);c.lineTo(x-w*.10,y+h*.23);c.lineTo(x+w*.09,y+h*.31);c.lineTo(x+w*.31,y+h*.30);c.fill()};
  if(pick==='fuji')peak(W*.66,155,250,230);else for(let j=0;j<5;j++)peak(110+j*310,165+(j%2)*38,210,210);
 }
 if(pick==='castle'||pick==='spires'||pick==='cloudpalace'){
  const base=pick==='cloudpalace'?290:385,x=1040,col=pick==='spires'?'#b59b83':'#afbfc0';c.fillStyle=col;c.fillRect(x-120,base-80,240,80);
  for(let j=0;j<5;j++){const xx=x-118+j*59,hh=100+(j%2)*35;c.fillStyle=col;c.fillRect(xx,base-hh,31,hh);c.fillStyle=pick==='spires'?'#cfb590':'#819bab';c.beginPath();c.moveTo(xx-8,base-hh);c.lineTo(xx+15,base-hh-35);c.lineTo(xx+39,base-hh);c.fill();c.fillStyle='#e0dfc5';c.fillRect(xx+11,base-hh+21,8,16)}
 }
 if(pick==='sea'){c.fillStyle='#7aa6b5';c.fillRect(0,388,W,124);for(let j=0;j<7;j++){c.fillStyle='#759693';c.beginPath();const x=120+j*221;c.ellipse(x,395,60+j%3*20,18,0,Math.PI,Math.PI*2);c.fill()}}
 // Soft painted cloud strips and a foreground haze conceal panorama joins.
 for(let j=0;j<16;j++){const x=r()*W,y=210+r()*150;c.fillStyle=night?'#cfdbdf13':'#f6f2df40';c.beginPath();c.ellipse(x,y,60+r()*100,7+r()*13,0,0,Math.PI*2);c.fill()}
 const haze=c.createLinearGradient(0,H*.7,0,H);haze.addColorStop(0,theme.fog+'00');haze.addColorStop(1,theme.fog);c.fillStyle=haze;c.fillRect(0,H*.7,W,H*.3);
 return {canvas,style:pick};
}
