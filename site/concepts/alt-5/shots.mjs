// Screenshots and checks for Alt 5 · Motion. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/alt-5/shots.mjs"
// 1440×900 and 390×844 (DPR 1): the loader at four moments (seeked), the hero settled, the hero under the cursor,
// a fast scroll, a nav scroll caught mid-way, every section reached from the nav, a section boundary,
// committee hover, Day 2, a wellness toggle, the phone menu, and the ?still page full length.
// Prints overflow (with the offending elements) and every console error.
// ONLY=1440 or ONLY=390 or ONLY=still runs one part.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/alt-5/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/r3/alt-5';
mkdirSync(out, { recursive: true });
const only = process.env.ONLY;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const poll = async (page, fn, arg, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn, arg)) return true;
    await wait(150);
  }
  console.log('  (poll timed out)');
  return false;
};
const check = (page) => page.evaluate(() => {
  const W = innerWidth;
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.cm-marquee, .wipe, .stairs, .sr, .loader')) continue;
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > W + 1 || r.left < -1) && r.bottom > 0 && r.top < innerHeight) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.left)}→${Math.round(r.right)}`);
  }
  return {
    y: Math.round(scrollY),
    active: document.querySelector('.nav-items a[aria-current="true"]')?.textContent ?? '-',
    tally: document.querySelector('.t-votes')?.textContent,
    scrollW: document.documentElement.scrollWidth > W,
    offscreen: bad.slice(0, 6),
  };
});
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const log = async (page, tag, what) => console.log(tag, what, JSON.stringify(await check(page)));

const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 60000, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });

async function loaderFrames(page, tag, prefix, times) {
  await page.evaluateOnNewDocument(() => { window.__alt5Pause = true; });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await poll(page, () => !!window.__alt5Loader);
  for (const [i, t] of times.entries()) {
    await page.evaluate((s) => { window.__alt5Loader.seek(s, false); }, t);
    await wait(350);
    await shot(page, `${prefix}-0${i}-loader-${String(t).replace('.', '_')}s`);
    console.log(tag, 'loader', t, await page.evaluate(() => ({ ld: document.documentElement.dataset.ld, text: document.querySelector('.ld-lines')?.textContent })));
  }
  await page.evaluate(() => { window.__alt5Loader.play(); });
  await poll(page, () => document.documentElement.dataset.ld === 'done');
}

async function viaNav(page, id, phone) {
  if (phone) {
    await page.click('.nav .menu-btn');
    await wait(700);
    await page.click(`.menu-items a[href="#${id}"]`);
    await wait(600);
  } else {
    await page.click(`.nav-items a[href="#${id}"]`);
  }
  await wait(1700);
}

/* ------------------------------------------------------------------ 1440 */
if (!only || only === '1440') {
  const tag = '1440';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await loaderFrames(page, tag, '1440', [0.3, 0.9, 1.4, 1.72, 2.4]);
  await wait(1400);
  await shot(page, '1440-10-hero');
  await log(page, tag, 'hero');
  // cursor over the hero type
  await page.mouse.move(380, 260);
  await wait(300);
  await page.mouse.move(420, 250, { steps: 6 });
  await wait(900);
  await shot(page, '1440-11-hero-cursor');
  // fast scroll: capture mid-motion
  await page.mouse.move(1300, 800);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: 260 }); await wait(30); }
  await wait(120);
  await shot(page, '1440-12-fast-scroll');
  await log(page, tag, 'fast scroll');
  await wait(1500);
  await shot(page, '1440-13-after-scroll');
  // a section boundary: About → Committees
  const y = await page.evaluate(() => document.getElementById('committees').getBoundingClientRect().top + scrollY - innerHeight * 0.62);
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await wait(1500);
  await shot(page, '1440-14-boundary');
  // a nav click scrolls (Lenis): catch it mid-way
  await page.click('.nav-items a[href="#schedule"]');
  await wait(450);
  await shot(page, '1440-15-nav-scroll-mid');
  await wait(1600);
  const ids = ['about', 'committees', 'schedule', 'register', 'wellness', 'resources', 'contact'];
  for (const [i, id] of ids.entries()) {
    await viaNav(page, id, false);
    await page.mouse.move(-40, -40);
    await wait(500);
    await shot(page, `1440-2${i}-${id}`);
    await log(page, tag, id);
  }
  // committees: hover a marquee item
  await viaNav(page, 'committees', false);
  const items = await page.$$('.cm-set:first-child .cm-item');
  let hovered = false;
  for (const it of items) {
    const b = await it.boundingBox();
    if (b && b.x > 100 && b.x + b.width < 1300) { await it.hover(); hovered = true; break; }
  }
  await wait(1300);
  await shot(page, '1440-30-committee-hover');
  console.log(tag, 'hovered', hovered, await page.evaluate(() => document.querySelector('.cm-name')?.textContent));
  // schedule: day 2
  await page.mouse.move(-40, -40);
  await viaNav(page, 'schedule', false);
  await page.click('.sched .tab:nth-child(2)');
  await page.mouse.move(-40, -40);
  await wait(1400);
  await shot(page, '1440-31-schedule-day2');
  // wellness: tick Water
  await viaNav(page, 'wellness', false);
  await page.click('.well .tab');
  await page.mouse.move(-40, -40);
  await wait(1200);
  await shot(page, '1440-32-wellness-water');
  console.log(tag, 'wellness', await page.evaluate(() => document.querySelector('.wl-status')?.textContent));
  // the very end: footer
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await wait(1800);
  await shot(page, '1440-33-end');
  await log(page, tag, 'end');
  await page.close();
}

/* ------------------------------------------------------------------ 390 */
if (!only || only === '390') {
  const tag = '390';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await loaderFrames(page, tag, '390', [0.3, 0.9, 1.72, 2.4]);
  await wait(1400);
  await shot(page, '390-10-hero');
  await log(page, tag, 'hero');
  await page.click('.nav .menu-btn');
  await wait(1100);
  await shot(page, '390-11-menu');
  await page.click('.menu-btn');
  await wait(700);
  const ids = ['about', 'committees', 'schedule', 'register', 'wellness', 'resources', 'contact'];
  for (const [i, id] of ids.entries()) {
    await viaNav(page, id, true);
    await shot(page, `390-2${i}-${id}`);
    await log(page, tag, id);
  }
  // further down inside committees and schedule
  for (const id of ['committees', 'schedule']) {
    const y = await page.evaluate((s) => document.getElementById(s).getBoundingClientRect().top + scrollY + innerHeight * 0.75, id);
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await wait(900);
    await shot(page, `390-3x-${id}-lower`);
    await log(page, tag, id + ' lower');
  }
  await page.close();
}

/* ------------------------------------------------------------------ ?still */
if (!only || only === 'still') {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage();
    watch(page, `still@${w}`);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(1200);
    await page.screenshot({ path: `${out}/${w}-90-still-full.png`, fullPage: true });
    console.log(`still@${w}`, 'height', await page.evaluate(() => document.documentElement.scrollHeight), JSON.stringify(await check(page)));
    await page.close();
  }
}
await browser.close();
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
