/* ===== vfx.js: 폭발 / 반짝이 이펙트 (canvas로 선을 직접 그림) =====
   playCanvasVfx('burst', 색, 반짝이 개수, 시간ms)  → 파시아·레이시 폭발
   playCanvasVfx('diamonds', 색, 0, 시간ms)         → 파시아 동료 호출
   모양은 실행할 때마다 조금씩 달라져요. 좌표는 900x1600 기준(화면에 맞춰 자동 확대/축소). */
const VW = 900, VH = 1600, VCX = 450, VCY = 800, TAU = Math.PI * 2;
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOut = x => 1 - Math.pow(1 - x, 3), easeIn = x => x * x;
const smoothStep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ----- 선 경로 도우미 ----- */
function edgeDist(th) { // 중앙에서 th 방향으로 화면 끝까지의 거리
  const dx = Math.cos(th), dy = Math.sin(th), ts = [];
  if (dx > 1e-6) ts.push((VW - VCX) / dx); if (dx < -1e-6) ts.push(-VCX / dx);
  if (dy > 1e-6) ts.push((VH - VCY) / dy); if (dy < -1e-6) ts.push(-VCY / dy);
  return Math.min(...ts);
}
function chaikin(p, r) { // 모서리를 살짝만 깎는 스무딩 (r이 작을수록 각짐)
  const q = [p[0]];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1];
    q.push([(1 - r) * a[0] + r * b[0], (1 - r) * a[1] + r * b[1]], [r * a[0] + (1 - r) * b[0], r * a[1] + (1 - r) * b[1]]);
  }
  q.push(p[p.length - 1]); return q;
}
function resample(p, n) { // 같은 간격의 n개 점으로 다시 나눔
  const seg = [0];
  for (let i = 1; i < p.length; i++) seg.push(seg[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const tot = seg[seg.length - 1], out = []; let j = 0;
  for (let k = 0; k < n; k++) {
    const s = tot * k / (n - 1);
    while (j < p.length - 2 && seg[j + 1] < s) j++;
    const u = (s - seg[j]) / ((seg[j + 1] - seg[j]) || 1);
    out.push([p[j][0] + (p[j + 1][0] - p[j][0]) * u, p[j][1] + (p[j + 1][1] - p[j][1]) * u]);
  }
  return out;
}
/* 하나의 선: pts(경로), w(굵기), h0/hd=그려지는(머리) 시작/시간, t0/td=지워지는(꼬리) 시작/시간 (0~1 정규화 시간) */
function mkEl(pts, wf, h0, hd, t0, td, jit, seed, o) {
  const seg = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = seg[seg.length - 1] || 1, s = seg.map(v => v / tot);
  return Object.assign({ pts, s, w: s.map(wf), h0, hd, t0, td, jit, seed, taper: true, tangle: false, step: -1, nx: [], ny: [] }, o || {});
}

/* ----- 폭발 장면 구성 ----- */
function buildBurst(R, color, sparkleCount) {
  const ru = (a, b) => a + (b - a) * R(), els = [];
  const bolt = (o, th, L, s0, s1, n) => { // 각지게 꺾이는 번개 선
    const pts = [o]; let dev = 0, d = 0;
    while (d < L) {
      const st = ru(s0, s1); d += st;
      dev = Math.max(-1.5, Math.min(1.5, dev * .3 + ru(-1, 1) * (R() < .35 ? 2.3 : 1.1)));
      const a = th + dev * .62, l = pts[pts.length - 1];
      pts.push([l[0] + st * Math.cos(a), l[1] + st * Math.sin(a)]);
    }
    return resample(chaikin(pts, .12), n);
  };
  const tangle = (rr, n) => { // 중앙에서 엉켜 겹치는 스크리블 원
    let p = [0, 0], ang = ru(0, 6.28); const out = [[0, 0]];
    for (let i = 0; i < n; i++) {
      ang += ru(-2.2, 2.2); const st = ru(10, 26);
      let q = [p[0] + st * Math.cos(ang), p[1] + st * Math.sin(ang)];
      if (Math.hypot(q[0], q[1]) > rr) { ang = Math.atan2(-p[1], -p[0]) + ru(-.8, .8); q = [p[0] + st * Math.cos(ang), p[1] + st * Math.sin(ang)]; }
      p = q; out.push(p);
    }
    return out.map(v => [v[0] + VCX, v[1] + VCY]);
  };
  // 1) 불씨: 중앙에서 타닥타닥 튀는 굵은 스포크 (규모 키움)
  let bs = [], acc = 0;
  for (let i = 0; i < 22; i++) { acc += ru(.008, .045); bs.push(acc); }
  bs = bs.map(v => v / acc * .40);
  const base = ru(0, 6.28);
  bs.forEach((b, i) => {
    const th = base + i * 2.399 + ru(-.25, .25), L = b < .2 ? ru(120, 300) : ru(200, 470), wm = ru(8, 14), bulb = R() < .35, hd = ru(.07, .12);
    const o = [VCX + ru(-10, 10), VCY + ru(-10, 10)], d = [Math.cos(th), Math.sin(th)], nr = [-d[1], d[0]], q = ru(-.28, .28) * L;
    const p2 = [o[0] + d[0] * L, o[1] + d[1] * L], p1 = [(o[0] + p2[0]) / 2 + nr[0] * q, (o[1] + p2[1]) / 2 + nr[1] * q], pts = [];
    for (let k = 0; k < 28; k++) { const t = k / 27, a = (1 - t) * (1 - t), b2 = 2 * (1 - t) * t, c = t * t; pts.push([a * o[0] + b2 * p1[0] + c * p2[0], a * o[1] + b2 * p1[1] + c * p2[1]]); }
    els.push(mkEl(pts, s => wm * Math.pow(1 - Math.pow(s, 1.15), .8) + 1 + (bulb ? wm * .9 * Math.exp(-Math.pow((s - .84) / .06, 2)) : 0), b, hd, b + hd + ru(.03, .08), ru(.10, .15), 2.6, i));
  });
  // 2) 중앙의 겹친 원 (크기 그대로)
  els.push(mkEl(tangle(46, 80), s => 3.6 + 2.2 * Math.sin(s * 40), 0, .30, .64, .24, 3, 99, { taper: false, tangle: true }));
  els.push(mkEl(tangle(38, 80), s => 4.2 + 1.8 * Math.sin(s * 31), .06, .30, .66, .24, 3, 98, { taper: false, tangle: true }));
  // 3) 화면 끝까지 뻗는 긴 번개
  for (let k = 0; k < 11; k++) {
    const th = TAU * k / 11 + ru(-.22, .22), L = edgeDist(th) * ru(1.05, 1.2) + 40, wm = ru(7, 13);
    const b = .27 + k * .011 + ru(0, .05), hd = ru(.19, .25), ts = b + hd + ru(0, .05), td = Math.min(ru(.24, .30), .985 - ts);
    els.push(mkEl(bolt([VCX + ru(-8, 8), VCY + ru(-8, 8)], th, L, 55, 150, 170), s => wm * Math.pow(1 - s, .5) + 2.2, b, hd, ts, td, 1.6, 200 + k));
  }
  // 4) 얇은 타원 고리 (11개, 규모 키움)
  for (let k = 0; k < 11; k++) {
    const phi = ru(0, 6.28), Lp = ru(300, 720), wp = ru(70, 220), ph = ru(0, 6.28), c = Math.cos(phi), s = Math.sin(phi), pts = [];
    for (let i = 0; i < 100; i++) {
      const t = TAU * i / 99, kk = 1 + .05 * Math.sin(3 * t + ph), x = Lp * (1 - Math.cos(t)) / 2 * kk, y = wp / 2 * Math.sin(t) * kk;
      pts.push([VCX + x * c - y * s, VCY + x * s + y * c]);
    }
    const b = .2 + ru(0, .22), hd = ru(.2, .28), ts = b + hd + ru(.02, .1), td = Math.min(ru(.22, .3), .985 - ts), wmx = ru(1.8, 3.4);
    els.push(mkEl(pts, () => wmx, b, hd, ts, td, 1.6, 300 + k));
  }
  // 5) 고리 범위 안에서 타닥타닥 튀는 짧은 번개 (불규칙한 리듬으로 번쩍)
  let cs = [], ac2 = 0;
  for (let i = 0; i < 28; i++) { ac2 += ru(.005, .05); cs.push(ac2); }
  cs.forEach((v, k) => {
    const b = .08 + v / ac2 * .72, a0 = ru(0, TAU), r0 = ru(10, 210), th = a0 + ru(-.7, .7), L = ru(110, 330), wm = ru(4.5, 8.5);
    const hd = ru(.05, .09), ts = b + hd + ru(0, .03), td = Math.min(ru(.07, .12), .985 - ts);
    els.push(mkEl(bolt([VCX + r0 * Math.cos(a0), VCY + r0 * Math.sin(a0)], th, L, 30, 75, 60), s => wm * Math.pow(1 - s, .7) + 1.6, b, hd, ts, td, 2, 500 + k));
  });
  return { els, color, sparks: mkSparks(R, sparkleCount, .15, .65) };
}

/* ----- 반짝이(곡선 면의 4각 별) ----- */
function mkSparks(R, n, d0, d1) {
  const a = [], ru = (x, y) => x + (y - x) * R();
  for (let i = 0; i < n; i++) a.push({ x: ru(3, 97) / 100 * VW, y: ru(3, 97) / 100 * VH, s: ru(2, 30), d: ru(d0, d1) });
  return a;
}
function sparklePath(ctx, r) { // 안 7: 두 제어점을 꼭짓점 축 위(중심 쪽)에 얹어 몸통을 조인 4각 별
  const T = [0, -.89], R = [.75, .02], B = [0, 1.11], L = [-.76, .02], P = [T, R, B, L, T];
  ctx.beginPath(); ctx.moveTo(T[0] * r, T[1] * r);
  for (let i = 0; i < 4; i++) {
    const A = P[i], Z = P[i + 1];
    ctx.bezierCurveTo(A[0] * .2 * r, A[1] * .2 * r, Z[0] * .22 * r, Z[1] * .22 * r, Z[0] * r, Z[1] * r);
  }
  ctx.closePath();
}
function drawSparkle(ctx, it, t) {
  const u = (t - it.d) / .42; if (u <= 0 || u >= 1) return;
  const k = u < .35 ? easeOut(u / .35) : 1 - easeOut((u - .35) / .65);
  const sc = u < .35 ? k : .1 + .9 * k;
  ctx.save(); ctx.globalAlpha = k; ctx.translate(it.x, it.y); ctx.scale(sc, sc);
  sparklePath(ctx, it.s * 9 * .75); ctx.fill(); ctx.restore();
}

/* ----- 프레임 그리기 ----- */
function smooth3(a) { const n = a.length; return a.map((v, i) => .25 * a[Math.max(0, i - 1)] + .5 * v + .25 * a[Math.min(n - 1, i + 1)]); }
function drawEl(e, t, grow, pq, pc) {
  const h = easeOut(clamp01((t - e.h0) / e.hd)), tl = easeIn(clamp01((t - e.t0) / e.td));
  if (h <= tl + 1e-3 || h <= 0) return;
  const step = Math.floor(t * 20); // 20Hz로 선이 미세하게 떨리는 손그림 느낌
  if (e.step !== step) {
    e.step = step; const r = mulberry(e.seed * 7919 + step), n = e.pts.length; let nx = [], ny = [];
    for (let i = 0; i < n; i++) { nx.push(r() * 2 - 1); ny.push(r() * 2 - 1); }
    for (let k = 0; k < 2; k++) { nx = smooth3(nx); ny = smooth3(ny); }
    e.nx = nx; e.ny = ny;
  }
  const amp = e.jit * 2.8, S = e.s, N = S.length;
  const P = i => {
    let x = e.pts[i][0], y = e.pts[i][1];
    if (e.tangle) { x = (x - VCX) * grow + VCX; y = (y - VCY) * grow + VCY; }
    return [x + e.nx[i] * amp, y + e.ny[i] * amp];
  };
  const vs = [tl]; for (let i = 0; i < N; i++) if (S[i] > tl && S[i] < h) vs.push(S[i]); vs.push(h);
  const X = [], Y = [], Wd = []; let j = 0;
  for (const v of vs) {
    while (j < N - 2 && S[j + 1] < v) j++;
    const u = (v - S[j]) / ((S[j + 1] - S[j]) || 1), a = P(j), b = P(j + 1);
    X.push(a[0] + (b[0] - a[0]) * u); Y.push(a[1] + (b[1] - a[1]) * u);
    let w = e.w[j] + (e.w[j + 1] - e.w[j]) * u;
    if (e.taper) w *= .12 + .88 * Math.pow(clamp01(Math.min((v - tl) / .06, (h - v) / .06)), .7);
    else if (e.tangle) w *= .8 + .3 * grow;
    Wd.push(Math.max(w, 1));
  }
  const m = X.length; if (m < 2) return;
  const A = [], B = [];
  for (let i = 0; i < m; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(m - 1, i + 1);
    const tx = X[i1] - X[i0], ty = Y[i1] - Y[i0], ln = Math.hypot(tx, ty) + 1e-6, nx = -ty / ln, ny = tx / ln, hw = Wd[i] / 2;
    A.push([X[i] + nx * hw, Y[i] + ny * hw]); B.push([X[i] - nx * hw, Y[i] - ny * hw]);
  }
  for (let i = 0; i < m - 1; i++) { // 모든 조각이 같은 방향(시계)이라 겹쳐도 합집합으로 채워짐
    pq.moveTo(A[i][0], A[i][1]); pq.lineTo(A[i + 1][0], A[i + 1][1]); pq.lineTo(B[i + 1][0], B[i + 1][1]); pq.lineTo(B[i][0], B[i][1]); pq.closePath();
  }
  for (let i = 0; i < m; i++) if (Wd[i] > 2.4) { const r = Wd[i] / 2; pc.moveTo(X[i] + r, Y[i]); pc.arc(X[i], Y[i], r, 0, TAU); }
}
function drawScene(sc, ctx, t) {
  ctx.clearRect(0, 0, VW, VH);
  const grow = 1 + .9 * smoothStep(.25, .5, t), pq = new Path2D(), pc = new Path2D();
  sc.els.forEach(e => drawEl(e, t, grow, pq, pc));
  ctx.fillStyle = sc.color; ctx.fill(pq); ctx.fill(pc);
  sc.sparks.forEach(it => drawSparkle(ctx, it, t));
}
function playCanvasVfx(host, kind, color, sparkleCount, ms) {
  const R = mulberry((Math.random() * 4294967296) >>> 0);
  const sc = kind === 'burst' ? buildBurst(R, color, sparkleCount || 0) : { els: [], color, sparks: mkSparks(R, 28, 0, .56) };
  const cv = document.createElement('canvas'); cv.width = VW; cv.height = VH; host.appendChild(cv);
  const ctx = cv.getContext('2d'); let t0 = null;
  const loop = now => {
    if (t0 === null) t0 = now;
    const t = (now - t0) / ms;
    if (t >= 1) { cv.remove(); return; }
    drawScene(sc, ctx, t); requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
