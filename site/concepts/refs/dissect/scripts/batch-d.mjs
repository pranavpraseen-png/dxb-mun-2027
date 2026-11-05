// Batch D: dissects the NOT LIKED reference sites (lighter pass, see DISSECT.md).
// Run from site/ ONLY through the lock, ONE site per run:
//   node scripts/heavy.mjs "node concepts/refs/dissect/scripts/batch-d.mjs montfort"
// Captures: loading sequence (0.2/0.6/1.2/2/3.5/6 s), 12 scroll steps of 0.5 viewport (700 ms wait),
// a measured page.evaluate (fonts, colours, tech, layout, nav, cursor), phone first screen + menu.
// Never signs in or submits; only clicks a cookie "reject/decline/deny" button, and a single centre click on
// "click to enter" intros (cartier, immersive-garden) as capture.mjs did. One browser per run, closed at the end.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';

const SITES = {
  montfort: ['https://mont-fort.com/', {}],
  'cartier-waw-2025': ['https://cartier-waw-0225.dev.60fps.fr/', { enter: true, settle: 6000 }],
  floema: ['https://www.floema.com/en', {}],
  'auriga-space': ['https://www.aurigaspace.com/', {}],
  'david-whyte': ['https://davidwhyte.com/experience/', { settle: 2000 }],
  'immersive-garden': ['https://immersive-g.com/', { enter: true, settle: 6000 }],
  'age-of-union': ['https://ageofunion.com/', {}],
};
const slug = process.argv[2];
if (!SITES[slug]) { console.error('usage: batch-d.mjs <' + Object.keys(SITES).join('|') + '>'); process.exit(2); }
const [url, opts] = SITES[slug];
const out = `concepts/refs/dissect/shots/${slug}`;
mkdirSync(out, { recursive: true });
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 75 }).then(() => name + '.jpg').catch((e) => `FAILED ${name}: ${e.message.split('\n')[0]}`);
const R = { slug, url, when: new Date().toISOString(), shots: [], notes: [] };

// Logs every canvas context type requested (detects WebGL without creating contexts ourselves).
const HOOK = () => {
  window.__ctx = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    const c = orig.call(this, type, ...a);
    try { window.__ctx.push({ type, w: this.width, h: this.height, ok: !!c, t: Math.round(performance.now()) }); } catch {}
    return c;
  };
};

async function declineCookies(page) {
  for (const frame of page.frames()) {
    try {
      const hit = await frame.evaluate(() => {
        const rx = /^(reject( all)?|decline( all)?|refuse( all)?|deny|only (necessary|essential)|necessary only|use necessary cookies only|reject non-essential|continue without accepting)/i;
        const all = [];
        const walk = (root) => { for (const e of root.querySelectorAll('*')) { if (e.matches('button, [role="button"], a')) all.push(e); if (e.shadowRoot) walk(e.shadowRoot); } };
        walk(document);
        const el = all.find((e) => rx.test((e.textContent || '').trim()) && e.getBoundingClientRect().width > 0);
        if (el && !el.closest('form[action]')) { el.click(); return (el.textContent || '').trim().slice(0, 40); }
        return null;
      });
      if (hit) return hit;
    } catch { /* detached or cross-origin */ }
  }
  return null;
}

// What is visible during loading: short visible text and any element that looks like a loader.
const LOADSNAP = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && +s.opacity > 0.01 && r.bottom > 0 && r.top < innerHeight; };
  const loaders = [...document.querySelectorAll('[class*="load" i],[id*="load" i],[class*="intro" i],[class*="preload" i],[class*="splash" i]')]
    .filter(vis).slice(0, 6).map((e) => ({ tag: e.tagName, cls: String(e.className).slice(0, 80), text: (e.innerText || '').trim().slice(0, 60), pos: getComputedStyle(e).position }));
  return { ready: document.readyState, text: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 140), loaders, sh: document.documentElement.scrollHeight };
};

