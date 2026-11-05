// Screenshots of redesign-3 ("On Air") in the Dubai Dusk + Official Record theme, modelled on scripts/live-shots.mjs.
// Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/redesign-3/shots.mjs"
// deviceScaleFactor 2 and an sRGB colour profile (site/THEME.md clarity rules).
// 1440: the first screen, 3 mid-scroll states, the full page (?still). 390: the first screen, the full page (?still).
// Reports horizontal overflow (and the widest offenders), the globe's canvas backing store against its CSS size x DPR,
// the hero photo's rendered width, any blur/backdrop-filter/alpha left in computed styles, and console errors.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/redesign-3/';
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = browsers.find((p) => existsSync(p));
const out = 'shots/v2/redesign-3-dusk';
mkdirSync(out, { recursive: true });
const DPR = 2;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath, headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const scrollTo = async (page, y) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await wait(250);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
};
const overflow = (page) => page.evaluate(() => ({
  over: document.documentElement.scrollWidth > innerWidth,
  wide: [...document.querySelectorAll('body *')]
    .filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('.ticker, .wipe, .pgm-view') && getComputedStyle(el).position !== 'fixed')
    .slice(0, 6).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`),
}));
// Clarity audit: canvas backing vs CSS x DPR, hero photo width, leftover blur / backdrop-filter / alpha colours / blurred shadows.
const audit = (page) => page.evaluate(() => {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const canvases = [...document.querySelectorAll('canvas')].map((c) => {
    const r = c.getBoundingClientRect();
    return `${c.className || 'canvas'} ${c.width}x${c.height} for css ${r.width.toFixed(1)}x${r.height.toFixed(1)} (want ${Math.floor(r.width * dpr)}x${Math.floor(r.height * dpr)})`;
  });
  const img = document.querySelector('.pgm-photo-in');
  const photo = img ? `${img.getBoundingClientRect().width.toFixed(0)}css px wide` : 'n/a';
  const bad = new Set();
  const alpha = /rgba?\([^)]*,\s*0?\.\d+\)|\/\s*0?\.\d+\)/;
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    const tag = `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0].slice(0, 24)}`;
    if (s.backdropFilter && s.backdropFilter !== 'none') bad.add(`backdrop ${tag}`);
    if (s.filter && s.filter !== 'none') bad.add(`filter ${tag}`);
    if (s.boxShadow && s.boxShadow !== 'none' && /\d+px \d+px [1-9]/.test(s.boxShadow.replace(/rgba?\([^)]*\)|oklch\([^)]*\)/g, ''))) bad.add(`blur-shadow ${tag}`);
    for (const p of ['color', 'backgroundColor', 'borderTopColor', 'borderLeftColor']) {
      const v = s[p];
      if (alpha.test(v) && !/,\s*0\)$/.test(v) && !/\/\s*0\)$/.test(v)) bad.add(`alpha ${p} ${tag} ${v}`);
    }
  }
  const fonts = [...new Set([...document.querySelectorAll('body *')].map((el) => getComputedStyle(el).fontFamily.split(',')[0].trim()))];
  const theme = ['"Public Sans Variable"', '"IBM Plex Mono"', '"Source Serif 4 Variable"'];
  const stray = [...document.querySelectorAll('body *')].filter((el) => !theme.includes(getComputedStyle(el).fontFamily.split(',')[0].trim()))
    .slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ')[0]}=${getComputedStyle(el).fontFamily.split(',')[0]}`);
  if (stray.length) fonts.push(`(non-theme: ${stray.join(' ')})`);
  return { canvases, photo, bad: [...bad].slice(0, 20), fonts };
});
const trk = (page, p) => page.evaluate((p) => {
  const t = document.querySelector('.trk');
  return t.offsetTop + (t.offsetHeight - innerHeight) * p;
}, p);
const top = (page, id, off = 56) => page.evaluate((id, off) => document.getElementById(id).getBoundingClientRect().top + scrollY - off, id, off);

const report = [];
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const tag = `@${w}`;
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: DPR });
  await page.goto(url, { waitUntil: 'load', timeout: 150000 });
  await wait(w === 1440 ? 5900 : 5800);
  if (w === 1440) await page.mouse.move(980, 380);
  await wait(900);
  await page.screenshot({ path: `${out}/${w}-1-first.png` });
  const o1 = await overflow(page);

  const states = w === 1440
    ? [['2-tracker-locked', () => trk(page, 0.24), 3500],
       ['3-committees', () => top(page, 'committees', -120), 2600],
       ['4-desk', () => top(page, 'timer', 120), 2200]]
    : [['2-tracker-locked', () => trk(page, 0.3), 3800]];
  let a = null;
  for (const [name, y, ms] of states) {
    await scrollTo(page, await y());
    await wait(ms);
    if (name.includes('tracker')) a = await audit(page);
    // 390 visits the tracker only for the canvas audit; the brief asks for its first screen and full page only.
    if (w === 1440) await page.screenshot({ path: `${out}/${w}-${name}.png` });
  }
  const o2 = await overflow(page);
  await page.close();

  const still = await browser.newPage();
  watch(still, tag + '(still)');
  await still.setViewport({ width: w, height: h, deviceScaleFactor: DPR });
  await still.goto(url + '?still', { waitUntil: 'load', timeout: 150000 });
  await wait(2500);
  const o3 = await overflow(still);
  const sh = await still.evaluate(() => document.documentElement.scrollHeight);
  const a2 = await audit(still);
  // The headless compositor wraps a single capture past 8192 device px (it repeats the top of the page), so at
  // deviceScaleFactor 2 the full page is saved in parts of at most 4000 CSS px: -a, -b, -c ...
  const PART = 4000;
  for (let y = 0, i = 0; y < sh; y += PART, i++) {
    await still.screenshot({ path: `${out}/${w}-9-full-still-${'abcdefgh'[i]}.png`, clip: { x: 0, y, width: w, height: Math.min(PART, sh - y) }, captureBeyondViewport: true });
  }
  await still.close();
  const wide = [...new Set([...o1.wide, ...o2.wide, ...o3.wide])];
  report.push(`${tag}: overflow first=${o1.over} mid=${o2.over} still=${o3.over}${wide.length ? ' wide: ' + wide.join(' | ') : ''} still-height=${sh}px`);
  report.push(`  canvas (live): ${a?.canvases.join('; ') || 'none'}`);
  report.push(`  canvas (still): ${a2.canvases.join('; ') || 'none'}`);
  report.push(`  hero photo: ${a2.photo}`);
  report.push(`  fonts in use: ${a2.fonts.join(', ')}`);
  report.push(`  clarity flags: ${[...new Set([...(a?.bad ?? []), ...a2.bad])].join(' | ') || 'none'}`);
}

// Nav fit check at the narrowest width that shows the full channel row (no screenshot).
{
  const page = await browser.newPage();
  watch(page, '@1100');
  await page.setViewport({ width: 1100, height: 800, deviceScaleFactor: 1 });
  await page.goto(url + '?still', { waitUntil: 'load', timeout: 150000 });
  await wait(1500);
  const fit = await page.evaluate(() => {
    const nav = document.querySelector('.bar-nav');
    return nav ? `${nav.scrollWidth}/${nav.clientWidth}` : 'n/a';
  });
  const o = await overflow(page);
  report.push(`@1100: overflow=${o.over} nav content/box=${fit}`);
  await page.close();
}
console.log(report.join('\n'));
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
