// One-step production deploy: build (scripts/build-deploy.mjs), check the three pages exist,
// then push site/deploy/ to the Vercel project dxbmun-2027. Stops before uploading if anything fails,
// so a broken or empty build can never replace the live site.
import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(site, 'deploy');
const run = (cmd, cwd = site) => execSync(cmd, { cwd, stdio: 'inherit', env: process.env });

const vercel = process.platform === 'win32' ? 'npx.cmd -y vercel@latest' : 'npx -y vercel@latest';
// VERCEL_PROJECT picks another project for a design preview app (e.g. dxbmun-2027-alt1, with HOME_CONCEPT=combo-1).
// The live site dxbmun-2027 serves only the owner's explicit pick. 2026-11-06: "put alt2 as normal original
// dxbmun-2027.vercel.app n for the intro like first loading page put that part only as same as alt 1"
// = Combo 2 with Combo 1's ORDER, ORDER loader (VITE_LOADER=order). Change LIVE only on a new explicit pick.
const LIVE = { home: 'combo-2', loader: 'order' };
const project = process.env.VERCEL_PROJECT || 'dxbmun-2027';
if (project === 'dxbmun-2027') {
  if ((process.env.HOME_CONCEPT || LIVE.home) !== LIVE.home) {
    console.error(`Not deploying: the live project dxbmun-2027 serves ${LIVE.home} only.`);
    process.exit(1);
  }
  process.env.HOME_CONCEPT = LIVE.home;
  process.env.VITE_LOADER = LIVE.loader;
}
// Sign-in and live data are on by default (owner, 2026-11-07: "now add back the login").
// NO_LOGIN=1 opens the dashboards without sign-in, on sample data (src/platform/v2/index.ts); only on the owner's word.
process.env.VITE_NO_LOGIN = process.env.NO_LOGIN === '1' ? '1' : '0';
run('node scripts/build-deploy.mjs'); // throws on failure
const missing = ['index.html', 'portal/index.html', 'admin/index.html', 'chair/index.html'].filter((p) => !existsSync(resolve(out, p)));
if (missing.length) { console.error(`Not deploying: missing ${missing.join(', ')}`); process.exit(1); }
run(`${vercel} link --yes --project ${project}`, out);
// `vercel link` writes an OIDC token to .env.local and a .gitignore; neither may be uploaded.
for (const f of ['.env.local', '.gitignore']) rmSync(resolve(out, f), { force: true });
writeFileSync(resolve(out, '.vercelignore'), '.env*\n.gitignore\n');
run(`${vercel} deploy --prod --yes`, out);
