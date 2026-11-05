// Deep audit of one concept: hidden/covered things, stuck animations, nav landing, mobile menu,
// contrast, text size, functional checks (timer, delegate, chair), page length and load metrics.
// Usage: node scripts/audit.mjs <concept-id> [baseUrl]   (dev server must be running)
// Exit code 0 always; read the printed report. Writes shots/<id>/audit.json too.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';

const id = process.argv[2];
const base = (process.argv.slice(3).find((a) => !a.startsWith('--')) || 'http://127.0.0.1:5320').replace(/\/$/, '');
if (!id) { console.error('usage: node scripts/audit.mjs <concept-id> [baseUrl]'); process.exit(1); }
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
mkdirSync(`shots/${id}`, { recursive: true });
const url = (hash, still = false) => `${base}/concepts/${id}/index.html${still ? '?still' : ''}${hash}`;
const sizes = [{ w: 1440, h: 900, mobile: false }, { w: 820, h: 1180, mobile: true }, { w: 390, h: 844, mobile: true }];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { id, issues: [], info: [] };
const issue = (sev, where, msg) => report.issues.push({ sev, where, msg });
const info = (where, msg) => report.info.push({ where, msg });

const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--hide-scrollbars'] });

async function open(hash, s, still = false) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await page.setViewport({ width: s.w, height: s.h, isMobile: s.mobile, hasTouch: s.mobile });
  await page.evaluateOnNewDocument(() => {
    window.__lcp = 0; window.__cls = 0;
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
  });
  await page.goto(url(hash, still), { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1200);
  return { page, errors };
}

// Scroll the whole page slowly so scroll-linked animations run, like a real visitor.
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const max = () => document.documentElement.scrollHeight - innerHeight;
    for (let y = 0; y <= max(); y += 120) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    window.scrollTo(0, max());
  });
  await sleep(1500);
}

