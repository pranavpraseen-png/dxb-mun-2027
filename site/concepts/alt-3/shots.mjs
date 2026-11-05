// Screenshots and checks for Alt 3 · One Stage. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/alt-3/shots.mjs"
// 1440 (DPR 2): the loader at three moments (ASCII, point web, wireframe), every scene reached through the corner
// index, one mid-flight frame, a committee hover, the ?still page and the no-WebGL page.
// 390 (DPR 2, touch): the first screen, a scene reached by a real swipe, a scene reached through the menu, the menu.
// Prints the state at every step, overflow, and every console error.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/alt-3/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/v2/alt-3';
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const args = ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const info = (page) => page.evaluate(() => ({
  phase: document.documentElement.dataset.phase,
  scene: document.documentElement.dataset.scene,
  hash: location.hash,
  caption: document.querySelector('.caps .cap-h, .caps .hero-h')?.textContent?.trim().slice(0, 60),
  coords: document.querySelector('.c-coords')?.textContent,
  overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight + 1,
}));
const settle = async (page, scene) => {
  await page.waitForFunction((s) => document.documentElement.dataset.scene === String(s), { timeout: 8000 }, scene);
  await wait(3600); // the longest flight is 1.9 s, then the text decodes
};
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });

const browser = await puppeteer.launch({ executablePath, headless: true, args });

/* ------------------------------------------------------------------ 1440 */
{
  const tag = 'alt-3@1440';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => document.documentElement.dataset.intro === 'run', { timeout: 60000 });
  await wait(450);
  await shot(page, '1440-00-loader-ascii');
  console.log(tag, 'loader ascii', JSON.stringify(await info(page)));
  await page.waitForFunction(() => Number(document.documentElement.dataset.phase) >= 1, { timeout: 20000 });
  await wait(650);
  await shot(page, '1440-01-loader-web');
  console.log(tag, 'loader web', JSON.stringify(await info(page)));
  await page.waitForFunction(() => Number(document.documentElement.dataset.phase) >= 2, { timeout: 20000 });
  await wait(550);
  await shot(page, '1440-02-loader-wire');
  console.log(tag, 'loader wire', JSON.stringify(await info(page)));
  await page.waitForFunction(() => Number(document.documentElement.dataset.phase) >= 4, { timeout: 20000 });
  await wait(2500);

  const names = ['globe', 'dubai', 'resolution', 'committees', 'schedule', 'register'];
  for (const [i, n] of names.entries()) {
    if (i > 0) await page.click(`.index li:nth-child(${i + 1}) a`);
    await settle(page, i);
    await shot(page, `1440-1${i}-scene-0${i + 1}-${n}`);
    console.log(tag, `scene ${i + 1}`, JSON.stringify(await info(page)));
  }
  // A long jump through the index: register → dubai, caught mid-flight.
  await page.click('.index li:nth-child(2) a');
  await wait(700);
  await shot(page, '1440-20-flight-mid');
  console.log(tag, 'mid flight', JSON.stringify(await info(page)));
  // Committees: hover one nameplate label, the caption follows.
  await page.click('.index li:nth-child(4) a');
  await settle(page, 3);
  const plate = await page.$('[data-anchor="plate-12"] button');
  if (plate) { await plate.hover(); await wait(900); }
  await shot(page, '1440-21-committee-hover');
  console.log(tag, 'committee hover', JSON.stringify(await page.evaluate(() => document.querySelector('.cmt-abbr .sr')?.textContent)));
  // Schedule: Day 2 tab.
  await page.click('.index li:nth-child(5) a');
  await settle(page, 4);
  await page.click('.tab:nth-child(2)');
  await wait(1200);
  await shot(page, '1440-22-schedule-day2');
  // The wheel: one gesture moves one scene.
  await page.mouse.move(720, 450);
  await page.mouse.wheel({ deltaY: 120 });
  await settle(page, 5);
  console.log(tag, 'wheel down from schedule →', JSON.stringify(await info(page)));
  await page.close();
}

/* ------------------------------------------------------------------ 390 */
{
  const tag = 'alt-3@390';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => Number(document.documentElement.dataset.phase) >= 4, { timeout: 60000 });
  await wait(2500);
  await shot(page, '390-00-first');
  console.log(tag, 'first', JSON.stringify(await info(page)));
  // A real swipe up: globe → dubai.
  await page.touchscreen.touchStart(200, 600);
  await page.touchscreen.touchMove(200, 450);
  await page.touchscreen.touchMove(200, 320);
  await page.touchscreen.touchEnd();
  await settle(page, 1);
  await shot(page, '390-10-scene-02-dubai-by-swipe');
  console.log(tag, 'after swipe', JSON.stringify(await info(page)));
  // The menu.
  await page.click('.c-phone button');
  await wait(1400);
  await shot(page, '390-20-menu');
  console.log(tag, 'menu open', await page.evaluate(() => !!document.querySelector('.menu.is-open')));
  await page.click('.menu-list li:nth-child(4) a');
  await settle(page, 3);
  await shot(page, '390-11-scene-04-committees-by-menu');
  console.log(tag, 'after menu jump', JSON.stringify(await info(page)));
  await page.close();
}

/* ------------------------------------------------------------------ the calm page: ?still and no WebGL */
// STAGE_ONLY=1 skips these (they do not use the stage, so stage-only fixes do not change them).
const stageOnly = process.env.STAGE_ONLY === '1';
for (const [w, h] of stageOnly ? [] : [[1440, 900], [390, 844]]) {
  const page = await browser.newPage();
  watch(page, `still@${w}`);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(800);
  await page.screenshot({ path: `${out}/${w}-90-still-full.png`, fullPage: true });
  console.log(`still@${w}`, 'overflow', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'height', await page.evaluate(() => document.documentElement.scrollHeight));
  await page.close();
}
await browser.close();
if (!stageOnly) {
  const noGl = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-webgl', '--disable-3d-apis'] });
  const page = await noGl.newPage();
  watch(page, 'no-webgl@1440');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(800);
  await shot(page, '1440-91-no-webgl');
  console.log('no-webgl@1440', 'static page shown:', await page.evaluate(() => document.documentElement.classList.contains('is-static') && !!document.querySelector('.st')));
  await noGl.close();
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
