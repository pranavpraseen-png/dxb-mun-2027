// Records Alt 4 as a 1920×1080 60 fps MP4 with its own sound track.
// The page runs in virtual time (?capture): this script advances it exactly 1/60 s per frame and screenshots each frame,
// so the video is perfectly smooth however slow the machine is. The sound is rendered offline from the page's own
// event log (hold curve, gavel, taps) with the same synth voices, then muxed in.
// Run from site/: node scripts/heavy.mjs "node concepts/alt-4/video.mjs [query] [out.mp4]"
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, utimesSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { VIRTUAL } from './shots-virtual.mjs';

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const query = process.argv[2] || '';
const outFile = resolve(process.argv[3] || 'shots/r4/alt-4/video/alt-4-the-floor.mp4');
const W = 1920, H = 1080, FPS = 60, DT = 1000 / FPS;
mkdirSync(resolve(outFile, '..'), { recursive: true });
const silent = outFile.replace(/\.mp4$/, '.silent.mp4');
const wav = outFile.replace(/\.mp4$/, '.wav');

// Keep the shared heavy lock fresh (it is treated as stale after 12 minutes).
const lock = resolve('.heavy.lock');
const keep = setInterval(() => { try { if (existsSync(lock)) utimesSync(lock, new Date(), new Date()); } catch { /* fine */ } }, 30000);

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 300000,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${W},${H}`],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(VIRTUAL);
await page.goto(`http://127.0.0.1:5320/concepts/alt-4/?capture${query ? '&' + query : ''}`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
for (let i = 0; i < 400 && !(await page.evaluate(() => !!window.__floor)); i++) await page.evaluate(() => window.__advance(16.67));
for (let i = 0; i < 30; i++) await page.evaluate(() => window.__advance(16.67));
await page.evaluate(() => window.__floor.resetClock());

