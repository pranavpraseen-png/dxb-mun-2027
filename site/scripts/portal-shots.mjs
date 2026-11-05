// Delegate dashboard: screenshots + audit for every scenario and screen, and (with --flows) a scripted run
// of each flow in DELEGATE.md's "Done means" list.
// Usage: node scripts/portal-shots.mjs [baseUrl] [--flows | --keys] [--only=<scenario>]
//   --keys: keyboard pass (sign in by keyboard, then Tab through screens, checking focus rings and order).
//   baseUrl defaults to http://127.0.0.1:5320 (npm run dev). Start the dev server first.
// Writes shots/portal/<scenario>-<screen>-<width>.png (full page) and prints, per shot:
// horizontal overflow, text under 14px (phone), tap targets under 44px (phone), covered controls,
// and how many primary (UN-blue) buttons are on the screen.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) || 'http://127.0.0.1:5320').replace(/\/$/, '');
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const flows = args.includes('--flows');
const keys = args.includes('--keys');

const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = browsers.find((p) => existsSync(p));
const out = 'shots/portal';
mkdirSync(out, { recursive: true });

const SCENARIOS = ['new', 'applied', 'allocated', 'ready', 'live']; // 'after' removed (owner scope change)
const SCREENS = ['home', 'committee', 'session', 'documents', 'me'];
const SIZES = [
  { w: 390, h: 844, mobile: true },
  { w: 1440, h: 900, mobile: false },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = (scenario, hash = '#/home') => `${base}/portal/index.html?demo=${scenario}${hash}`;

const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 240000, args: ['--hide-scrollbars'] });

async function newPage(s) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1, isMobile: s.mobile, hasTouch: s.mobile });
  return { page, errors };
}

/** Waits until no skeleton is on screen (or 5 s). */
async function settle(page) {
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 5000 }).catch(() => {});
  await sleep(250);
}

async function signIn(page, scenario, hash = '#/home') {
  await page.goto(url(scenario, hash), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.type('#email', 'sample.delegate@example.com');
  await page.click('button[type=submit]');
  await page.waitForSelector('[data-slot=otp-field-input]', { timeout: 10000 });
  await page.focus('[data-slot=otp-field-input]');
  await page.keyboard.type('123456');
  await page.waitForSelector('nav[aria-label=Main]', { timeout: 10000 });
  await settle(page);
}

async function audit(page, mobile) {
  return page.evaluate((mobile) => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('.sr-only'); };
    const overflow = document.documentElement.scrollWidth - innerWidth;
    // Text under 14px: elements with their own visible text.
    const smallText = [];
    for (const e of document.querySelectorAll('body *')) {
      if (!vis(e)) continue;
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const fs = parseFloat(getComputedStyle(e).fontSize);
      if (fs < 14) smallText.push(`${e.tagName.toLowerCase()}.${e.className} "${e.textContent.trim().slice(0, 20)}" ${fs}px`);
    }
    // Base UI keeps 1px hidden inputs for form validation (aria-hidden, no tab stop): they are not controls.
    const controls = [...document.querySelectorAll('a[href],button,input:not([type=file]):not([type=checkbox]):not([type=radio]),select,textarea,[role=tab],[role=checkbox]')].filter((e) => vis(e) && e.getAttribute('aria-hidden') !== 'true' && e.tabIndex !== -1);
    const small = mobile ? controls.filter((e) => {
      const r = e.getBoundingClientRect();
      if (e.type === 'checkbox' || e.type === 'radio' || e.getAttribute('role') === 'checkbox') return false; // their labels are the target
      return r.width < 44 || r.height < 44;
    }).map((e) => `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 20)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`) : [];
    // Covered: scroll each control to the middle and check what is on top at its centre.
    const covered = [];
    const y0 = scrollY;
    for (const e of controls) {
      if (e.closest('nav') || e.closest('header') || e.disabled || getComputedStyle(e).opacity === '0') continue; // disabled buttons ignore the pointer
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (top && top !== e && !e.contains(top) && !(e.labels && [...e.labels].some((l) => l.contains(top)))) {
        covered.push(`${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || e.id).trim().slice(0, 20)}" under ${top.tagName.toLowerCase()}.${top.className}`);
      }
    }
    scrollTo(0, y0);
    const PRIMARY = 'main [data-slot=button][data-variant=default]';
    const primary = [...document.querySelectorAll(PRIMARY)].filter(vis).length;
    const h1 = document.querySelectorAll('h1').length;
    // Is the first primary action visible without scrolling?
    const firstPrimary = [...document.querySelectorAll(`${PRIMARY}, main .next__cta, main .vote`)].find(vis);
    const primaryAboveFold = firstPrimary ? firstPrimary.getBoundingClientRect().bottom <= innerHeight - (mobile ? 68 : 0) : null;
    // Contrast: text colour against the composited background behind it (WCAG 2: 4.5:1, or 3:1 for large text).
    const parse = (c) => { const m = c.match(/[\d.]+/g); if (!m) return [0, 0, 0, 0]; return [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]]; };
    const over = (top, bot) => { const a = top[3] + bot[3] * (1 - top[3]); if (!a) return [0, 0, 0, 0]; return [0, 1, 2].map((i) => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat(a); };
    const lum = (c) => { const [r, g, b] = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const bgOf = (e) => { const layers = []; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 1) break; } let bg = [7, 17, 31, 1]; for (const l of layers.reverse()) bg = over(l, bg); return bg; };
    const lowContrast = [];
    for (const e of document.querySelectorAll('body *')) {
      if (!vis(e) || e.closest(':disabled,[aria-disabled=true],[data-disabled],[aria-hidden=true]')) continue;
      if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(e);
      if (parseFloat(cs.opacity) < 1) continue;
      const bg = bgOf(e);
      const fg = over(parse(cs.color), bg);
      const L1 = lum(fg), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
      const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      if (ratio < need) lowContrast.push(`"${e.textContent.trim().slice(0, 18)}" ${ratio.toFixed(2)}:1`);
    }
    return { overflow, smallText: smallText.slice(0, 6), small: small.slice(0, 6), covered: covered.slice(0, 6), lowContrast: lowContrast.slice(0, 6), primary, h1, primaryAboveFold, height: document.documentElement.scrollHeight };
  }, mobile);
}

