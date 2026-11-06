// Screenshots and checks for Combo 2. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/combo-2/shots.mjs"
// ONLY=desk|phone|calm limits the run. Uses the shared dev server (never its own). DSF 2, sRGB, swiftshader.
// 1440×900: the typed loader at three moments (the boot timeline is paused and seeked), the world building, the hero
// settled with the lens parked over the globe and over the motto layer, the kinetic title under the cursor, mid-flight,
// Dubai, every section, the gentle kinetic words under the cursor. 390×844 (touch): the loader, the hero with the lens,
// Dubai, sections, the menu. Then ?still at both sizes. Prints overflow, console errors and a colour count of the
// dithered canvas (with every DOM layer hidden): it must be 2 or 3 colours (ground, ink, the orange Dubai mark).
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const URL_ = 'http://127.0.0.1:5320/concepts/combo-2/';
const ONLY = process.env.ONLY;
const out = 'shots/r3/combo-2';
mkdirSync(out, { recursive: true });
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath, headless: true, protocolTimeout: 60000,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
const report = [];

const poll = async (page, fn, arg, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn, arg).catch(() => false)) return true;
    await wait(250);
  }
  throw new Error('poll timed out: ' + fn.toString().slice(0, 90));
};
async function open(w, h, { still = false } = {}) {
  const page = await browser.newPage();
  const tag = `${w}${still ? '-still' : ''}`;
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: w < 768, hasTouch: w < 768 });
  await page.goto(URL_ + (still ? '?still' : ''), { waitUntil: 'domcontentloaded', timeout: 60000 });
  return page;
}
// a phone's layout viewport grows to fit wide content, so compare with the device width, not innerWidth
const overflow = (page) => page.evaluate((vw) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - vw, page.viewport().width);
async function shot(page, name, opts = {}) {
  const ov = await overflow(page);
  await page.screenshot({ path: `${out}/${name}.png`, ...opts });
  report.push(`${name}.png  overflow=${ov}px`);
}
async function scrollTo(page, y) {
  await page.evaluate((top) => { window.scrollTo({ top, behavior: 'instant' }); }, Math.round(y));
  await wait(300);
  await page.evaluate((top) => { window.scrollTo({ top, behavior: 'instant' }); }, Math.round(y));
  await wait(1800);
}
const stops = (page) => page.evaluate(() => window.__nl.stops());
const at = (s, f) => s.start + (s.end - s.start) * f;
/** Skip the loader the way a visitor would (any key), then wait for the hero text. */
async function skipLoader(page) {
  await poll(page, () => !!window.__opBoot);
  await wait(300);
  await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' })); });
  await poll(page, () => document.documentElement.dataset.opPhase === '4' && !document.documentElement.classList.contains('nl-boot'));
  await wait(2500);
}
/** Distinct colours in a screen region with every DOM layer hidden (the dithered canvas alone). */
async function canvasColours(page, clip) {
  // full-viewport capture only: a clipped capture resizes the viewport in headless Chrome and re-runs ScrollTrigger
  await page.addStyleTag({ content: '.op-labs,.op-hero,.nav,.cursor,.nl-progress{display:none!important}' }).then((h) => page.evaluate((el) => { el.id = 'c2-hide'; }, h));
  await wait(400);
  const b64 = await page.screenshot({ encoding: 'base64' });
  await page.evaluate(() => { document.getElementById('c2-hide')?.remove(); });
  return page.evaluate(async (src, r) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + src;
    await img.decode();
    const c = document.createElement('canvas');
    const k = img.width / innerWidth;
    c.width = Math.round(r.width * k); c.height = Math.round(r.height * k);
    const x = c.getContext('2d');
    x.drawImage(img, -r.x * k, -r.y * k);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const m = new Map();
    for (let i = 0; i < d.length; i += 4) { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => '#' + k.toString(16).padStart(6, '0') + ' ' + n);
  }, b64, clip);
}

async function loader(w, h, times, prefix) {
  const page = await open(w, h);
  await poll(page, () => !!window.__opBoot);
  await page.evaluate(() => { window.__opBoot.pause(); });
  for (const t of times) {
    await page.evaluate((s) => { window.__opBoot.seek(s, false); }, t);
    await wait(700);
    await shot(page, `${prefix}-loader-${String(t).replace('.', '_')}s`);
  }
  // the world keeps building on its own clock once the word has opened the screen
  await wait(2200);
  await shot(page, `${prefix}-loader-world-building`);
  await page.close();
}

