// Overlap + bug audit for the Night Lab sections after the hero (clauses → footer, nav, menu, cursor).
// Run from site/ through the lock:  node scripts/heavy.mjs "node concepts/night-lab/audit.mjs before"
//   argv[2] = tag (folder name under shots/v2/night-lab-audit/), argv[3] = optional comma list of widths.
// At each stop it lists visible text boxes that intersect, text cut off by an overflow box, and elements
// that run past the viewport edge. It also checks nav / menu jumps, the menu scroll lock and focus, and
// collects console errors, warnings and failed requests. Uses the shared dev server (never its own).
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';

const URL_ = 'http://127.0.0.1:5320/concepts/night-lab/index.html';
const tag = process.argv[2] ?? 'before';
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
const out = `shots/v2/night-lab-audit/${tag}`;
mkdirSync(out, { recursive: true });
const VIEWS = [[1440, 900], [1280, 720], [1024, 768], [768, 1024], [390, 844], [360, 740]].filter(([w]) => !only || only.includes(w));
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath, headless: true, protocolTimeout: 180000,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const report = { tag, views: {} };
const logs = [];

// ---------------------------------------------------------------- in-page checks
function pageAudit() {
  const W = innerWidth, H = innerHeight;
  const SKIP = '.sr, .cl-ink, .t-inv, .dr-inv, script, style, noscript';
  const name = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (c.length) s += '.' + c.join('.');
    return s;
  };
  const insetOf = (cp, br) => {
    const m = cp.match(/^inset\(([^)]*)\)/);
    if (!m) return null;
    const v = m[1].replace(/round.*$/, '').trim().split(/\s+/).map((x) => x);
    const [t, r = t, b = t, l = r] = v;
    const px = (x, len) => (x.endsWith('%') ? (parseFloat(x) / 100) * len : parseFloat(x) || 0);
    return { l: br.left + px(l, br.width), r: br.right - px(r, br.width), t: br.top + px(t, br.height), b: br.bottom - px(b, br.height) };
  };
  // visible part of rect r for element el: intersect with ancestor overflow boxes and clip-path insets
  const visible = (el, r, { ignoreBody = false, useClipPath = true } = {}) => {
    let v = { l: r.left, r: r.right, t: r.top, b: r.bottom };
    let fixed = false;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse' || +cs.opacity === 0) return null;
      if (a.closest('[inert]') && a === el) { /* inert content is still painted */ }
      const br = a.getBoundingClientRect();
      if (a !== el && !(ignoreBody && a === document.body)) {
        if (cs.overflowX !== 'visible') { v.l = Math.max(v.l, br.left); v.r = Math.min(v.r, br.right); }
        if (cs.overflowY !== 'visible') { v.t = Math.max(v.t, br.top); v.b = Math.min(v.b, br.bottom); }
      }
      if (useClipPath && cs.clipPath && cs.clipPath !== 'none') {
        const ins = insetOf(cs.clipPath, br);
        if (ins) { v.l = Math.max(v.l, ins.l); v.r = Math.min(v.r, ins.r); v.t = Math.max(v.t, ins.t); v.b = Math.min(v.b, ins.b); }
      }
      if (v.r - v.l < 1 || v.b - v.t < 1) return null;
      if (cs.position === 'fixed') { fixed = true; break; }
    }
    v.fixed = fixed;
    return v;
  };
  const vp = (v) => ({ l: Math.max(0, v.l), r: Math.min(W, v.r), t: Math.max(0, v.t), b: Math.min(H, v.b) });
  const area = (v) => Math.max(0, v.r - v.l) * Math.max(0, v.b - v.t);
  const inter = (a, b) => ({ l: Math.max(a.l, b.l), r: Math.min(a.r, b.r), t: Math.max(a.t, b.t), b: Math.min(a.b, b.b) });
  const topLayer = (el) => {
    // which stacking root paints this: the nav, an open dialog, the cursor, or the page
    if (el.closest('.cursor')) return 'cursor';
    if (el.closest('.menu, .plate-view')) return 'dialog';
    if (el.closest('.nav')) return 'nav';
    return 'page';
  };

  // text boxes: one per line of each text node (plus number-flow custom elements, whose text lives in shadow DOM)
  const boxes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest(SKIP)) continue;
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
    for (const r of rects) {
      const v = visible(el, r);
      if (!v) continue;
      const cut = vp(v);
      if (area(cut) < 4) continue;
      const full = area({ l: r.left, r: r.right, t: r.top, b: r.bottom });
      const shown = area(v);
      boxes.push({ el, who: name(el), text: n.textContent.trim().slice(0, 40), v: cut, layer: topLayer(el), clipped: full > 0 ? 1 - shown / full : 0 });
    }
  }
  for (const el of document.querySelectorAll('number-flow-react')) {
    if (el.closest(SKIP)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1) continue;
    const v = visible(el, r);
    if (!v) continue;
    const cut = vp(v);
    if (area(cut) < 4) continue;
    boxes.push({ el, who: name(el), text: '[number ' + (el.getAttribute('aria-label') ?? el.textContent ?? '') + ']', v: cut, layer: topLayer(el), clipped: 0 });
  }
  // a dialog covers the page: only compare inside it
  const dialogOpen = !!document.querySelector('.menu, .plate-view');
  const live = boxes.filter((b) => !dialogOpen || b.layer === 'dialog' || b.layer === 'cursor');

  const overlaps = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      if (a.el === b.el) continue;
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const x = inter(a.v, b.v);
      const w = x.r - x.l, h = x.b - x.t;
      if (w <= 1.5 || h <= 1.5) continue;
      overlaps.push({ a: `${a.who} "${a.text}"`, b: `${b.who} "${b.text}"`, layers: a.layer + '/' + b.layer, w: Math.round(w), h: Math.round(h), at: [Math.round(x.l), Math.round(x.t)] });
    }
  }
  // text that sits under the fixed nav (only meaningful right after a jump)
  const nav = document.querySelector('.nav')?.getBoundingClientRect();
  const underNav = nav ? live.filter((b) => b.layer === 'page' && b.v.t < nav.bottom - 1 && b.v.b > nav.top).map((b) => `${b.who} "${b.text}"`) : [];
  // text cut by an overflow box (not by an animated clip-path), partly shown
  const cut = live.filter((b) => b.clipped > 0.04 && b.clipped < 0.96).map((b) => `${b.who} "${b.text}" ${Math.round(b.clipped * 100)}% hidden`);
  // text cut by the viewport's left / right edge
  const edge = live.filter((b) => b.v.l <= 0.5 || b.v.r >= W - 0.5).map((b) => `${b.who} "${b.text}"`);

  // elements past the viewport edge that nothing clips (body's overflow-x: clip would hide them, so ignore body)
  const wide = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right <= W + 1 && r.left >= -1) continue;
    const v = visible(el, r, { ignoreBody: true, useClipPath: false });
    if (!v) continue;
    if (v.r > W + 1 || v.l < -1) {
      if (v.b < 0 || v.t > H) continue;
      wide.push(`${name(el)} l=${Math.round(v.l)} r=${Math.round(v.r)}`);
    }
  }
  // drop children of an element already listed
  return {
    scrollY: Math.round(scrollY), docW: document.documentElement.scrollWidth, W,
    overlaps, underNav: [...new Set(underNav)].slice(0, 12), cut: [...new Set(cut)].slice(0, 20), edge: [...new Set(edge)].slice(0, 12), wide: [...new Set(wide)].slice(0, 15),
  };
}

