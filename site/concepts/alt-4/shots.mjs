// Screenshots of option A (the Floor): gate, mid-hold, the breath, the hit, the rise, the settled hero, a scroll,
// plus the phone gate and hero. Run from site/: node scripts/heavy.mjs "node concepts/alt-4/shots.mjs"
// Uses ?capture (virtual time: the page only moves when this script advances it), so every frame is exact.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { VIRTUAL } from './shots-virtual.mjs';

const base = 'http://127.0.0.1:5320/concepts/alt-4/';
const out = 'shots/r4/alt-4/floor';
mkdirSync(out, { recursive: true });
const errors = [];
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 120000,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});

async function open(w, h, query = '?capture') {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${w}: ${m.text()}`));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(VIRTUAL);
  await page.goto(base + query, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < 300 && !(await page.evaluate(() => !!window.__floor)); i++) { await page.evaluate(() => window.__advance(16.67)); }
  await step(page, 400);
  return page;
}
const step = async (page, ms) => {
  for (let t = 0; t < ms; t += 16.67) await page.evaluate(() => window.__advance(16.67));
};
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const state = (page) => page.evaluate(() => ({ phase: document.documentElement.dataset.floor, gated: document.documentElement.classList.contains('is-gated'), overflow: document.documentElement.scrollWidth > innerWidth }));

for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const page = await open(w, h);
  await shot(page, `${tag}-01-gate`);
  const hold = await page.$('.fl-hold');
  const box = await hold.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await step(page, 900);
  await shot(page, `${tag}-02-hold-half`);
  console.log(tag, 'mid-hold', JSON.stringify(await state(page)));
  await step(page, 820);
  await shot(page, `${tag}-03-breath`);
  await page.mouse.up();
  await step(page, 200);
  await shot(page, `${tag}-04-hit`);
  await step(page, 260);
  await shot(page, `${tag}-05-wave`);
  await step(page, 900);
  await shot(page, `${tag}-06-rise`);
  await step(page, 2400);
  await page.mouse.move(w * 0.3, h * 0.45);
  await step(page, 600);
  await shot(page, `${tag}-07-hero`);
  console.log(tag, 'hero', JSON.stringify(await state(page)));
  // Charge on the open floor, release: your own shockwave.
  await page.mouse.move(w * 0.62, h * 0.62);
  await page.mouse.down();
  await step(page, 1000);
  await shot(page, `${tag}-07b-charge`);
  await page.mouse.up();
  await step(page, 330);
  await shot(page, `${tag}-07c-fire`);
  await step(page, 1500);
  await page.evaluate(() => window.scrollTo(0, innerHeight * 0.5));
  await step(page, 300);
  await shot(page, `${tag}-08-sink`);
  await page.close();
}
// still
{
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`still: ${e.message}`));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base + '?still', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));
  await shot(page, 'd-09-still');
  await page.close();
}
console.log('errors', JSON.stringify(errors, null, 1));
await browser.close();
