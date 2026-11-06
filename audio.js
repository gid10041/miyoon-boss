/* ===== 5단계: 오디오 =====
   BGM(곡 전환·페이드·루프) / 효과음(파일이 없으면 조용히 건너뜀) / ⚙ 볼륨·음소거 /
   모바일 자동재생 해제(첫 터치 이후 재생) / 2페이즈 쿵쿵 박자를 오디오 시간에 맞춤
   설정값은 data.js의 AUDIO. 바깥에서는 window.Snd 와 window.playSfx / window.setBgmDuck 만 써요. */
(function () {
  'use strict';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  /* ----- 사용자 설정(⚙) ----- */
  const KEY = 'miyun_audio';
  const S = Object.assign({ bgm: AUDIO.defaults.bgm, sfx: AUDIO.defaults.sfx, mute: false }, (() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  /* ----- 볼륨 적용: iPhone/iPad 는 audio.volume 이 안 먹어서 WebAudio 게인으로 조절 ----- */
  let ctx = null;
  function setVol(o, v) { v = clamp(v); if (o.node) o.node.gain.value = v; else o.el.volume = v; }
  function hook(o) {
    if (!ctx || o.hooked) return;
    o.hooked = true;
    try {
      const src = ctx.createMediaElementSource(o.el);
      o.node = ctx.createGain(); src.connect(o.node); o.node.connect(ctx.destination);
    } catch (e) { o.node = null; }
    o.apply && o.apply();
  }
  function ensureCtx() {
    if (!IOS || ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    Object.values(T).forEach(hook);
  }

  /* ----- BGM ----- */
  const T = {};                 // 곡 이름 → 트랙
  let want = null;              // 지금 틀고 싶은 곡(자동재생이 막혔다가 풀리면 이걸 틀어요)
  let duckMul = 1, D = null, tk = 0;

  function track(n) {
    if (T[n]) return T[n];
    const url = AUDIO.bgm[n]; if (!url) return null;
    const el = new Audio(); el.loop = true; el.preload = 'auto'; el.src = url;
    const t = T[n] = { n, el, fade: 0, fd: null, node: null, playing: false, stopping: false, hooked: false };
    t.apply = () => setVol(t, S.mute ? 0 : S.bgm * ((AUDIO.bgmVol && AUDIO.bgmVol[n]) ?? 1) * t.fade * duckMul);
    t.apply();
    if (ctx) hook(t);
    return t;
  }
  function kick() { if (!tk) tk = setInterval(tick, 30); }
  function tick() {
    const now = performance.now(); let busy = false;
    for (const t of Object.values(T)) {
      const f = t.fd; if (!f) continue;
      busy = true;
      const k = f.ms <= 0 ? 1 : clamp((now - f.t0) / f.ms);
      t.fade = f.from + (f.to - f.from) * k; t.apply();
      if (k >= 1) { t.fd = null; f.done && f.done(); }
    }
    if (D) {
      busy = true;
      const k = D.ms <= 0 ? 1 : clamp((now - D.t0) / D.ms);
      duckMul = D.from + (D.to - D.from) * k;
      if (k >= 1) D = null;
      Object.values(T).forEach(t => t.apply());
    }
    if (!busy) { clearInterval(tk); tk = 0; }
  }
  function fadeTo(t, to, ms, done) { t.fd = { from: t.fade, to, t0: performance.now(), ms, done }; kick(); }

  function stopTrack(t, ms) {
    t.stopping = true;
    if (t.n === 'p2') beat(false);
    const fin = () => { if (t.stopping) { try { t.el.pause(); } catch (e) {} t.playing = false; } };
    if (ms <= 0) { t.fd = null; t.fade = 0; t.apply(); fin(); }
    else fadeTo(t, 0, ms, fin);
  }
  function playBgm(n, o) {
    o = o || {};
    const fade = o.fade != null ? o.fade : (AUDIO.fadeIn != null ? AUDIO.fadeIn : 800);
    want = { n, o };
    const t = track(n);
    Object.values(T).forEach(x => { if (x !== t && !x.stopping && (x.playing || x.fd)) stopTrack(x, o.out != null ? o.out : Math.min(fade, 1200)); });
    if (!t) return;
    if (t.playing && !t.stopping && !o.restart) return;
    t.stopping = false;
    try { t.el.currentTime = 0; } catch (e) {}
    t.fd = null; t.fade = fade <= 0 ? 1 : 0; t.apply();
    t.playing = true;
    const p = t.el.play();
    if (p && p.catch) p.catch(() => { t.playing = false; });   // 자동재생 차단: 첫 터치 때 unlock()이 다시 틀어요
    if (fade > 0) fadeTo(t, 1, fade);
    beat(n === 'p2');
  }
  function stopBgm(ms) {
    want = null;
    Object.values(T).forEach(t => { if (t.playing || t.fd) stopTrack(t, ms == null ? 800 : ms); });
  }
  /* 미리 내려받아 두기(곡 시작이 늦지 않게). 파일이 없으면 조용히 무시 */
  function warm(names) { (names || []).forEach(n => { const t = track(n); if (t) { t.el.preload = 'auto'; try { t.el.load(); } catch (e) {} } }); }
  function duck(on) {
    D = { from: duckMul, to: on ? AUDIO.duck : 1, t0: performance.now(), ms: AUDIO.duckMs }; kick();
  }

  /* ----- 효과음 ----- */
  const act = new Set(), lastAt = {};
  function playSfx(n, o) {
    o = o || {};
    const url = AUDIO.sfx && AUDIO.sfx[n]; if (!url) return null;
    const now = performance.now();
    if (!o.loop && lastAt[n] && now - lastAt[n] < 60) return null;   // 한 번에 여러 명이 맞아도 소리가 겹쳐 커지지 않게
    lastAt[n] = now;
    const el = new Audio(url); el.loop = !!o.loop;
    const x = { n, el, node: null, hooked: false };
    x.apply = () => setVol(x, S.mute ? 0 : S.sfx * ((AUDIO.sfxVol && AUDIO.sfxVol[n]) ?? 1));
    x.apply(); if (ctx) hook(x);
    act.add(x);
    const drop = () => act.delete(x);
    el.addEventListener('ended', drop); el.addEventListener('error', drop);
    const p = el.play(); if (p && p.catch) p.catch(drop);
    return x;
  }
  function stopSfx(n) { act.forEach(x => { if (!n || x.n === n) { try { x.el.pause(); } catch (e) {} act.delete(x); } }); }

  /* ----- 모바일 자동재생 해제: 첫 터치/클릭/키 입력 때 오디오를 깨우고, 막혔던 BGM을 틀어요 ----- */
  function unlock() {
    ensureCtx();
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    if (want) { const t = T[want.n]; if (t && (!t.playing || t.el.paused) && !document.hidden) playBgm(want.n, Object.assign({}, want.o, { restart: false })); }
  }
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    Object.values(T).forEach(t => {
      if (document.hidden) { if (t.playing) { try { t.el.pause(); } catch (e) {} } }
      else if (t.playing && !t.stopping) { const p = t.el.play(); if (p && p.catch) p.catch(() => {}); }
    });
  });

  /* ----- 쿵쿵 박자 동기화: 2페이즈 곡의 재생 위치로 #world 의 thumpZoom 위상을 맞춰요(노이즈는 game.js 가 thumpZoom 을 따라가요) ----- */
  let bt = 0;
  const q = new URLSearchParams(location.search).get('beat');
  function beatOff() { return (q != null && q !== '' && !isNaN(+q) ? +q : (AUDIO.beatOffset || 0)) + (AUDIO.latency || 0); }
  function beatStep() {
    const t = T.p2; if (!t || !t.playing || t.el.paused) return;
    const w = document.getElementById('world'); if (!w || !w.getAnimations) return;
    const a = w.getAnimations().find(x => x.animationName === 'thumpZoom'); if (!a || a.currentTime == null) return;
    const beatLen = 60 / (window.P2 ? P2.bpm : 58);
    const ph = (((t.el.currentTime - beatOff()) % beatLen) + beatLen) % beatLen;   // 오디오 기준 박자 안 위치
    const cur = (a.currentTime / 1000) % beatLen;                                  // 화면 기준 박자 안 위치
    let d = ph - cur; if (d > beatLen / 2) d -= beatLen; if (d < -beatLen / 2) d += beatLen;
    if (Math.abs(d) > 0.025) a.currentTime = Math.max(0, a.currentTime + d * 1000);
  }
  function beat(on) {
    clearInterval(bt); bt = 0;
    if (on) bt = setInterval(beatStep, 200);
  }

  /* ----- ⚙ 설정 UI ----- */
  (function () {
    const rb = document.getElementById('optBgm'), rs = document.getElementById('optSfx'), cm = document.getElementById('optMute');
    if (!rb) return;
    const vb = document.getElementById('optBgmV'), vs = document.getElementById('optSfxV');
    const paint = () => {
      rb.value = Math.round(S.bgm * 100); rs.value = Math.round(S.sfx * 100); cm.checked = S.mute;
      vb.textContent = rb.value; vs.textContent = rs.value;
    };
    const apply = () => { Object.values(T).forEach(t => t.apply()); act.forEach(x => x.apply()); };
    rb.addEventListener('input', () => { S.bgm = rb.value / 100; vb.textContent = rb.value; apply(); save(); });
    rs.addEventListener('input', () => { S.sfx = rs.value / 100; vs.textContent = rs.value; apply(); save(); });
    cm.addEventListener('change', () => { S.mute = cm.checked; apply(); save(); });
    paint();
  })();

  /* 곡 하나는 미리 만들어 두어 내려받기를 시작해요(1페이즈 곡 → 2페이즈 곡 순서) */
  track('p1');
  setTimeout(() => warm(['p2']), 1500);

  window.Snd = { bgm: playBgm, stopBgm, warm, duck, sfx: playSfx, stopSfx, beat, unlock, state: S, _tracks: T };
  window.playSfx = playSfx;          // game.js 의 sfx(name) 가 부르는 자리
  window.setBgmDuck = duck;          // game.js 의 bgmDuck(on) 가 부르는 자리
})();
