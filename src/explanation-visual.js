import { ATLAS, selectAtlas } from './atlas-data.js';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function explanationVisual(question) {
  const selected = selectAtlas(question);
  return `<section class="lw-visual" aria-labelledby="lw-visual-title">
    <div class="lw-eyebrow">INTERAKTYWNY ATLAS</div><h3 id="lw-visual-title">Zobacz anatomię</h3>
    <p class="lw-atlas-intro">${selected ? 'Kontekst anatomiczny do pytania.' : 'Wybierz ilustrację do samodzielnego przeglądania.'} Ilustracje pokazują anatomię, nie rozpoznanie choroby. Dotknij numeru, aby poznać strukturę.</p>
    <label class="lw-atlas-label" for="lw-atlas-select">Ilustracja</label><select id="lw-atlas-select" class="lw-atlas-select"><option value="">Wybierz z atlasu…</option>${ATLAS.map(a=>`<option value="${a.id}" ${a.id===selected?.id?'selected':''}>${escape(a.title)} / ${escape(a.ua)}</option>`).join('')}</select>
    <div class="lw-atlas-content"></div></section>`;
}
export function mountExplanationVisual(element) {
  if (!element) return ()=>{};
  const select=element.querySelector('select'),content=element.querySelector('.lw-atlas-content');
  let zoom=1;
  function render(){
    const atlas=ATLAS.find(a=>a.id===select.value);
    zoom=1;
    if(!atlas){content.innerHTML='';return;}
    const image=new URL(`../assets/atlas/${atlas.id}.png`,import.meta.url).href;
    content.innerHTML=`<div class="lw-atlas-toolbar" role="group" aria-label="Powiększenie ilustracji"><button type="button" data-zoom="-1" aria-label="Pomniejsz">−</button><output aria-live="polite">100%</output><button type="button" data-zoom="1" aria-label="Powiększ">+</button><button type="button" data-zoom="0">Reset</button></div>
      <p class="lw-atlas-hint">Po powiększeniu przesuwaj obraz. Możesz też wybrać strukturę z listy poniżej.</p>
      <div class="lw-atlas-viewport" tabindex="0" role="region" aria-label="${escape(atlas.title)} — przewijany obraz"><div class="lw-atlas-stage"><img src="${image}" alt="${escape(atlas.title)} — realistyczna ilustracja anatomiczna" width="${atlas.width}" height="${atlas.height}" loading="lazy" decoding="async">${atlas.points.map((p,i)=>`<button type="button" class="lw-atlas-pin" data-point="${i}" style="left:${p.x}%;top:${p.y}%" aria-label="${i+1}. ${escape(p.pl)}" aria-pressed="false"><span>${i+1}</span></button>`).join('')}</div></div>
      <p class="lw-atlas-error" hidden>Nie udało się wczytać ilustracji. Skorzystaj z odnośnika do oryginału poniżej.</p>
      <div class="lw-atlas-list" role="group" aria-label="Struktury anatomiczne">${atlas.points.map((p,i)=>`<button type="button" data-point="${i}" aria-pressed="false">${i+1}. ${escape(p.pl)}</button>`).join('')}</div>
      <div class="lw-atlas-detail" aria-live="polite"><strong>Wybierz numer na ilustracji</strong><p lang="uk">Натисніть на позначку, щоб побачити назву й опис.</p></div>
      <p class="lw-atlas-credit">${escape(atlas.author)} · <a href="${atlas.source}" target="_blank" rel="noopener noreferrer">Oryginał</a> · <a href="${atlas.licenseUrl}" target="_blank" rel="noopener noreferrer">${atlas.license}</a><br>Obraz bez zmian; dodano interaktywne oznaczenia PL/UA (CC BY-SA 4.0).</p>`;
    content.querySelector('img').onerror=()=>{content.querySelector('.lw-atlas-error').hidden=false;content.querySelector('.lw-atlas-viewport').hidden=true;};
    updateZoom();
  }
  function updateZoom(){
    content.querySelector('.lw-atlas-stage').style.width=`${zoom*100}%`;
    content.querySelector('output').textContent=`${Math.round(zoom*100)}%`;
    content.querySelector('[data-zoom="-1"]').disabled=zoom<=1;
    content.querySelector('[data-zoom="1"]').disabled=zoom>=3;
  }
  function clicked(event){
    const button=event.target.closest('button');if(!button || !content.contains(button))return;
    if(button.hasAttribute('data-zoom')){
      const delta=Number(button.dataset.zoom);zoom=delta?Math.min(3,Math.max(1,zoom+delta*.5)):1;updateZoom();
      if(!delta)content.querySelector('.lw-atlas-viewport').scrollTo(0,0);
    }
    if(button.hasAttribute('data-point')){
      const atlas=ATLAS.find(a=>a.id===select.value),index=Number(button.dataset.point),p=atlas.points[index];
      content.querySelectorAll('[data-point]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.point)===index)));
      content.querySelector('.lw-atlas-detail').innerHTML=`<span class="lw-eyebrow">STRUKTURA ${index+1}</span><h4>${escape(p.pl)}</h4><p>${escape(p.description)}</p><div lang="uk"><strong>${escape(p.ua)}</strong><p>${escape(p.descriptionUa)}</p></div>`;
      const viewport=content.querySelector('.lw-atlas-viewport'),stage=content.querySelector('.lw-atlas-stage');
      if(zoom>1)viewport.scrollTo({left:stage.offsetWidth*p.x/100-viewport.clientWidth/2,top:stage.offsetHeight*p.y/100-viewport.clientHeight/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
  }
  select.addEventListener('change',render);content.addEventListener('click',clicked);render();
  return ()=>{select.removeEventListener('change',render);content.removeEventListener('click',clicked);const img=content.querySelector('img');if(img)img.onerror=null;};
}
