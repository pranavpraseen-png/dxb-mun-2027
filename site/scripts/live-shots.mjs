// Screenshots of the deployed site: node scripts/live-shots.mjs [baseUrl]
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';
const base = process.argv[2] ?? 'https://dxbmun-2027.vercel.app/';
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = browsers.find((p) => existsSync(p));
const out = 'shots/live';
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars'] });
const errors = [];
for (const [name, path] of [['website', ''], ['delegate', 'portal/'], ['secretariat', 'admin/'], ['chair', 'chair/']]) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage();
    page.on('console', (m) => m.type() === 'error' && errors.push(`${name}@${w}: ${m.text()}`));
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(base + path, { waitUntil: 'networkidle2', timeout: 90000 });
    await new Promise((r) => setTimeout(r, 4000));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await page.screenshot({ path: `${out}/${name}-${w}.png` });
    console.log(`${name}-${w}.png  overflow=${overflow}`);
    await page.close();
  }
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