// ------------------------------------------------------------------ 1440
if (!ONLY || ONLY === 'desk') {
  await loader(1440, 900, [0.9, 1.9, 2.9], '1440-00');
  const W = 1440, H = 900;
  const page = await open(W, H);
  await skipLoader(page);
  // lens over the globe, then over the motto layer (parked: the trail settles there)
  await page.evaluate((p) => { window.__c2.park(p[0], p[1]); }, [W * 0.62, H * 0.42]);
  await wait(1500);
  await shot(page, '1440-01-hero-lens-globe');
  report.push('canvas colours (globe + lens): ' + (await canvasColours(page, { x: 560, y: 120, width: 640, height: 480 })).join(', '));
  await page.evaluate((p) => { window.__c2.park(p[0], p[1]); }, [W * 0.5, H * 0.36]);
  await wait(1500);
  await shot(page, '1440-02-hero-lens-motto');
  // the kinetic title under the cursor (the lens follows a real pointer from here)
  const title = await page.evaluate(() => { const r = document.querySelector('.op-k')?.getBoundingClientRect(); return r ? [r.left, r.top, r.width, r.height] : null; });
  if (title) {
    await page.mouse.move(title[0] + 10, title[1] + title[3] / 2);
    await wait(300);
    await page.mouse.move(title[0] + title[2] * 0.3, title[1] + title[3] / 2, { steps: 6 });
    await wait(1400);
    await shot(page, '1440-03-hero-kinetic-title');
  }
  report.push('title box ' + JSON.stringify(title));
  await page.mouse.move(W - 4, H - 4);
  const s = await stops(page);
  report.push('stops ' + JSON.stringify(s));
  for (const [name, y] of [
    ['04-flight-mid', at(s.flight, 0.45)],
    ['05-dubai', at(s.flight, 0.97)],
    ['06-clause-mid-fill', at(s.clauses, 0.27)],
    ['07-committees-forming', at(s.committees, 0.42)],
    ['08-committee-wall', at(s.committees, 1)],
    ['09-schedule-ruler', at(s.schedule, 0.42)],
  ]) {
    await scrollTo(page, y); await shot(page, `1440-${name}`);
    if (name === '05-dubai') report.push('canvas colours (Dubai): ' + (await canvasColours(page, { x: 300, y: 100, width: 840, height: 700 })).join(', '));
  }
  // gentle kinetic "Committees" under the pointer
  await scrollTo(page, at(s.committees, 1));
  const cw = await page.evaluate(() => { const r = document.querySelector('.cm-k')?.getBoundingClientRect(); return r ? [r.left, r.top, r.width, r.height] : null; });
  if (cw) { await page.mouse.move(cw[0] + cw[2] * 0.2, cw[1] + cw[3] / 2, { steps: 4 }); await wait(1200); await shot(page, '1440-10-committees-word-hover'); }
  await page.mouse.move(W - 4, H / 2);
  const Hdoc = await page.evaluate(() => document.documentElement.scrollHeight);
  await scrollTo(page, s.schedule.end + 900); await shot(page, '1440-11-pass');
  const deskY = await page.evaluate(() => { const e = document.getElementById('wellness'); return e ? e.getBoundingClientRect().top + window.scrollY - 120 : 0; });
  await scrollTo(page, deskY); await shot(page, '1440-12-desk');
  await scrollTo(page, Hdoc - 900); await shot(page, '1440-13-footer');
  const fw = await page.evaluate(() => { const r = document.querySelector('.foot-word .kl')?.getBoundingClientRect(); return r ? [r.left, r.top, r.width, r.height] : null; });
  if (fw) { await page.mouse.move(fw[0] + fw[2] * 0.62, fw[1] + fw[3] / 2, { steps: 4 }); await wait(1200); await shot(page, '1440-14-footer-word-hover'); }
  report.push('footer word ' + JSON.stringify(fw));
  // jump back to the hero from the nav, check the tally line has abstain cells
  const tally = await page.evaluate(() => [...document.querySelectorAll('.tl-cell')].map((c) => (c.classList.contains('is-abs') ? 'A' : '') + (c.firstElementChild?.style.transform || '')).join(' | '));
  report.push('tally cells at footer: ' + tally);
  await page.close();
}

// ------------------------------------------------------------------ 390
if (!ONLY || ONLY === 'phone') {
  await loader(390, 844, [1.9], '390-00');
  const W = 390, H = 844;
  const page = await open(W, H);
  await skipLoader(page);
  await page.evaluate((p) => { window.__c2.park(p[0], p[1]); }, [W * 0.5, H * 0.3]);
  await wait(1500);
  await shot(page, '390-01-hero-lens');
  report.push('390 canvas colours: ' + (await canvasColours(page, { x: 0, y: 60, width: 390, height: 360 })).join(', '));
  const s = await stops(page);
  for (const [name, y] of [['02-flight-mid', at(s.flight, 0.45)], ['03-dubai', at(s.flight, 0.97)], ['04-clause-mid-fill', at(s.clauses, 0.47)], ['05-committee-wall', at(s.committees ?? s.clauses, 1)], ['06-schedule-ruler', at(s.schedule, 0.55)]]) {
    await scrollTo(page, y); await shot(page, `390-${name}`);
  }
  const Hdoc = await page.evaluate(() => document.documentElement.scrollHeight);
  await scrollTo(page, Hdoc - H); await shot(page, '390-07-footer');
  await scrollTo(page, at(s.schedule, 0.3));
  await page.tap('.menu-pill');
  await wait(1800);
  await shot(page, '390-08-menu-open');
  await page.close();
}

// ------------------------------------------------------------------ calm
if (!ONLY || ONLY === 'calm') {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await open(w, h, { still: true });
    await wait(3500);
    await shot(page, `${w}-still-first-screen`);
    await page.close();
  }
}

console.log(report.join('\n'));
console.log(errors.length ? 'Console errors:\n' + [...new Set(errors)].join('\n') : 'No console errors');
await browser.close();
