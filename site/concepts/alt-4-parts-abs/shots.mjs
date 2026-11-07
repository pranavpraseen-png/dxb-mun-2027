// Screenshots and checks for the Alt 4 part options About / Committees / Schedule, B and C. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/alt-4-parts-abs/shots.mjs"
// At 1440x900 and 390x844: every part settled, plus at least one interaction state each. Then ?still full pages.
// Prints state at each step, horizontal overflow, clipped text, and every console error.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/alt-4-parts-abs/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/r4/parts-abs';
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const only = process.env.ONLY?.split(',');
const want = (k) => !only || only.some((o) => k.includes(o));

/** Put the top of a part (its label bar) at `y` px from the top of the viewport. */
const toPart = (page, id, y = 0) => page.evaluate((id, y) => {
  const el = document.querySelector(`[data-part="${id}"]`);
  window.scrollTo(0, el.getBoundingClientRect().top + scrollY - y);
}, id, y);
const scrollBy = (page, dy) => page.evaluate((dy) => { window.scrollBy(0, dy); }, dy);
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const part = async (page, id, name) => { const el = await page.$(`#${id}`); await el.screenshot({ path: `${out}/${name}.png` }); };
const checks = (page) => page.evaluate(() => {
  const clipped = [];
  for (const el of document.querySelectorAll('h2,h3,p,dd,b,.committeesc-item,.aboutc-cap,.scheduleb-name')) {
    const cs = getComputedStyle(el);
    if (cs.overflow === 'hidden' && el.closest('.scheduleb-btn')) continue; // short labels by design
    if (el.closest(".aboutc-sr,.schedulec-sr,.committeesc-sr")) continue;
    if (el.scrollWidth > el.clientWidth + 1 && cs.display !== 'inline') clipped.push((el.className || el.tagName) + ': ' + el.textContent.trim().slice(0, 40));
  }
  return { overflowX: document.documentElement.scrollWidth > innerWidth, clipped: clipped.slice(0, 8) };
});

const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 60000, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });

