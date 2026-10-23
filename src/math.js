/* 題庫為原始程式生成，知識點取自高中數學 CH3-2。所有答案以數值模型計算，介面與圖形共享同一實例。 */
export const ISLANDS = [
  {name:'鏡像之島',short:'鏡像傳送門',emoji:'◇',stars:1,time:35,source:'109–111',tone:'#73e6dc'},
  {name:'函數能源站',short:'能量充電器',emoji:'⚡',stars:1,time:35,source:'112–113',tone:'#7cdbf0'},
  {name:'斜坡峽谷',short:'直線升降橋',emoji:'╱',stars:2,time:50,source:'114–115',tone:'#ffd18b'},
  {name:'拋物線工廠',short:'拋物線造軌',emoji:'∪',stars:2,time:50,source:'116–118',tone:'#d7aff8'},
  {name:'配方研究所',short:'頂點式密碼',emoji:'⌘',stars:2,time:60,source:'119–121',tone:'#9dc4fb'},
  {name:'判別式迷宮',short:'判別式岔路',emoji:'⑂',stars:3,time:65,source:'122–123',tone:'#f6c6a0'},
  {name:'極值山谷',short:'極值寶藏',emoji:'◆',stars:3,time:70,source:'123–125',tone:'#c4e993'},
  {name:'最佳化天空城',short:'城市最佳化',emoji:'♜',stars:4,time:100,source:'126–129',tone:'#f8b5d1'}
];
export const BASE_STARS = ISLANDS.map(x=>x.stars);
export const BASE_TIMES = ISLANDS.map(x=>x.time);
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function hash32(input){let h=2166136261;for(const c of String(input)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export function random(seed){let v=typeof seed==='number'?seed:hash32(seed);return ()=>{v+=0x6D2B79F5;let t=v;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
const randint=(r,min,max)=>Math.floor(r()*(max-min+1))+min;
const signed=(n,variable='')=>(n<0?`−${Math.abs(n)}`:`+${n}`)+variable;
const term=(n,variable='')=>n===0?'':variable===''?(n>0?`+${n}`:`−${-n}`):(n===1?`+${variable}`:n===-1?`−${variable}`:(n>0?`+${n}${variable}`:`−${-n}${variable}`));
const coef=(n,variable)=>n===1?variable:n===-1?`−${variable}`:`${n}${variable}`;
export const coordinate=(x,y)=>`(${x}, ${y})`;
export function quadraticText(a,b,c){return `${coef(a,'x²')}${term(b,'x')}${term(c,'')}`.replace(/^\+/,'')}
export function vertexText(a,h,k){return `${coef(a,`(x${h<0?`+${-h}`:h>0?`−${h}`:''})²`)}${term(k,'')}`}
export function formatNumber(x){return Number.isInteger(x)?String(x):String(Math.round(x*10000)/10000)}
export function defaultConfig(){return {enabled:ISLANDS.map((_,i)=>i<4),stars:[...BASE_STARS],timeMode:'island',timeFixed:60,hints:2,quality:'auto',showExplanations:true}}
export function normalizeConfig(raw){const d=defaultConfig();if(!raw||typeof raw!=='object')return d;return {enabled:d.enabled.map((v,i)=>typeof raw.enabled?.[i]==='boolean'?raw.enabled[i]:v),stars:d.stars.map((v,i)=>clamp(Math.round(Number(raw.stars?.[i])||v),1,5)),timeMode:['island','fixed','unlimited'].includes(raw.timeMode)?raw.timeMode:d.timeMode,timeFixed:clamp(Math.round(Number(raw.timeFixed)||60),20,180),hints:clamp(Math.round(Number(raw.hints)??2),0,3),quality:['auto','low','medium','high'].includes(raw.quality)?raw.quality:'auto',showExplanations:raw.showExplanations!==false}}
export function routeSummary(config){const ids=config.enabled.map((yes,i)=>yes?i:-1).filter(i=>i>=0);return {ids,count:ids.length,stars:ids.reduce((s,i)=>s+config.stars[i],0),seconds:ids.reduce((s,i)=>s+(config.timeMode==='unlimited'?0:config.timeMode==='fixed'?config.timeFixed:BASE_TIMES[i]),0)}}
export const human=(x)=>String(x).replace(/-/g,'−');

// 同一座島的子題型由共用場次 seed 決定，三名學生只更換數字。
export function subtypeFor(island,sharedSeed){const r=random(`${sharedSeed}:type:${island}`);const choices=[['mirror','midpoint'],['evaluate','mapping'],['linear'],['horizontal','vertical','opening','width'],['square'],['positive','zero','negative'],['vertex','interval'],['fence','revenue']][island];return pick(r,choices)}
function graphForQuadratic(a,b,c){return {type:'quadratic',a,b,c}}
function uniquePoint(r){let a=pick(r,[-4,-3,-2,-1,1,2,3,4]),b=pick(r,[-4,-3,-2,-1,1,2,3,4]);while(Math.abs(a)===Math.abs(b))b=pick(r,[-4,-3,-2,-1,1,2,3,4]);return {a,b}}
export function generateQuestion(island,stars,seed,sharedSeed){
 const r=random(seed);const st=clamp(stars,1,5);let subtype=subtypeFor(island,sharedSeed);
 const common={island,stars:st,subtype,seed:String(seed),source:ISLANDS[island].source};
 if(island===0){
   if(st>=4){
     const {a,b}=uniquePoint(r),choices=['x','y','diagonal','origin'];let points=[[a,b]],steps=[],current=[a,b];const loops=st>=5?3:2;
     for(let z=0;z<loops;z++){const t=pick(r,choices.filter(v=>v!==steps.at(-1)?.kind));const names={x:'x 軸',y:'y 軸',diagonal:'直線 y=x',origin:'原點'};const out=t==='x'?[current[0],-current[1]]:t==='y'?[-current[0],current[1]]:t==='origin'?[-current[0],-current[1]]:[current[1],current[0]];steps.push({kind:t,text:`第 ${z+1} 步：關於${names[t]}對稱，${coordinate(...current)} → ${coordinate(...out)}。`,name:names[t]});current=out;points.push(out)}
     return {...common,subtype:'chain',title:'連續鏡面傳送',instruction:`從 P=${coordinate(a,b)} 出發，${steps.map(x=>`關於${x.name}對稱`).join('，接著')}。求最後坐標。`,formula:`P=${coordinate(a,b)} → ?`,mode:'pair',fields:[{key:'x',label:'終點 x',min:-6,max:6},{key:'y',label:'終點 y',min:-6,max:6}],correct:{x:current[0],y:current[1]},initial:{x:'',y:''},graph:{type:'points',points:[points[0],points.at(-1)]},steps:[...steps.map(x=>x.text),`最後到達 ${coordinate(...current)}。`]};
   }
   if(subtype==='midpoint' && st===1)subtype='mirror';
   if(subtype==='midpoint'){
     const mx=randint(r,-2,2),my=randint(r,-2,2),dx=pick(r,[1,2,3]),dy=pick(r,[1,2,3]);const A=[mx-dx,my-dy],B=[mx+dx,my+dy];
     return {...common,subtype,title:'中點造橋',instruction:'把橋墩放在 A、B 兩點的正中間。',formula:`A=${coordinate(...A)}　B=${coordinate(...B)}`,mode:'pair',fields:[{key:'x',label:'中點 x',min:-5,max:5},{key:'y',label:'中點 y',min:-5,max:5}],correct:{x:mx,y:my},initial:{x:0,y:0},graph:{type:'points',points:[A,B,[mx,my]]},steps:[`中點的 x 坐標：(${A[0]}+${B[0]})÷2=${mx}。`,`中點的 y 坐標：(${A[1]}+${B[1]})÷2=${my}。`,`正確橋墩位置為 M=${coordinate(mx,my)}。`]}
   }
   const {a,b}=uniquePoint(r);const transforms=[{id:'x',label:'關於 x 軸',p:[a,-b]},{id:'y',label:'關於 y 軸',p:[-a,b]},{id:'origin',label:'關於原點',p:[-a,-b]},{id:'diagonal',label:'關於 y=x',p:[b,a]}];const target=pick(r,transforms);
   return {...common,subtype:'mirror',title:'鏡像傳送門',instruction:`礦車位於 P=${coordinate(a,b)}，要抵達 Q=${coordinate(...target.p)}，請選擇正確的鏡面。`,formula:`P ${coordinate(a,b)}　→　Q ${coordinate(...target.p)}`,mode:'choice',options:transforms.map(({id,label})=>({value:id,label})),correct:target.id,initial:null,graph:{type:'points',points:[[a,b],target.p],mirror:target.id},steps:[`起點 P=${coordinate(a,b)}。`,`關於${target.label.replace('關於','')}對稱，得到 ${coordinate(...target.p)}。`,`因此選擇「${target.label}」傳送門。`]}
 }
 if(island===1){
   if(st>=3){
     const a=pick(r,[-2,-1,1,2]),b=randint(r,-4,4),c=randint(r,-3,3),mode=st===3?'minus':st===4?'plus':'double',arg=mode==='minus'?'−x':mode==='plus'?'x+1':'2x−1';
     const A=mode==='minus'?a:mode==='plus'?a:4*a;
     const B=mode==='minus'?-b:mode==='plus'?2*a+b:-4*a+2*b;
     const C=mode==='minus'?c:mode==='plus'?a+b+c:a-b+c;
     return {...common,subtype:'expression',title:'函數代入變換',instruction:`求 f(${arg}) 的展開式係數。將答案寫成 Ax²+Bx+C。`,formula:`f(x)=${quadraticText(a,b,c)}　求 f(${arg})`,mode:'pair',fields:[{key:'A',label:'x² 係數 A',min:-20,max:20},{key:'B',label:'x 係數 B',min:-40,max:40},{key:'C',label:'常數 C',min:-40,max:40}],correct:{A,B,C},initial:{A:'',B:'',C:''},graph:graphForQuadratic(A,B,C),steps:[`將 x 換成 (${arg})：f(${arg})=${a}(${arg})²${term(b,`(${arg})`)}${term(c,'')}。`,`展開並合併同類項：${quadraticText(A,B,C)}。`,`因此 A=${A}、B=${B}、C=${C}。`]};
   }
   if(subtype==='mapping'&&st<=1)subtype='evaluate';
   if(subtype==='mapping'){
     const k=pick(r,[-3,-2,-1,1,2,3]);const c=randint(r,-4,4),x=randint(r,-3,3),y=k*x+c;
     return {...common,subtype,title:'函數對應配對',instruction:`已知 f(x)=${coef(k,'x')}${term(c,'')}，請輸入 x=${x} 對應的 y 值。`,formula:`f(x) = ${coef(k,'x')}${term(c,'')}　,　x=${x}`,mode:'number',correct:y,initial:'',graph:{type:'linear',a:k,b:c},steps:[`將 x=${x} 代入函數。`,`f(${x})=${k}×(${x})${term(c,'')}=${y}。`,`每個輸入 x 只對應一個輸出 y。`]}
   }
   let a,b,c,x,y,count=0;do{a=pick(r,st<=2?[-1,1]:[-2,-1,1,2]);b=randint(r,-3,3);c=randint(r,-4,4);x=randint(r,-2,3);y=a*x*x+b*x+c;count++}while(Math.abs(y)>12&&count<300);
   return {...common,subtype:'evaluate',title:'函數能源站',instruction:`輸入 f(${x}) 的值，為礦車充電。`,formula:`f(x)=${quadraticText(a,b,c)}　,　求 f(${x})`,mode:'number',correct:y,initial:'',graph:graphForQuadratic(a,b,c),steps:[`將 x=${x} 代入 f(x)=${quadraticText(a,b,c)}。`,`f(${x})=(${a})×(${x})²+(${b})×(${x})+(${c})。`,`整理得到 f(${x})=${y}。`]}
 }
 if(island===2){const a=pick(r,st<=2?[-2,-1,1,2]:st===3?[-3,-2,-1,1,2,3]:[-1.5,-.5,.5,1.5]),b=st>=5?randint(r,-6,6)/2:randint(r,-3,3),dx=st>=4?2:1;return {...common,title:'直線升降橋',instruction:'請調整斜率 a 和截距 b，使直線軌道通過下列兩點。',formula:`A=${coordinate(0,b)}　B=${coordinate(dx,a*dx+b)}`,mode:'sliders',controls:[{key:'a',label:'斜率 a',min:-3,max:3,step:st>=4?.5:1,nonzero:true},{key:'b',label:'截距 b',min:-4,max:4,step:st>=5?.5:1}],correct:{a,b},initial:{a:1,b:0},graph:{type:'linear',a,b},steps:[`直線通過 A=(0,${b})，因此 y 軸截距 b=${b}。`,`從 x=0 到 x=${dx}，y 的變化為 (${a*dx+b})−(${b})=${a*dx}，因此斜率 a=${a*dx}/${dx}=${a}。`,`正確直線為 y=${coef(a,'x')}${term(b,'')}。`]}}
 if(island===3){
   if(st>=3){
     const a=st===3?1:pick(r,[-2,-1,1,2]),h=pick(r,[-3,-2,-1,1,2,3]),k=pick(r,[-3,-2,-1,1,2,3]);
     const controls=(st>=4?[{key:'a',label:'開口係數 a',min:-2,max:2,step:1,nonzero:true}]:[]).concat([{key:'h',label:'水平平移 h',min:-3,max:3,step:1},{key:'k',label:'鉛直平移 k',min:-3,max:3,step:1}]);
     const correct=st>=4?{a,h,k}:{h,k},initial=st>=4?{a:1,h:0,k:0}:{h:0,k:0};
     return {...common,subtype:'multi-shift',title:'多參數軌道造橋',instruction:`調整${st>=4?' a、h、k 三個參數':'水平與鉛直平移'}，讓軌道成為指定的函數圖形。`,formula:`目標：y=${vertexText(a,h,k)}`,mode:'sliders',controls,correct,initial,graph:graphForQuadratic(a,-2*a*h,a*h*h+k),steps:[`目標頂點是 (${h},${k})，所以 h=${h}、k=${k}。`,st>=4?`開口係數 a=${a}，決定方向和寬窄。`:'保持原來的開口係數 a=1。',`目標函數是 y=${vertexText(a,h,k)}。`]};
   }
   const kind=subtype;let a=1,h=0,k=0;
   if(kind==='horizontal'){h=pick(r,[-3,-2,-1,1,2,3])}else if(kind==='vertical'){k=pick(r,[-3,-2,-1,1,2,3])}else if(kind==='opening'){a=-1}else{a=pick(r,[2,-2]);}
   const key=kind==='horizontal'?'h':kind==='vertical'?'k':'a';const correct={[key]:kind==='horizontal'?h:kind==='vertical'?k:a};const desc=kind==='horizontal'?`將 y=x² 水平平移到頂點 (${h},0)。`:kind==='vertical'?`將 y=x² 垂直平移到頂點 (0,${k})。`:kind==='opening'?'讓軌道由開口向上變成開口向下。':'調整係數 a，使軌道達到指定的開口寬窄。';const controls=[{key,label:key==='a'?'開口係數 a':key==='h'?'水平平移 h':'鉛直平移 k',min:key==='a'?-2:-3,max:3,step:1,nonzero:key==='a'}];
   return {...common,title:'拋物線造軌廠',instruction:desc,formula:`目標：y=${vertexText(a,h,k)}`,mode:'sliders',controls,correct,initial:{[key]:key==='a'?1:0},graph:graphForQuadratic(a,-2*a*h,a*h*h+k),steps:[`原始軌道是 y=x²。`,`目標為 y=${vertexText(a,h,k)}。`,key==='h'?`頂點水平移至 x=${h}，所以 h=${h}。`:key==='k'?`頂點移到 y=${k}，所以 k=${k}。`:`二次項係數 a=${a}，決定開口方向及寬窄。`]}
 }
 if(island===4){const h=pick(r,[-3,-2,-1,1,2,3]),k=randint(r,-3,4),a=st<=2?1:pick(r,[-2,-1,1,2]),b=-2*a*h,c=a*h*h+k;
   return {...common,title:'頂點式密碼鎖',instruction:'將一般式配方，輸入頂點式中的 h 和 k。',formula:`f(x)=${quadraticText(a,b,c)}`,mode:'pair',fields:[{key:'h',label:'頂點 x 坐標 h',min:-6,max:6},{key:'k',label:'頂點 y 坐標 k',min:-15,max:15}],correct:{h,k},initial:{h:0,k:0},graph:graphForQuadratic(a,b,c),steps:[`先整理 f(x)=${a}(x²${term(b/a,'x')})${term(c,'')}。`,`湊完全平方，得到 f(x)=${vertexText(a,h,k)}。`,`頂點位置為 (${h},${k})，因此 h=${h}、k=${k}。`]}
 }
 if(island===5){
   let a,b,c,D;const target=subtype==='positive'?0:subtype==='zero'?1:2;
   if(target===0){a=pick(r,[-2,-1,1,2]);let t=pick(r,[-3,-2,-1,0,1,2,3]),u=pick(r,[-3,-2,-1,0,1,2,3].filter(v=>v!==t));b=-a*(t+u);c=a*t*u}
   else if(target===1){a=pick(r,[-2,-1,1,2]);const h=randint(r,-2,2);b=-2*a*h;c=a*h*h}
   else {a=pick(r,[-2,-1,1,2]);const h=randint(r,-2,2),q=pick(r,[1,2,3]);b=-2*a*h;c=a*(h*h+q)}
   D=b*b-4*a*c;
   if(Math.max(Math.abs(a),Math.abs(b),Math.abs(c))>20)return generateQuestion(island,stars,`${seed}:retry`,sharedSeed);
   const options=[{value:'2',label:'2 個交點'},{value:'1',label:'1 個交點'},{value:'0',label:'沒有交點'}];
   return {...common,title:'判別式三岔迷宮',instruction:'判斷拋物線與 x 軸的實際交點個數，選擇正確的鐵道路線。',formula:`f(x)=${quadraticText(a,b,c)}`,mode:'choice',options,correct:options[target].value,initial:null,graph:graphForQuadratic(a,b,c),steps:[`a=${a}、b=${b}、c=${c}。`,`D=b²−4ac=${b}²−4×(${a})×(${c})=${D}。`,D>0?'D>0，與 x 軸交於兩點。':D===0?'D=0，與 x 軸相切，只有一個交點。':'D<0，與 x 軸沒有實數交點。']}
 }
 if(island===6){
   const a=pick(r,[-2,-1,1,2]),h=randint(r,-2,2),k=randint(r,-5,4),b=-2*a*h,c=a*h*h+k;let L=null,R=null;
   if(subtype==='interval' && st>=3){const outside=r()<.45;if(outside){L=h+1;R=h+pick(r,[3,4]);}else{L=h-pick(r,[2,3]);R=h+pick(r,[1,2,3]);}}
   const x=L===null?h:clamp(h,L,R),value=a*(x-h)*(x-h)+k,kind=a>0?'最小':'最大';
   return {...common,subtype:L===null?'vertex':'interval',title:'極值寶藏山谷',instruction:`求${L===null?'實數範圍內':`${L} ≤ x ≤ ${R} 內`}的${kind}值及發生位置。`,formula:`f(x)=${quadraticText(a,b,c)}`,mode:'pair',fields:[{key:'x',label:`${kind}值發生於 x`,min:-8,max:8},{key:'value',label:`${kind}值`,min:-40,max:40}],correct:{x,value},initial:{x:0,value:0},graph:{...graphForQuadratic(a,b,c),interval:L===null?null:[L,R],markX:x},steps:[`將函數配成頂點式：f(x)=${vertexText(a,h,k)}。`,`頂點為 (${h},${k})，開口${a>0?'向上':'向下'}。`,L===null?`因此在 x=${h} 發生${kind}值 ${k}。`:`限制區間為 [${L},${R}]；比較頂點（若在區間內）與端點的函數值，${kind}值為 ${value}，發生於 x=${x}。`]}
 }
 if(island===7){
   if(subtype==='fence'){
     const perimeter=pick(r,[40,60,80,100,120]),half=perimeter/2,best=perimeter/4;
     return {...common,title:'天空城遊樂園',instruction:`圍欄總長 ${perimeter} 公尺，設長 x 公尺、寬 (${half}−x) 公尺。調整 x，讓面積最大。`,formula:`A(x)=x(${half}−x)`,mode:'optimization',variable:'x',min:5,max:half-5,step:1,correct:{x:best},initial:{x:5},metric:x=>x*(half-x),metricName:'目前面積',unit:'平方公尺',graph:{type:'quadratic',a:-1,b:half,c:0,interval:[5,half-5],markX:best},steps:[`由周長 ${perimeter} 得長＋寬=${half}。`,`面積 A(x)=x(${half}−x)=−x²+${half}x。`,`長寬相等時面積最大，x=${best} 公尺，最大面積 ${best*best} 平方公尺。`]}
   }
   const p=pick(r,[30,40,50,60]),d=pick(r,[5,10]),best=pick(r,[3,5,8,10]),q=d*(p+2*best),maxX=Math.min(p+best+5,Math.floor(q/d)-1),actual=p+best,bestRev=(p+best)*(q-d*best);
   return {...common,title:'天空城人氣商店',instruction:`原價 ${p} 元、每日 ${q} 件；每漲 1 元少賣 ${d} 件。調整漲價 x，使營業額最大。`,formula:`R(x)=(${p}+x)(${q}−${d}x)`,mode:'optimization',variable:'x',min:0,max:maxX,step:1,correct:{x:best},initial:{x:0},metric:x=>(p+x)*(q-d*x),metricName:'每日營業額',unit:'元',graph:{type:'quadratic',a:-d,b:q-d*p,c:p*q,interval:[0,maxX],markX:best},steps:[`漲價 x 元後，單價 ${p}+x，銷售量 ${q}−${d}x。`,`R(x)=(${p}+x)(${q}−${d}x)。`,`最大值發生於 x=${best}；最佳售價 ${actual} 元，最大營業額 ${bestRev} 元。`]}
 }
 throw Error(`Unknown island ${island}`);
}
export function isCorrect(q,reply){if(q.mode==='choice')return String(reply)===String(q.correct);if(q.mode==='number')return Number.isFinite(Number(reply))&&String(reply).trim()!==''&&Number(reply)===q.correct;return Object.keys(q.correct).every(key=>{const v=reply?.[key];return v!==''&&v!==undefined&&v!==null&&Number.isFinite(Number(v))&&Number(v)===q.correct[key]})}
export function correctText(q){if(q.mode==='choice'){return q.options.find(x=>String(x.value)===String(q.correct))?.label??String(q.correct)}if(q.mode==='number')return String(q.correct);return Object.entries(q.correct).map(([key,value])=>`${key}=${value}`).join('，')}
export function graphValue(graph,x){if(!graph)return 0;if(graph.type==='linear')return graph.a*x+graph.b;if(graph.type==='quadratic')return graph.a*x*x+graph.b*x+graph.c;return 0}
