/**
 * Archon NEO – Light vs. Dark
 * A modern, non-commercial fan tribute to "Archon: The Light and the Dark" (1983).
 * Plain HTML5 canvas + vanilla JavaScript modules, no build step, no third-party requests.
 *
 * Sections: setup · audio · units · board · state · persistence · turn flow · input ·
 *           spells · board AI · arena · rendering · resilience · UI wiring · boot
 */
import { t, setLang, getLang, detectLang, applyStatic } from './i18n.js';
import { drawUnit, unitCanvas } from './art.js';
import { Sound } from './audio.js';
import { initIntro } from './intro.js';
import { makeFloor, makeRock } from './arena-art.js';

export const APP_VERSION = '1.1.0';

// ============================================================ setup & helpers
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });
const TAU = Math.PI * 2;
const OCT = Math.PI / 4;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const rand = (a, b) => a + Math.random() * (b - a);
const other = (s) => (s === 'light' ? 'dark' : 'light');
const FONT = '600 {px}px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
const font = (px) => FONT.replace('{px}', px);
const quant8 = (x, y) => { const a = Math.round(Math.atan2(y, x) / OCT) * OCT; return { x: Math.cos(a), y: Math.sin(a) }; };

const UA = navigator.userAgent;
const IS_IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

let W = 0, H = 0, DPR = 1;
const safe = { t: 0, b: 0, l: 0, r: 0 };

/** localStorage wrapper – private mode, quota or disabled storage must never break the game. */
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } },
  del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};
const SETTINGS_KEY = 'archon-neo:settings:v1';
const SAVE_KEY = 'archon-neo:save:v1';
const settings = Object.assign({ lang: null, difficulty: 'normal', sound: true, music: true, introSeen: false }, store.get(SETTINGS_KEY, {}));
if (!['easy', 'normal', 'hard'].includes(settings.difficulty)) settings.difficulty = 'normal';
const saveSettings = () => store.set(SETTINGS_KEY, settings);

// --- block scrolling, rubber-banding and zoom (iOS Safari & Android Chrome)
const inScrollable = (el) => el && el.closest && el.closest('.scroll');
document.addEventListener('touchmove', (e) => { if (!inScrollable(e.target)) e.preventDefault(); }, { passive: false });
['gesturestart', 'gesturechange', 'gestureend'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault(), { passive: false }));
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e) => { if (!e.target.closest('a')) e.preventDefault(); });
window.addEventListener('scroll', () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); });

function readSafeArea() {
  const cs = getComputedStyle($('safe-probe'));
  safe.t = parseFloat(cs.paddingTop) || 0;
  safe.r = parseFloat(cs.paddingRight) || 0;
  safe.b = parseFloat(cs.paddingBottom) || 0;
  safe.l = parseFloat(cs.paddingLeft) || 0;
}
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = Math.max(1, window.innerWidth);
  H = Math.max(1, window.innerHeight);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  readSafeArea();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
document.addEventListener('fullscreenchange', () => setTimeout(resize, 100));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

/** Android: real full screen + portrait lock (not available on iPhone – silently skipped). */
function enterFullscreen() {
  if (IS_IOS || !IS_TOUCH) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req || document.fullscreenElement || document.webkitFullscreenElement) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    const lock = () => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {}); };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  } catch { /* unsupported */ }
}

/** Keep the screen awake while a game is running (Android Chrome, iOS 16.4+). */
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { wakeLock = null; }
}

const vibrate = (p) => { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) { try { navigator.vibrate(p); } catch { /* ignore */ } } };

// ============================================================ audio (see audio.js)
Sound.sfxOn = settings.sound;
Sound.musicOn = settings.music;
// iOS unlocks on touchend, Chrome on pointerup/click (not pointerdown).
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((n) => document.addEventListener(n, () => Sound.unlock(), true));
/** Stereo position of an arena x coordinate (-1 … 1). */
const panOf = (x) => (G.combat ? clamp((x / G.combat.w) * 2 - 1, -1, 1) * 0.7 : 0);

// ============================================================ units (values after the original)
// Original stats: lifespan (life) and attack strength (str). Here: HP = life × 12, damage = str × 4.
const LIFE = 12, STR = 4;
const UNITS = {
  knight:   { side: 'light', life: 5, str: 5, move: 3, mv: 'ground', spd: 95, r: 11, atk: { kind: 'melee', cd: 0.55, reach: 22 } },
  archer:   { side: 'light', life: 5, str: 5, move: 3, mv: 'ground', spd: 90, r: 10, atk: { kind: 'shot', fx: 'arrow', speed: 230, range: 260, cd: 1.0, size: 3, color: '#fff3b0' } },
  valkyrie: { side: 'light', life: 8, str: 7, move: 3, mv: 'fly', spd: 105, r: 11, fly: true, atk: { kind: 'shot', fx: 'spear', speed: 240, range: 260, cd: 1.1, size: 4, color: '#bff8ff' } },
  golem:    { side: 'light', life: 15, str: 10, move: 3, mv: 'ground', spd: 55, r: 15, atk: { kind: 'shot', fx: 'boulder', speed: 140, range: 300, cd: 1.9, size: 9, color: '#c9b48a' } },
  unicorn:  { side: 'light', life: 9, str: 7, move: 4, mv: 'ground', spd: 125, r: 12, atk: { kind: 'shot', fx: 'bolt', speed: 330, range: 300, cd: 0.8, size: 4, color: '#ffffff' } },
  djinni:   { side: 'light', life: 15, str: 6, move: 4, mv: 'fly', spd: 85, r: 13, fly: true, atk: { kind: 'shot', fx: 'whirl', speed: 120, range: 240, cd: 1.6, size: 10, color: '#8ffcff' } },
  phoenix:  { side: 'light', life: 12, str: 2, move: 5, mv: 'fly', spd: 115, r: 12, fly: true, atk: { kind: 'aura', radius: 58, dur: 1.0, cd: 2.2, dps: 45, invuln: true, color: '#ff9a2e' } },
  wizard:   { side: 'light', life: 10, str: 10, move: 3, mv: 'teleport', spd: 95, r: 11, fly: true, mage: true, atk: { kind: 'shot', fx: 'fireball', speed: 260, range: 280, cd: 1.2, size: 6, color: '#ffd36b' } },
  goblin:   { side: 'dark', life: 5, str: 5, move: 3, mv: 'ground', spd: 95, r: 11, atk: { kind: 'melee', cd: 0.55, reach: 22 } },
  manticore:{ side: 'dark', life: 8, str: 4, move: 3, mv: 'ground', spd: 90, r: 12, atk: { kind: 'shot', fx: 'spikes', speed: 220, range: 230, cd: 1.0, size: 3, color: '#ffcf6b' } },
  banshee:  { side: 'dark', life: 8, str: 1, move: 3, mv: 'fly', spd: 110, r: 11, fly: true, atk: { kind: 'aura', radius: 54, dur: 0.9, cd: 1.6, dps: 34, invuln: false, color: '#ff8de0' } },
  troll:    { side: 'dark', life: 14, str: 10, move: 3, mv: 'ground', spd: 55, r: 15, atk: { kind: 'shot', fx: 'boulder', speed: 140, range: 300, cd: 1.9, size: 9, color: '#a89c7a' } },
  basilisk: { side: 'dark', life: 6, str: 9, move: 3, mv: 'ground', spd: 110, r: 10, atk: { kind: 'shot', fx: 'beam', speed: 380, range: 320, cd: 1.0, size: 3, color: '#7dff8a' } },
  dragon:   { side: 'dark', life: 17, str: 11, move: 4, mv: 'fly', spd: 85, r: 14, fly: true, atk: { kind: 'shot', fx: 'fire', speed: 260, range: 150, cd: 1.0, size: 7, color: '#ff7a2f' } },
  shapeshifter: { side: 'dark', life: 10, str: 0, move: 5, mv: 'fly', spd: 100, r: 12, fly: true, atk: { kind: 'copy' } },
  sorceress:{ side: 'dark', life: 10, str: 8, move: 3, mv: 'teleport', spd: 95, r: 11, fly: true, mage: true, atk: { kind: 'shot', fx: 'lightning', speed: 330, range: 280, cd: 1.2, size: 4, color: '#e07dff' } },
  air:   { elemental: true, pal: 'air', life: 12, str: 5, spd: 120, r: 12, atk: { kind: 'shot', fx: 'whirl', speed: 150, range: 260, cd: 1.2, size: 9, color: '#e0ffff' } },
  earth: { elemental: true, pal: 'earth', life: 17, str: 9, spd: 60, r: 15, atk: { kind: 'shot', fx: 'boulder', speed: 140, range: 300, cd: 1.8, size: 9, color: '#b08a5a' } },
  fire:  { elemental: true, pal: 'fire', life: 10, str: 9, spd: 105, r: 12, atk: { kind: 'shot', fx: 'fire', speed: 240, range: 180, cd: 1.0, size: 7, color: '#ff7a2f' } },
  water: { elemental: true, pal: 'water', life: 14, str: 6, spd: 90, r: 13, atk: { kind: 'shot', fx: 'ice', speed: 220, range: 260, cd: 1.2, size: 6, color: '#7fd0ff' } },
};
const ELEMENTALS = ['air', 'earth', 'fire', 'water'];
const uname = (type) => t(`unit.${type}.name`);
const urole = (type) => t(`unit.${type}.role`);
const sideName = (s) => t(`side.${s}`);

function dpsOf(u) {
  const a = u.atk;
  if (a.kind === 'aura') return ((a.dps * a.dur) / (a.cd + a.dur)) * (a.invuln ? 1.6 : 1.2);
  if (a.kind === 'copy') return 0;
  return (a.dmg / a.cd) * (a.kind === 'melee' ? 0.7 : 1);
}
for (const u of Object.values(UNITS)) { u.hp = u.life * LIFE; u.atk.dmg = u.str * STR; }
for (const u of Object.values(UNITS)) u.value = (Math.sqrt(u.hp * (u.atk.kind === 'copy' ? 30 : dpsOf(u))) / 4) * (u.mage ? 1.6 : 1);
const palFor = (type, side) => UNITS[type].pal || side;

// Original line-up (Light at the bottom, Darkness at the top).
const BACK_ROW = {
  light: ['valkyrie', 'golem', 'unicorn', 'djinni', 'wizard', 'phoenix', 'unicorn', 'golem', 'valkyrie'],
  dark: ['banshee', 'troll', 'basilisk', 'shapeshifter', 'sorceress', 'dragon', 'basilisk', 'troll', 'banshee'],
};
const FRONT_ROW = {
  light: ['archer', 'knight', 'knight', 'knight', 'knight', 'knight', 'knight', 'knight', 'archer'],
  dark: ['manticore', 'goblin', 'goblin', 'goblin', 'goblin', 'goblin', 'goblin', 'goblin', 'manticore'],
};

/** AI tuning per difficulty level (board strategy + arena reflexes). */
const DIFFICULTY = {
  easy:   { noise: 16, danger: 0.5, spells: ['heal', 'revive', 'shift'], react: 0.45, cd: 1.4, lead: 0.2, dodge: 0.35, align: 1.3, think: [0.35, 0.7], delay: 800 },
  normal: { noise: 4, danger: 1.6, spells: null, react: 0.75, cd: 1.1, lead: 0.7, dodge: 1.0, align: 0.9, think: [0.2, 0.45], delay: 650 },
  hard:   { noise: 1, danger: 2.3, spells: null, react: 0.93, cd: 1.0, lead: 1.0, dodge: 1.5, align: 0.7, think: [0.12, 0.28], delay: 500 },
};
const diff = () => DIFFICULTY[G.difficulty] || DIFFICULTY.normal;

// ============================================================ board
const N = 9;
const POWER_POINTS = [[0, 4], [4, 0], [4, 4], [4, 8], [8, 4]];
const isPP = (r, c) => POWER_POINTS.some(([pr, pc]) => pr === r && pc === c);
function cellType(r, c) {
  if (r === 0 && c === 4) return 'D';
  if (r === 8 && c === 4) return 'L';
  if (r === 4) return 'C';
  if ((r === 3 || r === 5) && (r + c) % 2 === 1) return 'C';
  if ((r === 2 || r === 6) && c === 4) return 'C';
  return (r + c) % 2 === 0 ? 'L' : 'D';
}
const CELL_TYPES = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (__, c) => cellType(r, c)));
function lightness(r, c) {
  const k = CELL_TYPES[r][c];
  if (k === 'L') return 1;
  if (k === 'D') return 0;
  return G.lum / 5;
}
const sideFactor = (side, r, c) => (side === 'light' ? lightness(r, c) : 1 - lightness(r, c));
// Original: up to +7 lifespan on your own colour.
const bonusHp = (side, r, c) => Math.round(7 * LIFE * sideFactor(side, r, c));
const DARK_RGB = [24, 18, 50];
const LIGHT_RGB = [222, 212, 176];
const mixRGB = (k) => DARK_RGB.map((d, i) => d + (LIGHT_RGB[i] - d) * k);
function mixColor(k, dim = 1) {
  return `rgb(${(lerp(DARK_RGB[0], LIGHT_RGB[0], k) * dim) | 0},${(lerp(DARK_RGB[1], LIGHT_RGB[1], k) * dim) | 0},${(lerp(DARK_RGB[2], LIGHT_RGB[2], k) * dim) | 0})`;
}

