// Delegate dashboard (v2, demo): screenshots of every page at 1440 and 390, an overflow + console audit,
// and a scripted run of the main flows (sign up, roll call, vote, speakers, notes, chits, resolution, files).
// Usage (from site/): node scripts/heavy.mjs "node portal/scripts/shots.mjs [baseUrl]"   (default: the shared server)
// Writes shots/v2/delegate/<page>-<width>.png. ONLY=now-live,files env var limits the shots.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base = (process.argv[2] || 'http://127.0.0.1:5320').replace(/\/$/, '');
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const out = 'shots/v2/delegate';
mkdirSync(out, { recursive: true });
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
async function settle(ms = 500) {
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 8000 }).catch(() => {});
  await sleep(ms);
}
async function go(hash) {
  await page.evaluate((h) => { location.hash = h; window.scrollTo(0, 0); }, hash);
  await settle();
}
async function scenario(s, hash = '#/now') {
  await page.goto(`${base}/portal/?demo=${s}${hash}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await settle(700);
}
async function overflow() {
  return page.evaluate(() => {
    const poke = [...document.querySelectorAll('main *, header *, nav *, [data-slot=sheet-popup] *')].filter((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || el.closest('.sr-only')) return false;
      return r.right > window.innerWidth + 1;
    }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`);
    return { doc: document.documentElement.scrollWidth > window.innerWidth + 1, poke: poke.slice(0, 3) };
  });
}
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
async function shot(name, w, full = true) {
  if (only && !only.includes(name)) return;
  const o = await overflow();
  // A full-page phone shot would paint the fixed bottom bar mid-page: pin it to the page bottom for the shot.
  const pin = full && w < 768;
  if (pin) await page.evaluate(() => {
    const h = document.documentElement.scrollHeight;
    for (const el of document.querySelectorAll('nav[data-nav=tabs]')) { el.dataset.shotStyle = el.getAttribute('style') ?? ''; el.style.position = 'absolute'; el.style.top = `${h - el.offsetHeight}px`; el.style.bottom = 'auto'; }
  });
  await page.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: full });
  if (pin) await page.evaluate(() => { for (const el of document.querySelectorAll('nav[data-nav=tabs]')) el.setAttribute('style', el.dataset.shotStyle ?? ''); });
  check(!o.doc && o.poke.length === 0, `${name}-${w}.png  no horizontal overflow${o.poke.length ? ` (${o.poke.join(', ')})` : ''}`);
}
const clickText = (sel, text) => page.evaluate((sel, text) => {
  const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text) && (e.offsetParent !== null || e.getClientRects().length));
  if (el) el.click();
  return !!el;
}, sel, text);
const hasText = (text) => page.evaluate((t) => document.body.textContent.includes(t), text);
async function typeInto(sel, text) { await page.focus(sel); await page.keyboard.type(text); }

// ── Sign-in screen (before signing in) ──
await size(1440);
await page.goto(`${base}/portal/?demo=new#/now`, { waitUntil: 'networkidle2', timeout: 60000 });
await page.evaluate(() => sessionStorage.clear());
await page.reload({ waitUntil: 'networkidle2' });
await settle();
for (const w of [1440, 390]) { await size(w); await shot('signin', w, false); }
await size(1440);
await typeInto('#email', 'delegate1@demo.test');
await clickText('button', 'Email me a code');
await page.waitForSelector('#otp', { timeout: 8000 });
await typeInto('#otp', '123456');
await clickText('button[type=submit]', 'Sign in');
await settle(900);
check(await hasText('Sign up'), 'signed in; new delegate sees the sign-up form');