// ---------------------------------------------------------------- driving
async function open(w, h) {
  const page = await browser.newPage();
  const t = `${w}x${h}`;
  page.on('console', (m) => { if (['error', 'warn', 'warning'].includes(m.type())) logs.push(`${t} console.${m.type()}: ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => logs.push(`${t} pageerror: ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`${t} requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) logs.push(`${t} http ${r.status()}: ${r.url()}`); });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: w < 768, hasTouch: w < 768 });
  await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('nl-boot-seen', '1'); } catch {} });
  await page.goto(URL_, { waitUntil: 'networkidle2', timeout: 120000 });
  // the hero is being rebuilt in parallel: if a half-saved file breaks the page, reload once
  try { await page.waitForFunction(() => !!window.__nl, { timeout: 45000, polling: 200 }); }
  catch { await page.reload({ waitUntil: 'networkidle2', timeout: 120000 }); await page.waitForFunction(() => !!window.__nl, { timeout: 60000, polling: 200 }); }
  await page.evaluate(() => document.fonts.ready);
  await wait(2200);
  await page.evaluate(() => { window.__auditMark = 1; });
  return page;
}
async function scrollTo(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), Math.round(y));
  await wait(250);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), Math.round(y));
  await wait(1250);
}
const at = (s, f) => Math.round(s.start + (s.end - s.start) * f);

async function check(page, view, name, shot = true) {
  if (!(await page.evaluate(() => window.__auditMark))) throw new Error('page reloaded (HMR from a parallel edit)');
  const r = await page.evaluate(pageAudit);
  if (shot) await page.screenshot({ path: `${out}/${view}-${name}.png` });
  report.views[view].stops[name] = r;
  const flags = [];
  if (r.overlaps.length) flags.push(`${r.overlaps.length} overlaps`);
  if (r.wide.length) flags.push(`${r.wide.length} wide`);
  if (r.cut.length) flags.push(`${r.cut.length} cut`);
  console.log(`  ${name.padEnd(28)} y=${r.scrollY} ${flags.join(', ')}`);
  return r;
}

async function runView(w, h) {
  const view = `${w}x${h}`;
  console.log(view);
  report.views[view] = { stops: {}, jumps: {}, menu: null };
  const page = await open(w, h);
  const s = await page.evaluate(() => window.__nl.stops());
  const top = (sel) => page.evaluate((q) => { const e = document.querySelector(q); if (!e) return null; const b = (e.parentElement?.classList.contains('pin-spacer') ? e.parentElement : e).getBoundingClientRect(); return Math.round(b.top + scrollY); }, sel);
  const bottom = (sel) => page.evaluate((q) => { const e = document.querySelector(q); if (!e) return null; const b = (e.parentElement?.classList.contains('pin-spacer') ? e.parentElement : e).getBoundingClientRect(); return Math.round(b.bottom + scrollY); }, sel);
  report.views[view].triggers = await page.evaluate(() => window.__nl.all());

  // --- clauses
  if (s.clauses) for (const f of [0, 0.5, 1]) { await scrollTo(page, at(s.clauses, f) + (f === 0 ? 2 : f === 1 ? -2 : 0)); await check(page, view, `clauses-${f}`); }
  // between clauses and committees
  const cmTop = await top('#committees');
  await scrollTo(page, cmTop - h * 0.5); await check(page, view, 'clauses-to-committees');
  // --- committees
  if (s.committees) for (const f of [0, 0.5, 1]) { await scrollTo(page, at(s.committees, f) + (f === 0 ? 2 : f === 1 ? -2 : 0)); await check(page, view, `committees-${f}`); }
  else {
    const cmBot = await bottom('#committees');
    for (const [k, y] of [['top', cmTop], ['mid', (cmTop + cmBot) / 2 - h / 2], ['end', cmBot - h]]) { await scrollTo(page, y); await check(page, view, `committees-${k}`); }
  }
  const schTop = await top('#schedule');
  await scrollTo(page, schTop - h * 0.5); await check(page, view, 'committees-to-schedule');
  // --- schedule
  if (s.schedule) for (const f of [0, 0.5, 1]) { await scrollTo(page, at(s.schedule, f) + (f === 0 ? 2 : f === 1 ? -2 : 0)); await check(page, view, `schedule-${f}`); }
  const regTop = await top('#register');
  await scrollTo(page, regTop - h * 0.5); await check(page, view, 'schedule-to-pass');
  await scrollTo(page, regTop); await check(page, view, 'pass-top');
  const deskTop = await top('.desk');
  await scrollTo(page, deskTop - h * 0.6); await check(page, view, 'pass-to-desk');
  await scrollTo(page, deskTop - 56); await check(page, view, 'desk');
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  await scrollTo(page, H - h); await check(page, view, 'footer');

  // --- committee plate hover (fine pointer) and the nameplate dialog
  if (w >= 768) {
    const y = s.committees ? s.committees.end - 2 : cmTop;
    await scrollTo(page, y);
    const tiles = await page.$$('.tile');
    const t = tiles[w >= 1024 ? 6 : 2];
    const box = await t.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 10, box.y + 10); await wait(150);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await wait(1100);
      await check(page, view, 'plate-hover');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(1200);
      const before = await page.evaluate(() => scrollY);
      await page.mouse.wheel({ deltaY: 600 }); await wait(1200);
      const after = await page.evaluate(() => scrollY);
      await check(page, view, 'plate-dialog');
      report.views[view].plateDialogWheel = { before, after, moved: after - before };
      await page.keyboard.press('Escape'); await wait(1000);
      report.views[view].plateDialogClosed = await page.evaluate(() => !document.querySelector('.plate-view'));
      await page.mouse.move(2, h - 2); await wait(400);
    }
  }

  // --- jumps from the nav (desktop links) or the menu (below 1200 px)
  const ids = ['about', 'committees', 'schedule', 'register', 'wellness', 'resources', 'contact'];
  const phoneNav = w < 1200;
  for (const id of ids) {
    // start from the far end of the page each time, so the jump crosses pinned sections
    await scrollTo(page, id === 'about' ? H - h : 0);
    if (phoneNav) {
      await page.click('.menu-pill'); await wait(1200);
      await page.evaluate((i) => [...document.querySelectorAll('.menu .mi a')].find((a) => a.getAttribute('href') === '#' + i)?.click(), id);
    } else {
      await page.evaluate((i) => [...document.querySelectorAll('.nav .nl')].find((a) => a.getAttribute('href') === '#' + i)?.click(), id);
    }
    await wait(2600);
    const j = await page.evaluate((i) => {
      const e = document.getElementById(i);
      const r = e.getBoundingClientRect();
      const st = window.__nl.all();
      return { elTop: Math.round(r.top), elBottom: Math.round(r.bottom), y: Math.round(scrollY), pinned: e.parentElement?.classList.contains('pin-spacer') && getComputedStyle(e).position === 'fixed', menuOpen: !!document.querySelector('.menu'), st: st.filter((t) => t.id).map((t) => `${t.id}:${t.p}`).join(' ') };
    }, id);
    report.views[view].jumps[id] = j;
    const r = await check(page, view, `jump-${id}`);
    j.underNav = r.underNav;
  }

  // --- menu: focus, scroll lock (wheel and touch), Esc
  if (phoneNav) {
    await scrollTo(page, s.schedule ? at(s.schedule, 0.3) : schTop);
    await page.click('.menu-pill'); await wait(1300);
    const m = {};
    m.focusInMenu = await page.evaluate(() => !!document.activeElement?.closest('.menu'));
    m.focused = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80));
    const y0 = await page.evaluate(() => scrollY);
    await page.mouse.move(w / 2, h / 2);
    await page.mouse.wheel({ deltaY: 700 }); await wait(1200);
    m.wheelMoved = (await page.evaluate(() => scrollY)) - y0;
    await check(page, view, 'menu-open');
    // tab cycles inside the menu
    for (let k = 0; k < 14; k++) await page.keyboard.press('Tab');
    m.tabStaysIn = await page.evaluate(() => !!document.activeElement?.closest('.menu'));
    await page.keyboard.press('Escape'); await wait(1100);
    m.closedByEsc = await page.evaluate(() => !document.querySelector('.menu'));
    m.focusBack = await page.evaluate(() => document.activeElement?.className);
    m.htmlOverflowAfter = await page.evaluate(() => getComputedStyle(document.documentElement).overflow + ' / ' + getComputedStyle(document.body).overflow);
    const y1 = await page.evaluate(() => scrollY);
    await page.mouse.wheel({ deltaY: 400 }); await wait(1200);
    m.wheelAfterClose = (await page.evaluate(() => scrollY)) - y1;
    report.views[view].menu = m;
    console.log('  menu', JSON.stringify(m));
  }
  await page.close();
}
for (const [w, h] of VIEWS) {
  for (let tryN = 1; tryN <= 3; tryN++) {
    try { await runView(w, h); break; }
    catch (e) { console.log(`  !! ${w}x${h} try ${tryN} failed: ${e.message.slice(0, 160)}`); for (const p of await browser.pages()) if (p.url().includes('5320')) await p.close().catch(() => {}); }
  }
  writeFileSync(`${out}/report-${only ? only.join('-') : 'all'}.json`, JSON.stringify(report, null, 1));
}

writeFileSync(`${out}/report-${only ? only.join('-') : 'all'}.json`, JSON.stringify(report, null, 1));
// a compact summary
for (const [view, v] of Object.entries(report.views)) {
  console.log('\n==== ' + view);
  for (const [k, r] of Object.entries(v.stops)) {
    if (!r.overlaps.length && !r.wide.length && !r.cut.length) continue;
    console.log(' ' + k);
    for (const o of r.overlaps.slice(0, 10)) console.log(`   OVERLAP ${o.a}  x  ${o.b}  ${o.w}x${o.h} @${o.at} [${o.layers}]`);
    if (r.overlaps.length > 10) console.log(`   ... ${r.overlaps.length - 10} more`);
    for (const x of r.wide) console.log('   WIDE ' + x);
    for (const x of r.cut) console.log('   CUT ' + x);
  }
  for (const [id, j] of Object.entries(v.jumps)) console.log(` jump ${id}: elTop=${j.elTop} y=${j.y} pinned=${j.pinned} menuOpen=${j.menuOpen} underNav=${(j.underNav ?? []).slice(0, 3).join(' | ')}`);
  if (v.plateDialogWheel) console.log(' plate dialog wheel moved page by', v.plateDialogWheel.moved, 'closed', v.plateDialogClosed);
}
console.log('\n' + (logs.length ? 'Console / network:\n' + [...new Set(logs)].join('\n') : 'No console errors or failed requests'));
await browser.close();
