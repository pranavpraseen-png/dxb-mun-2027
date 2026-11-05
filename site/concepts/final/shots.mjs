// Screenshots and scroll-state checks for the final homepage. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/final/shots.mjs"
// Motion mode: the first screen (and the spotlight mid-pass), six positions through the pinned opening (photo,
// cut, globe flight, clauses assembling, landed), the committees stop, the pinned day sequence (Day 1, 2, 3) and a
// top-nav colour-block wipe. Still mode (?still): one full-page shot. Prints the state read at every position.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/final/';
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = browsers.find((p) => existsSync(p));
const out = 'shots/v2/final';
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
  await wait(200);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
};
// A small fingerprint of the animated state, to prove that scroll positions really differ.
const state = (page) => page.evaluate(() => {
  const g = (s) => document.querySelector(s);
  const cs = (s, p) => (g(s) ? getComputedStyle(g(s))[p] : '-');
  const chars = [...document.querySelectorAll('.cl-fact .ch')];
  const settled = chars.filter((c) => /matrix\(1, 0, 0, 1, 0, 0\)|none/.test(getComputedStyle(c).transform)).length;
  return {
    y: Math.round(scrollY),
    photoClip: cs('.layer--photo', 'clipPath'),
    globe: cs('.layer--globe', 'opacity'),
    res: cs('.res', 'transform'),
    chars: `${settled}/${chars.length} settled`,
    zoom: g('[data-k=zoom]')?.textContent,
    day: g('.sch-panel:not([hidden]) .sch-sum')?.textContent,
  };
});

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const tag = `final@${w}`;
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  // Catch the automatic spotlight pass while its radius is open (it starts 1.7s after mount), rather than at a guess.
  const spot = await page.waitForFunction(() => {
    const s = document.querySelector('.ident-spot');
    const r = s ? parseFloat(getComputedStyle(s).getPropertyValue('--r')) : 0;
    const mx = s ? parseFloat(getComputedStyle(s).getPropertyValue('--mx')) : 0;
    return r > 120 && mx > 30 ? { r, mx } : false;
  }, { timeout: 8000, polling: 50 }).then((h) => h.jsonValue()).catch(() => null);
  await page.screenshot({ path: `${out}/${w}-01-spotlight-pass.png` });
  console.log(tag, 'spotlight pass', spot ? `caught at r=${Math.round(spot.r)}px mx=${Math.round(spot.mx)}%` : 'NOT seen within 8s');
  await wait(4000);
  await page.screenshot({ path: `${out}/${w}-00-first.png` });
  const overflow = [await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)];

  const track = await page.evaluate(() => { const t = document.querySelector('.opening'); return { top: t.offsetTop, len: t.offsetHeight - innerHeight }; });
  const stops = [0.12, 0.3, 0.45, 0.58, 0.7, 0.97];
  for (const [i, p] of stops.entries()) {
    await scrollTo(page, track.top + track.len * p);
    await wait(2600);
    await page.screenshot({ path: `${out}/${w}-1${i}-opening-p${String(Math.round(p * 100)).padStart(2, '0')}.png` });
    console.log(tag, `opening p=${p}`, JSON.stringify(await state(page)));
  }

  const cm = await page.evaluate(() => document.getElementById('committees').getBoundingClientRect().top + scrollY - 60);
  await scrollTo(page, cm);
  await wait(2600);
  await page.screenshot({ path: `${out}/${w}-20-committees.png` });
  overflow.push(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));

  // The pinned day sequence (desktop): positions inside the pin read Day 1, Day 2, Day 3.
  const sch = await page.evaluate(() => {
    const s = document.getElementById('schedule');
    const sp = s.parentElement?.classList.contains('pin-spacer') ? s.parentElement : s;
    return { top: sp.getBoundingClientRect().top + scrollY - 60, len: sp.offsetHeight - s.offsetHeight };
  });
  for (const [i, f] of [0.1, 0.5, 0.9].entries()) {
    await scrollTo(page, sch.top + Math.max(0, sch.len) * f);
    await wait(1800);
    await page.screenshot({ path: `${out}/${w}-3${i}-schedule-${Math.round(f * 100)}.png` });
    console.log(tag, `schedule f=${f} pinLen=${sch.len}`, JSON.stringify(await state(page)));
  }

  // WEIMA: a top-nav jump (desktop nav; the phone uses the sheet, so only 1440 is clicked here).
  if (w >= 1024) {
    await scrollTo(page, 0);
    await wait(1200);
    await page.click('.topbar-nav a[href="#contact"]');
    await wait(260);
    await page.screenshot({ path: `${out}/${w}-40-nav-wipe-mid.png` });
    await wait(1600);
    await page.screenshot({ path: `${out}/${w}-41-nav-wipe-landed.png` });
    const landed = await page.evaluate(() => Math.round(document.getElementById('contact').getBoundingClientRect().top));
    console.log(tag, `nav wipe to #contact: contact top after jump = ${landed}px (bar is 60px)`);
  }
  overflow.push(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.close();

  const still = await browser.newPage();
  watch(still, tag + '(still)');
  await still.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await still.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(1500);
  overflow.push(await still.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  await still.screenshot({ path: `${out}/${w}-90-full-still.png`, fullPage: true });
  const stillH = await still.evaluate(() => document.documentElement.scrollHeight);
  await still.close();
  console.log(`${tag}: overflow=${overflow.join(',')} height=${height}px (${(height / h).toFixed(1)} screens), still height=${stillH}px`);
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
