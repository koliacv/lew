import { SCALE_EXAMPLES } from './scale-examples.js';
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function scaleName(q){return Object.keys(SCALE_EXAMPLES).find(name=>q.q.toLowerCase().includes(name.toLowerCase())) || null;}
export function illustrationKind(q){
 const text=[q.q,q.opts[0]].join(' ');
 if(/skal|klas|punkt|kategor|stopie|NYHA|Killip|Forrest|GCS|BI-RADS|Tanner|Apgar|Bishop/i.test(text))return 'scale';
 if(/lek\b|leku|leczen|odtrut|insulin|antybiot|benzodiazep|szczepi|penicyl|warfaryn/i.test(text))return 'medicine';
 if(/badani|stężeni|wynik|przeciwcia|antygen|glikemi|OGTT|HbA1c|laborator|D-dimer|genety|dziedzicz/i.test(text))return 'lab';
 return 'case';
}
const drawings={
 scale:'<path d="M100 240H420M120 225V255M190 225V255M260 225V255M330 225V255M400 225V255"/><rect x="95" y="115" width="330" height="72" rx="12"/><path d="M125 140H260M125 160H210"/>',
 medicine:'<g transform="rotate(-32 260 180)"><rect x="160" y="135" width="200" height="90" rx="45"/><path d="M260 135V225"/><path d="M185 160H225"/></g><path d="M100 235H160M130 205V265M365 115H405M385 95V135"/>',
 lab:'<path d="M160 100V235Q160 275 200 275Q240 275 240 235V100M150 100H250M160 190H240"/><rect x="285" y="105" width="130" height="150" rx="12"/><path d="M310 135H385M310 165H365M310 195H385M310 225H350"/>',
 case:'<rect x="130" y="85" width="260" height="200" rx="18"/><rect x="205" y="70" width="110" height="32" rx="8"/><circle cx="185" cy="145" r="20"/><path d="M155 200Q155 170 185 170Q215 170 215 200M250 135H355M250 160H335M250 185H355M160 235H355M160 255H315"/>'
};
const titles={scale:'Klasyfikacja i interpretacja',medicine:'Lek i jego znaczenie',lab:'Badanie i interpretacja',case:'Przypadek kliniczny'};
export function questionIllustration(q){
 const scale=scaleName(q);
 if(scale){
  const examples=SCALE_EXAMPLES[scale];
  return `<div class="lw-case-illustration"><h4>${esc(scale)} — przykłady z bazy</h4><p class="lw-atlas-intro">Wybierz oznaczenie, aby porównać opisane przypadki. To przykłady z pytań, nie pełna tabela skali.</p><div class="lw-scale-drawing"><svg viewBox="0 0 520 100" aria-hidden="true"><path d="M30 50H490" stroke="var(--lw-teal)" stroke-width="5"/></svg><div class="lw-scale-points">${examples.map((e,i)=>`<button type="button" data-scale="${i}" aria-pressed="${e.label===q.opts[0]}">${esc(e.label)}</button>`).join('')}</div></div><div class="lw-clinical-detail" aria-live="polite"><strong>${esc(q.opts[0])}</strong><div class="lw-polish-explanation" lang="pl"><p>${esc(q.pl)}</p></div><details class="lw-translation"><summary lang="uk">Пояснення українською</summary><div lang="uk"><p>${esc(q.ua)}</p></div></details></div></div>`;
 }
 const kind=illustrationKind(q);
 const parts=[['Dane z pytania',q.q],['Prawidłowa odpowiedź',q.opts[0]],['Wyjaśnienie',q.pl]];
 return `<div class="lw-case-illustration" data-kind="${kind}"><h4>${titles[kind]}</h4><p class="lw-atlas-intro">Schemat do tego pytania. Wybierz oznaczenie, aby sprawdzić dane, odpowiedź lub jej wyjaśnienie.</p>
 <div class="lw-clinical-drawing"><svg viewBox="0 0 520 340" role="img" aria-label="${titles[kind]} — schemat edukacyjny"><rect width="520" height="340" rx="24" fill="var(--lw-card)"/><g fill="var(--lw-soft)" stroke="var(--lw-teal)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${drawings[kind]}</g></svg>
 ${parts.map((p,i)=>`<button type="button" class="lw-clinical-point" data-clinical="${i}" aria-pressed="${i===2}" style="left:${[25,75,50][i]}%;top:${[32,52,82][i]}%">${i+1}. ${p[0]}</button>`).join('')}</div>
 <div class="lw-clinical-keywords">${q.steps.map(s=>`<span>${esc(s)}</span>`).join('')}</div>
 <div class="lw-clinical-detail" aria-live="polite"><strong>${parts[2][0]}</strong><div class="lw-polish-explanation" lang="pl"><p>${esc(q.pl)}</p></div><details class="lw-translation"><summary lang="uk">Пояснення українською</summary><div lang="uk"><p>${esc(q.ua)}</p></div></details></div>
 </div>`;
}
export function mountQuestionIllustration(element,q){
 const parts=[['Dane z pytania',q.q],['Prawidłowa odpowiedź',q.opts[0]],['Wyjaśnienie',q.pl]];
 const click=e=>{const scaleButton=e.target.closest('[data-scale]');if(scaleButton){const selected=SCALE_EXAMPLES[scaleName(q)][Number(scaleButton.dataset.scale)];element.querySelectorAll('[data-scale]').forEach(b=>b.setAttribute('aria-pressed',String(b===scaleButton)));element.querySelector('.lw-clinical-detail').innerHTML=`<strong>Przykład: ${esc(selected.label)}</strong><p>${esc(selected.q)}</p><div class="lw-polish-explanation" lang="pl"><p>${esc(selected.pl)}</p></div><details class="lw-translation"><summary lang="uk">Пояснення українською</summary><div lang="uk"><p>${esc(selected.ua)}</p></div></details>`;return;}const b=e.target.closest('[data-clinical]');if(!b)return;const i=Number(b.dataset.clinical);element.querySelectorAll('[data-clinical]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));element.querySelector('.lw-clinical-detail').innerHTML=`<strong>${parts[i][0]}</strong><div class="lw-polish-explanation" lang="pl"><p>${esc(parts[i][1])}</p></div><details class="lw-translation"><summary lang="uk">Пояснення українською</summary><div lang="uk"><p>${esc(q.ua)}</p></div></details>`;};
 element.addEventListener('click',click);return()=>element.removeEventListener('click',click);
}