// ============================================================ game state
const G = {
  mode: 'menu', // menu | board | combat
  vs: 'ai', human: 'light', difficulty: settings.difficulty, gameId: 0,
  pieces: [], dead: { light: [], dark: [] },
  turn: 'light', lum: 2, lumDir: 1, round: 1,
  spellsUsed: { light: {}, dark: {} },
  selected: null, moves: [], inspect: null, spell: null, targets: [],
  anim: null, drag: null, busy: false, over: false, paused: false,
  combat: null, fx: [], time: 0, lastAction: Date.now(), cursor: null,
};
const touch = () => { G.lastAction = Date.now(); };
const pieceAt = (r, c) => G.pieces.find((p) => p.alive && p.r === r && p.c === c) || null;
const alivePieces = (side) => G.pieces.filter((p) => p.alive && p.side === side);
const isHuman = (side) => G.vs === 'pvp' || side === G.human;
const isHumanTurn = () => isHuman(G.turn);
const findMage = (side) => G.pieces.find((p) => p.alive && p.side === side && UNITS[p.type].mage) || null;
let nextId = 0;

function setupPieces() {
  G.pieces = [];
  nextId = 0;
  const place = (type, side, r, c) => G.pieces.push({ id: nextId++, type, side, r, c, hp: UNITS[type].hp, alive: true, jailed: false });
  for (let c = 0; c < N; c++) {
    place(BACK_ROW.light[c], 'light', 8, c);
    place(FRONT_ROW.light[c], 'light', 7, c);
    place(BACK_ROW.dark[c], 'dark', 0, c);
    place(FRONT_ROW.dark[c], 'dark', 1, c);
  }
}

/** setTimeout that silently expires when a new game starts. */
function later(ms, fn) {
  const id = G.gameId;
  setTimeout(() => {
    if (id !== G.gameId) return;
    try { fn(); } catch (err) { reportError(err); }
  }, ms);
}

// ============================================================ persistence (auto-save / continue)
function saveGame() {
  if (G.over || G.mode === 'menu') return;
  store.set(SAVE_KEY, {
    v: 1, app: APP_VERSION, vs: G.vs, human: G.human, difficulty: G.difficulty,
    turn: G.turn, lum: G.lum, lumDir: G.lumDir, round: G.round,
    spellsUsed: G.spellsUsed, dead: G.dead,
    pieces: G.pieces.filter((p) => p.alive).map(({ type, side, r, c, hp, jailed }) => ({ type, side, r, c, hp, jailed })),
  });
}
const clearSave = () => store.del(SAVE_KEY);

/** Loads and validates a save; corrupt or foreign data is discarded instead of crashing. */
function loadSave() {
  const s = store.get(SAVE_KEY, null);
  try {
    if (!s || s.v !== 1 || !Array.isArray(s.pieces)) return null;
    const sides = ['light', 'dark'];
    if (!['ai', 'pvp'].includes(s.vs) || !sides.includes(s.human) || !sides.includes(s.turn)) return null;
    if (!Number.isInteger(s.lum) || s.lum < 0 || s.lum > 5 || ![1, -1].includes(s.lumDir)) return null;
    const occupied = new Set();
    for (const p of s.pieces) {
      const u = UNITS[p.type];
      if (!u || u.elemental || u.side !== p.side) return null;
      if (!Number.isInteger(p.r) || !Number.isInteger(p.c) || p.r < 0 || p.c < 0 || p.r >= N || p.c >= N) return null;
      const key = p.r * N + p.c;
      if (occupied.has(key)) return null;
      occupied.add(key);
      if (!(p.hp > 0)) return null;
      p.hp = Math.min(p.hp, u.hp);
    }
    for (const side of sides) {
      if (!Array.isArray(s.dead?.[side]) || s.dead[side].some((tp) => !UNITS[tp])) return null;
      if (typeof s.spellsUsed?.[side] !== 'object') return null;
    }
    return s;
  } catch { return null; }
}

// ============================================================ moves
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [...DIRS4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
/** Ground units: orthogonal and blocked. Flyers & spellcasters: any direction, over pieces. */
function computeMoves(p) {
  const res = [];
  if (!p || p.jailed) return res;
  const u = UNITS[p.type];
  const seen = new Set([p.r * N + p.c]);
  let frontier = [[p.r, p.c]];
  const dirs = u.fly ? DIRS8 : DIRS4;
  for (let step = 0; step < u.move; step++) {
    const next = [];
    for (const [r, c] of frontier) {
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= N || nc >= N) continue;
        const k = nr * N + nc;
        if (seen.has(k)) continue;
        seen.add(k);
        const q = pieceAt(nr, nc);
        if (!q) { res.push({ r: nr, c: nc, attack: false }); next.push([nr, nc]); }
        else {
          if (q.side !== p.side) res.push({ r: nr, c: nc, attack: true });
          if (u.fly) next.push([nr, nc]);
        }
      }
    }
    frontier = next;
  }
  return res;
}

function boardLayout() {
  const top = $('hud-top');
  const bot = $('hud-bottom');
  const topY = top.classList.contains('hidden') ? safe.t + 56 : top.getBoundingClientRect().bottom;
  const botY = bot.classList.contains('hidden') ? H - safe.b - 96 : bot.getBoundingClientRect().top;
  const availW = W - safe.l - safe.r - 20;
  const availH = botY - topY - 14;
  const cs = Math.max(8, Math.floor(Math.min(availW, availH, 720) / N));
  const size = cs * N;
  return { x: Math.round(safe.l + 10 + (availW - size) / 2), y: Math.round(topY + 7 + (availH - size) / 2), cs, size };
}
function cellAt(x, y) {
  const L = boardLayout();
  const c = Math.floor((x - L.x) / L.cs);
  const r = Math.floor((y - L.y) / L.cs);
  if (r < 0 || c < 0 || r >= N || c >= N) return null;
  return { r, c };
}

// ============================================================ HUD
const fmtLife = (hp) => { const v = hp / LIFE; return Number.isInteger(v) ? String(v) : v.toFixed(1); };
function setInfo(html, pct) {
  const info = $('info');
  info.innerHTML = html;
  if (pct != null) { const bar = info.querySelector('.hpbar > span'); if (bar) bar.style.width = `${pct}%`; }
}
function updateHud() {
  const tl = $('turn-label');
  const sn = sideName(G.turn);
  tl.textContent = G.vs === 'ai' ? t(isHumanTurn() ? 'turn.yours' : 'turn.ai', { side: sn }) : t('turn.pvp', { side: sn });
  tl.className = G.turn;
  const segs = $('lum-bar').children;
  for (let i = 0; i < segs.length; i++) segs[i].classList.toggle('on', i <= G.lum);
  $('lum').classList.toggle('down', G.lumDir < 0);

  const sb = $('btn-spell');
  sb.classList.add('hidden');
  sb.classList.remove('cancel');
  if (G.spell) {
    setInfo(`<b class="${G.turn}">✦ ${t(`spell.${G.spell.id}.name`)}</b><br>${spellHint()}`);
    sb.classList.remove('hidden');
    sb.classList.add('cancel');
    sb.innerHTML = `✕<br>${t('hud.back')}`;
    return;
  }
  const p = G.selected || G.inspect;
  if (p && p.alive) {
    const u = UNITS[p.type];
    const extra = [];
    if (isPP(p.r, p.c)) extra.push(t('info.pp'));
    if (p.jailed) extra.push(t('info.jailed'));
    const strength = u.str ? ` · ${t('info.strength', { n: u.str })}` : '';
    setInfo(
      `<b class="${p.side}">${uname(p.type)}</b> <span class="muted">· ${urole(p.type)}</span><br>` +
      `${t('info.life', { a: fmtLife(p.hp), b: u.life })}<span class="hpbar"><span></span></span>` +
      `<span class="muted">${t('info.square', { n: fmtLife(bonusHp(p.side, p.r, p.c)) })}</span><br>` +
      `<span class="muted">${t(`move.${u.mv}`)} ${u.move}${strength}${extra.length ? ' · ' + extra.join(', ') : ''}</span>`,
      Math.round((p.hp / u.hp) * 100),
    );
    if (G.selected && u.mage && isHumanTurn() && !G.over && availableSpells(p.side).length) {
      sb.classList.remove('hidden');
      sb.innerHTML = `✦<br>${t('hud.spell')}`;
    }
    return;
  }
  if (G.over) { setInfo(`<span class="muted">${t('info.over')}</span>`); return; }
  if (!isHumanTurn()) { setInfo(`<b class="${G.turn}">${sn}</b><br><span class="muted">${t('info.thinking')}</span>`); return; }
  const left = SPELLS.length - Object.keys(G.spellsUsed[G.turn]).length;
  setInfo(
    `<b class="${G.turn}">${sn}</b> <span class="muted">· ${t('info.round', { n: G.round })}</span><br>${t('info.idle')}<br>` +
    `<span class="muted">${t('info.spellsLeft', { n: left })} · ${t(G.lumDir > 0 ? 'info.cycleUp' : 'info.cycleDown')}</span>`,
  );
}

let toastTimer = 0;
function toast(msg, ms = 1700) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
const show = (id) => $(id).classList.remove('hidden');
const hide = (id) => $(id).classList.add('hidden');
const setBoardHud = (on) => { ['hud-top', 'hud-bottom'].forEach(on ? show : hide); };

// ============================================================ turn flow
function resetState() {
  G.gameId++;
  G.selected = null; G.moves = []; G.inspect = null; G.spell = null; G.targets = [];
  G.anim = null; G.drag = null; G.busy = false; G.over = false; G.paused = false;
  G.combat = null; G.fx = [];
  touch();
}
function enterGame() {
  G.mode = 'board';
  ['menu', 'gameover', 'pause', 'spells', 'rules', 'splash'].forEach(hide);
  if (intro.isOpen()) $('intro').classList.add('hidden');
  Sound.setTrack('board');
  setBoardHud(true);
  updateHud();
  keepAwake(true);
  try { history.pushState({ archon: 1 }, ''); } catch { /* ignore */ }
}

function newGame(vs, human) {
  resetState();
  G.vs = vs; G.human = human; G.difficulty = settings.difficulty;
  setupPieces();
  G.dead = { light: [], dark: [] };
  G.turn = 'light'; G.lum = 2; G.lumDir = 1; G.round = 1;
  G.spellsUsed = { light: {}, dark: {} };
  enterGame();
  toast(vs === 'pvp' ? t('toast.lightStarts') : t(human === 'light' ? 'toast.youLight' : 'toast.youDark'));
  Sound.play('turn', 0, 'light');
  saveGame();
  maybeAI();
}

function continueGame() {
  const s = loadSave();
  if (!s) { clearSave(); refreshMenu(); return; }
  resetState();
  G.vs = s.vs; G.human = s.human; G.difficulty = DIFFICULTY[s.difficulty] ? s.difficulty : 'normal';
  G.turn = s.turn; G.lum = s.lum; G.lumDir = s.lumDir; G.round = Math.max(1, s.round | 0);
  G.spellsUsed = { light: { ...s.spellsUsed.light }, dark: { ...s.spellsUsed.dark } };
  G.dead = { light: [...s.dead.light], dark: [...s.dead.dark] };
  nextId = 0;
  G.pieces = s.pieces.map((p) => ({ id: nextId++, type: p.type, side: p.side, r: p.r, c: p.c, hp: p.hp, alive: true, jailed: !!p.jailed }));
  enterGame();
  toast(t('toast.restored'));
  if (!checkVictory()) maybeAI();
}

const deselect = () => { G.selected = null; G.moves = []; G.inspect = null; };
function select(p) {
  G.selected = p; G.inspect = null;
  G.moves = computeMoves(p);
  Sound.play('select');
  if (p.jailed) toast(t('toast.jailed'));
  updateHud();
}

function doMove(p, r, c) {
  touch();
  const target = pieceAt(r, c);
  G.busy = true;
  G.moves = [];
  const dist = Math.max(Math.abs(r - p.r), Math.abs(c - p.c));
  const u = UNITS[p.type];
  G.anim = {
    piece: p, fr: p.r, fc: p.c, tr: r, tc: c, t: 0, dur: Math.min(0.75, 0.14 + dist * 0.1), steps: 0, dist,
    done: () => {
      G.anim = null;
      if (target && target.side !== p.side) startCombat(p, target, r, c);
      else {
        p.r = r; p.c = c; G.busy = false;
        if (isPP(r, c)) { Sound.play('power'); spawnBoardFx(r, c, '#5ff7e6', 14); }
        endTurn();
      }
    },
  };
  // one footstep per square, like the original (flyers swoosh, spellcasters shimmer)
  Sound.play(u.mv === 'ground' ? 'step' : u.mv === 'fly' ? 'fly' : 'select', 0, p.side);
}

/** Imprisonment ends when the cycle reaches the prisoner's colour (original rule). */
function releaseJailed() {
  for (const p of G.pieces) {
    if (!p.alive || !p.jailed) continue;
    if ((p.side === 'light' && G.lum === 5) || (p.side === 'dark' && G.lum === 0)) {
      p.jailed = false;
      spawnBoardFx(p.r, p.c, '#7fb8ff', 16);
      toast(t('toast.freed', { unit: uname(p.type) }));
    }
  }
}
function advanceLum() {
  G.lum += G.lumDir;
  if (G.lum >= 5) { G.lum = 5; G.lumDir = -1; }
  if (G.lum <= 0) { G.lum = 0; G.lumDir = 1; }
  releaseJailed();
}
/** Wounded pieces heal slowly – much faster on a power point. */
function healRound() {
  for (const p of G.pieces) {
    if (!p.alive) continue;
    const max = UNITS[p.type].hp;
    if (p.hp >= max) continue;
    const pp = isPP(p.r, p.c);
    p.hp = Math.min(max, p.hp + (pp ? Math.ceil(max * 0.25) : Math.ceil(LIFE * 0.5)));
    if (pp) spawnBoardFx(p.r, p.c, '#5ff7e6', 10);
  }
}

