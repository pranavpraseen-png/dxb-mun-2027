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

run('node scripts/build-deploy.mjs'); // throws on failure
const missing = ['index.html', 'portal/index.html', 'admin/index.html', 'chair/index.html'].filter((p) => !existsSync(resolve(out, p)));
if (missing.length) { console.error(`Not deploying: missing ${missing.join(', ')}`); process.exit(1); }

const vercel = process.platform === 'win32' ? 'npx.cmd -y vercel@latest' : 'npx -y vercel@latest';
// VERCEL_PROJECT picks another project for a design preview app (e.g. dxbmun-2027-alt1, with HOME_CONCEPT=combo-1).
// The live site is dxbmun-2027 with Night Lab; never point HOME_CONCEPT at anything else for that project.
const project = process.env.VERCEL_PROJECT || 'dxbmun-2027';
if (project === 'dxbmun-2027' && (process.env.HOME_CONCEPT || 'night-lab') !== 'night-lab') {
  console.error('Not deploying: the live project dxbmun-2027 serves Night Lab only.');
  process.exit(1);
}
run(`${vercel} link --yes --project ${project}`, out);
// `vercel link` writes an OIDC token to .env.local and a .gitignore; neither may be uploaded.
for (const f of ['.env.local', '.gitignore']) rmSync(resolve(out, f), { force: true });
writeFileSync(resolve(out, '.vercelignore'), '.env*\n.gitignore\n');
run(`${vercel} deploy --prod --yes`, out);
