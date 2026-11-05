// Screenshots and checks for Alt 1 · Terminal Paper. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/alt-1/shots.mjs"
// 1440: the opening at two moments (counter ≥ 030 and ≥ 080), the first screen, scroll states through the flight,
// the clauses, the committee wall and the schedule, then a full page with ?still. 390: first screen, menu, full page.
// deviceScaleFactor 2 with an sRGB colour profile (clarity checklist). Prints overflow and console errors.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/alt-1/';
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = browsers.find((p) => existsSync(p));
const out = 'shots/v2/alt-1';
mkdirSync(out, { recursive: true });
const only = process.argv[2]; // optional: "1440" or "390"
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath, headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const scrollTo = async (page, y) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await wait(250);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
};
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const state = (page) => page.evaluate(() => ({
  y: Math.round(scrollY),
  read: document.querySelector('.stage-read')?.textContent?.trim() || '-',
  callouts: [...document.querySelectorAll('.callout')].filter((c) => getComputedStyle(c).visibility === 'visible').length,
  clause: document.querySelector('.clause.is-on .clause-no')?.textContent ?? '-',
  inked: document.querySelectorAll('.clause.is-on .ch.on').length + '/' + document.querySelectorAll('.clause.is-on .ch').length,
  plates: [...document.querySelectorAll('.plate')].filter((p) => p.classList.contains('is-set')).length,
  slot: document.querySelector('.sch-slot.is-now')?.textContent ?? '-',
}));
const secTop = (page, sel, f) => page.evaluate((s, f) => {
  const el = document.querySelector(s);
  const top = el.getBoundingClientRect().top + scrollY;
  return Math.round(top + (el.offsetHeight - innerHeight) * f);
}, sel, f);

for (const [w, h] of [[1440, 900], [390, 844]]) {
  if (only && String(w) !== only) continue;
  const tag = `alt-1@${w}`;
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const count = (n) => page.waitForFunction((n) => +(document.querySelector('.ld-count-num')?.textContent ?? 0) >= n, { timeout: 15000, polling: 16 }, n);
  if (w === 1440) {
    await count(30);
    await page.screenshot({ path: `${out}/${w}-00-loader-a.png` });
    console.log(tag, 'loader a', await page.evaluate(() => document.querySelector('.ld-count-num')?.textContent + ' "' + document.querySelector('.ld-word-text')?.textContent + '"'));
    await count(82);
    await page.screenshot({ path: `${out}/${w}-01-loader-b.png` });
    console.log(tag, 'loader b', await page.evaluate(() => document.querySelector('.ld-count-num')?.textContent + ' "' + document.querySelector('.ld-word-text')?.textContent + '"'));
  }
  await page.waitForFunction(() => !document.querySelector('.loader'), { timeout: 15000 });
  await wait(1600);
  await page.screenshot({ path: `${out}/${w}-02-first.png` });
  const ov = [await overflow(page)];

  if (w === 1440) {
    const stops = [
      ['10-flight-turn', '#flight', 0.15],
      ['11-flight-landed', '#flight', 0.98],
      ['12-clause-03', '#about', 0.5],
      ['13-committees-flood', '#committees', 0.32],
      ['14-committees-set', '#committees', 0.98],
      ['15-schedule-day2', '#schedule', 0.5],
    ];
    for (const [name, sel, f] of stops) {
      // The flight runway is driven from the page top: hero + runway.
      const y = sel === '#flight'
        ? await page.evaluate((f) => { const el = document.getElementById('flight'); return Math.round((el.offsetTop + el.offsetHeight - innerHeight) * f); }, f)
        : await secTop(page, sel, f);
      await scrollTo(page, y);
      await wait(1500);
      await page.screenshot({ path: `${out}/${w}-${name}.png` });
      console.log(tag, name, JSON.stringify(await state(page)));
      ov.push(await overflow(page));
    }
    await scrollTo(page, await secTop(page, '#register', 0));
    await wait(1200);
    await page.screenshot({ path: `${out}/${w}-16-register.png` });
    ov.push(await overflow(page));
  } else {
    await page.click('.menu-pill');
    await wait(1000);
    await page.screenshot({ path: `${out}/${w}-03-menu.png` });
    await page.keyboard.press('Escape');
    await wait(800);
    for (const [name, sel, f] of [['10-flight-landed', '#flight', 0.98], ['11-clause-02', '#about', 0.3]]) {
      const y = sel === '#flight'
        ? await page.evaluate((f) => { const el = document.getElementById('flight'); return Math.round((el.offsetTop + el.offsetHeight - innerHeight) * f); }, f)
        : await secTop(page, sel, f);
      await scrollTo(page, y);
      await wait(1500);
      await page.screenshot({ path: `${out}/${w}-${name}.png` });
      console.log(tag, name, JSON.stringify(await state(page)));
      ov.push(await overflow(page));
    }
  }
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.close();

  const still = await browser.newPage();
  watch(still, tag + '(still)');
  await still.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await still.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(1500);
  ov.push(await overflow(still));
  // Headless Chrome tiles a capture taller than 8192 device px (it repeats the top of the page), so at
  // deviceScaleFactor 2 the full page is saved in slices of at most 4000 CSS px, plus one 1x overview.
  const stillH = await still.evaluate(() => document.documentElement.scrollHeight);
  const SLICE = 4000;
  for (let i = 0, y = 0; y < stillH; i++, y += SLICE) {
    await still.screenshot({
      path: `${out}/${w}-90-full-still-${'abcdefgh'[i]}.png`,
      clip: { x: 0, y, width: w, height: Math.min(SLICE, stillH - y) }, captureBeyondViewport: true,
    });
  }
  await still.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await wait(600);
  await still.screenshot({ path: `${out}/${w}-91-full-still-1x.png`, fullPage: true });
  await still.close();
  console.log(`${tag}: overflow=${ov.join(',')} height=${height}px (${(height / h).toFixed(1)} screens), still height=${stillH}px`);
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
