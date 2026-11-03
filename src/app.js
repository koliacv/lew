import { explanationVisual, mountExplanationVisual } from './explanation-visual.js?v=visual-memory-5';
import { createSession, summarizeSession, formatDuration as clock, validateBank, selectExamQuestions, HISTORY_KEY, parseHistory, recordSeen, submitAnswer, nextQuestion, TARGET_RESPONSE_MS } from './quiz.js';

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Nie udało się wczytać danych (${response.status}).`);
  return response.json();
}

async function initialize(){
const root=document.getElementById('lew-app');const main=root.querySelector('#lw-main');
const themeButton=root.querySelector('#lw-theme');
function setTheme(dark){root.dataset.theme=dark?'dark':'light';themeButton.setAttribute('aria-label',dark?'Włącz jasny motyw':'Włącz ciemny motyw');themeButton.textContent=dark?'☀ Jasny':'◐ Ciemny'}
setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
themeButton.onclick=()=>setTheme(root.dataset.theme!=='dark');

const [BANK, SOURCES] = await Promise.all([
  loadJson(new URL('../data/questions.json', import.meta.url)),
  loadJson(new URL('../data/sources.json', import.meta.url))
]);
validateBank(BANK, SOURCES);
const topics=[...new Set(BANK.map(q=>q.topic))];let topic=topics[0],limit=20,session=null,tick=null,lastOrder='',disposeVisual=()=>{};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>BANK.find(q=>q.id===id);
const answered=s=>Object.keys(s.answers).length;
const seconds=ms=>(ms/1000).toFixed(1).replace('.',',');
// Persist only exposure counts; never save answers, results, or a clinical profile.
let storage=null,history={},historyPersistent=false;
try{storage=window.localStorage;history=parseHistory(storage.getItem(HISTORY_KEY),BANK.map(q=>q.id));historyPersistent=true}catch{}
window.addEventListener('storage',event=>{
  if(event.storageArea===storage&&(event.key===HISTORY_KEY||event.key===null))history=parseHistory(event.newValue,BANK.map(q=>q.id));
});
function refreshHistory(){
  if(!storage)return;
  try{
    const saved=parseHistory(storage.getItem(HISTORY_KEY),BANK.map(q=>q.id));
    for(const [id,item] of Object.entries(saved)){
      if(!history[id]||item.shown>history[id].shown||(item.shown===history[id].shown&&item.lastSeen>history[id].lastSeen))history[id]=item;
    }
  }catch{historyPersistent=false}
}
function rememberQuestion(s,id){
  if(s.seen.includes(id))return;
  s.seen.push(id);refreshHistory();history=recordSeen(history,[id]);
  if(storage)try{storage.setItem(HISTORY_KEY,JSON.stringify({version:1,items:history}));historyPersistent=true}catch{historyPersistent=false}
}
const foot=root.querySelector('.lw-foot');
foot.textContent=`${BANK.length} autorskich pytań · ${topics.length} tematów · Historia losowania w tej przeglądarce. Odpowiedzi i wyniki tylko w bieżącej karcie.`;
function home(){
  disposeVisual();main.dataset.view='home';clearInterval(tick);refreshHistory();
  const pool=BANK.filter(q=>q.topic===topic),unseen=pool.filter(q=>!history[q.id]).length;
  const totalSeen=BANK.filter(q=>history[q.id]).length;
  main.innerHTML=`
  <section class="lw-hero"><div><div class="lw-eyebrow">TWOJA PRZESTRZEŃ DO NAUKI</div>
    <h1>Małe sesje.<br><em>Duży krok do LEW.</em></h1>
    <p class="lw-muted">Wybierz odpowiedź. Sprawdź wynik, czas i wyjaśnienie. Cel: 70 sekund na pytanie — bez blokady po upływie czasu.</p>
    <a class="lw-hero-link" href="#lw-topic-heading">Zaplanuj dzisiejszy trening <span aria-hidden="true">↗</span></a>
  </div><div class="lw-coverage"><div class="lw-ring" style="--score:${totalSeen/BANK.length*100}%"><div><strong>${Math.round(totalSeen/BANK.length*100)}%</strong><small>obejrzanej bazy</small></div></div><strong>${totalSeen} z ${BANK.length} pytań</strong><small>Pokrycie materiału, nie ocena wiedzy</small></div></section>
  <div class="lw-stats"><div><span class="lw-stat-icon" aria-hidden="true">▤</span><div><strong>${BANK.length}</strong><small>autorskich pytań</small></div></div><div><span class="lw-stat-icon" aria-hidden="true">◎</span><div><strong>${topics.length} dziedzin</strong><small>jeden cel: lepsze przygotowanie</small></div></div><div><span class="lw-stat-icon" aria-hidden="true">↻</span><div><strong>${BANK.length-totalSeen} nowych</strong><small>pierwszeństwo w losowaniu</small></div></div></div>
  <section class="lw-history" aria-label="Historia losowania">
    <details><summary>Inteligentne losowanie · ${historyPersistent?'historia aktywna':'historia tylko w tej karcie'}</summary>
    <p>${historyPersistent?'Historia losowania zostaje w tej przeglądarce także po odświeżeniu.':'Zapis historii jest niedostępny. Ograniczanie powtórek działa tylko do zamknięcia lub odświeżenia tej karty.'} Odpowiedzi i wyniki bieżącej sesji pozostają tylko w pamięci karty.</p>
    <p>Najpierw pytania jeszcze nieoglądane. Następnie odkładamy ostatnio pokazywaną część puli i wybieramy pytania widziane najmniej razy i najdawniej. Kolejność pytań i odpowiedzi jest losowa. Po wyczerpaniu puli powtórki są konieczne.</p>
    <p>Historia jest wspólna dla profilu przeglądarki na tym urządzeniu. Tryb prywatny i usunięcie danych witryny nie zachowują historii na przyszłość.</p><button id="lw-reset-history">Wyczyść historię losowania</button></details>
  </section>
  <div class="lw-section-heading"><div><div class="lw-eyebrow">01 / TRENING TEMATYCZNY</div><h2 id="lw-topic-heading">Od czego dziś zaczynamy?</h2></div><label class="lw-search"><span>Szukaj dziedziny</span><input id="lw-topic-search" type="search" placeholder="np. kardiologia" autocomplete="off"></label></div>
  <div class="lw-workspace"><div><div class="lw-grid">${topics.map((t,i)=>{const qs=BANK.filter(q=>q.topic===t),seen=qs.filter(q=>history[q.id]).length;return`<button class="lw-topic" data-topic="${i}" aria-pressed="${topic===t}"><span class="lw-topic-top"><span class="lw-topic-number">${String(i+1).padStart(2,'0')}</span><span>${qs.length} pytań <span class="lw-selected" aria-hidden="true">${topic===t?'✓':'↗'}</span></span></span><strong>${esc(t)}</strong><span class="lw-topic-bottom">${qs.length-seen} nowych · ${seen} obejrzanych</span><span class="lw-topic-meter" aria-hidden="true"><i style="width:${seen/qs.length*100}%"></i></span></button>`}).join('')}</div><p id="lw-no-topics" hidden role="status">Brak pasującej dziedziny. Spróbuj krótszej nazwy.</p></div>
  <section class="lw-box" id="lw-setup"><div class="lw-eyebrow">TWOJA SESJA</div><h3>${esc(topic)}</h3><p class="lw-muted">${unseen} z ${pool.length} pytań jeszcze nieoglądanych w tym temacie.</p>
    <div class="lw-controls">
    <label class="lw-field">Liczba pytań<select id="lw-limit">${[...new Set([10,20,40,pool.length])].filter(n=>n<=pool.length).sort((a,b)=>a-b).map(n=>`<option ${limit===n?'selected':''}>${n}</option>`).join('')}</select></label>
    <button class="lw-primary" id="lw-start">Rozpocznij temat →</button></div>
    <p class="lw-muted">70 sekund na pytanie jako cel. Po kliknięciu „Odpowiedz” od razu zobaczysz wynik, czas odpowiedzi i wyjaśnienie PL / UA.</p>
    <p class="lw-muted">Wybierz 10 lub 20 pytań, aby rzadziej spotykać powtórki.</p>
  </section></div>
  <section class="lw-box lw-exam"><span class="lw-badge">02 / PRÓBNY LEW Z WYJAŚNIENIAMI</span><h2>200 pytań. Każda odpowiedź od razu wyjaśniona.</h2>
    <p class="lw-muted">Po 20 pytań z każdej dziedziny. Ten sam format co w tematach: odpowiedź → wynik i czas → wyjaśnienie → następne pytanie. Cel: 70 sekund na odpowiedź. Bez globalnego limitu czasu. To trening, nie symulacja warunków oficjalnego egzaminu.</p>
    <button id="lw-exam" class="lw-primary">Rozpocznij próbny LEW →</button>
  </section>`;
  main.querySelector('#lw-topic-search').oninput=e=>{
    const query=e.target.value.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').trim();
    let visible=0;
    main.querySelectorAll('[data-topic]').forEach(card=>{
      card.hidden=!topics[+card.dataset.topic].toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').includes(query);
      if(!card.hidden)visible++;
    });
    main.querySelector('#lw-no-topics').hidden=visible>0;
  };
  main.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{
    topic=topics[+b.dataset.topic];limit=Math.min(limit,BANK.filter(q=>q.topic===topic).length);home();
    if(window.matchMedia('(max-width:900px)').matches)main.querySelector('#lw-setup').scrollIntoView({block:'start'});
  });
  main.querySelector('#lw-limit').onchange=e=>limit=+e.target.value;
  main.querySelector('#lw-start').onclick=()=>start(pool.map(q=>q.id),'topic',limit);
  main.querySelector('#lw-exam').onclick=()=>start(BANK.map(q=>q.id),'exam',200);
  let confirmReset=false;
  main.querySelector('#lw-reset-history').onclick=e=>{
    if(!confirmReset){confirmReset=true;e.currentTarget.textContent='Potwierdź wyczyszczenie historii';return}
    try{storage?.removeItem(HISTORY_KEY)}catch{historyPersistent=false}
    history={};home();
  };
}
function start(ids,mode,count){
  clearInterval(tick);refreshHistory();
  const selected=mode==='exam'?selectExamQuestions(BANK.filter(q=>ids.includes(q.id)),count,history):ids;
  session=createSession(selected,mode,count,performance.now(),Math.random,lastOrder,history);
  lastOrder=session.ids.join(',');
  renderQuestion();
}
function updateClock(){
  if(!session||session.finished)return;
  const id=session.ids[session.index];
  if(session.answers[id]!==undefined)return;
  const elapsed=Math.max(0,performance.now()-session.questionStarted);
  const timer=main.querySelector('#lw-clock');
  if(timer)timer.textContent=clock(elapsed);
  const hint=main.querySelector('#lw-time-hint');
  if(hint){hint.textContent=elapsed>TARGET_RESPONSE_MS?'Cel 70 s przekroczony — możesz nadal odpowiedzieć':'Cel: 70 sekund';hint.classList.toggle('over-target',elapsed>TARGET_RESPONSE_MS)}
}
function renderQuestion(){
  disposeVisual();clearInterval(tick);main.dataset.view='question';
  const s=session,id=s.ids[s.index],q=byId(id),submitted=s.answers[id]!==undefined;
  rememberQuestion(s,id);
  main.innerHTML=`<div class="lw-top"><div><span class="lw-badge">${s.mode==='exam'?'PRÓBNY LEW':'TRENING TEMATYCZNY'}</span><p><small>${esc(q.topic)}</small></p></div><div><div class="lw-time" id="lw-clock" aria-label="Czas odpowiedzi">${clock(submitted?s.responseTimes[id]:performance.now()-s.questionStarted)}</div><small>Pytanie <strong>${s.index+1}</strong> / ${s.ids.length}</small></div></div>
  <div class="lw-progress" role="progressbar" aria-label="Zatwierdzone odpowiedzi" aria-valuenow="${answered(s)}" aria-valuemin="0" aria-valuemax="${s.ids.length}"><div style="width:${answered(s)/s.ids.length*100}%"></div></div>
  <div class="lw-session-meta"><span>${answered(s)} z ${s.ids.length} odpowiedzi</span><span id="lw-time-hint">${submitted?'Czas zatrzymany':'Cel: 70 sekund'}</span></div>
  <fieldset><legend><h2 tabindex="-1">${esc(q.q)}</h2></legend><p class="lw-answer-hint">Wybierz jedną odpowiedź. Możesz zmienić wybór przed zatwierdzeniem.</p>${s.options[id].map((oi,k)=>`<label class="lw-option ${submitted&&oi===0?'correct':submitted&&s.answers[id]===oi?'wrong':''}"><input type="radio" name="lw-answer" value="${oi}" ${s.answers[id]===oi?'checked':''} ${submitted?'disabled':''}><span class="lw-letter">${'ABCDE'[k]}</span><span>${esc(q.opts[oi])}${submitted&&oi===0?' <strong>✓ Prawidłowa</strong>':submitted&&s.answers[id]===oi?' <strong>✕ Twój wybór</strong>':''}</span></label>`).join('')}</fieldset>
  ${submitted?`<section id="lw-feedback" tabindex="-1" aria-label="Wynik odpowiedzi"><div class="lw-feedback ${s.answers[id]===0?'':'bad'}" role="status">${s.answers[id]===0?'✓ Prawidłowa odpowiedź':'✕ Nieprawidłowa odpowiedź'}<span class="lw-response-time">Twój czas: <strong>${seconds(s.responseTimes[id])} s</strong> · cel 70 s · ${s.responseTimes[id]<=TARGET_RESPONSE_MS?'w założonym czasie':'powyżej celu'}</span></div>
  <div id="lw-explanation" class="lw-explainer"><div class="lw-eyebrow">PRAWIDŁOWA ODPOWIEDŹ</div><h3>${esc(q.opts[0])}</h3><div class="lw-polish-explanation" lang="pl"><p>${esc(q.pl)}</p></div><aside class="lw-memory-note" lang="pl" aria-label="Jak zapamiętać"><strong>Jak zapamiętać</strong><p>${q.steps.map(step=>esc(step)).join(' · ')}.</p><small>Połącz te hasła z odpowiedzią: <b>${esc(q.opts[0])}</b>.</small></aside><details class="lw-translation"><summary lang="uk">Пояснення українською</summary><div lang="uk"><p>${esc(q.ua)}</p><aside class="lw-memory-note"><strong>Як запам’ятати</strong><p>Пов’яжи польські опорні слова «${q.steps.map(step=>esc(step)).join(' · ')}» з відповіддю «${esc(q.opts[0])}».</p></aside></div></details>
  ${explanationVisual(q,esc)}
  <p class="lw-source"><small>Materiał: ${esc(SOURCES[q.src])}${q.sourceRef?` — ${esc(q.sourceRef)}`:''}. Pytanie i wyjaśnienie: autorskie.${q.references?.length?`<br>${q.references.map(ref=>`<a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.title)}</a>`).join(' · ')}`:''}</small></p></div></section>`:''}
  <nav class="lw-question-actions" aria-label="Nawigacja pytania">${submitted?`<button id="lw-next" class="lw-primary">${s.index===s.ids.length-1?'Zobacz podsumowanie →':'Następne pytanie →'}</button>`:'<button id="lw-submit" class="lw-primary" disabled>Odpowiedz</button>'}</nav>
  <button id="lw-end" class="lw-end">Zakończ sesję</button>
  <div id="lw-confirm" class="lw-confirm" hidden><p>Zakończyć teraz? Podsumowanie obejmie tylko zatwierdzone odpowiedzi.</p><div class="lw-row"><button id="lw-confirm-yes">Zakończ</button><button id="lw-confirm-no">Kontynuuj</button></div></div>`;
  if(!submitted){
    let choice;
    main.querySelectorAll('input[name="lw-answer"]').forEach(input=>input.onchange=()=>{choice=+input.value;main.querySelector('#lw-submit').disabled=false});
    main.querySelector('#lw-submit').onclick=()=>{
      if(choice===undefined||!submitAnswer(s,choice,performance.now()))return;
      renderQuestion();
      const feedback=main.querySelector('#lw-feedback');feedback.scrollIntoView({block:'start'});feedback.focus({preventScroll:true});
    };
    updateClock();tick=setInterval(updateClock,250);
  }else{
    disposeVisual=mountExplanationVisual(main.querySelector('.lw-visual'),q);
    main.querySelector('#lw-next').onclick=()=>{
      if(s.index===s.ids.length-1){finish();return}
      if(nextQuestion(s,performance.now())){renderQuestion();main.scrollIntoView({block:'start'});main.querySelector('h2').focus({preventScroll:true})}
    };
  }
  main.querySelector('#lw-end').onclick=()=>{const panel=main.querySelector('#lw-confirm');panel.hidden=false;panel.scrollIntoView({block:'center'});main.querySelector('#lw-confirm-no').focus({preventScroll:true})};
  main.querySelector('#lw-confirm-no').onclick=()=>{main.querySelector('#lw-confirm').hidden=true;main.querySelector('#lw-end').focus()};
  main.querySelector('#lw-confirm-yes').onclick=finish;
  if(!submitted){main.scrollIntoView({block:'start'});main.querySelector('h2').focus({preventScroll:true})}
}
function finish(){
  if(session.finished)return;
  disposeVisual();clearInterval(tick);session.finished=true;
  const result=summarizeSession(session);
  main.dataset.view='results';
  main.innerHTML=`<section class="lw-hero"><div><div class="lw-eyebrow">SESJA ZAKOŃCZONA</div><h1>Wiesz więcej.<br><em>Krok po kroku.</em></h1></div></section>
  <section class="lw-box"><div class="lw-result"><div class="lw-ring" style="--score:${result.pct}%"><div>${result.pct}%</div></div><div><h2>${result.right} / ${result.answered} poprawnych odpowiedzi</h2><p>${result.wrong} błędnych · ${result.blank} bez zatwierdzonej odpowiedzi</p><p>Wynik dotyczy ${result.answered} zatwierdzonych odpowiedzi z ${result.total} pytań sesji.</p><p>Średni czas odpowiedzi: <strong>${result.answered?seconds(result.averageTime)+' s':'—'}</strong><br>Odpowiedzi w czasie do 70 s: ${result.withinTarget} / ${result.answered}</p><small>Czas czytania wyjaśnień nie wlicza się do czasu odpowiedzi.</small></div></div><button id="lw-home" class="lw-primary">Wróć do wyboru testu →</button></section>`;
  main.querySelector('#lw-home').onclick=()=>{home();main.scrollIntoView({block:'start'})};
  main.scrollIntoView({block:'start'});
}

home();
}

initialize().catch(error => {
  const main=document.getElementById('lw-main');
  main.replaceChildren();
  const message=document.createElement('p');
  message.className='lw-status';message.setAttribute('role','alert');
  message.textContent='Nie udało się uruchomić treningu. Odśwież stronę. Przy uruchomieniu lokalnym użyj serwera HTTP, nie pliku file://.';
  main.append(message);console.error(error);
});
