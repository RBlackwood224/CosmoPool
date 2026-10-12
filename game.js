'use strict';
/* =====================================================================
   COSMOPOOL — retro pixel-art pool inspired by 8-bit arcade pool games
   Modes: 1P vs CPU, local 2P, online 1v1 (PeerJS), endless practice.
   Files: level.js (tables), net.js (online), game.js (everything else)
   No personal data is stored or sent: records and settings stay in the
   player's own browser (localStorage).
   ===================================================================== */

// ---------- Screen (internal pixels, NES-like 256x240) ----------
const W = 256, H = 240;
const R = 4.5, D = 9;                       // ball radius / diameter
const MORE_GAMES_URL = 'https://github.com/RBlackwood224';
let LV = null;                              // current table (see level.js)
// View: normal = 256x240 NES screen. Wide = phones held sideways: the canvas
// fills the whole screen, the HUD moves to HTML side panels and the table
// (world) is drawn bigger in the middle.
const VIEW = { wide: false, w: 256, h: 240, ox: 0, oy: 0 };

// ---------- Physics ----------
const DT = 1 / 240;
// knobs that card effects can change for the shooting player
const PHYS0 = { decel: 95, damp: 0.35, ew: 0.72, pocketMul: 1, magnet: false, wind: null, hole: false, curve: 0, ghost: false, powerMul: 1, meterMul: 1 };
const phys = { ...PHYS0 };
const EB = 0.95;            // ball-ball bounciness
const MAXV = 440;           // full-power shot speed (px/s)
const START_LIVES = 3;
const POINTS_PER_BALL = 100;
const POWER_SPEED = 1.35;   // power meter sweeps per second (0 -> 1)
const POWER_MIN = 0.08;
const STAR_DIST = 20;       // default aiming star distance from the cue ball
const STAR_MIN = 12, STAR_MAX = 70;   // the star can be pushed out / pulled in
const SOLO_MISSES = 3;      // practice mode: this many misses in a row cost a life

// ---------- Language ----------
const LANG = {
  en: {
    title: 'COSMOPOOL', vsCpu: '1 PLAYER VS CPU', twoP: '2 PLAYERS', online: 'ONLINE 1V1', solo: 'PRACTICE (ENDLESS)',
    toplist: 'TOP 10', levelCode: 'LEVEL CODE', settings: 'SETTINGS', moreGames: 'MORE GAMES',
    language: 'LANGUAGE', difficulty: 'DIFFICULTY', easy: 'EASY', medium: 'MEDIUM', hard: 'HARD',
    back: 'BACK', paused: 'PAUSED', resume: 'RESUME', mainMenu: 'MAIN MENU', again: 'PLAY AGAIN',
    shot: 'SHOT', cpu: 'CPU', stage: 'STAGE {n}', stageHud: 'STAGE', hiHud: 'HI', power: 'POWER', missHud: 'MISS',
    scratch: 'SCRATCH! -1 LIFE', perfect: 'FULL RUN! +1 LIFE', toShoot: '{p} TO SHOOT', missLife: '3 MISSES! -1 LIFE',
    thinking: '{p} THINKING...', wins: '{p} WINS!', gameOver: 'GAME OVER', newHi: 'NEW HIGH SCORE!', hiscore: 'HIGH SCORE {n}',
    helpLine: 'AIM LINE: {v}', on: 'ON', off: 'OFF', cardsOpt: 'CARDS: {v}', musicVol: 'MUSIC', sfxVol: 'SOUND FX',
    cardFor: '{p} PICKS A CARD', bless: 'BLESSING', curse: 'CURSE', shotsN: '{n} SHOTS', turnsN: '{n} TURNS', instant: 'INSTANT',
    picked: '{p}: {c}', goblinMsg: 'THE POINT GOBLIN IS HERE!', prankMsg: 'HEY! A GOBLIN ON THE TABLE!', shooHint: 'MASH SHOT TO SCARE HIM!', duelKeys2p: 'P1: SPACE   P2: ENTER', padA: 'A BUTTON', keySpace: 'SPACE', sideL: 'LEFT', sideR: 'RIGHT', tap: 'TAP', join2pTitle: 'WHO PLAYS WITH WHAT?', join2pHint: 'EACH PLAYER PRESSES A BUTTON ON THEIR OWN CONTROLLER (A), THE KEYBOARD (SPACE) OR TAPS THE SCREEN', pressAny: 'PRESS A BUTTON...', devPad: 'CONTROLLER {n}', devKb: 'KEYBOARD', devTouch: 'TOUCH SCREEN', startGame: 'START', rejoin: 'START OVER', duelTouch2p: 'P1: LEFT SIDE  P2: RIGHT SIDE', goblinName: 'GOBLIN', duelFar: '{p} WINS! FAR AWAY IT GOES!', duelDraw: 'DRAW! JUST A NUDGE', shooed: 'GOBLIN SCARED AWAY!',
    saved: 'SECOND CHANCE!', extraUsed: 'ANOTHER CHANCE!', quakeMsg: 'EARTHQUAKE!', toYou: 'SELF', toEnemy: 'ON {p}',
    goldMsg: 'GOLD BALL! +500', cleared: 'TABLE CLEARED!', combo2: 'DOUBLE!', combo3: 'TRIPLE!', comboN: 'SUPER x{n}!',
    codeLabel: 'LEVEL CODE: {c}', codeEnter: 'TYPE A LEVEL CODE', codeOk: 'USE CODE', codeBad: 'INVALID CODE', codeSet: 'NEXT GAME STARTS ON {c}', codeClear: 'CLEAR CODE',
    stPots: 'BALLS', stRun: 'BEST RUN', stScr: 'SCRATCHES', stShoo: 'GOBLINS SHOOED', stCombo: 'BEST COMBO', stStage: 'STAGE', score: 'SCORE',
    newRecord: 'NEW RECORD! {p}', enterName: 'ENTER YOUR NAME', topEmpty: 'NO RECORDS YET', ok: 'OK',
    mSolo: 'SOLO', mCpu: 'CPU', m2p: '2P', mOnline: 'ONLINE',
    host: 'HOST A GAME', join: 'JOIN A GAME', hostWait: 'WAITING FOR PLAYER 2...', yourCode: 'GAME CODE', copyLink: 'COPY INVITE LINK', copied: 'COPIED!',
    joinCode: 'TYPE THE GAME CODE', connect: 'CONNECT', connecting: 'CONNECTING...', netFail: 'COULD NOT CONNECT', netLost: 'CONNECTION LOST',
    netNoLib: 'ONLINE SERVICE NOT AVAILABLE', youAre: 'YOU ARE {p}', waitHost: 'CONNECTED! STARTING...', cancel: 'CANCEL',
    controls: 'THE POWER METER RUNS ALL THE TIME\nPRESS ONCE TO SHOOT AT THAT POWER\nKEYBOARD: ←→ AIM, ↑↓ STAR FURTHER / CLOSER\nSHIFT = SLOW, SPACE SHOOTS\nMOUSE: THE STAR FOLLOWS THE MOUSE, CLICK SHOOTS\nTOUCH: SLIDE A FINGER ANYWHERE TO MOVE THE STAR, SHOT BUTTON\nCONTROLLER: STICK / D-PAD ◀▶ AIM, ▲▼ STAR\nLB / RB = FINE AIM, A SHOOTS\nESC: PAUSE',
    rotate: 'TIP: TURN YOUR PHONE SIDEWAYS', fullscreen: 'FULL SCREEN', pressStart: 'PRESS ANY KEY'
  },
  hu: {
    title: 'COSMOPOOL', vsCpu: '1 JÁTÉKOS A GÉP ELLEN', twoP: '2 JÁTÉKOS', online: 'ONLINE 1V1', solo: 'GYAKORLÓ (VÉGTELEN)',
    toplist: 'TOPLISTA', levelCode: 'PÁLYAKÓD', settings: 'BEÁLLÍTÁSOK', moreGames: 'TÖBB JÁTÉK',
    language: 'NYELV', difficulty: 'NEHÉZSÉG', easy: 'KÖNNYŰ', medium: 'KÖZEPES', hard: 'NEHÉZ',
    back: 'VISSZA', paused: 'SZÜNET', resume: 'FOLYTATÁS', mainMenu: 'FŐMENÜ', again: 'ÚJ JÁTÉK',
    shot: 'LÖVÉS', cpu: 'GÉP', stage: '{n}. PÁLYA', stageHud: 'PÁLYA', hiHud: 'REK', power: 'ERŐ', missHud: 'HIBA',
    scratch: 'FEHÉR BEESETT! -1 ÉLET', perfect: 'TISZTA SOR! +1 ÉLET', toShoot: '{p} JÖN', missLife: '3 HIBA! -1 ÉLET',
    thinking: '{p} GONDOLKODIK...', wins: '{p} NYERT!', gameOver: 'JÁTÉK VÉGE', newHi: 'ÚJ REKORD!', hiscore: 'REKORD: {n}',
    helpLine: 'SEGÍTŐ VONAL: {v}', on: 'BE', off: 'KI', cardsOpt: 'KÁRTYÁK: {v}', musicVol: 'ZENE', sfxVol: 'EFFEKTEK',
    cardFor: '{p} KÁRTYÁT VÁLASZT', bless: 'ÁLDÁS', curse: 'ÁTOK', shotsN: '{n} LÖVÉS', turnsN: '{n} KÖR', instant: 'AZONNALI',
    picked: '{p}: {c}', goblinMsg: 'ITT A PONTLOPÓ MANÓ!', prankMsg: 'HÉ! MANÓ AZ ASZTALON!', shooHint: 'NYOMKODD A LÖVÉST!', duelKeys2p: 'P1: SZÓKÖZ   P2: ENTER', padA: 'A GOMB', keySpace: 'SZÓKÖZ', sideL: 'BAL OLDAL', sideR: 'JOBB OLDAL', tap: 'KOPPINTÁS', join2pTitle: 'KI MIVEL JÁTSZIK?', join2pHint: 'MINDENKI NYOMJA MEG A SAJÁT KONTROLLERÉN AZ A GOMBOT, VAGY A SZÓKÖZT, VAGY KOPPINTSON A KÉPERNYŐRE', pressAny: 'NYOMJ MEG EGY GOMBOT...', devPad: '{n}. KONTROLLER', devKb: 'BILLENTYŰZET', devTouch: 'ÉRINTŐKÉPERNYŐ', startGame: 'INDÍTÁS', rejoin: 'ÚJRAKEZDÉS', duelTouch2p: 'P1: BAL OLDAL  P2: JOBB OLDAL', goblinName: 'MANÓ', duelFar: '{p} NYERT! MESSZIRE TOLJA!', duelDraw: 'DÖNTETLEN! CSAK EGY KICSIT', shooed: 'ELZAVARTAD A MANÓT!',
    saved: 'MÁSODIK ESÉLY!', extraUsed: 'MÉG EGY ESÉLY!', quakeMsg: 'FÖLDRENGÉS!', toYou: 'MAGADNAK', toEnemy: '{p} KAPJA',
    goldMsg: 'ARANYGOLYÓ! +500', cleared: 'ASZTAL KÉSZ!', combo2: 'DUPLA!', combo3: 'TRIPLA!', comboN: 'SZUPER x{n}!',
    codeLabel: 'PÁLYAKÓD: {c}', codeEnter: 'ÍRD BE A PÁLYAKÓDOT', codeOk: 'KÓD HASZNÁLATA', codeBad: 'HIBÁS KÓD', codeSet: 'A KÖVETKEZŐ JÁTÉK ITT INDUL: {c}', codeClear: 'KÓD TÖRLÉSE',
    stPots: 'GOLYÓ', stRun: 'LEGJOBB SOR', stScr: 'FEHÉR BEESETT', stShoo: 'ELZAVART MANÓ', stCombo: 'LEGJOBB KOMBÓ', stStage: 'PÁLYA', score: 'PONT',
    newRecord: 'ÚJ REKORD! {p}', enterName: 'ÍRD BE A NEVED', topEmpty: 'MÉG NINCS REKORD', ok: 'OK',
    mSolo: 'EGYEDÜL', mCpu: 'GÉP', m2p: '2J', mOnline: 'ONLINE',
    host: 'JÁTÉK INDÍTÁSA', join: 'CSATLAKOZÁS', hostWait: 'VÁRAKOZÁS A 2. JÁTÉKOSRA...', yourCode: 'JÁTÉKKÓD', copyLink: 'MEGHÍVÓ LINK MÁSOLÁSA', copied: 'MÁSOLVA!',
    joinCode: 'ÍRD BE A JÁTÉKKÓDOT', connect: 'CSATLAKOZÁS', connecting: 'KAPCSOLÓDÁS...', netFail: 'NEM SIKERÜLT KAPCSOLÓDNI', netLost: 'MEGSZAKADT A KAPCSOLAT',
    netNoLib: 'AZ ONLINE SZOLGÁLTATÁS NEM ÉRHETŐ EL', youAre: 'TE VAGY: {p}', waitHost: 'KAPCSOLÓDVA! INDUL...', cancel: 'MÉGSE',
    controls: 'AZ ERŐMÉRŐ FOLYAMATOSAN FUT\nEGY NYOMÁS = LÖVÉS AZZAL AZ ERŐVEL\nBILLENTYŰ: ←→ CÉLZÁS, ↑↓ CSILLAG TÁVOLABB / KÖZELEBB\nSHIFT = LASSÚ, SZÓKÖZ = LÖVÉS\nEGÉR: A CSILLAG KÖVETI AZ EGERET, KATTINTÁS = LÖVÉS\nÉRINTÉS: CSÚSZTASD AZ UJJAD BÁRHOL, A CSILLAG KÖVETI, LÖVÉS GOMB\nKONTROLLER: KAR / KERESZT ◀▶ CÉLZÁS, ▲▼ CSILLAG\nLB / RB = FINOM CÉLZÁS, A = LÖVÉS\nESC: SZÜNET',
    rotate: 'TIPP: FORDÍTSD EL A TELEFONT', fullscreen: 'TELJES KÉPERNYŐ', pressStart: 'NYOMJ MEG EGY GOMBOT'
  }
};
let lang = 'en';
function t(key, vars) {
  let s = (LANG[lang] && LANG[lang][key]) || LANG.en[key] || key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

// ---------- Storage (safe, local only) ----------
function load(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

let musicVol = load('cosmopool_mvol', 60);      // 0..100
let sfxVol = load('cosmopool_svol', 80);        // 0..100
let helpLine = load('cosmopool_help', false);
let cardsOn = load('cosmopool_cards', true);
let topList = load('cosmopool_top', []);
let lastName = load('cosmopool_name', 'AAA');
let pendingCode = null;                         // level code for the next game
function topHi() { return Math.max(load('cosmopool_hi', 0), topList.length ? topList[0].s : 0); }

// =====================================================================
//  PHYSICS
// =====================================================================
function closest(px, py, s) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  let u = ((px - s.x1) * dx + (py - s.y1) * dy) / (dx * dx + dy * dy);
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return [s.x1 + dx * u, s.y1 + dy * u];
}
function syncBumpers() {
  for (const m of LV.bumpers) if (m.ax || m.ay) { const s = Math.sin(LV.t * m.w + m.ph); m.x = m.ox + m.ax * s; m.y = m.oy + m.ay * s; }
}
function pocketBall(b, ev, p) {
  b.in = true; b.vx = 0; b.vy = 0;
  if (ev) ev.push({ t: 'pocket', num: b.num, x: p ? p.x : b.x, y: p ? p.y : b.y });
}
function nearestPocket(x, y) {
  let best = null, bd = 1e9;
  for (const p of LV.pockets) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
  return best;
}

function step(bs, dt, ev) {
  const lv = LV, n = bs.length;
  syncBumpers();
  lv.t += dt;
  // move + forces + friction
  for (let i = 0; i < n; i++) {
    const b = bs[i];
    if (b.in || (!b.vx && !b.vy)) continue;
    if (phys.wind) { b.vx += phys.wind.x * dt; b.vy += phys.wind.y * dt; }
    if (phys.hole) {
      const hx = lv.cx - b.x, hy = lv.cy - b.y, hd = Math.hypot(hx, hy);
      if (hd > 2 && hd < 90) { const a = 45 * (1 - hd / 90); b.vx += hx / hd * a * dt; b.vy += hy / hd * a * dt; }
    }
    if (phys.magnet) for (const p of lv.pockets) {
      const mx = p.x - b.x, my = p.y - b.y, md = Math.hypot(mx, my);
      if (md < 22 && md > 0.5) { b.vx += mx / md * 110 * dt; b.vy += my / md * 110 * dt; }
    }
    if (phys.curve && b.num === 0) {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      b.vx += -b.vy / sp * phys.curve * dt; b.vy += b.vx / sp * phys.curve * dt;
    }
    const s = Math.hypot(b.vx, b.vy);
    const ns = s - phys.decel * dt - s * phys.damp * dt;
    if (ns <= 0) { b.vx = 0; b.vy = 0; continue; }
    const k = ns / s;
    b.vx *= k; b.vy *= k;
    b.px = b.x; b.py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    // wormholes
    if (lv.warps.length) {
      if (b.lock && Math.hypot(b.x - b.lock.x, b.y - b.lock.y) > 10) b.lock = null;
      for (const w of lv.warps) for (const [p, q] of [[w.a, w.b], [w.b, w.a]]) {
        if (b.lock === p || b.lock === q) continue;
        if (Math.hypot(b.x - p.x, b.y - p.y) < 5) { b.x = q.x; b.y = q.y; b.lock = q; if (ev) ev.push({ t: 'warp', x: q.x, y: q.y }); }
      }
    }
  }
  // ball vs ball
  for (let i = 0; i < n; i++) {
    const a = bs[i];
    if (a.in) continue;
    for (let j = i + 1; j < n; j++) {
      const c = bs[j];
      if (c.in) continue;
      if (!a.vx && !a.vy && !c.vx && !c.vy) continue;
      const dx = c.x - a.x, dy = c.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= D * D || d2 === 0) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
      const ov = (D - d) / 2;
      a.x -= nx * ov; a.y -= ny * ov; c.x += nx * ov; c.y += ny * ov;
      const vr = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
      if (vr > 0) {
        const imp = vr * (1 + EB) / 2;
        a.vx -= imp * nx; a.vy -= imp * ny;
        c.vx += imp * nx; c.vy += imp * ny;
        if (ev) ev.push({ t: 'ball', v: vr });
      }
    }
  }
  // bumpers, cushions, pockets
  for (let i = 0; i < n; i++) {
    const b = bs[i];
    if (b.in) continue;
    const moving = b.vx || b.vy;
    for (const m of lv.bumpers) {
      if (!moving && !(m.ax || m.ay)) continue;
      const dx = b.x - m.x, dy = b.y - m.y, rr = m.r + R, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr || d2 === 0) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
      b.x = m.x + nx * rr; b.y = m.y + ny * rr;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 20) {
        b.vx -= 2 * Math.min(0, vn) * nx; b.vy -= 2 * Math.min(0, vn) * ny;
        b.vx += nx * 45; b.vy += ny * 45;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 520) { b.vx *= 520 / sp; b.vy *= 520 / sp; }
        if (ev) { ev.push({ t: 'bump', x: m.x, y: m.y }); m.flash = 0.25; }
      }
    }
    if (!b.vx && !b.vy) continue;
    for (const s of cellSegs(lv, b.x, b.y)) {
      const [cx, cy] = closest(b.x, b.y, s);
      const dx = b.x - cx, dy = b.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= R * R || d2 === 0) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
      b.x += nx * (R - d); b.y += ny * (R - d);
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + phys.ew) * vn * nx; b.vy -= (1 + phys.ew) * vn * ny;
        if (ev) ev.push({ t: 'wall', v: -vn });
      }
    }
    let potted = false;
    for (const p of lv.pockets) {
      const dx = b.x - p.x, dy = b.y - p.y, pr = p.r * phys.pocketMul;
      if (dx * dx + dy * dy < pr * pr) {
        if (b.num === 0 && phys.ghost) {           // ghost cue ball bounces out of the pocket
          const d = Math.hypot(dx, dy) || 1;
          b.x = p.x + dx / d * pr; b.y = p.y + dy / d * pr;
          const vn = (b.vx * dx + b.vy * dy) / d;
          if (vn < 0) { b.vx -= 1.6 * vn * dx / d; b.vy -= 1.6 * vn * dy / d; }
          if (ev) ev.push({ t: 'wall', v: 60 });
        } else { pocketBall(b, ev, p); potted = true; }
        break;
      }
    }
    if (potted) continue;
    if (!pointInPoly(lv.poly, b.x, b.y) && polyDist(lv.poly, b.x, b.y) > 6) {
      if (b.num === 0 && phys.ghost) { b.x = b.px; b.y = b.py; b.vx *= -0.5; b.vy *= -0.5; }
      else pocketBall(b, ev, nearestPocket(b.x, b.y));
    }
  }
}

