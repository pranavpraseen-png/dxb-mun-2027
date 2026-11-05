// Chair dashboard screenshots + checks. Run from site/: node scripts/heavy.mjs "node chair/scripts/shots.mjs"
// Uses the shared dev server (http://127.0.0.1:5320). Writes shots/v2/chair/<page>-<width>.png and prints, per
// shot, horizontal overflow and console errors. Also: the timer running, the rubric with scores, and a delegate
// tab (?demo=live) to check the chair's timer and vote show there.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

const base = (process.argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:5320').replace(/\/$/, '');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const out = 'shots/v2/chair';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 180000, args: ['--hide-scrollbars'] });
const report = [];
const allErrors = [];

async function open(w, h, mobile) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  return { page, errors };
}
async function settle(page, ms = 400) {
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 6000 }).catch(() => {});
  await sleep(ms);
}
async function signIn(page, path, email) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', email);
  await page.click('button[type=submit]');
  await page.waitForSelector('#otp', { timeout: 10000 });
  await page.focus('#otp');
  await page.keyboard.type('123456');
  await page.keyboard.press('Enter');
  await page.waitForSelector('nav[aria-label=Main]', { timeout: 15000 });
  await settle(page);
}
async function shot(page, errors, name, w) {
  await settle(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await page.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: true });
  report.push(`${name}-${w}.png  overflow=${overflow}  errors=${errors.length}`);
  allErrors.push(...errors.splice(0).map((e) => `${name}-${w}: ${e}`));
}
async function go(page, hash) {
  // The page may reload under us (dev-server hot reload while other agents edit): retry once it is back.
  for (let i = 0; i < 4; i++) {
    try {
      await page.waitForSelector('nav[aria-label=Main]', { timeout: 15000 });
      await page.evaluate((h) => { location.hash = h; }, hash);
      break;
    } catch (e) { if (i === 3) throw e; await sleep(1500); }
  }
  await settle(page, 600);
}
async function clickText(page, text, sel = 'button') {
  const ok = await page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((b) => b.textContent.replace(/\s+/g, ' ').trim().toLowerCase().includes(t.toLowerCase()) && !b.disabled);
    if (el) { el.click(); return true; }
    return false;
  }, text, sel);
  await sleep(500);
  return ok;
}
const bodyText = (page) => page.evaluate(() => document.body.innerText);
/** Runs one checked step; a failure (e.g. a dev-server reload mid-step) is reported, not fatal. */
async function step(name, fn) {
  try { await fn(); } catch (e) { report.push(`STEP FAILED: ${name}: ${String(e).split(String.fromCharCode(10))[0]}`); await sleep(2000); }
}

const PAGES = [
  ['run', '#/run'], ['roll', '#/floor?tab=roll'], ['vote', '#/floor?tab=vote'], ['papers', '#/papers'], ['resolutions', '#/resolutions'],
  ['chits', '#/chits'], ['awards-score', '#/awards?tab=score'], ['awards-ranking', '#/awards?tab=ranking'],
  ['awards-nominations', '#/awards?tab=nominations'], ['awards-criteria', '#/awards?tab=criteria'], ['docs', '#/docs'],
];

