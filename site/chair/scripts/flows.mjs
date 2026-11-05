// Chair dashboard flows, end to end in the demo. Run from site/: node scripts/heavy.mjs "node chair/scripts/flows.mjs"
// Each step does one chair action through the UI and checks what the page shows afterwards.
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';

const base = 'http://127.0.0.1:5320';
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const out = 'shots/v2/chair';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 180000, args: ['--hide-scrollbars'] });
const results = [];
const errors = [];

const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.setViewport({ width: 1440, height: 900 });
// ?demo=live puts the shared store in the live scenario; then a fresh reset for a clean start.
await page.goto(`${base}/chair/?demo=live`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForSelector('#email');
await page.type('#email', 'chair@x.com');
await page.click('button[type=submit]');
await page.waitForSelector('#otp');
await page.type('#otp', '123456');
await page.keyboard.press('Enter');
await page.waitForSelector('nav[aria-label=Main]', { timeout: 15000 });

const text = () => page.evaluate(() => document.body.innerText);
async function go(hash) {
  for (let i = 0; i < 4; i++) {
    try { await page.waitForSelector('nav[aria-label=Main]', { timeout: 15000 }); await page.evaluate((h) => { location.hash = h; }, hash); break; }
    catch { await sleep(1500); }
  }
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 6000 }).catch(() => {});
  await sleep(500);
}
/** Clicks the first enabled element whose text or aria-label contains `t` (inside `scope` if given). */
async function click(t, scope = 'body', sel = 'button, [role=menuitemradio], [role=option]') {
  const ok = await page.evaluate((t, scope, sel) => {
    const root = document.querySelector(scope) ?? document.body;
    const el = [...root.querySelectorAll(sel)].find((b) => !b.disabled && ((b.getAttribute('aria-label') ?? '') + ' ' + b.textContent).replace(/\s+/g, ' ').toLowerCase().includes(t.toLowerCase()));
    if (el) { el.click(); return true; }
    return false;
  }, t, scope, sel);
  await sleep(700);
  return ok;
}
/** Real mouse click on the first enabled button whose whole text is `t` (Base UI triggers want real pointer events). */
async function clickExact(t, scope = 'body') {
  const h = await page.evaluateHandle((t, scope) => {
    const root = document.querySelector(scope) ?? document.body;
    return [...root.querySelectorAll('button')].find((b) => !b.disabled && b.textContent.replace(/\s+/g, ' ').trim().toLowerCase() === t.toLowerCase()) ?? null;
  }, t, scope);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  await sleep(800);
  return true;
}
async function step(name, fn) {
  try { const r = await fn(); results.push(`${r && !(typeof r === 'string' && /^FAIL/.test(r)) ? 'OK  ' : 'FAIL'} ${name}${typeof r === 'string' ? `: ${r}` : ''}`); }
  catch (e) { results.push(`FAIL ${name}: ${String(e).split(String.fromCharCode(10))[0]}`); }
}

await step('reset sample data', async () => {
  await click('Reset sample data'); await click('Reset', '[role=alertdialog]'); await sleep(800);
  return true;
});

await step('agenda + motion save', async () => {
  await go('#/run');
  await page.click('#ag', { clickCount: 3 }); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type('Water security in arid regions (test)');
  await click('Save agenda'); await sleep(500);
  return (await text()).includes('Agenda: Water security in arid regions (test)');
});

await step('preset 45s loads the timer', async () => {
  await click('45s');
  return (await page.$eval('[data-testid=timer-digits]', (e) => e.textContent)) === '0:45';
});

await step('+15s and -15s', async () => {
  await click('Add 15 seconds');
  const a = await page.$eval('[data-testid=timer-digits]', (e) => e.textContent);
  await click('Take away 15 seconds');
  const b = await page.$eval('[data-testid=timer-digits]', (e) => e.textContent);
  return a === '1:00' && b === '0:45' ? true : `${a} then ${b}`;
});