function anyMoving(bs) {
  for (const b of bs) if (!b.in && (b.vx || b.vy)) return true;
  return false;
}
function cloneBalls(bs) { return bs.map(b => ({ num: b.num, x: b.x, y: b.y, vx: 0, vy: 0, in: b.in, lock: b.lock })); }

// cue speed: a touch extra near full power (+7% at max, almost nothing for soft shots)
function shotSpeed(power) { return power * MAXV * (1 + 0.07 * power * power) * phys.powerMul; }

function simulate(src, angle, power) {
  const bs = cloneBalls(src), t0 = LV.t;
  bs[0].vx = Math.cos(angle) * shotSpeed(power);
  bs[0].vy = Math.sin(angle) * shotSpeed(power);
  for (let s = 0; s < 4000; s++) {
    step(bs, DT, null);
    if ((s & 7) === 7 && !anyMoving(bs)) break;
  }
  LV.t = t0; syncBumpers();
  let pot = 0, gold = false;
  for (let i = 1; i < bs.length; i++) if (bs[i].in && !src[i].in) { pot++; if (bs[i].num === GOLD) gold = true; }
  return { pot, gold, scratch: bs[0].in, bs };
}

// =====================================================================
//  CPU PLAYER
// =====================================================================
const DIFF = {
  easy:   { max: 26,  rand: 6,  sweep: 0,  an: 0.045, pn: 0.12, powers: [0.55],            look: false },
  medium: { max: 72,  rand: 6,  sweep: 12, an: 0.016, pn: 0.06, powers: [0.42, 0.65],      look: false },
  hard:   { max: 150, rand: 6,  sweep: 20, an: 0.004, pn: 0.02, powers: [0.38, 0.58, 0.85], look: true }
};

// is the straight path from (x1,y1) to (x2,y2) free for a rolling ball?
// (walls, blocks, bumpers and other balls block it)
function pathClear(bs, x1, y1, x2, y2, skipA, skipB) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (L < 1) return true;
  const ux = dx / L, uy = dy / L;
  for (let d = 3; d < L; d += 3) {
    const x = x1 + ux * d, y = y1 + uy * d;
    for (const s of cellSegs(LV, x, y)) if (segPointDist(x, y, s.x1, s.y1, s.x2, s.y2) < R - 0.3) return false;
    for (const m of LV.bumpers) if (Math.hypot(m.x - x, m.y - y) < m.r + R) return false;
    for (const o of bs) if (!o.in && o !== skipA && o !== skipB && Math.hypot(o.x - x, o.y - y) < D - 0.5) return false;
  }
  return true;
}

// one-cushion bank: bounce the cue ball off segment s so it arrives at the ghost spot (gx,gy)
function bankShot(bs, c, b, gx, gy, s) {
  const sx = s.x2 - s.x1, sy = s.y2 - s.y1, sl = Math.hypot(sx, sy);
  if (sl < 16) return null;
  let nx = -sy / sl, ny = sx / sl;
  if ((c.x - s.x1) * nx + (c.y - s.y1) * ny < 0) { nx = -nx; ny = -ny; }       // normal toward the cue ball
  const dc = (c.x - s.x1) * nx + (c.y - s.y1) * ny - R, dg = (gx - s.x1) * nx + (gy - s.y1) * ny - R;
  if (dc <= 1 || dg <= 1) return null;                                          // both must be on the playing side
  const mx = gx - 2 * dg * nx, my = gy - 2 * dg * ny;                           // ghost mirrored behind the cushion line
  const k = dc / (dc + dg);
  const hx = c.x + (mx - c.x) * k, hy = c.y + (my - c.y) * k;                   // where the ball centre touches
  const u = ((hx - R * nx - s.x1) * sx + (hy - R * ny - s.y1) * sy) / (sl * sl);
  if (u < 0.08 || u > 0.92) return null;
  if (!pathClear(bs, c.x, c.y, hx, hy, c, null) || !pathClear(bs, hx, hy, gx, gy, c, b)) return null;
  return Math.atan2(my - c.y, mx - c.x);
}

function shotOptions(bs, deep) {
  // "ghost ball" shots: every ball into every pocket; blocked lines count much less,
  // and with deep=true one-cushion banks are tried for blocked balls
  const c = bs[0], out = [];
  for (let i = 1; i < bs.length; i++) {
    const b = bs[i];
    if (b.in) continue;
    for (const p of LV.pockets) {
      const vx = p.x - b.x, vy = p.y - b.y, vl = Math.hypot(vx, vy);
      const gx = b.x - vx / vl * D, gy = b.y - vy / vl * D;
      const ux = gx - c.x, uy = gy - c.y, ul = Math.hypot(ux, uy);
      if (ul < 1) continue;
      const cos = (ux * vx + uy * vy) / (ul * vl);
      const pocketFree = pathClear(bs, b.x, b.y, b.x + vx / vl * Math.max(0, vl - p.r), b.y + vy / vl * Math.max(0, vl - p.r), b, null);
      if (cos >= 0.2) {
        const cueFree = pathClear(bs, c.x, c.y, gx - ux / ul, gy - uy / ul, c, b);
        out.push({ a: Math.atan2(uy, ux), ease: cos * (cueFree ? 1 : 0.12) * (pocketFree ? 1 : 0.25), clear: cueFree && pocketFree });
        if (cueFree || !deep || !pocketFree) continue;
      } else if (!deep || !pocketFree) continue;
      // straight line blocked (or impossible cut): look for a bank off a cushion / wall
      let banks = 0;
      for (const s of LV.segs) {
        const a = bankShot(bs, c, b, gx, gy, s);
        if (a == null) continue;
        out.push({ a, ease: Math.max(0.25, cos) * 0.55, clear: true, bank: true });
        if (++banks >= 2) break;
      }
    }
  }
  return out;
}

function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }

function startAI(diffName) {
  const df = DIFF[diffName] || DIFF.medium;
  let opts = shotOptions(G.balls, diffName !== 'easy');
  if (diffName === 'easy') opts.sort((a, b) => b.ease * (0.4 + Math.random()) - a.ease * (0.4 + Math.random()));
  else opts.sort((a, b) => b.ease - a.ease);
  const cands = [];
  for (const o of opts) for (const p of (o.bank ? df.powers.map(x => Math.min(1, x + 0.15)) : df.powers)) cands.push({ a: o.a, p });
  cands.length = Math.min(cands.length, df.max - df.rand - df.sweep);
  // a ring of shots all around: finds bumper / wormhole / multi-cushion luck when nothing is clear
  const off = Math.random() * Math.PI * 2;
  for (let i = 0; i < df.sweep; i++) cands.push({ a: off + i / df.sweep * Math.PI * 2, p: 0.5 + (i % 3) * 0.15 });
  const live = G.balls.filter(b => b.num > 0 && !b.in);
  for (let i = 0; i < df.rand && live.length; i++) {
    const b = live[(Math.random() * live.length) | 0];
    cands.push({ a: Math.atan2(b.y - G.balls[0].y, b.x - G.balls[0].x) + (Math.random() - 0.5) * 0.3, p: 0.3 + Math.random() * 0.6 });
  }
  return { df, cands, i: 0, best: null, bestScore: -1e9, stage: 'plan', time: 0, ta: 0, tp: 0 };
}

function evalCand(ai, c) {
  const r = simulate(G.balls, c.a, c.p);
  let score = r.pot * 100 + (r.gold ? 150 : 0) - (r.scratch ? 800 : 0) - c.p * 4 + Math.random();
  if (ai.df.look && r.pot > 0 && !r.scratch) {
    const next = shotOptions(r.bs, false).filter(o => o.clear && o.ease > 0.7).length;
    score += Math.min(5, next) * 3;
  }
  if (score > ai.bestScore) { ai.bestScore = score; ai.best = c; }
}

// =====================================================================
//  CARDS (blessings for yourself, curses for the opponent)
// =====================================================================
// n = shots it lasts (q: turns for quake, 0 = instant), w = draw weight
const CARDS = [
  // curses
  { id: 'drunk',  k: 'curse', n: 3, w: 3, hu: ['RÉSZEG CÉLZÁS', 'A CSILLAG IMBOLYOG', 'RÉSZEG'], en: ['DRUNK AIM', 'THE STAR WOBBLES', 'DRUNK'] },
  { id: 'half',   k: 'curse', n: 2, w: 3, hu: ['GYENGE LÖKÉS', '-30% ERŐ', 'GYENGE'], en: ['WEAK SHOT', '-30% POWER', 'WEAK'] },
  { id: 'fast',   k: 'curse', n: 3, w: 3, hu: ['TURBÓ MÉRŐ', 'GYORSABB ERŐMÉRŐ', 'TURBÓ'], en: ['TURBO METER', 'FASTER POWER METER', 'TURBO'] },
  { id: 'blind',  k: 'curse', n: 2, w: 3, hu: ['VAK CSILLAG', 'A CSILLAG KI-BE VILLOG', 'VAK'], en: ['BLIND STAR', 'THE STAR KEEPS VANISHING', 'BLIND'] },
  { id: 'rev',    k: 'curse', n: 2, w: 3, hu: ['FORDÍTOTT KÉZ', 'BALRA-JOBBRA FELCSERÉLVE', 'FORDÍTOTT'], en: ['MIRROR HANDS', 'LEFT AND RIGHT SWAPPED', 'MIRROR'] },
  { id: 'ice',    k: 'curse', n: 3, w: 3, hu: ['JÉGASZTAL', 'A GOLYÓK ALIG LASSULNAK', 'JÉG'], en: ['ICE TABLE', 'BALLS BARELY SLOW DOWN', 'ICE'] },
  { id: 'glue',   k: 'curse', n: 3, w: 3, hu: ['RAGACSOS POSZTÓ', 'A GOLYÓK HAMAR MEGÁLLNAK', 'RAGACS'], en: ['STICKY FELT', 'BALLS STOP QUICKLY', 'STICKY'] },
  { id: 'tight',  k: 'curse', n: 3, w: 3, hu: ['SZŰK ZSEBEK', 'KISEBBEK A LYUKAK', 'SZŰK'], en: ['TIGHT POCKETS', 'SMALLER POCKETS', 'TIGHT'] },
  { id: 'shaky',  k: 'curse', n: 3, w: 3, hu: ['REMEGŐ KÉZ', 'AZ ERŐ VÉLETLENÜL ELCSÚSZIK', 'REMEGÉS'], en: ['SHAKY HANDS', 'POWER SLIPS RANDOMLY', 'SHAKY'] },
  { id: 'one',    k: 'curse', n: 1, w: 2, hu: ['EGY LÖVÉS', 'TALÁLAT UTÁN SEM LŐHET ÚJRA', 'EGY LÖVÉS'], en: ['ONE SHOT', 'NO EXTRA SHOT EVEN AFTER POTTING', 'ONE SHOT'] },
  { id: 'dark',   k: 'curse', n: 2, w: 3, hu: ['SÖTÉTSÉG', 'CSAK A FEHÉR KÖRÜL LÁT', 'SÖTÉT'], en: ['DARKNESS', 'ONLY SEES AROUND THE CUE BALL', 'DARK'] },
  { id: 'dead',   k: 'curse', n: 3, w: 3, hu: ['HALOTT PALÁNK', 'A PALÁNK ALIG PATTAN', 'PALÁNK'], en: ['DEAD CUSHIONS', 'CUSHIONS BARELY BOUNCE', 'DEAD RAIL'] },
  { id: 'curve',  k: 'curse', n: 2, w: 3, hu: ['GÖRBE GOLYÓ', 'A FEHÉR ÍVBEN MEGY', 'GÖRBE'], en: ['CURVE BALL', 'THE CUE BALL CURVES', 'CURVE'] },
  { id: 'halfpt', k: 'curse', n: 2, w: 2, hu: ['FÉL PONT', 'GOLYÓNKÉNT CSAK 50 PONT', 'FÉL PONT'], en: ['HALF POINTS', 'ONLY 50 POINTS PER BALL', 'HALF PTS'] },
  { id: 'quake',  k: 'curse', q: 1, w: 2, hu: ['FÖLDRENGÉS', 'KÖRE ELEJÉN MEGRÁZKÓDIK AZ ASZTAL', 'RENGÉS'], en: ['EARTHQUAKE', 'THE TABLE SHAKES AT TURN START', 'QUAKE'] },
  { id: 'wind',   k: 'curse', n: 3, w: 3, hu: ['KOZMIKUS SZÉL', 'ELFÚJJA A GURULÓ GOLYÓKAT', 'SZÉL'], en: ['COSMIC WIND', 'BLOWS ROLLING BALLS ASIDE', 'WIND'] },
  { id: 'hole',   k: 'curse', n: 2, w: 3, hu: ['FEKETE LYUK', 'AZ ASZTAL KÖZEPE BESZÍVJA A GOLYÓKAT', 'FEKETE LYUK'], en: ['BLACK HOLE', 'THE CENTRE PULLS THE BALLS IN', 'BLACK HOLE'] },
  { id: 'goblin', k: 'curse', n: 0, w: 2, hu: ['PONTLOPÓ MANÓ', 'ELLOP 100 PONTOT ÉS NEKED HOZZA', ''], en: ['POINT GOBLIN', 'STEALS 100 POINTS AND BRINGS THEM TO YOU', ''] },
  // blessings
  { id: 'magnet', k: 'bless', n: 2, w: 3, hu: ['MÁGNESES ZSEB', 'A ZSEBEK KICSIT MAGUKHOZ HÚZNAK', 'MÁGNES'], en: ['MAGNET POCKETS', 'POCKETS PULL BALLS A LITTLE', 'MAGNET'] },
  { id: 'strong', k: 'bless', n: 3, w: 3, hu: ['ERŐS LÖKÉS', '+20% ERŐ', 'ERŐS'], en: ['POWER SHOT', '+20% POWER', 'POWER'] },
  { id: 'slow',   k: 'bless', n: 3, w: 3, hu: ['LASSÚ MÉRŐ', 'LASSABB ERŐMÉRŐ', 'LASSÚ'], en: ['SLOW METER', 'SLOWER POWER METER', 'SLOW'] },
  { id: 'shield', k: 'bless', n: 4, w: 3, hu: ['MÁSODIK ESÉLY', 'A KÖVETKEZŐ BEESETT FEHÉR NEM VISZ ÉLETET', 'PAJZS'], en: ['SECOND CHANCE', 'NEXT SCRATCH COSTS NO LIFE', 'SHIELD'] },
  { id: 'guide',  k: 'bless', n: 2, w: 3, hu: ['CSILLAGTÉRKÉP', 'TELJES CÉLZÓVONAL', 'TÉRKÉP'], en: ['STAR MAP', 'FULL AIMING LINE', 'MAP'] },
  { id: 'wide',   k: 'bless', n: 2, w: 3, hu: ['NAGY ZSEBEK', 'NAGYOBBAK A LYUKAK', 'NAGY ZSEB'], en: ['WIDE POCKETS', 'BIGGER POCKETS', 'WIDE'] },
  { id: 'double', k: 'bless', n: 2, w: 2, hu: ['PLUSZ PONT', 'GOLYÓNKÉNT 150 PONT', 'PLUSZ PONT'], en: ['BONUS POINTS', '150 POINTS PER BALL', 'BONUS'] },
  { id: 'extra',  k: 'bless', n: 4, w: 3, hu: ['MÉG EGY ESÉLY', 'EGY HIBÁNÁL NEM VESZTED EL A KÖRT', 'ESÉLY'], en: ['ANOTHER GO', 'ONE MISS KEEPS YOUR TURN', 'ANOTHER'] },
  { id: 'ghost',  k: 'bless', n: 2, w: 3, hu: ['SZELLEMFEHÉR', 'A FEHÉR NEM ESHET BE', 'SZELLEM'], en: ['GHOST CUE', 'THE CUE BALL CANNOT FALL IN', 'GHOST'] },
  { id: 'calm',   k: 'bless', n: 3, w: 2, hu: ['NYUGODT KÉZ', 'LASSABB, PONTOSABB CÉLZÁS', 'NYUGALOM'], en: ['CALM HANDS', 'SLOWER, FINER AIMING', 'CALM'] },
  { id: 'life',   k: 'bless', n: 0, w: 1, hu: ['ÚJ ÉLET', '+1 ÉLET', ''], en: ['EXTRA LIFE', '+1 LIFE', ''] },
  { id: 'lsteal', k: 'bless', n: 0, w: 1, hu: ['ÉLETLOPÁS', 'ELVESZEL 1 ÉLETET (HA NEKI TÖBB VAN)', ''], en: ['LIFE STEAL', 'TAKE 1 LIFE (IF THEY HAVE MORE)', ''] },
  { id: 'cleanse',k: 'bless', n: 0, w: 2, hu: ['TISZTÍTÁS', 'MINDEN ÁTKOD ELTŰNIK', ''], en: ['CLEANSE', 'ALL YOUR CURSES VANISH', ''] },
  { id: 'mirror', k: 'bless', n: 0, w: 1, hu: ['TÜKÖR', 'AZ ÁTKAID AZ ELLENFÉLRE SZÁLLNAK', ''], en: ['MIRROR', 'YOUR CURSES MOVE TO THE OPPONENT', ''] },
  { id: 'comet',  k: 'bless', n: 2, w: 2, hu: ['ÜSTÖKÖS', 'A FEHÉR ALIG LASSUL', 'ÜSTÖKÖS'], en: ['COMET', 'THE CUE BALL BARELY SLOWS', 'COMET'] }
];
const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]));
function cardText(c) { return c[lang] || c.en; }

