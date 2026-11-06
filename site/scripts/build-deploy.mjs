// Builds the production site into site/deploy/:
//   /            the homepage concept (Night Lab: concepts/night-lab/index.html, moved to the root)
//   /portal/     the delegate dashboard
//   /admin/      the secretariat dashboard
//   /chair/      the chair (dais) dashboard
// Uses Vite's `live` mode, so .env.live (public Supabase URL + publishable key) must exist.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(resolve(site, '.env.live'))) {
  console.error('Missing site/.env.live (copy the two lines from supabase/live.env).');
  process.exit(1);
}

execSync('npx vite build --config vite.deploy.config.ts --mode live', {
  cwd: site,
  stdio: 'inherit',
  env: { ...process.env, VITE_DEPLOY: '1' }, // links.ts: website served at / instead of /concepts/<home>/
});

const out = resolve(site, 'deploy');
const HOME = process.env.HOME_CONCEPT || 'night-lab';
const nested = resolve(out, 'concepts', HOME, 'index.html');
if (!existsSync(nested)) throw new Error(HOME + ' page missing from the build');
// The page moves two levels up, so its relative asset paths lose one "../../".
const html = readFileSync(nested, 'utf8').replaceAll('"../../', '"./').replaceAll("'../../", "'./");
writeFileSync(resolve(out, 'index.html'), html);
rmSync(resolve(out, 'concepts'), { recursive: true, force: true });

// Hosts: no SPA rewrites needed (dashboards use hash routes). Keep Jekyll off on GitHub Pages.
writeFileSync(resolve(out, '.nojekyll'), '');

const pages = ['index.html', 'portal/index.html', 'admin/index.html', 'chair/index.html'].filter((p) => existsSync(resolve(out, p)));
const env = readFileSync(resolve(site, '.env.live'), 'utf8');
const url = /VITE_SUPABASE_URL=(\S+)/.exec(env)?.[1] ?? '';
const js = readdirSync(resolve(out, 'assets')).filter((f) => f.endsWith('.js'));
const liveBaked = js.some((f) => readFileSync(resolve(out, 'assets', f), 'utf8').includes(url));
console.log(`\nDeploy build ready in site/deploy/: ${pages.join(', ')}`);
console.log(`Supabase URL baked into the bundle: ${liveBaked ? 'yes' : 'NO'}`);
