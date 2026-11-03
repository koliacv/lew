/** A question-specific association map, using the authored steps in the bank. */
export function explanationVisual(question, escape) {
  return `<section class="lw-visual" aria-labelledby="lw-visual-title">
    <div class="lw-visual-heading"><div><div class="lw-eyebrow">ZOBACZ POWIĄZANIA</div><h3 id="lw-visual-title">Trzy hasła, jedno skojarzenie</h3></div><span class="lw-visual-symbol" aria-hidden="true">◎</span></div>
    <p class="lw-visual-intro">Prześledź podświetlenie lub wybierz hasło, na którym chcesz się skupić.</p>
    <ol class="lw-visual-steps">${question.steps.map((step,index)=>`<li><button type="button" class="lw-visual-step" data-visual-step="${index}" aria-pressed="false"><span class="lw-visual-number" aria-hidden="true">0${index+1}</span><span>${escape(step)}</span></button></li>`).join('')}</ol>
    <div class="lw-visual-conclusion"><span class="lw-eyebrow">ZAPAMIĘTAJ ODPOWIEDŹ</span><strong>${escape(question.opts[0])}</strong></div>
    <div class="lw-visual-footer"><button type="button" class="lw-visual-replay">↻ Prześledź ponownie</button><small>Mapa skojarzeń do tego pytania; nie jest symulacją procesu medycznego.</small></div>
  </section>`;
}

export function mountExplanationVisual(element) {
  const buttons=[...element.querySelectorAll('[data-visual-step]')];
  const replay=element.querySelector('.lw-visual-replay');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let timers=[],observer=null,disposed=false;
  function stop(){timers.forEach(clearTimeout);timers=[];observer?.disconnect()}
  function focusStep(index){
    element.dataset.phase=String(index);
    buttons.forEach((button,i)=>{
      button.setAttribute('aria-pressed',String(i===index));
      button.classList.toggle('is-seen',i<=index);
    });
  }
  function showAll(){
    element.dataset.phase='complete';
    buttons.forEach(button=>{button.classList.add('is-seen');button.setAttribute('aria-pressed','false')});
  }
  function play(){
    stop();if(disposed)return;
    if(reducedMotion.matches){showAll();return}
    focusStep(0);
    timers=[setTimeout(()=>focusStep(1),1200),setTimeout(()=>focusStep(2),2400),setTimeout(showAll,3600)];
  }
  buttons.forEach((button,index)=>button.onclick=()=>{stop();focusStep(index)});
  replay.onclick=play;
  const motionChanged=()=>{stop();showAll()};
  reducedMotion.addEventListener('change',motionChanged);
  // Start when the map enters view, so reading the explanation never misses it.
  if(reducedMotion.matches)showAll();
  else if('IntersectionObserver' in window){
    observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))play()},{threshold:0.15});
    observer.observe(element);
  }else play();
  return ()=>{
    disposed=true;stop();reducedMotion.removeEventListener('change',motionChanged);
    buttons.forEach(button=>button.onclick=null);replay.onclick=null;
  };
}
