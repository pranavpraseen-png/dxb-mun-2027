// Screenshots and checks for Alt 2 · Poster. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/alt-2/shots.mjs"
// 1440: the loader at two moments, the first screen, four scroll states (flight mid-dive, landed on Dubai,
// a clause filling, the schedule playhead), and the full page in still mode. 390: first screen and full page.
// Prints overflow, console errors and a small state fingerprint for every shot.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/alt-2/';
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = browsers.find((p) => existsSync(p));
const out = 'shots/v2/alt-2';
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const only = process.argv[2]; // optional: "desk" | "phone" | "still"

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
// A phone layout viewport silently widens when content is too wide, so compare with the requested width too.
const overflow = (page) => page.evaluate((w) => {
  const over = document.documentElement.scrollWidth > innerWidth || innerWidth > w;
  if (!over) return false;
  const wide = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > w + 1).slice(0, 5).map((el) => el.className || el.tagName);
  return `${document.documentElement.scrollWidth}px (layout ${innerWidth}px): ${wide.join(', ')}`;
}, page.viewport().width);
const scrollTo = async (page, y) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await wait(150);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
};
const state = (page) => page.evaluate(() => ({
  y: Math.round(scrollY),
  flying: !!document.querySelector('.stage.is-flying'),
  callouts: !!document.querySelector('.callouts.on'),
  zoom: document.querySelector('.xl-zoom span')?.textContent,
  clause: document.querySelector('.cl.is-on .cl-kind')?.textContent,
  filled: (() => { const c = document.querySelector('.cl.is-on'); return c ? `${c.querySelectorAll('.u.on').length}/${c.querySelectorAll('.u').length}` : '-'; })(),
  playhead: document.querySelector('.playhead .k')?.textContent,
  live: [...document.querySelectorAll('.slot.is-live b')].map((b) => b.textContent).join(' | '),
  stub: document.querySelector('.stub-live')?.textContent,
}));
const top = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el.getBoundingClientRect().top + scrollY; }, sel);
const len = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el.offsetHeight - innerHeight; }, sel);

// Nameplate check: every code in a row shares one baseline, and no full name is cut off by its tile.
const tileCheck = (page) => page.evaluate(() => {
  const rows = new Map();
  let cut = [];
  for (const t of document.querySelectorAll('.tile')) {
    const code = t.querySelector('.tile-code').getBoundingClientRect();
    const name = t.querySelector('.tile-name');
    const mask = t.querySelector('.tile-mask').getBoundingClientRect();
    const key = Math.round(t.getBoundingClientRect().top);
    (rows.get(key) ?? rows.set(key, []).get(key)).push(Math.round(code.bottom * 10) / 10);
    const nb = name.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(t.querySelector('.tile-mask')).paddingBottom);
    if (name.scrollHeight > name.clientHeight + 1 || nb.top + name.scrollHeight > mask.bottom - pad + 1) cut.push(t.querySelector('.tile-code').textContent);
  }
  const spread = [...rows.values()].map((v) => Math.max(...v) - Math.min(...v));
  return `code-baseline spread per row: [${spread.join(', ')}] px · names cut: ${cut.length ? cut.join(', ') : 'none'}`;
});

if (only === 'tiles') {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const tag = `alt2@${w} tiles`;
    const page = await browser.newPage();
    watch(page, tag);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await page.goto(url + '#committees', { waitUntil: 'networkidle2', timeout: 90000 }); // a hash skips the loader
    await page.evaluate(() => document.fonts.ready);
    const cmTop = await top(page, '#committees');
    if (w > 500) {
      await scrollTo(page, cmTop - 300);
      await wait(1800);
      await page.screenshot({ path: `${out}/1440-07-committees-building.png` });
      console.log(tag, 'building', JSON.stringify(await state(page)));
    }
    await scrollTo(page, cmTop + (w < 500 ? 332 : 330));
    await wait(2200);
    console.log(tag, await tileCheck(page), 'overflow', await overflow(page));
    if (w > 500) {
      const tile = await page.$('.tiles li:nth-child(9) .tile'); // DISEC: the long-name row from the report
      const box = await tile.boundingBox();
      await page.mouse.move(box.x + 40, box.y + 40);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
      await wait(900);
      await page.evaluate(() => window.scrollBy(0, 0));
      await page.screenshot({ path: `${out}/1440-09-tile-hover-view.png` });
      console.log(tag, 'hover', await page.evaluate(() => document.querySelector('.cursor')?.dataset.state));
    } else {
      await page.screenshot({ path: `${out}/390-03-committees.png` });
    }
    // the scrubbed build may still be moving the lower rows, so the strict check runs on the still page
    await page.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
    await page.evaluate(() => document.fonts.ready);
    await wait(800);
    console.log(tag, 'still:', await tileCheck(page));
    await page.close();
  }
}