for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const tag = `abs@${w}`;
  const p = w;
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await wait(600);
  console.log(tag, 'checks at top', JSON.stringify(await checks(page)));

  /* about-b: partway (reading line mid-list), then fully read */
  if (want('about-b')) {
    await toPart(page, 'about-b', 0);
    await wait(300);
    await scrollBy(page, mobile ? 380 : 260);
    await wait(700);
    await shot(page, `${p}-about-b-1-reading`);
    console.log(tag, 'about-b read', await page.evaluate(() => document.querySelectorAll('#about-b .is-read').length), 'of 7, counter', await page.evaluate(() => document.querySelector('#about-b .aboutb-count')?.textContent));
    await scrollBy(page, mobile ? 900 : 700);
    await wait(800);
    await part(page, 'about-b', `${p}-about-b-2-all-read`);
    console.log(tag, 'about-b read', await page.evaluate(() => document.querySelectorAll('#about-b .is-read').length), 'of 7');
  }

  /* about-c: mid-flip and settled */
  if (want('about-c')) {
    await toPart(page, 'about-c', -400);
    await wait(400);
    await toPart(page, 'about-c', 0);
    await wait(260);
    await shot(page, `${p}-about-c-1-midflip`);
    await wait(1800);
    await shot(page, `${p}-about-c-2-settled`);
    console.log(tag, 'about-c board', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#about-c .aboutc-row .aboutc-tile .aboutc-top:first-child')].map((e) => e.textContent).join(''))));
  }

  /* committees-b: start, then 6 steps along (keyboard on desktop, buttons on phone), then a mouse throw */
  if (want('committees-b')) {
    await toPart(page, 'committees-b', 0);
    await wait(500);
    await shot(page, `${p}-committees-b-1-start`);
    for (let i = 0; i < 6; i++) { await page.click('#committees-b .committeesb-btn[aria-label="Next committee"]'); await wait(mobile ? 450 : 300); }
    await wait(1200);
    await shot(page, `${p}-committees-b-2-seventh`);
    console.log(tag, 'committees-b caption', await page.evaluate(() => document.querySelector('#committees-b .committeesb-full')?.textContent));
    if (!mobile) {
      const box = await (await page.$('#committees-b .committeesb-rail')).boundingBox();
      const y = box.y + box.height / 2;
      await page.mouse.move(900, y); await page.mouse.down();
      for (let x = 900; x >= 420; x -= 60) { await page.mouse.move(x, y); await wait(12); }
      await page.mouse.up();
      await wait(1500);
      await shot(page, `${p}-committees-b-3-after-throw`);
      console.log(tag, 'committees-b after throw', await page.evaluate(() => document.querySelector('#committees-b .committeesb-full')?.textContent));
    }
  }

  /* committees-c: type "un", arrow, Enter; then "health" */
  if (want('committees-c')) {
    await toPart(page, 'committees-c', 0);
    await wait(400);
    await shot(page, `${p}-committees-c-1-start`);
    await page.click('#committees-c .committeesc-input');
    await page.keyboard.type('un', { delay: 60 });
    await wait(300);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await wait(400);
    await toPart(page, 'committees-c', mobile ? -120 : -60);
    await wait(200);
    await shot(page, `${p}-committees-c-2-un-called`);
    console.log(tag, 'committees-c', JSON.stringify(await page.evaluate(() => ({ answering: document.querySelector('#committees-c .committeesc-bar b')?.textContent, called: document.querySelector('#committees-c .committeesc-name')?.textContent }))));
    await page.click('#committees-c .committeesc-input', { count: 3 });
    await page.keyboard.type('health', { delay: 40 });
    await page.keyboard.press('Enter');
    await wait(400);
    await part(page, 'committees-c', `${p}-committees-c-3-health`);
    console.log(tag, 'committees-c health →', await page.evaluate(() => document.querySelector('#committees-c .committeesc-name')?.textContent));
  }

  /* schedule-b: default cursor, then the cursor at 4:15 PM (desktop: hover; phone: tap a block) */
  if (want('schedule-b')) {
    await toPart(page, 'schedule-b', 0);
    await wait(400);
    await part(page, 'schedule-b', `${p}-schedule-b-1-default`);
    if (!mobile) {
      const box = await (await page.$('#schedule-b .scheduleb-area')).boundingBox();
      const T0 = 9 * 60, SPAN = 11 * 60, t = 16 * 60 + 15;
      await page.mouse.move(box.x + ((t - T0) / SPAN) * box.width, box.y + box.height / 2);
    } else {
      await page.evaluate(() => document.querySelector('#schedule-b .scheduleb-row:nth-of-type(2) .scheduleb-slot:nth-child(6) button')?.scrollIntoView({ block: 'center' }));
      await wait(200);
      await page.tap('#schedule-b .scheduleb-row:nth-of-type(2) .scheduleb-slot:nth-child(6) button');
    }
    await wait(400);
    await part(page, 'schedule-b', `${p}-schedule-b-2-cursor`);
    console.log(tag, 'schedule-b readout', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#schedule-b .scheduleb-cell-n')].map((e) => e.textContent))), await page.evaluate(() => document.querySelector('#schedule-b .scheduleb-read-t b')?.textContent));
  }

  /* schedule-c: Day 1 settled, Day 2 mid-flip, Day 2 settled */
  if (want('schedule-c')) {
    await toPart(page, 'schedule-c', 0);
    await wait(2000);
    await toPart(page, 'schedule-c', mobile ? -260 : -120);
    await wait(300);
    await shot(page, `${p}-schedule-c-1-day1`);
    await page.click('#schedule-c .schedulec-day:nth-child(2)');
    await wait(220);
    await shot(page, `${p}-schedule-c-2-flipping`);
    await wait(1800);
    await shot(page, `${p}-schedule-c-3-day2`);
    console.log(tag, 'schedule-c row 2', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#schedule-c .schedulec-row:nth-child(2) .is-event .schedulec-t:first-child')].map((e) => e.textContent).join(''))));
  }
  console.log(tag, 'checks at end', JSON.stringify(await checks(page)));
  await page.close();
}

/* the calm version: ?still, full page, both widths */
if (!only) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage();
    watch(page, `still@${w}`);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
    await page.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
    await page.evaluate(() => document.fonts.ready);
    await wait(800);
    await page.screenshot({ path: `${out}/${w}-90-still-full.png`, fullPage: true });
    console.log(`still@${w}`, JSON.stringify(await checks(page)), 'height', await page.evaluate(() => document.documentElement.scrollHeight));
    await page.close();
  }
}
await browser.close();
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
