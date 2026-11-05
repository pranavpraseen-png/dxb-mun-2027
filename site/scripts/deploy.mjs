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
run(`${vercel} link --yes --project dxbmun-2027`, out);
// `vercel link` writes an OIDC token to .env.local and a .gitignore; neither may be uploaded.
for (const f of ['.env.local', '.gitignore']) rmSync(resolve(out, f), { force: true });
writeFileSync(resolve(out, '.vercelignore'), '.env*\n.gitignore\n');
run(`${vercel} deploy --prod --yes`, out);