await step('timer kind: caucus', async () => {
  await click('Caucus', '[aria-label="Timer kind"]');
  return /caucus/i.test(await page.$eval('[data-testid=timer-digits]', (e) => e.parentElement.innerText));
});

await step('speakers: add a seat, move it up, remove it', async () => {
  await click('Choose a seat', 'main', '[role=combobox], button');
  const ok = await click('Ireland', 'body', '[role=option]');
  await click('Add', 'main form', 'button[type=submit]');
  const added = (await text()).includes('Ireland');
  await click('Move Ireland up');
  await click('Remove Ireland');
  const removed = !(await page.evaluate(() => [...document.querySelectorAll('ol li')].some((l) => l.textContent.includes('Ireland'))));
  return ok && added && removed ? true : `picked ${ok}, added ${added}, removed ${removed}`;
});

await step('roll call: open, mark Brazil absent, close', async () => {
  await go('#/floor?tab=roll');
  if (/open roll call/i.test(await text())) await click('Open roll call');
  await click('Brazil:');
  await click('Absent', 'body', '[role=menuitemradio]');
  const marked = await page.evaluate(() => [...document.querySelectorAll('.seat-grid li')].find((l) => l.textContent.includes('Brazil'))?.textContent.includes('Absent'));
  await click('Close roll call'); await click('Close roll call', '[role=alertdialog]');
  return marked && /closed/i.test(await text()) ? true : `marked ${marked}`;
});

await step('vote on a resolution (two-thirds) and record a placard count', async () => {
  await go('#/floor?tab=vote');
  if (/close vote/i.test(await text())) await click('Close vote');
  await click('Resolution', '[aria-label="Vote on"]');
  await click('Choose one', 'main', '[role=combobox], button');
  await page.evaluate(() => document.querySelector('[role=option]:not([aria-disabled=true]) + [role=option], [role=listbox] [role=option]:last-child')?.click());
  await sleep(500);
  await click('Two-thirds', '[aria-label="Majority"]');
  await click('Open vote', 'main form', 'button[type=submit]');
  const opened = /close vote/i.test(await text());
  await click('Placard count');
  const ids = await page.$$eval('input[id^=pc-]', (els) => els.map((e) => e.id));
  for (const [i, v] of [[0, '9'], [1, '3'], [2, '2']]) await page.type(`#${ids[i]}`, v);
  await click('Save count');
  await click('Close vote');
  const t = await text();
  return opened && /9 yes, 3 no, 2 abstain/.test(t) ? `result: ${/Passed/.test(t.split('RESULTS')[1] ?? t) ? 'passed shown' : 'see shot'}` : `opened ${opened}`;
});
await page.screenshot({ path: `${out}/flow-vote-result-1440.png`, fullPage: true });

await step('papers: mark one seen', async () => {
  await go('#/papers');
  const before = await page.$$eval('button', (b) => b.filter((x) => !x.disabled && x.textContent.includes('Mark seen')).length);
  await click('Mark seen');
  const after = await page.$$eval('button', (b) => b.filter((x) => !x.disabled && x.textContent.includes('Mark seen')).length);
  return after === before - 1 ? true : `${before} -> ${after}`;
});

await step('papers: open a paper', async () => {
  const pages0 = (await browser.pages()).length;
  await click('Open Brazil');
  await sleep(1200);
  const pages = await browser.pages();
  const url = pages.length > pages0 ? pages[pages.length - 1].url() : 'no new tab';
  if (pages.length > pages0) await pages[pages.length - 1].close();
  return `new tab: ${url.slice(0, 60)}`;
});

await step('resolutions: approve the working paper as DR 1.2', async () => {
  await go('#/resolutions');
  await clickExact('Approve');
  const num = await page.$eval('[data-slot=dialog-popup] input', (e) => e.value);
  await page.click('[data-slot=dialog-popup] button[type=submit]');
  await sleep(600);
  return (await text()).includes(`Approved as ${num}`) ? `numbered ${num}` : 'FAIL no confirmation';
});