const ff = spawn(FFMPEG, ['-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'ignore', 'inherit'] });

let frame = 0;
const t0 = Date.now();
const snap = async () => {
  await page.evaluate((dt) => window.__advance(dt), DT);
  const buf = await page.screenshot({ type: 'jpeg', quality: 93, optimizeForSpeed: true });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  frame++;
  if (frame % 120 === 0) console.log(`frame ${frame} (${(frame / FPS).toFixed(1)} s) · ${((Date.now() - t0) / frame).toFixed(0)} ms/frame`);
};
const hold = async (s) => { for (let i = 0; i < Math.round(s * FPS); i++) await snap(); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let mx = W * 0.82, my = H * 0.86;
const move = async (x, y, s) => {
  const fx = mx, fy = my, n = Math.max(1, Math.round(s * FPS));
  for (let i = 1; i <= n; i++) { const k = ease(i / n); mx = fx + (x - fx) * k; my = fy + (y - fy) * k; await page.mouse.move(mx, my); await snap(); }
};
const scrollTo = async (y, s) => {
  const from = await page.evaluate(() => scrollY), n = Math.max(1, Math.round(s * FPS));
  for (let i = 1; i <= n; i++) { const k = ease(i / n); await page.evaluate((v) => { window.scrollTo(0, v); }, from + (y - from) * k); await snap(); }
};
const topOf = (sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? el.getBoundingClientRect().top + scrollY - 64 : null; }, sel);
const centre = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, sel);

// ---------------------------------------------------------------- the storyboard
await page.mouse.move(mx, my);
await hold(1.0);                                                     // the gate, breathing
const ring = await centre('.fl-hold');
await move(ring.x, ring.y, 1.1);                                     // the cursor finds the ring
await hold(0.25);
await page.mouse.down();
await hold(1.0);                                                     // holding: the room leans in
await page.mouse.up();                                               // let go too early: it drains (loss aversion)
await hold(0.55);
await page.mouse.down();                                             // grip again, all the way
for (let i = 0; i < 160 && (await page.evaluate(() => window.__floor.phase())) === 'gate'; i++) await snap();
await page.mouse.up();
await hold(3.2);                                                     // breath, gavel, shockwave, the floor rises
await move(W * 0.28, H * 0.42, 1.4);                                 // the floor follows the cursor
await move(W * 0.7, H * 0.38, 1.6);
await page.mouse.down(); await snap(); await page.mouse.up();        // a quick knock
await hold(0.9);
await move(W * 0.55, H * 0.6, 0.9);
await page.mouse.down(); await hold(1.1); await page.mouse.up();     // charge... release: your own shockwave
await hold(1.8);
const rect = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
const click = async (x, y, s = 0.5) => { await move(x, y, s); await page.mouse.down(); await snap(); await page.mouse.up(); };
const scrollToId = async (id, s = 1.3, extra = 0) => { const y = await topOf('#' + id); if (y != null) await scrollTo(y + extra, s); };

// Material: "19 committees" grows into the full list, then shrinks back into the button.
const cm = await centre('.fl-ctas .mph-trigger');
if (cm) { await click(cm.x, cm.y, 0.8); await hold(1.6); await page.keyboard.press('Escape'); await hold(0.8); }
// Doodle: the nav logo plays its little chamber scene on hover.
const logo = await centre('a.navb-home');
if (logo) { await move(logo.x, logo.y, 0.9); await hold(2.0); await move(W * 0.5, H * 0.5, 0.6); }
// Pixel-page reel: the floor turns while the line fills in, word by word.
const reel = await page.evaluate(() => { const el = document.querySelector('.fl-reel'); if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
if (reel) { await scrollTo(reel.top + reel.h - H, 6.5); await hold(0.8); }
await scrollToId('about'); await hold(1.3);
// Roll call: type a committee, call it.
await scrollToId('committees', 1.3, 120);
const input = await centre('#committees input');
if (input) {
  await click(input.x - 200, input.y, 0.6);
  for (const ch of 'UNSC') { await page.keyboard.type(ch); await hold(0.12); }
  await hold(0.5); await page.keyboard.press('Enter'); await hold(1.8);   // the committee grows into its panel
  await page.keyboard.press('ArrowRight'); await hold(1.0);              // step to the next one
  await page.keyboard.press('Escape'); await hold(0.9);                  // and it shrinks back into the list
  for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace');
  for (const ch of 'health') { await page.keyboard.type(ch); await hold(0.09); }
  await hold(0.3); await page.keyboard.press('Enter'); await hold(1.6);
  await page.keyboard.press('Escape'); await hold(0.7);
  await page.evaluate(() => document.activeElement?.blur());
}
// Departures board: flip to day 2.
await scrollToId('schedule', 1.3, 60);
await hold(0.6);
const d2 = await centre('#schedule [role="tab"]:nth-of-type(2)');
if (d2) { await click(d2.x, d2.y, 0.6); await hold(1.8); }
// Sign the charter: a real signature stroke, the seal stamps on.
await scrollToId('register', 1.3, 40);
await hold(0.5);
const pad = await rect('#register canvas');
if (pad) {
  const y0 = pad.y + pad.h * 0.6, x0 = pad.x + pad.w * 0.08;
  await move(x0, y0, 0.5);
  await page.mouse.down();
  const n = 70;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = x0 + k * pad.w * 0.55;
    const y = y0 - Math.sin(k * Math.PI * 3.2) * pad.h * 0.22 * (1 - k * 0.4) - Math.sin(k * 23) * pad.h * 0.04;
    mx = x; my = y; await page.mouse.move(x, y); await snap();
  }
  await page.mouse.up();
  await hold(1.6);
}
await scrollToId('wellness', 1.2); await hold(1.0);
await scrollToId('contact', 1.3); await hold(1.0);
await scrollTo(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), 1.2);
await hold(1.6);
await scrollTo(0, 1.6);                                               // back to the floor
await move(W * 0.5, H * 0.45, 0.8);
await hold(2.0);
// ----------------------------------------------------------------

const seconds = frame / FPS;
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
console.log(`video frames: ${frame} (${seconds.toFixed(2)} s) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const b64 = await page.evaluate((d) => window.__floor.audio(d), seconds + 0.5);
writeFileSync(wav, Buffer.from(b64, 'base64'));
await browser.close();
clearInterval(keep);
await new Promise((r, j) => {
  const p = spawn(FFMPEG, ['-y', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFile], { stdio: ['ignore', 'ignore', 'inherit'] });
  p.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg mux failed ' + c))));
});
rmSync(silent, { force: true });
console.log('wrote', outFile);
console.log('errors', JSON.stringify(errors));
