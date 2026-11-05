// Dissects one reference site per run (batch C: igloo-inc, siena-film, outfit-hellohello). Follows concepts/refs/DISSECT.md.
// Run from site/ ONLY through the lock:
//   node scripts/heavy.mjs "node concepts/refs/dissect/scripts/batch-c.mjs igloo-inc"
// Optional 2nd arg "swiftshader" forces --use-angle=swiftshader (for WebGL that renders blank headless).
// One site per browser launch; the browser is closed (and killed if it hangs) at the end. 40 s navigation timeout.
// JPEG q75, DPR 1. Never signs in, never submits forms, never accepts cookies (only clicks a visible reject/decline).
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const SITES = {
  'igloo-inc': { url: 'https://www.igloo.inc/' },
  'siena-film': { url: 'https://siena.film/' },
  'outfit-hellohello': { url: 'https://outfit.hellohello.is/' },
};
const slug = process.argv[2];
const forceSwift = process.argv.includes('swiftshader');
if (!SITES[slug]) { console.error('usage: batch-c.mjs <' + Object.keys(SITES).join('|') + '> [swiftshader]'); process.exit(2); }
const { url } = SITES[slug];
const out = `concepts/refs/dissect/shots/${slug}`;
mkdirSync(out, { recursive: true });
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const R = { slug, url, startedAt: new Date().toISOString(), shots: [], notes: [] };
const shot = async (page, name) => {
  try { await Promise.race([page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 75 }), wait(15000).then(() => { throw new Error('screenshot > 15 s'); })]); R.shots.push(`${name}.jpg`); return true; }
  catch (e) { R.notes.push(`shot ${name} failed: ${e.message.split('\n')[0]}`); return false; }
};

// ---------- font file name-table parser (ttf/otf, woff, woff2) ----------
const KNOWN = ['cmap','head','hhea','hmtx','maxp','name','OS/2','post','cvt ','fpgm','glyf','loca','prep','CFF ','VORG','EBDT','EBLC','gasp','hdmx','kern','LTSH','PCLT','VDMX','vhea','vmtx','BASE','GDEF','GPOS','GSUB','EBSC','JSTF','MATH','CBDT','CBLC','COLR','CPAL','SVG ','sbix','acnt','avar','bdat','bloc','bsln','cvar','fdsc','feat','fmtx','fvar','gvar','hsty','just','lcar','mort','morx','opbd','prop','trak','Zapf','Silf','Glat','Gloc','Feat','Sill'];
function readB128(buf, o) { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[o.p++]; v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v >>> 0; } return v >>> 0; }
function tablesOf(buf) {
  const sig = buf.toString('latin1', 0, 4);
  const t = {};
  if (sig === 'wOF2') {
    const num = buf.readUInt16BE(12); const comp = buf.readUInt32BE(20);
    const o = { p: 48 }; const dir = [];
    for (let i = 0; i < num; i++) {
      const flags = buf[o.p++]; let tag;
      if ((flags & 0x3f) === 0x3f) { tag = buf.toString('latin1', o.p, o.p + 4); o.p += 4; } else tag = KNOWN[flags & 0x3f];
      const orig = readB128(buf, o); const tv = (flags >> 6) & 3; let len = orig;
      if (tag === 'glyf' || tag === 'loca') { if (tv === 0) len = readB128(buf, o); } else if (tv !== 0) len = readB128(buf, o);
      dir.push({ tag, len });
    }
    const data = zlib.brotliDecompressSync(buf.subarray(o.p, o.p + comp));
    let off = 0; for (const d of dir) { t[d.tag] = data.subarray(off, off + d.len); off += d.len; }
  } else if (sig === 'wOFF') {
    const num = buf.readUInt16BE(12);
    for (let i = 0; i < num; i++) {
      const e = 44 + i * 20; const tag = buf.toString('latin1', e, e + 4);
      const off = buf.readUInt32BE(e + 4), cl = buf.readUInt32BE(e + 8), ol = buf.readUInt32BE(e + 12);
      if (tag !== 'name' && tag !== 'OS/2') continue;
      const raw = buf.subarray(off, off + cl); t[tag] = cl < ol ? zlib.inflateSync(raw) : raw;
    }
  } else {
    const num = buf.readUInt16BE(4);
    for (let i = 0; i < num; i++) {
      const e = 12 + i * 16; const tag = buf.toString('latin1', e, e + 4);
      t[tag] = buf.subarray(buf.readUInt32BE(e + 8), buf.readUInt32BE(e + 8) + buf.readUInt32BE(e + 12));
    }
  }
  return { sig, t };
}
function fontMeta(buf) {
  const { sig, t } = tablesOf(buf);
  const res = { format: sig === 'wOF2' ? 'woff2' : sig === 'wOFF' ? 'woff' : 'sfnt' };
  const n = t.name;
  if (n) {
    const count = n.readUInt16BE(2), so = n.readUInt16BE(4); const pick = {};
    for (let i = 0; i < count; i++) {
      const r = 6 + i * 12; const pid = n.readUInt16BE(r), lid = n.readUInt16BE(r + 4), nid = n.readUInt16BE(r + 6);
      const len = n.readUInt16BE(r + 8), off = n.readUInt16BE(r + 10); const s = n.subarray(so + off, so + off + len);
      let str;
      if (pid === 3 || pid === 0) { const sw = Buffer.from(s); sw.swap16(); str = sw.toString('utf16le'); } else str = s.toString('latin1');
      const score = (pid === 3 && lid === 0x409 ? 3 : pid === 3 ? 2 : 1);
      if (!pick[nid] || pick[nid].score < score) pick[nid] = { score, str };
    }
    const names = { 0: 'copyright', 1: 'family', 2: 'subfamily', 4: 'fullName', 5: 'version', 6: 'postscript', 7: 'trademark', 8: 'manufacturer', 9: 'designer', 11: 'vendorUrl', 12: 'designerUrl', 13: 'license', 14: 'licenseUrl', 16: 'typoFamily', 17: 'typoSubfamily' };
    for (const [k, v] of Object.entries(names)) if (pick[k]) res[v] = pick[k].str.slice(0, k === '13' ? 300 : 200);
  }
  const os2 = t['OS/2'];
  if (os2 && os2.length > 62) { res.vendorID = os2.toString('latin1', 58, 62); res.usWeightClass = os2.readUInt16BE(4); }
  if (t.fvar) res.variable = true;
  return res;
}

