import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import vm from 'node:vm';
import { chromium } from 'playwright';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const classicScripts = [...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi)]
  .filter(([, attrs]) => !/\\btype\\s*=\\s*["']module["']/i.test(attrs))
  .map(([, , body]) => body);
assert.ok(classicScripts.length >= 1, 'main application script must exist');
classicScripts.forEach((source, index) => new vm.Script(source, { filename: `inline-${index + 1}.js` }));

for (const marker of [
  "new WebSocket('ws://127.0.0.1:17321')",
  'payload.queue=queue',
  'companionPublish();',
  'function companionConnect()',
]) assert.ok(html.includes(marker), `desktop floating companion integration missing: ${marker}`);

const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.route(/^https?:\\/\\/(?!127\\.0\\.0\\.1)/, route => route.abort());

try {
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#app').waitFor();
  await page.locator('[data-view="listen"]').click();
  await page.getByText('听力训练', { exact: true }).waitFor();

  // Blind sentence listening: text remains hidden until the learner requests it.
  await page.locator('[data-mode="sentence"]').click();
  await page.locator('[data-action="start"]').click();
  await page.locator('.listen-audio-trigger').waitFor();
  assert.equal(await page.locator('.listen-sentence-reveal').count(), 0, 'sentence text must be hidden initially');
  await page.locator('[data-action="listen-reveal"]').click();
  await page.locator('.listen-sentence-reveal').waitFor();

  // Shadowing is self-reported practice, tracked separately from quiz accuracy.
  await page.locator('[data-mode="shadow"]').click();
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="shadow-done"]').click();
  await page.getByText(/跟读完成 1 \/ 1 次/).waitFor();

  // Visual recognition explicitly shows spelling; it is not counted as listening.
  await page.locator('[data-mode="visual"]').click();
  await page.locator('[data-action="start"]').click();
  await page.locator('.listen-visual-word').waitFor();
  assert.ok(await page.locator('.choice').count() >= 2, 'visual recognition must offer meaning choices');

  // Conversation practice has a spoken prompt and multiple response choices.
  await page.locator('[data-mode="scenario"]').click();
  await page.locator('[data-action="start"]').click();
  await page.locator('.listen-audio-trigger').waitFor();
  assert.equal(await page.locator('.choice').count(), 3, 'scenario practice should show three response choices');
  await page.locator('.choice').first().click();
  await page.locator('.listen-answer-panel, .listen-correct-feedback').waitFor();

  // Return to blind word listening and confirm the prompt is audio-first.
  await page.locator('[data-mode="choice"]').click();
  await page.locator('[data-action="start"]').click();
  await page.locator('.listen-audio-trigger').waitFor();
  assert.equal(await page.locator('.listen-visual-word').count(), 0);

  // Existing audio player and desktop companion entry point must remain present.
  await page.locator('[data-view="audio"]').click();
  await page.locator('.audio-player').waitFor();
  await page.locator('#companionSync').waitFor();

  // Existing built-in reading view must still render.
  await page.locator('[data-view="reader"]').click();
  await page.locator('.reader-article').waitFor();

  assert.deepEqual(pageErrors, [], `browser runtime errors: ${pageErrors.join('; ')}`);
  console.log('English smoke tests passed: syntax, listening modes, shadowing metrics, audio player, companion bridge, and reader.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
