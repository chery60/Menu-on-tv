/*
 * Builds the standalone TV player (ADR-005) into public/player: player.js and player.css.
 * The same React components the owner app previews (LivePlayer, ScreenStage) are compiled with Preact
 * standing in for React, so a TV downloads a few KB instead of the Next.js runtime.
 * Runs before `next dev` and `next build` (package.json); fails if the script is over the budget.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const BUDGET_BYTES = 100 * 1024;
const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = `${root}public/player`;

await build({
  configFile: false,
  root,
  logLevel: 'warn',
  // The fonts are served from public/fonts; knowing that, Vite leaves their URLs as they are.
  publicDir: `${root}public`,
  resolve: {
    alias: [
      { find: /^react-dom\/client$/, replacement: 'preact/compat/client' },
      { find: /^react-dom$/, replacement: 'preact/compat' },
      { find: /^react\/jsx-runtime$/, replacement: 'preact/jsx-runtime' },
      { find: /^react$/, replacement: 'preact/compat' },
      { find: /^@\//, replacement: `${root}src/` },
    ],
  },
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir,
    emptyOutDir: true,
    copyPublicDir: false,
    // TV browsers lag phones by years; keep the syntax old enough for them.
    target: 'es2019',
    sourcemap: false,
    lib: { entry: `${root}src/player/main.tsx`, formats: ['iife'], name: 'MenuOnTVPlayer', fileName: () => 'player.js', cssFileName: 'player' },
    rolldownOptions: {
      // "use client" marks components for Next.js; in this bundle it means nothing.
      onLog(level, log, handler) {
        if (log.code !== 'MODULE_LEVEL_DIRECTIVE') handler(level, log);
      },
    },
  },
});

const gzipped = gzipSync(readFileSync(`${outDir}/player.js`)).length;
const css = gzipSync(readFileSync(`${outDir}/player.css`)).length;
console.log(`TV player: ${(gzipped / 1024).toFixed(1)} KB of JavaScript and ${(css / 1024).toFixed(1)} KB of CSS, gzipped.`);
if (gzipped > BUDGET_BYTES) {
  console.error(`The TV player is over its ${BUDGET_BYTES / 1024} KB budget (docs/architecture.md, ADR-005).`);
  process.exit(1);
}