function drawCards(nCards, pi) {
  const foe = G.players[1 - pi];
  const foeCurses = foe.fx.filter(f => CARD[f.id].k === 'curse').length;
  // never pile a 3rd curse on someone; never offer Extra Life / Life Steal to the leader on lives
  const pool = CARDS.filter(c => !(c.k === 'curse' && foeCurses >= 2) && !((c.id === 'life' || c.id === 'lsteal') && G.players[pi].lives > foe.lives)), out = [];
  while (out.length < nCards && pool.length) {
    let tot = 0; for (const c of pool) tot += c.w;
    let r = Math.random() * tot, i = 0;
    for (; i < pool.length - 1; i++) { r -= pool[i].w; if (r <= 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  if (!out.some(c => c.k === 'bless')) {
    const bl = pool.filter(c => c.k === 'bless');
    if (bl.length) out[(Math.random() * out.length) | 0] = bl[(Math.random() * bl.length) | 0];
  }
  return out;
}
function hasFx(p, id) { return p.fx.some(f => f.id === id); }
function dropFx(p, id) { p.fx = p.fx.filter(f => f.id !== id); }

function applyCard(pi, c) {
  const me = G.players[pi], foe = G.players[1 - pi];
  if (!c.n && !c.q) {
    switch (c.id) {
      case 'goblin': startGoblin(1 - pi, pi); break;
      case 'life': me.lives++; break;
      case 'lsteal': if (foe.lives > me.lives) { foe.lives--; me.lives++; } else me.score += 100; break;
      case 'cleanse': me.fx = me.fx.filter(f => CARD[f.id].k !== 'curse'); break;
      case 'mirror': { const cs = me.fx.filter(f => CARD[f.id].k === 'curse'); me.fx = me.fx.filter(f => CARD[f.id].k !== 'curse'); for (const f of cs) addFx(foe, f); break; }
    }
    return;
  }
  const target = c.k === 'curse' ? foe : me;
  const f = { id: c.id, left: c.n || c.q };
  if (c.id === 'wind') { const d = (Math.random() * 4) | 0; f.wx = [38, 0, -38, 0][d]; f.wy = [0, 38, 0, -38][d]; f.arrow = ['>', 'V', '<', '^'][d]; }
  if (c.id === 'curve') f.sign = Math.random() < 0.5 ? -1 : 1;
  addFx(target, f);
}
function addFx(p, f) {
  const old = p.fx.find(x => x.id === f.id);
  if (old) old.left = Math.max(old.left, f.left); else p.fx.push({ ...f });
}

// Combine a player's active effects into aim mods + physics for their shots
function computeMods(pi) {
  const p = G.players[pi], m = { drunk: false, blind: false, rev: false, dark: false, guide: false, calm: false, shaky: false };
  Object.assign(phys, PHYS0);
  for (const f of p.fx) {
    switch (f.id) {
      case 'drunk': m.drunk = true; break;
      case 'half': phys.powerMul *= 0.7; break;
      case 'strong': phys.powerMul *= 1.2; break;
      case 'fast': phys.meterMul *= 1.55; break;
      case 'slow': phys.meterMul *= 0.7; break;
      case 'blind': m.blind = true; break;
      case 'rev': m.rev = true; break;
      case 'ice': phys.decel *= 0.6; phys.damp *= 0.7; break;
      case 'glue': phys.decel *= 1.45; phys.damp *= 1.3; break;
      case 'tight': phys.pocketMul *= 0.85; break;
      case 'wide': phys.pocketMul *= 1.18; break;
      case 'shaky': m.shaky = true; break;
      case 'dark': m.dark = true; break;
      case 'dead': phys.ew = 0.5; break;
      case 'curve': phys.curve = 40 * (f.sign || 1); break;
      case 'wind': phys.wind = { x: f.wx, y: f.wy }; break;
      case 'hole': phys.hole = true; break;
      case 'magnet': phys.magnet = true; break;
      case 'ghost': phys.ghost = true; break;
      case 'guide': m.guide = true; break;
      case 'calm': m.calm = true; break;
      case 'comet': phys.damp *= 0.6; phys.decel *= 0.8; break;
    }
  }
  return m;
}

function quakeTable() {
  for (const b of G.balls) {
    if (b.in) continue;
    for (let k = 0; k < 8; k++) {
      const nx = b.x + (Math.random() - 0.5) * 10, ny = b.y + (Math.random() - 0.5) * 10;
      if (spotFree(LV, G.balls, nx, ny, b)) { b.x = nx; b.y = ny; break; }
    }
  }
  G.shake = 0.5;
  showMsg(t('quakeMsg'), 1.4); sfx('scratch'); vib(120);
  if (isHost()) { Net.send({ t: 'quake' }); netSendState(); }
}

// =====================================================================
//  POINT GOBLIN — walks across the HUD, bags points, winks, leaves
// =====================================================================
const GOB_PAL = { r: '#c83a2a', R: '#7a1e14', G: '#5ab02a', g: '#2e6a14', k: '#000', w: '#fff', y: '#ffd84a', s: '#a8743a', S: '#5a3a18', b: '#3a2410' };
const GOB_BODY = [
  '.....rrr.....',
  '....rrrrr....',
  '.g.GGGGGGG.g.',
  '.gGGGGGGGGGg.',
  '..GGwkGGwkG..',
  '..GGGGGGGGG..',
  '...GGRRRGG...',
  '.sss.GGGG....',
  'sSsssGGGGG...',
  'sSsssgGGGgG..',
  'sSsssGGGGG...',
  '.sss.GGGGG...'
];
const GOB_WINK = '..GGwkGGkkG..';
const GOB_LEGS = [
  ['.....bb.bb...', '.....bb.bb...', '....bbb.bbb..'],
  ['....bb...bb..', '...bb.....bb.', '...bb.....bb.']
];

function startGoblin(from, to) {
  const fp = G.players[from], tp = G.players[to];
  const amt = Math.min(100, fp.score);
  G.gob = { from, to, amt, fromStart: fp.score, toStart: tp.score, st: 'in', t: 0, x: VIEW.w + 10, y: gobSpot(from).y, face: -1, full: false, parts: [], wink: false };
  G.phase = 'goblin';
  showMsg(t('goblinMsg'), 99);
  vib([40, 40, 40]);
  if (isHost()) Net.send({ t: 'goblin', from, to });
}
function rowY(i) { return 4 + i * 11 - 5; }
// where the goblin stands next to a player's score, and where that score is (canvas pixels)
function gobSpot(i) { return VIEW.wide ? { x: VIEW.ox + (i === 0 ? 30 : 226), y: VIEW.oy + 46 } : { x: 84, y: rowY(i) }; }
function gobScore(i) { return VIEW.wide ? { x: i === 0 ? 14 : VIEW.w - 14, y: 26 } : { x: 50 + Math.random() * 30, y: rowY(i) + 8 }; }

function goblinUpdate(dt) {
  const g = G.gob, fp = G.players[g.from], tp = G.players[g.to];
  g.t += dt;
  const walk = (tx, sp) => { const d = tx - g.x; g.face = d < 0 ? -1 : 1; if (Math.abs(d) <= sp * dt) { g.x = tx; return true; } g.x += Math.sign(d) * sp * dt; if (((g.t * 8) | 0) !== (((g.t - dt) * 8) | 0)) beep(220, 0.02, 'square', 0.02); return false; };
  switch (g.st) {
    case 'in': if (walk(gobSpot(g.from).x, VIEW.wide ? 150 : 105)) { g.st = 'grab'; g.t = 0; } break;
    case 'grab': {
      g.face = -1;
      const k = Math.min(1, g.t / 1.1);
      fp.score = g.fromStart - Math.round(g.amt * k / 10) * 10;
      if (Math.random() < dt * 14 && k < 1) { { const sp = gobScore(g.from); g.parts.push({ x: sp.x, y: sp.y, tx: g.x - 4, ty: g.y + 9, t: 0 }); } beep(1300 + Math.random() * 500, 0.04, 'square', 0.03); }
      if (g.t > 1.4) { g.full = true; g.st = g.from === g.to ? 'drop' : 'hop'; g.t = 0; g.y0 = g.y; g.x0 = g.x; }
      break;
    }
    case 'hop': {
      const to = gobSpot(g.to), dur = Math.max(0.55, Math.abs(to.x - g.x0) / 150), k = Math.min(1, g.t / dur);
      g.x = g.x0 + (to.x - g.x0) * k;
      if (to.x !== g.x0) g.face = to.x > g.x0 ? 1 : -1;
      g.y = g.y0 + (to.y - g.y0) * k - Math.sin(k * Math.PI) * 9;
      if (k >= 1) { g.x = to.x; g.y = to.y; g.st = 'drop'; g.t = 0; beep(180, 0.06, 'triangle', 0.08); }
      break;
    }
    case 'drop': {
      g.face = -1;
      const k = Math.min(1, g.t / 1.1);
      tp.score = g.toStart + Math.round(g.amt * k / 10) * 10;
      if (Math.random() < dt * 14 && k < 1) { { const sp = gobScore(g.to); g.parts.push({ x: g.x - 4, y: g.y + 9, tx: sp.x, ty: sp.y, t: 0 }); } beep(900 + Math.random() * 400, 0.04, 'square', 0.03); }
      if (g.t > 1.3) { g.full = false; g.st = 'wink'; g.t = 0; g.face = 1; }
      break;
    }
    case 'wink':
      g.wink = g.t > 0.25 && g.t < 0.85;
      if (g.t > 0.25 && !g.winked) { g.winked = true; [880, 1320].forEach((f, i) => beep(f, 0.08, 'square', 0.05, 0, i * 0.09)); }
      if (g.t > 1.1) { g.wink = false; g.st = 'out'; g.t = 0; }
      break;
    case 'out': if (walk(VIEW.w + 16, VIEW.wide ? 170 : 120)) finishGoblin(); break;
  }
  for (const p of g.parts) p.t += dt * 2.4;
  g.parts = g.parts.filter(p => p.t < 1);
}
function finishGoblin() {
  const g = G.gob;
  if (!g) return;
  G.players[g.from].score = g.fromStart - g.amt;
  G.players[g.to].score = g.toStart + g.amt;
  G.gob = null;
  G.msgT = 0;
  G.phase = 'wait'; G.timer = 0.5;
  netSendState();
}

function drawGoblin(g) {
  if (!g) return;
  const ox = Math.round(g.x) - 6, oy = Math.round(g.y - (g.jump || 0));
  if (g.st === 'scared') { ctx.fillStyle = '#ffd84a'; ctx.fillRect(ox + 6, oy - 8, 1, 4); ctx.fillRect(ox + 6, oy - 3, 1, 1); }
  const walking = g.st === 'in' || g.st === 'out' || g.st === 'flee' || (g.st === 'hop' && VIEW.wide);
  const legs = GOB_LEGS[walking ? ((g.t * 8) | 0) % 2 : 0];
  const rows = GOB_BODY.map((r, i) => (i === 4 && g.wink) ? GOB_WINK : r).concat(legs);
  const bob = walking && ((g.t * 8) | 0) % 2 ? 1 : 0;
  rows.forEach((row, y) => {
    for (let x = 0; x < 13; x++) {
      const ch = row[g.face > 0 ? x : 12 - x];
      if (ch === '.') continue;
      ctx.fillStyle = GOB_PAL[ch];
      ctx.fillRect(ox + x, oy + y - (y < 12 ? bob : 0), 1, 1);
    }
  });
  if (g.full) {
    const sx = g.face > 0 ? ox : ox + 8;
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(sx + 1, oy + 6 - bob, 3, 1);
    ctx.fillStyle = '#fff6a0'; ctx.fillRect(sx + 2, oy + 5 - bob, 1, 1);
  }
  if (g.wink) { ctx.fillStyle = '#fff'; const sx = ox + (g.face > 0 ? 14 : -3), sy = oy + 1; ctx.fillRect(sx, sy, 1, 3); ctx.fillRect(sx - 1, sy + 1, 3, 1); }
  for (const p of (g.parts || [])) {
    const k = p.t, x = p.x + (p.tx - p.x) * k, y = p.y + (p.ty - p.y) * k - Math.sin(k * Math.PI) * 8;
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  const label = g.st === 'grab' ? '-' + g.amt : g.st === 'drop' ? '+' + g.amt : '';
  if (label) txt(label, Math.round(g.x) + 10, oy + 2, g.st === 'grab' ? '#ff6a5a' : '#5ae07a');
}

// ---------- card picking ----------
function cpuCardsUpdate(dt) {
  const P = G.cpuPick, cards = [...document.querySelectorAll('#cardRow .card')];
  P.t += dt;
  if (P.t < 1.8) {                                // highlight hops between the cards...
    const hi = Math.floor(P.t * (P.t < 1.2 ? 7 : 4)) % 3;
    if (hi !== P.hi) { P.hi = hi; cards.forEach((c, i) => c.classList.toggle('hi', i === hi)); beep(700 + hi * 120, 0.04, 'square', 0.03); }
  } else if (!P.done) {                           // ...then stops on the chosen one
    P.done = true;
    cards.forEach((c, i) => { c.classList.toggle('hi', false); c.classList.toggle('chosen', i === P.idx); c.classList.toggle('faded', i !== P.idx); });
    sfx('perfect');
  } else if (P.t > 3.6) {
    const c = G.cardHand[P.idx], pi = G.cardFor, p = G.players[pi];
    G.cpuPick = null;
    hideOverlay();
    G.lastPick = { k: (G.lastPick ? G.lastPick.k : 0) + 1, pi, id: c.id };
    G.phase = 'wait'; G.timer = 0.6;
    applyCard(pi, c);
    if (c.id !== 'goblin') showMsg(t('picked', { p: p.name, c: cardText(c)[0] }), 2.4);
  }
}

function startCardPick(pi) {
  G.phase = 'cards';
  G.cardFor = pi;
  G.cardHand = drawCards(3, pi);
  const p = G.players[pi];
  if (p.cpu) {                                    // the CPU "thinks" over its cards on screen
    G.phase = 'cpucards';
    G.cpuPick = { t: 0, idx: (Math.random() * 3) | 0, hi: -1, done: false };
    showCardScreen(true);
    return;
  }
  if (G.net && pi !== G.net.me) {                 // the guest picks on their own screen
    Net.send({ t: 'cards', pi, hand: G.cardHand.map(c => c.id) });
    netSendState();
    return;
  }
  showCardScreen();
}

function showCardScreen(reveal) {
  const p = G.players[G.cardFor], foe = G.players[1 - G.cardFor];
  const box = document.getElementById('cardRow');
  box.innerHTML = '';
  box.classList.toggle('reveal', !!reveal);
  G.cardHand.forEach((c, i) => {
    const [name, desc] = cardText(c);
    const b = document.createElement('button');
    b.className = 'card ' + c.k;
    const dur = c.q ? t('turnsN', { n: c.q }) : c.n ? t('shotsN', { n: c.n }) : t('instant');
    const who = c.k === 'curse' ? t('toEnemy', { p: foe.name }) : t('toYou');
    b.innerHTML = '<span class="kind"></span><span class="name"></span><span class="desc"></span><span class="dur"></span>';
    b.querySelector('.kind').textContent = (c.k === 'curse' ? '- ' : '+ ') + t(c.k) + (c.k === 'curse' ? ' -' : ' +');
    b.querySelector('.name').textContent = name;
    b.querySelector('.desc').textContent = desc;
    b.querySelector('.dur').textContent = dur + ' · ' + who;
    if (reveal) b.tabIndex = -1; else b.addEventListener('click', () => pickCard(i));
    box.appendChild(b);
  });
  document.getElementById('cardTitle').textContent = t('cardFor', { p: p.name });
  showScreen('scrCards');
  if (reveal && document.activeElement) document.activeElement.blur();
}

function pickCard(i) {
  if (!G || G.phase !== 'cards') return;
  if (isGuest()) { Net.send({ t: 'pick', i }); hideOverlay(); G.phase = 'netwait'; return; }
  const c = G.cardHand[i];
  if (!c) return;
  G.lastPick = { k: (G.lastPick ? G.lastPick.k : 0) + 1, pi: G.cardFor, id: c.id };
  if (c.id !== 'goblin') applyCard(G.cardFor, c);
  showMsg(t('picked', { p: G.players[G.cardFor].name, c: cardText(c)[0] }), 2.2);
  sfx('perfect');
  if (!G.net || G.cardFor === G.net.me) hideOverlay();
  G.phase = 'wait'; G.timer = 0.8;
  if (c.id === 'goblin') startGoblin(1 - G.cardFor, G.cardFor);
  else netSendState();
}

// =====================================================================
//  GAME STATE
// =====================================================================
let G = null;
let demoBalls = [];

function isHost() { return !!(G && G.net && G.net.host); }
function isGuest() { return !!(G && G.net && !G.net.host); }
function localTurn() { return G.net ? G.cur === G.net.me : !cur().cpu; }

function newGame(mode, opt = {}) {
  let defs;
  if (mode === 'cpu') defs = [{ name: 'P1' }, { name: t('cpu'), cpu: true }];
  else if (mode === 'solo') defs = [{ name: 'P1' }];
  else defs = [{ name: 'P1' }, { name: 'P2' }];
  const code = opt.code !== undefined ? opt.code : pendingCode;
  if (opt.code === undefined) pendingCode = null;
  G = {
    mode, diff: opt.diff || 'medium', net: opt.net || null, dev: mode === '2p' ? (opt.dev || null) : null,
    players: defs.map(p => ({ cpu: false, ...p, score: 0, lives: START_LIVES, fx: [], rack: [], st: { pots: 0, run: 0, bestRun: 0, scr: 0, shoo: 0, combo: 0 } })),
    cards: mode === 'solo' ? false : (opt.cards !== undefined ? opt.cards : cardsOn),
    runSeed: opt.runSeed || (((Math.random() * 0x3FFFFFFF) | 0) + 1), code: code || null,
    mods: {}, prank: null, prankCool: 4, aimOff: 0, turnStart: true, shake: 0, moveT: 0, miss: 0,
    cur: 0, stage: 1, balls: [], parts: [], combo: null, remoteAim: null, lastPick: null,
    phase: 'aim', angle: 0, starD: STAR_DIST, power: POWER_MIN, chDir: 1, starSpin: 0,
    visit: 0, shot: null, msg: '', msgT: 0, timer: 0, ai: null, paused: false, overShown: false
  };
  if (G.net) G.net.aimT = 0;
  loadStage(G.code ? G.code.stage : 1);
  G.mods = computeMods(0);
  Music.setMode('game');
  showMsg(t('stage', { n: G.stage }), 1.6);
  if (G.net) setTimeout(() => { if (G && G.net) showMsg(t('youAre', { p: G.players[G.net.me].name }), 2.5); }, 1700);
  if (isGuest()) G.phase = 'netwait';
  hideOverlay();
  updateHudVisibility();
}

function levelSeed(stage) {
  if (G.code && stage === G.code.stage) return G.code.seed;
  if (stage === 1) return 0;                                   // classic table
  return (hash32(G.runSeed, stage) & 0x3FFFFFFF) || 1;
}
function loadStage(stage, seedOverride) {
  G.stage = stage;
  const seed = seedOverride !== undefined ? seedOverride : levelSeed(stage);
  LV = prepLevel(buildLevel(seed, stage));
  tableImg = buildTableImg(LV);
  G.balls = levelBalls(LV);
  G.levelCode = seedToCode(LV.seed, stage);
  G.prankCool = Math.max(G.prankCool, 2);
}

function showMsg(s, time) { if (G) { G.msg = s; G.msgT = time; } }
function cur() { return G.players[G.cur]; }

function shoot(angle, power, raw) {
  const c = G.balls[0];
  if (!raw) angle += G.aimOff;
  if (G.mods.shaky) power = Math.max(0.1, Math.min(1, power * (1 + (Math.random() - 0.5) * 0.24)));
  c.vx = Math.cos(angle) * shotSpeed(power);
  c.vy = Math.sin(angle) * shotSpeed(power);
  G.moveT = 0;
  G.phase = 'moving';
  pendingShot = false;
  G.remoteAim = null;
  G.shot = { potted: [], scratch: false };
  sfx('shoot', power); vib(15);
  maybePrank(angle);
  netShotStart();
}

// =====================================================================
//  GOBLIN PRANK — very rarely the goblin sneaks onto the table right after a
//  shot and grabs the targeted ball. Then a 5-second mashing duel decides:
//  the shooter mashes to scare him away, the opponent mashes to help him.
//  Shooter wins -> he flees, ball stays.  Opponent wins -> ball goes far.
//  Draw -> a small nudge.  vs CPU the computer mashes too; in practice
//  mode the goblin himself pushes back.
// =====================================================================
const PRANK_CHANCE = 0.035, DUEL_TIME = 5;
const CPU_MASH = { easy: 4.5, medium: 6.5, hard: 8.5 }, GOBLIN_MASH = 5.5;
function maybePrank(angle) {
  if (!G.cards || G.prankCool > 0 || Math.random() > PRANK_CHANCE) return;
  const tr = aimTrace(G.balls, angle);
  const b = tr.hit;
  if (!b) return;
  // push direction: sideways to the shot, to whichever side has room
  const px = -Math.sin(angle), py = Math.cos(angle);
  let dir = null;
  for (const sgn of Math.random() < 0.5 ? [1, -1] : [-1, 1]) {
    if (!dir && spotFree(LV, G.balls, b.x + px * 10 * sgn, b.y + py * 10 * sgn, b)) dir = { x: px * sgn, y: py * sgn };
  }
  if (!dir) return;
  const c = G.balls[0];
  const fromLeft = b.x < LV.cx;       // comes in from the nearest side
  const sx = fromLeft ? LV.bbox.x0 - 26 : LV.bbox.x1 + 26;
  G.prank = {
    b, cv: { x: c.vx, y: c.vy }, from: { x: b.x, y: b.y }, to: { x: b.x, y: b.y }, dir,
    stand: { x: b.x - dir.x * 9, y: b.y - dir.y * 9 }, exitX: sx,
    cnt: [0, 0], duelT: DUEL_TIME, res: null, syncT: 0, cpuT: 0.4, lastTick: 6,
    g: { st: 'in', t: 0, x: sx, y: b.y - 11, face: fromLeft ? 1 : -1, wink: false }
  };
  c.vx = 0; c.vy = 0;
  G.phase = 'prank';
  G.prankCool = 25;                 // at least 25 shots before it can happen again
  showMsg(t('prankMsg'), 99);
  sfx('scratch'); vib([40, 40, 40]);
}
// who is the "other side" of the duel: player 1 (2P / CPU / online) or the goblin (practice)
function duelNames() { return [G.players[0].name, G.players[1] ? G.players[1].name : t('goblinName')]; }
function shooterIdx() { return G.players.length > 1 ? G.cur : 0; }
function oppIdx() { return G.players.length > 1 ? 1 - G.cur : 1; }
function duelOpen() { const P = G && G.prank; return P && !P.res && (P.g.st === 'in' || P.g.st === 'duel'); }

// one press for player pi (0 / 1)
function mash(pi, fromNet) {
  const P = G && G.prank;
  if (!duelOpen() || pi == null) return;
  if (G.net && !G.net.host) { if (!fromNet) Net.send({ t: 'mash' }); beep(500 + (pi ? 200 : 0), 0.03, 'square', 0.03); return; }
  P.cnt[pi]++;
  beep(pi === shooterIdx() ? 700 + Math.min(P.cnt[pi], 40) * 8 : 420 + Math.min(P.cnt[pi], 40) * 6, 0.03, 'square', 0.035);
}
// map a key / tap / pad to a player
function localPlayer() { return G.net ? G.net.me : 0; }
// which players own a device of this kind (local 2 players)
function ownersOf(kind) { return G.dev ? [0, 1].filter(i => G.dev[i] === kind || (kind === 'mouse' && G.dev[i] === 'kb')) : []; }
function mashKey(code) {
  if (G.mode !== '2p') { mash(localPlayer()); return; }
  const own = ownersOf('kb');
  if (own.length === 2 || !G.dev) { if (code === 'Space') mash(0); else mash(1); }   // shared keyboard: SPACE = P1, ENTER = P2
  else if (own.length === 1) mash(own[0]);
}
function mashPointer(clientX, kind) {
  if (G.mode !== '2p') { mash(localPlayer()); return; }
  const own = ownersOf(kind === 'touch' ? 'touch' : 'mouse');
  if (own.length === 2 || !G.dev) mash(clientX < innerWidth / 2 ? 0 : 1);           // shared screen: left / right half
  else if (own.length === 1) mash(own[0]);
}
let padAPrev = {};
function mashPads() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  for (const p of pads) {
    const a = !!(p.buttons[0] && p.buttons[0].pressed);
    if (a && !padAPrev[p.index]) {
      if (G.mode !== '2p') mash(localPlayer());
      else { const own = ownersOf('pad:' + p.index); if (own.length) mash(own[0]); else if (!G.dev) mash(Math.min(p.index, 1)); }
    }
    padAPrev[p.index] = a;
  }
}
// what each player has to press in the duel (shown under the tug bar)
function duelHint2p() {
  if (!G.dev) return touchMode ? t('duelTouch2p') : t('duelKeys2p');
  const shared = k => G.dev[0] === k && G.dev[1] === k;
  const one = i => {
    const d = G.dev[i];
    if (d.startsWith('pad:')) return t('padA');
    if (d === 'kb') return shared('kb') ? (i ? 'ENTER' : t('keySpace')) : t('keySpace');
    return shared('touch') ? (i ? t('sideR') : t('sideL')) : t('tap');
  };
  return 'P1: ' + one(0) + '   P2: ' + one(1);
}

function prankDecide() {
  const P = G.prank, s = P.cnt[shooterIdx()], o = P.cnt[oppIdx()];
  let res = s > o ? 'flee' : s < o ? 'far' : 'nudge', to = null;
  if (res !== 'flee') {
    const dists = res === 'far' ? [28, 24, 20, 17, 14] : [10, 8, 12];
    for (const sgn of [1, -1]) for (const d of dists) {
      const x = P.from.x + P.dir.x * d * sgn, y = P.from.y + P.dir.y * d * sgn;
      if (!to && spotFree(LV, G.balls, x, y, P.b)) to = { x, y };
    }
    if (!to) res = 'flee';
  }
  prankResult(res, to);
  if (isHost()) Net.send({ t: 'duelEnd', res, to, cnt: P.cnt });
}
function prankResult(res, to) {
  const P = G.prank, g = P.g;
  P.res = res;
  if (res === 'flee') {
    g.st = 'scared'; g.t = 0;
    G.players[shooterIdx()] && G.players[shooterIdx()].st && G.players[shooterIdx()].st.shoo++;
    showMsg(t('shooed'), 1.8);
    [1200, 900, 600].forEach((f, i) => beep(f, 0.07, 'square', 0.05, 0, i * 0.06));
  } else {
    P.to = to;
    g.st = 'push'; g.t = 0;
    const names = duelNames();
    showMsg(res === 'far' ? t('duelFar', { p: names[oppIdx()] }) : t('duelDraw'), 1.8);
    beep(160, 0.12, 'triangle', 0.09);
  }
}
function prankUpdate(dt) {
  const P = G.prank, g = P.g;
  g.t += dt;
  mashPads();
  const walk = (tx, ty, sp) => {
    const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.5) g.face = dx < 0 ? -1 : 1;
    if (((g.t * 8) | 0) !== (((g.t - dt) * 8) | 0)) beep(220, 0.02, 'square', 0.02);
    if (d <= sp * dt) { g.x = tx; g.y = ty; return true; }
    g.x += dx / d * sp * dt; g.y += dy / d * sp * dt; return false;
  };
  switch (g.st) {
    case 'in': if (walk(P.stand.x, P.stand.y - 11, 70)) { g.st = 'duel'; g.t = 0; P.duelT = DUEL_TIME; } break;
    case 'duel': {
      g.face = P.dir.x >= 0 ? 1 : -1;
      if (!isGuest()) {
        // the computer (or the goblin himself) mashes too
        const auto = G.mode === 'solo' ? 1 : (G.mode === 'cpu' ? 1 : -1);
        if (auto >= 0) {
          const rate = G.mode === 'solo' ? GOBLIN_MASH : (CPU_MASH[G.diff] || 6.5);
          P.cpuT -= dt;
          if (P.cpuT <= 0) { P.cpuT = (1 / rate) * (0.7 + Math.random() * 0.6); mash(1); }
        }
        if (isHost()) { P.syncT -= dt; if (P.syncT <= 0) { P.syncT = 0.1; Net.send({ t: 'duel', cnt: P.cnt, left: P.duelT }); } }
      }
      const before = P.duelT;
      P.duelT = Math.max(0, P.duelT - dt);
      if (Math.ceil(P.duelT) !== Math.ceil(before) && P.duelT > 0) beep(Math.ceil(P.duelT) === 1 ? 880 : 660, 0.08, 'square', 0.05);
      g.jump = Math.abs(Math.sin(g.t * 14)) * 1.5;   // he tugs at the ball
      if (P.duelT <= 0 && !isGuest() && !P.res) { g.jump = 0; prankDecide(); }
      break;
    }
    case 'push': {
      g.jump = 0;
      const k = Math.min(1, g.t / 0.9), e = k * k * (3 - 2 * k);
      const ox = P.b.x, oy = P.b.y;
      P.b.x = P.from.x + (P.to.x - P.from.x) * e; P.b.y = P.from.y + (P.to.y - P.from.y) * e;
      g.x += P.b.x - ox; g.y += P.b.y - oy;
      g.face = P.to.x >= P.from.x ? 1 : -1;
      if (k >= 1) { g.st = 'wink'; g.t = 0; }
      break;
    }
    case 'wink':
      g.face = g.x < LV.cx ? -1 : 1;
      g.wink = g.t > 0.2 && g.t < 0.8;
      if (g.t > 0.2 && !g.winked) { g.winked = true; [880, 1320].forEach((f, i) => beep(f, 0.08, 'square', 0.05, 0, i * 0.09)); }
      if (g.t > 1.0) { g.wink = false; g.st = 'out'; g.t = 0; }
      break;
    case 'out': if (walk(P.exitX, g.y, 95)) finishPrank(); break;
    case 'scared': {
      g.jump = Math.sin(Math.min(1, g.t / 0.45) * Math.PI) * 6;
      if (g.t > 0.5) { g.jump = 0; g.st = 'flee'; g.t = 0; }
      break;
    }
    case 'flee': if (walk(g.x < LV.cx ? LV.bbox.x0 - 26 : LV.bbox.x1 + 26, g.y, 190)) finishPrank(); break;
  }
}
function finishPrank() {
  const P = G.prank;
  if (!P) return;
  if (P.res === 'flee' || !P.res) { P.b.x = P.from.x; P.b.y = P.from.y; } else { P.b.x = P.to.x; P.b.y = P.to.y; }
  const c = G.balls[0];
  c.vx = P.cv.x; c.vy = P.cv.y;
  G.prank = null;
  G.msgT = 0;
  G.phase = 'moving';
}
// countdown over the goblin + tug-of-war bar (world coordinates)
function drawDuel(time) {
  const P = G.prank;
  if (!P || P.res || (P.g.st !== 'in' && P.g.st !== 'duel')) return;
  const y0 = VIEW.wide ? 194 : 211;
  ctx.fillStyle = 'rgba(0,0,10,0.85)';
  ctx.fillRect(14, y0 - 2, 228, 27);
  const names = duelNames();
  let hint;
  if (G.mode === '2p') hint = duelHint2p();
  else hint = t('shooHint');
  if ((time * 3 | 0) % 3) txt(hint, 128, y0, '#ffd84a', 'center');
  // bar: the knot moves toward whoever is mashing harder
  const v = Math.max(-1, Math.min(1, (P.cnt[0] - P.cnt[1]) / 12));
  const bx = 70, bw = 116, by = y0 + 13;
  txt(names[0].slice(0, 6), bx - 4, by - 1, shooterIdx() === 0 ? '#5ae07a' : '#ff6a5a', 'right');
  txt(names[1].slice(0, 6), bx + bw + 4, by - 1, shooterIdx() === 1 ? '#5ae07a' : '#ff6a5a', 'left');
  ctx.fillStyle = '#5a5a66'; ctx.fillRect(bx, by + 1, bw, 5);
  const mid = bx + bw / 2, knot = Math.round(mid - v * (bw / 2 - 3));
  ctx.fillStyle = v >= 0 ? (shooterIdx() === 0 ? '#5ae07a' : '#ff6a5a') : (shooterIdx() === 1 ? '#5ae07a' : '#ff6a5a');
  ctx.fillRect(Math.min(mid, knot), by + 1, Math.abs(knot - mid), 5);
  ctx.fillStyle = '#fff'; ctx.fillRect(mid, by - 1, 1, 9);
  fillCircle(ctx, knot, by + 3, 3.5, '#ffd84a');
  // countdown above the goblin
  if (P.g.st === 'duel') {
    const n = String(Math.max(1, Math.ceil(P.duelT)));
    ctx.font = FONT16; ctx.textAlign = 'center';
    const gx = Math.round(P.g.x), gy = Math.round(P.g.y) - 20;
    ctx.fillStyle = '#000'; ctx.fillText(n, gx + 2, gy + 2);
    ctx.fillStyle = P.duelT < 1.5 ? '#ff6a5a' : '#ffffff'; ctx.fillText(n, gx, gy);
    ctx.font = FONT8;
  }
}

function respotCue() {
  const c = G.balls[0];
  c.in = false; c.vx = 0; c.vy = 0; c.lock = null;
  for (let rr = 0; rr < 120; rr += 4) for (let a = 0; a < 16; a++) {
    const x = LV.head.x + Math.cos(a / 16 * Math.PI * 2) * rr, y = LV.head.y + Math.sin(a / 16 * Math.PI * 2) * rr;
    if (spotFree(LV, G.balls, x, y, c)) { c.x = x; c.y = y; return; }
    if (rr === 0) break;
  }
  c.x = LV.head.x; c.y = LV.head.y;
}

function comboText(n) { return n === 2 ? t('combo2') : n === 3 ? t('combo3') : t('comboN', { n }); }

function endShot() {
  const p = cur(), s = G.shot, solo = G.mode === 'solo';
  let pass = false;
  const n = s.potted.length;
  if (n) {
    const mult = (hasFx(p, 'double') ? 1.5 : 1) * (hasFx(p, 'halfpt') ? 0.5 : 1);
    let pts = 0;
    for (const num of s.potted) pts += num === GOLD ? GOLD_POINTS : POINTS_PER_BALL;
    pts = Math.round(pts * mult * (n >= 2 ? n : 1) / 10) * 10;
    p.score += pts; G.visit += n;
    p.rack.push(...s.potted);
    p.st.pots += n; p.st.run += n; p.st.bestRun = Math.max(p.st.bestRun, p.st.run); p.st.combo = Math.max(p.st.combo, n);
    if (n >= 2) { G.combo = { s: comboText(n), t: 1.6 }; sfx('combo'); vib([30, 40, 30]); }
    if (s.potted.includes(GOLD)) showMsg(t('goldMsg'), 1.8);
    G.miss = 0;
  }
  if (s.scratch) {
    respotCue(); pass = true; p.st.run = 0; p.st.scr++;
    if (hasFx(p, 'shield')) { dropFx(p, 'shield'); showMsg(t('saved'), 1.8); sfx('perfect'); }
    else { p.lives--; showMsg(t('scratch'), 1.8); sfx('scratch'); vib(90); }
  } else if (!n) {
    p.st.run = 0;
    if (solo) {
      G.miss++;
      if (G.miss >= SOLO_MISSES) { G.miss = 0; p.lives--; showMsg(t('missLife'), 1.8); sfx('scratch'); vib(90); }
    } else if (hasFx(p, 'extra')) { dropFx(p, 'extra'); showMsg(t('extraUsed'), 1.6); }
    else pass = true;
  }
  if (n && !s.scratch && hasFx(p, 'one')) pass = true;
  if (solo) pass = false;
  if (G.prankCool > 0) G.prankCool--;
  // effects tick down per shot (quake ticks per turn)
  for (const f of p.fx) if (f.id !== 'quake') f.left--;
  p.fx = p.fx.filter(f => f.left > 0);

  if (p.lives <= 0) { gameOver(solo ? -1 : 1 - G.cur); return; }

  G.power = POWER_MIN; G.chDir = 1;
  G.phase = 'aim';
  pendingShot = false;
  const left = G.balls.some(b => b.num > 0 && !b.in);
  let cardFor = -1;
  if (!left) {
    const total = G.balls.length - 1;
    if (!s.scratch && G.visit >= total) { p.lives++; showMsg(t('perfect'), 2.2); sfx('perfect'); }
    if (G.cards && G.players.length === 2) {
      const [a0, a1] = G.players.map(x => x.rack.length);
      if (a0 !== a1) cardFor = a0 < a1 ? 0 : 1;
      else if (G.players[0].lives !== G.players[1].lives) cardFor = G.players[0].lives < G.players[1].lives ? 0 : 1;
    }
    G.trans = { t: 0, next: G.stage + 1, cardFor, swapped: false };
    G.phase = 'trans';
    if (isHost()) Net.send({ t: 'trans', next: G.stage + 1 });
  }
  if (pass) { G.cur = 1 - G.cur; G.visit = 0; G.turnStart = true; p.st.run = 0; }
  G.ai = null;
  if (G.phase !== 'trans') netSendState();
}

// table cleared: short pause, fade to black, new table fades in with its title
const TRANS = { show: 1.3, out: 0.6, title: 1.6, inn: 0.6 };
function transUpdate(dt) {
  const T = G.trans;
  T.t += dt;
  const swapAt = TRANS.show + TRANS.out;
  if (!T.swapped && T.t >= swapAt) {
    T.swapped = true;
    G.stage = T.next;
    if (isGuest()) { LV = prepLevel(buildLevel(levelSeed(T.next), T.next)); tableImg = buildTableImg(LV); G.balls = levelBalls(LV); G.levelCode = seedToCode(LV.seed, T.next); }
    else loadStage(T.next);
    for (const x of G.players) x.rack = [];
    G.visit = 0; G.miss = 0; G.angle = 0; G.msgT = 0; G.parts = [];
    sfx('stage');
  }
  if (T.t >= swapAt + TRANS.title) {
    G.trans = null;
    if (isGuest()) { G.phase = 'netwait'; tryApplyState(); return; }
    G.phase = 'wait'; G.timer = 0.3;
    if (T.cardFor >= 0) startCardPick(T.cardFor);
    netSendState();
  }
}
function drawTrans() {
  const T = G.trans;
  if (!T) return;
  const swapAt = TRANS.show + TRANS.out;
  let dark = 0;
  if (T.t > TRANS.show && T.t < swapAt) dark = (T.t - TRANS.show) / TRANS.out;
  else if (T.t >= swapAt) dark = Math.max(0, 1 - (T.t - swapAt) / TRANS.inn);
  if (dark > 0) { ctx.fillStyle = 'rgba(2,0,12,' + dark.toFixed(3) + ')'; ctx.fillRect(-600, -600, 1600, 1600); }
  if (T.t < TRANS.show) {                          // "table cleared" banner over the empty table
    const k = Math.min(1, T.t / 0.25);
    ctx.font = FONT16; ctx.textAlign = 'center';
    ctx.fillStyle = '#000'; ctx.fillText(t('cleared'), LV.cx + 2, LV.cy - 8 + 2);
    ctx.globalAlpha = k; ctx.fillStyle = '#5ae07a'; ctx.fillText(t('cleared'), LV.cx, LV.cy - 8); ctx.globalAlpha = 1;
    ctx.font = FONT8;
  } else if (T.t >= swapAt) {                      // new table title
    const k = Math.min(1, (T.t - swapAt) / 0.3), y = Math.round(LV.cy - 14 - (1 - k) * 10);
    ctx.globalAlpha = Math.min(1, k * 1.2);
    const title = t('stage', { n: G.stage });
    ctx.font = FONT16; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,10,0.75)'; ctx.fillRect(LV.cx - 90, y - 8, 180, 42);
    ctx.fillStyle = '#000'; ctx.fillText(title, LV.cx + 2, y + 2);
    ctx.fillStyle = '#ffd84a'; ctx.fillText(title, LV.cx, y);
    ctx.font = FONT8;
    txt(t('codeLabel', { c: G.levelCode }), LV.cx, y + 22, '#8af4ff', 'center');
    ctx.globalAlpha = 1;
  }
}

function gameOver(winner) {
  G.phase = 'over'; G.timer = 1.2; G.winner = winner;
  sfx('over');
  netSendState();
}

function sweepPower(dt) {
  G.power += G.chDir * POWER_SPEED * phys.meterMul * dt;
  if (G.power >= 1) { G.power = 1; G.chDir = -1; }
  if (G.power <= POWER_MIN) { G.power = POWER_MIN; G.chDir = 1; }
}

// ---------- particles + vibration ----------
function sparks(x, y, n, cols) {
  if (!G) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 60;
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5 + Math.random() * 0.5, col: cols[(Math.random() * cols.length) | 0] });
  }
}
function updateParts(dt) {
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
}
let touchMode = false;
function vib(p) { if (touchMode && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

// =====================================================================
//  AUDIO (tiny WebAudio blips) with volume
// =====================================================================
let AC = null, lastClick = 0;
function audioInit() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
}
function beep(f, dur, type, vol, slide, delay) {
  if (!AC || sfxVol <= 0) return;
  const t0 = AC.currentTime + (delay || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
  g.gain.setValueAtTime(Math.max(0.0002, (vol || 0.06) * sfxVol / 80), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(AC.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function sfx(name, v) {
  if (!AC) return;
  const now = performance.now();
  switch (name) {
    case 'ball': if (now - lastClick < 35) return; lastClick = now; beep(1100 + Math.min(600, v * 2), 0.035, 'square', Math.min(0.08, 0.01 + v / 3000)); break;
    case 'wall': if (now - lastClick < 35) return; lastClick = now; beep(160, 0.06, 'triangle', Math.min(0.12, 0.02 + v / 2000)); break;
    case 'bump': beep(520, 0.09, 'square', 0.07, 600); break;
    case 'warp': beep(300, 0.25, 'sine', 0.08, 900); beep(1200, 0.25, 'sine', 0.05, -900, 0.05); break;
    case 'pocket': beep(700, 0.22, 'square', 0.06, -500); break;
    case 'gold': [1046, 1318, 1568, 2093].forEach((f, i) => beep(f, 0.1, 'square', 0.05, 0, i * 0.06)); break;
    case 'combo': [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => beep(f, 0.08, 'square', 0.05, 0, i * 0.07)); break;
    case 'shoot': beep(140 + v * 120, 0.07, 'triangle', 0.12); break;
    case 'scratch': beep(220, 0.3, 'sawtooth', 0.05, -150); break;
    case 'perfect': [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.12, 'square', 0.05, 0, i * 0.09)); break;
    case 'over': [392, 330, 262].forEach((f, i) => beep(f, 0.2, 'square', 0.05, 0, i * 0.16)); break;
    case 'menu': beep(880, 0.04, 'square', 0.04); break;
    case 'stage': [392, 523, 659, 784].forEach((f, i) => beep(f, 0.1, 'triangle', 0.07, 0, i * 0.08)); break;
    case 'neon': beep(60 + Math.random() * 20, 0.08, 'sawtooth', 0.03); break;
  }
}

// =====================================================================
//  MUSIC — menu loop + shuffled in-game tracks (fade out, 1 s gap, next)
//  Put the files in a "music" folder next to index.html.
// =====================================================================
const MUSIC = { vol: 0.8, menu: 'music/menu.mp3', game: ['music/game1.mp3', 'music/game2.mp3', 'music/game3.mp3'] };
const Music = {
  el: null, mode: null, fade: 0, fadeDir: 0, gap: 0, last: -1, switching: false, broken: new Set(),
  play(src, loop) {
    const a = new Audio(src);
    a.loop = loop; a.volume = 0;
    a.addEventListener('ended', () => { if (this.el === a) { this.el = null; this.gap = 1; } });
    a.addEventListener('error', () => { this.broken.add(src); if (this.el === a) { this.el = null; this.gap = 0.1; } });
    const pr = a.play(); if (pr && pr.catch) pr.catch(() => {});
    this.el = a; this.fade = 0; this.fadeDir = 1;
  },
  start() {
    if (musicVol <= 0 || !this.mode || this.el) return;
    if (this.mode === 'menu') { if (!this.broken.has(MUSIC.menu)) this.play(MUSIC.menu, true); return; }
    const ok = MUSIC.game.map((s, i) => i).filter(i => !this.broken.has(MUSIC.game[i]));
    if (!ok.length) return;
    const pool = ok.length > 1 ? ok.filter(i => i !== this.last) : ok;
    const i = pool[(Math.random() * pool.length) | 0];
    this.last = i;
    this.play(MUSIC.game[i], false);
  },
  setMode(m) {
    if (m === this.mode) return;
    this.mode = m; this.gap = 0;
    if (this.el) { this.fadeDir = -1; this.switching = true; } else this.start();
  },
  volumeChanged() {
    if (musicVol <= 0 && this.el) { this.el.pause(); this.el = null; this.switching = false; }
    else if (musicVol > 0 && !this.el) this.start();
  },
  update(dt) {
    if (this.el) {
      const a = this.el;
      if (this.fadeDir) {
        this.fade += this.fadeDir * dt / 0.8;
        if (this.fade >= 1) { this.fade = 1; this.fadeDir = 0; }
        if (this.fade <= 0) {
          a.pause(); this.el = null; this.fade = 0; this.fadeDir = 0;
          if (this.switching) { this.switching = false; this.start(); }
          return;
        }
      }
      let v = this.fade;
      if (!a.loop && a.duration && isFinite(a.duration)) { const left = a.duration - a.currentTime; if (left < 4) v *= Math.max(0, left / 4); }
      a.volume = Math.max(0, Math.min(1, v * MUSIC.vol * (musicVol / 100) * (G && G.paused ? 0.4 : 1)));
    } else if (this.gap > 0) {
      this.gap -= dt;
      if (this.gap <= 0) this.start();
    }
  }
};

// =====================================================================
//  GRAPHICS
// =====================================================================
const COL = { bg1: '#1a1240', bg2: '#22195a', hud: '#000', gold: '#ffd84a' };
const BALL_COL = ['#f0f0f0', '#f2c522', '#2a5bd7', '#d6312b', '#7b3fb8', '#f08a1c', '#2fae5a', '#8a1c2a', '#202020', '#e8e070', '#ffcf3a'];
const DIGITS = {
  1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '011', '001', '111'], 4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'], 6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111']
};

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * k) | 0, g = Math.min(255, ((n >> 8) & 255) * k) | 0, b = Math.min(255, (n & 255) * k) | 0;
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function fillCircle(c2, cx, cy, r, col) {
  c2.fillStyle = col;
  const ri = Math.ceil(r);
  for (let dy = -ri; dy <= ri; dy++) {
    if (r * r - dy * dy < 0) continue;
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    c2.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
}

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function buildBallSprite(num) {
  const c = makeCanvas(9, 9), x = c.getContext('2d');
  const base = BALL_COL[num], dark = shade(base, 0.62), rim = shade(base, 0.42);
  for (let py = 0; py < 9; py++) for (let px = 0; px < 9; px++) {
    const dx = px - 4, dy = py - 4, d2 = dx * dx + dy * dy;
    if (d2 > 20.5) continue;
    let col = base;
    if (d2 > 13) col = (dx + dy >= 0) ? rim : base;
    else if (dx + dy >= 4) col = dark;
    x.fillStyle = col; x.fillRect(px, py, 1, 1);
  }
  x.fillStyle = '#ffffff'; x.fillRect(2, 2, 1, 1);
  if (num === GOLD) {                       // gold ball: little white star
    x.fillStyle = '#fffbe0';
    x.fillRect(4, 2, 1, 5); x.fillRect(2, 4, 5, 1); x.fillRect(3, 3, 3, 3);
  } else if (num > 0) {
    x.fillStyle = (num === 1 || num === 9) ? '#202020' : '#ffffff';
    const g = DIGITS[num];
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r][q] === '1') x.fillRect(3 + q, 2 + r, 1, 1);
  }
  return c;
}