// The big measurement pass (runs at 1440 and at 390).
const MEASURE = () => {
  const hex = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return c;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    if (a === 0) return 'transparent';
    const h = '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    return a < 1 ? `${h}@${(+a).toFixed(2)}` : h;
  };
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.01; };
  const typo = (e) => { if (!e) return null; const s = getComputedStyle(e); return { text: (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50), tag: e.tagName, family: s.fontFamily, size: s.fontSize, weight: s.fontWeight, style: s.fontStyle, ls: s.letterSpacing, lh: s.lineHeight, tt: s.textTransform, color: hex(s.color) }; };
  // Text-bearing elements = elements with their own non-empty text node.
  const textEls = [...document.querySelectorAll('body *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0) && !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE'].includes(e.tagName));
  const visText = textEls.filter(vis);
  // Text style census, weighted by characters.
  const census = {};
  for (const e of visText) {
    const s = getComputedStyle(e);
    const k = `${s.fontFamily.split(',')[0].replace(/["']/g, '')} | ${s.fontSize} | ${s.fontWeight} | ls ${s.letterSpacing} | ${s.textTransform}`;
    const n = [...e.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent.trim()).join(' ').length;
    census[k] = census[k] || { chars: 0, sample: '' }; census[k].chars += n; if (!census[k].sample) census[k].sample = (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  }
  const styles = Object.entries(census).sort((a, b) => b[1].chars - a[1].chars).slice(0, 14).map(([k, v]) => `${k}  [${v.chars} chars] "${v.sample}"`);
  const bySize = [...visText].sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize));
  const firstScreen = visText.filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
  const largestFirst = [...firstScreen].sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0];
  const para = visText.find((e) => (e.innerText || '').trim().length > 80 && parseFloat(getComputedStyle(e).fontSize) < 24) || [...document.querySelectorAll('p')].find((p) => (p.innerText || '').trim().length > 40);
  const navRoot = [...document.querySelectorAll('header, nav, [class*="nav" i], [class*="header" i], [class*="menu" i]')].filter((e) => { const r = e.getBoundingClientRect(); return vis(e) && r.top < 160 && r.height < 400 && r.width > 100; })[0] || null;
  const navLinks = navRoot ? [...navRoot.querySelectorAll('a, button, [role="button"]')].filter(vis) : [];
  const buttons = [...document.querySelectorAll('button, [role="button"], a[class*="btn" i], a[class*="button" i], a[class*="cta" i]')].filter(vis);
  const smalls = [...visText].filter((e) => { const s = getComputedStyle(e); return parseFloat(s.fontSize) <= 14 && (s.textTransform === 'uppercase' || parseFloat(s.letterSpacing) > 0.3 || /mono/i.test(s.fontFamily)); });
  // Fonts.
  const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/["']/g, '')} ${f.weight} ${f.style}`);
  const allFaces = [...document.fonts].map((f) => `${f.family.replace(/["']/g, '')} ${f.weight} ${f.style} (${f.status})`);
  const faceSrc = []; const rootVars = {}; const sheetErr = [];
  const scan = (rules, href) => {
    for (const r of rules) {
      if (r.type === 5) faceSrc.push(`${r.style.getPropertyValue('font-family')} ${r.style.getPropertyValue('font-weight')} :: ${r.style.getPropertyValue('src').slice(0, 220)}`);
      else if (r.cssRules) scan(r.cssRules, href);
      if (r.selectorText && /^(:root|html|body)\b/.test(r.selectorText)) for (const p of r.style) if (p.startsWith('--')) { const v = r.style.getPropertyValue(p).trim(); if (/#|rgb|hsl|oklch|color/i.test(v)) rootVars[p] = v; }
    }
  };
  for (const sh of document.styleSheets) { try { scan(sh.cssRules, sh.href); } catch { sheetErr.push(sh.href); } }
  // Colours: backgrounds weighted by visible area (whole document), text weighted by characters.
  const bgArea = {}; const txt = {}; const borders = {};
  for (const e of document.querySelectorAll('body, body *')) {
    const s = getComputedStyle(e); const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || s.display === 'none' || s.visibility === 'hidden') continue;
    const bg = hex(s.backgroundColor); if (bg !== 'transparent') bgArea[bg] = (bgArea[bg] || 0) + Math.min(r.width, innerWidth) * Math.min(r.height, 20000);
    if (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none') { const b = hex(s.borderTopColor); if (b !== 'transparent') borders[b] = (borders[b] || 0) + 1; }
  }
  for (const e of visText) { const c = hex(getComputedStyle(e).color); txt[c] = (txt[c] || 0) + (e.innerText || '').length; }
  const top = (o, n = 10) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${Math.round(v)})`);
  // Tech.
  const scripts = [...document.scripts].filter((s) => s.src).map((s) => { try { const u = new URL(s.src); return u.hostname + u.pathname.split('/').slice(-1)[0].slice(0, 60); } catch { return s.src.slice(0, 80); } });
  const G = ['gsap', 'ScrollTrigger', 'SplitText', 'Lenis', 'lenis', 'LocomotiveScroll', 'THREE', '__THREE__', 'PIXI', 'barba', 'Swup', 'swup', 'Webflow', '__NEXT_DATA__', 'next', '__NUXT__', '$nuxt', 'useNuxtApp', 'Framer', 'Spline', 'Vue', '__VUE__', 'React', '__REACT_DEVTOOLS_GLOBAL_HOOK__', 'Shopify', 'jQuery', 'anime', 'Matter', 'Rive', 'lottie', 'bodymovin', 'Howler', 'Sanity', 'contentful', 'Astro', 'Alpine', 'Barba', 'Taxi', 'Highway', 'ogl', 'OGL'];
  const globals = G.filter((g) => { try { return typeof window[g] !== 'undefined'; } catch { return false; } });
  if (window.__THREE__) globals.push('__THREE__=' + window.__THREE__);
  const markers = {
    vue: !!document.querySelector('[data-v-app]') || [...document.querySelectorAll('*')].slice(0, 400).some((e) => [...e.attributes].some((a) => a.name.startsWith('data-v-'))),
    nuxt: !!document.querySelector('#__nuxt, #__layout'), next: !!document.querySelector('#__next'), webflow: !!document.documentElement.getAttribute('data-wf-page') || !!document.documentElement.getAttribute('data-wf-site'),
    framer: !!document.querySelector('[data-framer-name], #__framer-badge-container'), astro: !!document.querySelector('astro-island'),
    lenisClass: document.documentElement.className.match(/lenis[\w-]*/g), locomotive: !!document.querySelector('[data-scroll-container]') || /has-scroll/.test(document.documentElement.className),
    htmlClass: String(document.documentElement.className).slice(0, 160), bodyClass: String(document.body.className).slice(0, 160),
    generator: document.querySelector('meta[name="generator"]')?.content || null,
  };
  const canvases = [...document.querySelectorAll('canvas')].map((c) => { const r = c.getBoundingClientRect(); return `${c.width}x${c.height} css ${Math.round(r.width)}x${Math.round(r.height)} pos ${getComputedStyle(c).position}`; });
  const videos = [...document.querySelectorAll('video')].map((v) => (v.currentSrc || v.querySelector('source')?.src || v.src || '').split('?')[0].slice(-70) + (v.autoplay ? ' autoplay' : '') + (v.loop ? ' loop' : ''));
  const imgs = document.querySelectorAll('img').length;
  // Layout: text block left/right edges in the first two screens.
  const blocks = visText.map((e) => e.getBoundingClientRect()).filter((r) => r.top < innerHeight * 2 && r.bottom > 0 && r.width > 8);
  const lefts = blocks.map((r) => Math.round(r.left)); const rights = blocks.map((r) => Math.round(r.right));
  const minL = lefts.length ? Math.min(...lefts) : null; const maxR = rights.length ? Math.max(...rights) : null;
  const leftHist = {}; for (const l of lefts) { const k = Math.round(l / 10) * 10; leftHist[k] = (leftHist[k] || 0) + 1; }
  const colStarts = Object.entries(leftHist).filter(([, n]) => n >= 2).map(([k]) => +k).sort((a, b) => a - b);
  // Widest container narrower than the viewport with margin auto (max content width).
  let maxW = null; for (const e of document.querySelectorAll('body *')) { const s = getComputedStyle(e); if (s.maxWidth !== 'none' && s.maxWidth.endsWith('px') && vis(e)) { const w = parseFloat(s.maxWidth); if (w > 600 && (!maxW || w > maxW.w)) maxW = { w, cls: String(e.className).slice(0, 50) }; } }
  const nav = navRoot ? (() => { const r = navRoot.getBoundingClientRect(); const s = getComputedStyle(navRoot); let p = navRoot, pos = s.position; while (p && !['fixed', 'sticky'].includes(pos) && p !== document.body) { p = p.parentElement; pos = p ? getComputedStyle(p).position : pos; } return { tag: navRoot.tagName, cls: String(navRoot.className).slice(0, 60), height: Math.round(r.height), top: Math.round(r.top), position: s.position, ancestorPosition: pos, bg: hex(s.backgroundColor), items: navLinks.map((a) => (a.innerText || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean) }; })() : null;
  const cursorEls = [...document.querySelectorAll('[class*="cursor" i], [id*="cursor" i]')].slice(0, 5).map((e) => `${e.tagName}.${String(e.className).slice(0, 50)} pos=${getComputedStyle(e).position}`);
  const words = (document.body.innerText || '').split(/\s+/).filter(Boolean).length;
  const headings = [...document.querySelectorAll('h1,h2,h3')].filter(vis).length;
  return {
    title: document.title, vw: innerWidth, vh: innerHeight, scrollH: document.documentElement.scrollHeight, bodyH: document.body.scrollHeight, screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(2),
    fonts: { loaded: [...new Set(loaded)], allFaces: [...new Set(allFaces)].slice(0, 40), faceSrc: [...new Set(faceSrc)].slice(0, 30), sheetsUnreadable: sheetErr.length },
    type: { largestOnPage: typo(bySize[0]), largestFirstScreen: typo(largestFirst), body: typo(para), nav: navLinks.slice(0, 3).map(typo), buttons: buttons.slice(0, 3).map(typo), labels: smalls.slice(0, 4).map(typo), styles },
    colour: { html: hex(getComputedStyle(document.documentElement).backgroundColor), body: hex(getComputedStyle(document.body).backgroundColor), bgByArea: top(bgArea), textByChars: top(txt), borders: top(borders, 6), rootVars },
    tech: { scripts: [...new Set(scripts)].slice(0, 40), globals, markers, canvases, ctx: window.__ctx || [], videos, imgs, iframes: document.querySelectorAll('iframe').length, svgs: document.querySelectorAll('svg').length },
    layout: { minLeft: minL, maxRight: maxR, rightMargin: maxR != null ? innerWidth - maxR : null, colStarts, maxWidthRule: maxW, words, headings },
    nav, cursor: { body: getComputedStyle(document.body).cursor, html: getComputedStyle(document.documentElement).cursor, els: cursorEls },
  };
};

const launch = () => puppeteer.launch({
  executablePath, headless: true, protocolTimeout: 30000,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--mute-audio', '--disable-dev-shm-usage', '--no-first-run', '--autoplay-policy=user-gesture-required', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const shut = async (browser) => { const p = browser.process(); await Promise.race([browser.close().catch(() => {}), wait(8000)]); try { if (p && p.exitCode === null) p.kill('SIGKILL'); } catch {} };

async function desktop(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(HOOK);
  const t0 = Date.now();
  const nav = page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 }).then((r) => { R.status = r?.status(); R.domMs = Date.now() - t0; }).catch((e) => { R.notes.push('goto: ' + e.message.split('\n')[0]); });
  R.loading = [];
  for (const ms of [200, 600, 1200, 2000, 3500, 6000]) {
    const d = t0 + ms - Date.now(); if (d > 0) await wait(d);
    const at = Date.now() - t0;
    const name = await shot(page, `load-${String(ms).padStart(4, '0')}`);
    const snap = await page.evaluate(LOADSNAP).catch((e) => ({ err: e.message.split('\n')[0] }));
    R.loading.push({ ms, at, name, ...snap }); R.shots.push(name);
  }
  await nav;
  await wait(2500 + (opts.settle ?? 0));
  R.cookie = await declineCookies(page); if (R.cookie) await wait(800);
  if (opts.enter) { await page.mouse.click(720, 450); R.notes.push('clicked page centre once to enter the intro'); await wait(3500); }
  R.shots.push(await shot(page, 'first-screen'));
  R.desktop = await page.evaluate(MEASURE).catch((e) => ({ err: e.message.split('\n')[0] }));
  // Scroll story: 12 steps of 0.5 viewport with real wheel events.
  await page.mouse.move(720, 450);
  R.scroll = [];
  for (let i = 1; i <= 12; i++) {
    await page.mouse.wheel({ deltaY: 450 });
    await wait(700);
    const st = await page.evaluate(() => {
      const hdr = [...document.querySelectorAll('header, nav')].find((e) => e.getBoundingClientRect().height > 0);
      const r = hdr?.getBoundingClientRect();
      return { y: Math.round(scrollY), sh: document.documentElement.scrollHeight, navTop: r ? Math.round(r.top) : null, navVisible: r ? +getComputedStyle(hdr).opacity > 0.05 && r.bottom > 0 : null };
    }).catch(() => ({}));
    const name = await shot(page, `scroll-${String(i).padStart(2, '0')}`);
    R.scroll.push({ step: i, ...st, name }); R.shots.push(name);
  }
  // Second measurement after scrolling (catches lazy sections, real page length, colours further down).
  R.afterScroll = await page.evaluate(() => ({ scrollH: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(2), words: (document.body.innerText || '').split(/\s+/).filter(Boolean).length, ctx: window.__ctx || [], canvases: document.querySelectorAll('canvas').length, videos: document.querySelectorAll('video').length })).catch(() => null);
  await page.close().catch(() => {});
}

async function phone(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(UA_PHONE);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(HOOK);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch((e) => R.notes.push('phone goto: ' + e.message.split('\n')[0]));
  await wait(7000 + (opts.settle ?? 0));
  await declineCookies(page);
  if (opts.enter) { await page.mouse.click(195, 422); await wait(3500); }
  R.shots.push(await shot(page, 'phone-0'));
  R.phone = await page.evaluate(MEASURE).catch((e) => ({ err: e.message.split('\n')[0] }));
  for (let i = 1; i <= 3; i++) {
    await page.evaluate(() => window.scrollBy(0, innerHeight * 0.8)).catch(() => {});
    await page.mouse.wheel({ deltaY: 600 }).catch(() => {});
    await wait(900);
    R.shots.push(await shot(page, `phone-${i}`));
  }
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await wait(600);
  // Open the menu button if one exists (a click on a menu toggle only, never a form).
  const menu = await page.evaluate(() => {
    const c = [...document.querySelectorAll('button, [role="button"], a, [class*="burger" i], [class*="menu" i], [aria-label*="menu" i]')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < 140 && r.width < 200 && !e.closest('form'); })
      .find((e) => /menu|burger|toggle|hamburger/i.test((e.innerText || '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + e.className));
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: ((c.innerText || c.getAttribute('aria-label') || c.className) + '').trim().slice(0, 40) };
  }).catch(() => null);
  R.phoneMenu = menu;
  if (menu) { await page.mouse.click(menu.x, menu.y); await wait(1600); R.shots.push(await shot(page, 'phone-menu')); }
  await page.close().catch(() => {});
}

// Contact sheets (static local page of the captured JPEGs) so the sequence can be read at a glance.
async function sheets(browser) {
  const { readdirSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const files = readdirSync(out).filter((f) => f.endsWith('.jpg') && !f.startsWith('sheet-'));
  const make = async (name, list, cols, w, h) => {
    if (!list.length) return;
    const { readFileSync: rf } = await import('node:fs');
    const cells = list.map((f) => `<figure><img src="data:image/jpeg;base64,${rf(resolve(out, f)).toString('base64')}" style="width:${w}px;height:${h}px;object-fit:cover"><figcaption>${f}</figcaption></figure>`).join('');
    const page = await browser.newPage();
    await page.setViewport({ width: cols * (w + 8) + 8, height: 400, deviceScaleFactor: 1 });
    await page.setContent(`<style>body{margin:0;padding:4px;background:#888;font:12px monospace;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:8px}figure{margin:0}figcaption{color:#000;background:#fff;padding:1px 4px}</style>${cells}`, { waitUntil: 'load' });
    await page.screenshot({ path: `${out}/sheet-${name}.jpg`, type: 'jpeg', quality: 75, fullPage: true });
    await page.close();
    R.shots.push(`sheet-${name}.jpg`);
  };
  await make('loading', files.filter((f) => f.startsWith('load-')).concat(files.filter((f) => f === 'first-screen.jpg')), 4, 352, 220);
  await make('scroll', files.filter((f) => f.startsWith('scroll-')), 4, 352, 220);
  await make('phone', files.filter((f) => f.startsWith('phone-')), 5, 195, 422);
}

const browser = await launch();
const t = Date.now();
if (process.argv[3] === '--sheets-only') {
  const { readFileSync } = await import('node:fs');
  Object.assign(R, JSON.parse(readFileSync(`${out}/measure.json`, 'utf8')));
  R.shots = R.shots.filter((s) => !s.startsWith('sheet-'));
  await sheets(browser);
  writeFileSync(`${out}/measure.json`, JSON.stringify(R, null, 2));
  await shut(browser);
  console.log(`${slug} sheets done`);
  process.exit(0);
}
try {
  await Promise.race([desktop(browser), wait(90000).then(() => R.notes.push('desktop hard cap 90 s'))]);
  await Promise.race([phone(browser), wait(50000).then(() => R.notes.push('phone hard cap 50 s'))]);
} catch (e) { R.notes.push('error: ' + e.message.split('\n')[0]); }
R.ms = Date.now() - t;
await sheets(browser).catch((e) => R.notes.push('sheets: ' + e.message.split('\n')[0]));
writeFileSync(`${out}/measure.json`, JSON.stringify(R, null, 2));
await shut(browser);
console.log(`${slug} done in ${R.ms} ms, ${R.shots.length} shots, notes: ${R.notes.join(' | ') || '-'}`);
