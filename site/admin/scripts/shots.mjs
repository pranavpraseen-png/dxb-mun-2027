// Secretariat dashboard (v2, demo): screenshots of every page at 1440 and 390, an overflow + console audit,
// and a short scripted run (assign a seat, add seats, check in, post an announcement).
// Usage (from site/): node scripts/heavy.mjs "node admin/scripts/shots.mjs [baseUrl]"   (default: the shared server)
// Writes shots/v2/secretariat/<page>-<width>.png.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const base = (process.argv[2] || 'http://127.0.0.1:5320').replace(/\/$/, '');
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const out = 'shots/v2/secretariat';
mkdirSync(out, { recursive: true });
const PAGES = ['live', 'applicants', 'seats', 'committees', 'awards', 'schedule', 'deadlines', 'announcements', 'documents', 'checkin', 'team'];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (ok, what) => { log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failures++; };

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--no-first-run', '--disable-extensions'] });
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

async function size(w) {
  const mobile = w < 768;
  await page.setViewport({ width: w, height: mobile ? 844 : 900, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await sleep(300);
}
async function settle() {
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 8000 }).catch(() => {});
  await sleep(450);
}
async function go(hash) {
  await page.evaluate((h) => { location.hash = h; window.scrollTo(0, 0); }, hash);
  await settle();
}
async function overflow() {
  return page.evaluate(() => {
    const poke = [...document.querySelectorAll('main *, header *, nav *')].filter((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || el.closest('[data-slot=table-container], .tbl-scroll')) return false;
      return r.right > window.innerWidth + 1;
    }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
    return { doc: document.documentElement.scrollWidth > window.innerWidth + 1, poke: poke.slice(0, 3) };
  });
}
async function shot(name, w, full = true) {
  const o = await overflow();
  await page.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: full });
  check(!o.doc && o.poke.length === 0, `${name}-${w}.png  no horizontal overflow${o.poke.length ? ` (${o.poke.join(', ')})` : ''}`);
}
const clickText = (sel, text) => page.evaluate((sel, text) => {
  const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text) && e.offsetParent !== null);
  if (el) el.click();
  return !!el;
}, sel, text);

