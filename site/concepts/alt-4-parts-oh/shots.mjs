// Screenshots and checks for the Alt 4 opening + hero options B and C. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/alt-4-parts-oh/shots.mjs"
// Openings: the timeline is held (window.__OH_HOLD set before load) and seeked to 3 moments; then one real-time
// run per opening checks that onDone fires and how long it took. Heroes: the settled frame, one interaction frame,
// and ?still. Sizes 1440x900 (DPR 1) and 390x844 (DPR 2, touch). Prints overflow and every console error.
// ONLY=opening-b,hero-c limits the parts.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const base = 'http://127.0.0.1:5320/concepts/alt-4-parts-oh/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/r4/parts-oh';
mkdirSync(out, { recursive: true });
const only = process.env.ONLY?.split(',');
const want = (p) => !only || only.includes(p);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const args = ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'];
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const until = async (page, fn, ms = 20000) => {
  const t = Date.now();
  while (Date.now() - t < ms) { if (await page.evaluate(fn)) return true; await wait(100); }
  return false;
};
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
const browser = await puppeteer.launch({ executablePath, headless: true, args, protocolTimeout: 60000 });
const sizes = [
  { tag: '1440', vp: { width: 1440, height: 900, deviceScaleFactor: 1 } },
  { tag: '390', vp: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
];

const held = async (vp, tag, url) => {
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport(vp);
  await page.evaluateOnNewDocument(() => { window.__OH_HOLD = true; });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  return page;
};

for (const { tag, vp } of sizes) {
  /* ---------------------------------------------------------------- openings, held and seeked */
  const frames = {
    'opening-b': [[1150, 'a-calling'], [2950, 'b-fast'], [3440, 'c-slam']],
    'opening-c': [[1500, 'a-count'], [3080, 'b-adopted'], [3620, 'c-shatter']],
  };
  for (const [part, list] of Object.entries(frames)) {
    if (!want(part)) continue;
    const page = await held(vp, `${part}@${tag}`, `${base}?show=${part}`);
    const ok = await until(page, () => document.documentElement.dataset.ohReady === '1', 30000);
    if (!ok) console.log(part, tag, 'never became ready');
    if (part === 'opening-c') await page.evaluate(() => { window.__ohSeek(1300); window.__ohVote(1); });
    for (const [ms, name] of list) {
      await page.evaluate((t) => { window.__ohSeek(t); }, ms);
      await wait(250);
      await page.screenshot({ path: `${out}/${tag}-${part}-${name}.png` });
      console.log(`${part}@${tag}`, name, `t=${ms}`, 'overflow', await overflow(page),
        JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.openingb-count, .openingb-now, .openingc-hint')].map((e) => e.textContent))));
    }
    await page.close();
  }
  /* ---------------------------------------------------------------- openings, real time: does onDone fire? */
  for (const part of ['opening-b', 'opening-c']) {
    if (!want(part)) continue;
    const page = await browser.newPage();
    watch(page, `${part}-live@${tag}`);
    await page.setViewport(vp);
    await page.goto(`${base}?show=${part}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const t = Date.now();
    const done = await until(page, () => document.documentElement.dataset.ohDone === '1', 15000);
    console.log(`${part}-live@${tag}`, 'onDone fired:', done, 'after', Date.now() - t, 'ms (from DOMContentLoaded, incl. font load)');
    // Skip works and still calls onDone at once.
    await page.goto(`${base}?show=${part}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await until(page, () => !!document.querySelector('.openingb-btn, .openingc-small'), 10000);
    await wait(400);
    await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Skip')?.click(); });
    console.log(`${part}-skip@${tag}`, 'done after Skip:', await until(page, () => document.documentElement.dataset.ohDone === '1', 3000));
    await page.goto(`${base}?show=${part}&still`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    console.log(`${part}-still@${tag}`, 'done at once under ?still:', await until(page, () => document.documentElement.dataset.ohDone === '1', 3000));
    if (tag === '1440') await page.screenshot({ path: `${out}/${tag}-${part}-z-still-done.png` });
    await page.close();
  }

  /* ---------------------------------------------------------------- hero B: held light positions */
  if (want('hero-b')) {
    const page = await held(vp, `hero-b@${tag}`, `${base}?show=hero-b`);
    await until(page, () => typeof window.__ohLight === 'function', 20000);
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await wait(600);
    const W = vp.width, H = vp.height;
    const shotsB = [
      [400, [W * 0.5, H * 0.06], 'a-banks'],
      [5000, [W * 0.18, H * 0.2], 'b-settled'],
      [5000, [W * 0.86, H * 0.2], 'c-light-right'],
      [5000, [W * 0.52, H * 0.5], 'd-light-centre'],
    ];
    for (const [t, [x, y], name] of shotsB) {
      await page.evaluate((ms, lx, ly) => { window.__ohSeek(ms); window.__ohLight(lx, ly); }, t, x, y);
      await wait(250);
      await page.screenshot({ path: `${out}/${tag}-hero-b-${name}.png` });
      console.log(`hero-b@${tag}`, name, 'overflow', await overflow(page), 'readout', await page.evaluate(() => document.querySelector('.herob-read')?.textContent));
    }
    await page.close();
  }

  /* ---------------------------------------------------------------- hero C: real time (DOM springs) */
  if (want('hero-c')) {
    const page = await browser.newPage();
    watch(page, `hero-c@${tag}`);
    await page.setViewport(vp);
    await page.goto(`${base}?show=hero-c`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await until(page, () => document.documentElement.dataset.ohRevealed === '1', 20000);
    await wait(500);
    await page.screenshot({ path: `${out}/${tag}-hero-c-a-raise.png` });
    await wait(2600);
    await page.screenshot({ path: `${out}/${tag}-hero-c-b-settled.png` });
    console.log(`hero-c@${tag}`, 'settled overflow', await overflow(page));
    const box = await page.evaluate(() => { const r = document.querySelectorAll('.heroc-card')[12].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (tag === '1440') { await page.mouse.move(box.x - 200, box.y - 100); await wait(200); await page.mouse.move(box.x, box.y, { steps: 6 }); }
    else await page.touchscreen.tap(box.x, box.y);
    await wait(1400);
    await page.screenshot({ path: `${out}/${tag}-hero-c-c-peek.png` });
    await page.evaluate(() => window.scrollTo(0, innerHeight * 0.42));
    await wait(1600);
    await page.screenshot({ path: `${out}/${tag}-hero-c-d-scroll.png` });
    await page.close();
  }

  /* ---------------------------------------------------------------- heroes, ?still */
  for (const part of ['hero-b', 'hero-c']) {
    if (!want(part)) continue;
    const page = await browser.newPage();
    watch(page, `${part}-still@${tag}`);
    await page.setViewport(vp);
    await page.goto(`${base}?show=${part}&still`, { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(1200);
    await page.screenshot({ path: `${out}/${tag}-${part}-z-still.png` });
    console.log(`${part}-still@${tag}`, 'overflow', await overflow(page));
    await page.close();
  }
}
await browser.close();
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
