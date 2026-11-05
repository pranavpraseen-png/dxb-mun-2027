// Screenshot + audit one concept with the locally installed Chrome (or Edge).
// Usage: node scripts/shots.mjs <concept-id> [baseUrl]
//   baseUrl defaults to http://127.0.0.1:5320 (npm run dev). Start the dev server first.
// Writes shots/<id>/<view>-<width>.png and prints an audit: console errors, horizontal overflow,
// tap targets smaller than 44px, images without alt, and whether ?still / reduced motion renders.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const id = process.argv[2];
const base = (process.argv.slice(3).find((a) => !a.startsWith('--')) || 'http://127.0.0.1:5320').replace(/\/$/, '');
if (!id) { console.error('usage: node scripts/shots.mjs <concept-id> [baseUrl]'); process.exit(1); }

const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = browsers.find((p) => existsSync(p));
const out = `shots/${id}`;
mkdirSync(out, { recursive: true });

const views = [
  { name: 'home', hash: '#/' },
  { name: 'timer', hash: '#/timer' },
  { name: 'portal', hash: '#/portal' },
  { name: 'chair', hash: '#/chair' },
];
const widths = [
  { w: 1440, h: 900, mobile: false },
  { w: 390, h: 844, mobile: true },
];

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars'] });
const problems = [];

// --motion: check the signature scroll effect. Viewport shots of the homepage WITHOUT ?still,
// taken at evenly spaced scroll positions (1440 and 390), saved as shots/<id>/motion-<width>-<step>.png.
if (process.argv.includes('--motion')) {
  for (const s of widths) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1, isMobile: s.mobile, hasTouch: s.mobile });
    await page.goto(`${base}/concepts/${id}/index.html#/`, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const y = Math.round((total * i) / steps);
      // Scroll in small increments so scroll-linked libraries (Lenis, ScrollTrigger) see real scroll events.
      await page.evaluate(async (target) => {
        const start = scrollY; const n = 12;
        for (let k = 1; k <= n; k++) { window.scrollTo(0, start + ((target - start) * k) / n); await new Promise((r) => requestAnimationFrame(r)); }
      }, y);
      await new Promise((r) => setTimeout(r, 900));
      await page.screenshot({ path: `${out}/motion-${s.w}-${String(i).padStart(2, '0')}.png` });
    }
    console.log(`motion ${s.w}: ${steps + 1} viewport shots, page height ${total + s.h}, errors=${errors.length}${errors.length ? ' ' + errors[0] : ''}`);
    await page.close();
  }
  await browser.close();
  console.log(`Motion shots in site/${out}/motion-*.png`);
  process.exit(0);
}
for (const v of views) {
  for (const s of widths) {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1, isMobile: s.mobile, hasTouch: s.mobile });
    const url = `${base}/concepts/${id}/index.html?still${v.hash}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1200));
    const audit = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - window.innerWidth;
      const small = [...document.querySelectorAll('a,button,[role=button],input,select,textarea,[role=tab],[role=option]')]
        .filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && (r.width < 44 || r.height < 44) && !(e.tagName === 'A' && cs.display === 'inline'); })
        .slice(0, 8).map((e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
      const noAlt = [...document.querySelectorAll('img:not([alt])')].length;
      const h1 = document.querySelectorAll('h1').length;
      return { overflow, small, noAlt, h1, height: doc.scrollHeight };
    });
    await page.screenshot({ path: `${out}/${v.name}-${s.w}.png`, fullPage: true, captureBeyondViewport: true });
    const line = `${v.name.padEnd(6)} ${String(s.w).padEnd(5)} height=${audit.height} overflowX=${audit.overflow} h1=${audit.h1} imgNoAlt=${audit.noAlt} errors=${errors.length}`;
    console.log(line);
    if (audit.overflow > 0) problems.push(`${v.name}@${s.w}: horizontal overflow ${audit.overflow}px`);
    if (errors.length) problems.push(`${v.name}@${s.w}: console errors: ${errors.slice(0, 3).join(' | ')}`);
    if (audit.small.length && s.mobile) problems.push(`${v.name}@${s.w}: small tap targets: ${audit.small.join('; ')}`);
    if (audit.noAlt) problems.push(`${v.name}@${s.w}: ${audit.noAlt} img without alt`);
    await page.close();
  }
}
await browser.close();
console.log(problems.length ? '\nPROBLEMS:\n- ' + problems.join('\n- ') : '\nNo problems found.');
console.log(`Screenshots in site/${out}/ (full-page, ?still mode).`);