if (!only || only === 'desk') {
  const tag = 'alt2@1440';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__alt2Loader, { timeout: 30000 });
  const since = () => page.evaluate(() => performance.now() - window.__alt2Loader.start);
  for (const [name, at] of [['loader-a-build', 900], ['loader-b-scramble', 1900]]) {
    const t = await since();
    if (t < at) await wait(at - t);
    await page.screenshot({ path: `${out}/1440-0${name === 'loader-a-build' ? 1 : 2}-${name}.png` });
    console.log(tag, name, `at ~${Math.round(await since())}ms`);
  }
  await page.waitForFunction(() => !document.querySelector('.loader'), { timeout: 15000 });
  await wait(1800);
  await page.screenshot({ path: `${out}/1440-03-first.png` });
  console.log(tag, 'first', JSON.stringify(await state(page)), 'overflow', await overflow(page));

  const fTop = await top(page, '#home'), fLen = await len(page, '#home');
  await scrollTo(page, fTop + fLen * 0.42);
  await wait(1800);
  await page.screenshot({ path: `${out}/1440-04-flight-dive.png` });
  console.log(tag, 'flight 0.42', JSON.stringify(await state(page)));

  await scrollTo(page, fTop + fLen * 0.98);
  await wait(2000);
  await page.screenshot({ path: `${out}/1440-05-flight-landed.png` });
  console.log(tag, 'flight 0.98', JSON.stringify(await state(page)));

  const cTop = await top(page, '#about'), cLen = await len(page, '#about');
  await scrollTo(page, cTop + cLen * (2.3 / 5));
  await wait(2000);
  await page.screenshot({ path: `${out}/1440-06-clause-filling.png` });
  console.log(tag, 'clause 3 filling', JSON.stringify(await state(page)));

  const cmTop = await top(page, '#committees');
  await scrollTo(page, cmTop - 300);
  await wait(1800);
  await page.screenshot({ path: `${out}/1440-07-committees-building.png` });
  console.log(tag, 'committees building', JSON.stringify(await state(page)));

  const sTop = await top(page, '#schedule'), sLen = await len(page, '#schedule');
  await scrollTo(page, sTop + sLen * 0.55);
  await wait(1800);
  await page.screenshot({ path: `${out}/1440-08-schedule-playhead.png` });
  console.log(tag, 'schedule 0.55', JSON.stringify(await state(page)), 'overflow', await overflow(page));

  // hover a nameplate: the cursor grows into the VIEW disc
  await scrollTo(page, cmTop - 48);
  await wait(1800);
  const tile = await page.$('.tile');
  const box = await tile.boundingBox();
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
  await wait(900);
  await page.screenshot({ path: `${out}/1440-09-tile-hover-view.png` });
  console.log(tag, 'hover', await page.evaluate(() => document.querySelector('.cursor')?.dataset.state));
  await page.close();
}

if (!only || only === 'still') {
  const tag = 'alt2@1440 still';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await wait(1500);
  console.log(tag, 'height', await page.evaluate(() => document.documentElement.scrollHeight), 'overflow', await overflow(page));
  await page.screenshot({ path: `${out}/1440-10-full-still.png`, fullPage: true });
  await page.close();
}

if (!only || only === 'phone') {
  const tag = 'alt2@390';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => !document.querySelector('.loader') && document.body.classList.contains('is-revealed'), { timeout: 20000 });
  await wait(1800);
  await page.screenshot({ path: `${out}/390-01-first.png` });
  console.log(tag, 'first', JSON.stringify(await state(page)), 'overflow', await overflow(page));
  await page.close();

  const p2 = await browser.newPage();
  watch(p2, tag + ' still');
  await p2.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p2.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
  await p2.evaluate(() => document.fonts.ready);
  await wait(1500);
  console.log(tag, 'still height', await p2.evaluate(() => document.documentElement.scrollHeight), 'overflow', await overflow(p2));
  await p2.screenshot({ path: `${out}/390-02-full-still.png`, fullPage: true });
  await p2.close();
}

console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
