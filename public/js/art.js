/**
 * Archon NEO – unit artwork.
 *
 * Every unit is a small set of vector shapes (SVG path syntax) in a 100×100 box,
 * modelled on the silhouettes of the 1983 originals but rendered in high resolution
 * with gradients, outlines and glowing eyes. Shapes are rasterised once per
 * size/palette and cached, so drawing on the board or in the arena is cheap.
 *
 * Shape formats (drawn back to front):
 *   ['f', colorKey, 'svg path']        filled shape with gradient and outline
 *   ['s', colorKey, width, 'svg path'] stroked line with outline
 *   ['c', colorKey, x, y, r]           filled circle
 * Color keys: b = body, a = accent, m = metal/skin/highlight, d = dark detail, e = eyes/glow
 */

const TAU = Math.PI * 2;

export const PALETTES = {
  light: { b: '#ffe3a0', a: '#ff9d2e', m: '#eef7ff', d: '#9a6a22', e: '#4fe8ff', k: '#2a1600' },
  dark:  { b: '#a37bff', a: '#ff3d8b', m: '#ddd2f7', d: '#3f2380', e: '#ff3b3b', k: '#12051f' },
  air:   { b: '#e6fbff', a: '#8fdcf5', m: '#ffffff', d: '#4f9fbf', e: '#2a8cff', k: '#0b3442' },
  earth: { b: '#b48a5a', a: '#7a5a30', m: '#e0c08a', d: '#4f361a', e: '#ffd24a', k: '#1e1206' },
  fire:  { b: '#ffcf3a', a: '#ff5a1f', m: '#fff6c8', d: '#8a1e00', e: '#ffffff', k: '#3a0a00' },
  water: { b: '#6fc8ff', a: '#2a7fff', m: '#e0f6ff', d: '#123f80', e: '#ffffff', k: '#04203f' },
  flash: { b: '#ffffff', a: '#ffffff', m: '#ffffff', d: '#ffffff', e: '#ffffff', k: '#ffffff' },
};