// ---------- in-page measurement ----------
function measurePage(label) {
  const W = innerWidth, H = innerHeight;
  const hex = (c) => {
    const m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return c;
    const a = m[4] === undefined ? 1 : +m[4];
    const h = '#' + [m[1], m[2], m[3]].map((v) => Math.round(+v).toString(16).padStart(2, '0')).join('');
    return a === 1 ? h : `${h}@${a}`;
  };
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
  const shown = (el, cs) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const effOpacity = (el) => { let o = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) o *= +getComputedStyle(e).opacity; return Math.round(o * 100) / 100; };
  const typeOf = (el, cs) => ({
    family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, style: cs.fontStyle, ls: cs.letterSpacing, lh: cs.lineHeight,
    transform: cs.textTransform, color: hex(cs.color), variation: cs.fontVariationSettings !== 'normal' ? cs.fontVariationSettings : undefined,
    features: cs.fontFeatureSettings !== 'normal' ? cs.fontFeatureSettings : undefined,
  });
  const leaves = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
    const t = ownText(el); if (!t) continue;
    const cs = getComputedStyle(el); if (!shown(el, cs)) continue;
    const r = el.getBoundingClientRect();
    leaves.push({ el, cs, t, r, px: parseFloat(cs.fontSize) });
  }
  const scale = {};
  for (const L of leaves) {
    const ty = typeOf(L.el, L.cs);
    const key = [ty.family, ty.size, ty.weight, ty.style, ty.ls, ty.lh, ty.transform].join(' | ');
    const s = (scale[key] ||= { ...ty, colors: {}, count: 0, chars: 0, tags: {}, samples: [] });
    s.count++; s.chars += L.t.length; s.tags[L.el.tagName] = 1; s.colors[ty.color] = (s.colors[ty.color] || 0) + L.t.length;
    if (s.samples.length < 4) s.samples.push(L.t.slice(0, 50));
  }
  const typeScale = Object.values(scale).map((s) => ({ ...s, tags: Object.keys(s.tags).join(','), color: undefined, colors: Object.entries(s.colors).sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 3) }))
    .sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
  const desc = (L) => ({ text: L.t.slice(0, 60), tag: L.el.tagName, cls: (L.el.className && L.el.className.baseVal === undefined ? L.el.className : '').toString().slice(0, 60), ...typeOf(L.el, L.cs), opacity: effOpacity(L.el), rect: [Math.round(L.r.x), Math.round(L.r.y), Math.round(L.r.width), Math.round(L.r.height)] });
  const inView = leaves.filter((L) => L.r.bottom > 0 && L.r.top < H && L.r.right > 0 && L.r.left < W);
  const biggest = [...leaves].sort((a, b) => b.px - a.px).slice(0, 5).map(desc);
  const biggestInView = [...inView].sort((a, b) => b.px - a.px).slice(0, 5).map(desc);
  const navRoot = document.querySelector('header nav, nav, header, [class*="nav" i], [class*="menu" i]');
  const navLeaves = leaves.filter((L) => L.el.closest('nav, header, [class*="nav" i], [class*="menu" i], [class*="header" i]')).slice(0, 25).map(desc);
  const buttons = leaves.filter((L) => L.el.closest('button, [role="button"], a[class*="btn" i], a[class*="button" i], [class*="button" i], [class*="cta" i]')).slice(0, 15).map(desc);
  const labels = leaves.filter((L) => L.px <= 13).slice(0, 25).map(desc);
  const paras = leaves.filter((L) => L.t.length > 60).sort((a, b) => b.t.length - a.t.length).slice(0, 6).map(desc);

  // colours
  const bgArea = {}, textChars = {}, borders = {}, svg = {}, gradients = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el); if (cs.display === 'none') continue;
    const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) continue;
    const bg = cs.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { const k = hex(bg); bgArea[k] = (bgArea[k] || 0) + Math.round(r.width * Math.min(r.height, 20000)); }
    if (cs.backgroundImage && cs.backgroundImage.includes('gradient') && gradients.length < 12) gradients.push(cs.backgroundImage.slice(0, 200));
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none') { const k = hex(cs[`border${side}Color`]) + ` ${cs[`border${side}Width`]}`; borders[k] = (borders[k] || 0) + 1; }
    }
    if (el instanceof SVGElement) {
      if (cs.fill && cs.fill !== 'none' && !cs.fill.startsWith('url')) { const k = 'fill ' + hex(cs.fill); svg[k] = (svg[k] || 0) + 1; }
      if (cs.stroke && cs.stroke !== 'none' && !cs.stroke.startsWith('url')) { const k = 'stroke ' + hex(cs.stroke); svg[k] = (svg[k] || 0) + 1; }
    }
  }
  for (const L of leaves) { const k = hex(L.cs.color); textChars[k] = (textChars[k] || 0) + L.t.length; }
  const top = (o, n = 15) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  const sections = [...document.querySelectorAll('main > *, section, footer, header, [class*="section" i]')].slice(0, 40).map((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { tag: el.tagName, cls: String(el.className?.baseVal ?? el.className ?? '').slice(0, 50), top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width), x: Math.round(r.left), bg: hex(cs.backgroundColor), color: hex(cs.color), pad: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`, mt: cs.marginTop, mb: cs.marginBottom, position: cs.position };
  }).filter((s) => s.h > 0);

  // custom properties
  const custom = {};
  const colorRx = /^\s*(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color\()/i;
  const sheets = []; const fontFaces = []; const blocked = [];
  const walkRules = (rules, href) => {
    for (const rule of rules) {
      if (rule.type === 5) fontFaces.push({ family: rule.style.getPropertyValue('font-family'), weight: rule.style.getPropertyValue('font-weight'), style: rule.style.getPropertyValue('font-style'), display: rule.style.getPropertyValue('font-display'), src: rule.style.getPropertyValue('src').slice(0, 400), sheet: href });
      else if (rule.type === 3 && rule.styleSheet) { try { walkRules(rule.styleSheet.cssRules, rule.styleSheet.href); } catch { blocked.push(rule.href); } }
      else if (rule.cssRules && rule.type !== 1) walkRules(rule.cssRules, href);
      if (rule.type === 1 && /(^|,)\s*(:root|html|body)\b/.test(rule.selectorText || '')) {
        for (let i = 0; i < rule.style.length; i++) { const p = rule.style[i]; if (p.startsWith('--')) custom[p] = rule.style.getPropertyValue(p).trim(); }
      }
    }
  };
  for (const s of document.styleSheets) { sheets.push(s.href || 'inline'); try { walkRules(s.cssRules, s.href || 'inline'); } catch { blocked.push(s.href); } }
  const rootCs = getComputedStyle(document.documentElement);
  const customColors = Object.fromEntries(Object.keys(custom).map((k) => [k, rootCs.getPropertyValue(k).trim() || custom[k]]).filter(([, v]) => colorRx.test(v)));

  // tech
  const scripts = [...document.scripts].map((s) => s.src).filter(Boolean);
  const globalsList = ['gsap', 'ScrollTrigger', 'SplitText', 'Lenis', 'lenis', 'LocomotiveScroll', 'THREE', '__THREE__', 'PIXI', 'barba', 'Swup', 'swup', 'Webflow', '__NEXT_DATA__', '__NUXT__', '$nuxt', 'Framer', 'Spline', 'Shopify', 'Vue', '__VUE__', 'React', 'jQuery', 'Howler', 'Howl', 'anime', 'Theatre', '__SVELTEKIT__', 'Astro', 'Alpine', 'Sanity', 'Stats', 'dat', 'lil', 'Rive', 'Lottie', 'lottie', 'bodymovin', 'ogl', 'Matter', 'Prismic', 'Storyblok', '_paq', 'gtag', 'dataLayer', 'fbq'];
  const globals = globalsList.filter((g) => { try { return window[g] !== undefined; } catch { return false; } });
  const nonStd = Object.keys(window).filter((k) => !/^(on|webkit)/.test(k)).slice(-60);
  const markers = {
    vue: !!document.querySelector('[data-v-app], [data-server-rendered]') || [...document.querySelectorAll('*')].slice(0, 400).some((e) => [...e.attributes].some((a) => a.name.startsWith('data-v-'))),
    next: !!document.getElementById('__next'), nuxt: !!document.getElementById('__nuxt'), reactRoot: !!document.querySelector('[data-reactroot]') || !!document.getElementById('root'),
    webflow: document.documentElement.hasAttribute('data-wf-site'), astro: !!document.querySelector('astro-island, [data-astro-cid]'), svelte: !!document.querySelector('[class*="svelte-"]'),
    generator: document.querySelector('meta[name="generator"]')?.content || null,
  };
  const canvases = [...document.querySelectorAll('canvas')].map((c) => { const r = c.getBoundingClientRect(); return { w: c.width, h: c.height, css: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], pos: getComputedStyle(c).position, z: getComputedStyle(c).zIndex }; });
  const ctx = (window.__ctxLog || []).slice(0, 10);
  const videos = [...document.querySelectorAll('video')].map((v) => ({ src: (v.currentSrc || v.src || v.querySelector('source')?.src || '').slice(0, 140), autoplay: v.autoplay, loop: v.loop, muted: v.muted, w: v.videoWidth, h: v.videoHeight }));

  // layout
  const textLefts = inView.map((L) => Math.round(L.r.left)).filter((x) => x >= 0);
  const allLefts = leaves.map((L) => Math.round(L.r.left)).filter((x) => x >= 0 && x < W);
  const allRights = leaves.map((L) => Math.round(W - L.r.right)).filter((x) => x >= 0 && x < W);
  const hist = (arr) => top(arr.reduce((o, x) => { const k = Math.round(x / 4) * 4; o[k] = (o[k] || 0) + 1; return o; }, {}), 14);
  const maxW = [...document.querySelectorAll('body *')].map((el) => { const cs = getComputedStyle(el); return cs.maxWidth !== 'none' && cs.maxWidth.endsWith('px') ? parseFloat(cs.maxWidth) : 0; }).filter((x) => x > 600);
  const fixed = [...document.querySelectorAll('body *')].filter((el) => { const p = getComputedStyle(el).position; return p === 'fixed' || p === 'sticky'; }).slice(0, 20).map((el) => {
    const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: String(el.className?.baseVal ?? el.className ?? '').slice(0, 60), pos: getComputedStyle(el).position, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 80) };
  });
  const navEl = document.querySelector('header') || document.querySelector('nav');
  const nav = navEl ? (() => { const r = navEl.getBoundingClientRect(); const cs = getComputedStyle(navEl); const links = [...navEl.querySelectorAll('a, button')].filter((a) => a.getBoundingClientRect().width > 0).map((a) => (a.innerText || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40)); return { tag: navEl.tagName, pos: cs.position, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], bg: hex(cs.backgroundColor), links }; })() : null;
  const cursorEls = [...document.querySelectorAll('[class*="cursor" i], [id*="cursor" i]')].slice(0, 6).map((el) => { const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: String(el.className?.baseVal ?? el.className ?? '').slice(0, 60), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], pos: getComputedStyle(el).position }; });
  const fontsLoaded = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style} ${f.status}`);
  return {
    label, viewport: [W, H], scrollY, docHeight: document.documentElement.scrollHeight, bodyHeight: document.body.scrollHeight, screens: +(document.documentElement.scrollHeight / H).toFixed(2), title: document.title,
    htmlBg: hex(getComputedStyle(document.documentElement).backgroundColor), bodyBg: hex(getComputedStyle(document.body).backgroundColor), bodyColor: hex(getComputedStyle(document.body).color),
    bodyFont: getComputedStyle(document.body).fontFamily, bodyCursor: getComputedStyle(document.body).cursor, htmlCursor: getComputedStyle(document.documentElement).cursor,
    selectionNote: null, scrollBehavior: rootCs.scrollBehavior, htmlClass: document.documentElement.className.slice(0, 200), bodyClass: document.body.className.slice(0, 200),
    fontsLoaded, fontFaces, sheets, blockedSheets: blocked,
    biggest, biggestInView, navLeaves, buttons, labels, paras, typeScale: typeScale.slice(0, 40), typeScaleCount: typeScale.length,
    colors: { bgByArea: top(bgArea), textByChars: top(textChars), borders: top(borders, 10), svg: top(svg, 10), gradients }, customColors, customCount: Object.keys(custom).length,
    sections, scripts, globals, nonStdGlobalsTail: nonStd, markers, canvases, ctx, videos,
    layout: { leftsInView: hist(textLefts), leftsAll: hist(allLefts), rightsAll: hist(allRights), maxWidths: [...new Set(maxW)].sort((a, b) => b - a).slice(0, 8), fixed, nav },
    cursorEls, overflowX: document.documentElement.scrollWidth > innerWidth,
  };
}

