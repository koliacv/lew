import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateBank, createSession, recordSeen, submitAnswer, nextQuestion, summarizeSession } from '../src/quiz.js';
const bank=JSON.parse(await readFile(new URL('../data/questions.json',import.meta.url)));
const sources=JSON.parse(await readFile(new URL('../data/sources.json',import.meta.url)));
const audit=JSON.parse(await readFile(new URL('../data/source-audit.json',import.meta.url)));
const generated=bank.filter(q=>q.generation);
test('120 added learning objectives are playable bank entries with traceable material locations',()=>{
 assert.equal(generated.length,120);assert.equal(audit.currentBank,bank.length);
 assert.deepEqual(audit.generatedIds,generated.map(q=>q.id));
 assert.equal(new Set(generated.map(q=>q.generation.objective)).size,120);
 for(const f of audit.files){
  const questions=generated.filter(q=>q.generation.materialId===f.id);
  assert.equal(questions.length,f.generated);assert.ok(questions.length>0);
  for(const q of questions){
   const g=q.generation;assert.equal(g.sha256,f.sha256);assert.equal(g.file,f.name);assert.equal(q.opts.length,5);
   assert.ok(!q.provenance);assert.equal(g.examPrediction,false);
   if(g.locator.page)assert.ok(g.locator.page<=f.pages);
   if(g.locator.paragraph)assert.ok(g.locator.paragraph<=f.paragraphs);
   const entry=audit.generatedObjectives.find(x=>x.id===q.id);
   assert.equal(entry.objective,g.objective);assert.deepEqual(entry.locator,g.locator);
  }
 }
 assert.equal(validateBank(bank,sources),true);
});
test('new batch supports six complete 20-question sessions without repeating IDs',()=>{
 let history={};const ids=generated.map(q=>q.id);
 for(let i=0;i<6;i++){
  const s=createSession(ids,'topic',20,0,Math.random,'',history);
  assert.ok(s.ids.every(id=>!history[id]));
  for(let j=0;j<20;j++){
   const q=generated.find(q=>q.id===s.ids[s.index]);
   assert.equal(s.options[q.id].length,5);
   assert.equal(submitAnswer(s,0,j*2000+1000),true);
   if(j<19)assert.equal(nextQuestion(s,j*2000+2000),true);
  }
  assert.equal(summarizeSession(s).right,20);
  history=recordSeen(history,s.ids,1000+i);
 }
 assert.equal(Object.keys(history).length,120);
});
test('generated questions cannot impersonate imported questions or lose source identity',()=>{
 const invalid=[g=>g.examPrediction=true,g=>g.sha256='unknown',g=>g.locator={},g=>g.objective=''];
 for(const change of invalid){const copy=structuredClone(bank);change(copy.find(q=>q.generation).generation);assert.throws(()=>validateBank(copy,sources),/generated question provenance/);}
 const copy=structuredClone(bank);copy.find(q=>q.generation).provenance={};assert.throws(()=>validateBank(copy,sources),/generated question provenance/);
});
test('calculation and source-error corrections retain their reviewed keys',()=>{
 const answer=key=>generated.find(q=>q.generation.objective===key).opts[0];
 assert.equal(answer('holliday-segar-26kg'),`${10*100+10*50+6*20} ml/dobę`);
 assert.equal(answer('water-deficit-calculation'),'6 l');
 assert.match(answer('nephrotic-prednisone-units'),/60 mg\/m² albo 2 mg\/kg/);
 assert.match(answer('gcs3-not-brain-death'),/^Nie/);
 assert.match(answer('balthazar-e-correction'),/Co najmniej dwa zbiorniki/);
 assert.match(answer('clerambault-erotomania'),/Urojenie/);
});
