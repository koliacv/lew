let files=null,expires=0;
const base=new URL('./',self.location),publicFiles=new Set(['gate.js','crypto.js','sw.js','vault.bin','lock.js']);
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const c of await self.clients.matchAll({type:'window'}))c.postMessage({type:'locked'})})()));
self.addEventListener('message',event=>{if(event.data?.type==='status'&&(!files||Date.now()>expires)){files=null;event.source?.postMessage({type:'locked'})}if(event.data?.type==='unlock'){files=event.data.files;expires=Date.now()+8*60*60*1000;event.ports[0]?.postMessage('ready')}if(event.data?.type==='lock'){files=null;expires=0;event.waitUntil(self.clients.matchAll({type:'window'}).then(clients=>clients.forEach(c=>c.postMessage({type:'locked'}))))}});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
 const path=decodeURIComponent(url.pathname.slice(base.pathname.length));if(publicFiles.has(path))return;
 event.respondWith((async()=>{
 if(Date.now()>expires)files=null;
 const name=path.endsWith('/')?path+'index.html':path||'index.html';
 if(!files){if(event.request.mode==='navigate'){const response=await fetch(new URL('index.html',base),{cache:'no-store'});return new Response((await response.text()).replace('src="./gate.js"',`src="${new URL('gate.js',base).href}"`),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}return new Response('Locked',{status:401,headers:{'Cache-Control':'no-store'}})}
 const file=files[name];if(!file)return new Response('Not found',{status:404});
 let bytes=Uint8Array.from(atob(file.body),c=>c.charCodeAt(0));
 if(file.type.startsWith('text/html')){let html=new TextDecoder().decode(bytes);html=html.replace(/<head>/i,`<head><script src="${new URL('lock.js',base).href}" defer></script>`);if(!html.includes('lock.js'))html+=`<script src="${new URL('lock.js',base).href}" defer></script>`;bytes=new TextEncoder().encode(html)}
 return new Response(bytes,{headers:{'Content-Type':file.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 })());
});

// Build 7998fcd60be3267a51bccae27670f85febf12b5d32c07fe3a523c5505f928cc2
