// One command to open every DXB MUN design, alternative and option on any computer.
//   npm start        (from this folder)
// Installs the site's packages the first time, then starts the local server and opens the design picker.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const site = join(root, 'site');
const win = process.platform === 'win32';
const npm = win ? 'npm.cmd' : 'npm';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 19)) {
  console.error(`\nNode.js ${process.versions.node} is too old. Install Node.js 22 LTS or newer from https://nodejs.org and run "npm start" again.\n`);
  process.exit(1);
}

if (!existsSync(join(site, 'node_modules', 'vite'))) {
  console.log('\nFirst run: installing the site packages (a few minutes, only once)...\n');
  const r = spawnSync(npm, ['ci', '--no-audit', '--no-fund'], { cwd: site, stdio: 'inherit', shell: win });
  if (r.status !== 0) {
    console.log('\n"npm ci" failed, trying "npm install"...\n');
    const r2 = spawnSync(npm, ['install', '--no-audit', '--no-fund'], { cwd: site, stdio: 'inherit', shell: win });
    if (r2.status !== 0) process.exit(r2.status ?? 1);
  }
}

console.log('\nStarting DXB MUN. The design picker opens in your browser.');
console.log('Every design, alternative, board and dashboard is in the list on its left.');
console.log('Press Ctrl+C here to stop.\n');
const vite = spawn(npm, ['exec', '--', 'vite', '--port', '5320', '--open', '/picker/'], { cwd: site, stdio: 'inherit', shell: win });
vite.on('exit', (code) => process.exit(code ?? 0));
