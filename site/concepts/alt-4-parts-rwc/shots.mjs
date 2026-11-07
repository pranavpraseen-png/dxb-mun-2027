// Screenshots and checks for the Alt 4 parts harness (B + C of nav, register, wellness, contact). Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/alt-4-parts-rwc/shots.mjs"
// For each part at 1440x900 and 390x844 (DPR 2 for parts, DPR 1 for the full stack): the resting state and at least one
// interaction state (palette open + filtered, a name typed, a signature drawn, the pacer running, a switch on).
// Prints what each step found, horizontal overflow, and every console error.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const base = 'http://127.0.0.1:5320/concepts/alt-4-parts-rwc/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/r4/parts-rwc';
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const only = process.argv[2]; // optional: run one part key only
const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 60000, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });

const SIZES = [
  { w: 1440, h: 900, tag: '1440', mobile: false },
  { w: 390, h: 844, tag: '390', mobile: true },
];

async function open(key, size, query = '') {
  const page = await browser.newPage();
  const tag = `${key}@${size.tag}`;
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: 2, isMobile: size.mobile, hasTouch: size.mobile });
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`${base}?only=${key}${query}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await wait(500);
  return { page, tag };
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
const shotPart = async (page, name) => {
  const el = await page.$('[data-part] > :last-child');
  await el.screenshot({ path: `${out}/${name}.png` });
};
const shotView = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const log = (tag, what, v) => console.log(tag.padEnd(18), what.padEnd(28), typeof v === 'string' ? v : JSON.stringify(v));
const want = (k) => !only || only === k;

for (const size of SIZES) {
  const S = size.tag;

  /* ---------------- nav B */
  if (want('nav-b')) {
    const { page, tag } = await open('nav-b', size);
    await shotView(page, `${S}-nav-b-0-top`);
    log(tag, 'overflow', await overflow(page));
    if (!size.mobile) {
      await page.evaluate(() => window.scrollTo(0, document.getElementById('register').offsetTop - 300));
      await wait(700);
      await shotView(page, `${S}-nav-b-1-scrolled-register`);
      log(tag, 'active after scroll', await page.evaluate(() => document.querySelector('.navb-index a[aria-current]')?.textContent));
      log(tag, 'progress', await page.evaluate(() => document.querySelector('.navb-fill').style.transform));
      // a click on 06 jumps to resources
      await page.click('.navb-index li:nth-child(6) a');
      await wait(1600);
      log(tag, 'after click 06', await page.evaluate(() => ({ hash: location.hash, active: document.querySelector('.navb-index a[aria-current]')?.textContent })));
      await page.setViewport({ width: 1024, height: 900, deviceScaleFactor: 2 });
      await wait(600);
      await shotView(page, `1024-nav-b-2-mid-width`);
      log('nav-b@1024', 'overflow', await overflow(page));
    } else {
      await page.evaluate(() => window.scrollTo(0, document.getElementById('schedule').offsetTop - 300));
      await wait(600);
      await page.click('.navb-menu-btn');
      await wait(900);
      await shotView(page, `${S}-nav-b-1-menu-open`);
      log(tag, 'menu open', await page.evaluate(() => !!document.querySelector('.navb-menu')));
      await page.click('.navb-menu-list li:nth-child(7) a');
      await wait(1800);
      log(tag, 'after menu jump', await page.evaluate(() => ({ hash: location.hash, menu: !!document.querySelector('.navb-menu'), where: document.querySelector('.navb-where')?.textContent })));
    }
    await page.close();
  }

  /* ---------------- nav C */
  if (want('nav-c')) {
    const { page, tag } = await open('nav-c', size);
    await shotView(page, `${S}-nav-c-0-bar`);
    log(tag, 'overflow', await overflow(page));
    if (!size.mobile) {
      await page.keyboard.press('/');
      await wait(600);
      await shotView(page, `${S}-nav-c-1-palette-open`);
      log(tag, 'palette open', await page.evaluate(() => ({ open: !!document.querySelector('.navc-pal'), items: document.querySelectorAll('.navc-item').length })));
      await page.keyboard.type('unsc');
      await wait(400);
      await shotView(page, `${S}-nav-c-2-filtered-unsc`);
      log(tag, 'typed unsc', await page.evaluate(() => [...document.querySelectorAll('.navc-item')].map((e) => e.querySelector('.navc-code').textContent + ' ' + e.querySelector('.navc-label').textContent).slice(0, 6)));
      await page.keyboard.press('Enter');
      await wait(1800);
      log(tag, 'after Enter', await page.evaluate(() => ({ open: !!document.querySelector('.navc-pal'), hash: location.hash, y: Math.round(scrollY) })));
      await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control');
      await wait(500);
      await page.keyboard.type('sch');
      await page.keyboard.press('ArrowDown');
      await wait(300);
      await shotView(page, `${S}-nav-c-3-ctrlk-sch-arrow`);
      log(tag, 'ctrl+k sch, highlighted', await page.evaluate(() => document.querySelector('.navc-item[data-highlighted] .navc-label')?.textContent));
      await page.keyboard.press('Escape');
      await wait(500);
      log(tag, 'after Esc', await page.evaluate(() => !!document.querySelector('.navc-pal')));
    } else {
      await page.tap('.navc-go');
      await wait(700);
      await shotView(page, `${S}-nav-c-1-sheet-open`);
      log(tag, 'sheet', await page.evaluate(() => ({ sheet: !!document.querySelector('.navc-pal.is-sheet'), items: document.querySelectorAll('.navc-item').length })));
      await page.type('.navc-input', 'who');
      await wait(400);
      await shotView(page, `${S}-nav-c-2-sheet-who`);
      log(tag, 'typed who', await page.evaluate(() => [...document.querySelectorAll('.navc-item .navc-label')].map((e) => e.textContent).slice(0, 5)));
      await page.tap('.navc-item');
      await wait(1800);
      log(tag, 'after tap', await page.evaluate(() => ({ open: !!document.querySelector('.navc-pal'), hash: location.hash })));
    }
    await page.close();
  }

  /* ---------------- register B */
  if (want('register-b')) {
    const { page, tag } = await open('register-b', size);
    await shotPart(page, `${S}-register-b-0-empty`);
    log(tag, 'overflow', await overflow(page));
    await page.type('.regb-input', 'Aarav Menon', { delay: 40 });
    await wait(300);
    if (!size.mobile) {
      const r = await page.evaluate(() => { const b = document.querySelector('.regb-card').getBoundingClientRect(); return { x: b.right - 40, y: b.top + 60 }; });
      await page.mouse.move(r.x - 120, r.y + 120);
      await page.mouse.move(r.x, r.y, { steps: 8 });
      await wait(900);
    } else await wait(1200);
    await shotPart(page, `${S}-register-b-1-name-typed`);
    log(tag, 'badge name', await page.evaluate(() => ({ name: document.querySelector('.regb-name').textContent, size: document.querySelector('.regb-name').style.fontSize, transform: document.querySelector('.regb-card').style.transform, qr: !!document.querySelector('.regb-qr svg path') })));
    await page.focus('.regb-input');
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('.regb-input', 'Maximiliana Alexandrova-Fernandes', { delay: 10 });
    await wait(1200);
    await shotPart(page, `${S}-register-b-2-long-name`);
    log(tag, 'long name fit', await page.evaluate(() => { const n = document.querySelector('.regb-name'); return { size: n.style.fontSize, fits: n.scrollWidth <= n.parentElement.clientWidth + 1 }; }));
    await page.close();
  }

  /* ---------------- register C */
  if (want('register-c')) {
    const { page, tag } = await open('register-c', size);
    await shotPart(page, `${S}-register-c-0-unsigned`);
    log(tag, 'overflow', await overflow(page));
    const box = await page.evaluate(() => { const r = document.querySelector('.regc-canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    await page.evaluate((y) => window.scrollBy(0, y), box.y - 200);
    const b = await page.evaluate(() => { const r = document.querySelector('.regc-canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    // a signature-like path: a loop, a run of waves, a tail
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      pts.push([b.x + 40 + t * Math.min(320, b.w - 160), b.y + b.h * 0.55 + Math.sin(t * Math.PI * 5) * 26 - (t < 0.15 ? Math.sin(t / 0.15 * Math.PI) * 40 : 0)]);
    }
    await page.mouse.move(pts[0][0], pts[0][1]);
    await page.mouse.down();
    for (const [x, y] of pts.slice(1, 10)) await page.mouse.move(x, y);
    await page.mouse.up();
    await wait(200);
    await shotPart(page, `${S}-register-c-1-half-signed`);
    log(tag, 'half signed', await page.evaluate(() => ({ meter: document.querySelector('.regc-meter span').style.transform, signed: document.querySelector('.regc').classList.contains('is-signed') })));
    await page.mouse.move(pts[10][0], pts[10][1]);
    await page.mouse.down();
    for (const [x, y] of pts.slice(11)) await page.mouse.move(x, y);
    await page.mouse.up();
    await wait(700);
    await shotPart(page, `${S}-register-c-2-signed-sealed`);
    log(tag, 'signed', await page.evaluate(() => ({ signed: document.querySelector('.regc').classList.contains('is-signed'), cta: document.querySelector('.regc-btn--un')?.getAttribute('href'), seal: !!document.querySelector('.regc-seal svg') })));
    await page.close();
  }

  /* ---------------- wellness B */
  if (want('wellness-b')) {
    const { page, tag } = await open('wellness-b', size);
    await shotPart(page, `${S}-wellness-b-0-ready`);
    log(tag, 'overflow', await overflow(page));
    await page.click('.wellb-btn');
    await wait(2100);
    await shotPart(page, `${S}-wellness-b-1-breathe-in`);
    log(tag, 'at ~2s', await page.evaluate(() => ({ word: document.querySelector('.wellb-word').textContent, count: document.querySelector('.wellb-count').textContent })));
    await wait(4000);
    await shotPart(page, `${S}-wellness-b-2-hold`);
    log(tag, 'at ~6s', await page.evaluate(() => ({ word: document.querySelector('.wellb-word').textContent, count: document.querySelector('.wellb-count').textContent, dot: [document.querySelector('.wellb-dot').getAttribute('x'), document.querySelector('.wellb-dot').getAttribute('y')] })));
    await page.click('.wellb-check:nth-child(1)');
    await wait(300);
    log(tag, 'water pressed', await page.evaluate(() => document.querySelector('.wellb-status').textContent));
    await page.close();
  }

  /* ---------------- wellness C */
  if (want('wellness-c')) {
    const { page, tag } = await open('wellness-c', size);
    await shotPart(page, `${S}-wellness-c-0-off`);
    log(tag, 'overflow', await overflow(page));
    await page.click('.wellc-unit:nth-child(1) .wellc-switch');
    await wait(500);
    await page.click('.wellc-unit:nth-child(3) .wellc-switch');
    await wait(500);
    await shotPart(page, `${S}-wellness-c-1-two-on`);
    log(tag, 'two on', await page.evaluate(() => ({ status: document.querySelector('.wellc-status-v').textContent, checked: [...document.querySelectorAll('.wellc-switch')].map((s) => s.getAttribute('aria-checked')) })));
    await page.click('.wellc-unit:nth-child(2) .wellc-unit-l'); // the label text also flips it
    await wait(500);
    await shotPart(page, `${S}-wellness-c-2-all-on`);
    log(tag, 'all on (via label)', await page.evaluate(() => document.querySelector('.wellc-status-v').textContent));
    await page.close();
  }

  /* ---------------- contact B + C */
  for (const key of ['contact-b', 'contact-c']) {
    if (!want(key)) continue;
    const { page, tag } = await open(key, size);
    await shotPart(page, `${S}-${key}-0-full`);
    log(tag, 'overflow', await overflow(page));
    // Alone, the part can be shorter than the screen; a spacer above makes "the end of the page" real, as on the full page.
    await page.evaluate(() => { const s = document.createElement('div'); s.style.height = '900px'; document.body.prepend(s); });
    await wait(200);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await wait(1200);
    await shotView(page, `${S}-${key}-1-page-end`);
    if (key === 'contact-c') {
      log(tag, 'clock', await page.evaluate(() => document.querySelector('.conc-clock').getAttribute('aria-label')));
      log(tag, 'wordmark', await page.evaluate(() => { const w = document.querySelector('.conc-word'); const m = w.parentElement; return { font: w.style.fontSize, box: m.style.height, wordW: Math.round(w.getBoundingClientRect().width), boxW: m.clientWidth }; }));
    }
    await page.close();
  }

  /* ---------------- the whole stack, ?still */
  if (!only) {
    const page = await browser.newPage();
    const tag = `stack-still@${S}`;
    page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
    await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: 1, isMobile: size.mobile, hasTouch: size.mobile });
    await page.goto(base + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(1000);
    await page.screenshot({ path: `${out}/${S}-stack-still-full.png`, fullPage: true });
    log(tag, 'overflow / height', await page.evaluate(() => [document.documentElement.scrollWidth > innerWidth, document.documentElement.scrollHeight]));
    await page.close();
  }
}

await browser.close();
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
