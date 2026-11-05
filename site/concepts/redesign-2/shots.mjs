// Screenshots and clarity checks for Redesign 2 ("The Resolution"), Dubai Dusk + Official Record pass.
// Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/redesign-2/shots.mjs"
// Modelled on scripts/live-shots.mjs. Uses the shared dev server, never its own. deviceScaleFactor 2, sRGB.
// 1440: first screen, three mid-scroll states, full page with ?still. 390: first screen, full page.
// Prints a fingerprint of the animated state at each stop, plus a clarity audit (blur, shadow, alpha,
// fractional font sizes, image pixel density, horizontal overflow).
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const url = 'http://127.0.0.1:5320/concepts/redesign-2/';
const only = process.argv[2]; // optional: "1440" or "390"
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/v2/redesign-2-dusk';
mkdirSync(out, { recursive: true });
const DSF = 2;
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
const state = (page) => page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const settled = (sel) => {
    const els = [...document.querySelectorAll(sel)];
    const ok = els.filter((c) => { const t = getComputedStyle(c).transform; return (t === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(t)) && getComputedStyle(c).opacity === '1'; }).length;
    return `${ok}/${els.length}`;
  };
  return {
    y: Math.round(scrollY),
    photoClip: q('.ts-photo')?.style.clipPath || '-',
    band: q('.ts-band') ? getComputedStyle(q('.ts-band')).clipPath : '-',
    statementChars: settled('.ts-statement .ch'),
    plateScale: q('.plate-scale span')?.textContent,
    clauseChars: settled('.cl-fact [data-char]'),
    platesStanding: (() => { const c = [...document.querySelectorAll('.np-card')]; return `${c.filter((e) => e.getBoundingClientRect().height / e.offsetHeight > 0.97).length}/${c.length}`; })(),
    wallFlat: !!q('.wall-grid.is-flat'),
    nav: q('.mast-nav a.is-on')?.textContent ?? '-',
  };
});
// Clarity audit over the whole document.
const audit = (page) => page.evaluate(() => {
  const all = [...document.querySelectorAll('body *')];
  const alphaOf = (c) => {
    if (!c || c === 'transparent') return 0;
    let m = c.match(/rgba\([^)]*,\s*([\d.]+)\)/); if (m) return +m[1];
    m = c.match(/\/\s*([\d.]+%?)\s*\)/); if (m) return m[1].endsWith('%') ? parseFloat(m[1]) / 100 : +m[1];
    return 1;
  };
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const fx = [], alpha = [], fonts = new Set(), dim = [];
  for (const el of all) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
    if (cs.filter !== 'none') fx.push(`${tag} filter:${cs.filter}`);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') fx.push(`${tag} backdrop:${cs.backdropFilter}`);
    if (cs.boxShadow !== 'none') fx.push(`${tag} box-shadow:${cs.boxShadow.slice(0, 60)}`);
    if (cs.textShadow !== 'none') fx.push(`${tag} text-shadow`);
    for (const p of ['color', 'backgroundColor']) { const a = alphaOf(cs[p]); if (a > 0 && a < 1) alpha.push(`${tag} ${p}:${cs[p]}`); }
    if (parseFloat(cs.borderTopWidth) > 0) { const a = alphaOf(cs.borderTopColor); if (a > 0 && a < 1) alpha.push(`${tag} border:${cs.borderTopColor}`); }
    if (cs.opacity !== '1' && cs.opacity !== '0') dim.push(`${tag} opacity:${cs.opacity}`);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText && !Number.isInteger(parseFloat(cs.fontSize))) fonts.add(`${tag} ${cs.fontSize}`);
  }
  const imgs = [...document.images].filter(vis).map((im) => {
    const r = im.getBoundingClientRect(), cs = getComputedStyle(im);
    const k = cs.objectFit === 'cover' ? Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight) : r.width / im.naturalWidth;
    return `${im.naturalWidth}x${im.naturalHeight} box ${Math.round(r.width)}x${Math.round(r.height)} css, drawn at ${(k * devicePixelRatio).toFixed(3)} device px per source px (<= 1 is sharp)`;
  });
  return {
    effects: fx.slice(0, 12), effectsCount: fx.length,
    alpha: alpha.slice(0, 12), alphaCount: alpha.length,
    partialOpacity: dim.slice(0, 12), partialOpacityCount: dim.length,
    fractionalFonts: [...fonts].slice(0, 12), fractionalFontsCount: fonts.size,
    images: imgs, canvases: document.querySelectorAll('canvas').length,
    fontsLoaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style} ${f.weight}`).filter((v, i, a) => a.indexOf(v) === i),
  };
});
const overflowCheck = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
const top = (page, sel, dy = 0) => page.evaluate((s, d) => document.querySelector(s).getBoundingClientRect().top + scrollY + d, sel, dy);

const sizes = [[1440, 900], [390, 844]].filter(([w]) => !only || String(w) === only);
for (const [w, h] of sizes) {
  const tag = `r2@${w}`;
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: DSF });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }); // warm the dev server's module cache first
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(3600);
  await page.screenshot({ path: `${out}/${w}-01-first.png` });
  console.log(tag, 'first', JSON.stringify(await state(page)));
  console.log(tag, 'audit first screen', JSON.stringify(await audit(page), null, 1));
  const overflow = [await overflowCheck(page)];

  const ts = await page.evaluate(() => { const t = document.querySelector('.ts'); return { top: t.offsetTop, len: t.offsetHeight - innerHeight }; });
  const resTop = await top(page, '.res-grid', -64 - 20);
  const resLen = await page.evaluate(() => document.querySelector('.res-grid').offsetHeight - innerHeight * 0.55);
  const stops = w >= 1024
    ? [
        ['10-title-end', ts.top + ts.len * 0.97],
        ['11-resolution-p60', resTop + resLen * 0.6],
        ['12-committees-standing', await top(page, '.wall-grid', -120)],
      ]
    : [['10-title-end', ts.top + ts.len * 0.97]];
  for (const [name, y] of stops) {
    await scrollTo(page, Math.round(y));
    await wait(2600);
    await page.screenshot({ path: `${out}/${w}-${name}.png` });
    console.log(tag, name, JSON.stringify(await state(page)));
    overflow.push(await overflowCheck(page));
  }
  if (w >= 1024) console.log(tag, 'audit after scroll', JSON.stringify(await audit(page), null, 1));
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.close();

  const still = await browser.newPage();
  watch(still, tag + '(still)');
  await still.setViewport({ width: w, height: h, deviceScaleFactor: DSF });
  await still.goto(url + '?still', { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(1800);
  overflow.push(await overflowCheck(still));
  console.log(tag, 'audit still', JSON.stringify(await audit(still), null, 1));
  await still.screenshot({ path: `${out}/${w}-90-full-still.png`, fullPage: true });
  const stillH = await still.evaluate(() => document.documentElement.scrollHeight);
  await still.close();
  console.log(`${tag}: overflow=${overflow.join(',')} height=${height}px (${(height / h).toFixed(1)} screens), still height=${stillH}px`);
}
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
await browser.close();
