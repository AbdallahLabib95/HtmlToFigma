import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'plugin-dist');

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

async function buildPlugin() {
  await build({
    entryPoints: [resolve(rootDir, 'src/code.js')],
    bundle: true,
    outfile: resolve(distDir, 'code.js'),
    format: 'iife',
    target: 'es2017',
    minify: false,
  });

  const uiHtml = readFileSync(resolve(rootDir, 'src/ui.html'), 'utf-8');
  writeFileSync(resolve(distDir, 'ui.html'), uiHtml);

  const manifest = JSON.parse(readFileSync(resolve(rootDir, 'manifest.json'), 'utf-8'));
  manifest.main = 'code.js';
  manifest.ui = 'ui.html';
  writeFileSync(resolve(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('Plugin built successfully to plugin-dist/');
  console.log('Load this folder in Figma: Plugins > Development > Import plugin from manifest');
}

buildPlugin().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
