'use strict';
/* =====================================================================
   COSMOPOOL — tables
   Stage 1 is the classic table, every later stage is a seeded random
   table: odd shapes, 4-8 pockets, bumpers, blocks, wormholes, gold ball.
   Same seed + stage => exactly the same table (level codes, online).
   ===================================================================== */

// ---------- seeded RNG + level codes ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash32(a, b) {
  let h = (a ^ Math.imul((b + 0x9E3779B1) | 0, 0x85EBCA6B)) >>> 0;
  h = Math.imul(h ^ h >>> 16, 0x7FEB352D);
  h = Math.imul(h ^ h >>> 15, 0x846CA68B);
  return (h ^ h >>> 16) >>> 0;
}
const CODE_ABC = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';           // no 0/O/1/I
function seedToCode(seed, stage) {
  let s = '', v = (seed >>> 0) & 0x3FFFFFFF;
  for (let i = 0; i < 6; i++) { s = CODE_ABC[v & 31] + s; v >>>= 5; }
  return s + '-' + String(stage).padStart(2, '0');
}
function codeToLevel(code) {
  const m = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (m.length < 7 || m.length > 8) return null;
  let v = 0;
  for (const ch of m.slice(0, 6)) { const i = CODE_ABC.indexOf(ch); if (i < 0) return null; v = v * 32 + i; }
  const st = parseInt(m.slice(6), 10);
  if (!(st >= 1 && st <= 99)) return null;
  return { seed: v >>> 0, stage: st };
}

// ---------- geometry helpers ----------
function pointInPoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function segPointDist(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let u = l2 ? ((x - x1) * dx + (y - y1) * dy) / l2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return Math.hypot(x - (x1 + dx * u), y - (y1 + dy * u));
}
function polyDist(poly, x, y) {
  let d = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segPointDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  return d;
}
function mkSeg(x1, y1, x2, y2) { return { x1, y1, x2, y2 }; }

// ---------- palettes ----------
const FELTS = [
  { felt: '#1e7a3c', feltD: '#1a6c35', cush: '#12552a' },   // green
  { felt: '#1e4f9a', feltD: '#1a4588', cush: '#12346a' },   // blue
  { felt: '#5a2a8a', feltD: '#50257a', cush: '#3c1a5e' },   // purple
  { felt: '#8a1e2e', feltD: '#7a1a28', cush: '#5e121c' },   // burgundy
  { felt: '#147a78', feltD: '#126c6a', cush: '#0c5250' },   // teal
  { felt: '#8a5a1e', feltD: '#7a501a', cush: '#5e3c12' },   // copper
  { felt: '#3a4a5e', feltD: '#334254', cush: '#263240' }    // slate
];
const WARP_COLS = [['#3ae0ff', '#1a6a9a'], ['#ff5ae0', '#8a1a7a'], ['#7aff5a', '#2a7a1a']];
const GOLD = 10, GOLD_POINTS = 500;

// table box (felt) for every level, HUD is above it
const BOX = { x0: 24, y0: 66, x1: 232, y1: 196 };

