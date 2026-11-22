// Relève les VRAIES données des jeux sur l'API publique de Steam (France, en français)
// et télécharge leurs visuels officiels (jaquette 600×900, image de fond, bannière).
//   cd tools && npm run games
// Sorties : prototype/assets/games/<slug>/{cover,hero,header}.jpg
//           prototype/assets/js/steam-data.js   (window.STEAM = { slug: {...} })
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_IMG = path.join(ROOT, 'prototype/assets/games');
const OUT_JS = path.join(ROOT, 'prototype/assets/js/steam-data.js');

const GAMES = {
  'gta-v': 3240220,
  'red-dead-redemption-2': 1174180,
  'cyberpunk-2077': 1091500,
  'elden-ring': 1245620,
  '007-first-light': 3768760,
  'no-mans-sky': 275850,
  'baldurs-gate-3': 1086940,
  'hollow-knight-silksong': 1030300,
  'stardew-valley': 413150,
  'lego-star-wars': 920210,
  'forza-horizon-6': 2483190,
  fable: 2769570,
  'kingdom-hearts-iv': 3216600,
  'clockwork-revolution': 2439280,
};
const NEWS_FOR = ['gta-v'];

const MONTHS = { janv: 1, 'févr': 2, fevr: 2, mars: 3, avr: 4, mai: 5, juin: 6, juil: 7, 'août': 8, aout: 8, sept: 9, oct: 10, nov: 11, 'déc': 12, dec: 12 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (html = '') =>
  html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function parseDate(s) {
  const m = /^(\d{1,2})\s+([^\s.]+)\.?\s+(\d{4})$/.exec((s || '').trim());
  if (m) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  const y = /(\d{4})/.exec(s || '');
  return y ? y[1] : null;
}

function parseReq(html) {
  const out = {};
  const map = [
    [/syst[eè]me d'exploitation/i, 'OS'],
    [/processeur/i, 'Processeur'],
    [/m[ée]moire vive/i, 'Mémoire'],
    [/graphique/i, 'Graphismes'],
    [/espace disque|stockage/i, 'Stockage'],
  ];
  for (const li of (html || '').split(/<li>/i).slice(1)) {
    const m = /<strong>([^<]+?)\s*:?\s*<\/strong>([\s\S]*)/i.exec(li);
    if (!m) continue;
    const key = map.find(([re]) => re.test(m[1]));
    if (key && !out[key[1]]) out[key[1]] = strip(m[2]).replace(/\s*\|\s*/g, ' / ').replace(/ de mémoire$/, '').replace(/ d'espace disque disponible$/, '');
  }
  return Object.keys(out).length ? out : null;
}

async function json(url) {
  const r = await fetch(url, { headers: { 'Accept-Language': 'fr-FR,fr' } });
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return r.json();
}
async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) return false;
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return true;
}

const ids = Object.values(GAMES);
const browse = await json(
  'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=' +
    encodeURIComponent(JSON.stringify({ ids: ids.map((appid) => ({ appid })), context: { language: 'french', country_code: 'FR' }, data_request: { include_assets: true } }))
);
const assets = Object.fromEntries(browse.response.store_items.map((it) => [it.appid, it.assets || {}]));

const data = {};
for (const [slug, appid] of Object.entries(GAMES)) {
  const d = (await json(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=fr&l=french`))[appid];
  if (!d.success) {
    console.warn('✗', slug);
    continue;
  }
  const x = d.data;
  const a = assets[appid] || {};
  const base = 'https://shared.steamstatic.com/store_item_assets/steam/apps/' + appid + '/';
  const dir = path.join(OUT_IMG, slug);
  mkdirSync(dir, { recursive: true });
  const img = {};
  for (const [k, file, fallback] of [
    ['cover', a.library_capsule, 'library_600x900.jpg'],
    ['hero', a.library_hero, 'library_hero.jpg'],
    ['header', a.header, 'header.jpg'],
  ]) {
    const ok = (file && (await download(base + file, path.join(dir, k + '.jpg')))) || (await download(base + fallback, path.join(dir, k + '.jpg')));
    if (ok) img[k] = `assets/games/${slug}/${k}.jpg`;
  }
  const p = x.price_overview;
  const pegi = x.ratings?.pegi;
  const editions = (x.package_groups || [])
    .flatMap((g) => g.subs || [])
    .map((s) => {
      const m = /^(.*?)\s+-\s+(?:<[^>]+>[^<]*<\/[^>]+>\s*)?([\d\s.,]+)\s*€/.exec(strip(s.option_text || ''));
      return m ? { name: m[1].trim(), price: (s.price_in_cents_with_discount || 0) / 100 } : null;
    })
    .filter(Boolean);
  data[slug] = {
    appid,
    name: x.name,
    developers: x.developers || [],
    publishers: x.publishers || [],
    release: parseDate(x.release_date?.date),
    releaseText: x.release_date?.date || '',
    comingSoon: !!x.release_date?.coming_soon,
    genres: (x.genres || []).map((g) => g.description),
    pegi: pegi?.rating ? +pegi.rating : null,
    pegiDesc: pegi?.descriptors ? strip(pegi.descriptors.replace(/\r?\n/g, ', ')).replace(/,\s*,/g, ',') : null,
    description: strip(x.short_description),
    price: p ? { initial: p.initial / 100, final: p.final / 100, discount: p.discount_percent } : null,
    editions,
    requirements: x.pc_requirements ? { min: parseReq(x.pc_requirements.minimum), rec: parseReq(x.pc_requirements.recommended) } : null,
    img,
  };
  if (NEWS_FOR.includes(slug)) {
    const n = await json(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=12&maxlength=260&format=json`);
    data[slug].news = n.appnews.newsitems
      .filter((it) => /community_announcements|steam_community/i.test(it.feedname) || it.feed_type === 1)
      .slice(0, 4)
      .map((it) => ({ title: strip(it.title), date: new Date(it.date * 1000).toISOString().slice(0, 10), text: strip(it.contents).slice(0, 220), url: it.url }));
  }
  console.log('✓', slug, '|', x.name, '|', data[slug].price ? data[slug].price.final + ' €' : 'sans prix', '|', Object.keys(img).join(','));
  await sleep(350);
}

writeFileSync(
  OUT_JS,
  `/* Données réelles relevées sur l'API publique de Steam (France) le ${new Date().toISOString().slice(0, 10)}.\n   Généré par tools/fetch-games.mjs — ne pas modifier à la main. Visuels © leurs éditeurs respectifs. */\nwindow.STEAM = ${JSON.stringify(data, null, 1)};\n`
);
console.log('→', OUT_JS);
