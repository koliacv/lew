const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
 heart:'<path d="M50 83C-5 45 16 5 50 31C84 5 105 45 50 83Z"/><path d="M15 51H33L42 36L53 68L63 49H85"/>',
 lungs:'<path d="M50 10V40M50 30L30 46M50 30L70 46M40 25C15 28 5 65 15 82Q40 91 40 65ZM60 25C85 28 95 65 85 82Q60 91 60 65Z"/>',
 blood:'<path d="M50 8Q5 60 25 80Q50 103 75 80Q95 60 50 8Z"/>',
 medicine:'<g transform="rotate(-35 50 50)"><rect x="10" y="28" width="80" height="44" rx="22"/><path d="M50 28V72"/></g>',
 lab:'<path d="M30 12V70Q30 95 50 95Q70 95 70 70V12M22 12H78M30 55H70M42 33H58"/>',
 brain:'<path d="M50 20C25-2 4 30 20 45C0 67 20 95 45 80M50 20C75-2 96 30 80 45C100 67 80 95 55 80M50 15V87M20 45L37 50L30 68M80 45L63 50L70 68"/>',
 kidney:'<path d="M35 12C-3 22 2 89 37 90Q65 83 39 62Q20 48 42 35Q60 19 35 12ZM65 12C103 22 98 89 63 90Q35 83 61 62Q80 48 58 35Q40 19 65 12Z"/>',
 clock:'<circle cx="50" cy="50" r="40"/><path d="M50 23V50L72 64"/>',
 eye:'<path d="M5 50Q50-2 95 50Q50 102 5 50Z"/><circle cx="50" cy="50" r="17"/>',
 skin:'<path d="M8 30Q25 18 40 30T72 30T92 30V85H8Z M8 50H92M8 68H92"/>',
 scale:'<path d="M10 85V65H35V45H60V25H85V10M10 90H95"/>',
 person:'<circle cx="50" cy="20" r="12"/><path d="M50 34V65M25 48L50 40L75 48M50 65L30 90M50 65L70 90"/>',
 warning:'<path d="M50 8L95 88H5Z M50 35V59"/><circle cx="50" cy="73" r="2"/>',
 cell:'<circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="14"/><path d="M20 36L30 40M70 30L75 40M28 70L35 75M68 68L76 73"/>'
};
export function cueIcon(text){
 const rules=[[/serc|wieńc|zawał|kardi|tętn|QRS|EKG|załam|\bT\b/i,'heart'],[/dusz|oddech|płuc|oskrzel|tlen/i,'lungs'],[/krw|płyt|hem|erytro/i,'blood'],[/lek|insulin|tiazyd|furosem|penicyl|antybiot|terapi|odtrut|szczep/i,'medicine'],[/nerk|mocz|nefr|wydal/i,'kidney'],[/mózg|świadomo|splątan|pamię|psych|drgawk|nerw/i,'brain'],[/wzrok|ocz|źrenic/i,'eye'],[/skór|wysyp|śluzów|ścian/i,'skin'],[/czas|minut|godzin|tygod|dni|wiek/i,'clock'],[/skal|klas|NYHA|Forrest|stop|punkt|GCS/i,'scale'],[/stężen|badani|glik|wapń|potas|K⁺|Na⁺|wynik|przeciwcia/i,'lab'],[/piln|alarm|ryzyk|nie|bez/i,'warning'],[/komór|DNA|gen|syntez/i,'cell']];
 return rules.find(([pattern])=>pattern.test(text))?.[1]||'person';
}
const group=(body,attrs='')=>`<g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" ${attrs}>${body}</g>`;
function person(x,y,sitting=false){return group(`<circle cx="${x}" cy="${y}" r="13"/><path d="M${x} ${y+15}V${y+65}${sitting?`H${x+35}V${y+102}M${x-15} ${y+45}H${x+20}M${x-15} ${y+22}V${y+75}H${x+30}M${x-10} ${y+75}V${y+105}`:`M${x} ${y+30}L${x-23} ${y+55}M${x} ${y+30}L${x+22} ${y+47}M${x} ${y+65}L${x-20} ${y+105}M${x} ${y+65}L${x+25} ${y+95}`}"/>`);}
function nyhaScene(q){
 const states=[['II','Zwykły wysiłek'],['III','Mały wysiłek'],['IV','Spoczynek']];
 return `<div class="lw-nyha-scenes">${states.map(([level,label],i)=>`<figure class="lw-nyha-scene ${q.opts[0]===level?'is-answer':''}"><figcaption><b>NYHA ${level}</b><span>${label}</span></figcaption><svg viewBox="0 0 180 200" role="img" aria-label="${label}: duszność. NYHA ${level}">${person(80,35,i===2)}${i===0?group('<path d="M15 185V165H55V145H95V125H135V105H170"/>'):i===1?group('<path d="M20 165H155" stroke-dasharray="6 10"/>'):''}<g fill="#ee6b7b"><ellipse cx="73" cy="77" rx="9" ry="14"/><ellipse cx="88" cy="77" rx="9" ry="14"/></g><path d="M112 55q15 8 0 16m12-20q20 12 0 24" stroke="#ee6b7b" fill="none" stroke-width="3"/></svg><span class="lw-symptom">Duszność</span></figure>`).join('')}</div><p class="lw-scene-rule">Mniej wysiłku potrzebnego do wywołania objawów → wyższa klasa. IV: objawy już w spoczynku.</p><small>Sceny pomagają zapamiętać klasy; konkretna liczba schodów ani metrów nie wyznacza klasy. <a href="https://www.heart.org/en/health-topics/heart-failure/what-is-heart-failure/classes-of-heart-failure" target="_blank" rel="noopener noreferrer">Klasyfikacja NYHA — AHA</a></small>`;
}
function tearScene(q){
 return `<svg class="lw-tear-scene" viewBox="0 0 560 240" role="img" aria-label="Porównanie pęknięcia śluzówki i całej ściany"><g font-family="system-ui" font-size="16" fill="currentColor"><text x="20" y="25">Mallory–Weiss</text><text x="300" y="25">Boerhaave</text></g>${[20,300].map((x,i)=>`<g stroke="#ee6b7b" stroke-width="14"><path d="M${x} 70H${x+220}"/><path d="M${x} 105H${x+220}" opacity=".65"/><path d="M${x} 140H${x+220}" opacity=".35"/></g><path d="M${x+105} 52l-8 22 16 16${i?' -16 20 16 20 -16 30':''}" stroke="var(--lw-bg)" stroke-width="16" fill="none"/><text x="${x}" y="200" fill="currentColor" font-family="system-ui" font-size="16">${i?'Cała ściana':'Tylko śluzówka'}</text>`).join('')}</svg><p class="lw-scene-rule">${q.id===21?'Mallory–Weiss: pęknięcie powierzchowne.':'Boerhaave: pęknięcie przez całą ścianę.'}</p>`;
}
export function memoryScene(q){
 const custom=/NYHA/i.test(q.q)&&['II','III','IV'].includes(q.opts[0])?nyhaScene(q):[21,22].includes(q.id)?tearScene(q):null;
 return `<div class="lw-case-illustration lw-memory-scene"><div class="lw-eyebrow">OBRAZ DO ZAPAMIĘTANIA</div>${custom||`<div class="lw-cue-scene" role="group" aria-label="Wizualne skojarzenie do pytania">${q.steps.map((step,i)=>`<button type="button" class="lw-picture-cue" data-cue="${i}" aria-pressed="false"><svg viewBox="0 0 100 100" aria-hidden="true">${group(icons[cueIcon(step)])}</svg><span>${esc(step)}</span></button>`).join('')}</div><p class="lw-scene-hint">Symbole oznaczają hasła z tego pytania. To skojarzenie do powtórki, nie schemat przyczynowy.</p>`}
 <div class="lw-scene-answer"><span>POŁĄCZ OBRAZ Z ODPOWIEDZIĄ</span><strong>${esc(q.opts[0])}</strong></div>
 <p class="lw-scene-context">${esc(q.pl)}</p>
 <details class="lw-translation"><summary lang="uk">Пояснення українською</summary><div lang="uk"><p>${esc(q.ua)}</p></div></details></div>`;
}
export function mountMemoryScene(element){
 const click=event=>{const button=event.target.closest('[data-cue]');if(!button)return;const selected=button.getAttribute('aria-pressed')!=='true';element.querySelectorAll('[data-cue]').forEach(b=>b.setAttribute('aria-pressed',String(b===button&&selected)));};
 element.addEventListener('click',click);return()=>element.removeEventListener('click',click);
}
