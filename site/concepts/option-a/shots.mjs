// Screenshots of the three homepage options (website-options agent). Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/option-a/shots.mjs [a,b,c]"
// Motion mode: first screen, the globe landed on Dubai with the resolution inked, the committees.
// Still mode (?still): one full-page shot. Reports horizontal overflow, the globe renderer and console errors.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const base = 'http://127.0.0.1:5320/concepts/';
const only = (process.argv[2] ?? 'a,b,c').split(',');
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = browsers.find((p) => existsSync(p));
const out = 'shots/v2/options';
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath, headless: true,
  args: ['--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const scrollTo = async (page, y) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await wait(300);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
};

for (const o of only) {
  const id = `option-${o}`;
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const tag = `${id}@${w}`;
    const page = await browser.newPage();
    watch(page, tag);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(`${base}${id}/`, { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(2500);
    await page.screenshot({ path: `${out}/${id}-${w}-first.png` });
    const overflowTop = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

    // The globe has landed and every clause has inked in near the end of the pinned opening.
    const yGlobe = await page.evaluate(() => {
      const t = document.querySelector('.opening');
      return t ? t.offsetTop + (t.offsetHeight - innerHeight) * 0.96 : 0;
    });
    await scrollTo(page, yGlobe);
    await wait(4500);
    const renderer = await page.evaluate(() => document.querySelector('.globe-stage')?.getAttribute('data-renderer'));
    await page.screenshot({ path: `${out}/${id}-${w}-globe.png` });

    const yCm = await page.evaluate(() => {
      const el = document.getElementById('committees');
      return el ? el.getBoundingClientRect().top + scrollY - 60 : 0;
    });
    await scrollTo(page, yCm);
    await wait(2500);
    await page.screenshot({ path: `${out}/${id}-${w}-committees.png` });
    const overflowMid = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.close();

    // Full page in still mode (the pinned opening cannot be captured as one tall image).
    const still = await browser.newPage();
    watch(still, tag + '(still)');
    await still.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await still.goto(`${base}${id}/?still`, { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(1500);
    const overflowStill = await still.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const wide = await still.evaluate(() => [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed')
      .slice(0, 5).map((el) => el.className && String(el.className).slice(0, 60)));
    await still.screenshot({ path: `${out}/${id}-${w}-full.png`, fullPage: true });
    await still.close();
    console.log(`${tag}: overflow top=${overflowTop} mid=${overflowMid} still=${overflowStill} renderer=${renderer} height=${height}px (${(height / h).toFixed(1)} screens)${overflowStill ? ' wide: ' + wide.join(' | ') : ''}`);
  }
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
