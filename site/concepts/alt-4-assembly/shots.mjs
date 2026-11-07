// Screenshots and checks for Alt 4 · Assembly. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/alt-4-assembly/shots.mjs"
// 1440×900: the opening held at three moments, the hero, a cursor lift, every section reached through the nav,
// a committee hover, Day 2 of the schedule. 390×844 (touch): the opening, the hero, the menu, sections via the menu.
// Then the calm page (?still) at both sizes and the no-WebGL page. Prints state, overflow and every console error.
// ONLY=1440|390|still limits the run.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/alt-4-assembly/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/r3/alt-4';
mkdirSync(out, { recursive: true });
const only = process.env.ONLY;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const args = ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const until = async (page, fn, arg, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn, arg)) return true;
    await wait(250);
  }
  return false;
};
const info = (page) => page.evaluate(() => ({
  phase: document.documentElement.dataset.phase,
  section: document.documentElement.dataset.section,
  y: Math.round(scrollY),
  activeNav: [...document.querySelectorAll('.nav-links a.is-on, .menu-list a.is-on')].map((a) => a.textContent).join('|'),
  pins: [...document.querySelectorAll('.pin')].filter((p) => p.style.visibility === 'visible').map((p) => p.textContent).slice(0, 24).join(','),
  overflowX: document.documentElement.scrollWidth > innerWidth,
}));
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const goSection = async (page, id, phone) => {
  if (phone) {
    await page.click('.nav-menu');
    await wait(900);
    await page.click(`.menu-list a[href="#${id}"]`);
  } else {
    await page.click(`.nav-links a[href="#${id}"]`);
  }
  await until(page, (i) => Math.abs(scrollY - document.getElementById(i).offsetTop) < 2, id, 8000);
  await wait(2600); // camera damping + labels
};

const browser = await puppeteer.launch({ executablePath, headless: true, args, protocolTimeout: 60000 });

/* ------------------------------------------------------------------ 1440 */
if (!only || only === '1440') {
  const tag = 'alt-4@1440';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => { window.__A4_HOLD = 0; });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await until(page, () => !!document.querySelector('.gl canvas') && document.fonts.status === 'loaded', null, 60000);
  await wait(1500);
  for (const [t, name] of [[0.7, 'plan'], [2.2, 'seating'], [3.25, 'podium']]) {
    await page.evaluate((x) => { window.__a4.seek(x); }, t);
    await wait(1400);
    await shot(page, `1440-0${t < 1 ? 1 : t < 3 ? 2 : 3}-loader-${name}`);
    console.log(tag, `loader t=${t}`, JSON.stringify(await info(page)));
  }
  await page.evaluate(() => { window.__a4.play(); });
  await until(page, () => document.documentElement.dataset.phase === '4', null, 30000);
  await wait(2500);
  await shot(page, '1440-10-hero');
  console.log(tag, 'hero', JSON.stringify(await info(page)));
  // The cursor lifts the seats near it.
  await page.mouse.move(470, 585, { steps: 6 });
  await wait(1200);
  await shot(page, '1440-11-hero-cursor');
  console.log(tag, 'cursor lift (world units, max over seats):', await page.evaluate(() => window.__a4.lift()));
  const ids = ['about', 'committees', 'schedule', 'register', 'wellness', 'resources', 'contact'];
  for (const [i, id] of ids.entries()) {
    await goSection(page, id, false);
    await page.mouse.move(1400, 880);
    await wait(600);
    await shot(page, `1440-2${i}-${id}`);
    console.log(tag, id, JSON.stringify(await info(page)));
    if (id === 'committees') {
      await page.hover('.key:nth-child(13)');
      await wait(1500);
      await shot(page, '1440-21b-committees-unsc');
      console.log(tag, 'hover UNSC', await page.evaluate(() => document.querySelector('.cmt-name')?.textContent));
      // A real pointer over the 3D seats: aim at the centre of one block's label, then just below it.
      const box = await page.evaluate(() => { const b = [...document.querySelectorAll('.pin-block')].find((p) => p.textContent === 'ICJ'); if (!b || b.style.visibility !== 'visible') return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.bottom + 14 }; });
      if (box) { await page.mouse.move(box.x, box.y, { steps: 4 }); await wait(1500); }
      await shot(page, '1440-21c-committees-3d-hover');
      console.log(tag, '3D hover near ICJ →', await page.evaluate(() => document.querySelector('.cmt-abbr')?.textContent));
    }
    if (id === 'schedule') {
      await page.click('.tab:nth-child(2)');
      await page.hover('.slots li:nth-child(4) .slot');
      await wait(1800);
      await shot(page, '1440-22b-schedule-day2');
    }
    if (id === 'wellness') {
      await page.click('.check');
      await wait(300);
      console.log(tag, 'wellness', await page.evaluate(() => document.querySelector('.note')?.textContent));
    }
  }
  await page.close();
}

/* ------------------------------------------------------------------ 390 */
if (!only || only === '390') {
  const tag = 'alt-4@390';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(() => { window.__A4_HOLD = 0; });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await until(page, () => !!document.querySelector('.gl canvas') && document.fonts.status === 'loaded', null, 60000);
  await wait(1500);
  await page.evaluate(() => { window.__a4.seek(2.2); });
  await wait(1500);
  await shot(page, '390-00-loader');
  await page.evaluate(() => { window.__a4.play(); });
  await until(page, () => document.documentElement.dataset.phase === '4', null, 30000);
  await wait(2500);
  await shot(page, '390-10-hero');
  console.log(tag, 'hero', JSON.stringify(await info(page)));
  await page.click('.nav-menu');
  await wait(1200);
  await shot(page, '390-20-menu');
  await page.click('.menu-list a[href="#committees"]');
  await until(page, () => Math.abs(scrollY - document.getElementById('committees').offsetTop) < 2, null, 8000);
  await wait(2600);
  await shot(page, '390-21-committees');
  console.log(tag, 'committees', JSON.stringify(await info(page)));
  for (const id of ['about', 'schedule', 'register', 'wellness', 'contact']) {
    await goSection(page, id, true);
    await shot(page, `390-3x-${id}`);
    console.log(tag, id, JSON.stringify(await info(page)));
  }
  await page.close();
}

/* ------------------------------------------------------------------ the calm page and no WebGL */
if (!only || only === 'still') {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage();
    watch(page, `still@${w}`);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(800);
    await page.screenshot({ path: `${out}/${w}-90-still-full.png`, fullPage: true });
    console.log(`still@${w}`, JSON.stringify(await info(page)), 'height', await page.evaluate(() => document.documentElement.scrollHeight));
    await page.close();
  }
}
await browser.close();
if (!only || only === 'still') {
  const noGl = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-webgl', '--disable-3d-apis'], protocolTimeout: 60000 });
  const page = await noGl.newPage();
  watch(page, 'no-webgl@1440');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(800);
  await shot(page, '1440-91-no-webgl');
  console.log('no-webgl@1440', 'calm page shown:', await page.evaluate(() => document.documentElement.classList.contains('is-still') && !!document.querySelector('.plan')));
  await noGl.close();
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
