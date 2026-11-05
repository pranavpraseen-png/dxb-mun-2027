import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Production site: the Merged website (moved to / by scripts/build-deploy.mjs),
// the delegate dashboard at /portal/ and the secretariat dashboard at /admin/ and the chair (dais) dashboard at /chair/.
// Run through `node scripts/build-deploy.mjs`, which builds in `live` mode (.env.live).
const root = __dirname;
const pages: [string, string][] = [
  ['home', resolve(root, 'concepts', 'merged', 'index.html')],
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