let cv, ctx, tableImg, ballImg = [];
// ---------- Animated galaxy background ----------
let spaceImg = null, stars = [];
function buildSpace() {
  const c = makeCanvas(W * 2, H), x = c.getContext('2d');
  x.fillStyle = COL.bg1; x.fillRect(0, 0, W * 2, H);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const blobs = [];
  for (let i = 0; i < 7; i++) blobs.push({ x: rnd() * W, y: 40 + rnd() * (H - 40), r: 30 + rnd() * 50, c: ['#46238a', '#22388a', '#6e2470'][i % 3] });
  for (let y = 0; y < H; y++) for (let px = 0; px < W; px++) {
    let best = null, bv = 0;
    for (const b of blobs) for (const ox of [-W, 0, W]) {
      const v = 1 - Math.hypot(px - b.x - ox, y - b.y) / b.r;
      if (v > bv) { bv = v; best = b; }
    }
    const th = ((px * 7 + y * 13) % 16) / 16;
    let col = ((px + y) % 4 === 0) ? COL.bg2 : null;
    if (best && bv * 1.25 > th + 0.15) col = best.c;
    if (col) { x.fillStyle = col; x.fillRect(px, y, 1, 1); x.fillRect(px + W, y, 1, 1); }
  }
  spaceImg = c;
  for (let i = 0; i < 70; i++) stars.push({ x: rnd() * W, y: rnd() * H, z: 1 + ((rnd() * 3) | 0), tw: rnd() * 6.28 });
}
function drawSpace(time) {
  const off = (time * 3) % (W * 2), vw = VIEW.w, sy = VIEW.h / H;
  for (let x0 = -off; x0 < vw; x0 += W * 2) ctx.drawImage(spaceImg, x0, 0, W * 2, VIEW.h);
  for (const s0 of stars) {
    const s = { z: s0.z, tw: s0.tw, y: s0.y * sy };
    const x = ((s0.x * vw / W - time * s.z * 4) % vw + vw) % vw;
    const tw = Math.sin(time * (1 + s.z) + s.tw);
    if (s.z === 3) {
      ctx.fillStyle = tw > 0.3 ? '#ffffff' : '#b8b0ff';
      ctx.fillRect(x | 0, s.y | 0, 1, 1);
      if (tw > 0.75) { ctx.fillStyle = 'rgba(200,190,255,0.6)'; ctx.fillRect((x | 0) - 1, s.y | 0, 3, 1); ctx.fillRect(x | 0, (s.y | 0) - 1, 1, 3); }
    } else {
      ctx.fillStyle = s.z === 2 ? (tw > -0.2 ? '#a8a0ff' : '#5a52a8') : (tw > 0 ? '#6a62c8' : '#3a3290');
      ctx.fillRect(x | 0, s.y | 0, 1, 1);
    }
  }
}

