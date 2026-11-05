// Screenshots and checks for Night Lab. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/night-lab/shots.mjs"          (everything)
//   node scripts/heavy.mjs "node concepts/night-lab/shots.mjs quick"    (first screens + console check only)
// Uses the shared dev server (never its own). deviceScaleFactor 2, sRGB. Output: shots/v2/night-lab/.
// The loader frames are exact: the script pauses the boot timeline (window.__nlBoot) and seeks to each moment.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const URL_ = 'http://127.0.0.1:5320/concepts/night-lab/';
const mode = process.argv[2] ?? 'all';
const out = 'shots/v2/night-lab';
mkdirSync(out, { recursive: true });
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath, headless: true, protocolTimeout: 120000,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
const report = [];

async function open(w, h, { boot = false, still = false } = {}) {
  const page = await browser.newPage();
  const tag = `${w}${still ? '-still' : ''}${boot ? '-boot' : ''}`;
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: w < 768, hasTouch: w < 768 });
  if (!boot) await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('nl-boot-seen', '1'); } catch {} });
  await page.goto(URL_ + (still ? '?still' : ''), { waitUntil: boot ? 'domcontentloaded' : 'networkidle2', timeout: 120000 });
  return page;
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
async function shot(page, name, opts = {}) {
  const ov = await overflow(page);
  await page.screenshot({ path: `${out}/${name}.png`, ...opts });
  report.push(`${name}.png  overflow=${ov}px`);
}
// headless Chrome (swiftshader) wraps captures taller than 8192 device px, so a full page is saved in parts of 4000 CSS px (8000 at DSF 2)
async function fullShot(page, name) {
  const ov = await overflow(page);
  const { W, H } = await page.evaluate(() => ({ W: window.innerWidth, H: document.documentElement.scrollHeight }));
  const PART = 4000;
  const n = Math.ceil(H / PART);
  for (let i = 0; i < n; i++) {
    const y = i * PART;
    await page.screenshot({ path: `${out}/${name}-${i + 1}of${n}.png`, clip: { x: 0, y, width: W, height: Math.min(PART, H - y) }, captureBeyondViewport: true });
  }
  report.push(`${name} (${n} parts, ${H}px tall)  overflow=${ov}px`);
}
async function scrollTo(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), Math.round(y));
  await wait(300);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), Math.round(y));
  await wait(1700);
}
const stops = (page) => page.evaluate(() => window.__nl.stops());
const at = (s, f) => s.start + (s.end - s.start) * f;

async function loader(w, h, times, prefix) {
  const page = await open(w, h, { boot: true });
  await page.waitForFunction(() => !!window.__nlBoot, { timeout: 60000, polling: 100 });
  await page.evaluate(() => { window.__nlBoot.pause(); });
  for (const t of times) {
    await page.evaluate((s) => { window.__nlBoot.seek(s, false); }, t);
    await wait(450);
    await shot(page, `${prefix}-loader-${String(t).replace('.', '_')}s`);
  }
  await page.close();
}

// ------------------------------------------------------------------ 1440
if (mode === 'all' || mode === 'loader') await loader(1440, 900, [0.3, 1.2, 2.2, 3], '1440');
{
  const page = await open(1440, 900);
  await wait(2500);
  await shot(page, '1440-01-first-screen');
  if (mode === 'all' || mode === 'scroll') {
    const s = await stops(page);
    report.push('stops ' + JSON.stringify(s));
    const states = [
      ['02-globe-flight', at(s.flight, 0.4)],
      ['03-dubai-locked', at(s.flight, 0.97)],
      ['04-clause-mid-fill', at(s.clauses, 0.27)],
      ['05-committees-forming', at(s.committees, 0.42)],
      ['06-committee-wall', at(s.committees, 1)],
      ['07-schedule-ruler', at(s.schedule, 0.42)],
    ];
    for (const [name, y] of states) { await scrollTo(page, y); await shot(page, `1440-${name}`); }
    // the rest of the page, as the eye meets it
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    await scrollTo(page, s.schedule.end + 900); await shot(page, '1440-08-pass');
    await scrollTo(page, H - 900); await shot(page, '1440-09-footer');
    const deskY = await page.evaluate(() => { const e = document.getElementById('wellness'); return e ? e.getBoundingClientRect().top + window.scrollY - 120 : 0; });
    await scrollTo(page, deskY); await shot(page, '1440-12-desk-rows');
    // hover a nameplate (cursor disc + inverted plate)
    await scrollTo(page, at(s.committees, 1));
    const box = await (await page.$$('.tile'))[7].boundingBox();
    await page.mouse.move(box.x + 10, box.y + 10); await wait(200); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await wait(1200);
    await shot(page, '1440-10-plate-hover');
  }
  await page.close();
}
if (mode === 'all') {
  const page = await open(1440, 900, { still: true });
  await wait(2500);
  await fullShot(page, '1440-11-full-still');
  await page.close();
}

// ------------------------------------------------------------------ 390
if (mode === 'all' || mode === 'loader') await loader(390, 844, [1.2], '390');
{
  const page = await open(390, 844);
  await wait(2500);
  await shot(page, '390-01-first-screen');
  if (mode === 'all' || mode === 'scroll') {
    const s = await stops(page);
    for (const [name, y] of [['02-dubai-locked', at(s.flight, 0.97)], ['03-clause-mid-fill', at(s.clauses, 0.47)], ['04-schedule-ruler', at(s.schedule, 0.55)]]) {
      await scrollTo(page, y); await shot(page, `390-${name}`);
    }
    // open the menu from mid-page, so the current item shows its orange strike
    await scrollTo(page, at(s.schedule, 0.3));
    await page.tap('.menu-pill');
    await wait(1800);
    await shot(page, '390-05-menu-open');
  }
  await page.close();
}
if (mode === 'all') {
  const page = await open(390, 844, { still: true });
  await wait(2500);
  await fullShot(page, '390-06-full-still');
  await page.close();
}

console.log(report.join('\n'));
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
