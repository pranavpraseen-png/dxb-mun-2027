// Spotlight check with real mouse moves. Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/final/spot-check.mjs"
// Loads the page at 800x739 (the coordinator's size) and 1440x900, waits for the automatic pass to finish (it must
// leave no window), moves the mouse in steps across the hero headline and screenshots two positions (the window must
// be in two different places), then moves the mouse off the hero (the window must close).
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/final/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/v2/final';
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath, headless: true,
  args: ['--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
const read = (page) => page.evaluate(() => {
  const s = document.querySelector('.ident-spot');
  const v = (k) => Math.round(parseFloat(getComputedStyle(s).getPropertyValue(k)) * 10) / 10;
  const b = document.querySelector('.ident-fill').getBoundingClientRect();
  return { r: v('--r'), mx: v('--mx'), my: v('--my'), line: getComputedStyle(document.querySelector('.ident-line')).opacity,
    box: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] };
});
const stepTo = async (page, x, y, steps = 12) => { await page.mouse.move(x, y, { steps }); await wait(900); };

for (const [w, h] of [[800, 739], [1440, 900]]) {
  const page = await browser.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${w}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(6000); // the pass starts 1.7s after mount and is over by about 4.4s
  const after = await read(page);
  console.log(`${w}: after the automatic pass`, JSON.stringify(after));
  await page.screenshot({ path: `${out}/${w}-50-after-pass.png` });

  const [l, t, r, b] = after.box;
  const midY = Math.round((t + b) / 2);
  await stepTo(page, l + 10, midY, 4);
  await stepTo(page, Math.round(l + (r - l) * 0.22), midY); // over "DXB"
  const a = await read(page);
  await page.screenshot({ path: `${out}/${w}-51-spot-dxb.png` });
  console.log(`${w}: mouse at ${Math.round(l + (r - l) * 0.22)},${midY} (over DXB)`, JSON.stringify(a));
  await stepTo(page, Math.round(l + (r - l) * 0.8), Math.round(t + (b - t) * 0.35), 20); // over "MUN"
  const m = await read(page);
  await page.screenshot({ path: `${out}/${w}-52-spot-mun.png` });
  console.log(`${w}: mouse at ${Math.round(l + (r - l) * 0.8)},${Math.round(t + (b - t) * 0.35)} (over MUN)`, JSON.stringify(m));
  if (w === 800) { // the coordinator's hover point, over the left of "MUN" at this size
    await stepTo(page, 330, 320, 10);
    const c = await read(page);
    await page.screenshot({ path: `${out}/${w}-54-spot-330x320.png` });
    console.log(`${w}: mouse at 330,320`, JSON.stringify(c));
  }
  // In the hero but away from the letters (the window still follows; the hero section is the listener).
  await stepTo(page, Math.round(w * 0.9), Math.round(h * 0.75), 10);
  console.log(`${w}: mouse in the hero, off the letters`, JSON.stringify(await read(page)));
  // Off the hero section: over the top bar.
  await stepTo(page, Math.round(w / 2), 20, 8);
  const off = await read(page);
  console.log(`${w}: mouse over the top bar`, JSON.stringify(off));
  await page.screenshot({ path: `${out}/${w}-53-spot-left.png` });
  await page.close();
}
// Touch device: only the automatic pass; a tap on the headline must not open a window.
{
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`touch: ${e.message}`));
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  const fine = await page.evaluate(() => matchMedia('(any-pointer: fine)').matches);
  await wait(6000);
  const after = await read(page);
  const [l, t, r, b] = after.box;
  await page.touchscreen.tap(Math.round((l + r) / 2), Math.round((t + b) / 2));
  await wait(900);
  console.log(`touch 390: any-pointer:fine=${fine}; after pass`, JSON.stringify(after), 'after tap', JSON.stringify(await read(page)));
  await page.close();
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
