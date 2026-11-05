// Dissects ONE reference site per run (DISSECT.md). Batch B: gq-ap-extraordinary-lab, era-residence, lando-norris, oryzo-ai.
// Run from site/ ONLY through the lock:
//   node scripts/heavy.mjs "node concepts/refs/dissect/scripts/batch-b.mjs <slug> [phase]"
// phase: all (default) | desk | phone | fonts   (fonts = Node-only: fetch CSS + font files, read the font name tables)
// Rules: one site per browser launch, browser closed after the site, 40 s navigation timeout, JPEG q75, DPR 1.
// Never signs in or submits; only clicks a cookie refusal, an "enter / enable sound" intro, a menu button, or hovers.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { brotliDecompressSync, inflateSync } from 'node:zlib';

const SITES = {
  'gq-ap-extraordinary-lab': { url: 'https://www.gq.com/sponsored/story/the-extraordinary-lab', enter: true },
  'era-residence': { url: 'https://www.era-residence.com/' },
  'lando-norris': { url: 'https://landonorris.com/' },
  'oryzo-ai': { url: 'https://oryzo.ai/' },
};
const slug = process.argv[2];
const phase = process.argv[3] ?? 'all';
const site = SITES[slug];
if (!site) { console.error('usage: batch-b.mjs <' + Object.keys(SITES).join('|') + '> [all|desk|phone|fonts]'); process.exit(2); }

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = `concepts/refs/dissect/shots/${slug}`;
mkdirSync(out, { recursive: true });
const measureFile = `${out}/measure.json`;
const M = existsSync(measureFile) ? JSON.parse(readFileSync(measureFile, 'utf8')) : {};
const save = () => writeFileSync(measureFile, JSON.stringify(M, null, 2));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const log = (...a) => console.log(`[${slug}]`, ...a);

// Captures to memory and writes only if the capture finished in time, so a late screenshot can never
// overwrite a file with a later state of the page.
const shot = async (page, name, limit = 10000) => {
  let late = false;
  try {
    const buf = await Promise.race([page.screenshot({ type: 'jpeg', quality: 75 }), wait(limit).then(() => { late = true; throw new Error('shot timeout'); })]);
    if (late) return null;
    writeFileSync(`${out}/${name}.jpg`, buf);
    return `${name}.jpg`;
  } catch (e) { late = true; log('shot failed', name, e.message); return null; }
};

// Records every getContext call (type + whether it succeeded) and the WebGL renderer string.
const HOOK = () => {
  window.__ctx = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const c = orig.call(this, type, ...rest);
    try {
      let renderer = null;
      if (c && /webgl/.test(type)) { const ext = c.getExtension('WEBGL_debug_renderer_info'); renderer = ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER); }
      if (window.__ctx.length < 40) window.__ctx.push({ type, ok: !!c, renderer, w: this.width, h: this.height });
    } catch { /* ignore */ }
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
    } catch { /* cross-origin frame */ }
  }
  return null;
}

