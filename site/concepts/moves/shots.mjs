// Screenshots for the motion-moves page. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/moves/shots.mjs"
// 1440: first screen, 3 mid-scroll states (globe mid-flight, nameplates seated, dusk half set), full page (?still).
// 390: first screen. deviceScaleFactor 2, sRGB. Prints overflow and console errors.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/moves/';
const only = process.argv[2]; // optional: run only the 1440 states whose name contains this (e.g. "photo")
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = browsers.find((p) => existsSync(p));
const out = 'shots/v2/moves';
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath, headless: true, protocolTimeout: 240000,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const info = (page) => page.evaluate(() => ({ y: Math.round(scrollY), overflow: document.documentElement.scrollWidth > innerWidth, h: document.documentElement.scrollHeight }));
const open = async (w, h, q = '') => {
  const page = await browser.newPage();
  watch(page, `${w}${q}`);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: w < 500, hasTouch: w < 500 });
  await page.goto(url + q, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await wait(2500);
  return page;
};

// 1440 motion
{
  const page = await open(1440, 900, '?nolenis');
  if (!only) await page.screenshot({ path: `${out}/1440-00-first.png` });
  console.log('1440-00-first', JSON.stringify(await info(page)));
  for (const [name, id, f, ms] of [
    ['01-globe-midflight', 'demo-globe', 0.62, 3500],
    ['02-plates-seated', 'demo-flip', 0, 3500],
    ['03-dusk-setting', 'demo-dusk', 0.55, 3000],
    ['04-dusk-start', 'demo-dusk', 0.05, 2500],
    ['05-slate', 'demo-scramble', 0, 2500],
    ['06-clauses', 'demo-clauses', 0, 2500],
    ['07-photo', 'demo-photo', 0, 3000],
    ['08-vt-nav', 'demo-vt', 0, 1500],
    ['09-magnetic', 'demo-magnetic', 0, 1500],
    ['10-catalogue', 'catalogue', 0, 1500],
  ].filter(([n]) => !only || n.includes(only))) {
    await page.evaluate((id, f) => {
      if (!['demo-globe', 'demo-dusk'].includes(id)) { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + 40); return; }
      window.__moves.at(id, f);
    }, id, f);
    await wait(ms);
    // Interactions: smear the photo mid-move, switch a View-Transition tab, hover the magnet, like two items.
    if (id === 'demo-photo') {
      const b = await page.$eval('.photo-frame', (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
      for (let k = 0; k <= 12; k++) await page.mouse.move(b.x + b.w * (0.25 + k * 0.04), b.y + b.h * 0.5, { steps: 1 });
      // Keep the pointer moving (synthetic events, 60 Hz) while the screenshot is taken, so the smear is caught mid-motion.
      await page.evaluate(() => {
        const el = document.querySelector('.photo-frame'); const r = el.getBoundingClientRect(); let k = 0;
        const t = setInterval(() => {
          const x = r.left + r.width * (0.3 + 0.4 * ((k * 0.02) % 1)), y = r.top + r.height * (0.45 + 0.08 * Math.sin(k / 6));
          el.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true, pointerType: 'mouse' })); k++;
          if (k > 90) clearInterval(t);
        }, 16);
      });
      await wait(500);
      // Proof the WebGL layer is live: canvas backing size, then a moving frame vs a settled frame of the photo.
      const clip = await page.$eval('.photo-frame', (el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: Math.min(r.height, innerHeight - r.top - 70) }; });
      const dims = await page.$eval('.photo-frame canvas', (c) => [c.width, c.height, c.clientWidth, c.clientHeight]).catch(() => null);
      const moving = await page.screenshot({ clip, path: `${out}/1440-07b-photo-moving.png` });
      await wait(2500);
      const settled = await page.screenshot({ clip, path: `${out}/1440-07c-photo-settled.png` });
      await page.$eval('.photo-frame img', (el) => { el.style.visibility = 'hidden'; });
      await page.screenshot({ clip, path: `${out}/1440-07d-photo-canvas-only.png` });
      await page.$eval('.photo-frame img', (el) => { el.style.visibility = ''; });
      console.log('photo canvas', JSON.stringify(dims), 'moving differs from settled:', !moving.equals(settled));
    }
    if (id === 'demo-vt') { await page.click('.vt-nav li:nth-child(3) button'); await wait(1200); }
    if (id === 'demo-magnetic') {
      const b = await page.$eval('.mag-btn', (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await page.mouse.move(b.x + 90, b.y + 50, { steps: 6 }); await wait(700);
    }
    if (id === 'catalogue') {
      await page.evaluate(() => { document.querySelector('#demo-globe .like')?.click(); document.querySelector('#move-vt-nav .like')?.click(); document.querySelector('#demo-flip .like')?.click(); });
      await wait(400);
    }
    await page.screenshot({ path: `${out}/1440-${name}.png` });
    console.log(`1440-${name}`, JSON.stringify(await info(page)));
  }
  await page.close();
}
// 1440 full page, still
if (!only) {
  const page = await open(1440, 900, '?still');
  await wait(1500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  try {
    await page.screenshot({ path: `${out}/1440-full-still.png`, fullPage: true });
    console.log('1440-full-still', JSON.stringify({ ...(await info(page)), dsf: 2 }));
  } catch (e) {
    console.log('full page at dsf 2 failed (' + e.message + '), retrying at dsf 1, height ' + h);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await wait(1000);
    await page.screenshot({ path: `${out}/1440-full-still.png`, fullPage: true });
  }
  await page.close();
}
// 390 first screen (+ overflow check deeper down)
if (!only) {
  const page = await open(390, 844, '?nolenis');
  await page.screenshot({ path: `${out}/390-00-first.png` });
  console.log('390-00-first', JSON.stringify(await info(page)));
  for (const [name, id, f] of [['01-globe', 'demo-globe', 0.95], ['02-dusk', 'demo-dusk', 0.1]]) {
    await page.evaluate((id, f) => window.__moves.at(id, f), id, f);
    await wait(3000);
    await page.screenshot({ path: `${out}/390-${name}.png` });
    console.log(`390-${name}`, JSON.stringify(await info(page)));
  }
  for (const id of ['demo-globe', 'demo-flip', 'demo-photo', 'demo-vt', 'catalogue']) {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id);
    await wait(900);
    const o = await info(page);
    if (o.overflow) console.log(`390 overflow at ${id}`, JSON.stringify(o));
  }
  console.log('390 overflow scan done', JSON.stringify(await info(page)));
  await page.close();
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
