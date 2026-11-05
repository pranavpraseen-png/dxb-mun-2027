// Captures each reference site: the 1440x900 first screen plus two scroll states (~40% and ~75% down).
// Run from site/ ONLY through the lock:  node scripts/heavy.mjs "node concepts/refs/capture.mjs"
// Optional: pass slugs to capture only those, e.g.  ... capture.mjs montfort anime-js
// Rules: never sign in or submit anything; only clicks a cookie "reject/decline" button if one is visible.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';

// [slug, url, options]. options.enter = click the page centre once after load (for "click anywhere to start" intros;
// these only start the experience and enable sound, which is muted here). options.settle = extra wait in ms.
const SITES = [
  ['cartier-waw-2025', 'https://cartier-waw-0225.dev.60fps.fr/', { settle: 9000, enter: true }],
  ['gq-ap-extraordinary-lab', 'https://www.gq.com/sponsored/story/the-extraordinary-lab', { enter: true, settle: 3000 }],
  ['tie-break', 'https://thetiebreak.merci-michel.com/', { settle: 3000 }],
  ['era-residence', 'https://www.era-residence.com/'],
  ['son-daven', 'https://sondaven.com/en'],
  ['floema', 'https://www.floema.com/en'],
  ['lando-norris', 'https://landonorris.com/'],
  ['auriga-space', 'https://www.aurigaspace.com/'],
  ['montfort', 'https://mont-fort.com/'],
  ['terminal-industries', 'https://terminal-industries.com/'],
  ['shopify-renaissance', 'https://www.shopify.com/editions/winter2026'],
  ['dropbox-brand', 'https://brand.dropbox.com/'],
  ['anime-js', 'https://animejs.com/'],
  ['oryzo-ai', 'https://oryzo.ai/'],
  ['kriss-ai', 'https://kriss.ai/'],
  ['siena-film', 'https://siena.film/', { settle: 8000, enter: [720, 828] }],
  ['getty-tracing-art', 'https://www.getty.edu/tracingart/'],
  ['max-mara-jacket-circle', 'https://thejacketcirclegame.maxmara.com/'],
  ['immersive-garden', 'https://immersive-g.com/', { settle: 12000, enter: true }],
  ['outfit-hellohello', 'https://outfit.hellohello.is/', { settle: 1500 }],
  ['the-line-studio', 'https://thelinestudio.com/'],
  ['age-of-union', 'https://ageofunion.com/'],
  ['why-zero', 'https://why.zero.university/'],
  ['david-whyte', 'https://davidwhyte.com/experience/', { settle: 4000 }],
  ['igloo-inc', 'https://www.igloo.inc/', { settle: 5000 }],
];

const only = process.argv.slice(2);
const list = only.length ? SITES.filter(([s]) => only.includes(s)) : SITES;
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const out = 'concepts/refs/shots';
mkdirSync(out, { recursive: true });
const logFile = `${out}/capture-log.json`;
const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf8')) : {};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BATCH = 3; // close the browser after every 3 sites (memory is tight)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

// Clicks the first visible button whose text is a refusal of non-essential cookies. Never accepts, never submits forms.
// Looks in every frame and open shadow root (consent tools often live there).
async function declineCookies(page) {
  for (const frame of page.frames()) {
    try {
      const hit = await frame.evaluate(() => {
        const rx = /^(reject( all)?|decline( all)?|refuse( all)?|deny|only (necessary|essential)|necessary only|use necessary cookies only|reject non-essential|continue without accepting)/i;
        const all = [];
        const walk = (root) => {
          for (const e of root.querySelectorAll('*')) {
            if (e.matches('button, [role="button"], a')) all.push(e);
            if (e.shadowRoot) walk(e.shadowRoot);
          }
        };
        walk(document);
        const el = all.find((e) => rx.test((e.textContent || '').trim()) && e.getBoundingClientRect().width > 0);
        if (el && !el.closest('form[action]')) { el.click(); return (el.textContent || '').trim().slice(0, 40); }
        return null;
      });
      if (hit) return hit;
    } catch { /* detached or cross-origin frame */ }
  }
  return null;
}