const ART = {
  // ----------------------------- Light -----------------------------
  knight: [
    ['f', 'm', 'M66 50 L82 12 L86 13 L73 52 Z'],
    ['f', 'b', 'M38 40 Q50 34 62 40 L65 70 L58 72 L58 92 L52 92 L50 75 L48 92 L42 92 L42 72 L35 70 Z'],
    ['f', 'd', 'M40 60 L60 60 L61 66 L39 66 Z'],
    ['f', 'b', 'M40 22 Q50 9 60 22 L60 38 Q50 42 40 38 Z'],
    ['f', 'd', 'M43 27 L58 27 L58 31 L43 31 Z'],
    ['f', 'a', 'M50 12 Q58 2 67 8 Q59 9 55 17 Z'],
    ['f', 'b', 'M58 44 L70 50 L68 55 L56 50 Z'],
    ['f', 'd', 'M62 50 L76 45 L77 49 L64 55 Z'],
    ['f', 'a', 'M26 45 L42 42 L42 62 Q34 74 26 62 Z'],
    ['f', 'm', 'M31 50 L37 49 L37 60 Q34 64 31 60 Z'],
    ['c', 'e', 47, 29, 1.4], ['c', 'e', 54, 29, 1.4],
  ],
  archer: [
    ['s', 'a', 4, 'M74 12 Q92 42 74 72'],
    ['s', 'm', 1.2, 'M74 12 L64 42 L74 72'],
    ['f', 'd', 'M26 34 L34 30 L36 50 L28 52 Z'],
    ['f', 'b', 'M40 32 Q47 29 54 32 L57 60 L51 62 L51 92 L46 92 L45 67 L43 92 L38 92 L39 62 L34 60 Z'],
    ['f', 'd', 'M38 52 L56 52 L57 56 L37 56 Z'],
    ['c', 'm', 47, 22, 8],
    ['f', 'a', 'M38 22 Q39 10 50 12 Q57 14 55 21 Q47 16 41 28 Q36 36 32 44 Q34 30 38 22 Z'],
    ['f', 'b', 'M50 37 L66 41 L66 45 L50 44 Z'],
    ['s', 'm', 2, 'M56 42 L94 42'],
    ['f', 'm', 'M94 38 L100 42 L94 46 Z'],
    ['c', 'e', 51, 22, 1.4],
  ],
  valkyrie: [
    ['f', 'm', 'M44 40 Q20 18 6 28 Q20 33 24 42 Q12 45 8 56 Q26 51 40 54 Z'],
    ['s', 'd', 3, 'M70 8 L62 86'],
    ['f', 'm', 'M70 1 L75 13 L67 12 Z'],
    ['f', 'b', 'M44 34 Q52 30 58 34 L62 62 L55 66 L52 86 L46 86 L45 64 L40 62 Z'],
    ['f', 'a', 'M42 50 L62 50 L64 64 L40 64 Z'],
    ['c', 'm', 51, 24, 8],
    ['f', 'a', 'M42 23 Q51 11 60 23 L57 20 Q51 16 45 20 Z'],
    ['f', 'm', 'M43 19 L34 10 L45 16 Z'],
    ['f', 'b', 'M56 40 L68 33 L70 37 L58 45 Z'],
    ['c', 'e', 54, 24, 1.4],
  ],
  golem: [
    ['f', 'b', 'M24 34 L12 64 L22 67 L32 42 Z'],
    ['f', 'b', 'M30 30 Q50 18 70 30 L76 60 L66 64 L66 92 L55 92 L54 70 L46 70 L45 92 L34 92 L34 64 L24 60 Z'],
    ['f', 'b', 'M76 34 L88 64 L78 67 L68 42 Z'],
    ['f', 'b', 'M39 12 L61 12 L63 30 L37 30 Z'],
    ['f', 'd', 'M41 18 L59 18 L59 21 L41 21 Z'],
    ['f', 'a', 'M47 44 L53 44 L55 50 L50 54 L45 50 Z'],
    ['s', 'd', 1.8, 'M40 40 L46 48 L42 56'],
    ['s', 'd', 1.8, 'M61 36 L57 46 L61 52'],
    ['c', 'e', 45, 25, 2.2], ['c', 'e', 55, 25, 2.2],
  ],
  unicorn: [
    ['f', 'a', 'M22 46 Q8 48 5 66 Q14 56 22 52 Z'],
    ['f', 'b', 'M30 54 L27 82 L33 82 L36 56 Z'],
    ['f', 'b', 'M58 54 L60 82 L66 82 L65 52 Z'],
    ['f', 'b', 'M20 50 Q22 40 36 40 L62 40 Q68 30 66 22 L72 15 Q82 17 87 28 L85 34 L77 34 Q74 44 70 52 L68 58 L36 58 Q20 58 20 50 Z'],
    ['f', 'b', 'M40 56 L40 82 L46 82 L47 56 Z'],
    ['f', 'b', 'M64 50 L71 80 L77 79 L70 48 Z'],
    ['f', 'd', 'M26 80 L34 80 L34 85 L26 85 Z'], ['f', 'd', 'M39 80 L47 80 L47 85 L39 85 Z'],
    ['f', 'd', 'M59 80 L67 80 L67 85 L59 85 Z'], ['f', 'd', 'M70 78 L78 77 L79 82 L71 83 Z'],
    ['f', 'a', 'M67 21 Q60 25 58 40 Q53 30 55 23 Q60 14 69 15 Z'],
    ['f', 'm', 'M75 18 L93 1 L80 20 Z'],
    ['c', 'e', 78, 24, 1.6],
  ],
  djinni: [
    ['f', 'a', 'M44 60 Q30 72 46 78 Q60 83 48 90 Q40 94 52 99 Q35 97 38 86 Q42 80 34 74 Q27 64 40 57 Z'],
    ['f', 'b', 'M34 34 Q50 26 66 34 L62 60 Q50 67 38 60 Z'],
    ['c', 'b', 50, 20, 10],
    ['f', 'a', 'M37 18 Q50 1 63 18 Q50 12 37 18 Z'],
    ['c', 'e', 50, 11, 2],
    ['f', 'm', 'M29 38 Q21 51 34 53 L60 53 Q73 51 71 38 L64 40 Q64 47 58 47 L42 47 Q36 47 36 40 Z'],
    ['s', 'd', 1.5, 'M44 27 Q50 30 56 27'],
    ['c', 'e', 46, 21, 1.6], ['c', 'e', 55, 21, 1.6],
  ],
  phoenix: [
    ['f', 'a', 'M46 44 Q24 20 4 22 Q18 32 14 40 Q26 40 28 48 Q36 52 46 54 Z'],
    ['f', 'a', 'M54 44 Q76 20 96 22 Q82 32 86 40 Q74 40 72 48 Q64 52 54 54 Z'],
    ['f', 'a', 'M44 64 Q36 84 42 96 Q46 82 50 74 Q54 82 58 96 Q64 84 56 64 Z'],
    ['f', 'b', 'M42 40 Q50 28 58 40 L56 64 Q50 70 44 64 Z'],
    ['f', 'm', 'M46 46 Q50 42 54 46 L53 60 Q50 63 47 60 Z'],
    ['c', 'b', 50, 30, 7],
    ['f', 'a', 'M47 23 Q49 11 56 15 Q52 17 52 24 Z'],
    ['f', 'm', 'M55 29 L63 32 L55 35 Z'],
    ['c', 'e', 52, 29, 1.4],
  ],
  wizard: [
    ['s', 'd', 3, 'M74 12 L72 94'],
    ['c', 'e', 74, 10, 5],
    ['f', 'b', 'M40 34 Q50 30 60 34 L70 94 L30 94 Z'],
    ['f', 'a', 'M30 89 L70 89 L70 94 L30 94 Z'],
    ['f', 'm', 'M43 28 L57 28 L56 37 L44 37 Z'],
    ['f', 'm', 'M43 35 L57 35 L50 55 Z'],
    ['f', 'a', 'M50 0 L62 25 L38 25 Z'],
    ['f', 'a', 'M32 24 L68 24 L66 29 L34 29 Z'],
    ['f', 'b', 'M58 42 L72 40 L72 45 L60 49 Z'],
    ['c', 'm', 42, 64, 1.6], ['c', 'm', 57, 74, 1.6], ['c', 'm', 46, 82, 1.3],
    ['c', 'e', 47, 31, 1.2], ['c', 'e', 53, 31, 1.2],
  ],
  // ----------------------------- Dark -----------------------------
  goblin: [
    ['f', 'a', 'M66 48 L80 18 Q86 13 89 20 L72 52 Z'],
    ['f', 'b', 'M36 42 Q50 36 62 44 L64 70 L58 72 L58 90 L52 90 L50 74 L46 90 L40 90 L40 72 L34 68 Z'],
    ['f', 'd', 'M38 62 L62 62 L62 66 L38 66 Z'],
    ['f', 'b', 'M58 46 L70 48 L68 54 L58 52 Z'],
    ['f', 'b', 'M39 28 L20 18 L36 37 Z'],
    ['f', 'b', 'M61 28 L80 18 L64 37 Z'],
    ['f', 'b', 'M38 24 Q50 13 62 24 L62 40 Q50 46 38 40 Z'],
    ['f', 'd', 'M44 35 L56 35 L54 39 L46 39 Z'],
    ['f', 'm', 'M46 35 L48 35 L47 38 Z'], ['f', 'm', 'M52 35 L54 35 L53 38 Z'],
    ['c', 'e', 45, 28, 2], ['c', 'e', 55, 28, 2],
  ],
  manticore: [
    ['s', 'a', 4, 'M22 48 Q5 40 9 22 Q13 9 25 11'],
    ['f', 'a', 'M23 6 L31 13 L22 16 Z'],
    ['f', 'b', 'M30 58 L28 82 L34 82 L36 58 Z'],
    ['f', 'b', 'M60 58 L60 82 L66 82 L67 58 Z'],
    ['f', 'b', 'M18 54 Q20 42 34 42 L64 44 Q72 44 74 52 L72 62 L38 60 Q18 62 18 54 Z'],
    ['f', 'b', 'M40 58 L40 82 L46 82 L47 58 Z'],
    ['f', 'b', 'M68 56 L72 82 L78 82 L73 54 Z'],
    ['c', 'a', 74, 40, 13],
    ['c', 'm', 77, 42, 7],
    ['s', 'd', 1.4, 'M74 46 Q77 48 80 46'],
    ['c', 'e', 75, 40, 1.4], ['c', 'e', 80, 40, 1.4],
  ],
  banshee: [
    ['f', 'a', 'M30 30 Q23 50 18 68 Q30 54 34 40 Z'],
    ['f', 'a', 'M70 30 Q77 50 82 68 Q70 54 66 40 Z'],
    ['f', 'b', 'M30 30 Q50 6 70 30 L74 70 Q68 78 64 70 Q60 86 54 74 Q50 92 46 74 Q40 86 36 70 Q32 78 26 70 Z'],
    ['f', 'b', 'M31 44 Q18 52 12 40 Q20 46 31 39 Z'],
    ['f', 'b', 'M69 44 Q82 52 88 40 Q80 46 69 39 Z'],
    ['f', 'd', 'M37 32 a5.5 4.5 0 1 0 11 0 a5.5 4.5 0 1 0 -11 0 Z'],
    ['f', 'd', 'M52 32 a5.5 4.5 0 1 0 11 0 a5.5 4.5 0 1 0 -11 0 Z'],
    ['f', 'd', 'M46 45 a4 7 0 1 0 8 0 a4 7 0 1 0 -8 0 Z'],
    ['c', 'e', 42.5, 32, 2], ['c', 'e', 57.5, 32, 2],
  ],
  troll: [
    ['f', 'b', 'M24 42 L12 72 L22 74 L32 48 Z'],
    ['f', 'b', 'M76 42 L88 72 L78 74 L68 48 Z'],
    ['f', 'b', 'M26 40 Q50 24 74 40 L78 66 L66 68 L66 92 L56 92 L54 72 L46 72 L44 92 L34 92 L34 68 L22 66 Z'],
    ['f', 'a', 'M40 48 Q50 44 60 48 L60 62 Q50 68 40 62 Z'],
    ['f', 'b', 'M37 18 Q50 9 63 18 L65 38 Q50 45 35 38 Z'],
    ['f', 'd', 'M39 24 L61 24 L60 27 L40 27 Z'],
    ['f', 'm', 'M42 36 L44 45 L46 36 Z'], ['f', 'm', 'M54 36 L56 45 L58 36 Z'],
    ['c', 'e', 45, 30, 2], ['c', 'e', 55, 30, 2],
  ],
  basilisk: [
    ['f', 'b', 'M30 82 L25 95 L32 95 L36 84 Z'],
    ['f', 'b', 'M52 82 L54 95 L61 95 L58 80 Z'],
    ['f', 'b', 'M8 82 Q20 64 40 70 Q56 76 62 62 Q66 50 60 42 L64 36 Q76 30 87 38 Q91 44 85 49 L73 49 Q75 62 67 76 Q52 92 30 87 Q16 86 8 82 Z'],
    ['f', 'a', 'M63 37 L65 24 L69 34 L73 21 L76 32 L80 23 L81 36 Z'],
    ['s', 'd', 1.5, 'M28 80 L30 86'], ['s', 'd', 1.5, 'M38 78 L40 86'], ['s', 'd', 1.5, 'M48 76 L50 84'],
    ['c', 'e', 78, 41, 3.2],
    ['c', 'd', 79, 41, 1.2],
  ],
  dragon: [
    ['f', 'a', 'M54 46 L68 6 L68 24 L82 14 L70 38 Z'],
    ['f', 'b', 'M24 64 Q30 46 50 46 Q62 46 66 38 L70 26 Q74 18 84 20 L93 26 L89 31 L80 31 Q76 40 74 52 Q72 66 58 70 L60 86 L54 86 L50 72 L40 72 L38 86 L32 86 L32 72 Q14 76 5 90 Q8 72 24 64 Z'],
    ['f', 'm', 'M44 50 Q58 52 66 42 L68 50 Q62 64 46 64 Z'],
    ['f', 'a', 'M42 46 L22 8 L31 25 L14 20 L28 37 L8 36 L38 56 Z'],
    ['f', 'd', 'M78 21 L73 10 L82 19 Z'],
    ['c', 'e', 83, 24, 1.8],
  ],
  shapeshifter: [
    ['f', 'b', 'M20 80 Q14 50 30 34 Q50 14 70 34 Q86 50 80 80 Q74 92 64 84 Q58 94 50 86 Q42 94 36 84 Q26 92 20 80 Z'],
    ['s', 'a', 3, 'M28 70 Q40 60 50 72 Q60 82 72 70'],
    ['c', 'm', 38, 46, 6], ['c', 'e', 38, 46, 3],
    ['c', 'm', 61, 42, 7], ['c', 'e', 61, 42, 3.5],
    ['c', 'm', 50, 60, 4.5], ['c', 'e', 50, 60, 2.2],
    ['c', 'm', 70, 58, 3.5], ['c', 'e', 70, 58, 1.8],
  ],
  sorceress: [
    ['f', 'a', 'M38 34 L20 94 L34 94 L42 40 Z'],
    ['f', 'b', 'M40 34 Q50 30 60 34 L72 94 L28 94 Z'],
    ['f', 'a', 'M28 89 L72 89 L72 94 L28 94 Z'],
    ['c', 'm', 50, 24, 8],
    ['f', 'a', 'M41 23 Q43 9 56 11 Q63 16 61 36 L56 25 Q50 18 44 27 Z'],
    ['f', 'e', 'M42 14 L45 7 L48 13 L50 5 L52 13 L55 7 L58 14 Z'],
    ['f', 'b', 'M57 40 L72 21 L76 24 L62 45 Z'],
    ['s', 'e', 2.2, 'M77 19 L86 9 L81 9 L91 0'],
    ['c', 'e', 47, 25, 1.3], ['c', 'e', 53, 25, 1.3],
  ],
  // ----------------------------- Elementals -----------------------------
  air: [
    ['f', 'a', 'M42 64 Q48 80 38 96 Q56 85 58 64 Z'],
    ['f', 'b', 'M24 50 Q20 36 34 34 Q38 22 52 26 Q64 18 72 30 Q86 32 82 46 Q90 58 76 62 Q70 74 56 68 Q44 78 36 66 Q20 66 24 50 Z'],
    ['s', 'a', 2.5, 'M36 50 Q50 40 64 50'],
    ['s', 'a', 2.5, 'M40 58 Q52 52 62 60'],
    ['c', 'e', 44, 42, 2.2], ['c', 'e', 58, 42, 2.2],
  ],
  earth: [
    ['f', 'b', 'M24 92 L18 60 L26 34 L42 22 L62 24 L78 38 L82 64 L76 92 Z'],
    ['s', 'd', 2, 'M30 46 L40 52 L36 62'],
    ['s', 'd', 2, 'M66 40 L60 50 L68 58'],
    ['f', 'a', 'M40 62 L60 62 L56 72 L44 72 Z'],
    ['c', 'e', 42, 44, 3], ['c', 'e', 58, 44, 3],
  ],
  fire: [
    ['f', 'a', 'M50 4 Q60 22 70 30 Q66 18 74 14 Q90 40 82 64 Q76 88 50 94 Q24 88 18 64 Q12 44 28 26 Q30 40 38 44 Q34 24 50 4 Z'],
    ['f', 'b', 'M50 30 Q60 46 66 58 Q68 80 50 84 Q32 80 34 60 Q38 48 50 30 Z'],
    ['f', 'm', 'M50 54 Q57 64 56 72 Q54 80 50 80 Q46 80 44 72 Q43 64 50 54 Z'],
    ['c', 'd', 44, 60, 2.4], ['c', 'd', 56, 60, 2.4],
  ],
  water: [
    ['f', 'b', 'M50 6 Q66 30 76 50 Q86 76 62 90 Q50 96 38 90 Q14 76 24 50 Q34 30 50 6 Z'],
    ['s', 'm', 2.5, 'M30 66 Q38 60 46 66 Q54 72 62 66 Q68 62 72 66'],
    ['s', 'a', 2.5, 'M32 76 Q42 70 50 76 Q58 82 68 76'],
    ['f', 'm', 'M40 34 Q44 26 48 22 Q46 34 42 40 Z'],
    ['c', 'e', 43, 52, 2.8], ['c', 'e', 57, 52, 2.8],
    ['c', 'd', 43.5, 52.5, 1.2], ['c', 'd', 57.5, 52.5, 1.2],
  ],
};

