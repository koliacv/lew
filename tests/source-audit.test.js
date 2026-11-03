import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateBank,createSession,submitAnswer,nextQuestion} from '../src/quiz.js';
const bank=JSON.parse(await readFile(new URL('../data/questions.json',import.meta.url)));
const sources=JSON.parse(await readFile(new URL('../data/sources.json',import.meta.url)));
const audit=JSON.parse(await readFile(new URL('../data/source-audit.json',import.meta.url)));
test('audit inventories all 11 supplied files without claiming full coverage',()=>{
 assert.equal(audit.files.length,11);assert.equal(audit.files.reduce((s,f)=>s+(f.pages||0),0),982);
 assert.equal(audit.fullCoverageVerified,false);assert.equal(audit.allContentClinicallyReviewed,false);
 assert.deepEqual(audit.importedIds,bank.filter(q=>q.provenance).map(q=>q.id));
});
test('source questions preserve original options and reviewed answer identity after reordering',()=>{
 const imported=bank.filter(q=>q.provenance);assert.equal(imported.length,14);
 for(const q of imported){const p=q.provenance;const options=p.translatedOptions??p.originalOptions;assert.equal(p.officialKey,false);assert.ok(audit.files.some(f=>f.sha256===p.sha256));assert.deepEqual([...q.opts].sort(),[...options].sort());assert.equal(q.opts[0],options[p.correctOriginalIndex]);assert.ok(q.references.length);
 if(p.kind==='source-question')assert.equal(q.q,p.originalQuestion.replace(/\s+/g,' ').trim());
 }
 const malformed=structuredClone(bank);malformed.find(q=>q.provenance).provenance.correctOriginalIndex=0;
 assert.throws(()=>validateBank(malformed,sources),/source provenance/);
});
test('mixed source option counts never produce invented options or accept absent answers',()=>{
 const examples=[2,3,4,5].map(count=>bank.find(q=>q.provenance&&q.opts.length===count));
 assert.ok(examples.every(Boolean));
 const counts=Object.fromEntries(examples.map(q=>[q.id,q.opts.length]));
 const s=createSession(examples.map(q=>q.id),'topic',examples.length,0,()=>0,'',{},counts);
 for(let i=0;i<s.ids.length;i++){
  const id=s.ids[s.index];const q=examples.find(q=>q.id===id);
  assert.deepEqual([...s.options[id]].sort(),q.opts.map((_,i)=>i));
  assert.throws(()=>submitAnswer(s,q.opts.length,1000),/Invalid answer/);
  assert.equal(submitAnswer(s,0,1000),true);
  if(i<s.ids.length-1)assert.equal(nextQuestion(s,2000),true);
 }
 const translated=structuredClone(bank);translated.find(q=>q.provenance?.translatedOptions).provenance.translatedOptions.pop();
 assert.throws(()=>validateBank(translated,sources),/source provenance/);
});