// colour histogram of a screenshot, computed in a blank page (works for canvas/WebGL grounds the DOM can't see)
async function pixelPalette(browser, file) {
  const { readFileSync } = await import('node:fs');
  const b64 = readFileSync(file).toString('base64');
  const p = await browser.newPage();
  try {
    return await p.evaluate(async (b64) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bin], { type: 'image/jpeg' }));
      const c = new OffscreenCanvas(bmp.width, bmp.height); const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, bmp.width, bmp.height).data; const buckets = new Map(); let n = 0;
      for (let i = 0; i < d.length; i += 4 * 3) { // every 3rd pixel
        const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        const b = buckets.get(k) || [0, 0, 0, 0]; b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; buckets.set(k, b); n++;
      }
      return [...buckets.values()].sort((a, b) => b[3] - a[3]).slice(0, 12).map((b) => '#' + [b[0], b[1], b[2]].map((v) => Math.round(v / b[3]).toString(16).padStart(2, '0')).join('') + ` ${(100 * b[3] / n).toFixed(1)}%`);
    }, b64);
  } finally { await p.close(); }
}

async function declineCookies(page) {
  try {
    return await page.evaluate(() => {
      const rx = /^(reject( all)?|decline( all)?|refuse( all)?|deny|only (necessary|essential)|necessary only|reject non-essential|continue without accepting)/i;
      const el = [...document.querySelectorAll('button, [role="button"], a')].find((e) => rx.test((e.textContent || '').trim()) && e.getBoundingClientRect().width > 0);
      if (el && !el.closest('form[action]')) { el.click(); return el.textContent.trim().slice(0, 40); }
      return null;
    });
  } catch { return null; }
}