function txt(s, x, y, col, align) {
  ctx.fillStyle = col || '#fff';
  ctx.textAlign = align || 'left';
  ctx.fillText(s, x, y);
}
function pad6(n) { return String(Math.max(0, n)).padStart(6, '0'); }
const FONT8 = '8px "Press Start 2P", monospace', FONT16 = '16px "Press Start 2P", monospace';

function drawBall(b, time) {
  if (b.in) return;
  ctx.drawImage(ballImg[b.num], Math.round(b.x) - 4, Math.round(b.y) - 4);
  if (b.num === GOLD && ((time * 3) % 1) < 0.25) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(b.x) + 3, Math.round(b.y) - 5, 1, 1); }
}

function aimTrace(bs, ang) {
  const c = bs[0], dx = Math.cos(ang), dy = Math.sin(ang);
  let x = c.x, y = c.y;
  for (let i = 0; i < 1000; i++) {
    x += dx * 0.5; y += dy * 0.5;
    for (let j = 1; j < bs.length; j++) {
      const b = bs[j];
      if (!b.in && (b.x - x) ** 2 + (b.y - y) ** 2 < D * D) return { x, y, hit: b };
    }
    for (const m of LV.bumpers) if ((m.x - x) ** 2 + (m.y - y) ** 2 < (m.r + R) ** 2) return { x, y, hit: null };
    for (const s of cellSegs(LV, x, y)) { const [cx, cy] = closest(x, y, s); if ((x - cx) ** 2 + (y - cy) ** 2 < R * R) return { x, y, hit: null }; }
    if ((i & 3) === 0 && !pointInPoly(LV.poly, x, y) && polyDist(LV.poly, x, y) > 4) return { x, y, hit: null };
  }
  return { x, y, hit: null };
}