function checkVictory() {
  const L = alivePieces('light'), D = alivePieces('dark');
  if (!L.length && !D.length) return gameOver(null, 'reason.both');
  if (!D.length) return gameOver('light', 'reason.wipe');
  if (!L.length) return gameOver('dark', 'reason.wipe');
  for (const s of ['light', 'dark']) {
    if (POWER_POINTS.every(([r, c]) => { const q = pieceAt(r, c); return q && q.side === s; })) return gameOver(s, 'reason.pp');
  }
  if (L.every((p) => p.jailed)) return gameOver('dark', 'reason.jailedLight');
  if (D.every((p) => p.jailed)) return gameOver('light', 'reason.jailedDark');
  return false;
}
const hasAnyAction = (side) => alivePieces(side).some((p) => computeMoves(p).length > 0) || availableSpells(side).length > 0;

function endTurn(skipCount = 0) {
  touch();
  deselect();
  G.spell = null; G.targets = [];
  if (checkVictory()) return;
  G.turn = other(G.turn);
  if (G.turn === 'light') {
    G.round++;
    advanceLum();
    healRound();
    if (checkVictory()) return;
  }
  if (!hasAnyAction(G.turn)) {
    if (skipCount >= 2) { gameOver(null, 'reason.stuck'); return; }
    toast(t('toast.cannotMove', { side: sideName(G.turn) }));
    endTurn(skipCount + 1);
    return;
  }
  saveGame();
  updateHud();
  if (G.vs === 'pvp') toast(t('toast.toMove', { side: sideName(G.turn) }), 1100);
  Sound.play('turn', 0, G.turn);
  maybeAI();
}

function gameOver(winner, reasonKey) {
  G.over = true;
  G.busy = true;
  deselect();
  clearSave();
  updateHud();
  keepAwake(false);
  Sound.setTrack(null);
  later(700, () => {
    $('go-title').textContent = winner ? t(`win.${winner}`) : t('win.draw');
    $('go-title').className = `title small ${winner || ''}`;
    $('go-reason').textContent = t(reasonKey);
    $('go-stats').textContent = t('go.stats', { r: G.round, l: alivePieces('light').length, d: alivePieces('dark').length });
    show('gameover');
    if (G.vs === 'ai' && winner && winner !== G.human) Sound.play('lose'); else Sound.play('win');
  });
  return true;
}

// ============================================================ board input (tap & swipe)
function boardDown(x, y) {
  if (G.mode !== 'board' || G.busy || G.over || G.paused || !isHumanTurn()) return;
  const cell = cellAt(x, y);
  if (!cell) { deselect(); updateHud(); return; }
  if (G.spell) { spellTap(cell); return; }
  const p = pieceAt(cell.r, cell.c);
  if (G.selected) {
    const mv = G.moves.find((m) => m.r === cell.r && m.c === cell.c);
    if (mv) { doMove(G.selected, cell.r, cell.c); return; }
  }
  if (p && p.side === G.turn) {
    if (G.selected !== p) select(p);
    G.drag = { piece: p, x, y, sx: x, sy: y, moved: false };
    return;
  }
  if (p) { G.selected = null; G.moves = []; G.inspect = p; Sound.play('select'); updateHud(); return; }
  if (G.selected) Sound.play('invalid');
  deselect();
  updateHud();
}
function boardMove(x, y) {
  if (!G.drag) return;
  G.drag.x = x; G.drag.y = y;
  if (Math.hypot(x - G.drag.sx, y - G.drag.sy) > 10) G.drag.moved = true;
}
function boardUp(x, y) {
  const d = G.drag;
  G.drag = null;
  if (!d || !d.moved || G.busy || G.selected !== d.piece) return;
  const cell = cellAt(x, y);
  if (!cell || (cell.r === d.piece.r && cell.c === d.piece.c)) return;
  if (G.moves.some((m) => m.r === cell.r && m.c === cell.c)) doMove(d.piece, cell.r, cell.c);
  else Sound.play('invalid');
}

// ============================================================ spells (the 7 originals)
const SPELLS = ['teleport', 'heal', 'shift', 'exchange', 'summon', 'revive', 'imprison'];
const notPP = (p) => !isPP(p.r, p.c); // pieces on power points are immune to spells
function emptyNeighbors(p) {
  const res = [];
  for (const [dr, dc] of DIRS8) {
    const r = p.r + dr, c = p.c + dc;
    if (r >= 0 && c >= 0 && r < N && c < N && !pieceAt(r, c)) res.push({ r, c });
  }
  return res;
}
const canJail = (p) => !p.jailed && notPP(p) && !((p.side === 'light' && G.lum === 5) || (p.side === 'dark' && G.lum === 0));
function spellTargets(side, id) {
  const own = alivePieces(side).filter(notPP);
  const foes = alivePieces(other(side)).filter(notPP);
  switch (id) {
    case 'teleport': return own;
    case 'heal': return own.filter((p) => p.hp < UNITS[p.type].hp);
    case 'shift': return [true];
    case 'exchange': { const all = own.concat(foes); return all.length >= 2 ? all : []; }
    case 'summon': return foes;
    case 'revive': { const m = findMage(side); return m && G.dead[side].length ? emptyNeighbors(m) : []; }
    case 'imprison': return foes.filter(canJail);
    default: return [];
  }
}
function availableSpells(side) {
  const mage = findMage(side);
  if (!mage || mage.jailed) return [];
  return SPELLS.filter((id) => !G.spellsUsed[side][id] && spellTargets(side, id).length > 0);
}
function spellHint() {
  const s = G.spell;
  if (!s) return '';
  switch (s.id) {
    case 'heal': return t('hint.heal');
    case 'teleport': return t(s.piece ? 'hint.teleport2' : 'hint.teleport1');
    case 'exchange': return t(s.piece ? 'hint.exchange2' : 'hint.exchange1');
    case 'summon': return t('hint.summon');
    case 'revive': return t('hint.revive', { unit: uname(s.type) });
    case 'imprison': return t('hint.imprison');
    default: return '';
  }
}
function spellButton(title, desc, disabled, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'spell';
  b.disabled = disabled;
  const strong = document.createElement('strong');
  strong.textContent = title;
  const span = document.createElement('span');
  span.textContent = desc;
  b.append(strong, span);
  b.addEventListener('click', onClick);
  return b;
}
function openSpellbook() {
  const side = G.turn;
  const list = $('spell-list');
  $('spell-title').textContent = t('spells.title');
  list.replaceChildren();
  const avail = availableSpells(side);
  for (const id of SPELLS) {
    const used = !!G.spellsUsed[side][id];
    list.appendChild(spellButton(t(`spell.${id}.name`) + (used ? t('spells.used') : ''), t(`spell.${id}.desc`), !avail.includes(id),
      () => { hide('spells'); beginSpell(id); }));
  }
  show('spells');
  Sound.play('select');
}
function openReviveList() {
  const side = G.turn;
  const list = $('spell-list');
  $('spell-title').textContent = t('spells.revive');
  list.replaceChildren();
  for (const type of [...new Set(G.dead[side])]) {
    list.appendChild(spellButton(uname(type), `${urole(type)} · ${t('rules.life', { n: UNITS[type].life })}`, false, () => {
      hide('spells');
      G.spell = { id: 'revive', type };
      G.targets = emptyNeighbors(findMage(side));
      updateHud();
    }));
  }
  show('spells');
}
function beginSpell(id) {
  const side = G.turn;
  G.selected = null; G.moves = [];
  if (id === 'shift') { castShift(side); return; }
  if (id === 'revive') { openReviveList(); return; }
  G.spell = { id };
  G.targets = spellTargets(side, id).map((p) => ({ r: p.r, c: p.c }));
  Sound.play('select');
  updateHud();
}
function cancelSpell() { G.spell = null; G.targets = []; Sound.play('invalid'); updateHud(); }
function spellTap(cell) {
  const s = G.spell;
  const side = G.turn;
  if (!G.targets.some((x) => x.r === cell.r && x.c === cell.c)) { Sound.play('invalid'); return; }
  const p = pieceAt(cell.r, cell.c);
  switch (s.id) {
    case 'heal': castHeal(side, p); break;
    case 'imprison': castImprison(side, p); break;
    case 'summon': castSummon(side, p); break;
    case 'revive': castRevive(side, s.type, cell.r, cell.c); break;
    case 'teleport':
      if (!s.piece) { s.piece = p; G.targets = teleportTargets(side, p); Sound.play('select'); updateHud(); }
      else castTeleport(side, s.piece, cell.r, cell.c);
      break;
    case 'exchange':
      if (!s.piece) { s.piece = p; G.targets = G.targets.filter((x) => !(x.r === p.r && x.c === p.c)); Sound.play('select'); updateHud(); }
      else castExchange(side, s.piece, p);
      break;
    default: break;
  }
}
function teleportTargets(side, piece) {
  const res = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (r === piece.r && c === piece.c) continue;
    const q = pieceAt(r, c);
    if (!q || (q.side !== side && !isPP(r, c))) res.push({ r, c });
  }
  return res;
}
function spellUsed(side, id, text) {
  touch();
  G.spellsUsed[side][id] = true;
  G.spell = null; G.targets = [];
  Sound.play('spell');
  toast(t('toast.spell', { side: sideName(side), text }));
}
function finishSpell() {
  updateHud();
  G.busy = true;
  later(550, () => { G.busy = false; endTurn(); });
}
function castHeal(side, p) {
  p.hp = UNITS[p.type].hp;
  spawnBoardFx(p.r, p.c, '#5fff9a', 30);
  spellUsed(side, 'heal', t('fx.healed', { unit: uname(p.type) }));
  Sound.play('heal');
  finishSpell();
}
function castImprison(side, p) {
  p.jailed = true;
  spawnBoardFx(p.r, p.c, '#7fb8ff', 30);
  spellUsed(side, 'imprison', t('fx.jailed', { unit: uname(p.type) }));
  finishSpell();
}
function castRevive(side, type, r, c) {
  const i = G.dead[side].indexOf(type);
  if (i >= 0) G.dead[side].splice(i, 1);
  G.pieces.push({ id: nextId++, type, side, r, c, hp: UNITS[type].hp, alive: true, jailed: false });
  spawnBoardFx(r, c, '#ffffff', 36);
  spellUsed(side, 'revive', t('fx.revived', { unit: uname(type) }));
  finishSpell();
}
function castShift(side) {
  if (G.lum === 5) { G.lum = 0; G.lumDir = 1; }
  else if (G.lum === 0) { G.lum = 5; G.lumDir = -1; }
  else G.lumDir = -G.lumDir;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (CELL_TYPES[r][c] === 'C' && Math.random() < 0.5) spawnBoardFx(r, c, '#ffe68a', 4);
  releaseJailed();
  spellUsed(side, 'shift', t('fx.shift'));
  finishSpell();
}
function castExchange(side, a, b) {
  const ar = a.r, ac = a.c;
  a.r = b.r; a.c = b.c; b.r = ar; b.c = ac;
  spawnBoardFx(a.r, a.c, '#ff7ae0', 20);
  spawnBoardFx(b.r, b.c, '#ff7ae0', 20);
  spellUsed(side, 'exchange', t('fx.exchange', { a: uname(a.type), b: uname(b.type) }));
  finishSpell();
}
function castTeleport(side, piece, r, c) {
  const target = pieceAt(r, c);
  spawnBoardFx(piece.r, piece.c, '#ff7ae0', 24);
  spawnBoardFx(r, c, '#ff7ae0', 24);
  spellUsed(side, 'teleport', t('fx.teleport', { unit: uname(piece.type) }));
  G.busy = true;
  later(380, () => {
    if (target) startCombat(piece, target, r, c);
    else { piece.r = r; piece.c = c; G.busy = false; endTurn(); }
  });
}
function castSummon(side, target) {
  const type = ELEMENTALS[Math.floor(Math.random() * ELEMENTALS.length)];
  const el = { id: -1, type, side, r: -1, c: -1, hp: UNITS[type].hp, alive: true, jailed: false, temp: true };
  spawnBoardFx(target.r, target.c, '#ffb43d', 30);
  spellUsed(side, 'summon', t('fx.summon', { unit: uname(type) }));
  G.busy = true;
  later(600, () => startCombat(el, target, target.r, target.c));
}

// ============================================================ board AI
function combatStrength(p, opp, r, c) {
  let u = UNITS[p.type], hp = p.hp;
  if (u.atk.kind === 'copy') { const ou = UNITS[opp.type].atk.kind === 'copy' ? UNITS.goblin : UNITS[opp.type]; hp = ou.hp * (p.hp / u.hp); u = ou; }
  return (hp + bonusHp(p.side, r, c)) * dpsOf(u);
}
function winProb(a, d, r, c) {
  const x = combatStrength(a, d, r, c) / Math.max(1, combatStrength(d, a, r, c));
  return (x * x) / (1 + x * x);
}
const pieceValue = (p) => UNITS[p.type].value * (0.5 + (0.5 * p.hp) / UNITS[p.type].hp);
const boardDist = (a, b, fly) => { const dr = Math.abs(a.r - b.r), dc = Math.abs(a.c - b.c); return fly ? Math.max(dr, dc) : dr + dc; };
function wouldOwnAllPP(side, piece, r, c) {
  return POWER_POINTS.every(([pr, pc]) => {
    if (pr === r && pc === c) return true;
    if (pr === piece.r && pc === piece.c) return false;
    const q = pieceAt(pr, pc);
    return q && q.side === side;
  });
}

