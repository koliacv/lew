import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ATLAS,selectAtlas} from '../src/atlas-data.js';
import {explanationVisual,mountExplanationVisual} from '../src/explanation-visual.js';
test('all atlas plates are real local PNGs with correct dimensions and licensed provenance',async()=>{
 assert.equal(new Set(ATLAS.map(a=>a.id)).size,13);
 for(const a of ATLAS){
  const bytes=await readFile(new URL(`../assets/atlas/${a.id}.png`,import.meta.url));
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(bytes.readUInt32BE(16),a.width);assert.equal(bytes.readUInt32BE(20),a.height);
  assert.match(a.source,/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
  assert.equal(a.license,a.id==='spine'?'CC BY-SA 4.0':'CC BY 3.0');
  for(const p of a.points){assert.ok(p.x>0&&p.x<100&&p.y>0&&p.y<100);for(const key of ['pl','ua','description','descriptionUa'])assert.ok(p[key].length>3);}
 }
});
test('selection uses the question and correct answer, never distractors or broad topic',()=>{
 assert.equal(selectAtlas({q:'Zawał serca',opts:['Lewa komora','Nerka']} ).id,'heart');
 assert.equal(selectAtlas({q:'Ciąża',opts:['Macica']}).id,'pregnancy');
 assert.equal(selectAtlas({q:'Kryteria depresji',topic:'Neurologia',opts:['Czas trwania','Mózg']}),null);
 assert.equal(selectAtlas({}),null);
});
test('each question has an open illustration and a separately collapsed atlas',async()=>{
 const bank=JSON.parse(await readFile(new URL('../data/questions.json',import.meta.url),'utf8'));
 for(const q of bank){
  const html=explanationVisual(q);
  assert.match(html,/lw-question-plate|lw-case-illustration/);
  assert.match(html,/<details class="lw-atlas-library">/);
  assert.doesNotMatch(html,/<details[^>]*\bopen(?:[ >])/);
  assert.equal((html.match(/<option /g)||[]).length,14);
 }
 assert.equal(typeof mountExplanationVisual(null),'function');
});
test('memory scenes expose the correct answer immediately and retain explanatory qualifiers',async()=>{
 const {memoryScene}=await import('../src/memory-scene.js');
 const bank=JSON.parse(await readFile(new URL('../data/questions.json',import.meta.url),'utf8'));
 for(const q of bank){const html=memoryScene(q);assert.match(html,/lw-scene-answer/);assert.match(html,/lw-scene-context/);assert.doesNotMatch(html,/data-clinical|Prawidłowa odpowiedź<\/button>/);}
 assert.match(memoryScene(bank.find(q=>q.id===201)),/Mały wysiłek/);
 assert.match(memoryScene(bank.find(q=>q.id===21)),/Tylko śluzówka/);
 assert.match(memoryScene(bank.find(q=>q.id===22)),/Cała ściana/);
});
