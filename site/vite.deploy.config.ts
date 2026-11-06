import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Production site: the Night Lab website (moved to / by scripts/build-deploy.mjs),
// the delegate dashboard at /portal/ and the secretariat dashboard at /admin/ and the chair (dais) dashboard at /chair/.
// Run through `node scripts/build-deploy.mjs`, which builds in `live` mode (.env.live).
const root = __dirname;
// The homepage concept served at /. Night Lab since 2026-11-06 (owner: "after you're done, put it on Vercel").
const HOME = process.env.HOME_CONCEPT || 'night-lab';
const pages: [string, string][] = [
  ['home', resolve(root, 'concepts', HOME, 'index.html')],
  ['portal', resolve(root, 'portal', 'index.html')],
  ['admin', resolve(root, 'admin', 'index.html')],
  ['chair', resolve(root, 'chair', 'index.html')],
];
const input = Object.fromEntries(pages.filter(([, p]) => existsSync(p)));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(root, 'src') } },
  base: './',
  build: {
    outDir: resolve(root, 'deploy'),
    emptyOutDir: true,
    rollupOptions: { input },
  },
});
