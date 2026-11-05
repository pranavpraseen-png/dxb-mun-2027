// Follow-up probes for batch C, for details the main pass (batch-c.mjs) could not see. One site per run, through the lock:
//   node scripts/heavy.mjs "node concepts/refs/dissect/scripts/batch-c-probe.mjs outfit-hellohello"
// Same rules: one browser per run, closed at the end, 40 s navigation timeout, JPEG q75, DPR 1,
// never signs in or submits anything. Theme-swatch and menu clicks are plain UI toggles.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';

const slug = process.argv[2];
const URLS = { 'igloo-inc': 'https://www.igloo.inc/', 'siena-film': 'https://siena.film/', 'outfit-hellohello': 'https://outfit.hellohello.is/' };
if (!URLS[slug]) { console.error('usage: batch-c-probe.mjs <slug>'); process.exit(2); }
const url = URLS[slug];
const out = `concepts/refs/dissect/shots/${slug}`;
mkdirSync(out, { recursive: true });
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const P = { slug, startedAt: new Date().toISOString(), shots: [], notes: [] };
const shot = async (page, name) => { try { await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 75 }); P.shots.push(`${name}.jpg`); } catch (e) { P.notes.push(`shot ${name}: ${e.message.split('\n')[0]}`); } };
const extra = process.argv.includes('swiftshader') ? ['--use-angle=swiftshader'] : [];
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--mute-audio', '--disable-dev-shm-usage', '--no-first-run', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', ...extra] });
const shut = async () => { const p = browser.process(); await Promise.race([browser.close().catch(() => {}), wait(8000)]); try { if (p && p.exitCode === null) p.kill('SIGKILL'); } catch {} };

// Snapshot of animated properties for every element under a root, to diff before/after hover.
const snap = (sel) => {
  const root = document.querySelector(sel); if (!root) return null;
  return [root, ...root.querySelectorAll('*')].slice(0, 80).map((e, i) => {
    const cs = getComputedStyle(e);
    return { i, tag: e.tagName, cls: String(e.className?.baseVal ?? e.className ?? '').slice(0, 50), text: (e.childNodes[0]?.nodeType === 3 ? e.childNodes[0].textContent.trim().slice(0, 30) : ''), transform: cs.transform, opacity: cs.opacity, clip: cs.clipPath, color: cs.color, bg: cs.backgroundColor, filter: cs.filter, visibility: cs.visibility, transition: cs.transition.slice(0, 120), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) };
  });
};
const diff = (a, b) => (a && b ? b.map((x, i) => { const y = a[i]; if (!y) return null; const d = {}; for (const k of Object.keys(x)) if (k !== 'i' && x[k] !== y[k]) d[k] = [y[k], x[k]]; return Object.keys(d).length ? { tag: x.tag, cls: x.cls, text: x.text, ...d } : null; }).filter(Boolean) : 'n/a');
const styleOf = (sel, props) => document.querySelectorAll(sel).length ? [...document.querySelectorAll(sel)].slice(0, 6).map((e) => { const cs = getComputedStyle(e); const o = { tag: e.tagName, cls: String(e.className?.baseVal ?? e.className ?? '').slice(0, 70) }; for (const p of props) o[p] = cs.getPropertyValue(p); return o; }) : null;

