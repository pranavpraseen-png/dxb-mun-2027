// The lead's combination end to end (no query = the picks in parts/registry.ts): every section at 1440 and 390,
// in motion mode after skipping the opening, so reveals and the nav are checked as a visitor sees them.
// Run from site/: node scripts/heavy.mjs "node concepts/alt-4/combo-shots.mjs"
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const out = 'shots/r4/alt-4/combo';
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 120000,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5320/concepts/alt-4/', { waitUntil: 'networkidle0', timeout: 90000 });
  await wait(1500);
  await page.click('.fl-gate-bot button:last-child'); // Skip intro
  await wait(3500);
  await page.screenshot({ path: `${out}/${tag}-00-hero.png` });
  console.log(tag, 'combo', await page.evaluate(() => document.documentElement.dataset.combo), 'gated', await page.evaluate(() => document.documentElement.classList.contains('is-gated')));
  for (const id of ['about', 'committees', 'schedule', 'register', 'wellness', 'contact']) {
    await page.evaluate((id) => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 64); }, id);
    await wait(1600);
    await page.screenshot({ path: `${out}/${tag}-${id}.png` });
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await wait(1500);
  await page.screenshot({ path: `${out}/${tag}-zz-end.png` });
  console.log(tag, JSON.stringify(await page.evaluate(() => ({ height: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth > innerWidth, ids: [...document.querySelectorAll('[id]')].map((e) => e.id).filter((v, i, a) => a.indexOf(v) !== i) }))));
  await page.close();
}
console.log('errors', JSON.stringify(errors, null, 1));
await browser.close();
