#!/usr/bin/env node
/**
 * Builds the dashboard into one self-contained HTML file.
 *
 *   node scripts/build.mjs          minified build   -> index.html, dist/artifact.html
 *   node scripts/build.mjs --dev    readable build   (no minification)
 *
 * index.html is what GitHub Pages serves. dist/artifact.html is the same page without the
 * <html>/<head>/<body> wrapper, which is the form claude.ai publishes.
 */
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');
const file = (...parts) => path.join(root, ...parts);

async function bundle(entry, options) {
  const result = await build({
    entryPoints: [file(entry)],
    bundle: true,
    minify: !dev,
    write: false,
    legalComments: 'none',
    logLevel: 'warning',
    ...options,
  });
  return result.outputFiles[0].text.trim();
}

const bundleScript = () => bundle('src/js/main.js', { format: 'iife', target: 'es2020' });
const bundleStyles = () =>
  bundle('src/styles/main.css', { target: ['chrome100', 'safari15', 'firefox100'] });

/** Replaces a marker comment. A function replacer keeps "$&" and friends in the code literal. */
const fill = (page, marker, text) => {
  if (!page.includes(marker)) throw new Error(`Template is missing ${marker}`);
  return page.replace(marker, () => text);
};

/** Drops the wrapper claude.ai adds itself: keeps the title, head extras and body content. */
function toArtifact(page) {
  const head = /<head>([\s\S]*?)<\/head>/.exec(page)[1];
  const body = /<body>([\s\S]*?)<\/body>/.exec(page)[1];
  const title = /<title>[^<]*<\/title>/.exec(head)[0];
  const extras = head
    .replace(title, '')
    .split('\n')
    .filter((line) => line && !/<meta charset|<meta name="viewport"/.test(line))
    .join('\n');
  return `${title}\n<meta name="claude:viewport-fit-sides" content="cover">\n${extras}\n${body.trim()}\n`;
}

const [script, styles, template, fallback] = await Promise.all([
  bundleScript(),
  bundleStyles(),
  readFile(file('src/index.html'), 'utf8'),
  readFile(file('src/assets/hero-fallback.svg'), 'utf8'),
]);

if (/<\/script/i.test(script) || /<\/style/i.test(styles)) {
  throw new Error('A bundle contains a closing tag and cannot be inlined safely.');
}

let page = template;
page = fill(page, '<!-- build:css -->', `<style>\n${styles}\n</style>`);
page = fill(page, '<!-- build:hero-fallback -->', fallback.trim());
page = fill(page, '<!-- build:js -->', `<script>\n${script}\n</script>`);

await mkdir(file('dist'), { recursive: true });
await writeFile(file('index.html'), page);
await writeFile(file('dist/artifact.html'), toArtifact(page));

const kb = (text) => `${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`;
console.log(`${dev ? 'dev' : 'production'} build: index.html ${kb(page)} (js ${kb(script)}, css ${kb(styles)})`);
