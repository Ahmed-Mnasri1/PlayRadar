// Capture les écrans du prototype pour la présentation.
//   cd tools && npm run shots
// Sorties : presentation/assets/img/*.jpg + presentation/assets/js/shots.js
// (dimensions et positions des sections de la fiche jeu, utilisées par l'animation).
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'presentation/assets/img');
mkdirSync(OUT, { recursive: true });
const url = (page, q = '') => pathToFileURL(path.join(ROOT, 'prototype', page)).href + '?shot=1' + (q ? '&' + q : '');

// Jaquettes officielles utilisées directement dans la présentation
const COVERS = ['gta-v', 'red-dead-redemption-2', 'cyberpunk-2077', 'elden-ring', '007-first-light', 'no-mans-sky', 'baldurs-gate-3', 'hollow-knight-silksong', 'stardew-valley', 'lego-star-wars', 'forza-horizon-6', 'fable'];
mkdirSync(path.join(OUT, 'games'), { recursive: true });
for (const c of COVERS) {
  const src = path.join(ROOT, 'prototype/assets/games', c, 'cover.jpg');
  if (existsSync(src)) copyFileSync(src, path.join(OUT, 'games', c + '.jpg'));
}
for (const c of ['gta-v', 'red-dead-redemption-2']) copyFileSync(path.join(ROOT, 'prototype/assets/games', c, 'hero.jpg'), path.join(OUT, 'games', c + '-hero.jpg'));

const browser = await chromium.launch();
const meta = {};

async function shot(name, page, { q = '', w = 1440, h = 900, dsf = 1, full = false, rects = null, before = null, el = null, png = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url(page, q));
  await p.evaluate(() => document.fonts.ready);
  if (before) await before(p);
  await p.waitForTimeout(400);
  const file = path.join(OUT, name + (png ? '.png' : '.jpg'));
  if (el) await p.locator(el).first().screenshot({ path: file, type: png ? 'png' : 'jpeg', ...(png ? {} : { quality: 92 }) });
  else await p.screenshot({ path: file, fullPage: full, type: 'jpeg', quality: 88 });
  const size = await p.evaluate((full) => ({ w: innerWidth, h: full ? document.documentElement.scrollHeight : innerHeight }), full);
  meta[name] = { ...size };
  if (rects) {
    meta[name].rects = await p.evaluate((sels) => {
      const o = {};
      for (const [k, s] of Object.entries(sels)) {
        const el = document.querySelector(s);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        o[k] = { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
      }
      return o;
    }, rects);
  }
  if (errors.length) console.warn(name, errors);
  console.log('✓', name, size.w + '×' + size.h);
  await ctx.close();
}

const JEU_RECTS = {
  decide: '.decide',
  prix: '#prix',
  historique: '#historique',
  editions: '#editions',
  pay: '[aria-labelledby="pay-h"]',
  facts: '[aria-labelledby="facts-h"]',
};

for (const fi of ['hi', 'lo']) {
  const q = 'fi=' + fi;
  await shot(`${fi}-accueil`, 'index.html', { q });
  if (fi === 'hi') await shot('hi-accueil-full', 'index.html', { q, full: true });
  await shot(`${fi}-recherche`, 'recherche.html', { q });
  await shot(`${fi}-liste`, 'liste.html', { q });
  await shot(`${fi}-jeu`, 'jeu.html', { q });
  await shot(`${fi}-jeu-full`, 'jeu.html', { q, full: true, rects: JEU_RECTS });
}
// Recherche avec suggestions ouvertes (recherche instantanée)
await shot('hi-suggest', 'index.html', {
  q: 'fi=hi',
  before: async (p) => {
    await p.click('.search__input');
    await p.keyboard.type('gta', { delay: 30 });
  },
});
// Composants réels, détourés en haute définition (diapositive des composants)
await shot('ui-decide', 'jeu.html', { q: 'fi=hi', dsf: 2, el: '.decide', png: true });
await shot('ui-card', 'index.html', { q: 'fi=hi', dsf: 2, el: '[data-deals] .gcard', png: true });
// Mobile (390 × 844, écran Retina)
await shot('m-jeu', 'jeu.html', { q: 'fi=hi', w: 390, h: 844, dsf: 2 });
await shot('m-accueil', 'index.html', { q: 'fi=hi', w: 390, h: 844, dsf: 2 });
await shot('m-liste', 'liste.html', { q: 'fi=hi', w: 390, h: 844, dsf: 2 });

// Textures des scènes 3D : jaquettes réduites en data URI (WebGL refuse les images file://)
{
  const pg = await browser.newPage();
  const tex = [];
  for (const c of COVERS) {
    const b64 = readFileSync(path.join(ROOT, 'prototype/assets/games', c, 'cover.jpg')).toString('base64');
    const src = await pg.evaluate(async (d) => {
      const img = new Image();
      img.src = d;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = 300; cv.height = 450;
      cv.getContext('2d').drawImage(img, 0, 0, 300, 450);
      return cv.toDataURL('image/jpeg', 0.84);
    }, 'data:image/jpeg;base64,' + b64);
    tex.push({ id: c, src });
  }
  writeFileSync(path.join(ROOT, 'presentation/assets/js/textures.js'), `/* Généré par tools/shots.mjs : jaquettes Steam (© éditeurs) en data URI pour three.js */\nwindow.COVER_TEX = ${JSON.stringify(tex)};\n`);
  console.log('✓ textures', tex.length);
  await pg.close();
}

writeFileSync(
  path.join(ROOT, 'presentation/assets/js/shots.js'),
  `/* Généré par tools/shots.mjs — ne pas modifier à la main */\nwindow.SHOTS = ${JSON.stringify(meta, null, 1)};\n`
);
await browser.close();