function drawStar(cx, cy, rot) {
  // own 5-point star, rasterised per pixel so it stays crisp while spinning
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 2.3 : 5.6, a = rot + i * Math.PI / 5 - Math.PI / 2;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const inside = (x, y) => {
    let c = false;
    for (let i = 0, j = 9; i < 10; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const ox = Math.round(cx), oy = Math.round(cy);
  for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) {
    if (inside(x, y)) {
      ctx.fillStyle = (x * x + y * y <= 2) ? '#ffffff' : '#ffd84a';
      ctx.fillRect(ox + x, oy + y, 1, 1);
    } else if (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1)) {
      ctx.fillStyle = '#7a2a10';
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function drawAim() {
  const c = G.balls[0];
  if (c.in) return;
  const ang = G.angle + G.aimOff;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const mine = localTurn();
  if (G.mods.guide && mine) {
    const tr = aimTrace(G.balls, ang);
    const len = Math.hypot(tr.x - c.x, tr.y - c.y);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let d = R + 4; d < len - 2; d += 4) if (Math.abs(d - G.starD) > 8) ctx.fillRect(Math.round(c.x + dx * d), Math.round(c.y + dy * d), 1, 1);
    for (let a = 0; a < 24; a++) { const an = a / 24 * Math.PI * 2; ctx.fillRect(Math.round(tr.x + Math.cos(an) * R), Math.round(tr.y + Math.sin(an) * R), 1, 1); }
    if (tr.hit) {
      const hx = tr.hit.x - tr.x, hy = tr.hit.y - tr.y, hl = Math.hypot(hx, hy) || 1;
      ctx.fillStyle = COL.gold;
      for (let d = 7; d <= 19; d += 4) ctx.fillRect(Math.round(tr.hit.x + hx / hl * d), Math.round(tr.hit.y + hy / hl * d), 1, 1);
    }
  } else if (helpLine && mine) {
    const tr = aimTrace(G.balls, ang);
    const len = Math.min(G.starD + 34, Math.hypot(tr.x - c.x, tr.y - c.y) - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let d = R + 4; d < len; d += 4) if (Math.abs(d - G.starD) > 8) ctx.fillRect(Math.round(c.x + dx * d), Math.round(c.y + dy * d), 1, 1);
  }
  if (!(G.mods.blind && (G.starSpin % 2.4) > 1.7)) drawStar(c.x + dx * G.starD, c.y + dy * G.starD, G.starSpin);
}

function drawHUD() {
  ctx.fillStyle = COL.hud; ctx.fillRect(0, 0, W, 39);
  ctx.fillStyle = COL.gold; ctx.fillRect(0, 39, W, 1);
  const blink = (performance.now() / 300 | 0) % 2;
  G.players.forEach((p, i) => {
    const y = 4 + i * 11;
    if (i === G.cur && G.phase !== 'over' && blink && G.players.length > 1) {
      ctx.fillStyle = COL.gold;
      ctx.fillRect(2, y + 1, 1, 6); ctx.fillRect(3, y + 2, 1, 4); ctx.fillRect(4, y + 3, 1, 2);
    }
    const mine = G.net ? i === G.net.me : !p.cpu;
    txt(p.name.padEnd(3, ' ').slice(0, 3), 8, y, i === G.cur ? (G.net && mine ? COL.gold : '#fff') : '#9890d8');
    txt(pad6(p.score), 36, y, '#fff');
    const shown = Math.min(p.lives, 4);
    for (let k = 0; k < shown; k++) fillCircle(ctx, 90 + k * 6, y + 3, 2.3, '#e8443a');
    if (p.lives > 4) { ctx.fillStyle = '#e8443a'; ctx.fillRect(112, y + 3, 3, 1); ctx.fillRect(113, y + 2, 1, 3); }
    // balls this player potted on the current table
    p.rack.slice(0, 10).forEach((num, k) => {
      const bx = Math.round(119 + k * 5.4);
      fillCircle(ctx, bx, y + 3, 2.6, shade(BALL_COL[num], 0.5));
      fillCircle(ctx, bx, y + 3, 1.8, BALL_COL[num]);
    });
  });
  if (G.mode === 'solo') {                      // practice: misses left before losing a life
    txt(t('missHud'), 8, 15, '#9890d8');
    for (let k = 0; k < SOLO_MISSES; k++) {
      fillCircle(ctx, 57 + k * 9, 18, 3.5, '#5a5a66');
      fillCircle(ctx, 57 + k * 9, 18, 2.6, k < SOLO_MISSES - G.miss ? '#3a7ae8' : '#000');
    }
  }
  txt(t('stageHud') + ' ' + String(G.stage).padStart(2, '0'), 252, 4, '#fff', 'right');
  txt(t('hiHud') + ' ' + pad6(Math.max(topHi(), ...G.players.filter((p, i) => G.net ? i === G.net.me : !p.cpu).map(p => p.score))), 252, 15, COL.gold, 'right');

  // power: black = empty, red = full, sweeping up and down
  txt(t('power'), 8, 27, '#fff');
  const filled = G.phase === 'aim' ? Math.ceil(G.power * 12 - 0.001) : 0;
  for (let k = 0; k < 12; k++) {
    const cx = 57 + k * 9, cy = 30;
    fillCircle(ctx, cx, cy, 3.5, '#5a5a66');
    fillCircle(ctx, cx, cy, 2.6, k < filled ? '#e8443a' : '#000');
    if (k < filled) { ctx.fillStyle = '#ff9a8a'; ctx.fillRect(cx - 1, cy - 1, 1, 1); }
  }
  if (G.phase !== 'over') {
    const p = cur();
    const thinking = p.cpu && G.phase === 'aim' && G.ai && G.ai.stage === 'plan';
    txt(thinking ? t('thinking', { p: p.name }) : t('toShoot', { p: p.name }), 252, 27, '#c8c0ff', 'right');
  }
  if (G.msgT > 0 && G.msg && !duelOpen()) txt(G.msg, W / 2, 226, COL.gold, 'center');
  // active card effects of the player to shoot
  const fx = cur().fx;
  if (fx.length && G.phase !== 'over' && !G.prank) {
    const parts = fx.map(f => { const c = CARD[f.id]; return { s: cardText(c)[2] + (f.arrow || '') + ' ' + f.left, col: c.k === 'curse' ? '#ff6a5a' : '#5ae07a' }; });
    const gap = 10;
    let tw = -gap; for (const q of parts) tw += ctx.measureText(q.s).width + gap;
    let x = Math.max(4, (W - tw) / 2);
    for (const q of parts) { txt(q.s, x, 213, q.col); x += ctx.measureText(q.s).width + gap; }
  }
}

function drawBlackHole(time) {
  for (let i = 0; i < 26; i++) {
    const r = 3 + (i % 5) * 2.2, a = time * (2.6 - r * 0.15) + i * 2.4;
    ctx.fillStyle = i % 3 ? '#7a4ad8' : '#d8a0ff';
    ctx.fillRect(Math.round(LV.cx + Math.cos(a) * r), Math.round(LV.cy + Math.sin(a) * r * 0.8), 1, 1);
  }
  fillCircle(ctx, Math.round(LV.cx), Math.round(LV.cy), 3, '#000');
}

function drawCombo(time) {
  const cb = G.combo;
  if (!cb || cb.t <= 0) return;
  const cols = ['#ffd84a', '#ff6a5a', '#5ae07a', '#3ae0ff', '#ff5ae0'];
  const k = Math.min(1, (1.6 - cb.t) / 0.2);
  const y = Math.round(LV.cy - 12 - (1 - k) * 20 + Math.sin(time * 10) * 2);
  ctx.font = FONT16;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000'; ctx.fillText(cb.s, LV.cx + 2, y + 2);
  ctx.fillStyle = cols[((time * 12) | 0) % cols.length]; ctx.fillText(cb.s, LV.cx, y);
  ctx.font = FONT8;
}

// wide mode: short messages + the "mash SHOT" prompt drawn as banners over the rails
function banner(text, y, col) {
  const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = 'rgba(0,0,10,0.82)';
  ctx.fillRect(Math.round(128 - w / 2), y - 2, Math.round(w), 12);
  txt(text, 128, y, col, 'center');
}
function drawWideBanners() {
  if (G.prank && !G.prank.res && (G.prank.g.st === 'in' || G.prank.g.st === 'duel')) return;   // the duel bar is there
  if (G.msgT > 0 && G.msg) banner(G.msg, 205, COL.gold);
}

function render() {
  const time = performance.now() / 1000;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawSpace(time);
  if (Splash.on) {
    ctx.save(); ctx.translate(Math.round((VIEW.w - W) / 2), Math.round((VIEW.h - H) / 2));
    Splash.draw(time);
    ctx.restore();
    return;
  }
  let sx = 0, sy = 0;
  if (G && G.shake > 0) { sx = Math.round((Math.random() - 0.5) * 4); sy = Math.round((Math.random() - 0.5) * 4); }
  ctx.save();
  ctx.translate(VIEW.ox + sx, VIEW.oy + sy);
  ctx.drawImage(tableImg, 0, 0);
  drawLevelFx(LV, ctx, time);
  if (!G) {
    for (const b of demoBalls) drawBall(b, time);
    ctx.restore();
    return;
  }
  if (phys.hole && (G.phase === 'aim' || G.phase === 'moving')) drawBlackHole(time);
  for (const b of G.balls) drawBall(b, time);
  if (G.phase === 'aim') drawAim();
  if (G.prank) drawGoblin(G.prank.g);
  for (const p of G.parts) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.life > 0.4 ? 2 : 1, p.life > 0.4 ? 2 : 1); }
  if (G.mods.dark && (G.phase === 'aim' || G.phase === 'moving') && !G.balls[0].in) {
    const c = G.balls[0];
    ctx.beginPath();
    ctx.rect(-600, VIEW.wide ? -600 : 40, 1600, 1600);
    ctx.arc(c.x, c.y, 50, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(2,0,10,0.86)';
    ctx.fill('evenodd');
  }
  drawCombo(time);
  drawTrans();
  drawDuel(time);
  if (VIEW.wide && !G.trans) drawWideBanners();
  ctx.restore();
  if (VIEW.wide) updateWideHud();
  else drawHUD();
  drawGoblin(G.gob);
}

// ---------- wide-mode HTML side panels ----------
let hudSig = '', hudPow = -1;
function playerPanel(i) {
  const p = G.players[i], turn = i === G.cur && G.phase !== 'over';
  const mine = G.net ? i === G.net.me : !p.cpu;
  const thinking = p.cpu && turn && G.phase === 'aim' && G.ai && G.ai.stage === 'plan';
  let h = '<div class="pp' + (turn ? ' turn' : '') + (mine && G.net ? ' mine' : '') + '">';
  h += '<div class="nm">' + (turn && G.players.length > 1 ? '&#9654; ' : '') + p.name + '</div>';
  h += '<div class="sc">' + pad6(p.score) + '</div>';
  h += '<div class="lv">' + '<i></i>'.repeat(Math.min(p.lives, 6)) + (p.lives > 6 ? '+' : '') + '</div>';
  h += '<div class="rk">' + p.rack.map(n => '<i style="background:' + BALL_COL[n] + '"></i>').join('') + '</div>';
  if (thinking) h += '<div class="th">' + t('thinking', { p: '' }).trim() + '</div>';
  for (const f of p.fx) { const c = CARD[f.id]; h += '<div class="fx ' + c.k + '">' + cardText(c)[2] + (f.arrow || '') + ' ' + f.left + '</div>'; }
  return h + '</div>';
}
function updateWideHud() {
  let L = playerPanel(0), Rr = '';
  if (G.players.length > 1) Rr += playerPanel(1);
  else {
    Rr += '<div class="pp"><div class="nm">' + t('missHud') + '</div><div class="miss">';
    for (let k = 0; k < SOLO_MISSES; k++) Rr += '<i class="' + (k < SOLO_MISSES - G.miss ? 'on' : '') + '"></i>';
    Rr += '</div></div>';
  }
  Rr += '<div class="meta">' + t('stageHud') + ' ' + String(G.stage).padStart(2, '0') + '<br><span>' + t('hiHud') + ' ' +
    pad6(Math.max(topHi(), ...G.players.filter((p, i) => G.net ? i === G.net.me : !p.cpu).map(p => p.score))) + '</span></div>';
  const sig = L + '|' + Rr;
  if (sig !== hudSig) { hudSig = sig; $('hudLp').innerHTML = L; $('hudRp').innerHTML = Rr; }
  const filled = G.phase === 'aim' ? Math.ceil(G.power * 12 - 0.001) : 0;
  if (filled !== hudPow) {
    hudPow = filled;
    [...$('powCol').children].forEach((d, k) => d.classList.toggle('on', 11 - k < filled));
  }
}
function updateHudVisibility() {
  const show = VIEW.wide && G && !Splash.on;
  $('hudL').classList.toggle('hidden', !show);
  $('hudR').classList.toggle('hidden', !show);
  hudSig = ''; hudPow = -1;
}

// =====================================================================
//  SPLASH — the neon CosmoPool sign lights up out of the dark
// =====================================================================
const Splash = {
  on: true, t: 0, done: false, flick: [],
  start() {
    this.on = true; this.t = 0;
    // a few random flicker moments while the sign "warms up"
    this.flick = [];
    for (let i = 0; i < 9; i++) this.flick.push(0.6 + Math.random() * 1.6);
  },
  lit(time) {
    if (this.t < 0.6) return 0;
    for (const f of this.flick) if (this.t > f && this.t < f + 0.06) return 0.15;
    if (this.t < 2.2) return ((this.t * 13) | 0) % 5 === 0 ? 0.3 : 1;
    return 0.92 + Math.sin(time * 20) * 0.04 + (Math.random() < 0.01 ? -0.6 : 0);
  },
  update(dt) {
    if (!this.on) return;
    const before = this.t;
    this.t += dt;
    if (this.t > 0.6 && ((this.t * 13) | 0) !== ((before * 13) | 0) && this.t < 2.2) sfx('neon');
    if (this.t > 4.2) this.finish();
  },
  skip() { if (this.on && this.t > 0.3) this.finish(); },
  finish() {
    if (!this.on) return;
    this.on = false;
    document.getElementById('overlay').classList.add('fadein');
    afterSplash();
  },
  draw(time) {
    const k = Math.min(1, this.t / 1.4);
    // darkness lifting
    ctx.fillStyle = 'rgba(0,0,0,' + (1 - k * 0.65) + ')';
    ctx.fillRect(-600, -600, 1600, 1600);
    const lit = this.lit(time);
    const y = 92;
    ctx.save();
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    // dark tube outline (always faintly visible)
    ctx.fillStyle = '#2a1a3a';
    ctx.fillText('COSMO', W / 2, y); ctx.fillText('POOL', W / 2, y + 34);
    if (lit > 0) {
      ctx.globalAlpha = lit;
      ctx.shadowBlur = 14; ctx.shadowColor = '#ff3ad8';
      ctx.fillStyle = '#ff7ae8'; ctx.fillText('COSMO', W / 2, y);
      ctx.shadowColor = '#3ae0ff';
      ctx.fillStyle = '#8af4ff'; ctx.fillText('POOL', W / 2, y + 34);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = lit * 0.55;
      ctx.fillText('COSMO', W / 2, y); ctx.fillText('POOL', W / 2, y + 34);
    }
    ctx.restore();
    // little spinning star + balls under the sign
    if (this.t > 1.2) {
      ctx.globalAlpha = Math.min(1, (this.t - 1.2) / 0.6);
      drawStar(W / 2, 168, time * 3);
      [[1, -58], [2, -38], [3, 29], [4, 49]].forEach(([n, dx]) => ctx.drawImage(ballImg[n], W / 2 + dx, 164));
      ctx.globalAlpha = 1;
    }
    ctx.font = FONT8;
    if (this.t > 2.6 && ((time * 2) | 0) % 2) txt(t('pressStart'), W / 2, 206, '#c8c0ff', 'center');
  }
};

// =====================================================================
//  INPUT
// =====================================================================
const keys = {}, KEYS = keys;
const V = { left: false, right: false, up: false, down: false };
let pendingShot = false, rotHold = 0, drag = null, padPrev = {};
function requestShot(clientX, kind) {
  if (G && G.phase === 'prank' && !G.paused) { mashPointer(clientX == null ? 0 : clientX, kind); return; }
  if (G && kind && kind !== 'pad' && !devAllows(G.cur, kind)) return;
  if (humanAim() && !G.balls[0].in) pendingShot = true;
}

function overlayOpen() { return !document.getElementById('overlay').classList.contains('hidden'); }
function humanAim() { return G && G.phase === 'aim' && !G.paused && localTurn() && !overlayOpen() && !Splash.on; }

function toLocal(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * cv.width / r.width - VIEW.ox, y: (e.clientY - r.top) * cv.height / r.height - VIEW.oy };
}

function blankPad() { return { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, start: 0, lb: 0, rb: 0, ax: 0, ay: 0, rx: 0, ry: 0 }; }
function readPad(p) {
  const bt = i => (p.buttons[i] && p.buttons[i].pressed) ? 1 : 0;
  const s = { l: bt(14), r: bt(15), u: bt(12), d: bt(13), a: bt(0), b: bt(1), start: bt(9), lb: bt(4), rb: bt(5),
    ax: p.axes[0] || 0, ay: p.axes[1] || 0, rx: p.axes[2] || 0, ry: p.axes[3] || 0 };
  s.su = s.ay < -0.6 ? 1 : 0; s.sd = s.ay > 0.6 ? 1 : 0; s.sl = s.ax < -0.6 ? 1 : 0; s.sr = s.ax > 0.6 ? 1 : 0;
  return s;
}
function pollPad() {
  const st = blankPad();
  st.byIdx = {};                                   // each controller separately (local 2 players)
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p) continue;
    st.byIdx[p.index] = readPad(p);
    const bt = i => (p.buttons[i] && p.buttons[i].pressed) ? 1 : 0;
    st.l |= bt(14); st.r |= bt(15); st.u |= bt(12); st.d |= bt(13);
    st.a |= bt(0); st.b |= bt(1); st.start |= bt(9); st.lb |= bt(4); st.rb |= bt(5);
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (Math.hypot(ax, ay) > Math.hypot(st.ax, st.ay)) { st.ax = ax; st.ay = ay; }
    const rx = p.axes[2] || 0, ry = p.axes[3] || 0;
    if (Math.abs(rx) > Math.abs(st.rx)) st.rx = rx;
    if (Math.abs(ry) > Math.abs(st.ry)) st.ry = ry;
  }
  st.su = st.ay < -0.6 ? 1 : 0; st.sd = st.ay > 0.6 ? 1 : 0;
  st.sl = st.ax < -0.6 ? 1 : 0; st.sr = st.ax > 0.6 ? 1 : 0;
  return st;
}
function edge(pad, k) { return pad[k] && !padPrev[k]; }
// edge for one controller (index) — used when each player owns a controller
function edgeIdx(pad, idx, k) { const a = pad.byIdx && pad.byIdx[idx], b = padPrev.byIdx && padPrev.byIdx[idx]; return !!(a && a[k] && !(b && b[k])); }

// ---------- local 2 players: who owns which device ('kb', 'touch', 'pad:N') ----------
function devOf(pi) { return G && G.dev ? G.dev[pi] : null; }
function devAllows(pi, kind) {             // kind: 'kb' (keyboard + mouse), 'touch', 'pad:N'
  const d = devOf(pi);
  if (!d) return true;                     // not a bound game: every device works
  if (d === kind) return true;
  return (d === 'kb' && kind === 'mouse');
}
function playerPadState(pad) {             // the controller state the current player may use
  const d = devOf(G.cur);
  if (!d) return pad;
  if (d.startsWith('pad:')) return (pad.byIdx && pad.byIdx[+d.slice(4)]) || blankPad();
  return blankPad();
}
function playerPadEdge(pad, k) {
  const d = devOf(G.cur);
  if (!d) return edge(pad, k);
  return d.startsWith('pad:') ? edgeIdx(pad, +d.slice(4), k) : false;
}

let join2p = null;
function startJoin2p() {
  join2p = { dev: [null, null] };
  showScreen('scrJoin2p');
  if (document.activeElement) document.activeElement.blur();
  drawJoin2p();
}
function join2pActive() { return currentScreen() === 'scrJoin2p'; }
function devName(d) {
  if (!d) return t('pressAny');
  if (d.startsWith('pad:')) return t('devPad', { n: +d.slice(4) + 1 });
  return d === 'kb' ? t('devKb') : t('devTouch');
}
function drawJoin2p() {
  [0, 1].forEach(i => {
    const el = $('join2p' + i), d = join2p.dev[i];
    el.querySelector('.who').textContent = 'P' + (i + 1);
    el.querySelector('.dev').textContent = devName(d);
    el.classList.toggle('ok', !!d);
    el.classList.toggle('next', !d && (i === 0 || join2p.dev[0]));
  });
  $('join2pGo').disabled = !(join2p.dev[0] && join2p.dev[1]);
  if (join2p.dev[0] && join2p.dev[1]) $('join2pGo').focus();
}
function join2pPress(kind) {
  if (!join2p) return;
  const d = join2p.dev;
  // a controller can belong to one player only; keyboard / touch screen can be shared
  if (kind.startsWith('pad:') && d.includes(kind)) {
    if (d[0] && d[1]) onAction('join2p-go');
    return;
  }
  const slot = !d[0] ? 0 : !d[1] ? 1 : -1;
  if (slot < 0) return;
  d[slot] = kind;
  sfx('perfect');
  drawJoin2p();
}