// Clicks a visible "enter / explore / without sound" style intro gate (starts the experience; sound stays muted). Never a form.
async function passGate(page) {
  try {
    const hit = await page.evaluate(() => {
      const rx = /^(enter|enter site|start|begin|continue|enter without sound|without sound|sound off|no sound|mute|skip)$/i;
      // the smallest visible element whose whole text is the gate word (a wrapper's centre could miss the button)
      const el = [...document.querySelectorAll('button, [role="button"], a, div, span')].filter((e) => { const t = (e.innerText || '').trim(); const r = e.getBoundingClientRect(); return t.length < 30 && rx.test(t) && r.width > 0 && r.top < innerHeight && r.bottom > 0 && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0.1 && !e.closest('form'); })
        .sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0];
      if (!el) return null; const r = el.getBoundingClientRect(); return { text: el.innerText.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!hit) return null;
    await page.mouse.move(hit.x, hit.y, { steps: 4 }); await page.mouse.click(hit.x, hit.y); // a real click (some gates ignore element.click())
    return `${hit.text} @${Math.round(hit.x)},${Math.round(hit.y)}`;
  } catch { return null; }
}

const args = ['--hide-scrollbars', '--force-color-profile=srgb', '--mute-audio', '--disable-dev-shm-usage', '--no-first-run', '--autoplay-policy=user-gesture-required', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
if (forceSwift) args.push('--use-angle=swiftshader');
R.launchArgs = args;
const browser = await puppeteer.launch({ executablePath, headless: true, args, protocolTimeout: 30000 });
const shut = async () => { const p = browser.process(); await Promise.race([browser.close().catch(() => {}), wait(8000)]); try { if (p && p.exitCode === null) p.kill('SIGKILL'); } catch {} };

const hookCtx = () => {
  window.__ctxLog = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    const c = orig.call(this, type, opts);
    try {
      if (c && !this.__logged) {
        this.__logged = 1; const e = { type, w: this.width, h: this.height };
        if (/webgl/.test(type)) { const ext = c.getExtension('WEBGL_debug_renderer_info'); e.renderer = ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER); e.version = c.getParameter(c.VERSION); }
        window.__ctxLog.push(e);
      }
    } catch {}
    return c;
  };
};