// =====================================================================
//  CLASSIC TABLE (stage 1)
// =====================================================================
function classicLevel() {
  const L = 24, T = 68, RR = 232, B = 194, MX = (L + RR) / 2, MY = (T + B) / 2, CJ = 11, SG = 8.5;
  const pockets = [
    [L - 1, T - 1, 10.5, 'corner'], [MX, T - 4, 8, 'side'], [RR + 1, T - 1, 10.5, 'corner'],
    [L - 1, B + 1, 10.5, 'corner'], [MX, B + 4, 8, 'side'], [RR + 1, B + 1, 10.5, 'corner']
  ].map(([x, y, r, kind]) => ({ x, y, r, kind }));
  const segs = [
    [L + CJ, T, MX - SG, T], [MX + SG, T, RR - CJ, T],
    [L + CJ, B, MX - SG, B], [MX + SG, B, RR - CJ, B],
    [L, T + CJ, L, B - CJ], [RR, T + CJ, RR, B - CJ],
    [L + CJ, T, L + 4, T - 7], [L, T + CJ, L - 7, T + 4],
    [RR - CJ, T, RR - 4, T - 7], [RR, T + CJ, RR + 7, T + 4],
    [L + CJ, B, L + 4, B + 7], [L, B - CJ, L - 7, B - 4],
    [RR - CJ, B, RR - 4, B + 7], [RR, B - CJ, RR + 7, B - 4],
    [MX - SG, T, MX - SG + 2, T - 7], [MX + SG, T, MX + SG - 2, T - 7],
    [MX - SG, B, MX - SG + 2, B + 7], [MX + SG, B, MX + SG - 2, B + 7]
  ].map(a => mkSeg(...a));
  const lv = baseLevel(0, 1, [[L, T], [RR, T], [RR, B], [L, B]], pockets, segs, FELTS[0]);
  lv.classic = true;
  lv.head = { x: L + (RR - L) * 0.25, y: MY };
  // classic triangle rack, order shuffled
  const apex = { x: L + (RR - L) * 0.7, y: MY };
  const rest = [2, 3, 4, 5, 6];
  for (let i = rest.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [rest[i], rest[j]] = [rest[j], rest[i]]; }
  const order = [1, ...rest], dx = 9 * 0.87 + 0.15;
  lv.spawn = [{ num: 0, x: lv.head.x, y: lv.head.y }];
  let k = 0;
  for (let row = 0; row < 3; row++) for (let i = 0; i <= row; i++) lv.spawn.push({ num: order[k++], x: apex.x + row * dx, y: apex.y + (i - row / 2) * 9.1 });
  return lv;
}

function baseLevel(seed, stage, poly, pockets, segs, felt) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  let cx = 0, cy = 0;
  for (const [x, y] of poly) { cx += x; cy += y; }
  cx /= poly.length; cy /= poly.length;
  if (!pointInPoly(poly, cx, cy)) { cx = (x0 + x1) / 2; cy = (y0 + y1) / 2; }
  return {
    seed, stage, classic: false, poly, pockets, segs, felt,
    blocks: [], bumpers: [], warps: [], spawn: [], head: { x: cx, y: cy },
    bbox: { x0, y0, x1, y1 }, cx, cy, t: 0, grid: null
  };
}

// spatial grid so physics only tests nearby cushions
const CELL = 16, GW = 17, GH = 16;
function buildGrid(lv) {
  const grid = Array.from({ length: GW * GH }, () => []);
  lv.segs.forEach((s, i) => {
    const m = 7;
    const cx0 = Math.max(0, Math.floor((Math.min(s.x1, s.x2) - m) / CELL)), cx1 = Math.min(GW - 1, Math.floor((Math.max(s.x1, s.x2) + m) / CELL));
    const cy0 = Math.max(0, Math.floor((Math.min(s.y1, s.y2) - m) / CELL)), cy1 = Math.min(GH - 1, Math.floor((Math.max(s.y1, s.y2) + m) / CELL));
    for (let gy = cy0; gy <= cy1; gy++) for (let gx = cx0; gx <= cx1; gx++) grid[gy * GW + gx].push(s);
  });
  lv.grid = grid;
}
function cellSegs(lv, x, y) {
  const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return lv.segs;
  return lv.grid[gy * GW + gx];
}

// =====================================================================
//  RANDOM TABLES
// =====================================================================
const SHAPES = ['rect', 'octagon', 'hexagon', 'parallelogram', 'lshape', 'cross', 'hourglass', 'oval', 'tshape', 'rooms'];