function aiChoose(side) {
  const D = diff();
  const foes = alivePieces(other(side));
  const own = alivePieces(side);
  let best = null;
  const consider = (a) => { a.score += Math.random() * D.noise; if (!best || a.score > best.score) best = a; };

  for (const p of own) {
    const u = UNITS[p.type];
    const moves = computeMoves(p);
    if (!moves.length) continue;
    const dNow = Math.min(...foes.map((e) => boardDist(p, e, u.fly)));
    for (const m of moves) {
      let s = 0;
      if (m.attack) {
        const tg = pieceAt(m.r, m.c);
        const pw = winProb(p, tg, m.r, m.c);
        s = pw * pieceValue(tg) * 10 - (1 - pw) * pieceValue(p) * 10;
        if (isPP(m.r, m.c)) s += pw * 25;
        if (foes.length === 1) s += pw * 200;
        if (pw > 0.5 && wouldOwnAllPP(side, p, m.r, m.c)) s += 500 * pw;
        if (u.mage) s -= 20;
      } else {
        if (isPP(m.r, m.c)) s += 28;
        if (wouldOwnAllPP(side, p, m.r, m.c)) s += 10000;
        if (isPP(p.r, p.c)) s -= 32;
        const dNew = Math.min(...foes.map((e) => boardDist(m, e, u.fly)));
        s += (dNow - dNew) * (u.mage ? 0.5 : 2.2);
        s += sideFactor(side, m.r, m.c) * 5;
        for (const e of foes) {
          const eu = UNITS[e.type];
          if (e.jailed || boardDist(e, m, eu.fly) > eu.move) continue;
          s -= winProb(e, { ...p, r: m.r, c: m.c }, m.r, m.c) * pieceValue(p) * D.danger;
        }
        if (u.mage) s -= 6;
      }
      consider({ kind: 'move', piece: p, r: m.r, c: m.c, score: s });
    }
  }

  const mage = findMage(side);
  if (mage && !mage.jailed) {
    const allowed = (id) => !G.spellsUsed[side][id] && (!D.spells || D.spells.includes(id));
    const foesNP = foes.filter(notPP);
    if (allowed('heal')) {
      for (const p of own.filter(notPP)) {
        const ratio = p.hp / UNITS[p.type].hp;
        if (ratio < 0.45) consider({ kind: 'spell', id: 'heal', piece: p, score: (1 - ratio) * UNITS[p.type].value * 4 });
      }
    }
    if (allowed('revive') && G.dead[side].length) {
      const spots = emptyNeighbors(mage);
      if (spots.length) {
        const type = G.dead[side].slice().sort((a, b) => UNITS[b].value - UNITS[a].value)[0];
        const spot = spots[Math.floor(Math.random() * spots.length)];
        consider({ kind: 'spell', id: 'revive', type, r: spot.r, c: spot.c, score: UNITS[type].value * 3 });
      }
    }
    if (allowed('shift')) {
      const bad = side === 'light' ? (G.lum <= 1 || (G.lum <= 2 && G.lumDir < 0)) : (G.lum >= 4 || (G.lum >= 3 && G.lumDir > 0));
      if (bad && G.round > 2) consider({ kind: 'spell', id: 'shift', score: 16 });
    }
    if (allowed('imprison') && G.round > 2) {
      const tg = foesNP.filter(canJail).sort((a, b) => pieceValue(b) - pieceValue(a))[0];
      if (tg) consider({ kind: 'spell', id: 'imprison', piece: tg, score: 6 + pieceValue(tg) * 0.8 });
    }
    if (allowed('summon') && G.round > 2) {
      for (const e of foesNP) {
        let pw = 0;
        for (const el of ELEMENTALS) pw += winProb({ type: el, side, hp: UNITS[el].hp }, e, e.r, e.c);
        pw /= ELEMENTALS.length;
        consider({ kind: 'spell', id: 'summon', piece: e, score: pw * pieceValue(e) * 10 - 22 });
      }
    }
    if (allowed('teleport')) {
      for (const p of own.filter(notPP)) {
        if (UNITS[p.type].mage) continue;
        for (const [r, c] of POWER_POINTS) {
          if (!pieceAt(r, c) && wouldOwnAllPP(side, p, r, c)) consider({ kind: 'spell', id: 'teleport', piece: p, r, c, score: 20000 });
        }
        if (G.round < 4) continue;
        for (const e of foesNP) {
          const pw = winProb(p, e, e.r, e.c);
          if (pw > 0.8) consider({ kind: 'spell', id: 'teleport', piece: p, r: e.r, c: e.c, score: pw * pieceValue(e) * 10 - (1 - pw) * pieceValue(p) * 10 - 30 });
        }
      }
    }
  }
  return best;
}

function maybeAI() {
  if (G.mode === 'board' && !G.over && !isHumanTurn()) {
    updateHud();
    later(diff().delay, aiTakeTurn);
  }
}
function aiTakeTurn() {
  if (G.mode !== 'board' || G.over || isHumanTurn() || G.busy) return;
  if (G.paused) { later(400, aiTakeTurn); return; }
  touch();
  const side = G.turn;
  let a;
  try { a = aiChoose(side); } catch (err) {
    reportError(err);
    // Fallback: any legal move keeps the game alive.
    const p = alivePieces(side).find((q) => computeMoves(q).length);
    a = p ? { kind: 'move', piece: p, ...computeMoves(p)[0] } : null;
  }
  if (!a) { endTurn(); return; }
  if (a.kind === 'move') {
    G.selected = a.piece;
    G.moves = computeMoves(a.piece);
    Sound.play('select');
    updateHud();
    const go = () => { if (G.paused) later(400, go); else if (!G.busy && G.mode === 'board') doMove(a.piece, a.r, a.c); };
    later(550, go);
    return;
  }
  G.selected = findMage(side); G.moves = [];
  updateHud();
  later(450, () => {
    G.selected = null;
    switch (a.id) {
      case 'heal': castHeal(side, a.piece); break;
      case 'revive': castRevive(side, a.type, a.r, a.c); break;
      case 'shift': castShift(side); break;
      case 'imprison': castImprison(side, a.piece); break;
      case 'summon': castSummon(side, a.piece); break;
      case 'teleport': castTeleport(side, a.piece, a.r, a.c); break;
      default: endTurn();
    }
  });
}

function spawnBoardFx(r, c, color, n) {
  if (G.fx.length > 400) return;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(0.4, 2.2);
    G.fx.push({ r: r + 0.5, c: c + 0.5, vr: Math.sin(a) * sp, vc: Math.cos(a) * sp, life: rand(0.4, 0.9), max: 0.9, color });
  }
}

// ============================================================ combat arena
function startCombat(attacker, defender, r, c) {
  touch();
  G.busy = true;
  deselect();
  const bottomSide = G.vs === 'pvp' ? 'light' : G.human;
  const C = {
    meta: { attacker, defender, r, c }, lf: lightness(r, c),
    phase: 'intro', timer: 2.2, fightTime: 0, time: 0,
    projectiles: [], effects: [], particles: [], obstacles: [],
    pads: { bottom: newPad(), top: newPad() }, result: '', shake: 0, winnerSide: null,
  };
  C.hasTop = G.vs === 'pvp';
  const A = arenaRect(C);
  C.w = 320;
  C.h = clamp(Math.round((320 * A.h) / A.w), 280, 600);

  const mk = (piece, opp) => {
    const own = UNITS[piece.type];
    let u = own, look = piece.type, baseHp = piece.hp, hpScale = 1, name = uname(piece.type);
    // Shapeshifter takes on the form, weapon and lifespan of its opponent.
    if (own.atk.kind === 'copy') {
      const oType = UNITS[opp.type].atk.kind === 'copy' ? 'goblin' : opp.type;
      u = UNITS[oType];
      look = oType;
      baseHp = Math.max(1, Math.round((u.hp * piece.hp) / own.hp));
      hpScale = own.hp / u.hp;
      name = t('combat.shifter', { unit: uname(oType) });
    }
    const bonus = bonusHp(piece.side, r, c);
    const atBottom = piece.side === bottomSide;
    return {
      piece, u, look, name, side: piece.side, r: u.r, atBottom, baseHp, hpScale,
      x: C.w / 2 + rand(-40, 40), y: atBottom ? C.h - 40 : 40,
      vx: 0, vy: 0, face: { x: 0, y: atBottom ? -1 : 1 },
      hp: baseHp + bonus, maxHp: u.hp + bonus, bonus,
      cd: 0.4, flash: 0, walk: 0, auraT: 0,
      ctrl: isHuman(piece.side) ? (atBottom ? 'bottom' : 'top') : 'ai',
      ai: { think: 0, strafe: 1, react: true },
    };
  };
  C.fighters = [mk(attacker, defender), mk(defender, attacker)];
  C.hasBottom = C.fighters.some((f) => f.ctrl === 'bottom');

  // Obstacles fade in and out like in the original.
  const count = 5 + Math.floor(Math.random() * 4);
  let tries = 0;
  while (C.obstacles.length < count && tries++ < 400) {
    const o = { x: rand(28, C.w - 28), y: rand(85, C.h - 85), r: rand(14, 24), phase: rand(0, TAU), period: rand(5, 8), k: 1, seed: Math.floor(rand(1, 1e6)) };
    if (C.fighters.some((f) => Math.hypot(f.x - o.x, f.y - o.y) < o.r + 55)) continue;
    if (C.obstacles.some((q) => Math.hypot(q.x - o.x, q.y - o.y) < q.r + o.r + 30)) continue;
    C.obstacles.push(o);
  }
  updateObstacles(C);
  C.bottomSide = bottomSide;
  G.combat = C;
  G.mode = 'combat';
  setBoardHud(false);
  Sound.play('combat');
  Sound.setTrack('arena');
}
const newPad = () => ({ joy: { id: null, bx: 0, by: 0, x: 0, y: 0 }, fire: { id: null } });

function arenaRect(C) {
  const bar = 30;
  const t0 = safe.t + (C.hasTop ? 150 : 14) + bar;
  const b = H - safe.b - (C.hasTop ? 150 : 175) - bar;
  const l = safe.l + 10, r = W - safe.r - 10;
  return { x: l, y: t0, w: Math.max(50, r - l), h: Math.max(50, b - t0) };
}
function arenaTransform(C) {
  const A = arenaRect(C);
  const s = Math.min(A.w / C.w, A.h / C.h);
  return { s, ox: A.x + (A.w - C.w * s) / 2, oy: A.y + (A.h - C.h * s) / 2 };
}
function updateObstacles(C) {
  for (const o of C.obstacles) o.k = clamp(Math.sin(o.phase + (C.time * TAU) / o.period) * 1.4 + 0.6, 0, 1);
}
const solid = (o) => o.k > 0.45;

// --- touch controls
const JOY_R = 52;
function padCenters(name) {
  if (name === 'bottom') { const y = H - safe.b - 90; return { joy: { x: safe.l + 85, y }, fire: { x: W - safe.r - 85, y } }; }
  const y = safe.t + 80;
  return { joy: { x: W - safe.r - 85, y }, fire: { x: safe.l + 85, y } };
}
function combatDown(e) {
  const C = G.combat;
  if (!C || C.phase === 'end') return;
  const x = e.clientX, y = e.clientY;
  let name = 'bottom';
  if (C.hasTop && C.hasBottom) name = y < H / 2 ? 'top' : 'bottom';
  else if (C.hasTop) name = 'top';
  const pad = C.pads[name];
  const joySide = name === 'bottom' ? x < W / 2 : x > W / 2;
  if (joySide) {
    if (pad.joy.id === null) Object.assign(pad.joy, { id: e.pointerId, bx: x, by: y, x, y });
  } else if (pad.fire.id === null) pad.fire.id = e.pointerId;
}
function combatMove(e) {
  const C = G.combat;
  if (!C) return;
  for (const pad of [C.pads.bottom, C.pads.top]) {
    const j = pad.joy;
    if (j.id !== e.pointerId) continue;
    j.x = e.clientX; j.y = e.clientY;
    const dx = j.x - j.bx, dy = j.y - j.by, d = Math.hypot(dx, dy);
    if (d > JOY_R * 1.4) { const k = (d - JOY_R * 1.4) / d; j.bx += dx * k; j.by += dy * k; }
  }
}
function combatUp(e) {
  const C = G.combat;
  if (!C) return;
  for (const pad of [C.pads.bottom, C.pads.top]) {
    if (pad.joy.id === e.pointerId) pad.joy.id = null;
    if (pad.fire.id === e.pointerId) pad.fire.id = null;
  }
}
const resetPads = (C) => { for (const pad of [C.pads.bottom, C.pads.top]) { pad.joy.id = null; pad.fire.id = null; } };

