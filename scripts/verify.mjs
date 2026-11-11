import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const allowed=new Set(['vault.bin','.nojekyll','index.html','404.html','crypto.js','gate.js','sw.js','lock.js','audit.html','collections/nostryfikacja/index.html','collections/materialy-lek/index.html','collections/materialy-lek/reader.html']);
const found=[];
async function walk(dir=''){for(const e of await readdir(new URL('../site/'+dir,import.meta.url),{withFileTypes:true})){const path=dir+e.name;if(e.isDirectory()){await walk(path+'/');continue}assert.ok(allowed.has(path),'Unexpected public file: '+path);found.push(path);const data=await readFile(new URL('../site/'+path,import.meta.url));if(path==='vault.bin'){assert.equal(data.subarray(0,4).toString(),'LEW1');assert.ok(data.length>1000)}else{const text=data.toString();if(path.endsWith('.html'))assert.ok(text.includes('Hasło dostępu'));}}}
await walk();assert.equal(found.length,allowed.size);console.log('Public artifact verified.');