async function run() {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(hookCtx);
  const net = { fonts: [], scriptHosts: {}, scripts: [], css: [], other: {} };
  const fontBufs = [];
  const jsMarkers = {};
  const MARK = { gsap: /GreenSock|gsap\.registerPlugin|_gsap|"gsap"/, ScrollTrigger: /ScrollTrigger/, SplitText: /SplitText/, Flip: /\bFlip\b.*getState|Flip\.from/, lenis: /lenis|Lenis/, locomotive: /locomotive-scroll|LocomotiveScroll/, three: /THREE\.|three\.module|WebGLRenderer/, ogl: /\bogl\b|new Renderer\(.*dpr/, pixi: /PIXI|pixi\.js/, barba: /barba/i, swup: /swup/i, highway: /@dogstudio\/highway|Highway\.Core/, taxi: /@unseenco\/taxi/, react: /react\.production|__SECRET_INTERNALS|createElement\("div"|jsx\(/, vue: /__VUE__|createVNode|_createElementVNode/, svelte: /svelte/i, nuxt: /__NUXT__|nuxt/, next: /__NEXT_DATA__|next\/router/, howler: /howler|Howl\b/, theatre: /@theatre/, gltf: /GLTFLoader|KHR_|glTF/, draco: /DRACOLoader|draco/i, ktx2: /KTX2Loader|basis/i, postprocessing: /EffectComposer|postprocessing/, shopify: /Shopify|storefront/i, sanity: /sanity/i, prismic: /prismic/i, motion: /framer-motion|motion\/react/, anime: /animejs|anime\.timeline/, lottie: /lottie|bodymovin/, rive: /@rive-app/, matter: /Matter\.Engine/, howler2: /AudioContext/, glsl: /gl_FragColor|gl_Position/ };
  page.on('response', async (res) => {
    try {
      const rt = res.request().resourceType(); const u = res.url(); const host = new URL(u).hostname;
      if (rt === 'font' || /\.(woff2?|ttf|otf)(\?|$)/i.test(u)) {
        const buf = await res.buffer(); net.fonts.push({ url: u.slice(0, 200), bytes: buf.length }); fontBufs.push({ url: u, buf });
      } else if (rt === 'script') {
        net.scriptHosts[host] = (net.scriptHosts[host] || 0) + 1; net.scripts.push(u.slice(0, 160));
        if (res.status() === 200) {
          const txt = await res.text().catch(() => '');
          const m = txt.match(/REVISION\s*=\s*["'](\d+)["']/) || txt.match(/["']?REVISION["']?\s*[:=]\s*["'](\d+)/); if (m) jsMarkers.threeRevision = m[1];
          const gv = txt.match(/version:\s*"(3\.\d+\.\d+)"[^]{0,80}?gsap|gsap[^]{0,200}?version\s*[:=]\s*"(3\.\d+\.\d+)"/); if (gv) jsMarkers.gsapVersion = gv[1] || gv[2];
          const lv = txt.match(/lenis[^]{0,120}?version\s*[:=]?\s*["'](1\.\d+\.\d+)/i); if (lv) jsMarkers.lenisVersion = lv[1];
          const rv = txt.match(/"(1[89]\.\d+\.\d+)"[^]{0,40}?react|react[^]{0,60}?version\s*[:=]\s*"(1[89]\.\d+\.\d+)"/i); if (rv) jsMarkers.reactVersion = rv[1] || rv[2];
          for (const [k, rx] of Object.entries(MARK)) if (rx.test(txt)) (jsMarkers[k] ||= []).push(u.split('/').pop().slice(0, 50));
        }
      } else if (rt === 'stylesheet') net.css.push(u.slice(0, 200));
      else { const k = `${rt}`; net.other[k] = (net.other[k] || 0) + 1; }
    } catch {}
  });
  const consoleErr = []; page.on('console', (m) => m.type() === 'error' && consoleErr.length < 15 && consoleErr.push(m.text().slice(0, 160)));
  page.on('pageerror', (e) => consoleErr.length < 15 && consoleErr.push('pageerror ' + e.message.slice(0, 160)));

  // 1. loading sequence. page.screenshot() hangs before the first paint, so the frames come from a CDP screencast
  // (JPEG q75, every painted frame); at each due time the latest painted frame is written, with its real timestamp.
  const cdp = await page.createCDPSession();
  let latest = null;
  cdp.on('Page.screencastFrame', (f) => { latest = { t: Date.now() - t0, data: f.data }; cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  const t0 = Date.now();
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 75, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
  const nav = page.goto(url, { waitUntil: 'load', timeout: 40000 }).then((r) => { R.loadEventMs = Date.now() - t0; R.status = r?.status(); }).catch((e) => { R.notes.push('goto: ' + e.message.split('\n')[0]); });
  for (const s of [0.2, 0.6, 1.2, 2, 3.5, 6]) {
    const due = t0 + s * 1000; if (Date.now() < due) await wait(due - Date.now());
    const name = `load-${String(s).replace('.', '_')}s`;
    if (latest) { writeFileSync(`${out}/${name}.jpg`, Buffer.from(latest.data, 'base64')); R.shots.push(`${name}.jpg`); R.notes.push(`${name}: frame painted at ${latest.t}ms`); }
    else R.notes.push(`${name}: nothing painted yet (blank)`);
  }
  await cdp.send('Page.stopScreencast').catch(() => {});
  await nav;
  await wait(2500);
  R.cookie = await declineCookies(page);
  R.measureLoaded = await page.evaluate(measurePage, 'after-load-8.5s').catch((e) => ({ error: e.message }));
  await shot(page, 'first-screen-pre-gate');
  R.gate = await passGate(page);
  if (R.gate) {
    // the gate's exit, frame by frame (0.4 s apart), then the settled first screen
    for (let i = 1; i <= 6; i++) { await wait(400); await shot(page, `gate-exit-${i * 400}ms`); }
    await wait(1500); await shot(page, 'first-screen-after-gate');
    // close an on-screen tutorial tip if there is one (a plain UI close, not a consent or form)
    const tip = await page.evaluate(() => { const e = [...document.querySelectorAll('div, button, a, span')].filter((x) => /^close$/i.test((x.innerText || '').trim()) && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().top < innerHeight && x.getBoundingClientRect().top > 0).sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }).catch(() => null);
    if (tip) { await page.mouse.click(tip.x, tip.y); await wait(1200); R.notes.push('closed tutorial tip'); await shot(page, 'first-screen-clean'); }
  }
  R.palFirst = await pixelPalette(browser, `${out}/${R.gate ? 'first-screen-after-gate' : 'first-screen-pre-gate'}.jpg`).catch((e) => e.message);
  R.measureFirst = await page.evaluate(measurePage, 'first-screen').catch((e) => ({ error: e.message }));

  // 3. hover (on the first screen, before scrolling)
  R.hover = [];
  const targets = await page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; };
    const pick = [];
    const navA = [...document.querySelectorAll('header a, nav a, header button, nav button, [class*="nav" i] a, [class*="menu" i] a, [class*="menu" i] button, [class*="header" i] a')].filter(vis);
    for (const a of navA.slice(0, 4)) pick.push(['nav', a]);
    const btn = [...document.querySelectorAll('button, [role="button"], a[class*="btn" i], a[class*="button" i], [class*="button" i], [class*="cta" i]')].filter(vis).filter((e) => !navA.includes(e))[0];
    if (btn) pick.push(['button', btn]);
    const card = [...document.querySelectorAll('main a, a[class*="card" i], [class*="card" i], [class*="product" i] a, a')].filter(vis).filter((e) => !navA.includes(e) && e !== btn).sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
    if (card) pick.push(['card', card]);
    return pick.map(([k, e]) => { const r = e.getBoundingClientRect(); e.setAttribute('data-dissect-hover', k); return { kind: k, text: (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40), x: r.x + r.width / 2, y: r.y + r.height / 2, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; });
  }).catch(() => []);
  const styleSnap = (x, y) => page.evaluate((x, y) => {
    const e = document.elementFromPoint(x, y); if (!e) return null; const out = {};
    for (const el of [e, e.closest('a,button') || e]) { const cs = getComputedStyle(el); out[el === e ? 'hit' : 'link'] = { tag: el.tagName, color: cs.color, bg: cs.backgroundColor, transform: cs.transform, opacity: cs.opacity, textDecoration: cs.textDecorationLine, transition: cs.transition.slice(0, 160), cursor: cs.cursor, clip: cs.clipPath }; }
    return out;
  }, x, y).catch(() => null);
  await page.mouse.move(5, 895); await wait(400);
  if (targets.length) await shot(page, 'hover-0-before');
  let hi = 0;
  for (const t of targets.slice(0, 6)) {
    hi++;
    await page.mouse.move(5, 895); await wait(500);
    const before = await styleSnap(t.x, t.y);
    await page.mouse.move(t.x, t.y, { steps: 6 }); await wait(900);
    const after = await styleSnap(t.x, t.y);
    await shot(page, `hover-${hi}-${t.kind}-after`);
    await page.mouse.move(5, 895); await wait(300);
    R.hover.push({ ...t, before, after });
  }

  // 2. scroll story: 0.5 viewport per step (real wheel events), 700 ms wait, cap 24
  R.scroll = [];
  await page.mouse.move(720, 450);
  let lastY = -1, stuck = 0;
  for (let i = 1; i <= 24; i++) {
    await page.mouse.wheel({ deltaY: 450 }); await wait(700);
    const y = await page.evaluate(() => scrollY).catch(() => -1);
    await shot(page, `scroll-${String(i).padStart(2, '0')}`);
    R.scroll.push(y);
    if (y === lastY && y > 0) { stuck++; if (stuck >= 3) { R.notes.push(`scroll stopped at step ${i} (end of document)`); break; } } else stuck = 0;
    lastY = y;
    if (i === 6) R.measureMid = await page.evaluate(measurePage, 'scroll-6').catch((e) => ({ error: e.message }));
    if (i === 12) { R.palMid = await pixelPalette(browser, `${out}/scroll-12.jpg`).catch((e) => e.message); R.measure12 = await page.evaluate(measurePage, 'scroll-12').catch((e) => ({ error: e.message })); }
  }
  R.measureEnd = await page.evaluate(measurePage, 'scroll-end').catch((e) => ({ error: e.message }));
  R.palEnd = await pixelPalette(browser, `${out}/${R.shots.filter((s) => s.startsWith('scroll-')).pop()}`).catch((e) => e.message);
  R.net = net; R.jsMarkers = jsMarkers; R.consoleErr = consoleErr;
  await page.close();

  // font file metadata
  R.fontFiles = [];
  for (const { url: u, buf } of fontBufs.slice(0, 30)) {
    try { R.fontFiles.push({ url: u.slice(0, 200), bytes: buf.length, ...fontMeta(buf) }); } catch (e) { R.fontFiles.push({ url: u.slice(0, 200), bytes: buf.length, error: e.message }); }
  }

  // 4. phone 390x844
  const ph = await browser.newPage();
  await ph.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  await ph.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ph.evaluateOnNewDocument(hookCtx);
  await ph.goto(url, { waitUntil: 'load', timeout: 40000 }).catch((e) => R.notes.push('phone goto: ' + e.message.split('\n')[0]));
  await wait(6000);
  await declineCookies(ph);
  R.phoneGate = await passGate(ph); if (R.phoneGate) await wait(3500);
  await shot(ph, 'phone-0');
  R.measurePhone = await ph.evaluate(measurePage, 'phone-first').catch((e) => ({ error: e.message }));
  // menu button
  const menu = await ph.evaluate(() => {
    const c = [...document.querySelectorAll('button, [role="button"], a, [class*="burger" i], [class*="menu" i], [class*="hamburger" i], [aria-label*="menu" i]')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.width < 160 && r.top < 140 && r.top >= 0; })
      .find((e) => /menu|burger|hamburger|nav|toggle/i.test(`${e.className?.baseVal ?? e.className} ${e.getAttribute('aria-label') || ''} ${e.innerText || ''}`));
    if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: (c.innerText || c.getAttribute('aria-label') || String(c.className)).trim().slice(0, 40) };
  }).catch(() => null);
  for (let i = 1; i <= 3; i++) {
    await ph.evaluate(() => window.scrollBy(0, 0)).catch(() => {});
    await ph.mouse.move(195, 422); await ph.mouse.wheel({ deltaY: 422 }); await wait(900);
    await shot(ph, `phone-${i}`);
  }
  if (menu) {
    await ph.mouse.wheel({ deltaY: -3000 }); await wait(1200);
    await ph.mouse.click(menu.x, menu.y); await wait(250); await shot(ph, 'phone-menu-opening'); await wait(1200);
    await shot(ph, 'phone-menu-open'); R.phoneMenu = menu;
    R.measurePhoneMenu = await ph.evaluate(measurePage, 'phone-menu').catch((e) => ({ error: e.message }));
  }
  await ph.close();
}

try {
  await Promise.race([run(), wait(330000).then(() => { R.notes.push('hard cap 330 s reached'); })]);
} catch (e) { R.error = e.stack?.split('\n').slice(0, 3).join(' '); }
finally {
  await shut();
  R.ms = Date.now() - Date.parse(R.startedAt);
  writeFileSync(`${out}/measure.json`, JSON.stringify(R, null, 1));
  console.log(`${slug} done in ${R.ms}ms, ${R.shots.length} shots, error=${R.error ?? '-'}`);
  process.exit(0); // the hard-cap timer would otherwise keep node (and the lock) alive
}