// --- keyboard (desktop): WASD/arrows + space; second player IJKL + Enter in pass & play
const keys = new Set();
const overlayOpen = () => ['spells', 'rules', 'pause', 'gameover', 'error', 'intro', 'splash', 'menu'].some((id) => !$(id).classList.contains('hidden'));
window.addEventListener('keydown', (e) => {
  if (G.mode === 'combat' && /^(Arrow|Key[WASDIJKL]|Space|Enter)/.test(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'Escape') {
    if (!$('rules').classList.contains('hidden')) { hide('rules'); return; }
    if (!$('spells').classList.contains('hidden')) { hide('spells'); updateHud(); return; }
    if (G.spell) { cancelSpell(); return; }
    if (inGame()) { if (G.paused) resume(); else pause(); }
    return;
  }
  if (boardKey(e)) e.preventDefault();
});
/** Keyboard play on the board: arrows/WASD move a cursor, Enter/Space acts like a tap, E opens the spellbook. */
function boardKey(e) {
  if (G.mode !== 'board' || G.paused || G.over || G.busy || !isHumanTurn() || overlayOpen() || e.repeat && e.code === 'Enter') return false;
  const d = { ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0], ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1] }[e.code];
  if (d) {
    if (!G.cursor) {
      const p = G.selected || G.inspect;
      G.cursor = p ? { r: p.r, c: p.c } : { r: G.turn === 'light' ? 7 : 1, c: 4 };
    } else {
      G.cursor.r = clamp(G.cursor.r + d[0], 0, N - 1);
      G.cursor.c = clamp(G.cursor.c + d[1], 0, N - 1);
    }
    Sound.play('tap');
    return true;
  }
  if ((e.code === 'Enter' || e.code === 'Space') && G.cursor) {
    const L = boardLayout();
    boardDown(L.x + (G.cursor.c + 0.5) * L.cs, L.y + (G.cursor.r + 0.5) * L.cs);
    G.drag = null;
    return true;
  }
  if (e.code === 'KeyE' && !$('btn-spell').classList.contains('hidden')) { $('btn-spell').click(); return true; }
  return false;
}
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
function keyInput(name) {
  const k = (c) => keys.has(c);
  const primary = name === 'bottom';
  let mx = 0, my = 0;
  if (primary ? k('KeyA') || k('ArrowLeft') : k('KeyJ')) mx -= 1;
  if (primary ? k('KeyD') || k('ArrowRight') : k('KeyL')) mx += 1;
  if (primary ? k('KeyW') || k('ArrowUp') : k('KeyI')) my -= 1;
  if (primary ? k('KeyS') || k('ArrowDown') : k('KeyK')) my += 1;
  return { mx, my, fire: primary ? k('Space') : k('Enter') };
}
function padInput(pad, name) {
  const j = pad.joy;
  let mx = 0, my = 0;
  if (j.id !== null) {
    let dx = j.x - j.bx, dy = j.y - j.by;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) { dx *= JOY_R / d; dy *= JOY_R / d; }
    mx = dx / JOY_R; my = dy / JOY_R;
    if (Math.hypot(mx, my) < 0.15) { mx = 0; my = 0; }
    if (name === 'top') { mx = -mx; my = -my; }
  }
  const kb = keyInput(name);
  if (kb.mx || kb.my) { mx = kb.mx; my = kb.my; }
  return { mx, my, fire: pad.fire.id !== null || kb.fire, face: null };
}

// --- arena AI (aims in 8 directions like a human)
function lineBlocked(C, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
  for (const o of C.obstacles) {
    if (!solid(o)) continue;
    const k = clamp(((o.x - ax) * dx + (o.y - ay) * dy) / len2, 0, 1);
    if (Math.hypot(o.x - (ax + dx * k), o.y - (ay + dy * k)) < o.r * o.k + 3) return true;
  }
  return false;
}
function aiInput(C, f, e, dt) {
  const D = diff();
  const ai = f.ai, a = f.u.atk;
  ai.think -= dt;
  if (ai.think <= 0) {
    ai.think = rand(D.think[0], D.think[1]);
    if (Math.random() < 0.3) ai.strafe = -ai.strafe;
    ai.react = Math.random() < D.react;
  }
  const dx = e.x - f.x, dy = e.y - f.y, dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist, ny = dy / dist;
  let mx = 0, my = 0, fire = false, face = quant8(dx, dy);
  if (a.kind === 'melee') {
    mx = nx; my = ny;
    fire = ai.react && dist < a.reach + f.r + e.r && face.x * nx + face.y * ny > 0.6;
  } else if (a.kind === 'aura') {
    if (f.cd > 0.6 && !a.invuln) { mx = -nx * 0.8; my = -ny * 0.8; } else { mx = nx; my = ny; }
    fire = ai.react && dist < a.radius + e.r - 8;
  } else {
    const lead = (dist / a.speed) * D.lead;
    const tx = e.x + e.vx * lead, ty = e.y + e.vy * lead;
    const ddx = tx - f.x, ddy = ty - f.y, dd = Math.hypot(ddx, ddy) || 1;
    face = quant8(ddx, ddy);
    const px = -face.y, py = face.x;
    const perp = ddx * px + ddy * py;
    if (Math.abs(perp) > 3) { const s = Math.sign(perp); mx += px * s; my += py * s; }
    const want = Math.min(a.range * 0.6, 170);
    if (dist > want + 25) { mx += nx * 0.7; my += ny * 0.7; } else if (dist < want - 40) { mx -= nx * 0.7; my -= ny * 0.7; }
    fire = ai.react && dd < a.range * 0.95 && Math.abs(perp) < e.r * D.align && !lineBlocked(C, f.x, f.y, tx, ty);
  }
  for (const p of C.projectiles) {
    if (p.owner === f) continue;
    const rx = f.x - p.x, ry = f.y - p.y, d = Math.hypot(rx, ry);
    if (d > 90 || d === 0) continue;
    const vlen = Math.hypot(p.vx, p.vy) || 1;
    if ((rx * p.vx + ry * p.vy) / (d * vlen) > 0.8) { mx += (-p.vy / vlen) * ai.strafe * D.dodge; my += (p.vx / vlen) * ai.strafe * D.dodge; }
  }
  for (const o of C.obstacles) {
    if (!solid(o)) continue;
    const ox = o.x - f.x, oy = o.y - f.y, d = Math.hypot(ox, oy) || 1;
    if (d < o.r + f.r + 20 && ox * mx + oy * my > 0) {
      mx += (-oy / d) * ai.strafe * 1.4; my += (ox / d) * ai.strafe * 1.4;
      mx -= (ox / d) * 0.4; my -= (oy / d) * 0.4;
    }
  }
  if (f.x < 30) mx += 0.8;
  if (f.x > C.w - 30) mx -= 0.8;
  if (f.y < 30) my += 0.8;
  if (f.y > C.h - 30) my -= 0.8;
  return { mx, my, fire, face };
}

// --- arena simulation
const enemyOf = (C, f) => (C.fighters[0] === f ? C.fighters[1] : C.fighters[0]);
function updateFighter(C, f, inp, dt) {
  if (f.hp <= 0) return;
  const a = f.u.atk;
  let { mx, my } = inp;
  if (f.auraT > 0 && a.invuln) { mx = 0; my = 0; } // the Phoenix stands still while ablaze
  let m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; m = 1; }
  const k = Math.min(1, dt * 10);
  f.vx += (mx * f.u.spd - f.vx) * k;
  f.vy += (my * f.u.spd - f.vy) * k;
  f.x += f.vx * dt; f.y += f.vy * dt;
  if (f.ctrl === 'ai') { if (inp.face) f.face = inp.face; } else if (m > 0.25) f.face = quant8(mx, my);
  f.x = clamp(f.x, f.r, C.w - f.r);
  f.y = clamp(f.y, f.r, C.h - f.r);
  for (const o of C.obstacles) {
    if (!solid(o)) continue;
    const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy) || 0.01, min = o.r * o.k + f.r;
    if (d < min) { f.x = o.x + (dx / d) * min; f.y = o.y + (dy / d) * min; }
  }
  f.walk += m * dt * 12;
  f.cd -= dt;
  f.flash = Math.max(0, f.flash - dt);
  if (f.auraT > 0) {
    f.auraT -= dt;
    const e = enemyOf(C, f);
    if (Math.hypot(e.x - f.x, e.y - f.y) <= a.radius + e.r) damage(C, e, a.dps * dt, 0, 0, true);
  }
  if (inp.fire && f.cd <= 0 && f.auraT <= 0 && C.phase === 'fight') attack(C, f);
}
function attack(C, f) {
  const e = enemyOf(C, f);
  const a = f.u.atk;
  const dir = quant8(f.face.x, f.face.y);
  f.face = dir;
  f.cd = a.cd * (f.ctrl === 'ai' ? diff().cd : 1);
  const dx = e.x - f.x, dy = e.y - f.y, dist = Math.hypot(dx, dy) || 1;
  if (a.kind === 'melee') {
    C.effects.push({ x: f.x, y: f.y, ang: Math.atan2(dir.y, dir.x), r: a.reach + f.r, t: 0, life: 0.18, color: f.side === 'light' ? '#ffe28a' : '#d08cff' });
    Sound.play('swing', panOf(f.x));
    if (dist <= a.reach + f.r + e.r && ((dir.x * dx + dir.y * dy) / dist > 0.5 || dist < f.r + e.r + 3)) damage(C, e, a.dmg, dx / dist, dy / dist);
  } else if (a.kind === 'shot') {
    C.projectiles.push({
      x: f.x + dir.x * (f.r + 3), y: f.y + dir.y * (f.r + 3), vx: dir.x * a.speed, vy: dir.y * a.speed,
      life: a.range / a.speed, size: a.size, color: a.color, fx: a.fx, dmg: a.dmg, owner: f, trail: [], spin: 0,
    });
    Sound.play(a.fx, panOf(f.x));
  } else if (a.kind === 'aura') {
    f.auraT = a.dur;
    f.cd = a.cd + a.dur;
    Sound.play(a.invuln ? 'explode' : 'scream', panOf(f.x));
  }
}
function burst(C, x, y, color, n, speed = 120) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(speed * 0.3, speed);
    C.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.6), max: 0.6, color, size: rand(1.5, 3.5) });
  }
  if (C.particles.length > 400) C.particles.splice(0, C.particles.length - 400);
}
function damage(C, e, dmg, nx, ny, continuous = false) {
  if (e.hp <= 0 || C.phase !== 'fight') return;
  if (e.auraT > 0 && e.u.atk.invuln) return; // a blazing Phoenix is invulnerable
  e.hp -= dmg;
  if (continuous) {
    e.flash = 0.05;
    if (Math.random() < 0.3) burst(C, e.x, e.y, '#ffb0e0', 2, 60);
    Sound.play('tick', panOf(e.x));
  } else {
    e.flash = 0.12;
    e.vx += nx * 160; e.vy += ny * 160;
    burst(C, e.x, e.y, e.side === 'light' ? '#fff0b0' : '#e0a0ff', 10);
    if (!REDUCED_MOTION) C.shake = Math.min(9, C.shake + 3.5);
    Sound.play('hit', panOf(e.x));
    vibrate(18);
  }
  if (e.hp <= 0) {
    e.hp = 0;
    burst(C, e.x, e.y, '#ffffff', 26, 200);
    burst(C, e.x, e.y, e.side === 'light' ? '#ffb43d' : '#ff3d8b', 30, 160);
    Sound.play('death', panOf(e.x));
    vibrate([40, 30, 80]);
    endCombat(C);
  }
}
function endCombat(C, timeout = false) {
  if (C.phase === 'end') return;
  C.phase = 'end';
  C.timer = 2.0;
  const [a, b] = C.fighters;
  if (timeout) C.result = t('combat.timeout');
  else if (a.hp <= 0 && b.hp <= 0) C.result = t('combat.both');
  else {
    const w = a.hp > 0 ? a : b;
    C.result = t('combat.wins', { unit: uname(w.piece.type) });
    C.winnerSide = w.side;
  }
  resetPads(C);
}
function finishCombat() {
  const C = G.combat;
  if (!C) return;
  const { attacker, defender, r, c } = C.meta;
  for (const f of C.fighters) {
    const p = f.piece;
    if (p.temp) continue; // elementals vanish after the fight
    if (f.hp <= 0) { p.alive = false; G.dead[p.side].push(p.type); }
    else {
      // the square bonus is used up first, then real life
      const remaining = Math.min(f.baseHp, f.hp);
      p.hp = Math.max(1, Math.min(UNITS[p.type].hp, Math.round(remaining * f.hpScale)));
    }
  }
  if (attacker.alive && !attacker.temp && !defender.alive) { attacker.r = r; attacker.c = c; }
  if (!defender.alive || (!attacker.alive && !attacker.temp)) spawnBoardFx(r, c, '#ffffff', 26);
  G.combat = null;
  G.mode = 'board';
  G.busy = false;
  setBoardHud(true);
  Sound.setTrack('board');
  endTurn();
}
function updateCombat(dt) {
  const C = G.combat;
  C.time += dt;
  updateObstacles(C);
  if (C.phase === 'intro') {
    C.timer -= dt;
    if (C.timer <= 0) { C.phase = 'fight'; Sound.play('go'); }
  } else if (C.phase === 'fight') {
    C.fightTime += dt;
    for (const f of C.fighters) {
      const inp = f.ctrl === 'ai' ? aiInput(C, f, enemyOf(C, f), dt) : padInput(C.pads[f.ctrl], f.ctrl);
      updateFighter(C, f, inp, dt);
    }
    const [a, b] = C.fighters;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
    if (d < min) {
      const push = (min - d) / 2;
      a.x -= (dx / d) * push; a.y -= (dy / d) * push;
      b.x += (dx / d) * push; b.y += (dy / d) * push;
    }
    if (C.fightTime > 90) endCombat(C, true);
  } else if (C.phase === 'end') {
    C.timer -= dt;
    for (const f of C.fighters) { f.vx *= 0.9; f.vy *= 0.9; f.flash = Math.max(0, f.flash - dt); f.auraT = 0; }
    if (C.timer <= 0) { finishCombat(); return; }
  }
  for (const p of C.projectiles) {
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 7) p.trail.shift();
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    p.spin += dt * 14;
    if (p.x < 0 || p.y < 0 || p.x > C.w || p.y > C.h) p.life = 0;
    for (const o of C.obstacles) {
      if (solid(o) && Math.hypot(p.x - o.x, p.y - o.y) < o.r * o.k + p.size * 0.4) { p.life = 0; burst(C, p.x, p.y, p.color, 6, 80); burst(C, p.x, p.y, '#b9c2e8', 4, 60); Sound.play('block', panOf(p.x)); break; }
    }
    if (p.life <= 0) continue;
    const tg = enemyOf(C, p.owner);
    if (tg.hp > 0 && Math.hypot(p.x - tg.x, p.y - tg.y) < tg.r + p.size * 0.6) {
      p.life = 0;
      if (tg.auraT > 0 && tg.u.atk.invuln) { burst(C, p.x, p.y, '#ffb43d', 6, 80); Sound.play('block', panOf(p.x)); continue; }
      const v = Math.hypot(p.vx, p.vy) || 1;
      damage(C, tg, p.dmg, p.vx / v, p.vy / v);
    }
  }
  C.projectiles = C.projectiles.filter((p) => p.life > 0);
  for (const fx of C.effects) fx.t += dt;
  C.effects = C.effects.filter((fx) => fx.t < fx.life);
  for (const p of C.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
  C.particles = C.particles.filter((p) => p.life > 0);
  C.shake = Math.max(0, C.shake - dt * 30);
}