// ---------- in-page measurement ----------
const MEASURE = () => {
  const hex = (c) => {
    const m = c && c.match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?/);
    if (!m) return c;
    const a = m[4] === undefined ? 1 : +m[4];
    if (a === 0) return 'transparent';
    const h = '#' + [m[1], m[2], m[3]].map((v) => Math.round(+v).toString(16).padStart(2, '0')).join('');
    return a < 1 ? `${h}@${a}` : h;
  };
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0; };
  const ownText = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
  const typo = (e) => { if (!e) return null; const s = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { tag: e.tagName.toLowerCase(), cls: (e.className && e.className.baseVal === undefined ? String(e.className) : '').slice(0, 60), text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 70),
      family: s.fontFamily, size: s.fontSize, weight: s.fontWeight, style: s.fontStyle, ls: s.letterSpacing, lh: s.lineHeight, tt: s.textTransform, color: hex(s.color), stretch: s.fontStretch,
      features: s.fontFeatureSettings, x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width) }; };

  // All visible elements with their own text.
  const isConsent = (e) => !!e.closest('[class*="cookie" i], [id*="cookie" i], [class*="consent" i], [id*="consent" i], [id*="onetrust" i], [class*="onetrust" i], [class*="gdpr" i]');
  const textEls = [...document.querySelectorAll('body *')].filter((e) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'svg'].includes(e.tagName) && ownText(e).length > 0 && vis(e) && !isConsent(e));
  const inFirst = (e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  const sig = {};
  for (const e of textEls) {
    const s = getComputedStyle(e); const k = [s.fontFamily, s.fontSize, s.fontWeight, s.letterSpacing, s.lineHeight, s.textTransform, s.fontStyle].join(' | ');
    sig[k] ??= { chars: 0, n: 0, samples: [], colors: {} }; const t = ownText(e);
    sig[k].chars += t.length; sig[k].n++; if (sig[k].samples.length < 3) sig[k].samples.push(t.slice(0, 50));
    const c = hex(s.color); sig[k].colors[c] = (sig[k].colors[c] || 0) + t.length;
  }
  const typeScale = Object.entries(sig).map(([k, v]) => ({ k, ...v })).sort((a, b) => parseFloat(b.k.split(' | ')[1]) - parseFloat(a.k.split(' | ')[1])).slice(0, 40);
  const byChars = Object.entries(sig).map(([k, v]) => ({ k, chars: v.chars })).sort((a, b) => b.chars - a.chars).slice(0, 8);

  const largest = textEls.slice().sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0];
  const para = [...document.querySelectorAll('p, [class*="text"], [class*="paragraph"], [class*="body"]')].find((e) => vis(e) && (e.innerText || '').trim().length > 60 && e.children.length < 6);
  const navRoot = ([...document.querySelectorAll('nav, header, [class*="nav" i], [class*="header" i], [class*="menu" i]')].filter((e) => e.tagName !== 'A' && e.querySelectorAll('a, button').length > 0 && e.getBoundingClientRect().width > 0).sort((a, b) => b.querySelectorAll('a, button').length - a.querySelectorAll('a, button').length)[0] || document.querySelector('nav, header'));
  const navLinks = navRoot ? [...navRoot.querySelectorAll('a, button')].filter(vis) : [];
  const buttons = [...document.querySelectorAll('button, a[class*="button" i], a[class*="btn" i], [role="button"], a[class*="cta" i]')].filter((e) => vis(e) && (e.innerText || '').trim());
  const labels = textEls.filter((e) => { const s = getComputedStyle(e); return parseFloat(s.fontSize) <= 14 && (s.textTransform === 'uppercase' || parseFloat(s.letterSpacing) > 0 || /^[A-Z0-9 .,:/()\-–—+#&]+$/.test(ownText(e))); }).slice(0, 6);
  const monoEls = textEls.filter((e) => /mono|code|courier|jetbrains|ibm plex mono|dm mono|space mono|roboto mono|geist mono/i.test(getComputedStyle(e).fontFamily)).slice(0, 4);

  // Colours
  const bg = {}; const fg = {}; const border = {};
  for (const e of document.querySelectorAll('body, body *')) {
    if (!vis(e)) continue; const s = getComputedStyle(e); const r = e.getBoundingClientRect();
    const b = hex(s.backgroundColor); if (b !== 'transparent') bg[b] = (bg[b] || 0) + Math.round(Math.min(r.width, 1440) * Math.min(r.height, 4000) / 1000);
    const t = ownText(e); if (t) { const c = hex(s.color); fg[c] = (fg[c] || 0) + t.length; }
    if (parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0 || parseFloat(s.borderLeftWidth) > 0) { const c = hex(parseFloat(s.borderTopWidth) > 0 ? s.borderTopColor : parseFloat(s.borderBottomWidth) > 0 ? s.borderBottomColor : s.borderLeftColor); border[c] = (border[c] || 0) + 1; }
    for (const p of ['fill', 'stroke']) { const v = s[p]; if (e instanceof SVGElement && v && v !== 'none' && !/url/.test(v)) { const c = 'svg-' + p + ' ' + hex(v); border[c] = (border[c] || 0) + 1; } }
  }
  const sortObj = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 25);
  const rootVars = {}; const cs = getComputedStyle(document.documentElement);
  const sheetInfo = [];
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch { sheetInfo.push({ href: sh.href, access: false }); continue; }
    sheetInfo.push({ href: sh.href, access: true, n: rules.length });
    const walk = (rs) => { for (const r of rs) {
      if (r.cssRules && !r.selectorText) walk(r.cssRules);
      if (r.selectorText && /(^|,)\s*(:root|html|body)\b/.test(r.selectorText)) for (const p of r.style) if (p.startsWith('--')) rootVars[p] = cs.getPropertyValue(p).trim() || r.style.getPropertyValue(p).trim();
    } };
    walk(rules);
  }
  const colourVars = Object.fromEntries(Object.entries(rootVars).filter(([, v]) => /#[0-9a-f]{3,8}\b|rgb|hsl|oklch|color\(/i.test(v)).slice(0, 80));
  const otherVars = Object.fromEntries(Object.entries(rootVars).filter(([k]) => !(k in colourVars)).slice(0, 60));
  const fontFaces = [];
  for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; }
    const walk = (rs) => { for (const r of rs) { if (r.cssRules && r.type !== 5) walk(r.cssRules); if (r.type === 5) fontFaces.push({ family: r.style.getPropertyValue('font-family'), weight: r.style.getPropertyValue('font-weight'), style: r.style.getPropertyValue('font-style'), src: r.style.getPropertyValue('src').slice(0, 300), sheet: sh.href }); } };
    walk(rules); }

  const sections = [...document.querySelectorAll('section, main > div, [class*="section"]')].filter(vis).slice(0, 30).map((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 50), y: Math.round(r.top + scrollY), h: Math.round(r.height), bg: hex(s.backgroundColor), pt: s.paddingTop, pb: s.paddingBottom, mt: s.marginTop }; });

  // Layout
  const inView = textEls.map((e) => e.getBoundingClientRect()).filter((r) => r.top < innerHeight * 3 && r.width < innerWidth * 0.98);
  const minLeft = Math.min(...inView.map((r) => r.left).filter((x) => x >= 0));
  const maxRight = Math.max(...inView.map((r) => r.right).filter((x) => x <= innerWidth));
  const lefts = {}; for (const r of inView) { const k = Math.round(r.left / 8) * 8; lefts[k] = (lefts[k] || 0) + 1; }
  const maxWidths = {}; for (const e of document.querySelectorAll('body *')) { const v = getComputedStyle(e).maxWidth; if (v !== 'none' && /px|rem|em|ch|vw/.test(v) && e.getBoundingClientRect().width > 300) maxWidths[v] = (maxWidths[v] || 0) + 1; }
  const gridCols = {}; for (const e of document.querySelectorAll('body *')) { const s = getComputedStyle(e); if (s.display.includes('grid') && s.gridTemplateColumns !== 'none') { const n = s.gridTemplateColumns.split(' ').length; const k = `${n} cols (gap ${s.columnGap})`; gridCols[k] = (gridCols[k] || 0) + 1; } }
  let nav = null;
  if (navRoot) { const r = navRoot.getBoundingClientRect(); const s = getComputedStyle(navRoot); let pos = s.position; let p = navRoot.parentElement; while (pos === 'static' && p && p !== document.body) { const ps = getComputedStyle(p).position; if (ps === 'fixed' || ps === 'sticky') pos = ps + ' (parent)'; p = p.parentElement; }
    nav = { tag: navRoot.tagName.toLowerCase(), cls: String(navRoot.className).slice(0, 60), h: Math.round(r.height), top: Math.round(r.top), position: pos, bg: hex(s.backgroundColor), items: navLinks.map((a) => (a.innerText || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 20) }; }
  const fixedEls = [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); return (s.position === 'fixed' || s.position === 'sticky') && vis(e); }).slice(0, 15).map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 60), pos: getComputedStyle(e).position, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60) }; });

  const cursorEls = [...document.querySelectorAll('[class*="cursor" i], [id*="cursor" i]')].slice(0, 5).map((e) => ({ tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 60), pos: getComputedStyle(e).position, w: e.getBoundingClientRect().width }));
  const G = ['gsap', 'ScrollTrigger', 'SplitText', 'Lenis', 'lenis', 'LocomotiveScroll', 'THREE', '__THREE__', 'PIXI', 'barba', 'Swup', 'Webflow', '__NEXT_DATA__', '__NUXT__', '$nuxt', 'Framer', 'Spline', 'Vue', '__VUE__', 'React', '__REACT_DEVTOOLS_GLOBAL_HOOK__', 'jQuery', 'Swiper', 'Splide', 'Matter', 'Rive', 'lottie', 'bodymovin', 'Howler', 'Howl', 'anime', 'Flip', 'CustomEase', 'ScrollSmoother', 'Observer', 'Draggable', 'DrawSVGPlugin', 'MorphSVGPlugin', 'Alpine', 'Sanity', 'Shopify', 'ga', 'gtag', 'Stats', 'dat', 'lil', 'BABYLON', 'OGL', 'ogl', '_lusion'];
  const globals = Object.fromEntries(G.filter((g) => { try { return window[g] !== undefined; } catch { return false; } }).map((g) => [g, (() => { try { const v = window[g]; return v && (v.version || v.VERSION || v.REVISION) || typeof v; } catch { return '?'; } })()]));
  const winKeys = Object.keys(window).filter((k) => !/^(on|webkit)/.test(k)).slice(-60);
  const scripts = [...document.scripts].map((s) => s.src).filter(Boolean);
  const res = performance.getEntriesByType('resource').map((r) => ({ n: r.name, t: r.initiatorType }));
  const fontUrls = [...new Set(res.filter((r) => /\.(woff2?|otf|ttf)(\?|$)/i.test(r.n) || /use\.typekit\.net\/af\/|fonts\.gstatic\.com/.test(r.n)).map((r) => r.n))];
  const cssUrls = [...new Set(res.filter((r) => /\.css(\?|$)/i.test(r.n) || r.t === 'link').map((r) => r.n))].slice(0, 30);
  const hosts = {}; for (const r of res) { try { const h = new URL(r.n).host; hosts[h] = (hosts[h] || 0) + 1; } catch {} }

  return {
    url: location.href, title: document.title, vw: innerWidth, vh: innerHeight,
    pageHeight: document.documentElement.scrollHeight, bodyHeight: document.body.scrollHeight, screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(2),
    htmlClass: document.documentElement.className.slice(0, 200), bodyClass: String(document.body.className).slice(0, 200), htmlAttrs: [...document.documentElement.attributes].map((a) => `${a.name}=${a.value.slice(0, 60)}`),
    docFonts: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style} ${f.status}`),
    fontFaces, fontUrls, cssUrls, sheetInfo,
    roles: { largest: typo(largest), largestFirstScreen: typo(textEls.filter(inFirst).sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0]), firstScreenText: textEls.filter(inFirst).slice(0, 30).map(typo), paragraph: typo(para), nav: navLinks.slice(0, 6).map(typo), buttons: buttons.slice(0, 5).map(typo), labels: labels.map(typo), mono: monoEls.map(typo) },
    typeScale, byChars,
    colours: { html: hex(getComputedStyle(document.documentElement).backgroundColor), body: hex(getComputedStyle(document.body).backgroundColor), bgByArea: sortObj(bg), textByChars: sortObj(fg), borderAndSvg: sortObj(border), colourVars, otherVars, sections },
    layout: { minLeft: Math.round(minLeft), rightMargin: Math.round(innerWidth - maxRight), leftsHistogram: Object.entries(lefts).sort((a, b) => b[1] - a[1]).slice(0, 12), maxWidths: Object.entries(maxWidths).sort((a, b) => b[1] - a[1]).slice(0, 10), gridCols: Object.entries(gridCols).sort((a, b) => b[1] - a[1]).slice(0, 10), nav, fixedEls },
    cursor: { body: getComputedStyle(document.body).cursor, html: getComputedStyle(document.documentElement).cursor, cursorEls },
    tech: { globals, scripts: scripts.slice(0, 40), hosts: Object.entries(hosts).sort((a, b) => b[1] - a[1]).slice(0, 25), canvases: [...document.querySelectorAll('canvas')].map((c) => ({ w: c.width, h: c.height, cssW: Math.round(c.getBoundingClientRect().width), cssH: Math.round(c.getBoundingClientRect().height), cls: String(c.className).slice(0, 40), pos: getComputedStyle(c).position })), ctx: window.__ctx || [], videos: [...document.querySelectorAll('video')].map((v) => ({ src: (v.currentSrc || v.src || (v.querySelector('source') || {}).src || '').slice(0, 140), w: Math.round(v.getBoundingClientRect().width), h: Math.round(v.getBoundingClientRect().height), autoplay: v.autoplay, loop: v.loop, muted: v.muted })), iframes: [...document.querySelectorAll('iframe')].map((f) => f.src.slice(0, 140)), generator: document.querySelector('meta[name="generator"]')?.content || null, winKeysTail: winKeys },
  };
};

async function gentleScrollStep(page, dy) {
  const y0 = await page.evaluate(() => scrollY);
  await page.mouse.move(720, 450);
  for (let i = 0; i < 3; i++) { await page.mouse.wheel({ deltaY: dy / 3 }); await wait(60); }
  return y0;
}

async function desk(browser) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(HOOK);
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const consoleErr = []; page.on('console', (m) => m.type() === 'error' && consoleErr.length < 15 && consoleErr.push(m.text().slice(0, 160)));
  const t0 = Date.now();
  const nav = page.goto(site.url, { waitUntil: 'load', timeout: 40000 }).then((r) => ({ status: r && r.status(), at: Date.now() - t0 })).catch((e) => ({ error: e.message.split('\n')[0], at: Date.now() - t0 }));
  M.loading = [];
  for (const t of [0.2, 0.6, 1.2, 2, 3.5, 6]) {
    const dt = t * 1000 - (Date.now() - t0); if (dt > 0) await wait(dt);
    const at = Date.now() - t0; const f = await shot(page, `load-${String(t).replace('.', '_')}s`, 4000);
    let txt = null; try { txt = await Promise.race([page.evaluate(() => (document.body ? document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 160) : '')), wait(2000)]); } catch {}
    M.loading.push({ target: t, actualMs: at, file: f, visibleText: txt });
  }
  M.nav = await nav; log('nav', JSON.stringify(M.nav));
  if (phase === 'load') { M.loadOnlyRun = new Date().toISOString(); save(); await page.close().catch(() => {}); return; }
  await wait(2500);
  M.cookie = await declineCookies(page); if (M.cookie) await wait(800);
  if (site.enter) {
    await shot(page, 'enter-before');
    // Click the intro's own button ("click anywhere to enable sound" / "enter"); sound is muted by the browser flag.
    const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll('button, [role="button"], a')].find((e) => /enter|start|enable sound|click anywhere|discover|explore/i.test(e.innerText || '') && e.getBoundingClientRect().width > 0); if (b) { b.click(); return (b.innerText || '').trim().slice(0, 60); } return null; });
    if (!clicked) await page.mouse.click(720, 450);
    M.enterClicked = clicked || 'centre click 720,450';
    for (const t of [1, 3, 6]) { await wait(t === 1 ? 1000 : t === 3 ? 2000 : 3000); await shot(page, `enter-after-${t}s`); }
  }
  M.desk = await page.evaluate(MEASURE); save(); log('measured 1440: height', M.desk.pageHeight, 'screens', M.desk.screens);
  await shot(page, 'first-screen');

  // Hover (top of page)
  M.hover = [];
  const targets = await page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; };
    const nr = ([...document.querySelectorAll('nav, header, [class*="nav" i], [class*="header" i], [class*="menu" i]')].filter((e) => e.tagName !== 'A' && e.querySelectorAll('a, button').length > 0 && e.getBoundingClientRect().width > 0).sort((a, b) => b.querySelectorAll('a, button').length - a.querySelectorAll('a, button').length)[0] || document.querySelector('nav, header'));
    const nav = nr ? [...nr.querySelectorAll('a, button')].filter((e) => vis(e) && (e.innerText || '').trim()).slice(0, 3) : [];
    const btn = [...document.querySelectorAll('button, a[class*="button" i], a[class*="btn" i], [role="button"], a[class*="cta" i]')].find((e) => vis(e) && !nav.includes(e) && (e.innerText || '').trim());
    const card = [...document.querySelectorAll('a[class*="card" i], [class*="card" i] a, article a, [class*="item" i] a, main a')].find((e) => vis(e) && !nav.includes(e) && e !== btn);
    return [...nav.map((e) => ['nav', e]), ['button', btn], ['card', card]].filter(([, e]) => e).map(([k, e]) => { const r = e.getBoundingClientRect(); return { kind: k, text: (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40), x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  });
  let hi = 0;
  for (const tg of targets) {
    hi++; await page.mouse.move(100, 880); await wait(500);
    const before = await shot(page, `hover-${hi}-${tg.kind}-before`);
    await page.mouse.move(tg.x, tg.y, { steps: 6 }); await wait(900);
    const after = await shot(page, `hover-${hi}-${tg.kind}-after`);
    M.hover.push({ ...tg, before, after });
  }
  if (!targets.length) M.hover.push({ note: 'no visible nav link, button or card in the first screen' });
  save();

  // Scroll story: 0.5 viewport per step, 700 ms per step, cap 24.
  await page.mouse.move(720, 450);
  M.scroll = [];
  for (let i = 1; i <= 24; i++) {
    const y0 = await gentleScrollStep(page, 450);
    await wait(700);
    const y1 = await page.evaluate(() => scrollY);
    const f = await shot(page, `scroll-${String(i).padStart(2, '0')}`);
    M.scroll.push({ step: i, scrollY: y1, moved: y1 - y0, file: f });
    if (i % 6 === 0) { const c = await declineCookies(page); if (c) M.cookie = (M.cookie || '') + ' / ' + c; }
    const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    if (y1 >= h - 2 && y1 === y0 && y1 > 0) { M.scroll.push({ note: 'reached bottom' }); break; }
  }
  // Mid-page measurement (sections that only exist after scroll).
  M.deskMid = await page.evaluate(MEASURE).catch((e) => ({ error: e.message }));
  M.consoleErrors = consoleErr; save();
  await page.close().catch(() => {});
}

async function phone(browser) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(HOOK);
  await page.setUserAgent(UA_PHONE);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const r = await page.goto(site.url, { waitUntil: 'load', timeout: 40000 }).then((x) => x && x.status()).catch((e) => e.message.split('\n')[0]);
  M.phoneNav = r; await wait(6000);
  M.phoneCookie = await declineCookies(page); if (M.phoneCookie) await wait(800);
  if (site.enter) { await shot(page, 'phone-intro'); await page.evaluate(() => { const b = [...document.querySelectorAll('button, [role="button"], a')].find((e) => /enter|start|enable sound|click anywhere|tap/i.test(e.innerText || '') && e.getBoundingClientRect().width > 0); if (b) b.click(); else document.elementFromPoint(195, 422)?.click(); }); await wait(4000); }
  await shot(page, 'phone-0');
  M.phone = await page.evaluate(MEASURE); save();
  M.phoneScroll = [];
  for (let i = 1; i <= 3; i++) {
    const y0 = await page.evaluate(() => scrollY);
    await page.evaluate(() => window.scrollBy(0, innerHeight * 0.5)); await wait(250);
    if ((await page.evaluate(() => scrollY)) === y0) { await page.mouse.move(195, 422); await page.mouse.wheel({ deltaY: 422 }); }
    await wait(700);
    M.phoneScroll.push({ step: i, scrollY: await page.evaluate(() => scrollY), file: await shot(page, `phone-${i}`) });
  }
  await page.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const menu = await page.evaluate(() => {
    const c = [...document.querySelectorAll('button, [role="button"], a, div, span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.width < 200 && r.height < 120 && r.top < 140; });
    const m = c.find((e) => /^(menu|open menu|☰|≡)(\s+menu)?$/i.test((e.innerText || '').trim()) || /menu/i.test(e.getAttribute('aria-label') || '') || /burger|hamburger|nav-ham|menu-?(btn|button|toggle|trigger|open)|nav-?(toggle|trigger|btn)/i.test(String(e.className)));
    if (!m) return null; const r = m.getBoundingClientRect(); return { text: (m.innerText || m.getAttribute('aria-label') || String(m.className)).trim().slice(0, 60), x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  M.phoneMenu = menu;
  if (menu) { await shot(page, 'phone-menu-before'); await page.mouse.click(menu.x, menu.y); for (const t of [0.3, 1.5]) { await wait(t === 0.3 ? 300 : 1200); await shot(page, `phone-menu-open-${String(t).replace('.', '_')}s`); }
    M.phoneMenuText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 400)); }
  save();
  await page.close().catch(() => {});
}

// ---------- Node-only: fetch CSS + font files, read @font-face and the font name tables ----------
function readUIntBase128(buf, o) { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[o.i++]; v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v >>> 0; } return v >>> 0; }
const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
function tablesOf(buf) {
  const sig = buf.toString('latin1', 0, 4); const T = {};
  if (sig === 'wOF2') {
    const num = buf.readUInt16BE(12); const o = { i: 48 }; const entries = [];
    for (let k = 0; k < num; k++) { const flags = buf[o.i++]; let tag; if ((flags & 63) === 63) { tag = buf.toString('latin1', o.i, o.i + 4); o.i += 4; } else tag = KNOWN[flags & 63];
      const orig = readUIntBase128(buf, o); const ver = flags >> 6; let len = orig;
      const transformed = (tag === 'glyf' || tag === 'loca') ? ver !== 3 : ver !== 0; if (transformed) len = readUIntBase128(buf, o); entries.push({ tag, len, transformed }); }
    const totalCompressed = buf.readUInt32BE(20);
    const data = brotliDecompressSync(buf.subarray(o.i, o.i + totalCompressed)); let off = 0;
    for (const e of entries) { if (!e.transformed) T[e.tag] = data.subarray(off, off + e.len); off += e.len; }
  } else if (sig === 'wOFF') {
    const num = buf.readUInt16BE(12);
    for (let k = 0; k < num; k++) { const p = 44 + k * 20; const tag = buf.toString('latin1', p, p + 4); const off = buf.readUInt32BE(p + 4); const comp = buf.readUInt32BE(p + 8); const orig = buf.readUInt32BE(p + 12); const raw = buf.subarray(off, off + comp); T[tag] = comp < orig ? inflateSync(raw) : raw; }
  } else {
    const num = buf.readUInt16BE(4);
    for (let k = 0; k < num; k++) { const p = 12 + k * 16; T[buf.toString('latin1', p, p + 4)] = buf.subarray(buf.readUInt32BE(p + 8), buf.readUInt32BE(p + 8) + buf.readUInt32BE(p + 12)); }
  }
  return T;
}
function fontInfo(buf) {
  const T = tablesOf(buf); const info = {};
  const n = T.name; if (n) { const count = n.readUInt16BE(2); const so = n.readUInt16BE(4); const want = { 0: 'copyright', 1: 'family', 2: 'subfamily', 4: 'fullName', 5: 'version', 7: 'trademark', 8: 'manufacturer', 9: 'designer', 11: 'vendorUrl', 12: 'designerUrl', 13: 'license', 14: 'licenseUrl', 16: 'typoFamily', 17: 'typoSubfamily' };
    for (let k = 0; k < count; k++) { const p = 6 + k * 12; const pid = n.readUInt16BE(p), eid = n.readUInt16BE(p + 2), nid = n.readUInt16BE(p + 6), len = n.readUInt16BE(p + 8), off = n.readUInt16BE(p + 10);
      if (!(nid in want) || info[want[nid]]) continue; const raw = n.subarray(so + off, so + off + len);
      let s; if (pid === 3 || pid === 0) { s = ''; for (let i = 0; i + 1 < raw.length; i += 2) s += String.fromCharCode(raw.readUInt16BE(i)); } else s = raw.toString('latin1');
      info[want[nid]] = s.slice(0, 300); } }
  const os2 = T['OS/2']; if (os2) { info.vendorId = os2.toString('latin1', 58, 62); info.usWeightClass = os2.readUInt16BE(4); info.fsType = os2.readUInt16BE(8); }
  if (T.fvar) { const f = T.fvar; const axisCount = f.readUInt16BE(8); const ao = f.readUInt16BE(4); info.axes = []; for (let k = 0; k < axisCount; k++) { const p = ao + k * 20; info.axes.push(`${f.toString('latin1', p, p + 4)} ${f.readInt32BE(p + 4) / 65536}-${f.readInt32BE(p + 12) / 65536}`); } }
  return info;
}
async function fonts() {
  const urls = new Set([...(M.desk?.fontUrls ?? []), ...(M.deskMid?.fontUrls ?? []), ...(M.phone?.fontUrls ?? [])]);
  const css = new Set([...(M.desk?.cssUrls ?? []), ...(M.desk?.sheetInfo ?? []).map((s) => s.href).filter(Boolean)]);
  for (const f of [...(M.desk?.fontFaces ?? []), ...(M.deskMid?.fontFaces ?? [])]) { const m = (f.src || '').match(/url\("?([^")]+)"?\)/); if (m && !m[1].startsWith('data:')) urls.add(m[1]); }
  const ref = site.url; M.cssFontFaces = []; M.cssColourVars = {};
  for (const u of css) {
    try { const t = await (await fetch(u, { headers: { 'user-agent': UA, referer: ref }, signal: AbortSignal.timeout(15000) })).text();
      for (const m of t.matchAll(/@font-face\s*{([^}]*)}/g)) { const b = m[1]; M.cssFontFaces.push({ css: u.slice(0, 120), family: (b.match(/font-family:\s*([^;]+)/) || [])[1], weight: (b.match(/font-weight:\s*([^;]+)/) || [])[1], style: (b.match(/font-style:\s*([^;]+)/) || [])[1], src: (b.match(/src:\s*([^;]+)/) || [])[1]?.slice(0, 260) });
        for (const s of (b.match(/url\(([^)]+)\)/g) || [])) { const raw = s.slice(4, -1).replace(/["']/g, ''); if (!raw.startsWith('data:')) { try { urls.add(new URL(raw, u).href); } catch {} } } }
      for (const m of t.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\))/g)) { M.cssColourVars[m[1]] ??= m[2]; }
    } catch (e) { M.cssFontFaces.push({ css: u.slice(0, 120), error: e.message }); }
  }
  M.fontFiles = [];
  for (const u of [...urls].filter((x) => /\.(woff2?|otf|ttf)(\?|$)/i.test(x) || /use\.typekit\.net\/af\/[^"')]*\/l\?|fonts\.gstatic\.com/.test(x)).slice(0, 24)) {
    try { const buf = Buffer.from(await (await fetch(u, { headers: { 'user-agent': UA, referer: ref, origin: new URL(ref).origin }, signal: AbortSignal.timeout(15000) })).arrayBuffer());
      M.fontFiles.push({ url: u.slice(0, 200), bytes: buf.length, ...fontInfo(buf) });
    } catch (e) { M.fontFiles.push({ url: u.slice(0, 200), error: e.message }); }
  }
  save(); log('fonts: files', M.fontFiles.length, 'faces', M.cssFontFaces.length);
}

const launch = () => puppeteer.launch({
  executablePath, headless: true, protocolTimeout: 60000,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--mute-audio', '--disable-dev-shm-usage', '--no-first-run', '--autoplay-policy=no-user-gesture-required',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const shut = async (browser) => { const p = browser.process(); await Promise.race([browser.close().catch(() => {}), wait(8000)]); try { if (p && p.exitCode === null) p.kill('SIGKILL'); } catch {} };

const t = Date.now();
for (const ph of phase === 'all' ? ['desk', 'phone', 'fonts'] : [phase]) {
  if (ph === 'fonts') { await fonts(); continue; }
  const browser = await launch();
  try {
    const r = await Promise.race([(ph === 'phone' ? phone : desk)(browser).then(() => 'ok'), wait(ph === 'phone' ? 90000 : 170000).then(() => 'hard cap')]);
    log(ph, r, `${Date.now() - t}ms`); M[`${ph}Result`] = r; save();
  } catch (e) { log(ph, 'FAIL', e.message.split('\n')[0]); M[`${ph}Error`] = e.message.split('\n')[0]; save(); }
  finally { await shut(browser); }
}
log('done', `${Date.now() - t}ms`);
