// Screenshots for Redesign 1 ("The Assembly"), Dubai Dusk + Official Record pass. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/redesign-1/shots.mjs"
// Motion mode: the first screen, then camera states at chosen stop parameters t (the scroll position is computed
// from the page's own stop ranges; window.__snap makes the damped camera land at once so a slow software-GL frame
// rate does not blur the proof). Still mode (?still): full-page shots. Prints t, overflow and console errors.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/redesign-1/';
const only = process.argv[2]; // optional: "1440" or "390"
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = browsers.find((p) => existsSync(p));
const out = 'shots/v2/redesign-1-dusk';
const DSF = 2; // THEME.md clarity: always judge at retina density
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath, headless: true, protocolTimeout: 240000,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
/** Scroll so the stop parameter is t (inverse of store.tAt). */
const scrollToT = (page, t) => page.evaluate((t) => {
  const r = window.__assembly.rig.ranges;
  const i = Math.floor(t), u = t - i;
  let y = r[i].top;
  if (u > 0 && r[i + 1]) y = r[i].dwellEnd + (r[i + 1].top - r[i].dwellEnd) * u;
  window.__snap = true;
  window.scrollTo({ top: Math.round(y), behavior: 'instant' });
  return Math.round(y);
}, t);
const info = (page) => page.evaluate(() => ({
  t: +window.__assembly.rig.t.toFixed(3),
  dpr: document.querySelector('.stage canvas')?.width / innerWidth,
  overflow: document.documentElement.scrollWidth > innerWidth,
  h: document.documentElement.scrollHeight,
}));

const plans = {
  1440: { size: [1440, 900], states: [['01-globe', 1], ['02-committees', 3], ['03-dais', 5]] },
  390: { size: [390, 844], states: [] },
};

for (const [key, plan] of Object.entries(plans)) {
  if (only && only !== key) continue;
  const [w, h] = plan.size;
  const tag = `r1@${w}`;
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: DSF, isMobile: w < 500, hasTouch: w < 500 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForSelector('.stage canvas', { timeout: 60000 });
  await wait(6000);
  await page.screenshot({ path: `${out}/${w}-00-first.png` });
  console.log(`${w}-00-first`, JSON.stringify(await info(page)));
  console.log('fonts', JSON.stringify(await page.evaluate(() => ({
    serif: document.fonts.check("600 40px 'Source Serif 4 Variable'"),
    sans: document.fonts.check("400 16px 'Public Sans Variable'"),
    mono: document.fonts.check("500 16px 'IBM Plex Mono'"),
    body: getComputedStyle(document.body).fontFamily,
  }))));
  for (const [name, t] of plan.states) {
    await scrollToT(page, t);
    await wait(2600);
    await page.screenshot({ path: `${out}/${w}-${name}.png` });
    console.log(`${w}-${name}`, JSON.stringify(await info(page)));
  }
  await page.close();

  const still = await browser.newPage();
  watch(still, tag + '?still');
  await still.setViewport({ width: w, height: h, deviceScaleFactor: DSF, isMobile: w < 500, hasTouch: w < 500 });
  await still.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 120000 });
  await still.waitForFunction(() => document.querySelectorAll('.poster').length >= 7, { timeout: 90000 }).catch(() => console.log('posters: timed out'));
  await wait(1500);
  const meta = await still.evaluate(() => ({ posters: document.querySelectorAll('.poster').length, overflow: document.documentElement.scrollWidth > innerWidth, h: document.documentElement.scrollHeight }));
  console.log(`${w}-full-still`, JSON.stringify(meta));
  // Software GL wraps any capture taller than ~8192 device px, so the full page is saved in slices (part 1, 2, ...).
  const slice = Math.floor(7600 / DSF);
  for (let y = 0, k = 1; y < meta.h; y += slice, k++) {
    await still.screenshot({ path: `${out}/${w}-full-still-${k}.png`, clip: { x: 0, y, width: w, height: Math.min(slice, meta.h - y) }, captureBeyondViewport: true });
  }
  await still.close();
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