// Sign in (the demo: any email with "admin" is core secretariat; code 123456).
await size(1440);
await page.goto(`${base}/admin/?demo=live`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForSelector('#email', { timeout: 20000 });
await shot('signin', 1440, false);
await size(390); await shot('signin', 390, false); await size(1440);
await page.type('#email', 'admin@x.com');
await page.click('button[type=submit]');
await page.waitForSelector('#otp', { timeout: 10000 });
await page.type('#otp', '123456');
await sleep(300);
if (await page.$('#otp')) await page.click('button[type=submit]').catch(() => {});
await page.waitForSelector('[data-nav=sidebar]', { timeout: 15000 });
check(true, 'signed in as admin@x.com');
await settle();

for (const w of [1440, 390]) {
  await size(w);
  for (const p of PAGES) {
    if (only && !only.includes(p)) continue;
    await go(`#/${p}`);
    await shot(p, w, w > 768);
  }
}

// Scripted run, at 1440.
await size(1440);
if (!only) {
  // Check-in result card.
  await go('#/checkin?day=3');
  await page.type('#checkin-code', 'DEMO-0001');
  await page.keyboard.press('Enter');
  await sleep(700);
  const res = await page.evaluate(() => document.querySelector('[aria-live=assertive]')?.textContent ?? '');
  check(/checked in|not checked in/i.test(res), `check-in shows a result card: "${res.slice(0, 60)}"`);
  await shot('checkin-result', 1440, false);
  // A viewport change to a phone reloads the page, so check in again (the second scan shows "Already checked in").
  await size(390); await page.waitForSelector('#checkin-code', { timeout: 15000 }); await settle();
  await page.type('#checkin-code', 'DEMO-0001'); await page.keyboard.press('Enter'); await sleep(700);
  await page.evaluate(() => document.querySelector('[aria-live=assertive]')?.scrollIntoView());
  await shot('checkin-result', 390, false); await size(1440);

  // Add seats to UNHRC by pasting a list, then assign a delegate to one of them.
  await go('#/seats');
  const unhrc = await page.evaluate(() => [...document.querySelectorAll('[data-slot=select-trigger]')].length);
  await page.click('[data-slot=select-trigger]'); await sleep(400);
  await clickText('[data-slot=select-item]', 'UNHRC'); await sleep(700);
  await page.type('textarea', 'Sample Seat A\nSample Seat B');
  await clickText('button[type=submit]', 'Add 2 seats');
  await sleep(1000);
  const seatsTxt = await page.evaluate(() => document.querySelector('main').textContent);
  check(unhrc > 0 && seatsTxt.includes('Sample Seat A') && seatsTxt.includes('Sample Seat B'), 'add seats: 2 pasted seats appear in UNHRC');
  await go('#/applicants?q=Sample%20Delegate%2016');
  await clickText('button', 'Assign seat'); await sleep(800);
  const triggers = await page.$$('[role=dialog] [data-slot=select-trigger]');
  if (triggers[1]) { await triggers[1].click(); await sleep(400); await clickText('[data-slot=select-item]', 'Sample Seat A'); await sleep(300); }
  await clickText('[role=dialog] button', 'Assign seat'); await sleep(1000);
  const rowTxt = await page.evaluate(() => document.querySelector('main').textContent);
  check(rowTxt.includes('Sample Seat A · UNHRC'), 'assign seat: Sample Delegate 16 now sits in Sample Seat A · UNHRC');

  // Post an announcement.
  await go('#/announcements');
  await page.type('form input', 'Sample notice from the script');
  await clickText('button[type=submit]', 'Post'); await sleep(900);
  check((await page.evaluate(() => document.querySelector('main').textContent)).includes('Sample notice from the script'), 'announcement posts and shows in the list');

  // Assign-seat dialog.
  await go('#/applicants?status=applied');
  const opened = await clickText('button', 'Assign seat');
  await sleep(600);
  check(opened && !!(await page.$('[role=dialog]')), 'assign-seat picker opens');
  await shot('applicants-assign', 1440, false);
  await page.keyboard.press('Escape'); await sleep(300);

  // Phase switch confirm.
  await go('#/live');
  const ph = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button[aria-pressed=false]')].find((x) => /Before|Live|After/.test(x.textContent));
    if (b) b.click(); return !!b;
  });
  await sleep(500);
  check(ph && !!(await page.$('[role=alertdialog]')), 'phase switch asks to confirm');
  await shot('live-phase-confirm', 1440, false);
  await page.keyboard.press('Escape'); await sleep(300);

  // Timer ticks on the overview (a running timer changes between two reads, if any is running).
  const t1 = await page.evaluate(() => [...document.querySelectorAll('.tabular-nums')].map((e) => e.textContent).join('|'));
  await sleep(2200);
  const t2 = await page.evaluate(() => [...document.querySelectorAll('.tabular-nums')].map((e) => e.textContent).join('|'));
  log(`INFO  timers: ${t1.slice(0, 80)} → ${t2.slice(0, 80)} (${t1 === t2 ? 'none running' : 'ticking'})`);

  // Documents + dialog.
  await go('#/documents');
  await clickText('button', 'Add file or link'); await sleep(500);
  await shot('documents-add', 1440, false);
  await page.keyboard.press('Escape'); await sleep(300);
}

// Awards with nominations: the "after" sample scenario (the same tab stays signed in).
if (!only || only.includes('awards')) {
  await page.goto(`${base}/admin/?demo=after#/awards`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('[data-nav=sidebar]', { timeout: 15000 });
  await settle();
  await shot('awards-after', 1440);
  await size(390); await settle(); await shot('awards-after', 390, false); await size(1440);
  const flipped = await page.evaluate(() => { const sw = document.querySelector('[role=switch]'); if (sw) sw.click(); return !!sw; });
  await sleep(800);
  check(flipped, 'lock-as-final toggle clicks');
  // Put the shared store back to the live scenario for the other agents.
  await page.goto(`${base}/admin/?demo=live#/live`, { waitUntil: 'networkidle0', timeout: 60000 });
}

check(errors.length === 0, `no console errors${errors.length ? `:\n  ${[...new Set(errors)].slice(0, 8).join('\n  ')}` : ''}`);
await browser.close();
log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
