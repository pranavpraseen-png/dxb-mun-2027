import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';

// Multi-page build: the showcase (index.html) plus every concept in concepts/<id>/index.html.
// Set CONCEPT=<id> to build only one concept (used by each designer to check their own work).
const root = __dirname;
const only = process.env.CONCEPT;
// Set CONCEPTS=<id>,<id> to build the showcase and dashboards with only those concepts (the shareable preview).
const pick = process.env.CONCEPTS?.split(',').map((s) => s.trim()).filter(Boolean);
const concepts = readdirSync(resolve(root, 'concepts'))
  .filter((d) => existsSync(resolve(root, 'concepts', d, 'index.html')))
  .filter((d) => !pick || pick.includes(d));
const input: Record<string, string> = only
  ? { [only]: resolve(root, 'concepts', only, 'index.html') }
  : Object.fromEntries([
      ['showcase', resolve(root, 'index.html')],
      ...(existsSync(resolve(root, 'portal', 'index.html')) ? [['portal', resolve(root, 'portal', 'index.html')]] : []),
      ...(existsSync(resolve(root, 'admin', 'index.html')) ? [['admin', resolve(root, 'admin', 'index.html')]] : []),
      ...(existsSync(resolve(root, 'chair', 'index.html')) ? [['chair', resolve(root, 'chair', 'index.html')]] : []),
      ...concepts.map((c) => [c, resolve(root, 'concepts', c, 'index.html')]),
    ]);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(root, 'src') } },
  base: './',
  build: {
    outDir: only ? resolve(root, '.check', only) : resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input },
  },
  // The repo root holds the shared images/ folder (hero photo), one level above site/.
  server: { host: '127.0.0.1', fs: { allow: [resolve(root, '..')] } },
});