const problems = [];
const note = (where, a, errors, mobile) => {
  const line = `${where.padEnd(28)} h=${String(a.height).padEnd(5)} ovX=${a.overflow} h1=${a.h1} primary=${a.primary} aboveFold=${a.primaryAboveFold} errors=${errors.length}`;
  console.log(line);
  if (a.overflow > 0) problems.push(`${where}: horizontal overflow ${a.overflow}px`);
  if (a.h1 !== 1) problems.push(`${where}: ${a.h1} h1 elements`);
  if (a.primary > 1) problems.push(`${where}: ${a.primary} primary buttons`);
  if (mobile && a.smallText.length) problems.push(`${where}: text under 14px: ${a.smallText.join('; ')}`);
  if (a.small.length) problems.push(`${where}: small tap targets: ${a.small.join('; ')}`);
  if (a.covered.length) problems.push(`${where}: covered: ${a.covered.join('; ')}`);
  if (a.lowContrast.length) problems.push(`${where}: contrast under WCAG AA: ${a.lowContrast.join('; ')}`);
  if (errors.length) problems.push(`${where}: console errors: ${errors.slice(0, 3).join(' | ')}`);
  if (mobile && a.primaryAboveFold === false) problems.push(`${where}: first primary action is below the fold`);
};

if (!flows && !keys) {
  for (const s of SIZES) {
    // Sign-in screens (email, then code) and the invite page.
    {
      const { page, errors } = await newPage(s);
      await page.goto(url('allocated'), { waitUntil: 'networkidle0' });
      await page.waitForSelector('#email');
      await sleep(200);
      await page.screenshot({ path: `${out}/signin-email-${s.w}.png`, fullPage: true });
      note(`signin-email@${s.w}`, await audit(page, s.mobile), errors, s.mobile);
      await page.type('#email', 'sample.delegate@example.com');
      await page.click('button[type=submit]');
      await page.waitForSelector('[data-slot=otp-field-input]');
      await sleep(200);
      await page.screenshot({ path: `${out}/signin-code-${s.w}.png`, fullPage: true });
      note(`signin-code@${s.w}`, await audit(page, s.mobile), errors, s.mobile);
      await page.close();
    }
    for (const sc of SCENARIOS) {
      if (only && sc !== only) continue;
      const { page, errors } = await newPage(s);
      await signIn(page, sc);
      const screens = sc === 'new' ? ['apply', ...SCREENS, 'invite/sample-token'] : SCREENS;
      for (const scr of screens) {
        await page.evaluate((h) => { location.hash = h; }, `#/${scr}`);
        await sleep(100);
        await settle(page);
        const name = scr.split('/')[0];
        await page.screenshot({ path: `${out}/${sc}-${name}-${s.w}.png`, fullPage: true });
        // A viewport-only shot on phones, to judge what is visible without scrolling.
        if (s.mobile) await page.screenshot({ path: `${out}/${sc}-${name}-${s.w}-fold.png` });
        note(`${sc}/${name}@${s.w}`, await audit(page, s.mobile), errors, s.mobile);
      }
      await page.close();
    }
  }
  console.log(problems.length ? '\nPROBLEMS:\n- ' + problems.join('\n- ') : '\nNo problems found.');
  console.log(`Screenshots in site/${out}/`);
}

