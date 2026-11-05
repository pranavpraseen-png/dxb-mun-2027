// Batch D image statistics: measures colour temperature, lightness, saturation and edge energy
// (a softness / density proxy) of the board captures for ALL 18 reference sites, so liked and
// not-liked sites are compared with the same numbers. Input: concepts/refs/shots/<slug>-{0,1,2}.jpg
// (capture.mjs, same settings for every site) plus batch-d captures where present.
// Run from site/ through the lock: node scripts/heavy.mjs "node concepts/refs/dissect/scripts/batch-d-stats.mjs"
import puppeteer from 'puppeteer-core';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';

const LIKED = ['getty-tracing-art', 'anime-js', 'dropbox-brand', 'terminal-industries', 'gq-ap-extraordinary-lab', 'era-residence', 'lando-norris', 'oryzo-ai', 'igloo-inc', 'siena-film', 'outfit-hellohello'];
const NOT = ['montfort', 'cartier-waw-2025', 'floema', 'auriga-space', 'david-whyte', 'immersive-garden', 'age-of-union'];
const files = [];
for (const s of [...LIKED, ...NOT]) for (const i of [0, 1, 2]) { const p = `concepts/refs/shots/${s}-${i}.jpg`; if (existsSync(p)) files.push({ slug: s, group: LIKED.includes(s) ? 'liked' : 'not', set: 'board', name: `${s}-${i}.jpg`, path: p }); }
for (const s of NOT) {
  const dir = `concepts/refs/dissect/shots/${s}`; if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((f) => /^(first-screen|scroll-\d\d)\.jpg$/.test(f))) files.push({ slug: s, group: 'not', set: 'batch-d', name: f, path: `${dir}/${f}` });
}
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run'] });
const page = await browser.newPage();
await page.setContent('<canvas id=c width=360 height=225></canvas>');
const out = [];
for (const f of files) {
  const data = 'data:image/jpeg;base64,' + readFileSync(f.path).toString('base64');
  const r = await page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.getElementById('c'); const W = 360, H = 225; const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, W, H); const d = x.getImageData(0, 0, W, H).data;
    let R = 0, G = 0, B = 0, S = 0, L = 0, n = W * H; const lum = new Float32Array(n); const hist = {};
    for (let i = 0; i < n; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; R += r; G += g; B += b;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b); S += mx === 0 ? 0 : (mx - mn) / mx;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b; lum[i] = l; L += l;
      const k = '#' + [r, g, b].map((v) => ((v >> 5) << 5 | 16).toString(16).padStart(2, '0')).join(''); hist[k] = (hist[k] || 0) + 1;
    }
    let E = 0, strong = 0; // mean gradient magnitude and share of pixels on a hard edge (> 40 levels)
    for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) { const i = y * W + xx; const g = Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + W] - lum[i - W]); E += g; if (g > 40) strong++; }
    const m = (W - 2) * (H - 2);
    const sorted = Array.from(lum).sort((a, b) => a - b); const p5 = sorted[Math.floor(n * 0.05)], p95 = sorted[Math.floor(n * 0.95)];
    const mu = L / n; let v = 0; for (let i = 0; i < n; i++) v += (lum[i] - mu) ** 2; const lumaStd = Math.sqrt(v / n);
    const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${Math.round((v / n) * 100)}%`);
    return { mean: '#' + [R, G, B].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join(''), warmth: +((R - B) / n).toFixed(1), light: +(L / n).toFixed(1), sat: +((S / n) * 100).toFixed(1), edge: +(E / m).toFixed(2), hardEdgePct: +((strong / m) * 100).toFixed(2), lumaStd: +lumaStd.toFixed(1), range5to95: Math.round(p95 - p5), top };
  }, data).catch((e) => ({ err: e.message.split('\n')[0] }));
  out.push({ ...f, ...r }); delete out[out.length - 1].path;
}
await browser.close();
// Per-site means over the board captures (same capture settings for all 18).
const sites = {};
const K = ['warmth', 'light', 'sat', 'edge', 'hardEdgePct', 'lumaStd', 'range5to95'];
for (const o of out.filter((o) => o.set === 'board' && !o.err)) { const s = (sites[o.slug] ||= { group: o.group, n: 0, ...Object.fromEntries(K.map((k) => [k, 0])) }); s.n++; for (const k of K) s[k] += o[k]; if (o.name.endsWith('-0.jpg')) s.firstScreen = { light: o.light, lumaStd: o.lumaStd, range5to95: o.range5to95, mean: o.mean }; }
for (const s of Object.values(sites)) for (const k of K) s[k] = +(s[k] / s.n).toFixed(2);
writeFileSync('concepts/refs/dissect/shots/batch-d-image-stats.json', JSON.stringify({ method: 'each JPEG drawn at 360x225; warmth = mean(R-B); light = mean Rec.709 luma 0-255; sat = mean HSV saturation %; edge = mean |dLx|+|dLy| per pixel; hardEdgePct = % pixels with gradient > 40', sites, images: out }, null, 1));
console.log(JSON.stringify(sites, null, 0));
