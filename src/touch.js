/* Immediate per-pointer input. No isPrimary filter and no global repeat lock. */
export function bindPress(root,activate,onStats=()=>{}){
 const active=new Map(),recent=new WeakMap(),counts=[0,0,0];let max=0;
 const buttonFor=target=>target?.closest?.('button[data-action]');
 const paint=button=>{if(![...active.values()].some(x=>x===button))button.classList.remove('pressed')};
 function down(id,button,event){if(!button||button.disabled||button.dataset.nativeClick||active.has(id))return;event?.preventDefault?.();active.set(id,button);recent.set(button,Date.now());button.classList.add('pressed');max=Math.max(max,active.size);const lane=button.closest('[data-lane]')?.dataset.lane;if(lane!==undefined)counts[Number(lane)]++;onStats({counts:[...counts],active:active.size,max});activate(button,event)}
 function up(id){const button=active.get(id);if(!button)return;active.delete(id);paint(button);onStats({counts:[...counts],active:active.size,max})}
 function clear(){for(const [id]of active)up(id)}
 if(typeof window!=='undefined'&&window.PointerEvent){
  root.addEventListener('pointerdown',e=>{const b=buttonFor(e.target);if(!b||b.dataset.nativeClick||e.button>0)return;try{root.setPointerCapture(e.pointerId)}catch{}down(e.pointerId,b,e)}, {passive:false});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(name,e=>up(e.pointerId));
 }else{
  root.addEventListener('touchstart',e=>{for(const t of e.changedTouches){const target=document.elementFromPoint(t.clientX,t.clientY);down(t.identifier,buttonFor(target),e)}},{passive:false});
  for(const name of ['touchend','touchcancel'])window.addEventListener(name,e=>{for(const t of e.changedTouches)up(t.identifier)});
  root.addEventListener('mousedown',e=>{if(e.button===0){const b=buttonFor(e.target);if(b&&Date.now()-(recent.get(b)||0)>700)down('mouse',b,e)}});
  window.addEventListener('mouseup',()=>up('mouse'));
 }
 root.addEventListener('click',e=>{const b=buttonFor(e.target);if(!b||b.disabled)return;if(!b.dataset.nativeClick&&(e.detail>0||e.pointerType)&&Date.now()-(recent.get(b)||0)<800){e.preventDefault();return}activate(b,e)});
 window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
 return {active,counts,clear,get max(){return max}};
}
