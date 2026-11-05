// Dissects ONE reference site per run (one browser launch, closed at the end). Brief: concepts/refs/DISSECT.md.
// Run from site/ ONLY through the lock:
//   node scripts/heavy.mjs "node concepts/refs/dissect/scripts/batch-a.mjs <slug>"
// Slugs: getty-tracing-art, anime-js, dropbox-brand, terminal-industries
// Writes concepts/refs/dissect/shots/<slug>/*.jpg and data.json. Never signs in, submits or accepts cookies.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';

const SITES = {
  'getty-tracing-art': 'https://www.getty.edu/tracingart/',
  'anime-js': 'https://animejs.com/',
  'dropbox-brand': 'https://brand.dropbox.com/',
  'terminal-industries': 'https://terminal-industries.com/',
};
const AWW = {
  'getty-tracing-art': 'https://www.awwwards.com/sites/tracing-art',
  'anime-js': 'https://www.awwwards.com/sites/anime-js',
  'dropbox-brand': 'https://www.awwwards.com/sites/dropbox-brand',
  'terminal-industries': 'https://www.awwwards.com/sites/terminal-industries',
};
const slug = process.argv[2];
// Mode "awwwards": reads each Awwwards page's "Font & Color" (#typography), tags and credits. One browser per page.
if (slug === 'awwwards') {
  const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
  const res = {};
  for (const [s, u] of Object.entries(AWW)) {
    const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--disable-dev-shm-usage', '--no-first-run'] });
    try {
      const p = await b.newPage();
      await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
      await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 40000 });
      await new Promise((r) => setTimeout(r, 4000));
      await p.evaluate(() => document.querySelector('#typography')?.scrollIntoView());
      await new Promise((r) => setTimeout(r, 2500));
      res[s] = await p.evaluate(() => {
        const t = document.querySelector('#typography');
        const txt = (e) => (e?.innerText || '').replace(/\n{2,}/g, '\n').trim();
        return {
          title: document.title,
          typography: t ? txt(t.closest('section') || t.parentElement || t).slice(0, 1500) : null,
          fontLinks: [...document.querySelectorAll('a[href*="/fonts/"], a[href*="font"]')].map((a) => (a.innerText || '').trim() + ' -> ' + a.getAttribute('href')).filter((x) => !/free fonts|best fonts/i.test(x)).slice(0, 15),
          colorEls: [...document.querySelectorAll('[style*="background"]')].map((e) => e.getAttribute('style')).filter((x) => /#|rgb/.test(x)).slice(0, 12),
          awards: [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /Site of the (Day|Month|Year)|Honorable|Developer|Dev Award/i.test(e.textContent || '')).map((e) => e.textContent.trim().slice(0, 80)).slice(0, 12),
          tags: [...document.querySelectorAll('a[href*="/websites/"], a[href*="tag"]')].map((a) => (a.innerText || '').trim()).filter(Boolean).slice(0, 40),
          credits: txt([...document.querySelectorAll('section, div')].find((e) => /\bby\b/i.test(e.querySelector('h2,h3,strong')?.innerText || '') && (e.innerText || '').length < 1500)).slice(0, 800),
        };
      });
    } catch (e) { res[s] = { error: e.message.split('\n')[0] }; }
    finally { await b.close().catch(() => {}); }
    console.log(s, res[s].error ? 'FAIL ' + res[s].error : 'ok');
  }
  mkdirSync('concepts/refs/dissect/shots', { recursive: true });
  writeFileSync('concepts/refs/dissect/shots/awwwards-batch-a.json', JSON.stringify(res, null, 1));
  process.exit(0);
}
const url = SITES[slug];
if (!url) { console.error('unknown slug; one of: ' + Object.keys(SITES).join(', ')); process.exit(2); }

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = `concepts/refs/dissect/shots/${slug}`;
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const NAV_TIMEOUT = 40000;
const data = { slug, url, startedAt: new Date().toISOString(), errors: [] };
const shot = async (page, name, opts = {}) => {
  try { await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 75, ...opts }); return `${name}.jpg`; }
  catch (e) { data.errors.push(`shot ${name}: ${e.message.split('\n')[0]}`); return null; }
};
const save = () => writeFileSync(`${out}/data.json`, JSON.stringify(data, null, 1));

// Injected before any page script: records canvas context types and font/stylesheet usage.
const PRELUDE = () => {
  window.__ctx = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const c = orig.call(this, type, ...rest);
    if (c) window.__ctx.push({ type, w: this.width, h: this.height });
    return c;
  };
};

// Declines non-essential cookies only (never accepts).
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

