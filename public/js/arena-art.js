/**
 * Archon NEO – arena artwork.
 * The floor and the stone pillars are painted procedurally once per combat
 * (and again only when the screen scale changes) into offscreen canvases,
 * so every frame just blits crisp, high-resolution images.
 */

const TAU = Math.PI * 2;

/** Small deterministic random generator so a pillar keeps its look while scaling. */
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const rgb = (c, k = 1, a = 1) => `rgba(${Math.round(Math.min(255, c[0] * k))},${Math.round(Math.min(255, c[1] * k))},${Math.round(Math.min(255, c[2] * k))},${a})`;

function canvasOf(w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  return cv;
}

/**
 * Arena floor: flagstones in the colour of the contested square, an engraved
 * compass of the eight attack directions, the colours of both armies at
 * their ends and a soft vignette.
 * @param {number} w,h  arena size in arena units
 * @param {number} scale device pixels per arena unit
 * @param {number[]} base RGB colour of the square
 * @param {number} lf lightness of the square (0 … 1)
 * @param {string} bottomSide 'light' | 'dark'
 */
export function makeFloor(w, h, scale, base, lf, bottomSide, seed = 7) {
  const cv = canvasOf(w * scale, h * scale);
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  const rnd = rng(seed);
  g.fillStyle = rgb(base, 0.55);
  g.fillRect(0, 0, w, h);

  // flagstones in running bond
  const rowH = 30;
  for (let y = 0, row = 0; y < h; y += rowH, row++) {
    let x = row % 2 ? -18 : 0;
    while (x < w) {
      const sw = 34 + rnd() * 26;
      const k = 0.78 + rnd() * 0.2;
      const x0 = x + 1.2, y0 = y + 1.2, ww = sw - 2.4, hh = rowH - 2.4;
      const grad = g.createLinearGradient(x0, y0, x0 + ww, y0 + hh);
      grad.addColorStop(0, rgb(base, k * 1.08));
      grad.addColorStop(1, rgb(base, k * 0.86));
      g.fillStyle = grad;
      g.beginPath();
      if (g.roundRect) g.roundRect(x0, y0, ww, hh, 3); else g.rect(x0, y0, ww, hh);
      g.fill();
      // bevel
      g.strokeStyle = rgb([255, 255, 255], 1, 0.07 + lf * 0.06);
      g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x0 + 2, y0 + hh - 1); g.lineTo(x0 + 2, y0 + 1.5); g.lineTo(x0 + ww - 2, y0 + 1.5); g.stroke();
      // grain and the odd crack
      for (let i = 0; i < 10; i++) {
        g.fillStyle = rgb(rnd() < 0.5 ? [0, 0, 0] : [255, 255, 255], 1, 0.05 + rnd() * 0.05);
        g.fillRect(x0 + rnd() * ww, y0 + rnd() * hh, 0.9, 0.9);
      }
      if (rnd() < 0.18) {
        g.strokeStyle = rgb([0, 0, 0], 1, 0.18);
        g.lineWidth = 0.6;
        g.beginPath();
        let cx = x0 + rnd() * ww, cy = y0 + 2;
        g.moveTo(cx, cy);
        for (let j = 0; j < 4; j++) { cx += (rnd() - 0.5) * 8; cy += hh / 5; g.lineTo(cx, cy); }
        g.stroke();
      }
      x += sw;
    }
  }

  // engraved compass: the eight directions of attack
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3;
  const ink = lf > 0.5 ? [70, 52, 10] : [150, 130, 255];
  g.strokeStyle = rgb(ink, 1, 0.22);
  g.lineWidth = 1.4;
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  g.lineWidth = 0.8;
  g.beginPath(); g.arc(cx, cy, R * 0.86, 0, TAU); g.stroke();
  g.beginPath(); g.arc(cx, cy, R * 0.22, 0, TAU); g.stroke();
  g.fillStyle = rgb(ink, 1, 0.2);
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8 - Math.PI / 2;
    const r0 = R * 0.3, r1 = i % 2 ? R * 0.72 : R * 0.84;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    g.lineTo(cx + Math.cos(a + 0.12) * r0, cy + Math.sin(a + 0.12) * r0);
    g.lineTo(cx + Math.cos(a - 0.12) * r0, cy + Math.sin(a - 0.12) * r0);
    g.closePath(); g.fill();
    const dx = cx + Math.cos(a) * R, dy = cy + Math.sin(a) * R;
    g.beginPath(); g.moveTo(dx, dy - 3); g.lineTo(dx + 3, dy); g.lineTo(dx, dy + 3); g.lineTo(dx - 3, dy); g.closePath(); g.fill();
  }
  for (let i = 0; i < 48; i++) {
    const a = (i * TAU) / 48;
    g.fillRect(cx + Math.cos(a) * R * 0.93 - 0.5, cy + Math.sin(a) * R * 0.93 - 0.5, 1, 1);
  }

  // the two armies' ends
  const warm = [255, 190, 80], cold = [150, 90, 255];
  const top = bottomSide === 'light' ? cold : warm, bottom = bottomSide === 'light' ? warm : cold;
  let gr = g.createLinearGradient(0, 0, 0, h * 0.35);
  gr.addColorStop(0, rgb(top, 1, 0.22)); gr.addColorStop(1, rgb(top, 1, 0));
  g.fillStyle = gr; g.fillRect(0, 0, w, h * 0.35);
  gr = g.createLinearGradient(0, h, 0, h * 0.65);
  gr.addColorStop(0, rgb(bottom, 1, 0.22)); gr.addColorStop(1, rgb(bottom, 1, 0));
  g.fillStyle = gr; g.fillRect(0, h * 0.65, w, h * 0.35);

  // vignette
  gr = g.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.hypot(w, h) * 0.6);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  return cv;
}