// In-page checks, run with the page at its current scroll position after walking every section into view.
const PAGE_CHECKS = async (mobile) => {
  const out = { covered: [], invisible: [], clipped: [], smallText: [], lowContrast: [], noFocus: 0, fixedCover: [] };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const label = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} "${(el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`;
  const effOpacity = (el) => { let o = 1; for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  const srOnly = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return (r.width <= 2 || r.height <= 2) && cs.position === 'absolute' || /sr-only|visually-hidden/.test(el.className || ''); };
  const hiddenByAria = (el) => !!el.closest('[aria-hidden="true"],[inert],[hidden]') || srOnly(el);
  const header = [...document.querySelectorAll('header, nav')].find((e) => ['fixed', 'sticky'].includes(getComputedStyle(e).position));
  const headerBottom = header ? header.getBoundingClientRect().bottom : 0;

  // 1. Interactive elements covered by something else (checked one by one, scrolled to the centre).
  const inter = [...document.querySelectorAll('main a[href], main button, main input, main textarea, main [role="tab"], main [role="option"], footer a, footer button')].filter((e) => vis(e) && !hiddenByAria(e));
  for (const el of inter.slice(0, 120)) {
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const pts = [[r.left + r.width / 2, r.top + r.height / 2]];
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (top && top !== el && !el.contains(top) && !top.contains(el)) {
        if (effOpacity(el) < 0.05) continue;
        out.covered.push(`${label(el)} is under ${label(top)}`);
      }
    }
  }
  // 2. Text that is still invisible after a full scroll (stuck reveal animations).
  const texty = [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main dt, main dd, main td, main label, footer p')].filter((e) => (e.textContent || '').trim().length > 1 && !hiddenByAria(e) && getComputedStyle(e).display !== 'none');
  for (const el of texty) {
    const o = effOpacity(el); const cs = getComputedStyle(el);
    if (o < 0.15 || cs.visibility === 'hidden' || cs.color === 'rgba(0, 0, 0, 0)') out.invisible.push(`${label(el)} opacity=${o.toFixed(2)}`);
  }
  // 3. Clipped text (overflow hidden and content wider/taller than the box), excluding intentional ellipsis.
  for (const el of texty.concat([...document.querySelectorAll('main button, main a, main span')])) {
    if (srOnly(el) || hiddenByAria(el)) continue;
    const cs = getComputedStyle(el);
    if (!/(hidden|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY) || cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') continue;
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 4) if ((el.textContent || '').trim().length > 2 && el.children.length === 0) out.clipped.push(label(el));
  }
  // 4. Small body text on phones.
  if (mobile) for (const el of document.querySelectorAll('main p, main li, main td, main label, main dd')) {
    if (hiddenByAria(el) || !vis(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 14 && (el.textContent || '').trim().length > 20) out.smallText.push(`${label(el)} ${fs}px`);
  }
  // 5. Contrast (text colour vs the first opaque background up the tree; skipped over images).
  const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage !== 'none' && /url\(/.test(cs.backgroundImage)) return null; const c = parse(cs.backgroundColor); if (c.length < 4 || c[3] > 0.9) return c; } return [255, 255, 255, 1]; };
  for (const el of texty.slice(0, 400)) {
    if (!vis(el) || effOpacity(el) < 0.9) continue;
    const fg = parse(getComputedStyle(el).color); const bg = bgOf(el); if (!bg) continue;
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const fs = parseFloat(getComputedStyle(el).fontSize); const big = fs >= 24 || (fs >= 18.7 && parseInt(getComputedStyle(el).fontWeight) >= 700);
    if (ratio < (big ? 3 : 4.5)) out.lowContrast.push(`${label(el)} ${ratio.toFixed(2)}:1`);
  }
  // 6. Fixed/sticky things covering a lot of the screen (overlays left open, cookie-style bars, big headers).
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); if (cs.position !== 'fixed' || !vis(el) || parseFloat(cs.opacity) < 0.05 || cs.pointerEvents === 'none') continue;
    const r = el.getBoundingClientRect(); const area = (Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    if (area > innerWidth * innerHeight * 0.18) out.fixedCover.push(`${label(el)} covers ${Math.round((100 * area) / (innerWidth * innerHeight))}% of the screen`);
  }
  // 7. Things sticking out past the screen edge that html/body overflow-x:hidden would hide from scrollWidth.
  out.offscreen = [];
  const clips = (n) => { const cs = getComputedStyle(n); return /(hidden|clip|auto|scroll)/.test(cs.overflowX) && n !== document.body && n !== document.documentElement; };
  for (const el of document.querySelectorAll('main *, header *, footer *')) {
    if (!vis(el) || hiddenByAria(el) || el.closest('svg')) continue;
    const r = el.getBoundingClientRect();
    if (r.right <= innerWidth + 1 && r.left >= -1) continue;
    let clipped = false; for (let n = el.parentElement; n; n = n.parentElement) if (clips(n)) { clipped = true; break; }
    if (!clipped && ['fixed'].indexOf(getComputedStyle(el).position) === -1 && effOpacity(el) > 0.05) out.offscreen.push(`${label(el)} spans ${Math.round(r.left)}…${Math.round(r.right)}px`);
  }
  out.headerBottom = Math.round(headerBottom);
  return out;
};