// ---------- in-page measurement (runs via page.evaluate) ----------
const MEASURE = () => {
  const hex = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return c;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    if (a === 0) return 'transparent';
    const h = '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    return a < 1 ? `${h}@${+a.toFixed(2)}` : h;
  };
  const vw = innerWidth, vh = innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
  const typeOf = (el) => { const s = getComputedStyle(el); return { family: s.fontFamily, size: s.fontSize, weight: s.fontWeight, style: s.fontStyle, tracking: s.letterSpacing, leading: s.lineHeight, transform: s.textTransform, color: hex(s.color), stretch: s.fontStretch, features: s.fontFeatureSettings, variation: s.fontVariationSettings }; };
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
  const all = [...document.querySelectorAll('body *')].filter((e) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'TEMPLATE'].includes(e.tagName.toUpperCase()));

  // Type census: every element with its own text, grouped by its type style, weighted by characters.
  const census = new Map();
  for (const el of all) {
    const t = ownText(el); if (!t) continue;
    const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') continue;
    const k = [s.fontFamily, s.fontSize, s.fontWeight, s.fontStyle, s.letterSpacing, s.lineHeight, s.textTransform].join(' | ');
    const g = census.get(k) || { key: k, chars: 0, n: 0, tags: new Set(), sample: [] , colors: new Set() };
    g.chars += t.length; g.n++; g.tags.add(el.tagName.toLowerCase()); g.colors.add(hex(s.color));
    if (g.sample.length < 3) g.sample.push(t.slice(0, 60));
    census.set(k, g);
  }
  const typeCensus = [...census.values()].sort((a, b) => b.chars - a.chars).slice(0, 30).map((g) => ({ ...g, tags: [...g.tags].join(','), colors: [...g.colors].join(' ') }));
  const bySize = [...census.values()].map((g) => ({ ...g, px: parseFloat(g.key.split(' | ')[1]) })).sort((a, b) => b.px - a.px).slice(0, 8).map((g) => ({ key: g.key, sample: g.sample, tags: [...g.tags].join(',') }));

  // Specific roles.
  const textEls = all.filter((e) => ownText(e) || (e.innerText || '').trim());
  const largest = [...all].filter((e) => ownText(e).length > 1 && visible(e)).sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0];
  const h1 = document.querySelector('h1');
  const para = [...document.querySelectorAll('p')].find((p) => (p.innerText || '').trim().length > 60 && visible(p)) || [...document.querySelectorAll('p')].find((p) => (p.innerText || '').trim().length > 30);
  const navRoot = document.querySelector('header nav, nav, header, [class*="nav" i], [class*="header" i]');
  const navLinks = navRoot ? [...navRoot.querySelectorAll('a, button')].filter(visible) : [];
  const buttons = [...document.querySelectorAll('button, a[class*="btn" i], a[class*="button" i], [role="button"]')].filter((e) => visible(e) && (e.innerText || '').trim());
  const labels = all.filter((e) => { const t = ownText(e); if (!t || t.length > 40) return false; const s = getComputedStyle(e); return parseFloat(s.fontSize) <= 14 && visible(e); }).slice(0, 8);
  const mono = all.filter((e) => ownText(e) && /mono|code|courier|consol/i.test(getComputedStyle(e).fontFamily)).slice(0, 4);
  const desc = (el) => el && { tag: el.tagName.toLowerCase(), cls: (el.className && el.className.baseVal === undefined ? el.className : '').toString().slice(0, 80), text: (ownText(el) || el.innerText || '').trim().slice(0, 70), ...typeOf(el), rect: (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(el.getBoundingClientRect()) };
  const roles = { largest: desc(largest), h1: desc(h1), h2: [...document.querySelectorAll('h2')].slice(0, 3).map(desc), body: desc(para), nav: navLinks.slice(0, 10).map(desc), buttons: buttons.slice(0, 6).map(desc), labels: labels.map(desc), mono: mono.map(desc) };

  // Colours: backgrounds weighted by visible area (viewport-clipped), text by characters.
  const bg = new Map(), fg = new Map(), border = new Map();
  for (const el of [document.documentElement, document.body, ...all]) {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    const area = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    const b = hex(s.backgroundColor); if (b !== 'transparent' && area > 0) bg.set(b, (bg.get(b) || 0) + area);
    const t = ownText(el); if (t) { const c = hex(s.color); fg.set(c, (fg.get(c) || 0) + t.length); }
    if (parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0 || parseFloat(s.borderLeftWidth) > 0) { const c = hex(s.borderTopColor || s.borderLeftColor); border.set(`${c} ${s.borderTopWidth}/${s.borderLeftWidth}`, (border.get(`${c} ${s.borderTopWidth}/${s.borderLeftWidth}`) || 0) + 1); }
  }
  const top = (m, n = 15) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v)]);
  const svgFill = new Map();
  for (const e of document.querySelectorAll('svg *')) { const s = getComputedStyle(e); for (const p of ['fill', 'stroke']) { const v = s[p]; if (v && v !== 'none' && !/url/.test(v)) svgFill.set(`${p}:${hex(v)}`, (svgFill.get(`${p}:${hex(v)}`) || 0) + 1); } }
  const htmlBg = hex(getComputedStyle(document.documentElement).backgroundColor), bodyBg = hex(getComputedStyle(document.body).backgroundColor);
  const sections = [...document.querySelectorAll('main > *, body > section, main section, [class*="section" i], footer')].slice(0, 30).map((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 60), bg: hex(s.backgroundColor), color: hex(s.color), top: Math.round(r.top + scrollY), h: Math.round(r.height), pt: s.paddingTop, pb: s.paddingBottom, mt: s.marginTop }; });

  // Root custom properties holding colours.
  const vars = {};
  const rootStyle = getComputedStyle(document.documentElement);
  for (let i = 0; i < rootStyle.length; i++) { const p = rootStyle[i]; if (p.startsWith('--')) { const v = rootStyle.getPropertyValue(p).trim(); if (/#[0-9a-f]{3,8}\b|rgb|hsl|oklch|lab\(|color\(/i.test(v)) vars[p] = v; } }
  const ruleVars = {}; const fontFaces = []; const blocked = [];
  const walkRules = (rules, href) => { for (const r of rules) {
    if (r.cssRules && !(r instanceof CSSStyleRule)) { try { walkRules(r.cssRules, href); } catch {} }
    if (r instanceof CSSFontFaceRule) fontFaces.push({ family: r.style.getPropertyValue('font-family'), weight: r.style.getPropertyValue('font-weight'), style: r.style.getPropertyValue('font-style'), src: r.style.getPropertyValue('src').slice(0, 400), display: r.style.getPropertyValue('font-display'), sheet: href });
    if (r instanceof CSSStyleRule && /(^|,)\s*(:root|html|body|\[data-theme[^\]]*\]|\.dark|\.light)\b/.test(r.selectorText)) { for (let i = 0; i < r.style.length; i++) { const p = r.style[i]; if (p.startsWith('--')) { const v = r.style.getPropertyValue(p).trim(); if (/#[0-9a-f]{3,8}\b|rgb|hsl|oklch|color\(/i.test(v)) ruleVars[`${r.selectorText.slice(0, 40)} ${p}`] = v; } } }
  } };
  for (const sh of document.styleSheets) { try { walkRules(sh.cssRules, sh.href || 'inline'); } catch { blocked.push(sh.href); } }
  const loadedFonts = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style} ${f.status}${f.stretch !== 'normal' ? ' ' + f.stretch : ''}`);

  // Tech.
  const scripts = [...document.scripts].map((s) => s.src).filter(Boolean).map((s) => { try { const u = new URL(s); return u.hostname + u.pathname.slice(0, 90); } catch { return s; } });
  const G = ['gsap', 'ScrollTrigger', 'SplitText', 'Flip', 'Lenis', 'lenis', 'LocomotiveScroll', 'THREE', 'PIXI', 'barba', 'Swup', 'Webflow', '__NEXT_DATA__', '__NUXT__', '__nuxt', '$nuxt', 'Framer', '__framer_importFromPackage', 'Spline', 'anime', 'Vue', '__VUE__', 'React', '__REACT_DEVTOOLS_GLOBAL_HOOK__', 'jQuery', 'Swiper', 'Splide', 'Rive', 'lottie', 'bodymovin', 'Howler', 'Matter', 'p5', 'Alpine', 'Shopify', 'Sanity', 'Theatre', '__sveltekit', 'Astro', 'gtag', 'dataLayer', 'Rellax', 'Barba', 'Taxi', 'Highway'];
  const globals = G.filter((g) => { try { return window[g] !== undefined; } catch { return false; } });
  const versions = {}; try { if (window.gsap) versions.gsap = gsap.version; } catch {} try { if (window.THREE) versions.three = THREE.REVISION; } catch {}
  const dom = {
    htmlClass: document.documentElement.className.toString().slice(0, 200), bodyClass: document.body.className.toString().slice(0, 200),
    vueAttr: !!document.querySelector('[data-v-app], [data-server-rendered]') || [...document.querySelectorAll('*')].slice(0, 400).some((e) => [...e.attributes].some((a) => a.name.startsWith('data-v-'))),
    nuxt: !!document.querySelector('#__nuxt, #__layout'), next: !!document.querySelector('#__next, script#__NEXT_DATA__'), webflow: !!document.querySelector('[data-wf-page], [data-wf-site]'),
    reactRoot: !!document.querySelector('#root, [data-reactroot]') , astro: !!document.querySelector('astro-island'), framer: !!document.querySelector('[data-framer-name]'),
    generator: document.querySelector('meta[name="generator"]')?.content || null,
    lenisClass: /lenis/.test(document.documentElement.className), locomotive: !!document.querySelector('[data-scroll-container]'),
  };
  const canvases = [...document.querySelectorAll('canvas')].map((c) => { const r = c.getBoundingClientRect(); return { w: c.width, h: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height), pos: getComputedStyle(c).position, z: getComputedStyle(c).zIndex }; });
  const videos = [...document.querySelectorAll('video')].map((v) => ({ src: (v.currentSrc || v.src || v.querySelector('source')?.src || '').slice(0, 120), autoplay: v.autoplay, loop: v.loop, muted: v.muted, w: Math.round(v.getBoundingClientRect().width), h: Math.round(v.getBoundingClientRect().height), paused: v.paused }));
  const iframes = [...document.querySelectorAll('iframe')].map((f) => (f.src || '').slice(0, 100));
  const lotties = document.querySelectorAll('lottie-player, dotlottie-player, [data-animation-path], rive-canvas').length;
  const svgs = document.querySelectorAll('svg').length;
  const imgs = document.querySelectorAll('img').length;

  // Layout.
  const blocks = all.filter((e) => { if (!visible(e)) return false; const t = ownText(e); const tag = e.tagName; return (t.length > 2 || ['IMG', 'VIDEO', 'CANVAS', 'PICTURE'].includes(tag)); });
  const lefts = new Map(); let minL = 1e9, maxR = 0;
  for (const e of blocks) { const r = e.getBoundingClientRect(); if (r.width >= vw - 2) continue; const L = Math.round(r.left / 4) * 4; lefts.set(L, (lefts.get(L) || 0) + 1); if (r.left >= 0 && r.left < minL) minL = r.left; if (r.right <= vw && r.right > maxR) maxR = r.right; }
  const maxWidths = new Map();
  for (const e of all) { const s = getComputedStyle(e); if (s.maxWidth !== 'none' && /px|rem|em/.test(s.maxWidth)) maxWidths.set(s.maxWidth, (maxWidths.get(s.maxWidth) || 0) + 1); }
  const grids = all.filter((e) => getComputedStyle(e).display.includes('grid')).slice(0, 8).map((e) => { const s = getComputedStyle(e); return { cls: String(e.className).slice(0, 50), cols: s.gridTemplateColumns.slice(0, 160), gap: s.columnGap + '/' + s.rowGap, w: Math.round(e.getBoundingClientRect().width), pad: s.paddingLeft + '/' + s.paddingRight }; });
  const header = document.querySelector('header') || navRoot;
  const navInfo = header && (() => { const s = getComputedStyle(header); const r = header.getBoundingClientRect(); let pos = s.position; let p = header.parentElement; while (pos === 'static' && p && p !== document.body) { const ps = getComputedStyle(p).position; if (ps === 'fixed' || ps === 'sticky') pos = ps + '(parent)'; p = p.parentElement; } return { tag: header.tagName.toLowerCase(), cls: String(header.className).slice(0, 60), position: pos, top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), bg: hex(s.backgroundColor), backdrop: s.backdropFilter, z: s.zIndex, items: [...header.querySelectorAll('a, button')].filter(visible).map((a) => (a.innerText || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)) }; })();
  const fixed = all.filter((e) => { const p = getComputedStyle(e).position; return (p === 'fixed' || p === 'sticky') && visible(e); }).slice(0, 15).map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 60), pos: getComputedStyle(e).position, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), text: (e.innerText || '').trim().slice(0, 50) }; });

  // Cursor.
  const cursor = { body: getComputedStyle(document.body).cursor, html: getComputedStyle(document.documentElement).cursor, els: [...document.querySelectorAll('[class*="cursor" i], [id*="cursor" i]')].slice(0, 5).map((e) => ({ tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 60), pos: getComputedStyle(e).position, w: Math.round(e.getBoundingClientRect().width) })) };

  // Running animations (CSS / WAAPI).
  const anims = document.getAnimations().slice(0, 40).map((a) => { const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {}; return { name: a.animationName || a.transitionProperty || a.constructor.name, dur: t.duration, ease: t.easing, iter: t.iterations, target: a.effect?.target ? (a.effect.target.tagName + '.' + String(a.effect.target.className).slice(0, 30)) : '' }; });
  const transitions = new Map();
  for (const e of all.slice(0, 3000)) { const s = getComputedStyle(e); if (s.transitionDuration && s.transitionDuration !== '0s') { const k = `${s.transitionProperty.slice(0, 40)} ${s.transitionDuration} ${s.transitionTimingFunction}`; transitions.set(k, (transitions.get(k) || 0) + 1); } }
  let gsapTweens = null;
  try { if (window.gsap) gsapTweens = gsap.globalTimeline.getChildren(true, true, false).slice(0, 40).map((t) => ({ dur: t.duration(), ease: t.vars.ease ? String(t.vars.ease) : '', props: Object.keys(t.vars).filter((k) => !['ease', 'duration', 'delay', 'onComplete', 'onUpdate', 'scrollTrigger', 'overwrite', 'stagger'].includes(k)).slice(0, 6).join(','), stagger: t.vars.stagger ? JSON.stringify(t.vars.stagger).slice(0, 40) : '', st: !!t.vars.scrollTrigger })); } catch {}
  let scrollTriggers = null; try { if (window.ScrollTrigger) scrollTriggers = ScrollTrigger.getAll().slice(0, 30).map((s) => ({ pin: !!s.pin, scrub: s.vars.scrub, start: String(s.vars.start || ''), end: String(s.vars.end || ''), trigger: s.trigger ? s.trigger.tagName + '.' + String(s.trigger.className).slice(0, 30) : '' })); } catch {}

  return {
    viewport: [vw, vh], scrollHeight: document.documentElement.scrollHeight, bodyHeight: document.body.scrollHeight, screens: +(document.documentElement.scrollHeight / vh).toFixed(2), title: document.title,
    overflowX: document.documentElement.scrollWidth > vw,
    fonts: { loaded: loadedFonts, faces: fontFaces.slice(0, 40), blockedSheets: blocked, typeCensus, bySize, roles },
    colours: { htmlBg, bodyBg, bg: top(bg), text: top(fg), borders: top(border, 10), svg: top(svgFill, 12), vars, ruleVars, sections },
    tech: { scripts, globals, versions, dom, ctx: window.__ctx || [], canvases, videos, iframes, lotties, svgs, imgs },
    layout: { leftEdges: top(lefts, 14), minLeft: Math.round(minL), maxRight: Math.round(maxR), contentWidth: Math.round(maxR - minL), maxWidths: top(maxWidths, 8), grids, nav: navInfo, fixed },
    cursor, anims, transitions: top(transitions, 15), gsapTweens, scrollTriggers,
  };
};

// Snapshot at a given scroll position: viewport colours and what sits at a few points.
const SAMPLE = () => {
  const hex = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return c; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); if (a === 0) return 'transparent'; const h = '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase(); return a < 1 ? `${h}@${+a.toFixed(2)}` : h; };
  const pts = [[720, 450], [200, 200], [1240, 700], [720, 120], [720, 800]].map(([x, y]) => [Math.round(x * innerWidth / 1440), Math.round(y * innerHeight / 900)]);
  const at = pts.map(([x, y]) => { const stack = document.elementsFromPoint(x, y); let bg = 'transparent'; for (const e of stack) { const b = hex(getComputedStyle(e).backgroundColor); if (b !== 'transparent') { bg = b; break; } } const top = stack[0]; return { x, y, top: top ? top.tagName.toLowerCase() + '.' + String(top.className).slice(0, 30) : '', bg }; });
  const headings = [...document.querySelectorAll('h1,h2,h3,[class*="title" i],[class*="heading" i]')].filter((e) => { const r = e.getBoundingClientRect(); return r.top >= -10 && r.bottom <= innerHeight + 10 && r.height > 0 && (e.innerText || '').trim(); }).slice(0, 4).map((e) => { const s = getComputedStyle(e); return { text: e.innerText.trim().replace(/\s+/g, ' ').slice(0, 80), size: s.fontSize, family: s.fontFamily.slice(0, 50), color: hex(s.color), transform: s.transform !== 'none' ? s.transform.slice(0, 50) : '', opacity: s.opacity, clip: s.clipPath !== 'none' ? s.clipPath.slice(0, 60) : '' }; });
  return { y: Math.round(scrollY), at, headings, htmlClass: document.documentElement.className.toString().slice(0, 120) };
};

let browser;
async function run() {
  browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--mute-audio', '--disable-dev-shm-usage', '--no-first-run', '--autoplay-policy=no-user-gesture-required'] });
  const kill = async () => { const p = browser.process(); await Promise.race([browser.close().catch(() => {}), wait(8000)]); try { if (p && p.exitCode === null) p.kill('SIGKILL'); } catch {} };
  try {
    // ---------------- Desktop 1440 ----------------
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(PRELUDE);
    const net = { fonts: [], css: [], scripts: [], media: [] };
    const cssTexts = [];
    page.on('response', async (r) => {
      const t = r.request().resourceType(); const u = r.url();
      if (t === 'font' || /\.(woff2?|ttf|otf)(\?|$)/i.test(u)) net.fonts.push(u.slice(0, 220));
      else if (t === 'stylesheet') { net.css.push(u.slice(0, 200)); try { const txt = await r.text(); cssTexts.push({ u, txt }); } catch {} }
      else if (t === 'script') net.scripts.push(u.slice(0, 200));
      else if (t === 'media') net.media.push(u.slice(0, 200));
    });
    page.on('console', (m) => { if (m.type() === 'error') data.errors.push('console: ' + m.text().slice(0, 160)); });
    const t0 = Date.now();
    const nav = page.goto(url, { waitUntil: 'load', timeout: NAV_TIMEOUT }).then((r) => { data.status = r && r.status(); data.loadMs = Date.now() - t0; }).catch((e) => { data.errors.push('goto: ' + e.message.split('\n')[0]); });
    data.loading = [];
    for (const s of [0.2, 0.6, 1.2, 2, 3.5, 6]) {
      const dt = s * 1000 - (Date.now() - t0); if (dt > 0) await wait(dt);
      const f = await shot(page, `load-${String(s).replace('.', '_')}s`);
      const info = await page.evaluate(() => ({ ready: document.readyState, y: scrollY, h: document.documentElement.scrollHeight, loaderish: [...document.querySelectorAll('[class*="load" i], [class*="preload" i], [class*="intro" i], [id*="load" i], [class*="splash" i]')].filter((e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 200 && r.height > 100 && st.display !== 'none' && st.visibility !== 'hidden' && +st.opacity > 0; }).slice(0, 4).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} op=${getComputedStyle(e).opacity}`) })).catch((e) => ({ err: e.message.slice(0, 60) }));
      data.loading.push({ s, at: Date.now() - t0, file: f, ...info });
    }
    await nav;
    await wait(1500);
    data.cookie = await declineCookies(page);
    if (data.cookie) await wait(800);
    await shot(page, 'first-screen');
    data.desktop = await page.evaluate(MEASURE).catch((e) => ({ err: e.message.slice(0, 200) }));
    data.net = net;
    // @font-face blocks from every stylesheet response (covers cross-origin sheets).
    data.cssFontFaces = [];
    for (const { u, txt } of cssTexts) for (const m of txt.matchAll(/@font-face\s*{[^}]*}/g)) data.cssFontFaces.push({ sheet: u.slice(0, 120), rule: m[0].replace(/\s+/g, ' ').slice(0, 420) });
    data.cssColourVars = [];
    for (const { u, txt } of cssTexts) for (const m of txt.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\))/g)) if (data.cssColourVars.length < 160) data.cssColourVars.push(`${m[1]}: ${m[2]}`);
    data.cssHexCounts = {};
    for (const { txt } of cssTexts) for (const m of txt.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) { const k = m[0].toUpperCase(); data.cssHexCounts[k] = (data.cssHexCounts[k] || 0) + 1; }
    data.cssHexCounts = Object.fromEntries(Object.entries(data.cssHexCounts).sort((a, b) => b[1] - a[1]).slice(0, 30));
    save();

    // Smooth-scroll probe: one wheel tick, then sample scrollY over time.
    await page.mouse.move(720, 450);
    const y0 = await page.evaluate(() => scrollY);
    await page.mouse.wheel({ deltaY: 300 });
    const probe = [];
    for (const ms of [0, 60, 150, 300, 600, 1000]) { await wait(ms - (probe.length ? [0, 60, 150, 300, 600, 1000][probe.length - 1] : 0)); probe.push([ms, await page.evaluate(() => Math.round(scrollY))]); }
    data.smoothProbe = { y0, after: probe };
    await page.evaluate(() => window.scrollTo(0, 0)); await page.mouse.wheel({ deltaY: -2000 }); await wait(1200);

    // Scroll story.
    data.scroll = [];
    let last = -1, still = 0;
    for (let i = 1; i <= 24; i++) {
      await page.mouse.wheel({ deltaY: 450 });
      await wait(700);
      const f = await shot(page, `scroll-${String(i).padStart(2, '0')}`);
      const s = await page.evaluate(SAMPLE).catch(() => ({}));
      data.scroll.push({ i, file: f, ...s });
      if (s.y === last) still++; else still = 0;
      last = s.y;
      const end = await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 4).catch(() => false);
      if ((end && i > 2) || still >= 3) break;
    }
    data.afterScroll = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, y: scrollY, canvases: document.querySelectorAll('canvas').length, videos: document.querySelectorAll('video').length, ctx: window.__ctx })).catch(() => null);
    // A full measure at the middle of the page too (lazy sections).
    save();

    // Hover.
    await page.evaluate(() => window.scrollTo(0, 0)); await page.mouse.wheel({ deltaY: -20000 }); await wait(1500);
    const targets = await page.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.top >= 0 && r.bottom <= innerHeight && getComputedStyle(e).visibility !== 'hidden'; };
      const box = (e, role) => { const r = e.getBoundingClientRect(); return { role, text: (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30), x: r.x + r.width / 2, y: r.y + r.height / 2, clip: { x: Math.max(0, r.x - 40), y: Math.max(0, r.y - 30), width: Math.min(innerWidth - Math.max(0, r.x - 40), r.width + 80), height: Math.min(innerHeight - Math.max(0, r.y - 30), r.height + 60) } }; };
      const nav = document.querySelector('header nav, nav, header');
      const links = nav ? [...nav.querySelectorAll('a, button')].filter(vis).slice(0, 4).map((e) => box(e, 'nav')) : [];
      const btn = [...document.querySelectorAll('main a, main button, a[class*="btn" i], a[class*="button" i], button')].filter((e) => vis(e) && (!nav || !nav.contains(e)) && (e.innerText || '').trim()).slice(0, 1).map((e) => box(e, 'button'));
      return [...links, ...btn];
    }).catch(() => []);
    data.hover = [];
    const STY = (x, y) => { const e = document.elementFromPoint(x, y); if (!e) return null; const s = getComputedStyle(e); const a = e.closest('a,button') || e; const sa = getComputedStyle(a); return { el: e.tagName.toLowerCase(), color: s.color, bg: sa.backgroundColor, border: sa.borderColor, underline: s.textDecorationLine, transform: sa.transform, opacity: sa.opacity, cursor: sa.cursor, transition: (sa.transition || '').slice(0, 120) }; };
    for (const [k, t] of targets.entries()) {
      await page.mouse.move(5, 895); await wait(400);
      const before = await page.evaluate(STY, t.x, t.y).catch(() => null);
      const fb = await shot(page, `hover-${k}-${t.role}-before`, { clip: t.clip });
      await page.mouse.move(t.x, t.y, { steps: 6 }); await wait(700);
      const after = await page.evaluate(STY, t.x, t.y).catch(() => null);
      const fa = await shot(page, `hover-${k}-${t.role}-after`, { clip: t.clip });
      data.hover.push({ ...t, before, after, files: [fb, fa] });
    }
    // Card hover further down (first link/card with an image at mid-page).
    await page.mouse.wheel({ deltaY: 1400 }); await wait(1200);
    const card = await page.evaluate(() => { const e = [...document.querySelectorAll('a, [class*="card" i]')].find((e) => { const r = e.getBoundingClientRect(); return r.width > 160 && r.height > 100 && r.top > 0 && r.bottom < innerHeight; }); if (!e) return null; const r = e.getBoundingClientRect(); return { text: (e.innerText || '').trim().slice(0, 40), x: r.x + r.width / 2, y: r.y + r.height / 2, clip: { x: Math.max(0, r.x - 20), y: Math.max(0, r.y - 20), width: Math.min(innerWidth - Math.max(0, r.x - 20), r.width + 40), height: Math.min(innerHeight - Math.max(0, r.y - 20), r.height + 40) } }; }).catch(() => null);
    if (card) {
      await page.mouse.move(5, 5); await wait(400);
      const before = await page.evaluate(STY, card.x, card.y).catch(() => null);
      const fb = await shot(page, 'hover-card-before', { clip: card.clip });
      await page.mouse.move(card.x, card.y, { steps: 6 }); await wait(800);
      const after = await page.evaluate(STY, card.x, card.y).catch(() => null);
      const fa = await shot(page, 'hover-card-after', { clip: card.clip });
      data.hover.push({ role: 'card', ...card, before, after, files: [fb, fa] });
    }
    // Cursor follower check: move the mouse and look for small fixed elements that moved with it.
    const pre = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); return (s.position === 'fixed' || s.position === 'absolute') && e.getBoundingClientRect().width < 120 && e.getBoundingClientRect().width > 2 && s.pointerEvents === 'none'; }).slice(0, 50).map((e) => [String(e.className).slice(0, 40), Math.round(e.getBoundingClientRect().x), Math.round(e.getBoundingClientRect().y)]));
    await page.mouse.move(300, 300, { steps: 5 }); await wait(500);
    const post = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); return (s.position === 'fixed' || s.position === 'absolute') && e.getBoundingClientRect().width < 120 && e.getBoundingClientRect().width > 2 && s.pointerEvents === 'none'; }).slice(0, 50).map((e) => [String(e.className).slice(0, 40), Math.round(e.getBoundingClientRect().x), Math.round(e.getBoundingClientRect().y)]));
    data.cursorFollow = post.filter((p, i) => pre[i] && (pre[i][1] !== p[1] || pre[i][2] !== p[2])).slice(0, 5);
    save();
    await page.close();

    // ---------------- Phone 390 ----------------
    const ph = await browser.newPage();
    await ph.setUserAgent(UA_PHONE);
    await ph.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await ph.evaluateOnNewDocument(PRELUDE);
    await ph.goto(url, { waitUntil: 'load', timeout: NAV_TIMEOUT }).catch((e) => data.errors.push('phone goto: ' + e.message.split('\n')[0]));
    await wait(4500);
    await declineCookies(ph);
    await shot(ph, 'phone-0');
    data.phone = await ph.evaluate(MEASURE).catch((e) => ({ err: e.message.slice(0, 200) }));
    data.phone.scroll = [];
    for (let i = 1; i <= 3; i++) {
      const before = await ph.evaluate(() => scrollY);
      await ph.mouse.wheel({ deltaY: 422 }); await wait(700);
      let y = await ph.evaluate(() => scrollY);
      if (y === before) { await ph.evaluate(() => window.scrollBy(0, 422)); await wait(700); y = await ph.evaluate(() => scrollY); }
      const f = await shot(ph, `phone-${i}`);
      data.phone.scroll.push({ i, y, file: f, sample: await ph.evaluate(SAMPLE).catch(() => null) });
    }
    await ph.evaluate(() => window.scrollTo(0, 0)); await ph.mouse.wheel({ deltaY: -10000 }); await wait(1000);
    const menu = await ph.evaluate(() => {
      const c = [...document.querySelectorAll('button, [role="button"], a, [class*="burger" i], [class*="menu" i], [class*="toggle" i]')].find((e) => { const r = e.getBoundingClientRect(); if (r.width < 10 || r.width > 200 || r.top > 140 || r.top < -2) return false; const t = ((e.innerText || '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + e.className).toLowerCase(); return /menu|burger|hamburger|nav-toggle|toggle|open/.test(t) && !e.closest('form'); });
      if (!c) return null; const r = c.getBoundingClientRect(); return { text: ((c.innerText || c.getAttribute('aria-label') || '') + '').trim().slice(0, 30), cls: String(c.className).slice(0, 60), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }).catch(() => null);
    data.phone.menu = menu;
    if (menu && !/^https?:/.test(menu.text)) {
      await ph.mouse.click(menu.x, menu.y);
      await wait(250); await shot(ph, 'phone-menu-0_25s');
      await wait(1150); await shot(ph, 'phone-menu-open');
      data.phone.menuOpen = await ph.evaluate(() => ({ url: location.href, items: [...document.querySelectorAll('nav a, [class*="menu" i] a')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.top < innerHeight; }).slice(0, 20).map((e) => { const s = getComputedStyle(e); return `${(e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30)} | ${s.fontFamily.slice(0, 40)} ${s.fontSize} ${s.fontWeight}`; }) })).catch(() => null);
    }
    save();
    await ph.close();
  } catch (e) {
    data.errors.push('fatal: ' + e.message.split('\n')[0]);
  } finally {
    data.finishedAt = new Date().toISOString();
    save();
    await kill();
  }
}

await Promise.race([run(), wait(170000).then(() => { data.errors.push('hard cap 170s'); save(); console.log('hard cap hit'); try { browser && browser.process() && browser.process().kill('SIGKILL'); } catch {} process.exit(1); })]);
console.log(`${slug}: done, ${data.errors.length} errors -> ${out}/data.json`);
process.exit(0);