// ── Sign-up (new) ──
for (const w of [1440, 390]) { await size(w); await shot('signup', w); }
await size(1440);
await page.evaluate(() => {
  const set = (el, v) => { const p = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); p.set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const inputs = [...document.querySelectorAll('main input[type=text], main input:not([type])')];
  set(inputs[0], 'Sample Delegate 1'); set(inputs[1], 'Sample School'); set(inputs[2], 'Grade 11');
});
for (let i = 0; i < 3; i++) {
  const triggers = await page.$$('main [role=combobox]');
  await page.waitForFunction(() => !document.querySelector('[role=listbox]'), { timeout: 3000 }).catch(() => {});
  await triggers[i].click();
  await sleep(500);
  const picked = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('[role=listbox]')];
    const box = boxes[boxes.length - 1];
    const o = [...(box?.querySelectorAll('[role=option]') ?? [])].find((x) => !x.hasAttribute('data-disabled') && x.getAttribute('aria-disabled') !== 'true' && x.getAttribute('aria-selected') !== 'true');
    o?.click();
    return o?.textContent ?? null;
  });
  log(`      choice ${i + 1}: ${picked}`);
  await sleep(300);
}
await clickText('button[type=submit]', 'Sign up');
await settle(900);
check(await hasText('Waiting for your seat'), 'sign-up submits and shows "Waiting for your seat"');
for (const w of [1440, 390]) { await size(w); await shot('waiting', w); }

// ── Before the day (seated) ──
await size(1440);
await scenario('seated');
check(await hasText('Check-in QR'), 'seated: Now shows the seat and check-in QR');
check(await page.$('svg title') !== null || await hasText('Show this at the check-in desk'), 'seated: QR is drawn');
for (const w of [1440, 390]) { await size(w); await go('#/now'); await shot('now-before', w); }
await size(1440);
await go('#/paper');
for (const w of [1440, 390]) { await size(w); await shot('paper', w); }

// ── Conference day (live) ──
await size(1440);
await scenario('live');
const slim = await page.$('header a[href="#/now"][aria-label^="Timer"]');
check(!!slim, 'live: slim timer in the top bar');
const t1 = await page.evaluate(() => document.querySelector('[role=timer]')?.textContent ?? null);
await sleep(2200);
const t2 = await page.evaluate(() => document.querySelector('[role=timer]')?.textContent ?? null);
log(`      timer read ${t1} then ${t2}`);
for (const w of [1440, 390]) { await size(w); await go('#/now'); await shot('now-live', w); }
await size(1440);

// roll call / vote, whichever the sample shows
if (await clickText('button', 'Present and voting')) { await settle(); check(await hasText('Present and voting'), 'roll call answered'); }
if (await clickText('main button[aria-pressed=false]', 'Yes')) { await settle(); check(await hasText('Vote recorded'), 'vote cast'); }
await go('#/now'); await shot('now-live-after-actions', 1440);

// Speakers
await go('#/speakers');
for (const w of [1440, 390]) { await size(w); await shot('speakers', w); }
await size(1440);
if (await clickText('button', 'Add me to the list')) { await settle(); check(await hasText('in line'), 'joined the speakers list'); }
else if (await clickText('button', 'Remove me')) { await settle(); check(await hasText('Not on the list'), 'left the speakers list'); }

// Resolutions
await go('#/resolutions');
for (const w of [1440, 390]) { await size(w); await shot('resolutions', w); }
await size(1440);
await go('#/resolutions/new');
await typeInto('main input', 'Sample working paper on water security');
await page.focus('main textarea'); await page.keyboard.type('1. Calls upon member states to share water data;');
await shot('resolution-editor', 1440);
await clickText('button[type=submit]', 'Submit to the chair');
await settle(800);
check(await hasText('Sample working paper on water security'), 'working paper submitted and listed');
await size(390); await go('#/resolutions/new'); await shot('resolution-editor', 390); await size(1440);

// Notes: chits
await go('#/notes/chits');
for (const w of [1440, 390]) { await size(w); await shot('notes-chits', w); }
await size(1440);
await page.click('main [role=combobox]'); await sleep(250);
await clickText('[role=option]', 'The dais'); await sleep(200);
await page.focus('main textarea'); await page.keyboard.type('Sample chit: may France be added to the speakers list?');
await clickText('button[type=submit]', 'Send');
await settle(800);
check(await hasText('may France be added'), 'chit sent and in the Sent list');

// Notes: my notes
await go('#/notes/mine');
await page.focus('main input[aria-label="New note"]');
await clickText('main button', 'POI');
await page.focus('main input[aria-label="New note"]');
await page.keyboard.type('Sample POI: ask about desalination costs');
await page.keyboard.press('Enter');
await settle(700);
check(await hasText('Sample POI: ask about desalination costs'), 'Enter saves a note');
for (const w of [1440, 390]) { await size(w); await shot('notes-mine', w); }
await size(1440);

// Paper (live)
await go('#/paper');