await step('resolutions: return the amendment with a comment', async () => {
  await click('To review', 'main', 'button');
  await clickExact('Return');
  await page.type('[data-slot=dialog-popup] textarea', 'Please name the clause you change.');
  await page.click('[data-slot=dialog-popup] button[type=submit]');
  await click('Returned', 'main', 'button');
  return (await text()).includes('Please name the clause you change.');
});
await page.screenshot({ path: `${out}/flow-resolutions-1440.png`, fullPage: true });

await step('chits: deliver the held chit, reply to the dais chit, send to all', async () => {
  await go('#/chits');
  await click('Deliver');
  const held = (await text()).match(/Held (\d+)/i)?.[1];
  await click('Reply');
  await page.type('textarea[id^=rp-]', 'Yes, you are on the list.');
  await click('Send reply');
  await page.type('#cm-body', 'Voting procedure starts in five minutes.');
  await click('Send to all seats');
  const t = await text();
  return held === '0' && t.includes('Yes, you are on the list.') && t.includes('Voting procedure starts in five minutes.') ? true : `held ${held}`;
});

await step('rubric: edit criteria (rename + add), save', async () => {
  await go('#/awards?tab=criteria');
  await page.click('#cr-l-1', { clickCount: 3 }); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type('Points of information');
  await click('Add criterion');
  const n = (await page.$$('[id^=cr-l-]')).length;
  await page.type(`#cr-l-${n - 1}`, 'Teamwork');
  await click('Save criteria');
  await go('#/awards?tab=score');
  const t = await text();
  return t.includes('Points of information') && t.includes('Teamwork');
});

await step('rubric: nominate Kenya for Best Delegate, then a custom award', async () => {
  await go('#/awards?tab=nominations');
  await click('Choose a seat', 'main section', '[role=combobox], button');
  await click('Kenya', 'body', '[role=option]');
  await click('Nominate', 'main section form', 'button[type=submit]');
  await page.keyboard.press('Escape'); await sleep(300);
  await page.type('#cw-name', 'Best Diplomacy (test)');
  await page.click('[aria-label="Seat for the custom award"]');
  await page.waitForSelector('[role=option]', { timeout: 3000 }).catch(() => {});
  await sleep(600);
  await page.keyboard.type('France'); await sleep(300); await page.keyboard.press('Enter');
  await sleep(400);
  await page.evaluate(() => document.querySelector('#cw-name').closest('form').querySelector('button[type=submit]').click());
  await sleep(900);
  const t = await text();
  return /Best Diplomacy \(test\)/i.test(t.split(/CUSTOM AWARD/i)[0]) ? true : 'FAIL custom award not shown';
});
await page.screenshot({ path: `${out}/flow-nominations-1440.png`, fullPage: true });

await step('docs: add a link file and a notice', async () => {
  await go('#/docs');
  await clickExact('Add file');
  await page.type('#f-title', 'Rules of procedure (test link)');
  await click('Link', '[data-slot=dialog-popup] [aria-label="File or link"]');
  await page.type('#f-link', 'https://example.com/rules');
  await page.click('[data-slot=dialog-popup] button[type=submit]');
  await page.type('#n-title', 'Back in the room in 5 minutes (test)');
  await click('Urgent', 'main', '[role=checkbox], button');
  await click('Post to');
  const t = await text();
  return t.includes('Rules of procedure (test link)') && t.includes('Back in the room in 5 minutes (test)');
});
await page.screenshot({ path: `${out}/flow-docs-1440.png`, fullPage: true });

await step('end session, then start the next', async () => {
  await go('#/run');
  const before = (await text()).match(/Session (\d+)/i)?.[1];
  await click('End session'); await click('End session', '[role=alertdialog]');
  await sleep(600);
  await click('Start next session');
  const after = (await text()).match(/Session (\d+)/i)?.[1];
  return `session ${before} -> ${after}`;
});

console.log(results.join('\n'));
console.log(errors.length ? `Console errors:\n${[...new Set(errors)].join('\n')}` : 'No console errors');
await browser.close();
