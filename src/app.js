import {ISLANDS,BASE_STARS,BASE_TIMES,clamp,correctText,formatNumber,graphValue} from './math.js?v=1.2.0';
import {SharedWorld} from './world.js?v=1.2.0';
import {Race,defaultSettings,normalizeSettings,formatRaceTime} from './race.js?v=1.2.0';
import {SharedRenderer,CanvasFallbackRenderer,PLAYER_COLORS} from './renderer.js?v=1.2.0';
import {SpeedEffects} from './effects.js?v=1.2.0';
import {bindPress} from './touch.js?v=1.2.0';
import {DECORATIONS} from './decorations.js?v=1.2.0';
import {BACKGROUNDS} from './background.js?v=1.2.0';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const SETTINGS_KEY='sky-railway-shared-v1',RECORDS_KEY='sky-railway-race-records-v1';
let settings=normalizeSettings(store.get(SETTINGS_KEY,defaultSettings())),records=store.get(RECORDS_KEY,[]),world,race,renderer,effects,manualPaused=false,lastTime=0,lastHUD=0,lastStatus=0,toastTimer,goUntil=0,diagnosticMode=false,stats={counts:[0,0,0],active:0,max:0},savedRace=false,contextLost=false;
const lanes=['藍隊','橘隊','綠隊'];
const timeText=t=>formatRaceTime(t,settings.scoreFormat);
const freshSeed=()=>{try{return `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`}catch{return `${Date.now()}-${Math.random()}`}};
const audio={ctx:null,master:null,init(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;this.ctx??=new A();if(!this.master){this.master=this.ctx.createGain();this.master.connect(this.ctx.destination)}this.master.gain.value=settings.sound?.55:0;if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{})}catch{}},tone(freq,at=0,len=.15,type='sine',volume=.18){const c=this.ctx;if(!c||!settings.sound)return;const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+at;o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+len+.03);o.onended=()=>{o.disconnect();g.disconnect()}},play(type){if(!settings.sound)return;const seq={count:[[440,0,.12]],go:[[523,0,.2],[659,.06,.2],[784,.12,.45]],correct:[[659,0,.11],[880,.1,.15],[1047,.2,.22]],wrong:[[233,0,.18],[174,.16,.23]],hint:[[587,0,.17],[740,.1,.2]],midpoint:[[784,0,.2]],finish:[[523,0,.18],[659,.12,.18],[784,.24,.18],[1047,.36,.45]],overtake:[[523,0,.2],[659,.08,.2],[784,.16,.2],[1047,.27,.5]]}[type]||[];for(const n of seq)this.tone(...n,type==='wrong'?'triangle':'sine');if(['overtake','finish','go'].includes(type)&&this.ctx){const c=this.ctx,n=c.sampleRate*.8,buffer=c.createBuffer(1,n,c.sampleRate),data=buffer.getChannelData(0);for(let j=0;j<n;j++)data[j]=(Math.random()*2-1)*Math.sin(Math.PI*j/n)*(.6+.4*Math.sin(j/110));const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();src.buffer=buffer;filter.type='bandpass';filter.frequency.value=1250;filter.Q.value=.6;g.gain.value=.12;src.connect(filter);filter.connect(g);g.connect(this.master);src.start();src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect()}}}};
function toast(message){$('#toast').textContent=message;$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),3000)}
function laneMarkup(i){return `<section class="lane" data-lane="${i}" style="--player:${PLAYER_COLORS[i]}" aria-label="${lanes[i]}遊戲區">
 <div class="hud"><div class="identity"><span class="player-label"><i></i>${lanes[i]} <span id="seatLabel-${i}"></span></span><span class="stopwatch" id="clock-${i}">00:00.0</span><span class="rank">第 <b id="rank-${i}">1</b> 名</span></div>
 <div class="progress" aria-label="路線完成度"><div class="progress-line"></div><div class="progress-fill" id="fill-${i}"></div><span class="progress-end">0%</span><span class="progress-end end">100%</span>${PLAYER_COLORS.map((c,j)=>`<span class="progress-dot ${i===j?'self':''}" id="dot-${i}-${j}" style="--dot:${c};left:0%;${i!==j?`top:${(j<i?j:j-1)===0?-3:21}px`:''}">${i===j?`<b class="progress-number" id="percent-${i}">0.0%</b>`:''}</span>`).join('')}</div></div>
 <div class="question hidden" id="question-${i}"></div>
 <div class="feedback hidden" id="feedback-${i}"></div>
 <div class="keypad hidden" id="keypad-${i}" aria-label="${lanes[i]}數字鍵盤"><div class="keypad-label"><span>數字鍵盤</span><span>→ 換欄　✓ 送出</span></div><div class="keys">${['1','2','3','4','5','6','7','8','9','±','0','.','⌫','→','✓'].map(k=>`<button data-action="key" data-key="${k}" aria-label="${k==='⌫'?'刪除一字':k==='→'?'下一欄':k==='✓'?'確認答案':k==='±'?'正負號':k}" class="${k==='→'?'field-next':''}">${k}</button>`).join('')}</div></div>
 <div class="telemetry"><div class="biome-tag" id="biome-${i}"></div><div class="speed"><span id="speed-${i}">0</span><small>km/h</small></div><div class="jet-level" id="level-${i}">引擎待命</div><div class="boost" id="boostBox-${i}">ϟ 加速 <b id="boost-${i}">0.0</b> 秒</div><div class="distance" id="distance-${i}">0.00 / 5.00 km</div></div>
 <div class="lane-message" id="message-${i}"></div><div class="exclaim hidden" id="exclaim-${i}">!!</div>
 <div class="finish-card hidden" id="finish-${i}"></div><section class="player-review hidden" id="ownReview-${i}" aria-label="${lanes[i]}自己的解題紀錄"></section>
 </section>`}
