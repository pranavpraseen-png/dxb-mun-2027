// Package dist/ into preview/ for publishing as a shareable claude.ai Artifact.
// The Artifact wraps the main page in its own <html><head><body> skeleton, so the showcase page
// (preview/index.html) becomes a fragment; every other page keeps its full document.
// Usage: npx vite build && node scripts/package-preview.mjs  → prints the file list for publishing.
import { cpSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

rmSync('preview', { recursive: true, force: true });
cpSync('dist', 'preview', { recursive: true });

// Showcase → fragment: keep title/meta/link/script tags from <head> and the body content.
const html = readFileSync('preview/index.html', 'utf8');
const head = (html.match(/<head>([\s\S]*?)<\/head>/i) || [, ''])[1]
  .replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
const body = (html.match(/<body>([\s\S]*?)<\/body>/i) || [, ''])[1];
writeFileSync('preview/index.html', head.trim() + '\n' + body.trim() + '\n');

// Concept pages: keep out of search engines (they're previews, not the official site).
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk('preview').map((p) => relative('preview', p).split(sep).join('/'));
for (const f of files.filter((f) => f.endsWith('.html') && f !== 'index.html')) {
  const p = join('preview', f);
  writeFileSync(p, readFileSync(p, 'utf8').replace('<head>', '<head>\n<meta name="robots" content="noindex">'));
}
const supporting = files.filter((f) => f !== 'index.html');
writeFileSync('preview/files.json', JSON.stringify(supporting.map((path) => ({ path }))));
console.log(`${supporting.length} supporting files; total ${(walk('preview').reduce((a, p) => a + statSync(p).size, 0) / 1e6).toFixed(1)} MB`);