/**
 * A faceted stone pillar, lit from the top left, seen slightly from above.
 * Returns { cv, size } – the canvas covers `size` arena units, centred on the pillar.
 */
export function makeRock(r, scale, seed) {
  const size = r * 3;
  const cv = canvasOf(size * scale, size * scale);
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  g.translate(size / 2, size / 2);
  const rnd = rng(seed + 11);
  const n = 7 + Math.floor(rnd() * 3);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (rnd() - 0.5) * 0.5;
    const rr = r * (0.82 + rnd() * 0.22);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.9]);
  }
  const height = r * 0.42;
  const poly = (dy) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + dy) : g.moveTo(x, y + dy))); g.closePath(); };

  // side walls (extrusion), darker towards the ground
  for (let dy = height; dy >= 0; dy -= 0.6) {
    const k = dy / height;
    g.fillStyle = `rgb(${Math.round(42 - 18 * k)},${Math.round(44 - 18 * k)},${Math.round(70 - 26 * k)})`;
    poly(dy);
    g.fill();
  }
  // strata lines on the walls
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 0.6;
  for (const f of [0.35, 0.7]) { poly(height * f); g.stroke(); }

  // top: facets around an off-centre apex
  const ax = -r * 0.12 + (rnd() - 0.5) * r * 0.1, ay = -r * 0.16;
  const light = -Math.PI * 0.75;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
    const mid = Math.atan2((y1 + y2) / 2 - ay, (x1 + x2) / 2 - ax);
    const k = 0.62 + 0.38 * Math.cos(mid - light) + (rnd() - 0.5) * 0.08;
    const base = [104, 112, 168];
    g.fillStyle = `rgb(${Math.round(base[0] * k)},${Math.round(base[1] * k)},${Math.round(base[2] * k + 12)})`;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fill();
    g.strokeStyle = `rgba(220,230,255,${0.08 + 0.2 * Math.max(0, Math.cos(mid - light))})`;
    g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(x1, y1); g.stroke();
  }
  // rim light on the edges facing the light, dark rim on the others
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
    const nrm = Math.atan2((y1 + y2) / 2, (x1 + x2) / 2);
    const lit = Math.cos(nrm - light);
    g.strokeStyle = lit > 0 ? `rgba(230,240,255,${0.25 + 0.5 * lit})` : `rgba(0,0,10,${0.3 - 0.3 * lit})`;
    g.lineWidth = lit > 0 ? 1.1 : 1.4;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  // a few speckles and a crack
  for (let i = 0; i < 18; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)';
    g.fillRect((rnd() - 0.5) * r * 1.3, (rnd() - 0.5) * r * 1.1, 0.8, 0.8);
  }
  g.strokeStyle = 'rgba(10,10,30,0.4)';
  g.lineWidth = 0.7;
  g.beginPath();
  let x = (rnd() - 0.5) * r * 0.6, y = -r * 0.5;
  g.moveTo(x, y);
  for (let i = 0; i < 4; i++) { x += (rnd() - 0.5) * r * 0.35; y += r * 0.22; g.lineTo(x, y); }
  g.stroke();
  // engraved rune socket (the glowing rune itself is drawn live)
  g.strokeStyle = 'rgba(10,10,40,0.55)';
  g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(ax, ay - r * 0.28); g.lineTo(ax + r * 0.22, ay); g.lineTo(ax, ay + r * 0.28); g.lineTo(ax - r * 0.22, ay); g.closePath(); g.stroke();
  return { cv, size, ax, ay, height };
}