function handlePadMenus(pad) {
  if (Splash.on) { if (edge(pad, 'a') || edge(pad, 'start')) Splash.skip(); return; }
  if (overlayOpen() && join2pActive()) {
    for (const idx in (pad.byIdx || {})) {
      if (edgeIdx(pad, +idx, 'a')) join2pPress('pad:' + idx);
      if (edgeIdx(pad, +idx, 'start') && join2p.dev[0] && join2p.dev[1]) onAction('join2p-go');
      if (edgeIdx(pad, +idx, 'b')) showScreen('scrMain');
    }
    return;
  }
  if (overlayOpen()) {
    if (nameActive()) {
      if (edge(pad, 'u') || edge(pad, 'su')) nameKey('ArrowUp');
      if (edge(pad, 'd') || edge(pad, 'sd')) nameKey('ArrowDown');
      if (edge(pad, 'l') || edge(pad, 'sl')) nameKey('ArrowLeft');
      if (edge(pad, 'r') || edge(pad, 'sr')) nameKey('ArrowRight');
      if (edge(pad, 'a')) nameKey('PadA');
      return;
    }
    const el = document.activeElement;
    const range = el && el.type === 'range';
    if (edge(pad, 'u') || edge(pad, 'su')) menuMove(-1);
    if (edge(pad, 'd') || edge(pad, 'sd')) menuMove(1);
    if (range && (edge(pad, 'l') || edge(pad, 'r') || edge(pad, 'sl') || edge(pad, 'sr'))) {
      el.value = Math.max(0, Math.min(100, +el.value + ((pad.l || pad.sl) ? -10 : 10)));
      el.dispatchEvent(new Event('input'));
    } else {
      if (edge(pad, 'r') || edge(pad, 'sr')) menuMove(1);
      if (edge(pad, 'l') || edge(pad, 'sl')) menuMove(-1);
    }
    if (edge(pad, 'a')) { if (el && (el.tagName === 'BUTTON' || el.tagName === 'A')) el.click(); else menuMove(0); }
    if (edge(pad, 'b') || edge(pad, 'start')) { if (G && (G.paused || isPauseOpen())) resume(); }
  } else if (G && edge(pad, 'start')) pause();
}

function humanUpdate(dt, padAll) {
  const pad = playerPadState(padAll);
  const kb = devAllows(G.cur, 'kb'), keys = kb ? KEYS : {};
  let rot = 0;
  if (keys.ArrowLeft || keys.KeyA || pad.l || V.left) rot -= 1;
  if (keys.ArrowRight || keys.KeyD || pad.r || V.right) rot += 1;
  if (pad.lb) rot -= 0.15;
  if (pad.rb) rot += 0.15;
  let push = 0;                                   // star distance: up = further, down = closer
  if (keys.ArrowUp || keys.KeyW || pad.u || V.up) push += 1;
  if (keys.ArrowDown || keys.KeyS || pad.d || V.down) push -= 1;
  if (Math.abs(pad.ry) > 0.3) push -= pad.ry;
  if (push) G.starD = Math.max(STAR_MIN, Math.min(STAR_MAX, G.starD + push * 45 * dt));
  if (G.mods.rev) rot = -rot;
  const slow = ((keys.ShiftLeft || keys.ShiftRight) ? 0.25 : 1) * (G.mods.calm ? 0.45 : 1);
  if (rot) { rotHold += dt; G.angle += rot * Math.min(2.2, 0.35 + rotHold * 1.6) * slow * dt; } else rotHold = 0;
  if (Math.abs(pad.rx) > 0.2) G.angle += pad.rx * 0.3 * dt;
  if (Math.hypot(pad.ax, pad.ay) > 0.6) G.angle = Math.atan2(pad.ay, pad.ax);
  if (playerPadEdge(padAll, 'a')) requestShot(null, 'pad');
  sweepPower(dt);
  if (G.net) {
    G.net.aimT += dt;
    if (G.net.aimT > 0.05) { G.net.aimT = 0; Net.send({ t: 'aim', a: G.angle + G.aimOff, p: G.power, d: G.starD }); }
  }
  if (pendingShot) {
    pendingShot = false;
    if (isGuest()) { Net.send({ t: 'shotReq', a: G.angle + G.aimOff, p: G.power }); G.phase = 'netwait'; sfx('shoot', G.power); }
    else shoot(G.angle, G.power);
  }
}

function aiUpdate(dt) {
  if (!G.ai) G.ai = startAI(G.diff);
  const ai = G.ai;
  ai.time += dt;
  if (ai.stage === 'plan') {
    const t0 = performance.now();
    while (ai.i < ai.cands.length && performance.now() - t0 < 7) evalCand(ai, ai.cands[ai.i++]);
    sweepPower(dt);
    if (ai.i >= ai.cands.length && ai.time > 0.6) {
      const b = ai.best || { a: 0, p: 0.5 };
      ai.ta = b.a + gauss() * ai.df.an;
      ai.tp = Math.max(POWER_MIN + 0.03, Math.min(0.995, b.p + gauss() * ai.df.pn));
      ai.stage = 'turn';
    }
  } else if (ai.stage === 'turn') {
    const d = angDiff(ai.ta, G.angle), st = 2.6 * dt;
    if (Math.abs(d) <= st) { G.angle = ai.ta; ai.stage = 'charge'; ai.time = 0; }
    else G.angle += Math.sign(d) * st;
    sweepPower(dt);
  } else if (ai.stage === 'charge') {
    const before = G.power;
    sweepPower(dt);
    const crossed = (before - ai.tp) * (G.power - ai.tp) <= 0;
    if (ai.time > 0.35 && crossed) { G.power = ai.tp; shoot(G.angle, ai.tp); }
  }
}

// =====================================================================
//  MENUS
// =====================================================================
function $(id) { return document.getElementById(id); }
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.title = 'CosmoPool';
  $('btnHelp').textContent = t('helpLine', { v: t(helpLine ? 'on' : 'off') });
  $('btnCards').textContent = t('cardsOpt', { v: t(cardsOn ? 'on' : 'off') });
  $('mvolVal').textContent = musicVol ? musicVol + '%' : t('off');
  $('svolVal').textContent = sfxVol ? sfxVol + '%' : t('off');
  const hi = topHi();
  $('hiText').textContent = hi > 0 ? t('hiscore', { n: pad6(hi) }) : '';
  $('codeNote').textContent = pendingCode ? t('codeSet', { c: seedToCode(pendingCode.seed, pendingCode.stage) }) : '';
}

function showScreen(id) {
  const ov = $('overlay');
  ov.classList.remove('hidden');
  ov.querySelectorAll('.panel').forEach(p => p.classList.toggle('hidden', p.id !== id));
  applyLang();
  updateTouchUI();
  const first = document.querySelector('#' + id + ' button:not([disabled]), #' + id + ' input');
  if (first && !(touchMode && first.tagName === 'INPUT')) first.focus();
}
function currentScreen() { const p = document.querySelector('#overlay .panel:not(.hidden)'); return overlayOpen() && p ? p.id : null; }
function isPauseOpen() { return currentScreen() === 'scrPause'; }
function hideOverlay() {
  $('overlay').classList.add('hidden');
  if (document.activeElement) document.activeElement.blur();
  pendingShot = false;
  updateTouchUI();
}
function menuMove(d) {
  const bs = [...document.querySelectorAll('#overlay .panel:not(.hidden) button:not([disabled]), #overlay .panel:not(.hidden) input, #overlay .panel:not(.hidden) a.btn')]
    .filter(el => el.offsetParent !== null);
  if (!bs.length) return;
  let i = bs.indexOf(document.activeElement);
  i = i < 0 ? 0 : (i + d + bs.length) % bs.length;
  bs[i].focus();
  if (d) sfx('menu');
}
function pause() {
  if (!G || G.phase === 'over') return;
  if (!G.net) G.paused = true;                 // online games keep running
  drag = null;
  showScreen('scrPause');
  $('pauseCode').textContent = t('codeLabel', { c: G.levelCode });
}
function resume() { if (!G) return; G.paused = false; hideOverlay(); }

// ---------- game over, stats, records ----------
function qualifies(score) { return score > 0 && (topList.length < 10 || score > topList[topList.length - 1].s); }
function startGameOverFlow() {
  const q = [];
  G.players.forEach((p, i) => { const mine = G.net ? i === G.net.me : !p.cpu; if (mine && qualifies(p.score)) q.push(i); });
  G.nameQueue = q;
  nextNameOrStats();
}
function nextNameOrStats() {
  if (G.nameQueue && G.nameQueue.length) showNameEntry(G.nameQueue.shift());
  else showGameOver();
}
function showGameOver() {
  const solo = G.mode === 'solo';
  $('overTitle').textContent = solo || G.winner < 0 ? t('gameOver') : t('wins', { p: G.players[G.winner].name });
  const tb = $('overStats');
  tb.innerHTML = '';
  const rows = [['', ...G.players.map(p => p.name)],
    [t('score'), ...G.players.map(p => pad6(p.score))],
    [t('stStage'), ...G.players.map(() => String(G.stage))],
    [t('stPots'), ...G.players.map(p => p.st.pots)],
    [t('stRun'), ...G.players.map(p => p.st.bestRun)],
    [t('stCombo'), ...G.players.map(p => p.st.combo > 1 ? 'x' + p.st.combo : '-')],
    [t('stScr'), ...G.players.map(p => p.st.scr)],
    [t('stShoo'), ...G.players.map(p => p.st.shoo)]];
  rows.forEach((r, ri) => {
    const tr = document.createElement('tr');
    r.forEach(c => { const td = document.createElement(ri === 0 ? 'th' : 'td'); td.textContent = c; tr.appendChild(td); });
    tb.appendChild(tr);
  });
  $('overNote').textContent = G.newHi ? t('newHi') : '';
  showScreen('scrOver');
}

const NAME_ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-';
let nameState = null;
function nameActive() { return currentScreen() === 'scrName'; }
function showNameEntry(pi) {
  const p = G.players[pi];
  nameState = { pi, pos: 0, chars: (lastName + 'AAA').slice(0, 3).split('') };
  $('nameTitle').textContent = t('newRecord', { p: p.name });
  const box = $('nameSlots');
  box.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    const up = document.createElement('button'), ch = document.createElement('span'), dn = document.createElement('button');
    up.textContent = '▲'; dn.textContent = '▼'; up.className = dn.className = 'arrow';
    up.tabIndex = dn.tabIndex = -1;
    up.addEventListener('click', () => { nameState.pos = i; nameKey('ArrowUp'); });
    dn.addEventListener('click', () => { nameState.pos = i; nameKey('ArrowDown'); });
    ch.className = 'ch';
    ch.addEventListener('click', () => { nameState.pos = i; drawName(); });
    slot.append(up, ch, dn);
    box.appendChild(slot);
  }
  showScreen('scrName');
  if (document.activeElement) document.activeElement.blur();
  drawName();
}
function drawName() {
  [...$('nameSlots').children].forEach((slot, i) => {
    slot.querySelector('.ch').textContent = nameState.chars[i];
    slot.classList.toggle('sel', i === nameState.pos);
  });
}
function nameKey(code, key) {
  const s = nameState;
  if (!s) return;
  const cyc = d => { const i = NAME_ABC.indexOf(s.chars[s.pos]); s.chars[s.pos] = NAME_ABC[(i + d + NAME_ABC.length) % NAME_ABC.length]; sfx('menu'); };
  if (code === 'ArrowUp') cyc(1);
  else if (code === 'ArrowDown') cyc(-1);
  else if (code === 'ArrowLeft' || code === 'Backspace') s.pos = Math.max(0, s.pos - 1);
  else if (code === 'ArrowRight') s.pos = Math.min(2, s.pos + 1);
  else if (code === 'PadA') { if (s.pos < 2) s.pos++; else nameConfirm(); }
  else if (code === 'Enter' || code === 'NumpadEnter') { nameConfirm(); return; }
  else if (key && key.length === 1 && NAME_ABC.includes(key.toUpperCase())) { s.chars[s.pos] = key.toUpperCase(); s.pos = Math.min(2, s.pos + 1); sfx('menu'); }
  drawName();
}
function nameConfirm() {
  const s = nameState, p = G.players[s.pi], n = s.chars.join('');
  lastName = n; save('cosmopool_name', n);
  topList.push({ n, s: p.score, st: G.stage, m: G.mode });
  topList.sort((a, b) => b.s - a.s);
  topList = topList.slice(0, 10);
  save('cosmopool_top', topList);
  G.newHi = topList[0] && topList[0].s === p.score;
  nameState = null;
  sfx('perfect');
  nextNameOrStats();
}
let topBack = 'scrMain';
function showTop(back) {
  topBack = back;
  const tb = $('topTable');
  tb.innerHTML = '';
  if (!topList.length) { tb.innerHTML = '<tr><td></td></tr>'; tb.querySelector('td').textContent = t('topEmpty'); }
  const mode = { solo: 'mSolo', cpu: 'mCpu', '2p': 'm2p', online: 'mOnline' };
  topList.forEach((e, i) => {
    const tr = document.createElement('tr');
    [String(i + 1).padStart(2, ' ') + '.', e.n, pad6(e.s), t('stageHud') + ' ' + e.st, t(mode[e.m] || 'm2p')].forEach(c => { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); });
    tb.appendChild(tr);
  });
  showScreen('scrTop');
}

// ---------- settings ----------
function bindSettings() {
  const mv = $('mvol'), sv = $('svol');
  mv.value = musicVol; sv.value = sfxVol;
  mv.addEventListener('input', () => { musicVol = +mv.value; save('cosmopool_mvol', musicVol); Music.volumeChanged(); applyLang(); });
  sv.addEventListener('input', () => { sfxVol = +sv.value; save('cosmopool_svol', sfxVol); applyLang(); });
  sv.addEventListener('change', () => sfx('pocket'));
}

// ---------- online setup ----------
let joinPrefill = null;
function onlineHost() {
  showScreen('scrHost');
  $('hostStatus').textContent = t('connecting');
  $('hostCode').textContent = '------';
  const code = Net.makeCode();
  Net.onError = type => {
    if (type === 'unavailable-id') { onlineHost(); return; }
    $('hostStatus').textContent = type === 'nolib' ? t('netNoLib') : t('netFail');
  };
  Net.onOpen = () => startOnlineAsHost();
  Net.onMsg = netOnMsg;
  Net.onClose = () => netEnd();
  Net.host(code).then(() => {
    $('hostCode').textContent = code;
    $('hostStatus').textContent = t('hostWait');
    const base = location.href.split('?')[0].split('#')[0];
    $('hostLink').textContent = base + '?join=' + code;
  });
}
function onlineJoin(code) {
  code = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (code.length !== 6) { $('joinStatus').textContent = t('codeBad'); return; }
  $('joinStatus').textContent = t('connecting');
  Net.onError = type => { $('joinStatus').textContent = type === 'nolib' ? t('netNoLib') : t('netFail'); };
  Net.onOpen = () => { $('joinStatus').textContent = t('waitHost'); };
  Net.onMsg = netOnMsg;
  Net.onClose = () => netEnd();
  Net.join(code);
}
function startOnlineAsHost() {
  const runSeed = ((Math.random() * 0x3FFFFFFF) | 0) + 1;
  newGame('online', { net: { host: true, me: 0 }, runSeed, cards: cardsOn });
  Net.send({ t: 'start', runSeed, cards: G.cards, code: G.code });
  netSendState();
}
function netEnd() {
  if (G && G.net) { G = null; Object.assign(phys, PHYS0); }
  Net.close();
  toMenuTable();
  $('msgText').textContent = t('netLost');
  showScreen('scrMsg');
  Music.setMode('menu');
}
function leaveOnline() { if (G && G.net) { Net.send({ t: 'bye' }); Net.close(); } }