for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  if (only && only !== String(w)) continue;
  // A delegate tab on ?demo=live puts the shared sample store into the live scenario first.
  const d = w === 1440 ? await open(1440, 900, false) : null;
  if (d) await signIn(d.page, '/portal/?demo=live', 'delegate@x.com');
  const { page, errors } = await open(w, h, mobile);
  await signIn(page, '/chair/', 'chair@x.com');
  for (const [name, hash] of PAGES) {
    await go(page, hash);
    await shot(page, errors, name, w);
  }

  if (w === 1440) {
    await step('timer', async () => {
      // Timer: type 1:30, start it, check it counts down here and on the delegate tab.
      await go(page, '#/run');
      await page.click('#t-len');
      await page.keyboard.type('1:30');
      await page.keyboard.press('Enter');
      await sleep(900);
      const set = await page.$eval('[data-testid=timer-digits]', (e) => e.textContent);
      await page.click('[data-testid=timer-toggle]');
      await sleep(2600);
      const after = await page.$eval('[data-testid=timer-digits]', (e) => e.textContent);
      report.push(`timer: typed 1:30 -> showed ${set}; after start + 2.6s -> ${after}`);
      await shot(page, errors, 'run-timer-running', w);
      const dClocks = ((await bodyText(d.page)).match(/\b\d{1,2}:\d{2}\b/g) || []).slice(0, 4);
      report.push(`delegate tab clocks: ${dClocks.join(', ') || 'none'}`);
      await d.page.screenshot({ path: `${out}/delegate-sees-timer-1440.png` });

    });

    await step('space', async () => {
      // Space pauses (nothing focused).
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press('Space');
      await sleep(900);
      report.push(`Space paused the timer: ${/paused/i.test(await bodyText(page))}`);

    });

    await step('next speaker', async () => {
      // N gives the floor to the first waiting speaker.
      const before = (await bodyText(page)).match(/(\d+) waiting/i)?.[1];
      await page.keyboard.press('n');
      await sleep(1200);
      const speaking = (await bodyText(page)).match(/Now speaking\s*\n\s*(.+)/i)?.[1];
      report.push(`N key: waiting before ${before}; now speaking: ${speaking ?? 'nobody'}`);
      await shot(page, errors, 'run-next-speaker', w);

    });

    await step('votes', async () => {
      // Votes: close the sample open vote, open a new motion vote, check the delegate tab, close it.
      await go(page, '#/floor?tab=vote');
      if (/close vote/i.test(await bodyText(page))) { await clickText(page, 'Close vote'); await sleep(800); }
      await page.type('#v-title', 'Motion to close debate');
      await clickText(page, 'Open vote');
      await sleep(1200);
      report.push(`vote opened on chair: ${/close vote/i.test(await bodyText(page))}`);
      await shot(page, errors, 'vote-open', w);
      await d.page.evaluate(() => { location.hash = '#/now'; });
      await sleep(1800);
      report.push(`delegate tab shows the vote: ${(await bodyText(d.page)).includes('Motion to close debate')}`);
      await d.page.screenshot({ path: `${out}/delegate-sees-vote-1440.png`, fullPage: true });
      await clickText(page, 'Close vote');
      await sleep(1000);
      report.push(`after close, result shown: ${/passed|failed/i.test(await bodyText(page))}`);
    });

    allErrors.push(...d.errors.map((e) => `delegate: ${e}`));
    await d.page.close();

    await step('rubric', async () => {
      // Rubric: enter scores for two seats in the current session and let autosave run.
      await go(page, '#/awards?tab=score');
      const cells = await page.$$('[data-cell]');
      const marks = ['7', '8', '6', '9', '7', '8'];
      for (let i = 0; i < Math.min(12, cells.length); i++) {
        await page.click(`[data-cell="${Math.floor(i / 6)}-${i % 6}"]`);
        await page.keyboard.type(marks[i % marks.length]);
      }
      await sleep(1800);
      const savedRows = await page.evaluate(() => [...document.querySelectorAll('td')].filter((t) => t.textContent.trim() === 'Saved').length);
      report.push(`rubric: ${cells.length} cells; rows showing Saved after typing: ${savedRows}`);
      await shot(page, errors, 'awards-score-entered', w);
      await go(page, '#/awards?tab=ranking');
      await shot(page, errors, 'awards-ranking-after', w);
    });

  } else {
    await go(page, '#/run');
    if (!/pause/i.test(await page.$eval('[data-testid=timer-toggle]', (e) => e.textContent))) await page.click('[data-testid=timer-toggle]');
    await sleep(1500);
    await shot(page, errors, 'run-timer-running', w);
    await go(page, '#/awards?tab=score');
    const cells = await page.$$('[data-cell]');
    for (let i = 0; i < Math.min(4, cells.length); i++) { await page.click(`[data-cell="${Math.floor(i / 6)}-${i % 6}"]`); await page.keyboard.type(String(6 + i)); }
    await sleep(1500);
    await shot(page, errors, 'awards-score-entered', w);
    // The More sheet on phones.
    await go(page, '#/run');
    await clickText(page, 'More');
    await sleep(600);
    await page.screenshot({ path: `${out}/more-sheet-${w}.png` });
    await page.keyboard.press('Escape');
  }
  await page.close();
}

console.log(report.join('\n'));
console.log(allErrors.length ? `Console errors (${allErrors.length}):\n` + [...new Set(allErrors)].join('\n') : 'No console errors');
await browser.close();
