// Screenshots of the chair dialogs (Add file, Approve and number) at 1440 and 390.
// Run from site/: node scripts/heavy.mjs "node chair/scripts/dialog-shots.mjs"
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars'] });
const errors = [];
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile });
  await page.goto('http://127.0.0.1:5320/chair/', { waitUntil: 'networkidle0' });
  await page.type('#email', 'chair@x.com');
  await page.click('button[type=submit]');
  await page.waitForSelector('#otp');
  await page.type('#otp', '123456');
  await page.keyboard.press('Enter');
  await page.waitForSelector('nav[aria-label=Main]');
  for (const [hash, label, name] of [['#/docs', 'Add file', 'dialog-add-file'], ['#/resolutions', 'Approve', 'dialog-approve']]) {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await sleep(1200);
    const el = (await page.evaluateHandle((t) => [...document.querySelectorAll('main button')].find((b) => b.textContent.trim().toLowerCase() === t.toLowerCase()) ?? null, label)).asElement();
    if (!el) { console.log(`${name}-${w}: no "${label}" button`); continue; }
    await el.click();
    await sleep(900);
    const box = await page.$eval('[data-slot=dialog-popup]', (p) => {
      const r = p.getBoundingClientRect(); const f = p.querySelector('[data-slot=dialog-footer]')?.getBoundingClientRect();
      return { popupBottom: Math.round(r.bottom), footerBottom: f ? Math.round(f.bottom) : null };
    });
    console.log(`${name}-${w}: footer inside popup = ${box.footerBottom !== null && box.footerBottom <= box.popupBottom + 1}`);
    await page.screenshot({ path: `shots/v2/chair/${name}-${w}.png` });
    await page.keyboard.press('Escape');
    await sleep(500);
  }
  await page.close();
}
console.log(errors.length ? 'errors: ' + errors.join(' | ') : 'No console errors');
await browser.close();
