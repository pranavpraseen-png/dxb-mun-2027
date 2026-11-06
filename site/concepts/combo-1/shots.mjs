// Screenshots and checks for Combo 1 · Order + Dispatch. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/combo-1/shots.mjs"
// 1440×900 and 390×844: the loader at three moments (seeked), the hard cut (first frames after it), the hero with the
// lens under a parked cursor / finger, the title swell, every section reached from the nav (phone: from the menu),
// committee hover, Day 2, the menu, the end; then ?still full length and the no-WebGL hero at both sizes.
// WebGL runs on SwiftShader. Prints overflow (with the offending elements) and every console error.
// ONLY=1440 | 390 | still | nogl runs one part.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/combo-1/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/r3/combo-1';
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
    if (el.closest('.cm-marquee, .sr, .loader, .field-host')) continue;
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > W + 1 || r.left < -1) && r.bottom > 0 && r.top < innerHeight) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.left)}→${Math.round(r.right)}`);
  }
  return {
    y: Math.round(scrollY),
    active: document.querySelector('.nav-items a[aria-current="true"]')?.textContent ?? '-',
    tally: document.querySelector('.t-votes')?.textContent,
    gl: !!document.querySelector('.field-canvas'),
    scrollW: document.documentElement.scrollWidth > W,
    offscreen: bad.slice(0, 6),
  };
});
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const log = async (page, tag, what) => console.log(tag, what, JSON.stringify(await check(page)));

const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 60000, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

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

async function cutAndHero(page, tag, prefix) {
  // the hard cut: finish the loader and catch the first frames of the hero
  await page.evaluate(() => { window.__alt5Loader.progress(1); });
  await poll(page, () => document.documentElement.dataset.ld === 'done' && !document.querySelector('.loader'));
  await wait(60);
  await shot(page, `${prefix}-03-hard-cut`);
  await wait(1600);
  await shot(page, `${prefix}-10-hero`);
  await log(page, tag, 'hero');
}

/* ------------------------------------------------------------------ 1440 */
if (!only || only === '1440') {
  const tag = '1440';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await loaderFrames(page, tag, '1440', [0.9, 1.4, 1.72]);
  await cutAndHero(page, tag, '1440');
  // the lens under a cursor resting on the right of the field
  await page.mouse.move(700, 420);
  await page.mouse.move(930, 400, { steps: 12 });
  await wait(1500);
  await shot(page, '1440-11-hero-lens');
  console.log(tag, 'lens', await page.evaluate(() => document.querySelector('.hero-readout')?.textContent));
  // the title swell: pointer over "DXB MUN"
  const tb = await page.evaluate(() => { const r = document.querySelector('.hero-title .kl').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.move(tb.x + tb.w * 0.3, tb.y + tb.h * 0.5, { steps: 8 });
  await wait(1200);
  await shot(page, '1440-12-title-swell');
  await page.mouse.move(-40, -40);
  await wait(500);
  // a nav click scrolls (Lenis): catch it mid-way
  await page.click('.nav-items a[href="#about"]');
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
  await page.mouse.move(-40, -40);
  await viaNav(page, 'schedule', false);
  await page.click('.sched .tab:nth-child(2)');
  await page.mouse.move(-40, -40);
  await wait(1400);
  await shot(page, '1440-31-schedule-day2');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await wait(1800);
  await shot(page, '1440-33-end');
  await log(page, tag, 'end');
  // back to the top through the logo: the field is still running
  await page.click('.nav .logo');
  await wait(2400);
  await shot(page, '1440-34-back-to-top');
  await log(page, tag, 'top');
  await page.close();
}

/* ------------------------------------------------------------------ 390 */
if (!only || only === '390') {
  const tag = '390';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await loaderFrames(page, tag, '390', [0.9, 1.4, 1.72]);
  await cutAndHero(page, tag, '390');
  // a finger on the field: the lens follows it
  await page.touchscreen.tap(250, 330);
  await wait(1300);
  await shot(page, '390-11-hero-finger');
  await page.click('.nav .menu-btn');
  await wait(1100);
  await shot(page, '390-12-menu');
  await log(page, tag, 'menu');
  await page.click('.menu .menu-btn');
  await wait(700);
  const ids = ['about', 'committees', 'schedule', 'register', 'wellness', 'resources', 'contact'];
  for (const [i, id] of ids.entries()) {
    await viaNav(page, id, true);
    await shot(page, `390-2${i}-${id}`);
    await log(page, tag, id);
  }
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
    await wait(1500);
    await shot(page, `${w}-80-still-hero`);
    await page.screenshot({ path: `${out}/${w}-90-still-full.png`, fullPage: true });
    console.log(`still@${w}`, 'height', await page.evaluate(() => document.documentElement.scrollHeight), JSON.stringify(await check(page)));
    await page.close();
  }
}

/* ------------------------------------------------------------------ no WebGL */
if (!only || only === 'nogl') {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage();
    watch(page, `nogl@${w}`);
    await page.evaluateOnNewDocument(() => {
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, opts) { return type === 'webgl2' || type === 'webgl' ? null : g.call(this, type, opts); };
    });
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.keyboard.press('Escape');
    await poll(page, () => !document.querySelector('.loader'));
    await wait(2000);
    await shot(page, `${w}-85-nogl-hero`);
    console.log(`nogl@${w}`, JSON.stringify(await check(page)), await page.evaluate(() => document.documentElement.className));
    await page.close();
  }
}
/* ------------------------------------------------------------------ in-between widths: the nav must fit */
if (!only || only === 'widths') {
  const page = await browser.newPage();
  watch(page, 'widths');
  for (const w of [1100, 1180, 1280, 800]) {
    await page.setViewport({ width: w, height: 800, deviceScaleFactor: 1 });
    await page.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(900);
    const r = await page.evaluate(() => {
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? [Math.round(b.left), Math.round(b.right)] : null; };
      return { logo: box('.nav .logo'), items: box('.nav-items'), reg: box('.nav-reg'), menu: box('.nav .menu-btn'), W: innerWidth, overflowX: document.documentElement.scrollWidth > innerWidth };
    });
    console.log('width', w, JSON.stringify(r));
    await shot(page, `w${w}-hero-still`);
  }
  await page.close();
}

await browser.close();
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');

