import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateBank } from '../src/quiz.js';
const root = new URL('../', import.meta.url);
const bank = JSON.parse(await readFile(new URL('data/questions.json', root), 'utf8'));
const sources = JSON.parse(await readFile(new URL('data/sources.json', root), 'utf8'));
validateBank(bank, sources);
const destination = new URL('dist/', root);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
// Publish only website assets, never tests, repository metadata, or original uploads.
for (const path of ['index.html', 'audit.html', 'assets', 'src', 'data']) {
  await cp(new URL(path, root), new URL(path, destination), { recursive: true });
}
await writeFile(new URL('.nojekyll', destination), '');
console.log(`Built ${bank.length} questions into ${fileURLToPath(destination)}`);