export const ART_TYPES = Object.keys(ART);

// ---------------------------------------------------------------------------
const pathCache = new Map();
function getPath(d) {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    const nums = (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    const ys = nums.filter((_, i) => i % 2 === 1);
    p.top = ys.length ? Math.min(...ys) : 0;
    p.bot = ys.length ? Math.max(...ys) : 100;
    pathCache.set(d, p);
  }
  return p;
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function renderUnit(type, palName, px) {
  const shapes = ART[type];
  const p = PALETTES[palName] || PALETTES.light;
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d');
  const s = px / 112;
  c.setTransform(s, 0, 0, s, 6 * s, 6 * s);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  for (const sh of shapes) {
    const kind = sh[0];
    const col = p[sh[1]];
    if (kind === 's') {
      const path = getPath(sh[3]);
      c.strokeStyle = p.k; c.lineWidth = sh[2] + 2.6; c.stroke(path);
      if (sh[1] === 'e') { c.shadowColor = col; c.shadowBlur = 8 * s; }
      c.strokeStyle = col; c.lineWidth = sh[2]; c.stroke(path);
      c.shadowBlur = 0;
      continue;
    }
    let path, top, bot, small = false;
    if (kind === 'c') {
      const [, , x, y, r] = sh;
      path = new Path2D();
      path.arc(x, y, r, 0, TAU);
      top = y - r; bot = y + r; small = r < 2.6;
    } else {
      path = getPath(sh[2]);
      top = path.top; bot = path.bot;
    }
    if (sh[1] === 'e') {
      c.shadowColor = col; c.shadowBlur = 7 * s;
      c.fillStyle = col; c.fill(path);
      c.shadowBlur = 0;
      continue;
    }
    const g = c.createLinearGradient(0, top, 0, Math.max(bot, top + 1));
    g.addColorStop(0, shade(col, 0.38));
    g.addColorStop(0.55, col);
    g.addColorStop(1, shade(col, -0.38));
    c.fillStyle = g;
    c.fill(path);
    if (!small) { c.strokeStyle = p.k; c.lineWidth = 2.2; c.stroke(path); }
  }
  return cv;
}

const cache = new Map();
const CACHE_LIMIT = 400;

/** Returns a cached canvas of the unit rendered at roughly `px` device pixels. */
export function unitCanvas(type, palName, px) {
  const size = Math.max(16, Math.round(px / 8) * 8);
  const key = `${type}|${palName}|${size}`;
  let cv = cache.get(key);
  if (!cv) {
    if (cache.size > CACHE_LIMIT) cache.clear();
    cv = renderUnit(type, palName, size);
    cache.set(key, cv);
  }
  return cv;
}

/** Draws a unit centred at (cx, cy) with CSS size `size`; `dpr` = device pixel ratio. */
export function drawUnit(ctx, type, palName, cx, cy, size, flip, dpr) {
  const cv = unitCanvas(type, palName, size * dpr);
  ctx.imageSmoothingEnabled = true;
  if (flip) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.drawImage(cv, -size / 2, -size / 2, size, size);
    ctx.restore();
  } else {
    ctx.drawImage(cv, cx - size / 2, cy - size / 2, size, size);
  }
}
