import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const root = new URL('../', import.meta.url);

test('entrypoint uses local relative assets for the /lew/ Pages subpath', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<html lang="pl">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /type="module" src="\.\/src\/app.js"/);
  for (const [, path] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) await access(new URL(path, root));
  assert.doesNotMatch(html, /(?:src|href)="\/(?!\/)/);
});
test('app loads local data and retains explanation-only Ukrainian support', async () => {
  const app = await readFile(new URL('src/app.js', root), 'utf8');
  for (const [, path] of app.matchAll(/new URL\('([^']+)', import.meta.url\)/g)) {
    await access(new URL(path, new URL('src/app.js', root)));
  }
  assert.match(app, /lang="uk"/);
  assert.match(app, /s.mode==='learn'&&s.locked\[id\]/);
  assert.doesNotMatch(app, /window\.openai|localStorage|sessionStorage/);
});
