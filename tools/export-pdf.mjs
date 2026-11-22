// Exporte la présentation en PDF (une diapositive = une page 1920 × 1080).
//   cd tools && npm run pdf            → livrables/Groupe9_Projet_Web_Objectif2.pdf
//   node export-pdf.mjs --png <dossier> → aperçus PNG de chaque diapositive (contrôle visuel)
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const deck = pathToFileURL(path.join(ROOT, 'presentation/index.html')).href + '?print';
const pngDir = process.argv.includes('--png') ? process.argv[process.argv.indexOf('--png') + 1] : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(deck);
await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'));
await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
await page.waitForTimeout(300);

if (pngDir) {
  mkdirSync(pngDir, { recursive: true });
  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) {
    await slides[i].screenshot({ path: path.join(pngDir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
  }
  console.log(slides.length, 'aperçus →', pngDir);
} else {
  mkdirSync(path.join(ROOT, 'livrables'), { recursive: true });
  const out = path.join(ROOT, 'livrables/Groupe9_Projet_Web_Objectif2.pdf');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  console.log('PDF →', out);
}
if (errors.length) console.warn('Erreurs :', errors);
await browser.close();
