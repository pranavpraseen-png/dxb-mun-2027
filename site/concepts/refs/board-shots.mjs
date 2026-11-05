// Screenshots of the reference board itself at deviceScaleFactor 2, from the shared dev server.
// Run from site/: node scripts/heavy.mjs "node concepts/refs/board-shots.mjs"
// Also checks: horizontal overflow, console errors, the Like toggle + picks bar, the lightbox and the filters.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = process.argv[2] ?? 'http://127.0.0.1:5320/concepts/refs/';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/v2/refs';
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });

async function open(w, h) {
  const page = await browser.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${w}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.evaluate(() => { try { localStorage.removeItem('refs.likes'); } catch {} });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await wait(900);
  return page;
}

async function report(page, w) {
  const o = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight,
    cards: document.querySelectorAll('.card').length, imgs: document.querySelectorAll('.strip img').length,
    broken: [...document.querySelectorAll('.strip img')].filter((i) => i.complete && i.naturalWidth === 0).length,
    wide: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5 && !e.closest('.picks-list')).slice(0, 6).map((e) => `${e.tagName}.${e.className}`),
  }));
  console.log(`${w}px  scrollWidth=${o.sw} innerWidth=${o.iw} overflow=${o.sw > o.iw} height=${o.h} cards=${o.cards} imgs=${o.imgs} broken=${o.broken} past-edge=${o.wide.join(', ') || 'none'}`);
}

// Load every lazy image before a full-page capture.
async function loadAll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    scrollTo(0, 0);
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  });
  await wait(800);
}

// 1440
{
  const page = await open(1440, 900);
  await report(page, 1440);
  // Like three cards (in this order) to prove the numbered picks bar.
  await page.evaluate(() => {
    const likes = [...document.querySelectorAll('.like')];
    [1, 0, 3].forEach((i) => likes[i]?.click());
  });
  await wait(400);
  const picks = await page.evaluate(() => ({ bar: [...document.querySelectorAll('.pick-chip')].map((c) => c.textContent), stored: localStorage.getItem('refs.likes') }));
  console.log('picks bar:', picks.bar.join(' | '), ' stored:', picks.stored);
  await page.screenshot({ path: `${out}/refs-1440-first.png` });
  await loadAll(page);
  await page.addStyleTag({ content: '.top,.picks{position:static !important}' });
  await page.screenshot({ path: `${out}/refs-1440-full.png`, fullPage: true });
  await page.addStyleTag({ content: '.top,.picks{position:sticky !important}' });
  // Lightbox
  await page.evaluate(() => { scrollTo(0, 0); document.querySelector('.strip button')?.click(); });
  await wait(500);
  const lb = await page.evaluate(() => ({ open: document.querySelector('dialog.lb')?.open, img: document.querySelector('.lb-img img')?.naturalWidth }));
  console.log('lightbox:', JSON.stringify(lb));
  await page.screenshot({ path: `${out}/refs-1440-lightbox.png` });
  await page.keyboard.press('ArrowRight');
  await wait(200);
  await page.keyboard.press('Escape');
  await wait(300);
  // Filter: Culture
  await page.evaluate(() => [...document.querySelectorAll('.chip')].find((c) => c.textContent.startsWith('Culture'))?.click());
  await wait(600);
  console.log('culture filter cards:', await page.evaluate(() => document.querySelectorAll('.card').length));
  await page.close();
}

// 390
{
  const page = await open(390, 844);
  await report(page, 390);
  await page.evaluate(() => { const l = [...document.querySelectorAll('.like')]; [0, 2].forEach((i) => l[i]?.click()); scrollTo(0, 0); });
  await wait(400);
  await page.screenshot({ path: `${out}/refs-390-first.png` });
  await page.evaluate(() => document.querySelector('.card')?.scrollIntoView({ block: 'start' }));
  await wait(500);
  await page.screenshot({ path: `${out}/refs-390-card.png` });
  await report(page, 390);
  await page.close();
}

console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