function shapePoly(kind, rng) {
  const r = (a, b) => a + rng() * (b - a);
  switch (kind) {
    case 'rect': return [[0, 0], [1, 0], [1, 1], [0, 1]];
    case 'octagon': { const c = r(0.14, 0.24), cy = c * 1.6; return [[c, 0], [1 - c, 0], [1, cy], [1, 1 - cy], [1 - c, 1], [c, 1], [0, 1 - cy], [0, cy]]; }
    case 'hexagon': { const k = r(0.13, 0.22); return [[k, 0], [1 - k, 0], [1, 0.5], [1 - k, 1], [k, 1], [0, 0.5]]; }
    case 'parallelogram': { const k = r(0.12, 0.2); return rng() < 0.5 ? [[k, 0], [1, 0], [1 - k, 1], [0, 1]] : [[0, 0], [1 - k, 0], [1, 1], [k, 1]]; }
    case 'lshape': {
      const a = r(0.38, 0.5), b = r(0.42, 0.55), c = (rng() * 4) | 0;
      const p = [[0, 0], [1, 0], [1, 1 - b], [1 - a, 1 - b], [1 - a, 1], [0, 1]];
      return p.map(([x, y]) => [c & 1 ? 1 - x : x, c & 2 ? 1 - y : y]);
    }
    case 'cross': { const a = r(0.22, 0.3), b = r(0.24, 0.32); return [[a, 0], [1 - a, 0], [1 - a, b], [1, b], [1, 1 - b], [1 - a, 1 - b], [1 - a, 1], [a, 1], [a, 1 - b], [0, 1 - b], [0, b], [a, b]]; }
    case 'hourglass': { const d = r(0.18, 0.26), w = r(0.14, 0.2); return [[0, 0], [0.5 - w, 0], [0.5, d], [0.5 + w, 0], [1, 0], [1, 1], [0.5 + w, 1], [0.5, 1 - d], [0.5 - w, 1], [0, 1]]; }
    case 'oval': { const n = 20, p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5]); } return p; }
    case 'tshape': {
      const a = r(0.26, 0.34), b = r(0.4, 0.5), flip = rng() < 0.5;
      const p = [[0, 0], [1, 0], [1, b], [1 - a, b], [1 - a, 1], [a, 1], [a, b], [0, b]];
      return flip ? p.map(([x, y]) => [x, 1 - y]) : p;
    }
    default: return [[0, 0], [1, 0], [1, 1], [0, 1]];
  }
}

function buildLevel(seed, stage) {
  if (!seed) return classicLevel();
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < 40; attempt++) {
    const lv = tryLevel(rng, seed, stage);
    if (lv) return lv;
  }
  const lv = classicLevel();                       // extremely unlikely fallback
  lv.seed = seed; lv.stage = stage; lv.felt = FELTS[seed % FELTS.length];
  return lv;
}