// ---------------------------------------------------------------- home: motion on, real scrolling
for (const s of sizes) {
  const where = `home@${s.w}`;
  const { page, errors } = await open('#/', s, false);
  const m = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), h: document.documentElement.scrollHeight, vh: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth }));
  const js = (await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => r.initiatorType === 'script').reduce((a, r) => a + (r.decodedBodySize || 0), 0)));
  await scrollThrough(page);
  const r = await page.evaluate(PAGE_CHECKS, s.mobile);
  const cls = await page.evaluate(() => window.__cls);
  const screens = (m.h / m.vh).toFixed(1);
  info(where, `height ${m.h}px = ${screens} screens; LCP ${m.lcp}ms (dev server); CLS ${cls.toFixed(3)}; scripts ${(js / 1024).toFixed(0)}KB (unminified dev)`);
  if (m.h / m.vh > (s.mobile ? 8.5 : 5.5)) issue('med', where, `page is ${screens} screens tall (target ≤${s.mobile ? 8 : 5})`);
  if (m.overflow > 0) issue('high', where, `horizontal overflow ${m.overflow}px`);
  if (cls > 0.1) issue('med', where, `layout shift CLS ${cls.toFixed(3)} (>0.1)`);
  r.covered.forEach((x) => issue('high', where, `covered: ${x}`));
  r.invisible.slice(0, 12).forEach((x) => issue('high', where, `invisible after scrolling: ${x}`));
  if (r.invisible.length > 12) issue('high', where, `…and ${r.invisible.length - 12} more invisible text elements`);
  r.clipped.slice(0, 8).forEach((x) => issue('med', where, `clipped text: ${x}`));
  r.smallText.slice(0, 6).forEach((x) => issue('low', where, `small text on phone: ${x}`));
  r.lowContrast.slice(0, 10).forEach((x) => issue('med', where, `low contrast: ${x}`));
  r.fixedCover.forEach((x) => issue('med', where, `fixed overlay: ${x}`));
  r.offscreen.slice(0, 6).forEach((x) => issue('high', where, `sticks out past the screen edge (hidden overflow): ${x}`));
  errors.forEach((e) => issue('high', where, `console: ${e}`));

  // Nav: every in-page link should land with its target below the header and in the upper part of the screen.
  await page.evaluate(() => window.scrollTo(0, 0)); await sleep(600);
  if (s.mobile) {
    const pickBurger = () => {
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const c = [...document.querySelectorAll('header button[aria-expanded], nav button[aria-expanded], button[aria-controls][aria-expanded]')].filter(vis);
      const b = c.find((e) => /menu|navigation|sections/i.test((e.getAttribute('aria-label') || '') + ' ' + e.textContent) && !/portal/i.test(e.textContent)) || c[c.length - 1];
      if (b) b.setAttribute('data-audit-burger', '1');
      return !!b;
    };
    if (!(await page.evaluate(pickBurger))) issue('high', where, 'no menu button with aria-expanded found on phone');
    else {
      await page.evaluate(() => document.querySelector('[data-audit-burger]').click()); await sleep(900);
      const st = await page.evaluate(() => {
        const b = document.querySelector('[data-audit-burger]');
        const links = [...document.querySelectorAll('a[href^="#"], [role="dialog"] button, [role="menu"] [role="menuitem"]')].filter((a) => { const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 400 && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.5 && !a.closest('main'); });
        const small = links.filter((a) => a.getBoundingClientRect().height < 44).length;
        return { expanded: b.getAttribute('aria-expanded'), links: links.length, small, labels: links.map((a) => a.textContent.trim().replace(/\s+/g, ' ').slice(0, 18)).slice(0, 16).join(' | ') };
      });
      info(where, `phone menu: expanded=${st.expanded}, ${st.links} visible links: ${st.labels}`);
      if (st.expanded !== 'true') issue('high', where, 'menu button did not set aria-expanded=true');
      if (st.links < 6) issue('high', where, `phone menu shows only ${st.links} links (want all sections + Timer + Portal)`);
      if (st.small) issue('med', where, `${st.small} phone-menu links shorter than 44px`);
      await page.keyboard.press('Escape'); await sleep(600);
      const closed = await page.evaluate(() => document.querySelector('[data-audit-burger]')?.getAttribute('aria-expanded'));
      if (closed === 'true') issue('med', where, 'Escape does not close the phone menu');
    }
  } else {
    const navLinks = await page.evaluate(() => {
      const h = [...document.querySelectorAll('header, nav')].find((e) => ['fixed', 'sticky'].includes(getComputedStyle(e).position)) || document.querySelector('header');
      if (!h) return [];
      return [...h.querySelectorAll('a[href]')].filter((a) => { const r = a.getBoundingClientRect(); return r.width > 0 && getComputedStyle(a).visibility !== 'hidden'; }).map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() }));
    });
    info(where, `top nav links (${navLinks.length}): ${navLinks.map((l) => l.text || l.href).join(' | ')}`);
    const wanted = ['about', 'committees', 'schedule', 'wellness', 'resources', 'contact'];
    const missing = wanted.filter((w) => !navLinks.some((l) => (l.href || '').toLowerCase() === '#' + w));
    if (missing.length) issue('med', where, `top nav has no direct link to: ${missing.join(', ')}`);
    if (!navLinks.some((l) => /#\/timer/.test(l.href))) issue('med', where, 'top nav has no Timer link');
    for (const l of navLinks.filter((l) => /^#[a-z]/i.test(l.href) && !/^#(home|top)$/i.test(l.href))) {
      const res = await page.evaluate(async (href) => {
        const h = [...document.querySelectorAll('header, nav')].find((e) => ['fixed', 'sticky'].includes(getComputedStyle(e).position));
        const a = [...document.querySelectorAll(`a[href="${href}"]`)].find((x) => x.getBoundingClientRect().width > 0);
        const target = document.getElementById(href.slice(1));
        if (!a || !target) return { err: !target ? 'target id missing' : 'link not found' };
        a.click();
        await new Promise((r) => setTimeout(r, 2200));
        const t = target.getBoundingClientRect(); const hb = h ? h.getBoundingClientRect().bottom : 0;
        return { top: Math.round(t.top), hb: Math.round(hb) };
      }, l.href);
      if (res.err) issue('high', where, `nav ${l.href}: ${res.err}`);
      else if (res.top < res.hb - 4) issue('high', where, `nav ${l.href}: section lands UNDER the header (top ${res.top}px, header ends ${res.hb}px)`);
      else if (res.top > 900 * 0.45) issue('med', where, `nav ${l.href}: section top lands low on screen (${res.top}px)`);
    }
  }
  await page.close();
}

// ---------------------------------------------------------------- other views + functional checks
for (const s of sizes) {
  // Timer: Space starts, the time changes, Space pauses, R resets.
  {
    const where = `timer@${s.w}`;
    const { page, errors } = await open('#/timer', s, true);
    // Digits may live in shadow DOM (NumberFlow) or SVG, so also read aria-labels and the live status region.
    const read = () => page.evaluate(() => [
      (document.body.innerText.match(/\b\d{1,2}\s*:\s*\d{2}\b/g) || []).join(','),
      [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter((t) => /\d/.test(t)).join(','),
      [...document.querySelectorAll('[aria-live]')].map((e) => e.textContent.trim()).join(','),
    ].join(' | '));
    const t0 = await read();
    await page.keyboard.press('Space'); await sleep(2300);
    const t1 = await read();
    await page.keyboard.press('Space'); await sleep(300);
    await page.keyboard.press('KeyR'); await sleep(400);
    const t2 = await read();
    if (t0 === t1) issue('high', where, `Space did not start the timer (${t0} → ${t1})`);
    if (t2 !== t0) issue('med', where, `R did not reset (${t0} → ${t2})`);
    const live = await page.evaluate(() => !!document.querySelector('[aria-live]'));
    if (!live) issue('med', where, 'no aria-live state announcement');
    const big = await page.evaluate(() => {
      let best = 0;
      for (const e of document.querySelectorAll('main *')) {
        const t = ((e.getAttribute('aria-label') || '') + ' ' + (e.children.length <= 3 ? e.textContent || '' : '')).trim();
        if (!/\d{1,2}\s*:\s*\d{2}/.test(t) && !/^\d{1,2}$/.test(t)) continue;
        const r = e.getBoundingClientRect();
        if (r.height > innerHeight * 0.9 || r.width > innerWidth * 0.98) continue;
        const fs = e.tagName === 'svg' || e.closest('svg') ? r.height : Math.max(parseFloat(getComputedStyle(e).fontSize), 0);
        best = Math.max(best, Math.min(fs, r.height || fs));
      }
      return best;
    });
    info(where, `largest numeral ${Math.round(big)}px`);
    if (!s.mobile && big < 120) issue('med', where, `timer numerals only ${Math.round(big)}px on desktop (projector needs ≥120px)`);
    const r = await page.evaluate(PAGE_CHECKS, s.mobile);
    r.covered.forEach((x) => issue('high', where, `covered: ${x}`));
    r.lowContrast.slice(0, 5).forEach((x) => issue('med', where, `low contrast: ${x}`));
    errors.forEach((e) => issue('high', where, `console: ${e}`));
    await page.close();
  }
  // Delegate: pick the Chair, type, Ctrl+Enter, expect the toast.
  {
    const where = `portal@${s.w}`;
    const { page, errors } = await open('#/portal', s, true);
    const ok = await page.evaluate(async () => {
      const chip = [...document.querySelectorAll('button, [role="radio"]')].find((b) => b.textContent.trim() === 'Chair');
      const ta = document.querySelector('textarea');
      if (!chip || !ta) return 'missing ' + (!chip ? 'Chair chip' : 'textarea');
      chip.click(); await new Promise((r) => setTimeout(r, 200));
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, 'Audit test chit'); ta.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      await new Promise((r) => setTimeout(r, 500));
      return /Sent to the Chair/i.test(document.body.innerText) ? 'ok' : 'no toast after Ctrl+Enter';
    });
    if (ok !== 'ok') issue('high', where, `send chit: ${ok}`);
    if (!(await page.evaluate(() => /preview|sample/i.test(document.body.innerText)))) issue('med', where, 'no "Preview · sample data" label');
    const r = await page.evaluate(PAGE_CHECKS, s.mobile);
    r.covered.forEach((x) => issue('high', where, `covered: ${x}`));
    r.clipped.slice(0, 5).forEach((x) => issue('med', where, `clipped text: ${x}`));
    r.lowContrast.slice(0, 5).forEach((x) => issue('med', where, `low contrast: ${x}`));
    r.smallText.slice(0, 4).forEach((x) => issue('low', where, `small text on phone: ${x}`));
    errors.forEach((e) => issue('high', where, `console: ${e}`));
    await page.close();
  }
  // Chair: approve the first chit, expect the toast and a shorter queue.
  {
    const where = `chair@${s.w}`;
    const { page, errors } = await open('#/chair', s, true);
    const ok = await page.evaluate(async () => {
      const b = [...document.querySelectorAll('button')].find((x) => /approve/i.test(x.textContent));
      if (!b) return 'no Approve button';
      b.click(); await new Promise((r) => setTimeout(r, 600));
      return /Approved and delivered/i.test(document.body.innerText) ? 'ok' : 'no toast after approve';
    });
    if (ok !== 'ok') issue('high', where, `approve: ${ok}`);
    const r = await page.evaluate(PAGE_CHECKS, s.mobile);
    r.covered.forEach((x) => issue('high', where, `covered: ${x}`));
    r.clipped.slice(0, 5).forEach((x) => issue('med', where, `clipped text: ${x}`));
    r.lowContrast.slice(0, 5).forEach((x) => issue('med', where, `low contrast: ${x}`));
    errors.forEach((e) => issue('high', where, `console: ${e}`));
    await page.close();
  }
}

// Keyboard: the first focusable things must show a visible focus style.
{
  const { page } = await open('#/', sizes[0], true);
  let noRing = 0; const seen = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const cs = getComputedStyle(a); return { t: (a.textContent || a.getAttribute('aria-label') || a.tagName).trim().slice(0, 20), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none' }; });
    if (f) { seen.push(f.t); if (!f.ring) noRing++; }
  }
  info('keyboard@1440', `tab order: ${seen.join(' → ')}`);
  if (noRing > 2) issue('med', 'keyboard@1440', `${noRing} of the first 14 tab stops show no outline/box-shadow focus ring`);
  await page.close();
}

await browser.close();
writeFileSync(`shots/${id}/audit.json`, JSON.stringify(report, null, 2));
const order = { high: 0, med: 1, low: 2 };
report.issues.sort((a, b) => order[a.sev] - order[b.sev]);
console.log(`AUDIT ${id}`);
report.info.forEach((i) => console.log(`  · ${i.where}: ${i.msg}`));
console.log(report.issues.length ? `\n${report.issues.length} issues:` : '\nNo issues.');
report.issues.forEach((i) => console.log(`  [${i.sev}] ${i.where}: ${i.msg}`));
