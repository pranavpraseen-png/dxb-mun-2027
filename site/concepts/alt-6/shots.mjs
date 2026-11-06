// Screenshots and checks for Alt 6 · Dispatch. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/alt-6/shots.mjs"
// 1440×900: the opening at four moments (printing, printed, flood, resolve; the timeline is held and seeked), the hero
// settled, the lens under a parked cursor and mid-drag, every cable reached through the nav, a committee file opened,
// schedule day 2, a wellness check, a 2× crop of the dither. 390×844 (DPR 2, touch): the opening, the hero, a finger drag,
// the menu, cables. Then ?still (both sizes, full page) and no WebGL. Prints overflow and console errors.
// ONLY=desk|phone|calm limits the run.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/alt-6/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/r3/alt-6';
mkdirSync(out, { recursive: true });
const ONLY = process.env.ONLY;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const args = ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const poll = async (page, fn, arg, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn, arg).catch(() => false)) return true;
    await wait(250);
  }
  throw new Error('poll timed out: ' + fn.toString().slice(0, 80));
};
const info = (page) => page.evaluate(() => ({
  phase: document.documentElement.dataset.phase,
  y: Math.round(scrollY),
  active: document.querySelector('.nav-list a.is-active, .menu-list a.is-active')?.textContent?.trim() ?? null,
  overflowX: document.documentElement.scrollWidth > innerWidth,
}));
const shot = (page, name, opts = {}) => page.screenshot({ path: `${out}/${name}.png`, ...opts });
const hold = (page) => page.evaluateOnNewDocument(() => { window.__hold = true; });
const labels = (page) => page.evaluate(() => {
  const tl = window.__dispatch.tl;
  return { flood: tl.labels.flood, resolve: tl.labels.resolve, hero: tl.labels.hero, total: tl.duration() };
});
const seek = (page, t) => page.evaluate((s) => { window.__dispatch.tl.seek(s, false); }, t);
const finish = (page) => page.evaluate(() => { window.__dispatch.tl.progress(1, false); });

async function opening(page, tag, prefix) {
  await poll(page, () => document.documentElement.dataset.phase === 'wait' && !!window.__dispatch?.tl);
  await wait(400);
  const L = await labels(page);
  console.log(tag, 'timeline', JSON.stringify(L));
  const moments = [['print', L.flood * 0.45], ['printed', L.flood - 0.2], ['flood', L.flood + 0.55], ['resolve', L.resolve + 0.4]];
  for (const [i, [name, t]] of moments.entries()) {
    await seek(page, t);
    await wait(900);
    await shot(page, `${prefix}-0${i}-opening-${name}`);
    console.log(tag, 'opening', name, t.toFixed(2), JSON.stringify(await info(page)));
  }
  await finish(page);
  await wait(2600);
}

const cables = ['about', 'committees', 'schedule', 'register', 'wellness', 'resources', 'contact'];
const browser = await puppeteer.launch({ executablePath, headless: true, args, protocolTimeout: 60000 });