const LV_FAIL = {};
function lvFail(why, kind) { const k = why + ':' + kind; LV_FAIL[k] = (LV_FAIL[k] || 0) + 1; return null; }
function tryLevel(rng, seed, stage) {
  const r = (a, b) => a + rng() * (b - a);
  const kind = SHAPES[(rng() * SHAPES.length) | 0];
  // size + placement of the shape inside the table box
  const bw = BOX.x1 - BOX.x0, bh = BOX.y1 - BOX.y0;
  const big = kind === 'cross' || kind === 'lshape' || kind === 'tshape' || kind === 'oval' || kind === 'hourglass';
  const w = bw * (big ? r(0.92, 1) : r(0.8, 1)), h = bh * (big ? r(0.92, 1) : r(0.8, 1));
  const ox = BOX.x0 + (bw - w) * rng(), oy = BOX.y0 + (bh - h) * rng();
  const poly = shapePoly(kind, rng).map(([x, y]) => [Math.round(ox + x * w), Math.round(oy + y * h)]);

  // ---- pockets: candidates on convex corners and along long edges ----
  const n = poly.length, cands = [];
  const inside = (x, y) => pointInPoly(poly, x, y);
  const edgeLen = i => { const a = poly[i], b = poly[(i + 1) % n]; return Math.hypot(b[0] - a[0], b[1] - a[1]); };
  const outward = i => {                               // outward unit normal of edge i
    const a = poly[i], b = poly[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    let nx = dy / l, ny = -dx / l;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (inside(mx + nx * 2, my + ny * 2)) { nx = -nx; ny = -ny; }
    return [nx, ny];
  };
  for (let i = 0; i < n; i++) {
    const v = poly[i], p = poly[(i - 1 + n) % n], q = poly[(i + 1) % n];
    const ux = (p[0] - v[0]) / Math.hypot(p[0] - v[0], p[1] - v[1]), uy = (p[1] - v[1]) / Math.hypot(p[0] - v[0], p[1] - v[1]);
    const wx = (q[0] - v[0]) / Math.hypot(q[0] - v[0], q[1] - v[1]), wy = (q[1] - v[1]) / Math.hypot(q[0] - v[0], q[1] - v[1]);
    const bx = ux + wx, by = uy + wy, bl = Math.hypot(bx, by) || 1;
    if (!inside(v[0] + bx / bl * 2, v[1] + by / bl * 2)) continue;          // reflex corner
    const ang = Math.acos(Math.max(-1, Math.min(1, ux * wx + uy * wy))) * 180 / Math.PI;
    if (edgeLen((i - 1 + n) % n) < 26 || edgeLen(i) < 26) continue;
    if (ang < 55) continue;
    cands.push({ type: ang < 118 ? 'corner' : 'vside', vi: i, x: v[0], y: v[1], ox: -bx / bl, oy: -by / bl, w: ang < 118 ? 3 : 1.5 });
  }
  for (let i = 0; i < n; i++) {
    const L = edgeLen(i);
    if (L < 52) continue;
    const a = poly[i], b = poly[(i + 1) % n], [nx, ny] = outward(i);
    const ts = L > 150 ? [1 / 3, 2 / 3, 0.5] : [0.5];
    for (const tt of ts) cands.push({ type: 'side', ei: i, t: tt, x: a[0] + (b[0] - a[0]) * tt, y: a[1] + (b[1] - a[1]) * tt, ox: nx, oy: ny, w: tt === 0.5 ? 1.4 : 0.8 });
  }
  const want = Math.min(8, 4 + Math.floor(rng() * Math.min(5, 1 + stage / 2)));
  const picked = [];
  const pool = cands.slice();
  while (picked.length < want && pool.length) {
    let tot = 0; for (const c of pool) tot += c.w;
    let x = rng() * tot, i = 0;
    for (; i < pool.length - 1; i++) { x -= pool[i].w; if (x <= 0) break; }
    const c = pool.splice(i, 1)[0];
    if (picked.every(o => Math.hypot(o.x - c.x, o.y - c.y) > 46)) picked.push(c);
  }
  if (picked.length < 4) return lvFail('pockets', kind);

  const shrink = Math.max(0.86, 1 - 0.012 * (stage - 2));
  const pockets = [];
  // gaps per edge, as [tStart, tEnd] along edge i (from poly[i] to poly[i+1])
  const gaps = Array.from({ length: n }, () => []);
  const jaws = [];
  const addGap = (ei, t0, t1, toward, jawIn) => {
    gaps[ei].push([t0, t1]);
    const a = poly[ei], b = poly[(ei + 1) % n], L = edgeLen(ei), [nx, ny] = outward(ei);
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    for (const [tt, sgn] of [[t0, 1], [t1, -1]]) {
      if (tt <= 0.0001 || tt >= 0.9999) continue;                           // the vertex side has no jaw
      const px = a[0] + (b[0] - a[0]) * tt, py = a[1] + (b[1] - a[1]) * tt;
      jaws.push(mkSeg(px, py, px + nx * 7 + ux * sgn * jawIn, py + ny * 7 + uy * sgn * jawIn));
    }
  };
  for (const c of picked) {
    if (c.type === 'corner' || c.type === 'vside') {
      const corner = c.type === 'corner', gl = corner ? 11 : 8.5;
      const ei = c.vi, ep = (c.vi - 1 + n) % n;
      addGap(ei, 0, gl / edgeLen(ei), 0, corner ? 7 : 2);
      addGap(ep, 1 - gl / edgeLen(ep), 1, 0, corner ? 7 : 2);
      pockets.push({ x: c.x + c.ox * (corner ? 1.4 : 4), y: c.y + c.oy * (corner ? 1.4 : 4), r: (corner ? 10.5 : 8) * shrink, kind: corner ? 'corner' : 'side' });
    } else {
      const L = edgeLen(c.ei), g = 8.5 / L;
      addGap(c.ei, c.t - g, c.t + g, 0, 2);
      pockets.push({ x: c.x + c.ox * 4, y: c.y + c.oy * 4, r: 8 * shrink, kind: 'side' });
    }
  }
  // cushion segments = edges minus gaps
  const segs = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const gs = gaps[i].sort((p, q) => p[0] - q[0]);
    let t0 = 0;
    for (const [g0, g1] of gs) {
      if (g0 > t0 + 0.001) segs.push(mkSeg(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, a[0] + (b[0] - a[0]) * g0, a[1] + (b[1] - a[1]) * g0));
      t0 = Math.max(t0, g1);
    }
    if (t0 < 0.999) segs.push(mkSeg(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, b[0], b[1]));
  }
  segs.push(...jaws);

  const felt = FELTS[1 + ((seed >>> 3) % (FELTS.length - 1))];
  const lv = baseLevel(seed, stage, poly, pockets, segs, felt);
  lv.shape = kind;
  const wallDist = (x, y) => { let d = 1e9; for (const s of lv.segs) d = Math.min(d, segPointDist(x, y, s.x1, s.y1, s.x2, s.y2)); return d; };
  const clearOf = (x, y, rad) => inside(x, y) && wallDist(x, y) > rad &&
    lv.pockets.every(p => Math.hypot(p.x - x, p.y - y) > p.r + rad) &&
    lv.bumpers.every(m => Math.hypot(m.ox - x, m.oy - y) > m.r + Math.abs(m.ax) + Math.abs(m.ay) + rad) &&
    lv.blocks.every(bk => !pointInPoly(bk, x, y) && polyDist(bk, x, y) > rad) &&
    lv.warps.every(w => Math.hypot(w.a.x - x, w.a.y - y) > rad + 6 && Math.hypot(w.b.x - x, w.b.y - y) > rad + 6);
  const randIn = (rad, tries = 80) => {
    for (let k = 0; k < tries; k++) {
      const x = lv.bbox.x0 + rng() * (lv.bbox.x1 - lv.bbox.x0), y = lv.bbox.y0 + rng() * (lv.bbox.y1 - lv.bbox.y0);
      if (clearOf(x, y, rad)) return { x, y };
    }
    return null;
  };

  // middle "sink hole" pocket sometimes
  if (stage >= 3 && rng() < 0.3) { const s = randIn(30); if (s) lv.pockets.push({ x: s.x, y: s.y, r: 7 * shrink, kind: 'hole' }); }

  // a dividing wall with a doorway ("two rooms")
  if (kind === 'rooms') {
    const x = Math.round(lv.cx + r(-20, 20)), gap0 = r(0.35, 0.45), gap1 = gap0 + r(0.2, 0.26);
    const y0 = lv.bbox.y0, y1 = lv.bbox.y1, ya = y0 + (y1 - y0) * gap0, yb = y0 + (y1 - y0) * gap1;
    for (const [a, b] of [[y0 - 1, ya], [yb, y1 + 1]]) lv.blocks.push([[x - 2, a], [x + 2, a], [x + 2, b], [x - 2, b]]);
  }

  // ---- obstacles: bumpers, blocks, wormholes ----
  const budget = Math.min(6, 1 + Math.floor((stage - 2) / 2));
  let warps = 0;
  for (let k = 0; k < budget; k++) {
    const roll = rng();
    if (roll < 0.5) {
      const rad = r(4.5, 7);
      const moving = stage >= 6 && rng() < 0.4;
      const ax = moving ? (rng() < 0.5 ? r(10, 22) : 0) : 0, ay = moving && !ax ? r(8, 16) : 0;
      const s = randIn(rad + 16 + ax + ay);
      if (s) lv.bumpers.push({ ox: s.x, oy: s.y, x: s.x, y: s.y, r: rad, ax, ay, w: r(1.2, 2.2), ph: r(0, 6.28), flash: 0 });
    } else if (roll < 0.85 || warps || stage < 4) {
      const s = randIn(30);
      if (!s) continue;
      const t = rng(), ang = [0, Math.PI / 4, Math.PI / 2, -Math.PI / 4][(rng() * 4) | 0];
      const hw = t < 0.5 ? r(4, 8) : r(12, 20), hh = t < 0.5 ? r(4, 8) : 2.5;
      const c = Math.cos(ang), sn = Math.sin(ang);
      lv.blocks.push([[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [Math.round(s.x + x * c - y * sn), Math.round(s.y + x * sn + y * c)]));
    } else {
      const a = randIn(18), b = a && randIn(18);
      if (a && b && Math.hypot(a.x - b.x, a.y - b.y) > 70) { lv.warps.push({ a, b, col: WARP_COLS[warps % 3] }); warps++; }
    }
  }
  for (const bk of lv.blocks) for (let i = 0, j = bk.length - 1; i < bk.length; j = i++) lv.segs.push(mkSeg(bk[j][0], bk[j][1], bk[i][0], bk[i][1]));
  buildGrid(lv);

  // ---- balls ----
  const nb = Math.min(9, 6 + Math.floor((stage - 2) / 3));
  const nums = []; for (let i = 1; i <= nb; i++) nums.push(i);
  if (stage >= 2 && rng() < 0.3) nums.push(GOLD);
  const spawn = [];
  const freeBall = (x, y, rad) => clearOf(x, y, rad) && spawn.every(o => Math.hypot(o.x - x, o.y - y) > 9 + 2);
  // cue ball spot, preferring the left side
  let head = null;
  for (let k = 0; k < 120 && !head; k++) {
    const x = lv.bbox.x0 + rng() * (lv.bbox.x1 - lv.bbox.x0) * (k < 60 ? 0.4 : 1), y = lv.bbox.y0 + rng() * (lv.bbox.y1 - lv.bbox.y0);
    if (clearOf(x, y, 12)) head = { x, y };
  }
  if (!head) return lvFail('head', kind);
  lv.head = head;
  spawn.push({ num: 0, x: head.x, y: head.y });
  // clustered triangle sometimes, otherwise scattered
  let placed = false;
  if (rng() < 0.45) {
    for (let k = 0; k < 30 && !placed; k++) {
      const ap = randIn(14);
      if (!ap || Math.hypot(ap.x - head.x, ap.y - head.y) < 60) continue;
      const dir = Math.atan2(ap.y - head.y, ap.x - head.x), ca = Math.cos(dir), sa = Math.sin(dir);
      const pos = [];
      let row = 0, idx = 0;
      while (pos.length < nums.length) {
        for (let i = 0; i <= row && pos.length < nums.length; i++, idx++) {
          const fx = row * 8, fy = (i - row / 2) * 9.2;
          pos.push({ x: ap.x + fx * ca - fy * sa, y: ap.y + fx * sa + fy * ca });
        }
        row++;
      }
      if (pos.every(p => clearOf(p.x, p.y, 6))) {
        const order = nums.slice();
        for (let i = order.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
        pos.forEach((p, i) => spawn.push({ num: order[i], x: p.x, y: p.y }));
        placed = true;
      }
    }
  }
  if (!placed) {
    for (const num of nums) {
      let ok = null;
      for (let k = 0; k < 200 && !ok; k++) {
        const x = lv.bbox.x0 + rng() * (lv.bbox.x1 - lv.bbox.x0), y = lv.bbox.y0 + rng() * (lv.bbox.y1 - lv.bbox.y0);
        if (freeBall(x, y, 7) && Math.hypot(x - head.x, y - head.y) > 24) ok = { x, y };
      }
      if (!ok) return lvFail('scatter', kind);
      spawn.push({ num, x: ok.x, y: ok.y });
    }
  }
  lv.spawn = spawn;
  // ---- every object ball must have a clear line into some pocket ----
  for (const b of spawn) if (b.num && !lv.pockets.some(p => clearLine(lv, spawn, b, p))) return lvFail('line', kind);
  return lv;
}

function clearLine(lv, balls, b, p) {
  const dx = p.x - b.x, dy = p.y - b.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  // ghost ball spot behind the ball must be on the felt
  const gx = b.x - ux * 9, gy = b.y - uy * 9;
  if (!pointInPoly(lv.poly, gx, gy) || lv.blocks.some(bk => pointInPoly(bk, gx, gy))) return false;
  // other balls don't count (they move); walls, blocks and bumpers do
  for (let d = 2; d < L - p.r - 7; d += 2) {
    const x = b.x + ux * d, y = b.y + uy * d;
    if (!pointInPoly(lv.poly, x, y)) return false;
    for (const s of lv.segs) if (segPointDist(x, y, s.x1, s.y1, s.x2, s.y2) < 4.2) return false;
    for (const m of lv.bumpers) if (Math.hypot(m.ox - x, m.oy - y) < m.r + 4.5) return false;
  }
  return true;
}

function levelBalls(lv) { return lv.spawn.map(s => ({ num: s.num, x: s.x, y: s.y, vx: 0, vy: 0, in: false, lock: null })); }
function prepLevel(lv) { if (!lv.grid) buildGrid(lv); return lv; }

// Is (x,y) a free resting spot for a ball?
function spotFree(lv, balls, x, y, ignore) {
  if (!pointInPoly(lv.poly, x, y)) return false;
  if (lv.blocks.some(bk => pointInPoly(bk, x, y))) return false;
  for (const s of cellSegs(lv, x, y)) if (segPointDist(x, y, s.x1, s.y1, s.x2, s.y2) < 5.5) return false;
  if (lv.pockets.some(p => Math.hypot(p.x - x, p.y - y) < p.r + 4)) return false;
  if (lv.bumpers.some(m => Math.hypot(m.x - x, m.y - y) < m.r + 6.5)) return false;
  if (lv.warps.some(w => Math.hypot(w.a.x - x, w.a.y - y) < 9 || Math.hypot(w.b.x - x, w.b.y - y) < 9)) return false;
  return balls.every(o => o === ignore || o.in || Math.hypot(o.x - x, o.y - y) > 9.5);
}

// =====================================================================
//  TABLE IMAGE (rails, felt, cushions, blocks, pockets with nets)
// =====================================================================
function buildTableImg(lv) {
  const c = makeCanvas(W, H), x = c.getContext('2d');
  const F = lv.felt, poly = lv.poly;
  const RAIL = '#8c4a1e', RAILL = '#c9783a', RAILD = '#3c1a08', RAILM = '#7a3e18';
  const bx0 = Math.max(0, Math.floor(lv.bbox.x0 - 16)), bx1 = Math.min(W, Math.ceil(lv.bbox.x1 + 16));
  const by0 = Math.max(0, Math.floor(lv.bbox.y0 - 16)), by1 = Math.min(H, Math.ceil(lv.bbox.y1 + 16));
  const img = x.createImageData(W, H), d = img.data;
  const put = (px, py, hex) => { const n = parseInt(hex.slice(1), 16), o = (py * W + px) * 4; d[o] = n >> 16; d[o + 1] = (n >> 8) & 255; d[o + 2] = n & 255; d[o + 3] = 255; };
  for (let py = by0; py < by1; py++) for (let px = bx0; px < bx1; px++) {
    const cx = px + 0.5, cy = py + 0.5;
    const inT = pointInPoly(poly, cx, cy);
    const dist = polyDist(poly, cx, cy);
    if (inT) {
      let inBlock = false, bd = 1e9;
      for (const bk of lv.blocks) { if (pointInPoly(bk, cx, cy)) inBlock = true; bd = Math.min(bd, polyDist(bk, cx, cy)); }
      if (inBlock) { put(px, py, bd < 1.1 ? RAILL : ((px + py) % 4 === 0 ? RAILM : RAIL)); continue; }
      if (dist < 2 || bd < 2) put(px, py, F.cush);
      else put(px, py, (py % 2 === 0 && (px + (py / 2 % 2) * 2) % 4 === 0) ? F.feltD : F.felt);
    } else if (dist <= 14) {
      let col = RAIL;
      if (dist < 1.2) col = RAILD;
      else if (dist < 2.4) col = RAILL;
      else if (dist > 13) col = RAILD;
      else if (dist > 12) col = RAILM;
      else if ((px * 3 + py * 5) % 11 === 0) col = RAILM;
      put(px, py, col);
    }
  }
  x.putImageData(img, 0, 0);
  // pockets with nets
  for (const p of lv.pockets) {
    const px = Math.round(p.x), py = Math.round(p.y);
    const rr = p.kind === 'corner' ? 7.5 : p.kind === 'hole' ? 6 : 6.5;
    fillCircle(x, px, py, rr + 1.5, '#4a4a52');
    fillCircle(x, px, py, rr, '#000');
    for (let yy = -8; yy <= 8; yy++) for (let xx = -8; xx <= 8; xx++) {
      if (xx * xx + yy * yy > (rr - 0.6) * (rr - 0.6)) continue;
      if (!(((xx + yy + 64) % 3 === 0) || ((xx - yy + 64) % 3 === 0))) continue;
      x.fillStyle = yy > 2 ? '#5a5a66' : yy > -2 ? '#8a8a96' : '#b8b8c4';
      x.fillRect(px + xx, py + yy, 1, 1);
    }
    x.fillStyle = '#d8d8e0';
    for (let a = 0; a < 20; a++) { const an = a / 20 * Math.PI * 2; x.fillRect(Math.round(px + Math.cos(an) * rr), Math.round(py + Math.sin(an) * rr), 1, 1); }
  }
  if (lv.classic) {
    const L = 24, T = 68, RR = 232, B = 194;
    x.fillStyle = '#f4e6b0';
    for (const k of [1, 2, 3, 5, 6, 7]) { const dx = Math.round(L + (RR - L) * k / 8); x.fillRect(dx, T - 8, 2, 1); x.fillRect(dx, B + 7, 2, 1); }
    for (const k of [1, 2, 3]) { const dy = Math.round(T + (B - T) * k / 4); x.fillRect(L - 8, dy, 1, 2); x.fillRect(RR + 7, dy, 1, 2); }
  }
  return c;
}

// dynamic table parts: bumpers + wormholes
function drawLevelFx(lv, ctx, time) {
  for (const w of lv.warps) {
    for (const p of [w.a, w.b]) {
      for (let i = 0; i < 18; i++) {
        const rr = 2 + (i % 6) * 1.1, a = time * (3.4 - rr * 0.3) * (p === w.a ? 1 : -1) + i * 2.1;
        ctx.fillStyle = i % 3 ? w.col[1] : w.col[0];
        ctx.fillRect(Math.round(p.x + Math.cos(a) * rr), Math.round(p.y + Math.sin(a) * rr), 1, 1);
      }
      fillCircle(ctx, Math.round(p.x), Math.round(p.y), 1.5, '#000');
    }
  }
  for (const m of lv.bumpers) {
    const x = Math.round(m.x), y = Math.round(m.y), fl = m.flash > 0;
    fillCircle(ctx, x, y + 1, m.r, 'rgba(0,0,0,0.35)');
    fillCircle(ctx, x, y, m.r, fl ? '#ffffff' : '#c83a8a');
    fillCircle(ctx, x, y, m.r - 1.5, fl ? '#ffd84a' : '#ff6ac0');
    fillCircle(ctx, x, y, Math.max(1, m.r - 3.5), fl ? '#ffffff' : '#ffd0ea');
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 2, 1, 1);
  }
}
