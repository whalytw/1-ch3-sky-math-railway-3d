// Continuous articulated deformation: one image and one wing pair, never pose cross-fades.
export const TAU=Math.PI*2;
export const ANIMATIONS=Object.freeze({
 birds:{kind:1,rate:10.3,label:'雙翼關節拍翼與尾羽'},dragons:{kind:2,rate:4.8,label:'雙翼拍動與尾巴'},
 butterflies:{kind:3,rate:12.7,label:'各自振翅'},jellyfish:{kind:4,rate:2.8,label:'傘部收縮與觸手波動'},
 whales:{kind:5,rate:2.1,label:'尾鰭擺動'},witches:{kind:6,rate:3.2,label:'披風、裙襬與掃把穗'},
 heroes:{kind:7,rate:4.1,label:'披風波動'},robots:{kind:8,rate:9.2,label:'噴射火焰脈動'},
 airships:{kind:9,rate:2.4,label:'尾帆、螺旋槳與蒸汽'},cloudsheep:{kind:10,rate:3.8,label:'四腳交替踢動'},
 kites:{kind:11,rate:3.1,label:'尾帶波動'},balloons:{kind:12,rate:1.8,label:'吊籃擺動與燃燒器'},
 islands:{kind:13,rate:2.6,label:'流水與樹冠'},paperplanes:{kind:14,rate:2.3,label:'獨立傾斜與微幅翼面彎曲'},
 biplanes:{kind:15,rate:5.1,label:'旋轉螺旋槳與圍巾'}
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export function deformArt(kind,x,y,t,mirror=1){
 x*=mirror;let X=x,Y=y,Z=0;
 if(kind===1||kind===2){const root=kind===1?.14:.21,d=Math.max(0,Math.abs(x)-root),w=ease(-.45,-.12,y),angle=Math.sin(t)*(kind===1?.92:.76),fold=d*(1-Math.cos(angle))*w;
  X=x-Math.sign(x)*fold;Y=y+d*Math.sin(angle)*.78*w;Z=d*Math.sin(angle)*.12*w;
  const tail=ease(-.22,-.86,y)*(1-ease(.18,.35,Math.abs(x)));X+=Math.sin(t-.8)*tail*(kind===1?.025:.065);
 }else if(kind===3){const d=Math.max(0,Math.abs(x)-.08),a=Math.sin(t)*1.38;X=x-Math.sign(x)*d*(1-Math.cos(a));Y+=d*Math.sin(a)*.12;Z=d*Math.sin(a)*.22;
 }else if(kind===4){const bell=ease(.02,.35,y),s=Math.sin(t),tail=ease(.14,-.92,y);X=x*(1+.11*s*bell)+.14*tail*tail*Math.sin(t-tail*5+x*3);Y=y-(y-.72)*.07*s*bell+.065*tail*Math.sin(t-.8);
 }else if(kind===5){const tail=ease(.15,-.82,x);Y+=tail*.14*Math.sin(t+x*2);X+=tail*.035*Math.sin(t);Z+=tail*.03*Math.cos(t);
 }else if(kind===6){const cloth=ease(.18,-.70,x)*ease(-.40,.05,y)*(1-ease(.40,.73,y));Y+=cloth*.075*Math.sin(t+x*4);X+=cloth*.025*Math.sin(t+.9);Y+=ease(-.42,-.85,x)*ease(.06,-.65,y)*.045*Math.sin(t+1.4);
 }else if(kind===7){const cape=ease(.35,-.75,x)*ease(-.30,.0,y)*(1-ease(.5,.75,y));Y+=cape*.12*Math.sin(t+x*4);X+=cape*.025*Math.cos(t+x*3);
 }else if(kind===8){const flame=ease(.0,-.64,x)*ease(.18,-.72,y),pulse=Math.sin(t)+.25*Math.sin(t*3);X-=flame*.055*pulse;Y-=flame*.05*pulse;
 }else if(kind===9){const sail=ease(-.15,-.9,x)*ease(-.2,.15,y);Y+=sail*.04*Math.sin(t+x*4);
 }else if(kind===10){const leg=ease(-.13,-.65,y),phase=x<-.35?0:x<0?Math.PI:x<.4?0:Math.PI;X+=leg*.065*Math.sin(t+phase);Y+=leg*.045*Math.cos(t+phase);
 }else if(kind===11){const tail=ease(.05,-.88,y);X+=tail*tail*.13*Math.sin(t-tail*6);Y+=tail*.03*Math.cos(t-tail*4);
 }else if(kind===12){const basket=ease(-.20,-.75,y);X+=basket*.055*Math.sin(t);Y+=basket*.014*Math.cos(t*2);
 }else if(kind===13){const water=ease(-.05,-.80,y)*ease(-.15,.15,x)*(1-ease(.55,.85,x));X+=water*.025*Math.sin(t-y*10);Y+=water*.035*Math.sin(t-y*12);X+=ease(.15,.72,y)*.018*Math.sin(t+y*3);
 }else if(kind===14){Y+=Math.abs(x)*.022*Math.sin(t+x*2);
 }else if(kind===15){const scarf=ease(.1,-.48,x)*ease(-.1,.05,y)*(1-ease(.35,.52,y));Y+=scarf*.045*Math.sin(t+x*5);}
 return [X*mirror,Y,Z];
}
export const ART_DEFORM_GLSL=`
float artEase(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
vec3 artSkin(float kind,vec2 uv,float t,float mirror){float x=uv.x*mirror,y=uv.y;vec3 p=vec3(x,y,0.);
 if(kind<2.5){float root=kind<1.5?.14:.21,d=max(0.,abs(x)-root),w=artEase(-.45,-.12,y),a=sin(t)*(kind<1.5?.92:.76);p.x-=sign(x)*d*(1.-cos(a))*w;p.y+=d*sin(a)*.78*w;p.z=d*sin(a)*.12*w;float tail=artEase(-.22,-.86,y)*(1.-artEase(.18,.35,abs(x)));p.x+=sin(t-.8)*tail*(kind<1.5?.025:.065);}
 else if(kind<3.5){float d=max(0.,abs(x)-.08),a=sin(t)*1.38;p.x-=sign(x)*d*(1.-cos(a));p.y+=d*sin(a)*.12;p.z=d*sin(a)*.22;}
 else if(kind<4.5){float bell=artEase(.02,.35,y),s=sin(t),tail=artEase(.14,-.92,y);p.x=x*(1.+.11*s*bell)+.14*tail*tail*sin(t-tail*5.+x*3.);p.y=y-(y-.72)*.07*s*bell+.065*tail*sin(t-.8);}
 else if(kind<5.5){float tail=artEase(.15,-.82,x);p.y+=tail*.14*sin(t+x*2.);p.x+=tail*.035*sin(t);p.z+=tail*.03*cos(t);}
 else if(kind<6.5){float cloth=artEase(.18,-.70,x)*artEase(-.40,.05,y)*(1.-artEase(.40,.73,y));p.y+=cloth*.075*sin(t+x*4.);p.x+=cloth*.025*sin(t+.9);p.y+=artEase(-.42,-.85,x)*artEase(.06,-.65,y)*.045*sin(t+1.4);}
 else if(kind<7.5){float cape=artEase(.35,-.75,x)*artEase(-.30,.0,y)*(1.-artEase(.5,.75,y));p.y+=cape*.12*sin(t+x*4.);p.x+=cape*.025*cos(t+x*3.);}
 else if(kind<8.5){float flame=artEase(.0,-.64,x)*artEase(.18,-.72,y),pulse=sin(t)+.25*sin(t*3.);p.x-=flame*.055*pulse;p.y-=flame*.05*pulse;}
 else if(kind<9.5){float sail=artEase(-.15,-.9,x)*artEase(-.2,.15,y);p.y+=sail*.04*sin(t+x*4.);}
 else if(kind<10.5){float leg=artEase(-.13,-.65,y),phase=x<-.35?0.:x<0.?3.14159265:x<.4?0.:3.14159265;p.x+=leg*.065*sin(t+phase);p.y+=leg*.045*cos(t+phase);}
 else if(kind<11.5){float tail=artEase(.05,-.88,y);p.x+=tail*tail*.13*sin(t-tail*6.);p.y+=tail*.03*cos(t-tail*4.);}
 else if(kind<12.5){float basket=artEase(-.20,-.75,y);p.x+=basket*.055*sin(t);p.y+=basket*.014*cos(t*2.);}
 else if(kind<13.5){float water=artEase(-.05,-.80,y)*artEase(-.15,.15,x)*(1.-artEase(.55,.85,x));p.x+=water*.025*sin(t-y*10.);p.y+=water*.035*sin(t-y*12.);p.x+=artEase(.15,.72,y)*.018*sin(t+y*3.);}
 else if(kind<14.5){p.y+=abs(x)*.022*sin(t+x*2.);}
 else {float scarf=artEase(.1,-.48,x)*artEase(-.1,.05,y)*(1.-artEase(.35,.52,y));p.y+=scarf*.045*sin(t+x*5.);}
 p.x*=mirror;return p;}
`;
export function artMeshData(nx=24,ny=24){const data=[];const v=(x,y)=>[x,y,0,0,0,1,1,1,1];for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=i/nx*2-1,X=(i+1)/nx*2-1,y=j/ny*2-1,Y=(j+1)/ny*2-1;for(const p of[[x,y],[X,y],[X,Y],[x,y],[X,Y],[x,Y]])data.push(...v(...p))}return new Float32Array(data)}
export function animationPhase(id,clock,phase=0){return ((clock*ANIMATIONS[id].rate+phase)%TAU+TAU)%TAU}
export function artAttachments(id,clock,phase=0){const t=clock+(phase||0),out=[];
 if(id==='biplanes')out.push({kind:'propeller',x:.64,y:-.12,r:.23,angle:t*27,alpha:.75});
 if(id==='airships'){out.push({kind:'propeller',x:-.39,y:-.43,r:.17,angle:t*18,alpha:.75});for(let i=0;i<3;i++){const q=(t*.65+i/3)%1;out.push({kind:'steam',x:-.36-q*.17,y:-.13+q*.26,r:.035+q*.07,angle:0,alpha:Math.sin(q*Math.PI)*.28})}}
 if(id==='balloons')out.push({kind:'flame',x:-.04,y:-.10,r:.035*(1+.22*Math.sin(t*17)),angle:0,alpha:.75+.2*Math.sin(t*11)});
 if(id==='islands')for(let i=0;i<3;i++){const q=(t*.65+i/3)%1;out.push({kind:'drop',x:.23+.025*Math.sin(t+i),y:-.48-q*.38,r:.012,angle:0,alpha:Math.sin(q*Math.PI)*.65})}
 return out;
}
