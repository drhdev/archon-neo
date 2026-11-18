/**
 * Archon NEO – "The Legend": the story intro.
 * A short illustrated chronicle (7 pages) that tells the story of the Balance
 * and introduces the board, every unit, the arena, the magic and how to win.
 * Rendered from i18n strings, so it follows the language switch.
 */

const SVG = {
  pp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 22 12 12 22 2 12Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7 17 12 12 17 7 12Z" fill="currentColor" opacity=".45"/></svg>',
  wipe: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21l3-3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  jail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 4v16M15 4v16" stroke="currentColor" stroke-width="2"/></svg>',
};

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

/**
 * @param {object} d dependencies from game.js:
 *   t, units, unitCanvas, palFor, renderBoard(canvas, cssPx), sound, onClose()
 */
export function initIntro(d) {
  const root = document.getElementById('intro');
  const stage = document.getElementById('intro-stage');
  const dots = document.getElementById('intro-dots');
  const prev = document.getElementById('intro-prev');
  const next = document.getElementById('intro-next');
  const skip = document.getElementById('intro-skip');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let index = 0;
  let pages = [];
  let built = '';

  const portrait = (type, pal, css, cls = '') => {
    const cv = el('canvas', `portrait ${cls}`);
    const px = Math.round(css * dpr);
    cv.width = cv.height = px;
    cv.style.width = cv.style.height = `${css}px`;
    cv.setAttribute('aria-hidden', 'true');
    cv.getContext('2d').drawImage(d.unitCanvas(type, pal, px), 0, 0, px, px);
    return cv;
  };

  const head = (page, n) => {
    page.append(el('p', 'kicker', d.t(`ch${n}.kicker`)));
    const h = el('h2', 'chapter-title', d.t(`ch${n}.title`));
    h.id = `ch${n}-title`;
    page.append(h);
    page.setAttribute('aria-labelledby', h.id);
  };
  const para = (page, key, cls = '') => page.append(el('p', `story ${cls}`, d.t(key)));

  const bar = (label, v, max, text) => {
    const row = el('div', 'stat');
    row.append(el('span', 'stat-l', label));
    const track = el('span', 'stat-bar');
    const fill = el('i');
    fill.style.setProperty('--w', `${Math.max(4, Math.min(100, (v / max) * 100))}%`);
    track.append(fill);
    row.append(track, el('span', 'stat-v', text));
    return row;
  };

  const unitCard = (type, side) => {
    const u = d.units[type];
    const card = el('article', `ucard ${side}`);
    const pic = el('div', 'ucard-pic');
    pic.append(portrait(type, d.palFor(type, side), 76));
    const body = el('div', 'ucard-body');
    body.append(el('h3', '', `${d.t(`unit.${type}.name`)} <small>${d.t(`unit.${type}.role`)}</small>`));
    body.append(el('p', 'lore', d.t(`unit.${type}.lore`)));
    const stats = el('div', 'stats');
    stats.append(bar(d.t('stat.life'), u.life, 17, String(u.life)));
    stats.append(bar(d.t('stat.str'), u.str || 0, 11, u.str ? String(u.str) : '–'));
    stats.append(bar(d.t('stat.spd'), u.spd, 125, String(Math.round(u.spd / 10))));
    if (u.move) stats.append(bar(d.t('stat.move'), u.move, 5, `${u.move} · ${d.t(`move.${u.mv}`)}`));
    body.append(stats);
    card.append(pic, body);
    return card;
  };

  function build() {
    stage.replaceChildren();
    dots.replaceChildren();
    pages = [];
    const page = (n) => {
      const p = el('section', `page page-${n}`);
      p.setAttribute('role', 'group');
      stage.append(p);
      pages.push(p);
      return p;
    };

    // Prologue – the two masters face each other
    let p = page(1);
    const duel = el('figure', 'duel');
    duel.append(portrait('wizard', 'light', 132, 'glow-light'), el('span', 'duel-sigil', '◇'), portrait('sorceress', 'dark', 132, 'glow-dark'));
    p.append(duel);
    head(p, 1);
    para(p, 'ch1.p1', 'lead'); para(p, 'ch1.p2'); para(p, 'ch1.p3', 'em');

    // Chapter I – the board
    p = page(2);
    head(p, 2);
    const bfig = el('figure', 'board-fig');
    const bc = el('canvas');
    bc.setAttribute('aria-hidden', 'true');
    bfig.append(bc);
    p.append(bfig);
    d.renderBoard(bc, 220);
    para(p, 'ch2.p1'); para(p, 'ch2.p2'); para(p, 'ch2.p3');

    // Chapters II + III – the armies
    for (const [n, side] of [[3, 'light'], [4, 'dark']]) {
      p = page(n);
      head(p, n);
      para(p, `ch${n}.p1`);
      const grid = el('div', 'ucards');
      for (const [type, u] of Object.entries(d.units)) if (u.side === side && !u.elemental) grid.append(unitCard(type, side));
      p.append(grid);
    }

    // Chapter IV – the arena
    p = page(5);
    head(p, 5);
    const arena = el('figure', 'arena-fig');
    arena.append(portrait('knight', 'light', 84, 'glow-light'), el('span', 'clash', 'VS'), portrait('goblin', 'dark', 84, 'glow-dark'));
    p.append(arena);
    para(p, 'ch5.p1'); para(p, 'ch5.p2');
    const ctl = el('div', 'controls-fig');
    ctl.append(
      el('div', 'ctl', `<span class="joy"><i></i></span><span>${d.t('ch5.move')}</span>`),
      el('div', 'ctl', `<span class="fire">✦</span><span>${d.t('ch5.attack')}</span>`),
    );
    p.append(ctl, el('p', 'keys-hint', d.t('ch5.keys')));
    para(p, 'ch5.p3');

    // Chapter V – magic
    p = page(6);
    head(p, 6);
    const masters = el('figure', 'duel small');
    masters.append(portrait('wizard', 'light', 72, 'glow-light'), el('span', 'duel-sigil', '✦'), portrait('sorceress', 'dark', 72, 'glow-dark'));
    p.append(masters);
    para(p, 'ch6.p1');
    const list = el('ul', 'spell-cards');
    for (const id of d.spells) list.append(el('li', '', `<b>✦ ${d.t(`spell.${id}.name`)}</b><span>${d.t(`spell.${id}.desc`)}</span>`));
    p.append(list);
    para(p, 'ch6.p2');
    const elems = el('div', 'elementals');
    for (const type of ['air', 'earth', 'fire', 'water']) {
      const e = el('div', 'elemental');
      e.append(portrait(type, d.palFor(type, 'light'), 64), el('b', '', d.t(`unit.${type}.name`)), el('small', '', d.t(`unit.${type}.lore`)));
      elems.append(e);
    }
    p.append(elems);

    // Epilogue – victory
    p = page(7);
    head(p, 7);
    para(p, 'ch7.p1');
    const v = el('ul', 'victory');
    v.append(el('li', '', `${SVG.pp}<span>${d.t('ch7.v1')}</span>`), el('li', '', `${SVG.wipe}<span>${d.t('ch7.v2')}</span>`), el('li', '', `${SVG.jail}<span>${d.t('ch7.v3')}</span>`));
    p.append(v);
    const sides = el('figure', 'sides');
    const L = el('div', 'side light'), D = el('div', 'side dark');
    for (const type of ['knight', 'unicorn', 'golem']) L.append(portrait(type, 'light', 54));
    for (const type of ['goblin', 'dragon', 'troll']) D.append(portrait(type, 'dark', 54));
    sides.append(L, D);
    p.append(sides);
    para(p, 'ch7.p2', 'em center');

    pages.forEach((_, i) => {
      const b = el('button', 'dot');
      b.type = 'button';
      b.setAttribute('aria-label', `${i + 1} / ${pages.length}`);
      b.addEventListener('click', () => go(i));
      dots.append(b);
    });
    built = document.documentElement.lang;
  }

  function go(i, silent = false) {
    i = Math.max(0, Math.min(pages.length - 1, i));
    const dir = i >= index ? 1 : -1;
    index = i;
    pages.forEach((pg, k) => {
      pg.classList.toggle('active', k === i);
      pg.classList.toggle('back', k === i && dir < 0);
      pg.hidden = k !== i;
    });
    [...dots.children].forEach((b, k) => b.classList.toggle('on', k === i));
    stage.scrollTop = 0;
    prev.disabled = i === 0;
    const last = i === pages.length - 1;
    next.textContent = d.t(last ? 'intro.start' : 'intro.next');
    next.classList.toggle('final', last);
    if (!silent) d.sound.play('page');
  }

  function open(start = 0) {
    if (built !== document.documentElement.lang || !pages.length) build();
    root.classList.remove('hidden');
    index = start;
    go(start, true);
    try { next.focus({ preventScroll: true }); } catch { /* ignore */ }
  }
  function close() {
    if (root.classList.contains('hidden')) return;
    root.classList.add('hidden');
    d.onClose();
  }
  const isOpen = () => !root.classList.contains('hidden');

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => { if (index >= pages.length - 1) { d.sound.play('select'); close(); } else go(index + 1); });
  skip.addEventListener('click', () => { d.sound.play('tap'); close(); });

  // swipe left/right between pages (vertical scrolling stays native)
  let sx = null, sy = 0;
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => { sx = null; });

  window.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (index > 0) go(index - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  return { open, close, isOpen, invalidate: () => { built = ''; } };
}