// ============================================================ rendering
const STARS = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + 0.3, p: Math.random() * TAU }));
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0d0924');
  g.addColorStop(0.5, '#07060f');
  g.addColorStop(1, '#130a26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#c8c0ff';
  for (const s of STARS) {
    ctx.globalAlpha = REDUCED_MOTION ? 0.35 : 0.25 + 0.25 * Math.sin(G.time * 1.5 + s.p);
    ctx.fillRect(s.x * W, s.y * H, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
const unit = (type, pal, cx, cy, size, flip = false) => drawUnit(ctx, type, pal, cx, cy, size, flip, DPR);

function drawBoard() {
  const { x: bx, y: by, cs, size } = boardLayout();
  const tm = G.time;
  // frame
  ctx.save();
  ctx.shadowColor = G.turn === 'light' ? 'rgba(255,200,90,0.35)' : 'rgba(160,100,255,0.4)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#100b24';
  roundRect(bx - 8, by - 8, size + 16, size + 16, 14);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = G.turn === 'light' ? 'rgba(255,215,106,0.6)' : 'rgba(180,140,255,0.65)';
  ctx.lineWidth = 1.5;
  roundRect(bx - 7.5, by - 7.5, size + 15, size + 15, 13);
  ctx.stroke();

  ctx.save();
  roundRect(bx, by, size, size, 6);
  ctx.clip();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const x = bx + c * cs, y = by + r * cs;
      ctx.fillStyle = mixColor(lightness(r, c));
      ctx.fillRect(x, y, cs + 0.5, cs + 0.5);
      if (CELL_TYPES[r][c] === 'C') {
        ctx.fillStyle = G.lum >= 3 ? 'rgba(40,20,80,0.35)' : 'rgba(255,240,190,0.3)';
        const d = Math.max(2, cs * 0.06);
        for (const [ox, oy] of [[1, 1], [cs - 2 * d - 1, 1], [1, cs - 2 * d - 1], [cs - 2 * d - 1, cs - 2 * d - 1]]) {
          ctx.beginPath(); ctx.arc(x + ox + d * 1.5, y + oy + d * 1.5, d / 2, 0, TAU); ctx.fill();
        }
      }
    }
  }
  // soft sheen over the whole board
  const sheen = ctx.createLinearGradient(bx, by, bx + size, by + size);
  sheen.addColorStop(0, 'rgba(255,255,255,0.07)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = sheen;
  ctx.fillRect(bx, by, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < N; i++) {
    ctx.moveTo(bx + i * cs + 0.5, by); ctx.lineTo(bx + i * cs + 0.5, by + size);
    ctx.moveTo(bx, by + i * cs + 0.5); ctx.lineTo(bx + size, by + i * cs + 0.5);
  }
  ctx.stroke();
  ctx.restore();

  for (const [r, c] of POWER_POINTS) {
    const cx = bx + c * cs + cs / 2, cy = by + r * cs + cs / 2;
    const pulse = REDUCED_MOTION ? 0.5 : 0.5 + 0.5 * Math.sin(tm * 3 + r + c);
    const s = cs * (0.42 + 0.03 * pulse);
    ctx.beginPath();
    ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy); ctx.closePath();
    ctx.fillStyle = `rgba(95,247,230,${0.08 + 0.08 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(95,247,230,${0.45 + 0.45 * pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const m of G.moves) {
    const x = bx + m.c * cs, y = by + m.r * cs;
    if (m.attack) {
      ctx.strokeStyle = `rgba(255,70,90,${0.65 + 0.3 * Math.sin(tm * 8)})`;
      ctx.lineWidth = 3;
      roundRect(x + 3, y + 3, cs - 6, cs - 6, 5);
      ctx.stroke();
    } else {
      ctx.fillStyle = G.turn === 'light' ? 'rgba(255,215,106,0.8)' : 'rgba(190,140,255,0.9)';
      ctx.beginPath(); ctx.arc(x + cs / 2, y + cs / 2, cs * 0.11, 0, TAU); ctx.fill();
    }
  }
  for (const m of G.targets) {
    ctx.strokeStyle = `rgba(255,110,230,${0.55 + 0.35 * Math.sin(tm * 6)})`;
    ctx.lineWidth = 2;
    roundRect(bx + m.c * cs + 2.5, by + m.r * cs + 2.5, cs - 5, cs - 5, 5);
    ctx.stroke();
  }
  if (G.spell && G.spell.piece && G.spell.piece.alive) {
    const p = G.spell.piece;
    ctx.strokeStyle = '#ff7ae0'; ctx.lineWidth = 3;
    roundRect(bx + p.c * cs + 1.5, by + p.r * cs + 1.5, cs - 3, cs - 3, 6);
    ctx.stroke();
  }
  if (G.cursor && G.mode === 'board') {
    const x = bx + G.cursor.c * cs, y = by + G.cursor.r * cs;
    ctx.strokeStyle = `rgba(95,247,230,${0.6 + 0.35 * Math.sin(tm * 6)})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    roundRect(x + 2, y + 2, cs - 4, cs - 4, 6);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const sel = G.selected || G.inspect;
  if (sel && sel.alive) {
    ctx.strokeStyle = G.inspect ? 'rgba(255,255,255,0.7)' : '#ffffff';
    ctx.lineWidth = 3;
    roundRect(bx + sel.c * cs + 1.5, by + sel.r * cs + 1.5, cs - 3, cs - 3, 6);
    ctx.stroke();
  }
  for (const p of G.pieces) {
    if (!p.alive || (G.anim && G.anim.piece === p)) continue;
    const ghost = G.drag && G.drag.moved && G.drag.piece === p;
    drawPieceAt(p, bx + p.c * cs + cs / 2, by + p.r * cs + cs / 2, cs, ghost ? 0.3 : 1);
  }
  if (G.anim) {
    const a = G.anim;
    const k = Math.min(1, a.t / a.dur);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const hop = Math.sin(k * Math.PI) * cs * (UNITS[a.piece.type].fly ? 0.35 : 0.12);
    drawPieceAt(a.piece, bx + lerp(a.fc, a.tc, e) * cs + cs / 2, by + lerp(a.fr, a.tr, e) * cs + cs / 2 - hop, cs, 1);
  }
  if (G.drag && G.drag.moved) drawPieceAt(G.drag.piece, G.drag.x, G.drag.y - cs * 0.6, cs * 1.25, 0.95);
  const ps = Math.max(2, cs * 0.07);
  for (const f of G.fx) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.arc(bx + f.c * cs, by + f.r * cs, ps / 2, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawPieceAt(p, cx, cy, cs, alpha) {
  const u = UNITS[p.type];
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(cx, cy + cs * 0.3, 0, cx, cy + cs * 0.3, cs * 0.34);
  g.addColorStop(0, p.side === 'light' ? 'rgba(255,190,70,0.55)' : 'rgba(160,90,255,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy + cs * 0.3, cs * 0.34, cs * 0.12, 0, 0, TAU); ctx.fill();
  const canAct = !REDUCED_MOTION && !G.over && G.mode === 'board' && p.side === G.turn && isHumanTurn() && !p.jailed && !G.selected && !G.spell;
  const bob = (u.fly && !REDUCED_MOTION ? Math.sin(G.time * 3 + p.id) * cs * 0.035 - cs * 0.04 : 0) + (canAct ? Math.sin(G.time * 5 + p.id) * cs * 0.02 : 0);
  unit(p.type, p.side, cx, cy + bob - cs * 0.03, cs * 1.02, p.side === 'dark');
  if (p.hp < u.hp) {
    const w = cs * 0.7, h = Math.max(3, cs * 0.07);
    const x = cx - w / 2, y = cy + cs * 0.39;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    roundRect(x - 1, y - 1, w + 2, h + 2, 2); ctx.fill();
    const k = p.hp / u.hp;
    ctx.fillStyle = k > 0.5 ? '#3dff9a' : k > 0.25 ? '#ffd23d' : '#ff4d4d';
    roundRect(x, y, w * k, h, 2); ctx.fill();
  }
  if (p.jailed) {
    ctx.strokeStyle = 'rgba(140,200,255,0.95)';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(cx + i * cs * 0.22, cy - cs * 0.4); ctx.lineTo(cx + i * cs * 0.22, cy + cs * 0.4); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawProjectile(p) {
  const v = Math.hypot(p.vx, p.vy) || 1;
  const ux = p.vx / v, uy = p.vy / v;
  for (let i = 0; i < p.trail.length; i++) {
    const tr = p.trail[i];
    ctx.globalAlpha = (i / p.trail.length) * 0.45;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(tr.x, tr.y, p.size * (0.2 + (i / p.trail.length) * 0.3), 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  switch (p.fx) {
    case 'arrow': case 'spear': case 'spikes': {
      const len = p.fx === 'spear' ? 16 : 11;
      ctx.strokeStyle = p.color; ctx.lineWidth = p.fx === 'spear' ? 2.5 : 2;
      ctx.beginPath(); ctx.moveTo(p.x - ux * len, p.y - uy * len); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(p.x + ux * 3, p.y + uy * 3); ctx.lineTo(p.x - uy * 2.5, p.y + ux * 2.5); ctx.lineTo(p.x + uy * 2.5, p.y - ux * 2.5); ctx.closePath(); ctx.fill();
      if (p.fx === 'spikes') {
        ctx.beginPath(); ctx.arc(p.x - ux * 6 - uy * 4, p.y - uy * 6 + ux * 4, 1.2, 0, TAU); ctx.arc(p.x - ux * 6 + uy * 4, p.y - uy * 6 - ux * 4, 1.2, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'bolt': case 'beam': case 'lightning': {
      const len = p.fx === 'beam' ? 22 : 14;
      ctx.strokeStyle = p.color; ctx.lineWidth = 5; ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.moveTo(p.x - ux * len, p.y - uy * len); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x - ux * len, p.y - uy * len);
      if (p.fx === 'lightning') {
        for (let i = 1; i <= 3; i++) {
          const j = (Math.random() - 0.5) * 6;
          ctx.lineTo(p.x - ux * len * (1 - i / 3) - uy * j, p.y - uy * len * (1 - i / 3) + ux * j);
        }
      } else ctx.lineTo(p.x, p.y);
      ctx.stroke();
      break;
    }
    case 'boulder': {
      const g = ctx.createRadialGradient(p.x - p.size * 0.3, p.y - p.size * 0.3, 1, p.x, p.y, p.size * 0.8);
      g.addColorStop(0, '#fff3d6'); g.addColorStop(0.4, p.color); g.addColorStop(1, '#3a2a14');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.75, 0, TAU); ctx.fill();
      break;
    }
    case 'whirl':
      ctx.strokeStyle = p.color; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + i * 0.25), p.spin + i * 2, p.spin + i * 2 + 3.6); ctx.stroke(); }
      break;
    case 'ice':
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x + ux * p.size, p.y + uy * p.size);
      ctx.lineTo(p.x - uy * p.size * 0.5, p.y + ux * p.size * 0.5);
      ctx.lineTo(p.x - ux * p.size, p.y - uy * p.size);
      ctx.lineTo(p.x + uy * p.size * 0.5, p.y - ux * p.size * 0.5);
      ctx.closePath(); ctx.fill();
      break;
    default: { // fire, fireball
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, '#fffbe0'); g.addColorStop(0.45, p.color); g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.95 + Math.random() * 0.15), 0, TAU); ctx.fill();
    }
  }
}

/** Floor and pillars are pre-rendered at the current screen scale (see arena-art.js). */
function drawArenaFloor(C, s) {
  const scale = s * DPR;
  if (!C.floor || C.floorScale !== scale) {
    C.floor = makeFloor(C.w, C.h, scale, mixRGB(C.lf).map((v) => v * 0.8 + 22), C.lf, C.bottomSide, C.meta.r * 9 + C.meta.c + 1);
    C.floorScale = scale;
  }
  ctx.save();
  roundRect(0, 0, C.w, C.h, 10);
  ctx.clip();
  ctx.drawImage(C.floor, 0, 0, C.w, C.h);
  ctx.restore();
  // frame: the colours of both armies with corner gems
  const top = C.bottomSide === 'light' ? '#a070ff' : '#ffc451';
  const bot = C.bottomSide === 'light' ? '#ffc451' : '#a070ff';
  const g = ctx.createLinearGradient(0, 0, 0, C.h);
  g.addColorStop(0, top); g.addColorStop(0.5, 'rgba(95,247,230,0.7)'); g.addColorStop(1, bot);
  ctx.strokeStyle = g;
  ctx.lineWidth = 2;
  roundRect(1, 1, C.w - 2, C.h - 2, 10); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  roundRect(5, 5, C.w - 10, C.h - 10, 7); ctx.stroke();
  for (const [x, y, col] of [[0, 0, top], [C.w, 0, top], [0, C.h, bot], [C.w, C.h, bot]]) {
    const gx = clamp(x, 7, C.w - 7), gy = clamp(y, 7, C.h - 7);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(gx, gy - 5); ctx.lineTo(gx + 5, gy); ctx.lineTo(gx, gy + 5); ctx.lineTo(gx - 5, gy); ctx.closePath(); ctx.fill();
  }
}
function drawObstacle(C, o, s) {
  const scale = s * DPR;
  if (!o.art || o.artScale !== scale) { o.art = makeRock(o.r, scale, o.seed); o.artScale = scale; }
  const k = o.k, firm = solid(o);
  // the pillar's footprint stays visible as a rune circle, so its return can be anticipated
  const hue = (G.time * 70 + o.phase * 57) % 360; // pillars shimmer through colours like in the original
  ctx.strokeStyle = `hsla(${hue},90%,70%,${firm ? 0.25 : 0.18 + 0.25 * (1 - k)})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  if (k <= 0.02) return;
  const A = o.art, size = A.size * k;
  ctx.globalAlpha = firm ? 1 : 0.15 + 0.45 * k;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(o.x + 3 * k, o.y + o.r * 0.45 * k, o.r * 1.05 * k, o.r * 0.55 * k, 0, 0, TAU); ctx.fill();
  const lift = A.height * 0.45 * k;
  ctx.drawImage(A.cv, o.x - size / 2, o.y - size / 2 - lift, size, size);
  // glowing rune on top
  const rx = o.x + A.ax * k, ry = o.y + A.ay * k - lift, rr = o.r * 0.2 * k;
  ctx.globalAlpha = (firm ? 0.85 : 0.4) * k;
  ctx.fillStyle = `hsl(${hue},95%,72%)`;
  ctx.shadowColor = `hsl(${hue},95%,60%)`;
  ctx.shadowBlur = 8 * k;
  ctx.beginPath(); ctx.moveTo(rx, ry - rr * 1.3); ctx.lineTo(rx + rr, ry); ctx.lineTo(rx, ry + rr * 1.3); ctx.lineTo(rx - rr, ry); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // dissolving motes while the pillar fades
  if (!REDUCED_MOTION && k < 0.95) {
    ctx.fillStyle = `hsl(${hue},90%,80%)`;
    for (let i = 0; i < 5; i++) {
      const q = (G.time * 0.7 + i / 5 + o.phase) % 1;
      ctx.globalAlpha = (1 - q) * (1 - k) * 0.9;
      ctx.fillRect(o.x + Math.sin(i * 2.3 + o.seed) * o.r * 0.8, o.y - lift - q * o.r * 1.6, 1.6, 1.6);
    }
  }
  ctx.globalAlpha = 1;
}

function drawCombat() {
  const C = G.combat;
  const { s, ox, oy } = arenaTransform(C);
  const sx = (Math.random() - 0.5) * C.shake, sy = (Math.random() - 0.5) * C.shake;
  ctx.save();
  ctx.translate(ox + sx, oy + sy);
  ctx.scale(s, s);
  drawArenaFloor(C, s);
  for (const o of C.obstacles) drawObstacle(C, o, s);
  ctx.globalAlpha = 1;

  for (const f of C.fighters) {
    if (f.auraT <= 0 || f.hp <= 0) continue;
    const a = f.u.atk;
    const k = 1 - f.auraT / a.dur;
    if (a.invuln) {
      const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, a.radius);
      g.addColorStop(0, 'rgba(255,255,200,0.9)'); g.addColorStop(0.5, 'rgba(255,140,30,0.6)'); g.addColorStop(1, 'rgba(255,40,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, a.radius * (0.7 + 0.3 * Math.sin(k * 20)), 0, TAU); ctx.fill();
    } else {
      ctx.strokeStyle = a.color; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const rr = ((k * 3 + i / 3) % 1) * a.radius;
        ctx.globalAlpha = 1 - rr / a.radius;
        ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  for (const f of C.fighters.slice().sort((a, b) => a.y - b.y)) {
    if (f.hp <= 0 && C.phase === 'end') continue;
    const hover = f.u.fly && !REDUCED_MOTION ? 7 + Math.sin(G.time * 5 + f.x * 0.05) * 2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(f.x, f.y + f.r * 0.8, f.r * 0.9, f.r * 0.35, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = f.side === 'light' ? 'rgba(255,215,106,0.55)' : 'rgba(180,120,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + f.r * 0.8, f.r, f.r * 0.4, 0, 0, TAU); ctx.stroke();
    const step = f.u.fly ? 0 : Math.abs(Math.sin(f.walk)) * 2;
    const pal = f.flash > 0 ? 'flash' : palFor(f.look, f.side);
    // canvas size is scaled by `s`, so render the cached art at s × DPR
    drawUnit(ctx, f.look, pal, f.x, f.y - hover - step - f.r * 0.3, f.r * 3.8, f.face.x < -0.1, DPR * s);
    const ax = f.x + f.face.x * (f.r + 8), ay = f.y + f.face.y * (f.r + 8) - hover;
    ctx.fillStyle = f.side === 'light' ? '#ffe28a' : '#d08cff';
    ctx.beginPath();
    ctx.moveTo(ax + f.face.x * 4, ay + f.face.y * 4);
    ctx.lineTo(ax - f.face.y * 3, ay + f.face.x * 3);
    ctx.lineTo(ax + f.face.y * 3, ay - f.face.x * 3);
    ctx.closePath(); ctx.fill();
  }
  for (const p of C.projectiles) drawProjectile(p);
  for (const fx of C.effects) {
    const k = fx.t / fx.life;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = fx.color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.7 + 0.3 * k), fx.ang - 1.1 + k * 0.6, fx.ang + 0.5 + k * 0.6); ctx.stroke();
  }
  for (const p of C.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  const bottomF = C.fighters.find((f) => f.atBottom) || C.fighters[0];
  drawHpBar(enemyOf(C, bottomF), ox, oy - 27, C.w * s);
  drawHpBar(bottomF, ox, oy + C.h * s + 8, C.w * s);
  if (C.hasBottom) drawPad(C, C.pads.bottom, 'bottom');
  if (C.hasTop) drawPad(C, C.pads.top, 'top');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = ox + (C.w * s) / 2, cy = oy + (C.h * s) / 2;
  if (C.phase === 'intro') drawVersus(C, ox, oy, s);
  else if (C.phase === 'end') {
    ctx.fillStyle = 'rgba(5,3,14,0.65)';
    ctx.fillRect(ox, cy - 30, C.w * s, 60);
    ctx.font = font(18);
    ctx.fillStyle = C.winnerSide === 'light' ? '#ffd76a' : C.winnerSide === 'dark' ? '#c8a0ff' : '#ffffff';
    ctx.fillText(C.result, cx, cy);
  } else if (C.fightTime > 75) {
    ctx.font = font(13); ctx.fillStyle = '#ff6b6b';
    ctx.fillText(t('combat.time', { n: Math.ceil(90 - C.fightTime) }), cx, oy + 16);
  }
}
function polygon(x, y, r, n, rot) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
/** Duel announcement: both champions slide in with name, life and square bonus. */
function drawVersus(C, ox, oy, s) {
  const k = clamp((2.2 - C.timer) / 0.45, 0, 1);
  const e = 1 - (1 - k) ** 3;
  const w = C.w * s, h = C.h * s;
  const cy = oy + h / 2;
  ctx.fillStyle = `rgba(5,3,14,${0.72 * e})`;
  ctx.fillRect(ox, oy, w, h);
  const top = C.fighters.find((f) => !f.atBottom) || C.fighters[1];
  const bottom = enemyOf(C, top);
  const size = Math.min(w * 0.42, h * 0.3);
  const rows = [[top, cy - h * 0.2, -1], [bottom, cy + h * 0.2, 1]];
  for (const [f, y, dir] of rows) {
    const x = ox + w / 2 + dir * (1 - e) * w * 0.7;
    const col = f.side === 'light' ? '#ffd76a' : '#c8a0ff';
    const glow = ctx.createRadialGradient(x - w * 0.18, y, 4, x - w * 0.18, y, size * 0.7);
    glow.addColorStop(0, f.side === 'light' ? 'rgba(255,190,70,0.5)' : 'rgba(160,90,255,0.55)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - w * 0.18 - size, y - size, size * 2, size * 2);
    drawUnit(ctx, f.look, palFor(f.look, f.side), x - w * 0.18, y, size, f.side === 'dark', DPR);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = col;
    ctx.font = font(Math.round(clamp(w * 0.055, 15, 22)));
    ctx.fillText(f.name, x + w * 0.02, y - 16);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = font(12);
    ctx.fillText(`${t('stat.life')} ${(f.hp / LIFE).toFixed(1)}`, x + w * 0.02, y + 6);
    if (f.bonus > 0) { ctx.fillStyle = '#5ff7e6'; ctx.fillText(t('combat.bonus', { n: fmtLife(f.bonus) }), x + w * 0.02, y + 24); }
  }
  ctx.textAlign = 'center';
  ctx.globalAlpha = e;
  ctx.font = font(Math.round(clamp(w * 0.09, 24, 40)));
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(95,247,230,0.9)';
  ctx.shadowBlur = 18;
  const fight = C.timer < 0.7;
  ctx.fillText(fight ? t('combat.fight') : t('combat.vs'), ox + w / 2, cy);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}
function drawHpBar(f, x, y, w) {
  const h = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(x, y, w, h + 2, 6); ctx.fill();
  const k = clamp(f.hp / f.maxHp, 0, 1);
  const col = f.side === 'light' ? ['#ffe28a', '#ff9d2e'] : ['#c8a0ff', '#ff3d8b'];
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
  ctx.fillStyle = g;
  if (k > 0) { roundRect(x + 1, y + 1, (w - 2) * k, h, 5); ctx.fill(); }
  if (f.bonus > 0) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x + 1 + (w - 2) * (f.u.hp / f.maxHp), y + 1, 1, h); }
  const a = f.u.atk;
  const full = a.kind === 'aura' ? a.cd + a.dur : a.cd;
  const rel = clamp(1 - f.cd / full, 0, 1);
  ctx.fillStyle = rel >= 1 ? '#5ff7e6' : 'rgba(95,247,230,0.4)';
  ctx.fillRect(x + 4, y + h - 1, (w - 8) * rel, 2);
  ctx.font = font(11);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = k > 0.45 ? '#1a1030' : '#ffffff';
  ctx.fillText(f.name + (f.ctrl === 'ai' ? t('combat.ai') : ''), x + 8, y + h / 2 + 1);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText((f.hp / LIFE).toFixed(1), x + w - 8, y + h / 2 + 1);
}
function drawPad(C, pad, name) {
  const centers = padCenters(name);
  const j = pad.joy;
  const bx = j.id !== null ? j.bx : centers.joy.x;
  const by = j.id !== null ? j.by : centers.joy.y;
  let kx = bx, ky = by;
  if (j.id !== null) {
    let dx = j.x - j.bx, dy = j.y - j.by;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) { dx *= JOY_R / d; dy *= JOY_R / d; }
    kx = bx + dx; ky = by + dy;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.strokeStyle = 'rgba(95,247,230,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx, by, JOY_R + 10, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(95,247,230,0.35)';
  for (let i = 0; i < 8; i++) {
    const a = i * OCT;
    ctx.beginPath(); ctx.arc(bx + Math.cos(a) * (JOY_R + 4), by + Math.sin(a) * (JOY_R + 4), 2.2, 0, TAU); ctx.fill();
  }
  const kg = ctx.createRadialGradient(kx - 6, ky - 6, 2, kx, ky, 26);
  kg.addColorStop(0, j.id !== null ? 'rgba(180,255,248,0.95)' : 'rgba(150,250,240,0.55)');
  kg.addColorStop(1, j.id !== null ? 'rgba(40,180,170,0.85)' : 'rgba(40,160,150,0.4)');
  ctx.fillStyle = kg;
  ctx.beginPath(); ctx.arc(kx, ky, 24, 0, TAU); ctx.fill();

  const f = centers.fire;
  const fighter = C.fighters.find((q) => q.ctrl === name);
  const pressed = pad.fire.id !== null;
  const fg = ctx.createRadialGradient(f.x - 10, f.y - 10, 4, f.x, f.y, 46);
  fg.addColorStop(0, pressed ? '#ff9cc4' : 'rgba(255,120,170,0.6)');
  fg.addColorStop(1, pressed ? '#c2185b' : 'rgba(194,24,91,0.45)');
  ctx.fillStyle = fg;
  ctx.strokeStyle = 'rgba(255,160,200,0.8)';
  ctx.beginPath(); ctx.arc(f.x, f.y, pressed ? 40 : 44, 0, TAU); ctx.fill(); ctx.stroke();
  if (fighter) {
    const a = fighter.u.atk;
    const full = a.kind === 'aura' ? a.cd + a.dur : a.cd;
    const rel = clamp(1 - fighter.cd / full, 0, 1);
    ctx.strokeStyle = rel >= 1 ? '#5ff7e6' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(f.x, f.y, 50, -Math.PI / 2, -Math.PI / 2 + TAU * rel); ctx.stroke();
  }
  ctx.save();
  ctx.translate(f.x, f.y);
  if (name === 'top') ctx.rotate(Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(11);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('combat.attack'), 0, 1);
  ctx.restore();
}

// ============================================================ resilience: errors, watchdog
let errorCount = 0;
let errorShown = false;
function reportError(err) {
  errorCount++;
  console.error('[Archon NEO]', err);
  if (errorCount >= 25 && !errorShown) {
    errorShown = true;
    G.paused = true;
    show('error');
  }
}
window.addEventListener('error', (e) => reportError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => reportError(e.reason));
// decay so that rare, harmless errors never pile up into the fatal overlay
setInterval(() => { errorCount = Math.max(0, errorCount - 5); }, 10000);

/** Watchdog: recovers from a stuck board state (lost timer, interrupted animation, sleeping tab). */
setInterval(() => {
  if (G.mode !== 'board' || G.over || G.paused || document.hidden) { touch(); return; }
  const idle = Date.now() - G.lastAction;
  if (idle < 12000) return;
  if (G.busy && !G.anim && !G.combat) {
    console.warn('[Archon NEO] watchdog: releasing stuck board state');
    G.busy = false;
    touch();
    if (!isHumanTurn()) maybeAI();
  } else if (!G.busy && !isHumanTurn()) {
    console.warn('[Archon NEO] watchdog: restarting AI turn');
    touch();
    maybeAI();
  }
}, 3000);

// ============================================================ main loop
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); // schedule first – a thrown error must never stop the loop
  try {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    G.time += dt;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!G.paused) {
      if (G.anim) {
        const a = G.anim;
        a.t += dt;
        const st = Math.min(a.dist, Math.floor((a.t / a.dur) * a.dist + 0.001));
        if (st > a.steps) { a.steps = st; Sound.play(UNITS[a.piece.type].mv === 'ground' ? 'step' : 'fly', 0, a.piece.side); }
        if (a.t >= a.dur) a.done();
      }
      for (const f of G.fx) { f.r += f.vr * dt; f.c += f.vc * dt; f.vr *= 0.94; f.vc *= 0.94; f.life -= dt; }
      G.fx = G.fx.filter((f) => f.life > 0);
      if (G.mode === 'combat' && G.combat) updateCombat(dt);
    }
    drawBackground();
    if (G.mode === 'combat' && G.combat) drawCombat(); else drawBoard();
  } catch (err) { reportError(err); }
}

// ============================================================ input wiring
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  Sound.unlock();
  G.cursor = null;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  if (G.mode === 'board') boardDown(e.clientX, e.clientY);
  else if (G.mode === 'combat' && !G.paused) combatDown(e);
}, { passive: false });
canvas.addEventListener('pointermove', (e) => {
  e.preventDefault();
  if (G.mode === 'board') boardMove(e.clientX, e.clientY);
  else if (G.mode === 'combat') combatMove(e);
}, { passive: false });
canvas.addEventListener('pointerup', (e) => {
  if (G.mode === 'board') boardUp(e.clientX, e.clientY);
  else if (G.mode === 'combat') combatUp(e);
});
canvas.addEventListener('pointercancel', (e) => { G.drag = null; if (G.mode === 'combat') combatUp(e); });
canvas.addEventListener('lostpointercapture', (e) => { if (G.mode === 'combat') combatUp(e); });

// --- pause, Android back button, app switching
const inGame = () => (G.mode === 'board' || G.mode === 'combat') && !G.over;
function pause() {
  if (!inGame() || G.paused) return;
  G.paused = true;
  if (G.combat) resetPads(G.combat);
  keys.clear();
  show('pause');
}
function resume() { G.paused = false; hide('pause'); last = performance.now(); touch(); }
window.addEventListener('popstate', () => {
  if (!inGame()) return;
  try { history.pushState({ archon: 1 }, ''); } catch { /* ignore */ }
  if (G.paused) resume(); else pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (G.mode === 'combat') pause();
    saveGame();
  } else {
    if (Sound.ac && Sound.ac.state !== 'running') Sound.ac.resume().catch(() => {});
    if (inGame()) keepAwake(true);
    last = performance.now();
    touch();
  }
});
window.addEventListener('pagehide', saveGame);

// ============================================================ UI wiring
function refreshMenu() {
  $('btn-continue').classList.toggle('hidden', !loadSave());
  document.querySelectorAll('[data-diff]').forEach((b) => {
    const on = b.dataset.diff === settings.difficulty;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $('version').textContent = `v${APP_VERSION}`;
}
function updateSoundLabel() {
  $('btn-sound').textContent = t(settings.sound ? 'pause.soundOn' : 'pause.soundOff');
  document.querySelectorAll('[data-action="music"]').forEach((b) => { b.textContent = t(settings.music ? 'pause.musicOn' : 'pause.musicOff'); b.setAttribute('aria-pressed', String(settings.music)); });
}
/** Static board preview for the story intro (starting position). */
function renderBoardPreview(cv, css) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.round(css * dpr);
  cv.width = cv.height = px;
  cv.style.width = cv.style.height = `${css}px`;
  const g = cv.getContext('2d');
  const cs = px / N;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      g.fillStyle = mixColor(lightness(r, c));
      g.fillRect(c * cs, r * cs, cs + 0.5, cs + 0.5);
      if (CELL_TYPES[r][c] === 'C') {
        g.fillStyle = 'rgba(255,240,190,0.28)';
        g.beginPath(); g.arc(c * cs + cs * 0.15, r * cs + cs * 0.15, cs * 0.05, 0, TAU); g.fill();
      }
    }
  }
  g.strokeStyle = 'rgba(95,247,230,0.95)';
  g.lineWidth = Math.max(1.5, cs * 0.07);
  for (const [r, c] of POWER_POINTS) {
    const x = c * cs + cs / 2, y = r * cs + cs / 2, d = cs * 0.42;
    g.beginPath(); g.moveTo(x, y - d); g.lineTo(x + d, y); g.lineTo(x, y + d); g.lineTo(x - d, y); g.closePath(); g.stroke();
  }
  const sz = Math.round(cs);
  for (const side of ['light', 'dark']) {
    const back = side === 'light' ? 8 : 0, front = side === 'light' ? 7 : 1;
    for (let i = 0; i < N; i++) {
      for (const [row, list] of [[back, BACK_ROW], [front, FRONT_ROW]]) {
        const type = list[side][i];
        if (!type) continue;
        g.drawImage(unitCanvas(type, side, sz), i * cs, row * cs, cs, cs);
      }
    }
  }
}
function buildUnitList() {
  const box = $('unit-list');
  box.replaceChildren();
  const groups = [['light', t('side.light')], ['dark', t('side.dark')], ['elemental', t('rules.elementals')]];
  for (const [key, title] of groups) {
    const h = document.createElement('h4');
    h.textContent = title;
    box.appendChild(h);
    for (const [type, u] of Object.entries(UNITS)) {
      if (key === 'elemental' ? !u.elemental : u.side !== key || u.elemental) continue;
      const row = document.createElement('div');
      row.className = 'unit-row';
      const cv = document.createElement('canvas');
      const px = Math.round(40 * Math.min(2, window.devicePixelRatio || 1));
      cv.width = cv.height = px;
      cv.getContext('2d').drawImage(unitCanvas(type, palFor(type, key === 'elemental' ? 'light' : key), px), 0, 0, px, px);
      const txt = document.createElement('div');
      const name = document.createElement('span');
      name.className = key === 'elemental' ? '' : key;
      name.textContent = uname(type);
      const small = document.createElement('small');
      const parts = [];
      if (u.move) parts.push(`${t(`move.${u.mv}`)} ${u.move}`);
      parts.push(t('rules.life', { n: u.life }));
      if (u.str) parts.push(t('rules.strength', { n: u.str }));
      small.textContent = parts.join(' · ');
      txt.append(name, document.createTextNode(` – ${urole(type)}`), document.createElement('br'), small);
      row.append(cv, txt);
      box.appendChild(row);
    }
  }
}
function applyLanguage(lang) {
  setLang(lang);
  document.title = t('meta.title');
  applyStatic();
  updateSoundLabel();
  buildUnitList();
  intro.invalidate();
  if (G.mode !== 'menu') updateHud();
}

let lastStart = { vs: 'ai', human: 'light' };
document.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => {
  const m = b.dataset.start;
  lastStart = m === 'pvp' ? { vs: 'pvp', human: 'light' } : { vs: 'ai', human: m === 'ai-dark' ? 'dark' : 'light' };
  enterFullscreen();
  newGame(lastStart.vs, lastStart.human);
}));
$('btn-continue').addEventListener('click', () => { enterFullscreen(); continueGame(); });
document.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => {
  settings.difficulty = b.dataset.diff;
  saveSettings();
  refreshMenu();
  Sound.play('select');
}));
document.querySelectorAll('[data-open="rules"]').forEach((b) => b.addEventListener('click', () => { show('rules'); Sound.play('select'); }));
document.querySelectorAll('[data-action="lang"]').forEach((b) => b.addEventListener('click', () => {
  settings.lang = getLang() === 'de' ? 'en' : 'de';
  saveSettings();
  applyLanguage(settings.lang);
}));
$('btn-rules-close').addEventListener('click', () => hide('rules'));
$('btn-pause').addEventListener('click', () => { pause(); Sound.play('select'); });
$('btn-resume').addEventListener('click', resume);
$('btn-sound').addEventListener('click', () => { settings.sound = !settings.sound; Sound.sfxOn = settings.sound; saveSettings(); updateSoundLabel(); Sound.play('select'); });
document.querySelectorAll('[data-action="music"]').forEach((b) => b.addEventListener('click', () => {
  settings.music = !settings.music;
  Sound.setMusic(settings.music);
  saveSettings();
  updateSoundLabel();
  Sound.play('tap');
}));
document.querySelectorAll('[data-open="legend"]').forEach((b) => b.addEventListener('click', () => { Sound.play('page'); hide('menu'); intro.open(0); }));
function toMenu() {
  saveGame();
  G.gameId++;
  G.paused = false; G.over = false; G.mode = 'menu'; G.combat = null; G.anim = null; G.busy = false;
  deselect(); G.spell = null; G.targets = [];
  ['pause', 'gameover', 'spells', 'error'].forEach(hide);
  setBoardHud(false);
  setupPieces();
  refreshMenu();
  show('menu');
  Sound.setTrack('theme');
  keepAwake(false);
}
$('btn-quit').addEventListener('click', toMenu);
$('btn-spell').addEventListener('click', () => {
  if (G.spell) { cancelSpell(); return; }
  if (G.busy || !isHumanTurn()) return;
  openSpellbook();
});
$('btn-spell-close').addEventListener('click', () => { hide('spells'); updateHud(); });
$('btn-again').addEventListener('click', () => newGame(lastStart.vs, lastStart.human));
$('btn-go-menu').addEventListener('click', toMenu);
$('btn-reload').addEventListener('click', () => location.reload());

// ============================================================ title screen & story intro
const intro = initIntro({
  t, units: UNITS, spells: SPELLS, unitCanvas, palFor, renderBoard: renderBoardPreview, sound: Sound,
  onClose: () => {
    settings.introSeen = true;
    saveSettings();
    refreshMenu();
    show('menu');
    Sound.setTrack('theme');
  },
});
function leaveSplash() {
  const sp = $('splash');
  if (sp.classList.contains('hidden') || sp.classList.contains('leaving')) return;
  Sound.unlock();
  Sound.setTrack('theme');
  Sound.play('page');
  sp.classList.add('leaving');
  setTimeout(() => { sp.classList.add('hidden'); sp.classList.remove('leaving'); }, REDUCED_MOTION ? 0 : 450);
  if (settings.introSeen) { refreshMenu(); show('menu'); } else intro.open(0);
}
$('splash').addEventListener('click', leaveSplash);
$('splash').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); leaveSplash(); } });
window.addEventListener('keydown', (e) => { if (!$('splash').classList.contains('hidden') && !e.metaKey && !e.ctrlKey && !e.altKey) leaveSplash(); });
(() => {
  const box = $('splash-emblem');
  for (const [type, side] of [['wizard', 'light'], ['sorceress', 'dark']]) {
    const css = 112, px = Math.round(css * Math.min(2, window.devicePixelRatio || 1));
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    cv.className = `emblem-${side}`;
    cv.getContext('2d').drawImage(unitCanvas(type, side, px), 0, 0);
    box.appendChild(cv);
  }
})();

// ============================================================ boot
applyLanguage(detectLang(settings.lang));
resize();
setupPieces();
refreshMenu();
requestAnimationFrame(frame);
document.documentElement.classList.add('ready');

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch((err) => console.warn('[Archon NEO] service worker:', err)));
}

// Debug/test hook (harmless in production: exposes no secrets, only game state).
window.__archon = { G, newGame, startCombat, UNITS, Sound, version: APP_VERSION };
