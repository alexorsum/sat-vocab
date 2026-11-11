// Renders the PNG app icons from public/favicon.svg using headless Chromium.
// Run with: node scripts/make-icons.mjs  (only needed if the icon design changes)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = fs.readFileSync(path.join(root, 'public/favicon.svg'), 'utf8');
const out = path.join(root, 'public/icons');
fs.mkdirSync(out, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
  // Maskable icons need a safe zone, so the art is drawn smaller on a full-bleed background.
  { file: 'icon-maskable-512.png', size: 512, pad: 0.14 },
];

const browser = await chromium.launch();
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
  const inner = Math.round(t.size * (1 - 2 * t.pad));
  await page.setContent(
    `<body style="margin:0;width:${t.size}px;height:${t.size}px;display:grid;place-items:center;background:${t.pad ? '#184f95' : 'transparent'}">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`,
  );
  await page.screenshot({ path: path.join(out, t.file), omitBackground: true });
  await page.close();
}
await browser.close();
console.log('Icons written to public/icons');
