// Extrait les icônes Lucide (ISC) utilisées par le prototype et la présentation
// dans un petit module JS : window.PR_ICONS[name] = '<contenu SVG>'.
import { readFileSync, writeFileSync } from 'node:fs';
const names = `search bell bell-ring bell-plus heart bookmark bookmark-check external-link arrow-right arrow-up-right check x
chevron-down chevron-right chevron-left plus minus menu house list layout-grid sliders-horizontal tag percent info
trending-down trending-up calendar calendar-clock clock history cpu hard-drive memory-stick monitor gamepad-2 wrench
globe credit-card gift store users user mail trash-2 pencil lightbulb shield-check zap sparkles radar layers smartphone
laptop database server cloud code-xml route mouse-pointer-click target eye chart-line chart-spline wallet landmark
filter github figma trello settings-2 badge-percent list-checks layout-dashboard book-open circle-help`.split(/\s+/).filter(Boolean);
const out = {};
for (const n of names) {
  let svg;
  try { svg = readFileSync(`node_modules/lucide-static/icons/${n}.svg`, 'utf8'); }
  catch { console.warn('manquant:', n); continue; }
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '');
  out[n] = inner;
}
const js = `/* Icônes Lucide v0.468.0 — licence ISC — générées par tools/build-icons.mjs */\nwindow.PR_ICONS = ${JSON.stringify(out)};\n`;
for (const p of ['../prototype/assets/js/icons.js', '../presentation/assets/js/icons.js']) writeFileSync(p, js);
console.log(Object.keys(out).length, 'icônes');
