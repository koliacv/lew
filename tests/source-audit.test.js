import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateBank} from '../src/quiz.js';
const bank=JSON.parse(await readFile(new URL('../data/questions.json',import.meta.url)));
const sources=JSON.parse(await readFile(new URL('../data/sources.json',import.meta.url)));
const audit=JSON.parse(await readFile(new URL('../data/source-audit.json',import.meta.url)));
test('audit inventories all 11 supplied files without claiming full coverage',()=>{
 assert.equal(audit.files.length,11);assert.equal(audit.files.reduce((s,f)=>s+(f.pages||0),0),982);
 assert.equal(audit.fullCoverageVerified,false);assert.equal(audit.allContentClinicallyReviewed,false);
 assert.deepEqual(audit.importedIds,bank.filter(q=>q.provenance).map(q=>q.id));
});
test('source questions preserve original options and reviewed answer identity after reordering',()=>{
 const imported=bank.filter(q=>q.provenance);assert.equal(imported.length,5);
 for(const q of imported){const p=q.provenance;assert.equal(p.officialKey,false);assert.ok(audit.files.some(f=>f.sha256===p.sha256));assert.deepEqual([...q.opts].sort(),[...p.originalOptions].sort());assert.equal(q.opts[0],p.originalOptions[p.correctOriginalIndex]);assert.ok(q.references.length);
 if(p.kind==='source-question')assert.equal(q.q,p.originalQuestion.replace(/\s+/g,' ').trim());
 }
 const malformed=structuredClone(bank);malformed.find(q=>q.provenance).provenance.correctOriginalIndex=0;
 assert.throws(()=>validateBank(malformed,sources),/source provenance/);
});