// Scrolls toward a fraction of the page with real wheel events (so scroll-driven motion fires).
// For virtual-scroll sites (page no taller than the window) it sends a fixed number of wheel ticks instead.
async function scrollTo(page, frac, ticksIfVirtual) {
  const { sh, ih } = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: innerHeight }));
  await page.mouse.move(720, 450);
  if (sh > ih * 1.4) {
    const target = Math.round((sh - ih) * frac);
    for (let i = 0; i < 40; i++) {
      const y = await page.evaluate(() => scrollY);
      if (Math.abs(target - y) < 200) break;
      await page.mouse.wheel({ deltaY: Math.sign(target - y) * Math.min(600, Math.abs(target - y)) });
      await wait(120);
    }
    // Fallback for sites that ignore wheel events.
    const y = await page.evaluate(() => scrollY);
    if (Math.abs(target - y) > 400) await page.evaluate((t) => window.scrollTo(0, t), target);
  } else {
    for (let i = 0; i < ticksIfVirtual; i++) { await page.mouse.wheel({ deltaY: 300 }); await wait(110); }
  }
  await wait(1800);
}

async function capture(browser, slug, url, opts = {}) {
  const page = await browser.newPage();
  const res = { url, ok: false };
  try {
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 }).catch(async (e) => {
      // networkidle never reached (video, analytics): accept the page if the DOM is there.
      if (/timeout/i.test(e.message) && (await page.evaluate(() => document.readyState).catch(() => '')) !== 'loading') return null;
      throw e;
    });
    res.status = resp ? resp.status() : 'no-idle';
    res.finalUrl = page.url();
    await wait(3500 + (opts.settle ?? 0)); // let preloaders and intro motion finish
    res.cookie = await declineCookies(page);
    if (!res.cookie) { await wait(1500); res.cookie = await declineCookies(page); }
    if (res.cookie) await wait(800);
    if (opts.enter) { const [x, y] = Array.isArray(opts.enter) ? opts.enter : [720, 450]; await page.mouse.click(x, y); await wait(3500); }
    await page.screenshot({ path: `${out}/${slug}-0.jpg`, type: 'jpeg', quality: 80 });
    await scrollTo(page, 0.4, 14);
    await declineCookies(page);
    await page.screenshot({ path: `${out}/${slug}-1.jpg`, type: 'jpeg', quality: 80 });
    await scrollTo(page, 0.75, 14);
    await page.screenshot({ path: `${out}/${slug}-2.jpg`, type: 'jpeg', quality: 80 });
    res.height = await page.evaluate(() => document.documentElement.scrollHeight);
    res.title = await page.title();
    res.ok = true;
  } catch (e) {
    res.error = e.message.split('\n')[0];
  } finally {
    await page.close().catch(() => {});
  }
  return res;
}

const launch = () => puppeteer.launch({
  executablePath, headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--mute-audio', '--disable-dev-shm-usage', '--no-first-run', '--autoplay-policy=user-gesture-required'],
});
// Close, and kill the process if close hangs (a wedged WebGL page can block close and hold ~1 GB of GPU memory).
const shut = async (browser) => {
  const p = browser.process();
  await Promise.race([browser.close().catch(() => {}), wait(8000)]);
  try { if (p && p.exitCode === null) p.kill('SIGKILL'); } catch { /* already gone */ }
};

for (let i = 0; i < list.length; i += BATCH) {
  let browser = await launch();
  for (const [slug, url, opts] of list.slice(i, i + BATCH)) {
    const t = Date.now();
    // Hard cap per site so one hung page cannot stall the batch; on a cap the browser is killed and relaunched.
    const r = await Promise.race([capture(browser, slug, url, opts), wait(75000).then(() => ({ url, ok: false, error: 'hard cap 75s' }))]);
    r.ms = Date.now() - t;
    log[slug] = r;
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${slug}  ${r.ms}ms  ${r.ok ? `status=${r.status} h=${r.height} cookie=${r.cookie ?? '-'}` : r.error}`);
    if (!r.ok) { await shut(browser); browser = await launch(); }
    writeFileSync(logFile, JSON.stringify(log, null, 2));
  }
  await shut(browser);
}
console.log('done');
