navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='locked')location.reload()});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
const button=document.createElement('button');button.textContent='Zablokuj';button.style.cssText='position:fixed;right:12px;bottom:12px;z-index:10000;padding:10px 16px;border:1px solid #aab7ed;border-radius:12px;background:#1d2b42;color:#eef3ff;cursor:pointer';button.onclick=()=>{navigator.serviceWorker.controller?.postMessage({type:'lock'})};document.body.append(button);

setInterval(()=>navigator.serviceWorker.controller?.postMessage({type:'status'}),15000);
