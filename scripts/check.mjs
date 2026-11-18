#!/usr/bin/env node
/**
 * Archon NEO – static consistency checks (run locally and in CI, no dependencies).
 *  1. English and German translations have identical keys.
 *  2. Every translation key used in game.js / index.html exists.
 *  3. Every unit and spell has a name and description in both languages.
 *  4. APP_VERSION (game.js) matches the service worker cache VERSION.
 *  5. Every file referenced by index.html, the manifest and the service worker exists.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const read = (p) => readFileSync(join(root, p), 'utf8');
const errors = [];
const fail = (msg) => errors.push(msg);

const { _STRINGS: S } = await import(pathToFileURL(join(pub, 'js/i18n.js')).href);
const { ART_TYPES } = await import(pathToFileURL(join(pub, 'js/art.js')).href);

// 1. key parity
const en = Object.keys(S.en), de = Object.keys(S.de);
for (const k of en) if (!(k in S.de)) fail(`i18n: "${k}" missing in de`);
for (const k of de) if (!(k in S.en)) fail(`i18n: "${k}" missing in en`);
for (const lang of ['en', 'de']) {
  for (const [k, v] of Object.entries(S[lang])) if (typeof v !== 'string' || !v.trim()) fail(`i18n: "${k}" empty in ${lang}`);
}

// 2. keys used in code and markup
const game = read('public/js/game.js');
const intro = read('public/js/intro.js');
const html = read('public/index.html');
const used = new Set();
for (const m of game.matchAll(/\bt\(\s*'([\w.]+)'/g)) used.add(m[1]);
for (const m of game.matchAll(/\bt\([^)]*?\?\s*'([\w.]+)'\s*:\s*'([\w.]+)'/g)) { used.add(m[1]); used.add(m[2]); }
for (const m of html.matchAll(/data-i18n(?:-html|-aria)?="([\w.]+)"/g)) used.add(m[1]);
for (const m of intro.matchAll(/\bd\.t\(\s*'([\w.]+)'/g)) used.add(m[1]);
// story texts and unit lore
for (let n = 1; n <= 7; n++) for (const f of ['kicker', 'title']) used.add(`ch${n}.${f}`);
for (const k of used) if (!(k in S.en)) fail(`i18n: key "${k}" is used but not defined`);

// 3. units and spells
for (const type of ART_TYPES) {
  for (const f of ['name', 'role', 'lore']) if (!(`unit.${type}.${f}` in S.en)) fail(`i18n: unit.${type}.${f} missing`);
  if (!new RegExp(`\\b${type}\\s*:\\s*\\{`).test(game)) fail(`units: art for "${type}" has no unit definition`);
}
const spells = (game.match(/const SPELLS = \[([^\]]+)\]/) || [])[1];
if (!spells) fail('spells: SPELLS list not found');
else for (const id of spells.match(/'(\w+)'/g).map((s) => s.slice(1, -1))) {
  for (const f of ['name', 'desc']) if (!(`spell.${id}.${f}` in S.en)) fail(`i18n: spell.${id}.${f} missing`);
}

// 4. versions
const appVersion = (game.match(/APP_VERSION = '([^']+)'/) || [])[1];
const swVersion = (read('public/sw.js').match(/const VERSION = '([^']+)'/) || [])[1];
if (!appVersion || appVersion !== swVersion) fail(`version: game.js (${appVersion}) and sw.js (${swVersion}) differ`);
const changelog = read('CHANGELOG.md');
if (appVersion && !changelog.includes(`[${appVersion}]`)) fail(`version: CHANGELOG.md has no entry for ${appVersion}`);

// 5. referenced files
const refs = new Set();
for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) refs.add(m[1]);
for (const m of read('public/sw.js').matchAll(/^\s*'([^']+)',?$/gm)) refs.add(m[1]);
for (const icon of JSON.parse(read('public/manifest.webmanifest')).icons) refs.add(icon.src);
for (const ref of refs) {
  if (/^(https?:|mailto:|#|__SITE_URL__)/.test(ref) || ref === './') continue;
  if (!existsSync(join(pub, ref.replace(/^\//, '').split('?')[0]))) fail(`files: "${ref}" is referenced but missing`);
}
if (/fonts\.googleapis|fonts\.gstatic|cdn\./.test(html + read('public/css/style.css'))) fail('privacy: third-party resource found');

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ checks passed (${en.length} strings × 2 languages, ${ART_TYPES.length} units, ${refs.size} file references, v${appVersion})`);
