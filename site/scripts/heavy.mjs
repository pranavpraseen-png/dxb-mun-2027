// Runs one memory-heavy command at a time across every agent (this machine has very little free RAM).
// Usage (from site/): node scripts/heavy.mjs "npx tsc --noEmit --singleThreaded"
// Waits for the shared lock (site/.heavy.lock), runs the command, releases the lock. A lock older than
// 12 minutes is treated as stale. Exit code = the command's exit code.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lock = resolve(site, '.heavy.lock');
const cmd = process.argv.slice(2).join(' ');
if (!cmd) { console.error('usage: node scripts/heavy.mjs "<command>"'); process.exit(2); }

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const started = Date.now();
let announced = false;
for (;;) {
  try { mkdirSync(lock); break; } catch {
    try { if (Date.now() - statSync(lock).mtimeMs > 12 * 60_000) { rmSync(lock, { recursive: true, force: true }); continue; } } catch { continue; }
    if (!announced) { console.log('[heavy] waiting for another heavy command to finish…'); announced = true; }
    if (Date.now() - started > 20 * 60_000) { console.error('[heavy] gave up after 20 minutes waiting'); process.exit(3); }
    sleep(2000);
  }
}
writeFileSync(resolve(lock, 'cmd.txt'), `${process.pid} ${cmd}\n`);
let code = 0;
try { execSync(cmd, { cwd: process.cwd(), stdio: 'inherit', env: process.env }); }
catch (e) { code = typeof e.status === 'number' ? e.status : 1; }
finally { rmSync(lock, { recursive: true, force: true }); }
process.exit(code);
