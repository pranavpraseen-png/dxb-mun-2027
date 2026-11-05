// C1 Night Lab + T1 pass: screenshots of the three dashboards at 1440 and 390, deviceScaleFactor 2, sRGB.
// Run from site/: node scripts/heavy.mjs "node <this file>"   Uses the shared dev server (http://127.0.0.1:5320).
// Writes shots/v2/nightlab-dashboards/{delegate,chair,secretariat}/<name>-<w>.png and prints per shot: overflow, console
// errors, fonts in use, and a clarity audit (blurred shadows, backdrop filters, translucent text/fills).
import { createRequire } from 'node:module';
import { mkdirSync, existsSync } from 'node:fs';
const SITE = 'C:/Users/praseen/Desktop/IHS-MUN-HUB/site/';
const require = createRequire(SITE + 'package.json');
const puppeteer = (await import('file:///' + require.resolve('puppeteer-core').split('\\').join('/'))).default;

const base = 'http://127.0.0.1:5320';
const out = SITE + 'shots/v2/nightlab-dashboards/';
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 180000, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--no-first-run', '--disable-extensions'] });
const report = [];
const errors = [];

async function open(w) {
  const page = await browser.newPage();
  const mobile = w < 768;
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${page.__tag}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${page.__tag}: ${String(e)}`));
  await page.setViewport({ width: w, height: mobile ? 844 : 900, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
  return page;
}
async function settle(page, ms = 700) {
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(ms);
}
async function signIn(page, path, email, waitSel = 'nav[aria-label=Main]') {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#email, nav[aria-label=Main], main', { timeout: 15000 });
  await sleep(800);
  if (!(await page.$('#email'))) { await settle(page); return; }
  await page.type('#email', email);
  await page.click('button[type=submit]');
  await page.waitForSelector('#otp', { timeout: 10000 });
  await page.focus('#otp');
  await page.keyboard.type('123456');
  await page.keyboard.press('Enter');
  if (waitSel) await page.waitForSelector(waitSel, { timeout: 15000 }).catch(() => {});
  await settle(page);
}
async function go(page, hash) {
  await page.evaluate((h) => { location.hash = h; window.scrollTo(0, 0); }, hash);
  await settle(page, 900);
}
const clickText = (page, text, sel = 'button') => page.evaluate((t, s) => {
  const el = [...document.querySelectorAll(s)].find((b) => b.textContent.replace(/\s+/g, ' ').trim().toLowerCase().includes(t.toLowerCase()) && !b.disabled);
  if (el) el.click();
  return !!el;
}, text, sel);

/** Overflow, fonts and a clarity audit of everything visible. */
const audit = (page) => page.evaluate(() => {
  const vis = [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('.sr-only'); });
  const alpha = (c) => {
    if (c === 'transparent' || c === 'rgba(0, 0, 0, 0)') return 0;
    const sl = c.match(/\/\s*([\d.]+)(%?)\s*\)$/);
    if (sl) return parseFloat(sl[1]) / (sl[2] ? 100 : 1);
    const m = c.match(/rgba\(([^)]+)\)/);
    if (m) return parseFloat(m[1].split(',')[3]);
    return 1;
  };
  const soft = [];
  const fonts = new Set();
  for (const el of vis) {
    const cs = getComputedStyle(el);
    const tag = `${el.tagName.toLowerCase()}${el.dataset.slot ? `[${el.dataset.slot}]` : ''}`;
    if (cs.backdropFilter && cs.backdropFilter !== 'none') soft.push(`${tag} backdrop-filter`);
    if (cs.filter && /blur/.test(cs.filter)) soft.push(`${tag} filter:${cs.filter}`);
    if (cs.boxShadow !== 'none' && cs.boxShadow.split(/,(?![^(]*\))/).some((s) => { const n = s.replace(/rgba?\([^)]*\)|oklch\([^)]*\)|color\([^)]*\)/g, '').trim().split(/\s+/).filter((x) => /px$/.test(x)).map(parseFloat); return (n[2] ?? 0) > 0; })) soft.push(`${tag} blurred box-shadow`);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      fonts.add(cs.fontFamily.split(',')[0].replace(/['"]/g, '') + ' ' + cs.fontWeight);
      if (alpha(cs.color) < 1) soft.push(`${tag} translucent text ${cs.color}`);
      if (parseFloat(cs.opacity) < 1) soft.push(`${tag} opacity ${cs.opacity}`);
      const fs = parseFloat(cs.fontSize); if (Math.abs(fs - Math.round(fs)) > 0.01) soft.push(`${tag} font-size ${fs}px`);
    }
    const a = alpha(cs.backgroundColor); if (a > 0 && a < 1) soft.push(`${tag} translucent fill ${cs.backgroundColor}`);
  }
  const poke = vis.filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('[data-slot=scroll-area-viewport], .overflow-x-auto, .tbl-scroll, [data-slot=table-container]')).map((el) => el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 40));
  const count = {}; for (const s of soft) count[s] = (count[s] || 0) + 1;
  return { overflow: document.documentElement.scrollWidth > innerWidth + 1, poke: poke.slice(0, 3), soft: Object.entries(count).map(([k, v]) => `${k} x${v}`), fonts: [...fonts] };
});
async function shot(page, dash, name, w, full = true) {
  page.__tag = `${dash}/${name}-${w}`;
  await settle(page, 300);
  const a = await audit(page);
  const pin = full && w < 768;
  if (pin) await page.evaluate(() => {
    const h = document.documentElement.scrollHeight;
    for (const el of document.querySelectorAll('nav[data-nav=tabs]')) { el.dataset.s = el.getAttribute('style') ?? ''; el.style.position = 'absolute'; el.style.top = `${h - el.offsetHeight}px`; el.style.bottom = 'auto'; }
  });
  mkdirSync(out + dash, { recursive: true });
  await page.screenshot({ path: `${out}${dash}/${name}-${w}.png`, fullPage: full });
  if (pin) await page.evaluate(() => { for (const el of document.querySelectorAll('nav[data-nav=tabs]')) el.setAttribute('style', el.dataset.s ?? ''); });
  report.push(`${dash}/${name}-${w}.png overflow=${a.overflow}${a.poke.length ? ' poke=' + a.poke.join(',') : ''}\n    fonts: ${a.fonts.join(' | ')}${a.soft.length ? '\n    soft: ' + a.soft.join('; ') : ''}`);
}

for (const w of [1440, 390]) {
  if (only && only !== String(w)) continue;

  if (!only || true) {
    // ── Delegate ──
    const d = await open(w); d.__tag = `delegate-${w}`;
    await d.goto(`${base}/portal/?demo=new#/now`, { waitUntil: 'networkidle2', timeout: 60000 });
    await d.evaluate(() => sessionStorage.clear());
    await d.reload({ waitUntil: 'networkidle2' });
    await settle(d);
    await shot(d, 'delegate', 'signin', w, false);
    await signIn(d, '/portal/?demo=new#/now', 'delegate1@demo.test', null);
    await d.goto(`${base}/portal/?demo=live#/now`, { waitUntil: 'networkidle2', timeout: 60000 });
    await settle(d, 1200);
    await shot(d, 'delegate', 'now-live-timer', w);
    await shot(d, 'delegate', 'now-live-timer-viewport', w, false);
    await go(d, '#/speakers'); await shot(d, 'delegate', 'speakers', w);
    await go(d, '#/resolutions'); await shot(d, 'delegate', 'resolutions', w);
    // The nameplate (Night Lab sand card) lives in the "My seat" sheet: the seat button in the top bar opens it.
    await go(d, '#/now');
    if (await clickText(d, 'France')) { await sleep(800); await shot(d, 'delegate', 'my-seat-sheet', w, false); await d.keyboard.press('Escape'); await sleep(400); }
    else report.push(`delegate/my-seat-sheet-${w}: seat button not found`);
    if (w < 768) { await go(d, '#/now'); if (await clickText(d, 'More')) { await sleep(700); await shot(d, 'delegate', 'more-sheet', w, false); await d.keyboard.press('Escape'); } }
    await d.close();
  }

  // ── Chair ──
  const c = await open(w); c.__tag = `chair-${w}`;
  await c.goto(`${base}/chair/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await c.evaluate(() => sessionStorage.clear());
  await c.reload({ waitUntil: 'networkidle2' });
  await c.waitForSelector('#email', { timeout: 15000 });
  await settle(c);
  await shot(c, 'chair', 'signin', w, false);
  await signIn(c, '/chair/', 'chair@x.com');
  await go(c, '#/run');
  try {
    if (await c.$('#t-len')) { await c.$eval('#t-len', (e) => { e.scrollIntoView({ block: 'center' }); e.focus(); e.select?.(); }); await c.keyboard.type('1:30'); await c.keyboard.press('Enter'); await sleep(700); }
    const label = await c.$eval('[data-testid=timer-toggle]', (e) => e.textContent);
    if (!/pause/i.test(label)) await c.$eval('[data-testid=timer-toggle]', (e) => e.click());
    await c.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await sleep(5000);
  } catch (e) { report.push(`chair timer step failed: ${String(e).split('\n')[0]}`); }
  await shot(c, 'chair', 'run-timer-running', w);
  await shot(c, 'chair', 'run-timer-running-viewport', w, false);
  await go(c, '#/floor?tab=roll'); await shot(c, 'chair', 'roll-call', w);
  await go(c, '#/floor?tab=vote'); await shot(c, 'chair', 'voting', w);
  await go(c, '#/resolutions'); await shot(c, 'chair', 'resolutions', w);
  // The delegate sees the chair's running timer (same shared demo store).
  if (w === 1440) {
    const d2 = await open(w); d2.__tag = 'delegate-sees-chair-timer';
    await signIn(d2, '/portal/#/now', 'delegate1@demo.test', null);
    await settle(d2, 1500);
    await shot(d2, 'delegate', 'now-chair-timer-viewport', w, false);
    await d2.close();
  }
  await c.close();

  // ── Secretariat ──
  const s = await open(w); s.__tag = `secretariat-${w}`;
  await s.goto(`${base}/admin/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await s.evaluate(() => sessionStorage.clear());
  await s.reload({ waitUntil: 'networkidle2' });
  await s.waitForSelector('#email', { timeout: 15000 });
  await settle(s);
  await shot(s, 'secretariat', 'signin', w, false);
  await signIn(s, '/admin/', 'admin@x.com');
  await shot(s, 'secretariat', 'live-overview', w);
  await go(s, '#/seats'); await shot(s, 'secretariat', 'seats', w);
  await go(s, '#/checkin'); await shot(s, 'secretariat', 'checkin', w);
  await s.close();
}

console.log(report.join('\n'));
console.log(errors.length ? `Console errors (${errors.length}):\n` + [...new Set(errors)].join('\n') : 'No console errors');
await browser.close();