/* ------------------------------------------------------------------ flows */
if (flows) {
  const results = [];
  const s = SIZES[1];
  const step = async (name, fn) => {
    try { const detail = await fn(); results.push({ name, ok: true, detail: detail ?? '' }); console.log(`PASS  ${name}${detail ? '  (' + detail + ')' : ''}`); }
    catch (e) { results.push({ name, ok: false, detail: String(e.message || e) }); console.log(`FAIL  ${name}  ${String(e.message || e).split('\n')[0]}`); }
  };
  const toastSays = async (page, text) => {
    await page.waitForFunction((t) => [...document.querySelectorAll('[data-slot=toast-title]')].some((x) => x.textContent.includes(t)), { timeout: 6000 }, text);
    return `toast "${text}"`;
  };
  const clickText = async (page, sel, text) => {
    const ok = await page.evaluate((sel, text) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text) && !e.disabled);
      if (!el) return false; el.click(); return true;
    }, sel, text);
    if (!ok) throw new Error(`no enabled ${sel} with "${text}"`);
  };
  // coss ui Select (Base UI): open the trigger, then click an option by its text or its index.
  const choose = async (page, trigger, pick) => {
    // Only options in an open popup count (closed popups can stay mounted while they animate out).
    const shown = () => [...document.querySelectorAll('[role=option]')].filter((o) => { const r = o.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !o.closest('[data-ending-style],[hidden]'); }).length > 0;
    await page.click(trigger);
    const opened = await page.waitForFunction(shown, { timeout: 4000 }).then(() => true, () => false);
    if (!opened) throw new Error(`no listbox opened for ${trigger}`);
    const box = await page.evaluate((pick) => {
      const os = [...document.querySelectorAll('[role=option]')].filter((o) => { const r = o.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !o.closest('[data-ending-style],[hidden]') && o.getAttribute('aria-disabled') !== 'true' && o.textContent.trim(); });
      const el = typeof pick === 'number' ? os[pick] : os.find((o) => o.textContent.includes(pick));
      if (!el) return null;
      el.scrollIntoView({ block: 'center' }); // away from the popup's scroll arrows
      el.setAttribute('data-pick', '1');
      return { text: el.textContent.trim() };
    }, pick);
    await sleep(200);
    if (box) Object.assign(box, await page.$eval('[data-pick]', (el) => { el.removeAttribute('data-pick'); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
    if (!box) throw new Error(`no option ${pick} in ${trigger}`);
    await page.mouse.click(box.x, box.y); // a real pointer click, as a person would
    await page.waitForFunction((fn) => !new Function(`return (${fn})()`)(), { timeout: 3000 }, shown.toString()).catch(() => {});
    await sleep(200);
    return box.text;
  };
  const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await sleep(100); await settle(page); };

  // 1. Sign in (scenario: new)
  let { page } = await newPage(s);
  await step('sign in', async () => {
    await signIn(page, 'new');
    const h1 = await page.$eval('h1', (e) => e.textContent);
    return `landed on Home, h1 "${h1}"`;
  });
  // 2. Apply, then choose preferences
  await step('apply, then choose preferences', async () => {
    await clickText(page, 'a', 'Start application');
    await settle(page);
    await page.$eval('#ap-name', (e) => { e.focus(); e.select(); });
    await page.keyboard.type('Sample Applicant');
    await page.$eval('#ap-grade', (e) => { e.focus(); e.select(); });
    await page.keyboard.type('10');
    await choose(page, '#ap-experience', '1–2 conferences');
    await page.type('#ap-motivation', 'I want to practise debate and learn how the UN works.');
    await clickText(page, 'button', 'Send application');
    await toastSays(page, 'Application sent');
    await page.waitForSelector('.prefs [data-slot=select-trigger]');
    const c1 = await choose(page, '.prefs__row:nth-of-type(1) [data-slot=select-trigger]', 'UNSC');
    const c2 = await choose(page, '.prefs__row:nth-of-type(2) [data-slot=select-trigger]', 'DISEC');
    await clickText(page, 'button', 'Save and finish');
    await toastSays(page, 'Preferences saved');
    await page.waitForFunction(() => location.hash === '#/home');
    await settle(page);
    const row = await page.$eval('[aria-label="Your checklist"] > [role=listitem]:nth-child(2)', (e) => e.textContent);
    return `chose "${c1}", "${c2}"; back on Home; checklist row: "${row.replace(/\s+/g, ' ').trim()}"`;
  });
  await page.close();

  // 3–5. Allocated: accept seat, code of conduct, consent, PDF upload
  ({ page } = await newPage(s));
  await signIn(page, 'allocated');
  await step('accept seat (from the Home card)', async () => {
    await clickText(page, '.next button', 'Accept seat');
    return await toastSays(page, 'Seat accepted');
  });
  await step('accept the code of conduct', async () => {
    await go(page, '#/me/conduct');
    await page.click('#conduct [role=checkbox]');
    await clickText(page, '#conduct button', 'Accept');
    const t = await toastSays(page, 'Code of conduct accepted');
    await page.waitForFunction(() => document.querySelector('#conduct')?.textContent.includes('You accepted it'));
    return t;
  });
  await step('request consent', async () => {
    await go(page, '#/me/consent');
    await page.type('#pc-name', 'Sample Parent');
    await page.type('#pc-email', 'parent@example.com');
    await clickText(page, '#consent button', 'Email my parent');
    const t = await toastSays(page, 'Email sent');
    await page.waitForFunction(() => document.querySelector('#consent')?.textContent.includes('Waiting for'));
    return t + ', status "Waiting"';
  });
  await step('upload a PDF', async () => {
    await go(page, '#/committee/paper');
    const pdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
    const file = `${out}/sample-position-paper.pdf`;
    writeFileSync(file, pdf);
    const input = await page.$('#paper-file');
    await input.uploadFile(file);
    const t = await toastSays(page, 'Position paper uploaded');
    await page.waitForFunction(() => document.querySelector('#paper')?.textContent.includes('sample-position-paper.pdf'));
    return t + ', file listed';
  });
  await page.close();

  // 6–8. Live: send a note, vote, submit a working paper
  ({ page } = await newPage(s));
  await signIn(page, 'live');
  await step('send a note', async () => {
    await go(page, '#/session/notes');
    const who = await choose(page, '#note-to', 1); // the first delegate, after "The chair"
    await page.type('#note-body', 'Would you co-sponsor a working paper on sanctions?');
    await clickText(page, '#notes button', 'Send note');
    const t = await toastSays(page, 'Note sent');
    await page.waitForFunction(() => [...document.querySelectorAll('#notes .note')].some((n) => n.textContent.includes('co-sponsor')));
    const status = await page.evaluate(() => [...document.querySelectorAll('#notes .note')].find((n) => n.textContent.includes('co-sponsor')).querySelector('[data-slot=badge]').textContent);
    return `${t} to ${who}, sent list shows "${status}"`;
  });
  await step('vote', async () => {
    await go(page, '#/session/vote');
    if (!(await page.$('#vote .vote'))) throw new Error('no open vote on the Session screen');
    await clickText(page, '#vote .vote', 'Yes');
    const t = await toastSays(page, 'Vote recorded: Yes');
    await page.waitForFunction(() => document.querySelector('#vote')?.textContent.includes('You voted'));
    return t + ' (motion)';
  });
  await step('vote on a draft resolution (opens after the motion vote closes)', async () => {
    await go(page, '#/documents');
    await page.waitForSelector('#voting .vote:not([disabled])', { timeout: 30000 });
    await clickText(page, '#voting .vote', 'Abstain');
    const t = await toastSays(page, 'Vote recorded: Abstain');
    await page.waitForFunction(() => document.querySelector('#voting')?.textContent.includes('You voted'));
    return t;
  });
  await step('submit a working paper', async () => {
    await go(page, '#/documents');
    await clickText(page, 'button', 'Submit a working paper');
    await page.waitForSelector('#wp-title');
    await page.type('#wp-title', 'Sample working paper on humanitarian access');
    await page.type('#wp-body', 'Calls on member states to open safe corridors for aid. Asks the Secretary-General to report back.');
    await clickText(page, 'button', 'Send to the chair');
    const t = await toastSays(page, 'Working paper sent');
    await page.waitForFunction(() => document.body.textContent.includes('Sample working paper on humanitarian access'));
    return t + ', listed';
  });
  await page.close();

  // 9–10. School invite (the certificate step was removed with the after scenario)
  ({ page } = await newPage(s));
  await signIn(page, 'ready');
  await step('school invite: expired token', async () => {
    await go(page, '#/invite/expired');
    await page.waitForFunction(() => document.body.textContent.includes('This invite link has expired'), { timeout: 6000 });
    return 'shows "This invite link has expired"';
  });
  await step('school invite', async () => {
    await go(page, '#/invite/sample-token');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Join delegation')), { timeout: 6000 });
    const title = await page.$eval('main h2', (e) => e.textContent);
    await clickText(page, 'button', 'Join delegation');
    const t = await toastSays(page, 'joined') + `; asked "${title}"`;
    await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes("You're in"));
    const line = await page.$eval('.phead__line', (e) => e.textContent);
    return `${t}; "${line}"`;
  });
  await page.close();

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} flows passed.`);
}

/* ------------------------------------------------------------------ keyboard pass */
if (keys) {
  const runs = [['live', ['#/home', '#/session', '#/documents']], ['allocated', ['#/committee', '#/me']]];
  for (const [sc, hashes] of runs) {
    const { page } = await newPage(SIZES[1]);
    await page.goto(url(sc), { waitUntil: 'networkidle0' });
    await page.waitForSelector('#email');
    await page.keyboard.type('kbd@example.com');   // the email box has autofocus
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-slot=otp-field-input]'); await sleep(200);
    await page.keyboard.type('123456');              // focus starts in box 1 and moves on
    await page.waitForSelector('nav[aria-label=Main]', { timeout: 8000 }); await sleep(900);
    console.log(`
[${sc}] signed in with the keyboard only`);
    for (const h of hashes) {
      await page.evaluate((x) => { location.hash = x; }, h); await sleep(1200);
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      const seq = []; let bad = 0;
      for (let i = 0; i < 24; i++) {
        await page.keyboard.press('Tab');
        const info = await page.evaluate(() => {
          const e = document.activeElement; if (!e || e === document.body) return null;
          const cs = getComputedStyle(e);
          let ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
          const r = e.getBoundingClientRect();
          return { t: (e.getAttribute('aria-label') || e.textContent || e.id || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 24), ring, inView: r.bottom > 0 && r.top < innerHeight };
        });
        if (!info) break;
        if (!info.ring || !info.inView) bad++;
        seq.push(info.t + (info.ring ? '' : ' [NO RING]') + (info.inView ? '' : ' [OFFSCREEN]'));
      }
      console.log(`${h}: ${seq.join(' > ')}
   -> ${bad ? bad + ' problem(s)' : 'all focus rings visible and on screen'}`);
    }
    await page.close();
  }
}

await browser.close();
