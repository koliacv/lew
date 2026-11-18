import {open} from './crypto.js';
const base=new URL('./',import.meta.url),form=document.querySelector('form'),status=document.querySelector('[role=status]'),button=form.querySelector('button');
const show=message=>status.textContent=message;
const timeout=(promise,ms,message)=>{let id;return Promise.race([promise,new Promise((_,reject)=>{id=setTimeout(()=>reject(Error(message)),ms)})]).finally(()=>clearTimeout(id))};
let registration,ready;
button.disabled=true;
async function controllerReady(){
 const deadline=Date.now()+20000;
 while(Date.now()<deadline){
  const active=registration.active;
  if(!registration.installing&&!registration.waiting&&active?.state==='activated'&&navigator.serviceWorker.controller===active)return active;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('Przeglądarka nie aktywowała dostępu. Zamknij inne karty tej witryny i odśwież stronę.');
}
async function download(){
 const abort=new AbortController(),limit=setTimeout(()=>abort.abort(),180000);
 try{
  const response=await fetch(new URL('vault.bin',base),{cache:'no-store',signal:abort.signal});
  if(!response.ok)throw Error('Nie udało się pobrać materiałów. Spróbuj ponownie.');
  const reader=response.body.getReader(),chunks=[];let received=0;
  while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;show(`Pobieranie materiałów: ${(received/1048576).toFixed(1)} MB. Pozostaw tę kartę otwartą.`)}
  const bytes=new Uint8Array(received);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return bytes;
 }catch(error){if(error.name==='AbortError')throw Error('Pobieranie trwało zbyt długo. Sprawdź połączenie i spróbuj ponownie.');throw error}finally{clearTimeout(limit)}
}
// Install the submit handler before any asynchronous registration work.
form.onsubmit=async event=>{
 event.preventDefault();if(button.disabled)return;button.disabled=true;
 let password=form.elements.password.value.trim();form.elements.password.value='';
 try{
  await ready;show('Pobieranie materiałów…');const bytes=await download();show('Sprawdzanie hasła…');
  let plain;try{plain=await open(bytes,password)}catch{throw Error('Nieprawidłowe hasło lub uszkodzony plik materiałów. Sprawdź hasło i spróbuj ponownie.')}finally{password=''}
  const files=await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).json();plain=null;
  show('Otwieranie kolekcji…');const worker=await controllerReady();
  await timeout(new Promise((resolve,reject)=>{
   const channel=new MessageChannel();channel.port1.onmessage=event=>{channel.port1.close();event.data==='ready'?resolve():reject(Error('Nie udało się otworzyć sesji.'))};
   worker.postMessage({type:'unlock',files},[channel.port2]);
  }),20000,'Przeglądarka nie potwierdziła sesji. Odśwież stronę i spróbuj ponownie.');
  // The worker that received the data must control the navigation too.
  if(navigator.serviceWorker.controller!==worker||registration.installing||registration.waiting)throw Error('Witryna została zaktualizowana. Odśwież stronę i zaloguj się ponownie.');
  location.reload();
 }catch(error){password='';show(error.message||'Nie udało się otworzyć materiałów. Spróbuj ponownie.');button.disabled=false;form.elements.password.focus()}
};
ready=(async()=>{
 try{
  if(!isSecureContext||!navigator.serviceWorker||!globalThis.DecompressionStream)throw Error('Otwórz witrynę przez HTTPS w aktualnej wersji Safari, Chrome, Firefox lub Edge.');
  show('Przygotowanie bezpiecznego dostępu…');
  registration=await timeout(navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname,updateViaCache:'none'}),20000,'Nie udało się uruchomić dostępu. Sprawdź ustawienia przeglądarki.');
  await controllerReady();show('');button.disabled=false;
 }catch(error){show(error.message);button.disabled=true;throw error}
})();
ready.catch(()=>{});