/* ------------------------------------------------------------------ 1440 */
if (!ONLY || ONLY === 'desk') {
  const tag = 'alt-6@1440';
  const page = await browser.newPage();
  watch(page, tag);
  await hold(page);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await opening(page, tag, '1440');
  await shot(page, '1440-10-hero-settled');
  console.log(tag, 'hero', JSON.stringify(await info(page)));
  // park the cursor: the lens settles under it
  await page.mouse.move(980, 430);
  await wait(1500);
  await shot(page, '1440-11-hero-lens-cursor');
  // a fast drag: the trail stretches behind the head
  await page.mouse.move(1260, 240); await wait(1500);
  for (let i = 0; i <= 10; i++) { await page.mouse.move(1260 - i * 36, 240 + i * 22); await wait(30); }
  await wait(60);
  await shot(page, '1440-12-hero-lens-trail');
  // 2x crop of the dither: device pixels must be hard squares
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await wait(1500);
  await page.mouse.move(800, 420);
  await wait(1500);
  await shot(page, '1440-13-dither-crop-2x', { clip: { x: 620, y: 260, width: 360, height: 300 } });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await wait(800);
  await page.mouse.move(1430, 890);

  for (const [i, id] of cables.entries()) {
    await page.click(`.nav-list a[href="#${id}"]`);
    await wait(2800);
    await shot(page, `1440-2${i}-cable-0${i + 1}-${id}`);
    console.log(tag, id, JSON.stringify(await info(page)));
    if (id === 'committees') {
      await page.click('.files li:nth-child(9) button');
      await wait(1600);
      await shot(page, '1440-2' + i + 'b-committee-file-09');
      console.log(tag, 'file', await page.evaluate(() => document.querySelector('.of-rows .row:nth-child(2) dd .sr')?.textContent));
    }
    if (id === 'schedule') {
      await page.click('.day:nth-child(2)');
      await wait(1600);
      await shot(page, '1440-2' + i + 'b-schedule-day2');
    }
    if (id === 'wellness') {
      await page.click('.check');
      await wait(500);
      await shot(page, '1440-2' + i + 'b-wellness-checked');
      await page.click('.check'); // leave storage as it was
    }
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await wait(2500);
  await shot(page, '1440-30-end');
  console.log(tag, 'end', JSON.stringify(await info(page)));
  await page.close();
}

/* ------------------------------------------------------------------ 390 */
if (!ONLY || ONLY === 'phone') {
  const tag = 'alt-6@390';
  const page = await browser.newPage();
  watch(page, tag);
  await hold(page);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await opening(page, tag, '390');
  await shot(page, '390-10-hero-settled');
  console.log(tag, 'hero', JSON.stringify(await info(page)));
  await page.touchscreen.touchStart(250, 420);
  for (let i = 0; i < 8; i++) { await page.touchscreen.touchMove(250 - i * 14, 420 + i * 6); await wait(40); }
  await page.touchscreen.touchEnd();
  await wait(120);
  await shot(page, '390-11-hero-finger-drag');
  await page.click('.nav-menu');
  await wait(1400);
  await shot(page, '390-20-menu');
  console.log(tag, 'menu open', await page.evaluate(() => !document.getElementById('menu').hidden));
  await page.click('.menu-list a[href="#committees"]');
  await wait(2600);
  await shot(page, '390-21-committees-by-menu');
  console.log(tag, 'after menu', JSON.stringify(await info(page)));
  for (const id of ['about', 'schedule', 'register', 'wellness', 'contact']) {
    await page.evaluate((s) => { const el = document.getElementById(s); scrollTo(0, el.getBoundingClientRect().top + scrollY - 52); }, id);
    await wait(2400);
    await shot(page, `390-3${cables.indexOf(id) + 1}-cable-${id}`);
    console.log(tag, id, JSON.stringify(await info(page)));
  }
  await page.close();
}

/* ------------------------------------------------------------------ calm page and no WebGL */
if (!ONLY || ONLY === 'calm') {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage();
    watch(page, `still@${w}`);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(1500);
    await shot(page, `${w}-90-still-hero`);
    await page.screenshot({ path: `${out}/${w}-91-still-full.png`, fullPage: true });
    console.log(`still@${w}`, JSON.stringify(await info(page)), 'height', await page.evaluate(() => document.documentElement.scrollHeight));
    await page.close();
  }
}
await browser.close();
if (!ONLY || ONLY === 'calm') {
  const noGl = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-webgl', '--disable-3d-apis'], protocolTimeout: 60000 });
  const page = await noGl.newPage();
  watch(page, 'no-webgl@1440');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(1500);
  await shot(page, '1440-92-no-webgl');
  console.log('no-webgl@1440', await page.evaluate(() => document.documentElement.className), JSON.stringify(await info(page)));
  await noGl.close();
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