function fieldsFor(q){if(q.mode==='number')return [{key:'value',label:'答案'}];if(q.mode==='pair')return q.fields;if(q.mode==='sliders')return q.controls;return [{key:'x',label:'調整 x'}]}
function valueOf(p,key){return p.question.mode==='number'?p.reply:p.reply?.[key]}
function setValue(p,key,value){if(p.question.mode==='number')p.reply=value;else p.reply[key]=value}
function paintQuestion(p){const q=p.question,i=p.lane,choice=q.mode==='choice',fields=choice?[]:fieldsFor(q);p.replaceNext=true;
 $('#question-'+i).innerHTML=`<div class="question-head"><span>第 ${p.questionNumber} 題 · ${esc(ISLANDS[q.island].name)} ${'★'.repeat(q.stars)}</span><b class="question-timer" id="timer-${i}"></b></div>
 <div class="question-body"><div class="instruction">${esc(q.instruction)}</div><div class="parameter-formula">${esc(q.parameterFormula||'')}</div><div class="formula">${esc(q.formula)}</div>
 ${choice?`<div class="choice-grid">${q.options.map(opt=>`<button data-action="choice" data-value="${esc(opt.value)}">${esc(opt.label)}</button>`).join('')}</div>`:
 `<div class="answers ${fields.length===3?'three':''}">${fields.map((f,j)=>`<button class="answer-field ${j===0?'active':''}" data-action="field" data-field="${j}"><small>${esc(f.label)}</small><strong data-readout="${esc(f.key)}">${esc(valueOf(p,f.key)??'')||'＿'}</strong></button>`).join('')}</div>${q.mode==='optimization'?`<div class="hint-copy" data-metric></div>`:''}`}
 <div class="hint-copy hidden" id="hint-${i}"></div></div>
 <div class="question-footer"><button data-action="hint" id="hintBtn-${i}">✦ 求救卡 −10 秒</button><button class="submit" data-action="submit">✓ 確認答案</button></div>`;
 $('#question-'+i).classList.remove('hidden');$('#feedback-'+i).classList.add('hidden');$('#keypad-'+i).classList.toggle('hidden',choice);$('#message-'+i).textContent='';updateFields(p);
}
function updateFields(p){if(!p.question||p.phase!=='question')return;const panel=$('#question-'+p.lane);
 if(p.question.mode==='choice'){panel.querySelectorAll('[data-action=choice]').forEach(b=>{const selected=String(b.dataset.value)===String(p.reply);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});return}
 const fields=fieldsFor(p.question);panel.querySelectorAll('[data-action=field]').forEach((b,j)=>{b.classList.toggle('active',j===p.activeField);b.setAttribute('aria-pressed',String(j===p.activeField));b.querySelector('strong').textContent=String(valueOf(p,fields[j].key)??'').replace(/-/g,'−')||'＿'});
 const metric=panel.querySelector('[data-metric]');if(metric){const x=Number(p.reply.x);metric.textContent=`${p.question.metricName}：${Number.isFinite(x)?formatNumber(p.question.metric(x)):'—'} ${p.question.unit}`}
}
function paintFeedback(p){const i=p.lane,last=p.results.at(-1),q=p.question;$('#question-'+i).classList.add('hidden');$('#keypad-'+i).classList.add('hidden');const panel=$('#feedback-'+i);panel.classList.remove('hidden');panel.classList.toggle('wrong',!last.correct);
 panel.innerHTML=`<strong>${last.correct?'✓ 答對了！':last.reason==='timeout'?'⌛ 時間到':'這題再想一想'}</strong><p>${last.correct?`加速時間 <b>＋${p.bonusAwarded.toFixed(1)}</b> 秒`:`正確答案：${esc(correctText(q))}`}</p><div class="next-in">下一題還有 <b id="next-${i}">5</b> 秒 · 礦車持續前進</div><details><summary>查看解題步驟</summary><ol>${q.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><div class="mini-graph">${graphSVG(q)}</div></details>`;
}
function keyInput(p,key){if(p.phase!=='question'||p.question.mode==='choice')return;
 if(key==='✓'){submit(p);return}const fields=fieldsFor(p.question);if(key==='→'){p.activeField=(p.activeField+1)%fields.length;p.replaceNext=true;updateFields(p);return}
 const f=fields[p.activeField];let v=String(valueOf(p,f.key)??'');if(key==='⌫'){v=v.slice(0,-1);p.replaceNext=false}else if(key==='±'){if(p.replaceNext)v='';v=v.startsWith('-')?v.slice(1):'-'+v;p.replaceNext=false}else if(key==='.'){if(p.replaceNext)v='';if(!v.includes('.'))v=(v==='-'?'-0':v||'0')+'.';p.replaceNext=false}else if(/^\d$/.test(key)){if(p.replaceNext)v='';if(v.length<9)v+=key;p.replaceNext=false}else return;setValue(p,f.key,v);updateFields(p);
}
function submit(p){if(p.phase!=='question')return;const q=p.question;
 if(q.mode==='choice'){if(p.reply===null||p.reply===undefined){toast(`${lanes[p.lane]}：請先選擇答案`);return}}
 else {const fields=fieldsFor(q);if(fields.some(f=>{const v=valueOf(p,f.key);return v===null||v===undefined||String(v).trim()===''||!Number.isFinite(Number(v))})){toast(`${lanes[p.lane]}：請填好每個數值欄位`);return}}
 race.submit(p.lane,p.reply);processEvents();updateHUD();
}
function showHint(p){if(!race.hint(p.lane))return;if(p.phase==='question'){$('#hint-'+p.lane).textContent=p.question.steps[0];$('#hint-'+p.lane).classList.remove('hidden');$('#hintBtn-'+p.lane).disabled=true;$('#hintBtn-'+p.lane).textContent='✦ 求救卡已用完'}processEvents();updateHUD()}
function paintFinish(p){const i=p.lane;$('#question-'+i).classList.add('hidden');$('#keypad-'+i).classList.add('hidden');$('#feedback-'+i).classList.add('hidden');const rank=rankOf(p),correct=p.results.filter(r=>r.correct).length;
 $('#finish-'+i).innerHTML=`<div class="finish-heading"><b>✦ 第 ${rank} 名抵達！</b><span>${esc(p.seat)} 號 · ${timeText(p.finishTime)}</span></div><p>答對 ${correct} / ${p.results.length} 題 · 5.00 km</p><p class="finish-wait" id="finishWait-${i}"></p><div class="finish-actions"><button data-action="review-player">查看我的解題紀錄</button><button class="primary hidden next-round" data-action="next-round">↻ 下一組</button></div>`;$('#finish-'+i).classList.remove('hidden');
}
function paintOwnReview(p){if(p.finishTime===null)return;p.reviewOpen=true;$('#ownReview-'+p.lane).innerHTML=`<header><div><small>${lanes[p.lane]} · ${esc(p.seat)} 號</small><h3>我的解題紀錄</h3></div><button data-action="close-own-review" aria-label="關閉${lanes[p.lane]}解題紀錄">✕ 關閉</button></header><div class="own-review-body"><p class="note">完賽時間 ${timeText(p.finishTime)}。這個面板只顯示你的紀錄；另外兩區繼續比賽。</p>${p.results.map(r=>`<details class="own-question"><summary class="${r.correct?'correct':'wrong'}">${r.correct?'✓':'×'} 第 ${r.number} 題 · ${esc(r.question.title)}</summary><p>${esc(r.question.instruction)}</p><p class="parameter-formula">${esc(r.question.parameterFormula||'')}</p><p class="formula">${esc(r.question.formula)}</p><b>正確答案：${esc(correctText(r.question))}</b><ol>${r.question.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol><div class="mini-graph">${graphSVG(r.question)}</div></details>`).join('')||'<p>本場沒有已完成題目。</p>'}</div>`;$('#ownReview-'+p.lane).classList.remove('hidden')}
function closeOwnReview(p){p.reviewOpen=false;$('#ownReview-'+p.lane).classList.add('hidden')}

function rankOf(p){if(p.finishTime!==null)return 1+race.players.filter(o=>o.finishTime!==null&&o.finishTime<p.finishTime-1e-7).length;return 1+race.players.filter(o=>o.distance>p.distance+1e-7).length}
function processEvents(){const events=race.drainEvents();if(!events.length)return;for(const ev of events){
 if(ev.type==='count'){audio.play('count');$('#countdown strong').textContent=ev.value;$('#countdown span').textContent='準備出發';$('#countdown').classList.remove('hidden')}
 if(ev.type==='go'){audio.play('go');$('#countdown strong').textContent='GO';$('#countdown span').textContent='向 5 公里終點出發';goUntil=performance.now()+900}
 if(ev.type==='question')paintQuestion(race.players[ev.lane]);
 if(ev.type==='correct'||ev.type==='wrong'){audio.play(ev.type);paintFeedback(race.players[ev.lane])}
 if(ev.type==='hint')audio.play('hint');
 if(ev.type==='midpoint')audio.play('midpoint');
 if(ev.type==='overtake')audio.play('overtake');
 if(ev.type==='finish'){audio.play('finish');paintFinish(race.players[ev.lane])}
 if(ev.type==='all-finished')saveRace();
 if(ev.type==='complete'){manualPaused=false;saveRace();$$('.next-round').forEach(b=>b.classList.remove('hidden'));$('#pauseBtn').disabled=true;toast('三人都已完賽並停妥，可以開始下一組！')}
 }updatePauseUI()}
function prepareMap(){
 refreshSeats();world=new SharedWorld(freshSeed());race=new Race(settings,world.seed,[0,1,2].map(i=>Number($('#seat-'+i).value)));renderer?.setSceneSettings(settings);renderer?.setWorld(world);renderer?.setSeats([0,1,2].map(i=>$('#seat-'+i).value));savedRace=false;manualPaused=false;goUntil=0;
 $('#biomePair').innerHTML=`<span>${esc(world.themes[0].name)}</span><small>2.5 km →</small><span>${esc(world.themes[1].name)}</span>`;
 $('#routeMeta').textContent=`${world.themes.map(t=>t.name).join(' → ')} · 5.00 km`;
 $('#lobbySettings').textContent=`${settings.enabled.filter(Boolean).length} 類題型 · ${settings.timeMode==='fixed'?settings.seconds+' 秒／題':'依題型計時'}`;
 $('#lobby').classList.remove('hidden');$('#countdown').classList.add('hidden');for(let i=0;i<3;i++){for(const name of ['question','feedback','keypad','finish','exclaim','ownReview'])$('#'+name+'-'+i).classList.add('hidden');$('#message-'+i).textContent='同一張地圖 · 等待一起出發'}
 $('#pauseBtn').disabled=true;updateHUD();renderer?.frame(race.players,performance.now(),true,0);effects?.frame(race.players,0);updatePauseUI();
}
function startRace(){
 const seats=[0,1,2].map(i=>Number($('#seat-'+i).value));if(seats.some(s=>!Number.isInteger(s)||s<1||s>settings.seatMax)){toast(`請選擇 1～${settings.seatMax} 的有效座號`);return}if(new Set(seats).size<3){toast('三位學生請使用不同的座號');return}if(!settings.enabled.some(Boolean)){toast('請在統一設定啟用至少一類題型');return}
 audio.init();renderer?.setSeats(seats);race=new Race(settings,world.seed,seats);savedRace=false;manualPaused=false;lastTime=performance.now();race.start();$('#lobby').classList.add('hidden');$('#pauseBtn').disabled=false;for(let i=0;i<3;i++)$('#message-'+i).textContent='';processEvents();updateHUD();
}
function updateHUD(){if(!race)return;
 for(const p of race.players){const i=p.lane,pct=p.distance/50;
  $('#seatLabel-'+i).textContent=`${p.seat} 號`;$('#clock-'+i).textContent=timeText(p.finishTime??race.elapsed);$('#rank-'+i).textContent=rankOf(p);
  $('#fill-'+i).style.width=pct+'%';$('#percent-'+i).textContent=pct.toFixed(1)+'%';$('#percent-'+i).style.transform=pct<8?'translateX(-10%)':pct>92?'translateX(-90%)':'translateX(-50%)';
  for(const o of race.players)$('#dot-'+i+'-'+o.lane).style.left=(o.distance/50)+'%';
  $('#speed-'+i).textContent=Math.round(p.speed);$('#boost-'+i).textContent=p.boost.toFixed(1);$('#boostBox-'+i).classList.toggle('on',p.boost>0);const badge=$('#level-'+i);badge.textContent=p.finishTime!==null?(p.speed>0?'終點滑行':'已停妥'):p.boostLevel?`JET LEVEL ${p.boostLevel}`:'引擎待命';badge.dataset.level=String(p.boostLevel);$('#distance-'+i).textContent=`${(p.distance/1000).toFixed(2)} / 5.00 km`;
  $('#biome-'+i).textContent=`${world.themeAt(i,p.distance).name} · ${p.distance<2500?'前半程':'後半程'}`;
  const timer=$('#timer-'+i);if(timer&&p.phase==='question'){timer.textContent=Math.ceil(p.remaining)+' 秒';timer.classList.toggle('urgent',p.remaining<=10)}
  if(p.phase==='feedback'&&$('#next-'+i))$('#next-'+i).textContent=Math.ceil(p.wait);
  if(p.phase==='travel'&&race.status==='racing')$('#message-'+i).textContent=`首題將在 ${Math.ceil(p.wait)} 秒後出現`;
  if(p.finishTime!==null&&$('#finishWait-'+i)){$('#finishWait-'+i).textContent=p.phase==='coasting'?`微笑揮手中 · ${Math.ceil(15-p.coastElapsed)} 秒後停妥`:race.status==='complete'?'全員停妥，下一組準備！':`已停妥 · 另外 ${race.players.filter(o=>o.finishTime===null).length} 位仍在比賽`;}
 }
}
function isPaused(){return manualPaused||$$('dialog[open]').length>0||document.hidden}
function updatePauseUI(){const running=['racing','countdown','coasting'].includes(race?.status);$('#pauseOverlay').classList.toggle('hidden',!manualPaused||!running);$('#pauseBtn').textContent=manualPaused?'▶ 繼續':'Ⅱ 暫停';$('#pauseBtn').disabled=!running}
function advanceTo(now){if(lastTime&&race&&!isPaused())race.step(Math.max(0,(now-lastTime)/1000));lastTime=now;processEvents()}
function tick(now){advanceTo(now);if(goUntil&&now>goUntil){$('#countdown').classList.add('hidden');goUntil=0}
 if(now-lastHUD>50){updateHUD();lastHUD=now}
 if(contextLost){switchFallback();contextLost=false}
 try{const clock=race.status==='lobby'?now/1000:race.elapsed;renderer?.frame(race.players,now,false,clock);effects?.frame(race.players,clock)}catch(error){console.error(error);manualPaused=true;switchFallback();toast('已切換到相容畫面；按繼續可接著遊玩。')}
 for(const p of race.players){const e=$('#exclaim-'+p.lane),point=renderer?.projections[p.lane];e.classList.toggle('hidden',p.exclaim<=0||!point?.visible);if(p.exclaim>0&&point){e.style.left=point.x+'px';e.style.top=point.y+'px'}}
 if(now-lastStatus>1500){$('#engineStatus').textContent=`${renderer?.mode||'繪圖不可用'} · ${renderer?.realFps||'—'} FPS · ${renderer?.effective==='low'?'省電畫質':renderer?.effective==='high'?'高畫質':'標準畫質'} · V1.2`;lastStatus=now}
 requestAnimationFrame(tick);
}
function initRenderer(fallback=false){const canvas=$('#worldCanvas');try{renderer=fallback?new CanvasFallbackRenderer(canvas,$('#gameBoard'),$$('.lane')):new SharedRenderer(canvas,$('#gameBoard'),$$('.lane'));renderer.setQuality(settings.quality);renderer.setSceneSettings(settings);canvas.addEventListener('webglcontextlost',()=>{manualPaused=true;contextLost=true;updatePauseUI()});return true}catch(e){console.error(e);if(!fallback){const fresh=canvas.cloneNode(false);canvas.replaceWith(fresh);return initRenderer(true)}toast('此瀏覽器無法建立遊戲畫面，請使用已開啟硬體加速的 Chrome 或 Edge。');return false}}
function switchFallback(){try{renderer?.destroy()}catch{}const canvas=$('#worldCanvas'),fresh=canvas.cloneNode(false);canvas.replaceWith(fresh);initRenderer(true);renderer?.setWorld(world);renderer?.setSeats(race.players.map(p=>p.seat));updatePauseUI()}
function openModal(id){advanceTo(performance.now());if(id==='teacherModal')paintTeacher();$('#'+id).showModal();updatePauseUI()}
function closeModal(id){$('#'+id).close();lastTime=performance.now();updatePauseUI()}
function paintTeacher(){const n=settings.enabled.filter(Boolean).length;$('#teacherContent').innerHTML=`
 <div class="setting-row"><button data-action="preset" data-count="4">基礎 4 類</button><button data-action="preset" data-count="6">進階 6 類</button><button data-action="preset" data-count="8">全部 8 類</button><label>一鍵統一難度<select id="allStars"><option value="">選擇 1～5 星</option>${[1,2,3,4,5].map(s=>`<option value="${s}">${'★'.repeat(s)} ${s} 星</option>`).join('')}</select></label></div>
 <table class="teacher-table"><thead><tr><th>啟用</th><th>原版題庫 · 共用 ${n} 類</th><th>三區共用難度</th></tr></thead><tbody>${ISLANDS.map((t,i)=>`<tr class="${settings.enabled[i]?'':'off'}"><td><input type="checkbox" data-config="enabled" data-topic="${i}" aria-label="啟用${esc(t.name)}" ${settings.enabled[i]?'checked':''}></td><td>${i+1}. ${esc(t.name)}<small>${esc(t.short)} · 課本 P.${t.source}</small></td><td><select data-config="stars" data-topic="${i}" aria-label="${esc(t.name)}難度">${[1,2,3,4,5].map(s=>`<option value="${s}" ${settings.stars[i]===s?'selected':''}>${'★'.repeat(s)} ${s} 星</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>
 <h3>作答時間與畫質</h3><div class="setting-row"><label>作答計時<select data-config="timeMode"><option value="fixed" ${settings.timeMode==='fixed'?'selected':''}>每題統一秒數</option><option value="topic" ${settings.timeMode==='topic'?'selected':''}>依題型預設 35～100 秒</option></select></label><label>每題<input type="number" data-config="seconds" aria-label="每題秒數" min="10" max="180" step="1" value="${settings.seconds}" style="width:78px" ${settings.timeMode==='topic'?'disabled':''}>秒</label><label>畫質<select data-config="quality"><option value="auto" ${settings.quality==='auto'?'selected':''}>自動畫質</option><option value="low" ${settings.quality==='low'?'selected':''}>省電／低畫質</option><option value="medium" ${settings.quality==='medium'?'selected':''}>標準</option><option value="high" ${settings.quality==='high'?'selected':''}>高畫質</option></select></label></div>
 <h3>座號與成績顯示</h3><div class="setting-row"><label>最大座號<input data-config="seatMax" type="number" min="3" max="99" step="1" value="${settings.seatMax}" style="width:78px">號</label><label>比賽計時／成績<select data-config="scoreFormat"><option value="seconds" ${settings.scoreFormat==='seconds'?'selected':''}>累計秒數（預設）</option><option value="clock" ${settings.scoreFormat==='clock'?'selected':''}>分：秒</option></select></label></div>
 <h3>遠景與動態點綴</h3><div class="setting-row"><label><input type="checkbox" data-config="background" ${settings.background?'checked':''}>顯示遠處背景貼圖</label><label>遠景主題<select data-config="backgroundStyle">${BACKGROUNDS.map(b=>`<option value="${b.id}" ${b.id===settings.backgroundStyle?'selected':''}>${b.label}</option>`).join('')}</select></label><label>點綴密度<select data-config="decorationDensity">${[['rich','豐富'],['medium','中等'],['sparse','少量'],['off','關閉']].map(([v,l])=>`<option value="${v}" ${settings.decorationDensity===v?'selected':''}>${l}</option>`).join('')}</select></label></div>
 <p class="note">三區共用同一套設定。題目依啟用的題型輪替，同一道次的題型一致，數字各自不同；持續出題直到各自抵達 5 公里。每題固定 1 張求救卡，使用立即扣 10 秒。</p>
 <div class="setting-row"><button data-action="diagnostics">${diagnosticMode?'關閉':'開啟'}三人觸控測試</button><button data-action="export">↓ 匯出成績 CSV</button><button data-action="reset-settings">恢復預設</button></div><p class="note">觸控測試會顯示三區接收次數、目前與最多同時觸點。數字鍵按下就生效，可三人同時按、快速連按；長按不連續輸入。</p>
 <h3>動態點綴細部開關 <small>每項可獨立選擇</small></h3><div class="decor-actions"><button data-action="decor-all" data-enabled="true">全部開啟</button><button data-action="decor-all" data-enabled="false">全部關閉</button></div><div class="decor-grid">${DECORATIONS.map(d=>`<label class="decor-option"><input type="checkbox" data-decoration="${d.id}" ${settings.decorations[d.id]?'checked':''}><span>${d.label}${d.extra?'<small>新增創意</small>':''}</span></label>`).join('')}</div><p class="decor-note">依風景與安全距離出現；飄雪限雪地、火球限火山。關閉密度會停用全部動態點綴。起終點迎賓觀眾固定保留。</p>
 <div class="teacher-footer"><span class="note" style="border:0;padding:0">5 km · JET 75／90／100 km/h · 答完等 5 秒</span><button class="primary" data-action="close" data-modal="teacherModal">✓ 完成設定</button></div>`}
function refreshSeats(){for(let i=0;i<3;i++){const select=$('#seat-'+i),previous=Number(select.value)||i+1;select.innerHTML=Array.from({length:settings.seatMax},(_,n)=>`<option value="${n+1}">${n+1} 號</option>`).join('');select.value=String(Math.min(previous,settings.seatMax))}}
function refreshTimeDisplays(){updateHUD();for(const p of race.players)if(p.finishTime!==null){paintFinish(p);if(p.reviewOpen)paintOwnReview(p)}if(race.status==='complete')$$('.next-round').forEach(b=>b.classList.remove('hidden'))}
function settingsChanged(e){const b=e.target,focusKey=b.dataset.decoration;let repaint=true;
 if(b.id==='allStars'){if(!b.value)return;settings.stars=Array(8).fill(Number(b.value))}
 else if(focusKey){settings.decorations[focusKey]=b.checked;repaint=false}
 else if(b.dataset.config){const k=b.dataset.config,i=Number(b.dataset.topic);
  if(k==='enabled')settings.enabled[i]=b.checked;else if(k==='stars')settings.stars[i]=Number(b.value);else if(['seconds','seatMax'].includes(k))settings[k]=Number(b.value);else if(k==='background')settings[k]=b.checked;else settings[k]=b.value;
  settings=normalizeSettings(settings);if(k==='quality')renderer?.setQuality(settings.quality);if(k==='seatMax'&&race.status==='lobby')refreshSeats();if(k==='scoreFormat')refreshTimeDisplays();repaint=!['seconds','seatMax'].includes(k);
 }else return;
 renderer?.setSceneSettings(settings);store.set(SETTINGS_KEY,settings);if(repaint)paintTeacher();
 if(race.status==='lobby')$('#lobbySettings').textContent=`${settings.enabled.filter(Boolean).length} 類題型 · ${settings.timeMode==='fixed'?settings.seconds+' 秒／題':'依題型計時'}`;
}

function saveRace(){if(savedRace)return;savedRace=true;const record={seed:race.seed,date:new Date().toISOString(),themes:world.themes.map(t=>t.name),settings:race.settings,players:race.players.map(p=>({lane:p.lane,seat:p.seat,rank:rankOf(p),time:p.finishTime,boostSchedule:p.boostHistory,results:p.results}))};records.push(record);if(records.length>200)records=records.slice(-200);store.set(RECORDS_KEY,records)}

function exportRecords(){if(!records.length){toast('目前尚無三人全數完成的場次');return}const rows=[['場次','時間','風景','隊伍','座號','名次','完賽秒數','完賽時間顯示','題次','題型','星等','答對','求救','獲得加速秒數','作答','正確答案']];for(const r of records)for(const p of r.players)for(const q of p.results)rows.push([r.seed,r.date,r.themes.join('→'),lanes[p.lane],p.seat,p.rank,p.time.toFixed(3),timeText(p.time),q.number,ISLANDS[q.island].name,q.stars,q.correct?'是':'否',q.hint?'是':'否',q.bonus.toFixed(3),typeof q.reply==='object'?JSON.stringify(q.reply):q.reply,correctText(q.question)]);const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`天空函數鐵道_三人競速_${new Date().toLocaleDateString('sv-SE')}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.webkitFullscreenElement)document.webkitExitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else if(document.documentElement.webkitRequestFullscreen)document.documentElement.webkitRequestFullscreen();else toast('可按 F11 進入瀏覽器全螢幕')}catch{toast('請按 F11 進入瀏覽器全螢幕')}}
function action(b,e){const act=b.dataset.action,lane=b.closest('[data-lane]')?.dataset.lane,p=lane===undefined?null:race.players[Number(lane)];
 if(p&&['key','choice','field','hint','submit'].includes(act)){advanceTo(performance.now());if(isPaused()||p.phase!=='question')return;
  if(act==='key')keyInput(p,b.dataset.key);
  if(act==='choice'){p.reply=b.dataset.value;updateFields(p)}
  if(act==='field'){p.activeField=Number(b.dataset.field);p.replaceNext=true;updateFields(p)}
  if(act==='hint')showHint(p);if(act==='submit')submit(p);return;
 }
 if(act==='start')startRace();
 if(act==='new-map'&&race.status==='lobby')prepareMap();
 if(act==='next-round'&&race.status==='complete'){for(const d of $$('dialog[open]'))d.close();prepareMap()}
 if(act==='sound'){settings.sound=!settings.sound;audio.init();store.set(SETTINGS_KEY,settings);$('#soundBtn').textContent=settings.sound?'♫ 音效開':'♫ 音效關'}
 if(act==='pause'||act==='resume'){advanceTo(performance.now());manualPaused=act==='resume'?false:!manualPaused;lastTime=performance.now();updatePauseUI()}
 if(act==='review-player'&&p)paintOwnReview(p);if(act==='close-own-review'&&p)closeOwnReview(p);
 if(act==='fullscreen')fullscreen();if(act==='teacher')openModal('teacherModal');if(act==='help')openModal('helpModal');if(act==='close')closeModal(b.dataset.modal);
 if(act==='preset'){const n=Number(b.dataset.count);settings.enabled=ISLANDS.map((_,i)=>i<n);settings.stars=[...BASE_STARS];store.set(SETTINGS_KEY,settings);paintTeacher();if(race.status==='lobby')$('#lobbySettings').textContent=`${n} 類題型 · ${settings.timeMode==='fixed'?settings.seconds+' 秒／題':'依題型計時'}`}
 if(act==='decor-all'){settings.decorations=Object.fromEntries(DECORATIONS.map(d=>[d.id,b.dataset.enabled==='true']));store.set(SETTINGS_KEY,settings);renderer?.setSceneSettings(settings);paintTeacher()}
 if(act==='reset-settings'){settings=defaultSettings();store.set(SETTINGS_KEY,settings);renderer?.setQuality(settings.quality);renderer?.setSceneSettings(settings);if(race.status==='lobby')refreshSeats();refreshTimeDisplays();$('#soundBtn').textContent='♫ 音效開';if(audio.master)audio.master.gain.value=.55;paintTeacher();if(race.status==='lobby')$('#lobbySettings').textContent='4 類題型 · 45 秒／題'}
 if(act==='diagnostics'){diagnosticMode=!diagnosticMode;$('#diagnostics').classList.toggle('hidden',!diagnosticMode);paintTeacher();updateDiagnostics(stats)}if(act==='export')exportRecords();
}
function updateDiagnostics(s){stats=s;$('#diagnostics').textContent=`觸控接收：藍 ${s.counts[0]}／橘 ${s.counts[1]}／綠 ${s.counts[2]}　目前 ${s.active} 點　最多 ${s.max} 點`}
function graphSVG(q){const g=q.graph;if(!g)return '';const W=400,H=150,pad=23;
 if(g.type==='points'){const sx=x=>W/2+x*22,sy=y=>H/2-y*9;return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="坐標與對稱示意"><path d="M0 ${H/2}H${W} M${W/2} 0V${H}" stroke="#99afa7"/>${g.points.map((p,i)=>`<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="5" fill="${i?'#d28d43':'#398b91'}"/><text x="${Math.min(W-70,sx(p[0])+7)}" y="${clamp(sy(p[1])-8,13,H-12)}" font-size="12" fill="#294741">(${p.join(',')})</text>`).join('')}</svg>`}
 let lo=g.interval?Math.min(g.interval[0]-1,-4):-5,hi=g.interval?Math.max(g.interval[1]+1,4):5;const ys=Array.from({length:121},(_,i)=>graphValue(g,lo+(hi-lo)*i/120)),min=Math.min(...ys,0),max=Math.max(...ys,0),range=Math.max(1,max-min),sx=x=>pad+(x-lo)/(hi-lo)*(W-pad*2),sy=y=>H-pad-(y-min+range*.08)/(range*1.16)*(H-pad*2),d=ys.map((y,i)=>`${i?'L':'M'}${sx(lo+(hi-lo)*i/120).toFixed(1)},${sy(y).toFixed(1)}`).join(' '),mark=g.markX??(g.type==='quadratic'?-g.b/(2*g.a):null);
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="函數圖形與坐標"><path d="M${sx(clamp(0,lo,hi))} 8V${H-8} M8 ${sy(0)}H${W-8}" fill="none" stroke="#8daba2"/><path d="${d}" fill="none" stroke="#268489" stroke-width="3"/>${mark!==null&&mark>=lo&&mark<=hi?`<circle cx="${sx(mark)}" cy="${sy(graphValue(g,mark))}" r="4" fill="#d89037"/><text x="${Math.min(W-90,sx(mark)+8)}" y="${clamp(sy(graphValue(g,mark))-8,14,H-10)}" fill="#635133" font-size="12">(${formatNumber(mark)}, ${formatNumber(graphValue(g,mark))})</text>`:''}<text x="${W-17}" y="${sy(0)-5}" font-size="12" fill="#36534a">x</text></svg>`;
}
function init(){
 $('#laneGrid').innerHTML=[0,1,2].map(laneMarkup).join('');
 // Fullscreen and the initial audio-unlocking start use a trusted native click.
 for(const b of $$('[data-action=fullscreen], [data-action=start], [data-action=sound]'))b.dataset.nativeClick='true';
 bindPress(document.body,action,updateDiagnostics);
 $('#teacherContent').addEventListener('change',settingsChanged);
 $('#teacherContent').addEventListener('input',e=>{if(e.target.dataset.config==='seconds')settingsChanged(e)});
 for(const d of $$('dialog'))d.addEventListener('close',()=>{lastTime=performance.now();updatePauseUI()});
 const syncFullscreen=()=>{const on=Boolean(document.fullscreenElement||document.webkitFullscreenElement);$('#fullscreenBtn').textContent=on?'⛶ 離開全螢幕':'⛶ 全螢幕';$('#fullscreenBtn').setAttribute('aria-label',on?'離開全螢幕':'進入全螢幕');$('#fullscreenBtn').setAttribute('aria-pressed',String(on));renderer?.resize()};document.addEventListener('fullscreenchange',syncFullscreen);document.addEventListener('webkitfullscreenchange',syncFullscreen);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&['countdown','racing','coasting'].includes(race?.status)){manualPaused=true;updatePauseUI()}lastTime=performance.now()});
 document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,button')||$$('dialog[open]').length||isPaused())return;const p=race.players[0];if(p.phase!=='question')return;if(/^[0-9.]$/.test(e.key)){e.preventDefault();keyInput(p,e.key)}else if(e.key==='-'){e.preventDefault();keyInput(p,'±')}else if(e.key==='Backspace'){e.preventDefault();keyInput(p,'⌫')}else if(e.key==='Enter'){e.preventDefault();submit(p)}else if(e.key==='Tab'){e.preventDefault();keyInput(p,'→')}});
 for(const select of $$('.seat-row select'))select.addEventListener('change',()=>{const seats=[0,1,2].map(i=>Number($('#seat-'+i).value));renderer?.setSeats(seats);if(race?.status==='lobby'){race.players.forEach((p,i)=>p.seat=seats[i]);updateHUD()}});
 $('#soundBtn').textContent=settings.sound?'♫ 音效開':'♫ 音效關';effects=new SpeedEffects($('#effectsCanvas'),$('#gameBoard'),$$('.lane'));initRenderer();prepareMap();updateDiagnostics(stats);lastTime=performance.now();requestAnimationFrame(tick);
}
init();