// Files
await go('#/files');
for (const w of [1440, 390]) { await size(w); await go('#/files'); await shot('files', w); }
for (const w of [1440, 390]) {
  await size(w); await go('#/files');
  await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => /Add (a )?file or link/i.test(b.getAttribute('aria-label') ?? b.textContent) && getComputedStyle(b).display !== 'none' && b.getClientRects().length)?.click(); });
  await sleep(700);
  check(await page.evaluate(() => !!document.querySelector('[data-slot=sheet-popup]')), `files-add-${w}: the + sheet is open`);
  await shot('files-add', w, false);
  await page.keyboard.press('Escape'); await sleep(400);
}
await size(1440);
// Add a link through the + sheet
await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Add file or link') && b.offsetParent !== null)?.click(); });
await sleep(700);
await typeInto('[data-slot=sheet-popup] input', 'Sample bloc link');
await clickText('[data-slot=sheet-popup] button', 'Link'); await sleep(200);
await typeInto('[data-slot=sheet-popup] input[type=url]', 'https://example.org/sample');
await clickText('[data-slot=sheet-popup] button[type=submit]', 'Add');
await settle(800);
check(await hasText('Sample bloc link'), 'a link added with + shows under Mine');

// Upload a position paper (drag-and-drop box's file input)
const tmp = join(tmpdir(), 'sample-position-paper.pdf');
writeFileSync(tmp, '%PDF-1.4\n% sample\n');
await go('#/paper');
const fileInput = await page.$('main input[type=file]');
await fileInput.uploadFile(tmp);
await settle(900);
check(await hasText('sample-position-paper.pdf'), 'position paper uploads and shows its file name');

// Schedule
await go('#/schedule');
for (const w of [1440, 390]) { await size(w); await shot('schedule', w); }

// Phone: the More sheet and announcements
await size(390); await go('#/now');
await clickText('nav[data-nav=tabs] button', 'More'); await sleep(600);
await shot('more-sheet', 390, false);
await page.keyboard.press('Escape'); await sleep(400);
await page.click('header button[aria-label^="Announcements"]'); await sleep(600);
await shot('announcements', 390, false);
await page.keyboard.press('Escape'); await sleep(400);

// ── A chair tab drives this tab (the demo store syncs across tabs) ──
await size(1440);
await go('#/now');
const chairTab = await browser.newPage();
chairTab.on('pageerror', (e) => errors.push(`chair tab: ${e}`));
await chairTab.goto(`${base}/chair/`, { waitUntil: 'networkidle2', timeout: 60000 });
await chairTab.evaluate(() => sessionStorage.setItem('dxbmun.v2.email', 'chair@x.com'));
const drove = await chairTab.evaluate(async () => {
  const v2 = await import('/src/platform/v2/index.ts');
  const c = v2.getChairApi();
  const [com] = await c.myCommittees();
  await c.setTimer(com.id, { kind: 'speech', label: 'Sample speech from the chair tab', durationSeconds: 95, speakerSeatId: null });
  await c.startTimer(com.id);
  for (const v of await c.votes(com.id)) if (v.status === 'open') await c.closeVote(v.id);
  await c.openVote(com.id, { target: 'motion', title: 'Motion to suspend (chair tab sample)', majority: 'simple' });
  return com.abbr;
}).catch((e) => `error: ${e}`);
log(`      chair tab drove ${drove}`);
await page.bringToFront();
await settle(1500);
const fromChair = await page.evaluate(() => document.querySelector('[role=timer]')?.textContent ?? '');
check(/^01:3\d$|^01:2\d$/.test(fromChair), `timer started from the chair tab shows here (${fromChair})`);
check(await hasText('Motion to suspend (chair tab sample)'), 'vote opened in the chair tab appears here');
await chairTab.close();

// ── After ──
await size(1440);
await scenario('after');
check(await hasText('Conference has ended'), 'after: "Conference has ended" banner');
for (const w of [1440, 390]) { await size(w); await go('#/now'); await shot('now-after', w); }

log(errors.length ? `Console errors (${errors.length}):\n  ${[...new Set(errors)].slice(0, 15).join('\n  ')}` : 'No console errors');
log(failures ? `${failures} check(s) failed` : 'All checks passed');
await browser.close();
process.exit(failures || errors.length ? 1 : 0);
