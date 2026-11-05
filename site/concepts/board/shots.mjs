// Board screenshots at deviceScaleFactor 2 (retina), from the shared dev server.
// Run from site/: node scripts/heavy.mjs "node concepts/board/shots.mjs"
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = process.argv[2] ?? 'http://127.0.0.1:5320/concepts/board/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/v2/board';
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(w, h) {
  const page = await browser.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${w}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await wait(800);
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight, fonts: [...document.fonts].filter((f) => f.status === 'loaded').length }));
  console.log(`${w}px  scrollWidth=${o.sw} innerWidth=${o.iw} overflow=${o.sw > o.iw} height=${o.h} fontsLoaded=${o.fonts}`);
  return page;
}

async function section(page, sel, file) {
  await page.addStyleTag({ content: '.top{position:static !important}' });
  const el = await page.$(sel);
  await el.screenshot({ path: `${out}/${file}` });
  console.log(file);
}

// 1440 desktop
{
  const page = await open(1440, 900);
  await page.screenshot({ path: `${out}/board-1440-first.png` });
  await page.screenshot({ path: `${out}/board-1440-full.png`, fullPage: true });
  await section(page, '#mix', 'board-1440-mix.png');
  await section(page, '#colours', 'board-1440-colours.png');
  await section(page, '#fonts', 'board-1440-fonts.png');
  // Prove the mix control works: palette 3 + fonts 4, then palette 6 + fonts 5.
  for (const [p, f] of [[3, 4], [6, 5], [4, 6]]) {
    await page.evaluate((p, f) => {
      const sets = document.querySelectorAll('#mix fieldset');
      sets[0].querySelectorAll('input')[p - 1].click();
      sets[1].querySelectorAll('input')[f - 1].click();
    }, p, f);
    await wait(300);
    await section(page, '#mix', `board-1440-mix-p${p}-f${f}.png`);
  }
  console.log('board-1440-*.png');
  await page.close();
}

// 390 phone
{
  const page = await open(390, 844);
  await page.screenshot({ path: `${out}/board-390-first.png` });
  await page.screenshot({ path: `${out}/board-390-full.png`, fullPage: true });
  await section(page, '#palette-un', 'board-390-palette-card.png');
  await section(page, '#font-record', 'board-390-font-card.png');
  const wide = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).slice(0, 8).map((e) => `${e.tagName}.${e.className}`));
  console.log('elements past 390:', wide.length ? wide.join(', ') : 'none');
  await page.close();
}

console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