async function outfit() {
  const page = await browser.newPage();
  await page.setUserAgent(UA); await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const t0 = Date.now();
  page.goto(url, { waitUntil: 'load', timeout: 40000 }).catch((e) => P.notes.push('goto ' + e.message));
  // loader filmstrip: one frame every 300 ms from 0.9 s to 6 s, plus the loader's own type
  for (let t = 900; t <= 6000; t += 300) {
    if (Date.now() - t0 < t) await wait(t - (Date.now() - t0));
    await shot(page, `probe-loader-${String(t).padStart(4, '0')}ms`);
    if (t === 1500 || t === 3000) P[`loader${t}`] = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { const cs = getComputedStyle(e); return (cs.position === 'fixed' || cs.position === 'absolute') && e.getBoundingClientRect().width > 0; }).slice(0, 25).map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { tag: e.tagName, cls: String(e.className?.baseVal ?? e.className ?? '').slice(0, 80), text: (e.innerText || '').trim().slice(0, 30), font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ls ${cs.letterSpacing}`, color: cs.color, bg: cs.backgroundColor, transform: cs.transform, clip: cs.clipPath, opacity: cs.opacity, rect: [r.x, r.y, r.width, r.height].map(Math.round) }; })).catch((e) => e.message);
  }
  await wait(2000);
  P.blend = await page.evaluate(styleOf, 'nav, nav *, [class*="cursor" i], [class*="cursor" i] *', ['mix-blend-mode', 'color', 'position', 'transition', 'width', 'height']);
  P.rule = await page.evaluate(() => { const r = [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.height <= 6 && b.width > 600; }).slice(0, 5); return r.map((e) => { const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return { tag: e.tagName, cls: String(e.className?.baseVal ?? e.className ?? '').slice(0, 60), h: b.height, w: b.width, y: b.y, bg: cs.backgroundColor, borderTop: cs.borderTop, borderBottom: cs.borderBottom, transform: cs.transform }; }); });
  P.svgWordmark = await page.evaluate(() => { const s = [...document.querySelectorAll('svg')].map((e) => ({ e, r: e.getBoundingClientRect() })).sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]; return s ? { rect: [s.r.x, s.r.y, s.r.width, s.r.height].map(Math.round), viewBox: s.e.getAttribute('viewBox'), fill: getComputedStyle(s.e.querySelector('path') || s.e).fill, paths: s.e.querySelectorAll('path').length, parentCls: String(s.e.parentElement.className).slice(0, 80) } : null; });
  // product hover: scroll so the first product row is in view, then hover the first product image
  await page.mouse.move(720, 450); await page.mouse.wheel({ deltaY: 450 }); await wait(1500);
  const card = await page.evaluate(() => {
    const a = [...document.querySelectorAll('section a')].find((e) => { const r = e.getBoundingClientRect(); return r.width > 200 && r.top > 0 && r.bottom < innerHeight; });
    if (!a) return null; a.setAttribute('data-probe', 'card'); const r = a.getBoundingClientRect(); return { href: a.getAttribute('href'), rect: [r.x, r.y, r.width, r.height].map(Math.round) };
  });
  P.card = card;
  if (card) {
    await page.mouse.move(5, 895); await wait(600);
    const before = await page.evaluate(snap, '[data-probe="card"]');
    await shot(page, 'probe-card-before');
    await page.mouse.move(card.rect[0] + card.rect[2] / 2, card.rect[1] + card.rect[3] / 3, { steps: 8 }); await wait(250);
    await shot(page, 'probe-card-hover-250ms');
    await wait(900);
    const after = await page.evaluate(snap, '[data-probe="card"]');
    await shot(page, 'probe-card-hover-1150ms');
    P.cardHoverDiff = diff(before, after);
    P.cursorOnCard = await page.evaluate(styleOf, '[class*="cursor" i], [class*="cursor" i] *', ['width', 'height', 'transform', 'background-color', 'mix-blend-mode', 'opacity']);
  }
  // theme swatches (dark / cream / red): read the ground, ink and cursor colour of each theme
  P.themes = {};
  await page.mouse.wheel({ deltaY: -3000 }); await wait(1200);
  const sw = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.top < 80 && r.left > 1300 && r.width < 30; }).map((b, i) => { b.setAttribute('data-sw', i); const r = b.getBoundingClientRect(); return { i, label: b.getAttribute('aria-label') || b.title || '', x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  P.swatches = sw;
  for (const s of sw) {
    await page.mouse.click(s.x, s.y); await wait(1600);
    await shot(page, `probe-theme-${s.i}`);
    P.themes[s.label || s.i] = await page.evaluate(() => {
      const cs = getComputedStyle(document.body); const r = getComputedStyle(document.documentElement);
      const nav = document.querySelector('nav a'); const p = document.querySelector('section p, footer p');
      return { htmlClass: document.documentElement.className.slice(0, 160), bodyBg: cs.backgroundColor, bodyColor: cs.color, navColor: nav && getComputedStyle(nav).color, navBlend: nav && getComputedStyle(nav.closest('nav')).mixBlendMode, textColor: p && getComputedStyle(p).color, cursor: r.getPropertyValue('--cursor-color'), transition: cs.transition.slice(0, 120) };
    });
  }
  await page.close();
}

// Igloo draws all of its text in WebGL, so the DOM has none. This probe lists the network assets (font atlases, models,
// audio), parses the declared font files, counts colour literals in the app's JS, and films the cursor's effect.
async function igloo() {
  const { default: zlib } = await import('node:zlib');
  const page = await browser.newPage();
  await page.setUserAgent(UA); await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const assets = []; const js = [];
  page.on('response', async (res) => {
    try {
      const u = res.url(); const rt = res.request().resourceType(); const len = +(res.headers()['content-length'] || 0);
      assets.push({ rt, url: u.replace('https://www.igloo.inc', '').slice(0, 140), type: (res.headers()['content-type'] || '').slice(0, 40), len });
      if (rt === 'script' || /\.js(\?|$)/.test(u)) { const t = await res.text(); js.push({ u, t }); }
    } catch {}
  });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 40000 }).catch((e) => P.notes.push('goto ' + e.message));
  P.loadMs = Date.now() - t0;
  // loader filmstrip up to ~9 s (the loader is an ASCII bar; when does it exit?)
  for (let t = 700; t <= 9100; t += 700) { if (Date.now() - t0 < t) await wait(t - (Date.now() - t0)); await shot(page, `probe-loader-${String(t).padStart(4, '0')}ms`); }
  // cursor reaction on the first screen
  await page.mouse.move(200, 450); await wait(600); await shot(page, 'probe-cursor-left');
  await page.mouse.move(1240, 450, { steps: 20 }); await wait(600); await shot(page, 'probe-cursor-right');
  await page.mouse.move(720, 420, { steps: 10 }); await wait(800); await shot(page, 'probe-cursor-igloo');
  // font files declared in @font-face: fetch them from the page and parse their name table in node
  const faces = await page.evaluate(async () => {
    const out = [];
    for (const s of document.styleSheets) { try { for (const r of s.cssRules) if (r.type === 5) { const m = r.style.getPropertyValue('src').match(/url\("?([^")]+\.woff2)"?\)/); if (m) { const b = new Uint8Array(await (await fetch(m[1])).arrayBuffer()); let bin = ''; for (const x of b) bin += String.fromCharCode(x); out.push({ family: r.style.getPropertyValue('font-family'), url: m[1], b64: btoa(bin) }); } } } catch {}
    }
    return out;
  });
  P.fontFaces = [];
  for (const f of faces) {
    const buf = Buffer.from(f.b64, 'base64');
    try {
      const num = buf.readUInt16BE(12), comp = buf.readUInt32BE(20); const o = { p: 48 }; const dir = [];
      const b128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[o.p++]; v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v >>> 0; } return v >>> 0; };
      const KN = ['cmap','head','hhea','hmtx','maxp','name','OS/2','post','cvt ','fpgm','glyf','loca','prep','CFF '];
      for (let i = 0; i < num; i++) { const fl = buf[o.p++]; let tag; if ((fl & 0x3f) === 0x3f) { tag = buf.toString('latin1', o.p, o.p + 4); o.p += 4; } else tag = KN[fl & 0x3f] || 'k' + (fl & 0x3f); const orig = b128(); const tv = (fl >> 6) & 3; let len = orig; if (tag === 'glyf' || tag === 'loca') { if (tv === 0) len = b128(); } else if (tv !== 0) len = b128(); dir.push({ tag, len }); }
      const data = zlib.brotliDecompressSync(buf.subarray(o.p, o.p + comp)); let off = 0; let name;
      for (const d of dir) { if (d.tag === 'name') name = data.subarray(off, off + d.len); off += d.len; }
      const count = name.readUInt16BE(2), so = name.readUInt16BE(4); const got = {};
      for (let i = 0; i < count; i++) { const r = 6 + i * 12; const pid = name.readUInt16BE(r), nid = name.readUInt16BE(r + 6), len = name.readUInt16BE(r + 8), off2 = name.readUInt16BE(r + 10); if (pid !== 3) continue; const s = Buffer.from(name.subarray(so + off2, so + off2 + len)); s.swap16(); got[nid] = s.toString('utf16le').slice(0, 160); }
      P.fontFaces.push({ family: f.family, url: f.url, bytes: buf.length, copyright: got[0], family1: got[1], sub: got[2], version: got[5], manufacturer: got[8], designer: got[9], license: got[13], licenseUrl: got[14] });
    } catch (e) { P.fontFaces.push({ family: f.family, url: f.url, error: e.message }); }
  }
  // what the 3D app loads, and the colour literals in its code
  P.assets = assets.filter((a) => !/^data:/.test(a.url));
  const counts = {};
  for (const { t } of js) for (const m of t.matchAll(/(?:["'`]#([0-9a-fA-F]{6})["'`])|(?:\b0x([0-9a-fA-F]{6})\b)/g)) { const k = '#' + (m[1] || m[2]).toLowerCase(); counts[k] = (counts[k] || 0) + 1; }
  P.jsColors = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 40);
  P.jsFontRefs = [...new Set(js.flatMap(({ t }) => [...t.matchAll(/[\w-]*(?:Plex|Mono|msdf|MSDF|atlas|\.fnt|font-?family)[\w./-]{0,40}/g)].map((m) => m[0])))].slice(0, 40);
  P.jsSizes = js.map(({ u, t }) => ({ u: u.split('/').pop().slice(0, 50), kb: Math.round(t.length / 1024) }));
  await page.close();
}

