// Screenshots + checks for the Alt 4 nav and sections (version A). Run from site/ through the lock:
//   node scripts/heavy.mjs "node concepts/alt-4/sections-shots.mjs"
// On ?still (no gate): every section at 1440x900 and 390x844, a committee selected / expanded, schedule day 2,
// a typed nameplate, a wellness check, the phone menu open, and a full page. Prints overflow and console errors.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';

// All A versions (main.tsx picks parts from the URL; missing = the lead's pick).
const url = 'http://127.0.0.1:5320/concepts/alt-4/?still&nav=a&about=a&committees=a&schedule=a&register=a&wellness=a&contact=a';
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'shots/r4/alt-4/sections';
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const args = ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${tag}: ${r.status()} ${r.url()}`));
};
const IDS = ['about', 'committees', 'schedule', 'register', 'wellness', 'resources', 'contact'];
const NAV_H = 64;
const to = async (page, id) => {
  await page.evaluate((id, h) => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - h); }, id, NAV_H);
  await wait(350);
};
const overflow = (page) => page.evaluate(() => {
  const w = document.documentElement.clientWidth;
  const wide = [];
  for (const el of document.querySelectorAll('.f-sec *, .f-foot *, .f-nav *, .f-menu *')) {
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > w + 0.5 || r.left < -0.5)) wide.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  return { page: document.documentElement.scrollWidth > w, scrollWidth: document.documentElement.scrollWidth, w, wide: wide.slice(0, 8) };
});
const active = (page) => page.evaluate(() => document.querySelector('.f-nav-links a[aria-current]')?.textContent ?? '(none)');

const browser = await puppeteer.launch({ executablePath, headless: true, args, protocolTimeout: 60000 });

for (const [w, h, phone] of [[1440, 900, false], [390, 844, true]]) {
  const tag = `alt-4@${w}`;
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready.then(() => 0));
  await wait(1200);
  const ok = await page.evaluate(() => document.querySelectorAll('.f-sec').length === 7 && !!document.querySelector('.f-nav'));
  console.log(tag, 'sections rendered:', ok);
  if (!ok) { await page.screenshot({ path: `${out}/${w}-00-broken.png` }); console.log(tag, 'NOT RENDERED; errors so far: ' + errors.join(' | '), ' root html:', await page.evaluate(() => document.getElementById('root')?.innerHTML.length)); await page.close(); continue; }

  for (const [i, id] of IDS.entries()) {
    await to(page, id);
    await page.screenshot({ path: `${out}/${w}-${String(i + 1).padStart(2, '0')}-${id}.png` });
    console.log(tag, id, 'nav active =', phone ? '(phone)' : await active(page));
  }

  // Committees: pick one (wide: a tab; phone: expand a row).
  await to(page, 'committees');
  if (!phone) {
    const tabs = await page.$$('.f-cm-tab');
    await tabs[12].click();
    await wait(300);
    await page.keyboard.press('ArrowDown'); // keyboard: UNSC → UNHRC
    await wait(300);
    console.log(tag, 'committee pane:', await page.evaluate(() => document.querySelector('.f-cm-pane:not([hidden]) .f-cm-name')?.textContent));
  } else {
    const rows = await page.$$('.f-acc-t');
    await rows[3].click();
    await wait(600);
    console.log(tag, 'expanded row:', await page.evaluate(() => document.querySelector('.f-acc-item[data-open] .f-acc-name')?.textContent));
  }
  await page.screenshot({ path: `${out}/${w}-20-committee-selected.png` });

  // Schedule: Day 2.
  await to(page, 'schedule');
  await (await page.$$('.f-day'))[1].click();
  await wait(500);
  await page.screenshot({ path: `${out}/${w}-21-schedule-day2.png` });

  // Register: type a name into the placard.
  await to(page, 'register');
  await page.click('.f-input');
  await page.type('.f-input', 'Amira Haddad', { delay: 10 });
  await wait(300);
  await page.screenshot({ path: `${out}/${w}-22-register-typed.png` });
  console.log(tag, 'placard:', await page.evaluate(() => { const n = document.querySelector('.f-plate-name'); return n.textContent + ' @ ' + getComputedStyle(n).fontSize; }));
  // A very long name must still fit on the placard.
  await page.evaluate(() => { document.querySelector('.f-input').select(); });
  await page.type('.f-input', 'Alexandra Konstantinopoulou-Smith', { delay: 5 });
  await wait(300);
  console.log(tag, 'page width after long name:', await page.evaluate(() => document.documentElement.scrollWidth));
  console.log(tag, 'long placard fits:', await page.evaluate(() => { const n = document.querySelector('.f-plate-name'); const b = n.parentElement.getBoundingClientRect(), r = n.getBoundingClientRect(); return r.left >= b.left && r.right <= b.right; }));
  await page.screenshot({ path: `${out}/${w}-23-register-long.png` });

  // Wellness: check one item.
  await page.evaluate(() => document.activeElement?.blur());
  await to(page, 'wellness');
  const box = await page.$('.f-check-row .f-box');
  if (phone) await box.tap(); else await box.click();
  await wait(300);
  console.log(tag, 'wellness status:', await page.evaluate(() => document.querySelector('.f-status span')?.textContent));
  await page.screenshot({ path: `${out}/${w}-24-wellness-checked.png` });
  await page.evaluate(() => localStorage.removeItem('dxb-mun-wellness-checkin'));

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await wait(300);
  await page.screenshot({ path: `${out}/${w}-25-page-bottom.png` });
  console.log(tag, 'footer:', JSON.stringify(await page.evaluate(() => { const r = document.querySelector('.f-foot').getBoundingClientRect(); const hit = document.elementFromPoint(60, r.top + 30); return { top: Math.round(r.top), bottom: Math.round(r.bottom), docH: document.documentElement.scrollHeight, vh: innerHeight, hit: hit && (hit.tagName + '.' + hit.className), bg: getComputedStyle(document.querySelector('.f-foot')).backgroundColor, text: document.querySelector('.f-foot').innerText.slice(0, 80) }; })));
  console.log(tag, 'overflow:', JSON.stringify(await overflow(page)));

  if (phone) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(200);
    await page.click('.f-nav .f-menu-btn');
    await wait(900);
    await page.screenshot({ path: `${out}/${w}-30-menu-open.png` });
    console.log(tag, 'menu open:', await page.evaluate(() => !!document.querySelector('.f-menu')), 'focus in menu:', await page.evaluate(() => !!document.activeElement?.closest('.f-menu')));
    console.log(tag, 'menu overflow:', JSON.stringify(await overflow(page)));
    // Jump through the menu to Schedule.
    await page.evaluate(() => [...document.querySelectorAll('.f-menu-links a')].find((a) => a.getAttribute('href') === '#schedule').click());
    await wait(1200);
    console.log(tag, 'after menu jump: menu gone =', await page.evaluate(() => !document.querySelector('.f-menu')),
      'schedule top =', await page.evaluate(() => Math.round(document.getElementById('schedule').getBoundingClientRect().top)));
    await page.screenshot({ path: `${out}/${w}-31-after-menu-jump.png` });
    // Esc closes.
    await page.click('.f-nav .f-menu-btn');
    await wait(700);
    await page.keyboard.press('Escape');
    await wait(700);
    console.log(tag, 'esc closes menu:', await page.evaluate(() => !document.querySelector('.f-menu')));
  } else {
    // Nav click: lands the section under the bar.
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(200);
    await page.click('.f-nav-links a[href="#register"]');
    await wait(1500);
    console.log(tag, 'nav click → register top =', await page.evaluate(() => Math.round(document.getElementById('register').getBoundingClientRect().top)), 'active =', await active(page));
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(300);
    await page.screenshot({ path: `${out}/${w}-32-nav-top.png`, clip: { x: 0, y: 0, width: w, height: 120 } });
  }
  await page.screenshot({ path: `${out}/${w}-90-full.png`, fullPage: true });
  await page.close();
}
// Motion mode (no ?still): a deep link skips the gate. Scroll through; every reveal must finish fully shown.
{
  const tag = 'motion@1440';
  const page = await browser.newPage();
  watch(page, tag);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(url.replace('?still&', '?') + '#about', { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(2500);
  const hidden = () => page.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((el) => (el.style.clipPath || '').includes('100%')).length);
  if (!(await page.evaluate(() => document.querySelectorAll('.f-sec').length))) { console.log(tag, 'NOT RENDERED', errors.join(' | ')); await browser.close(); process.exit(1); }
  console.log(tag, 'clipped before scrolling:', await hidden(), 'of', await page.evaluate(() => document.querySelectorAll('[data-reveal]').length));
  await wait(400);
  await page.screenshot({ path: `${out}/1440-40-motion-about-mid.png` });
  for (const id of IDS) {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id);
    await wait(1400);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await wait(1400);
  console.log(tag, 'still clipped after scrolling through:', await hidden());
  await page.close();
}
await browser.close();
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors');