// ---------- online protocol ----------
function packBall(b) { return [b.num, Math.round(b.x * 100) / 100, Math.round(b.y * 100) / 100, b.in ? 1 : 0]; }
function unpackBalls(arr) { return arr.map(([num, x, y, i]) => ({ num, x, y, vx: 0, vy: 0, in: !!i, lock: null })); }
function netSendState() {
  if (!isHost()) return;
  Net.send({
    t: 'state', phase: G.phase, timer: G.timer, cur: G.cur, stage: G.stage, seed: LV.seed, lvT: LV.t,
    players: G.players.map(p => ({ score: p.score, lives: p.lives, fx: p.fx, rack: p.rack, st: p.st })),
    balls: G.balls.map(packBall), cardFor: G.cardFor, pick: G.lastPick, winner: G.winner, miss: G.miss, visit: G.visit
  });
}
function netShotStart() {
  if (!isHost()) return;
  const c = G.balls[0], P = G.prank;
  Net.send({
    t: 'shotStart', balls: G.balls.map(packBall), lvT: LV.t,
    vx: P ? P.cv.x : c.vx, vy: P ? P.cv.y : c.vy,
    prank: P ? { num: P.b.num, from: P.from, dir: P.dir, stand: P.stand, exitX: P.exitX, gx: P.g.x, gy: P.g.y, face: P.g.face } : null
  });
}
const IDLE = { netwait: 1, aim: 1, wait: 1, cards: 1, over: 1 };
function netOnMsg(m) {
  if (!m || !m.t) return;
  switch (m.t) {
    case 'start':
      newGame('online', { net: { host: false, me: 1 }, runSeed: m.runSeed, cards: m.cards, code: m.code });
      break;
    case 'state': if (G && G.net) { G.net.pending = m; tryApplyState(); } break;
    case 'aim': if (G && G.net && !localTurn()) G.remoteAim = { a: m.a, p: m.p, d: m.d || STAR_DIST }; break;
    case 'shotReq': if (isHost() && G.phase === 'aim' && G.cur !== G.net.me) shoot(m.a, m.p, true); break;
    case 'shotStart': if (isGuest()) guestShotStart(m); break;
    case 'mash': if (isHost()) mash(1 - G.net.me, true); break;
    case 'duel': if (isGuest() && G.prank) { G.prank.cnt = m.cnt; if (G.prank.g.st === 'duel') G.prank.duelT = m.left; } break;
    case 'duelEnd': if (isGuest() && G.prank && !G.prank.res) { G.prank.cnt = m.cnt; G.prank.g.jump = 0; prankResult(m.res, m.to); } break;
    case 'cards':
      if (isGuest()) { G.cardFor = m.pi; G.cardHand = m.hand.map(id => CARD[id]); G.phase = 'cards'; showCardScreen(); }
      break;
    case 'pick': if (isHost() && G.phase === 'cards' && G.cardFor !== G.net.me) pickCard(m.i); break;
    case 'goblin': if (isGuest()) startGoblin(m.from, m.to); break;
    case 'trans':
      if (isGuest()) { if (G.phase === 'moving' || G.phase === 'prank') G.net.pendingTrans = m.next; else startGuestTrans(m.next); }
      break;
    case 'quake': if (isGuest()) { G.shake = 0.5; showMsg(t('quakeMsg'), 1.4); sfx('scratch'); vib(120); } break;
    case 'again': if (isHost() && G.phase === 'over') startOnlineAsHost(); break;
    case 'bye': netEnd(); break;
  }
}
function startGuestTrans(next) { G.trans = { t: 0, next, cardFor: -1, swapped: false }; G.phase = 'trans'; }
function guestShotStart(m) {
  G.net.pending = null;
  G.balls = unpackBalls(m.balls);
  LV.t = m.lvT; syncBumpers();
  const c = G.balls[0];
  c.vx = m.vx; c.vy = m.vy;
  G.shot = { potted: [], scratch: false };
  G.moveT = 0; G.remoteAim = null;
  hideOverlayIfCards();
  sfx('shoot', 0.6); vib(15);
  if (m.prank) {
    const b = G.balls.find(x => x.num === m.prank.num);
    G.prank = {
      b, cv: { x: m.vx, y: m.vy }, from: m.prank.from, to: m.prank.from, dir: m.prank.dir, stand: m.prank.stand, exitX: m.prank.exitX,
      cnt: [0, 0], duelT: DUEL_TIME, res: null, syncT: 0, cpuT: 0,
      g: { st: 'in', t: 0, x: m.prank.gx, y: m.prank.gy, face: m.prank.face, wink: false }
    };
    c.vx = 0; c.vy = 0;
    G.phase = 'prank';
    showMsg(t('prankMsg'), 99); sfx('scratch');
  } else G.phase = 'moving';
}
function hideOverlayIfCards() { if (currentScreen() === 'scrCards') hideOverlay(); }
function tryApplyState() {
  const s = G.net.pending;
  if (!s || !IDLE[G.phase]) return;
  G.net.pending = null;
  if (s.seed !== LV.seed || s.stage !== G.stage) {
    const newStage = s.stage !== G.stage;
    G.stage = s.stage;
    LV = prepLevel(buildLevel(s.seed, s.stage));
    tableImg = buildTableImg(LV);
    G.levelCode = seedToCode(LV.seed, s.stage);
    if (newStage) showMsg(t('stage', { n: s.stage }), 1.6);
  }
  s.players.forEach((ps, i) => Object.assign(G.players[i], { score: ps.score, lives: ps.lives, fx: ps.fx, rack: ps.rack, st: ps.st }));
  G.balls = unpackBalls(s.balls);
  LV.t = s.lvT; syncBumpers();
  if (G.cur !== s.cur) G.remoteAim = null;
  G.cur = s.cur; G.miss = s.miss; G.visit = s.visit; G.cardFor = s.cardFor;
  if (s.pick && (!G.lastPick || s.pick.k !== G.lastPick.k)) {
    G.lastPick = s.pick;
    showMsg(t('picked', { p: G.players[s.pick.pi].name, c: cardText(CARD[s.pick.id])[0] }), 2.2);
  }
  switch (s.phase) {
    case 'over':
      if (G.phase !== 'over') { G.winner = s.winner; G.phase = 'over'; G.timer = 1.2; sfx('over'); }
      break;
    case 'cards': if (G.phase !== 'cards') G.phase = s.cardFor === G.net.me ? 'netwait' : 'cards'; break;
    case 'wait': G.phase = 'wait'; G.timer = s.timer; break;
    case 'aim': if (G.phase !== 'aim') { G.phase = 'aim'; G.power = POWER_MIN; G.chDir = 1; pendingShot = false; } break;
    default: break;
  }
}

// ---------- level code screen ----------
function codeUse() {
  const lvl = codeToLevel($('codeInput').value);
  if (!lvl) { $('codeMsg').textContent = t('codeBad'); sfx('scratch'); return; }
  pendingCode = lvl;
  $('codeMsg').textContent = t('codeSet', { c: seedToCode(lvl.seed, lvl.stage) });
  sfx('perfect');
  applyLang();
}

// ---------- menu actions ----------
function toMenuTable() { LV = prepLevel(buildLevel(0, 1)); tableImg = buildTableImg(LV); demoBalls = levelBalls(LV); }
function onAction(act) {
  audioInit();
  sfx('menu');
  if (!G || act === 'menu') Music.setMode('menu');
  switch (act) {
    case 'lang-en': case 'lang-hu':
      lang = act.slice(5); save('cosmopool_lang', lang);
      if (joinPrefill) { showScreen('scrJoin'); $('joinInput').value = joinPrefill; onlineJoin(joinPrefill); joinPrefill = null; }
      else showScreen('scrMain');
      break;
    case 'lang': showScreen('scrLang'); break;
    case 'settings': showScreen('scrSettings'); break;
    case 'fullscreen': if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} } else goFullscreen(); break;
    case 'cards': cardsOn = !cardsOn; save('cosmopool_cards', cardsOn); applyLang(); break;
    case 'help': helpLine = !helpLine; save('cosmopool_help', helpLine); applyLang(); break;
    case 'vs-cpu': showScreen('scrDiff'); break;
    case 'd-easy': newGame('cpu', { diff: 'easy' }); break;
    case 'd-medium': newGame('cpu', { diff: 'medium' }); break;
    case 'd-hard': newGame('cpu', { diff: 'hard' }); break;
    case 'two-p': startJoin2p(); break;
    case 'join2p-go': if (join2p && join2p.dev[0] && join2p.dev[1]) newGame('2p', { dev: join2p.dev.slice() }); break;
    case 'join2p-reset': startJoin2p(); break;
    case 'solo': newGame('solo'); break;
    case 'online': showScreen('scrOnline'); break;
    case 'host': onlineHost(); break;
    case 'join': showScreen('scrJoin'); $('joinStatus').textContent = ''; break;
    case 'join-go': onlineJoin($('joinInput').value); break;
    case 'copy-link': {
      const link = $('hostLink').textContent;
      const done = () => { $('hostStatus').textContent = t('copied'); };
      try { navigator.clipboard.writeText(link).then(done, () => {}); } catch (e) {}
      break;
    }
    case 'net-cancel': Net.close(); showScreen('scrOnline'); break;
    case 'top': showTop(G ? 'scrOver' : 'scrMain'); break;
    case 'top-back': showScreen(topBack); break;
    case 'code': showScreen('scrCode'); $('codeMsg').textContent = ''; $('codeInput').value = G && G.levelCode ? G.levelCode : ''; break;
    case 'code-ok': codeUse(); break;
    case 'code-clear': pendingCode = null; $('codeInput').value = ''; $('codeMsg').textContent = ''; applyLang(); break;
    case 'back': showScreen('scrMain'); break;
    case 'resume': resume(); break;
    case 'again':
      if (G && G.net) { if (isHost()) startOnlineAsHost(); else { Net.send({ t: 'again' }); $('overNote').textContent = t('waitHost'); } }
      else newGame(G.mode, { diff: G.diff, dev: G.dev });
      break;
    case 'name-ok': nameConfirm(); break;
    case 'menu':
      leaveOnline();
      Object.assign(phys, PHYS0); G = null; toMenuTable(); showScreen('scrMain'); updateHudVisibility();
      break;
  }
}

function updateTouchUI() {
  $('touch').classList.toggle('hidden', !(touchMode && G && !overlayOpen() && !Splash.on));
  if ($('hudL')) updateHudVisibility();
}
function setTouchMode() { if (!touchMode) { touchMode = true; document.body.classList.add('touch'); updateTouchUI(); resize(); goFullscreen(); } }

function resize() {
  const iw = innerWidth, ih = innerHeight;
  VIEW.wide = touchMode && iw / ih > 1.45;
  if (VIEW.wide) {
    // the table area (world y 43..219) fills the height; side panels need at least 110px each
    const scale = Math.min(ih / 176, (iw - 220) / 256);
    const panel = Math.max(110, (iw - 256 * scale) / 2);
    VIEW.w = Math.round(iw / scale); VIEW.h = Math.round(ih / scale);
    VIEW.ox = Math.round(VIEW.w / 2 - 128); VIEW.oy = Math.round(VIEW.h / 2 - 131);
    cv.width = VIEW.w; cv.height = VIEW.h;
    cv.style.width = iw + 'px'; cv.style.height = ih + 'px';
    document.documentElement.style.setProperty('--panel', Math.floor(panel) + 'px');
  } else {
    VIEW.w = W; VIEW.h = H; VIEW.ox = 0; VIEW.oy = 0;
    cv.width = W; cv.height = H;
    const s = Math.min(iw / W, ih / H);
    const sc = s >= 2 ? Math.floor(s) : s;
    cv.style.width = Math.floor(W * sc) + 'px';
    cv.style.height = Math.floor(H * sc) + 'px';
  }
  document.body.classList.toggle('wide', VIEW.wide);
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = 'top';
  ctx.font = FONT8;
  updateHudVisibility();
}

// real fullscreen on phones (Android). iPhone: "Add to Home Screen" opens it full screen.
function goFullscreen() {
  const d = document.documentElement;
  if (document.fullscreenElement || !d.requestFullscreen) return;
  try {
    d.requestFullscreen({ navigationUI: 'hide' }).then(() => {
      try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
    }).catch(() => {});
  } catch (e) {}
}

function afterSplash() {
  showScreen('scrLang');
  const pref = document.querySelector('[data-act="lang-' + lang + '"]');
  if (pref) pref.focus();
}

// =====================================================================
//  MAIN LOOP
// =====================================================================
let last = 0, acc = 0;
const events = [];

function update(dt, pad) {
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.combo) { G.combo.t -= dt; if (G.combo.t <= 0) G.combo = null; }
  for (const m of LV.bumpers) if (m.flash > 0) m.flash -= dt;
  updateParts(dt);
  G.starSpin += dt * 3.2;
  if (G.phase !== 'moving') G.mods = computeMods(G.cur);
  G.aimOff = G.mods.drunk ? Math.sin(G.starSpin * 0.6) * 0.08 + Math.sin(G.starSpin * 1.7) * 0.03 : 0;
  if (G.net && G.net.pending) tryApplyState();
  if (G.phase === 'aim' && G.turnStart && !isGuest()) {
    G.turnStart = false;
    const q = cur().fx.find(f => f.id === 'quake');
    if (q) { quakeTable(); q.left--; cur().fx = cur().fx.filter(f => f.left > 0); }
  }
  switch (G.phase) {
    case 'aim':
      if (cur().cpu) aiUpdate(dt);
      else if (localTurn()) humanUpdate(dt, pad);
      else if (G.remoteAim) { G.angle = G.remoteAim.a; G.power = G.remoteAim.p; G.starD = G.remoteAim.d; G.aimOff = 0; }
      break;
    case 'moving': {
      acc = Math.min(acc + dt, 0.1);
      while (acc >= DT) {
        step(G.balls, DT, events);
        acc -= DT;
      }
      for (const e of events) {
        if (e.t === 'pocket') {
          if (e.num === 0) G.shot.scratch = true; else G.shot.potted.push(e.num);
          sfx(e.num === GOLD ? 'gold' : 'pocket'); vib(30);
          sparks(e.x, e.y, e.num === GOLD ? 26 : 12, e.num === GOLD ? ['#ffd84a', '#fff6a0', '#ffffff'] : ['#ffffff', '#ffd84a', '#8af4ff', '#ff7ae8']);
        } else if (e.t === 'bump') { sfx('bump'); sparks(e.x, e.y, 4, ['#ff6ac0', '#ffffff']); }
        else if (e.t === 'warp') { sfx('warp'); sparks(e.x, e.y, 8, ['#3ae0ff', '#ff5ae0', '#ffffff']); }
        else sfx(e.t, e.v);
      }
      events.length = 0;
      G.moveT += dt;
      if (G.moveT > 25) for (const b of G.balls) { b.vx = 0; b.vy = 0; }
      if (!anyMoving(G.balls)) {
        acc = 0;
        if (isGuest()) {
          const n = G.shot.potted.length;
          if (n >= 2) { G.combo = { s: comboText(n), t: 1.6 }; sfx('combo'); }
          if (G.shot.scratch) { showMsg(t('scratch'), 1.8); sfx('scratch'); }
          G.phase = 'netwait';
          tryApplyState();
        } else endShot();
        if (isGuest() && G.net.pendingTrans) { startGuestTrans(G.net.pendingTrans); G.net.pendingTrans = null; }
      }
      break;
    }
    case 'prank':
      prankUpdate(dt);
      break;
    case 'goblin':
      goblinUpdate(dt);
      break;
    case 'trans':
      transUpdate(dt);
      break;
    case 'cpucards':
      cpuCardsUpdate(dt);
      break;
    case 'wait':
      G.timer -= dt;
      if (G.timer <= 0) { G.phase = 'aim'; netSendState(); }
      break;
    case 'over':
      G.timer -= dt;
      if (G.timer <= 0 && !G.overShown) { G.overShown = true; startGameOverFlow(); }
      break;
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  const pad = pollPad();
  Music.update(dt);
  Splash.update(dt);
  handlePadMenus(pad);
  if (G && !G.paused) update(dt, pad);
  render();
  padPrev = pad;
  requestAnimationFrame(frame);
}

function boot() {
  cv = $('screen');
  ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = 'top';
  ctx.font = FONT8;
  buildSpace();
  for (let i = 0; i <= GOLD; i++) ballImg[i] = buildBallSprite(i);
  toMenuTable();
  if (document.fonts && document.fonts.load) document.fonts.load(FONT8).then(() => { ctx.font = FONT8; }).catch(() => {});

  lang = load('cosmopool_lang', 'en');
  const jp = new URLSearchParams(location.search).get('join');
  if (jp) joinPrefill = jp.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6);
  resize();
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 200));
  for (let k = 0; k < 12; k++) $('powCol').appendChild(document.createElement('i'));
  bindSettings();
  $('moreGames').href = MORE_GAMES_URL;

  // menu buttons
  document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => onAction(b.dataset.act)));

  // keyboard
  const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
  addEventListener('keydown', e => {
    audioInit();
    if (Splash.on) { Splash.skip(); e.preventDefault(); return; }
    if (overlayOpen()) {
      if (nameActive()) { nameKey(e.code, e.key); e.preventDefault(); return; }
      if (join2pActive()) {
        if (e.code === 'Escape') showScreen('scrMain');
        else if ((e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat) {
          if (join2p.dev[0] && join2p.dev[1] && document.activeElement && document.activeElement.id === 'join2pGo' && e.code !== 'Space') onAction('join2p-go');
          else join2pPress('kb');
        }
        e.preventDefault(); return;
      }
      const el = document.activeElement, tag = el && el.tagName, range = el && el.type === 'range';
      if (tag === 'INPUT' && !range) {
        if (e.code === 'Enter' || e.code === 'NumpadEnter') { onAction(currentScreen() === 'scrJoin' ? 'join-go' : 'code-ok'); e.preventDefault(); }
        else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { menuMove(e.code === 'ArrowUp' ? -1 : 1); e.preventDefault(); }
        return;
      }
      if (e.code === 'ArrowUp') { menuMove(-1); e.preventDefault(); }
      else if (e.code === 'ArrowDown') { menuMove(1); e.preventDefault(); }
      else if (!range && e.code === 'ArrowLeft') { menuMove(-1); e.preventDefault(); }
      else if (!range && e.code === 'ArrowRight') { menuMove(1); e.preventDefault(); }
      else if (e.code === 'Escape' && G && (G.paused || isPauseOpen())) resume();
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') { pause(); return; }
    keys[e.code] = true;
    if (!e.repeat && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter')) { if (G && G.phase === 'prank' && !G.paused) mashKey(e.code); else requestShot(null, 'kb'); }
    if (gameKeys.includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // pointer: mouse hovers to aim + click shoots; touch taps / drags to aim (SHOT button shoots)
  const aimAt = e => { const p = toLocal(e), c = G.balls[0], dd = Math.hypot(p.x - c.x, p.y - c.y); if (!c.in && dd > 3) { G.angle = Math.atan2(p.y - c.y, p.x - c.x); G.starD = Math.max(STAR_MIN, Math.min(STAR_MAX, dd)); } };
  cv.addEventListener('pointerdown', e => {
    audioInit();
    if (e.pointerType === 'touch') setTouchMode();
    if (Splash.on) { Splash.skip(); return; }
    if (G && G.phase === 'prank' && !G.paused) { mashPointer(e.clientX, e.pointerType === 'touch' ? 'touch' : 'mouse'); return; }
    if (!humanAim()) return;
    if (!devAllows(G.cur, e.pointerType === 'touch' ? 'touch' : 'mouse')) return;
    if (e.pointerType === 'mouse') { if (e.button === 0) { aimAt(e); requestShot(null, 'mouse'); } return; }
    // touch: the star moves with the finger but slower, from wherever it is
    const p = toLocal(e), c = G.balls[0];
    drag = { id: e.pointerId, sx: p.x, sy: p.y, stx: c.x + Math.cos(G.angle) * G.starD, sty: c.y + Math.sin(G.angle) * G.starD };
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  });
  cv.addEventListener('pointermove', e => {
    if (!humanAim()) return;
    if (!devAllows(G.cur, e.pointerType === 'touch' ? 'touch' : 'mouse')) return;
    if (e.pointerType === 'mouse') { aimAt(e); return; }
    if (drag && e.pointerId === drag.id) {
      const p = toLocal(e), c = G.balls[0], gain = 0.6;
      let tx = drag.stx + (p.x - drag.sx) * gain, ty = drag.sty + (p.y - drag.sy) * gain;
      const dx = tx - c.x, dy = ty - c.y, dd = Math.hypot(dx, dy);
      if (dd > 2) {
        G.angle = Math.atan2(dy, dx);
        G.starD = Math.max(STAR_MIN, Math.min(STAR_MAX, dd));
        if (dd > STAR_MAX || dd < STAR_MIN) {             // keep the anchor in range so dragging back feels right
          drag.stx = c.x + Math.cos(G.angle) * G.starD; drag.sty = c.y + Math.sin(G.angle) * G.starD; drag.sx = p.x; drag.sy = p.y;
        }
      }
    }
  });
  const endDrag = e => { if (drag && e.pointerId === drag.id) drag = null; };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('contextmenu', e => e.preventDefault());

  // on-screen touch buttons
  $('tShot').addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); requestShot(e.clientX, 'touch'); });
  $('tPause').addEventListener('click', pause);
  $('join2pArea').addEventListener('pointerdown', e => { audioInit(); join2pPress(e.pointerType === 'touch' ? 'touch' : 'kb'); });
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') setTouchMode(); if (Splash.on) Splash.skip(); }, true);

  $('overlay').classList.add('hidden');
  Splash.start();
  requestAnimationFrame(t0 => { last = t0; requestAnimationFrame(frame); });
}

if (typeof document !== 'undefined') boot();