// Siena ignores small wheel steps in headless (main pass: 24 steps, same film). This probe tries big wheel ticks, a vertical
// drag ("hold and drag") and the arrow key, filming each change; opens the ticket-stub menu and its film dropdown on desktop;
// and opens the real menu button on the phone.
async function siena() {
  const page = await browser.newPage();
  await page.setUserAgent(UA); await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'load', timeout: 40000 }).catch((e) => P.notes.push('goto ' + e.message));
  await wait(6500);
  const click = async (sel, label) => {
    const hit = await page.evaluate((sel) => { const e = [...document.querySelectorAll(sel)].filter((x) => x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().top >= 0).sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: (e.innerText || '').trim().slice(0, 30), cls: String(e.className).slice(0, 60) }; }, sel);
    if (hit) { await page.mouse.move(hit.x, hit.y, { steps: 4 }); await page.mouse.click(hit.x, hit.y); P.notes.push(`clicked ${label} ${JSON.stringify(hit)}`); }
    else P.notes.push(`no ${label}`);
    return hit;
  };
  await page.evaluate(() => { for (const e of document.querySelectorAll('div')) if ((e.innerText || '').trim() === 'ENTER' && e.children.length < 3) e.setAttribute('data-enter', '1'); });
  await click('[data-enter]', 'ENTER'); await wait(4000);
  await page.evaluate(() => { for (const e of document.querySelectorAll('div')) if (/^close$/i.test((e.innerText || '').trim()) && e.children.length < 3) e.setAttribute('data-close', '1'); });
  await click('[data-close]', 'tutorial close'); await wait(1500);
  await shot(page, 'probe-start');
  // ticket-stub geometry and colours
  P.ticket = await page.evaluate(() => {
    const n = document.querySelector('.nav-w'); if (!n) return null;
    return [...n.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 30 && r.height > 20; }).slice(0, 14).map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { cls: String(e.className).slice(0, 50), rect: [r.x, r.y, r.width, r.height].map(Math.round), bg: cs.backgroundColor, radius: cs.borderRadius, border: cs.border, mask: (cs.maskImage || cs.webkitMaskImage || '').slice(0, 80), clip: cs.clipPath.slice(0, 80) }; });
  });
  // 1) big wheel ticks
  await page.mouse.move(720, 450);
  for (let i = 1; i <= 3; i++) { await page.mouse.wheel({ deltaY: 1200 }); await wait(300); await shot(page, `probe-wheel-${i}-300ms`); await wait(900); await shot(page, `probe-wheel-${i}-1200ms`); }
  // 2) hold and drag upwards
  await page.mouse.move(720, 700); await page.mouse.down();
  for (let s = 1; s <= 12; s++) { await page.mouse.move(720, 700 - s * 40); await wait(40); }
  await shot(page, 'probe-drag-held'); await page.mouse.up();
  for (const t of [150, 400, 800, 1400]) { await wait(t === 150 ? 150 : t - [150, 400, 800, 1400][[150, 400, 800, 1400].indexOf(t) - 1]); await shot(page, `probe-drag-release-${t}ms`); }
  // 3) keyboard
  await page.keyboard.press('ArrowDown'); await wait(1200); await shot(page, 'probe-key-down');
  // ticket dropdown (film list) then the hamburger stub
  await click('.nav-w [class*="arrow" i], .nav-w [class*="drop" i], .nav-w svg', 'ticket dropdown'); await wait(250); await shot(page, 'probe-ticket-drop-250ms'); await wait(1000); await shot(page, 'probe-ticket-drop-1250ms');
  await page.keyboard.press('Escape'); await page.mouse.click(720, 880); await wait(1200);
  await click('.nav-w [class*="burger" i], .nav-w [class*="menu" i], .nav-w [class*="hamb" i]', 'menu stub'); await wait(250); await shot(page, 'probe-menu-250ms'); await wait(1000); await shot(page, 'probe-menu-1250ms');
  P.menuType = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const t = (e.innerText || '').trim(); return r.width > 0 && /^(work|about|contact)$/i.test(t); }).map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { t: e.innerText.trim(), font: `${cs.fontFamily.split(',')[0]} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ls ${cs.letterSpacing} ${cs.textTransform}`, color: cs.color, rect: [r.x, r.y, r.width, r.height].map(Math.round) }; }));
  await page.close();
  // phone menu: the real button, top right
  const ph = await browser.newPage();
  await ph.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ph.goto(url, { waitUntil: 'load', timeout: 40000 }).catch((e) => P.notes.push('phone goto ' + e.message));
  await wait(7000);
  const mb = await ph.evaluate(() => { const c = [...document.querySelectorAll('div, a, button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 20 && r.width < 80 && r.height > 20 && r.height < 80 && r.left > 280 && r.top < 100 && r.top >= 0; }).sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width); const e = c[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, cls: String(e.className).slice(0, 60) }; });
  P.phoneMenuBtn = mb;
  if (mb) { await ph.mouse.click(mb.x, mb.y); await wait(300); await shot(ph, 'probe-phone-menu-300ms'); await wait(1200); await shot(ph, 'probe-phone-menu-1500ms'); }
  await ph.close();
}

const runners = { 'outfit-hellohello': outfit, 'igloo-inc': igloo, 'siena-film': siena };
try {
  if (!runners[slug]) throw new Error('no probe for ' + slug);
  await Promise.race([runners[slug](), wait(150000).then(() => P.notes.push('hard cap 150 s'))]);
} catch (e) { P.error = e.stack?.split('\n').slice(0, 3).join(' '); }
finally {
  await shut(); P.ms = Date.now() - Date.parse(P.startedAt);
  writeFileSync(`${out}/probe.json`, JSON.stringify(P, null, 1));
  console.log(`${slug} probe done in ${P.ms}ms, ${P.shots.length} shots, error=${P.error ?? '-'}`);
  process.exit(0); // the hard-cap timer would otherwise keep node (and the lock) alive
}
