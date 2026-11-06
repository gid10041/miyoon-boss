/* ===== 3단계: 공격 입력 미니게임 + 설정(미니게임 간소화) =====
   data.js의 MINI / atkGame / game 설정을 읽어요. game.js보다 먼저 불러오세요. */

/* ----- 설정: 미니게임 간소화(자동 성공). 브라우저에 저장돼요 ----- */
const Opt = {
  simple: (() => { try { return localStorage.getItem('miyun_simple') === '1'; } catch (e) { return false; } })(),
  setSimple(v) { this.simple = !!v; try { localStorage.setItem('miyun_simple', v ? '1' : '0'); } catch (e) {} }
};

/* 겹치지 않는 랜덤 글자 n개 */
function pickLetters(n) {
  const a = MINI.letters.split('');
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

/* 미니게임 실행. 성공하면 true, 실패하면 false로 끝나는 Promise를 돌려줘요.
   i: 행동하는 아군 번호, g: 미니게임 설정, title: 패널 제목 */
function runMini(i, g, title) {
  if (Opt.simple || !g) return Promise.resolve(true);
  return new Promise(resolve => {
    const c = G.p[i], host = document.getElementById('ui');
    G.cur = i; G.back = null; render();                       // 행동 중인 캐릭터에 파란 테두리
    document.body.classList.add('mini-on');

    const letters = pickLetters(g.type === 'mash' ? g.keys : g.n);
    const ratio = c.hp / c.maxHp;
    const amp = c.id === 'lacie' && g.type === 'hold' ? (ratio <= MINI.trembleLow ? MINI.trembleAmpLow : ratio <= MINI.trembleMid ? MINI.trembleAmpMid : 0) : 0;
    const note = g.type === 'tap' ? '표시된 키를 모두 누르세요! (순서 상관없음)'
      : g.type === 'mash' ? `각 키를 ${g.times}번씩 연타하세요!`
      : `모든 키를 동시에 ${g.sec}초 동안 누르고 있으세요!`;
    const mt = navigator.maxTouchPoints;
    const warn = g.type === 'hold' && typeof TOUCH !== 'undefined' && TOUCH && mt > 0 && mt < g.n
      ? `동시 터치 한계(${mt}개)! 어려우면 ⚙에서 간소화` : '';

    host.innerHTML = `<div class="panel mini wait ${amp ? 'trem' : ''}" style="--c:${c.color};--a:${amp}">
      <div class="mhead"><span>${colorize(title)}</span><span class="mstat"></span></div>
      <div class="mbar ${g.type}"><i></i></div>
      <div class="mkeys ${g.type}">${letters.map(L =>
        `<button class="key" data-k="${L}" style="--dl:-${(Math.random() * .2).toFixed(3)}s"><span class="kb"><span class="kv">${L}${g.type === 'mash' ? `<small>0/${g.times}</small>` : ''}</span></span></button>`).join('')}</div>
      <div class="mnote ${warn ? 'warn' : ''}">${warn || note}</div></div>`;
    const panel = host.firstChild, stat = panel.querySelector('.mstat'), fill = panel.querySelector('.mbar i');
    const keyEl = L => panel.querySelector(`.key[data-k="${L}"]`);

    let phase = 'ready', done = false, raf = 0, t0 = 0;
    const off = [];                                           // 끝날 때 해제할 이벤트들
    const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); off.push(() => t.removeEventListener(ev, fn, o)); };

    function finish(ok) {
      if (done) return; done = true; phase = 'end';
      cancelAnimationFrame(raf); off.forEach(f => f());
      panel.classList.remove('wait', 'trem'); panel.classList.add(ok ? 'win' : 'lose');
      stat.textContent = ok ? '성공!' : '실패...'; stat.className = 'mstat ' + (ok ? 'ok' : 'ng');
      setTimeout(() => {
        document.body.classList.remove('mini-on'); host.innerHTML = ''; resolve(ok);
      }, ok ? 450 : 700);
    }

    /* ----- 종류별 규칙: down(글자, 입력원) / up(글자, 입력원) / tick(현재시각) ----- */
    let down, up = () => {}, tick;
    const timed = now => {                                    // tap, mash: 제한시간 바
      const left = g.sec * 1000 - (now - t0);
      fill.style.width = Math.max(0, left / (g.sec * 1000) * 100) + '%';
      stat.textContent = (Math.max(0, left) / 1000).toFixed(1) + '초';
      if (left <= 0) finish(false);
    };

    if (g.type === 'tap') {
      const lit = new Set();
      down = L => {
        if (phase !== 'go' || lit.has(L)) return;
        lit.add(L); keyEl(L).classList.add('on');
        if (lit.size === letters.length) finish(true);
      };
      tick = timed;
    } else if (g.type === 'mash') {
      const cnt = {}; letters.forEach(L => cnt[L] = 0);
      down = L => {
        if (phase !== 'go' || cnt[L] >= g.times) return;
        cnt[L]++;
        const k = keyEl(L), kv = k.querySelector('.kv');
        kv.querySelector('small').textContent = `${cnt[L]}/${g.times}`;
        k.style.setProperty('--p', (cnt[L] / g.times * 100) + '%');
        if (cnt[L] >= g.times) k.classList.add('on');
        kv.classList.remove('bump'); void kv.offsetWidth; kv.classList.add('bump');
        if (letters.every(x => cnt[x] >= g.times)) finish(true);
      };
      tick = timed;
    } else { // hold
      const src = new Map(letters.map(L => [L, new Set()]));
      let since = 0, slips = 0;
      const allHeld = () => letters.every(L => src.get(L).size > 0);
      const dots = () => '기회 ' + '●'.repeat(Math.max(0, g.slip - slips)) + '○'.repeat(Math.min(g.slip, slips));
      const refresh = () => letters.forEach(L => keyEl(L).classList.toggle('on', src.get(L).size > 0));
      const paint = () => { stat.textContent = dots(); stat.classList.toggle('ng', slips >= g.slip); };
      paint();
      down = (L, id) => {
        src.get(L).add(id); refresh();
        if (phase === 'go' && !since && allHeld()) since = performance.now();
      };
      up = (L, id) => {
        src.get(L).delete(id); refresh();
        if (phase === 'go' && since && !allHeld()) {          // 유지하다가 놓침 → 처음부터, 기회 1 소모
          since = 0; fill.style.width = '0%'; slips++;
          panel.classList.remove('slip'); void panel.offsetWidth; panel.classList.add('slip');
          if (slips > g.slip) return finish(false);
          paint();
        }
      };
      on(window, 'blur', () => { src.forEach(s => s.clear()); refresh(); since = 0; fill.style.width = '0%'; });   // 창을 벗어난 건 실수로 치지 않음
      tick = now => {
        if (since) { const p = (now - since) / (g.sec * 1000); fill.style.width = Math.min(100, p * 100) + '%'; if (p >= 1) finish(true); }
      };
      panel._start = () => { if (allHeld()) since = performance.now(); };
    }

    /* ----- 입력: 화면 타일(터치/마우스) + 키보드(영문 키 위치 기준, 한글 IME 상관없음) ----- */
    const keyOf = e => { const m = /^Key([A-Z])$/.exec(e.code || ''); return m && letters.includes(m[1]) ? m[1] : null; };
    on(window, 'keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const L = keyOf(e); if (!L) return;
      e.preventDefault(); if (e.repeat) return; down(L, 'kb');
    });
    on(window, 'keyup', e => { const L = keyOf(e); if (L) { e.preventDefault(); up(L, 'kb'); } });
    panel.querySelectorAll('.key').forEach(b => {
      const L = b.dataset.k;
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        try { b.setPointerCapture(e.pointerId); } catch (_) {}
        down(L, e.pointerId);
      });
      const rel = e => up(L, e.pointerId);
      b.addEventListener('pointerup', rel);
      b.addEventListener('pointercancel', rel);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });

    /* ----- 시작: 잠깐 준비 시간을 준 뒤 입력/타이머 시작 ----- */
    stat.textContent = g.type === 'hold' ? stat.textContent : '준비!';
    setTimeout(() => {
      if (done) return;
      phase = 'go'; panel.classList.remove('wait'); t0 = performance.now();
      if (panel._start) panel._start();
      const loop = now => { if (done) return; tick(performance.now()); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }, MINI.readyMs);
  });
}

/* ----- 설정 UI: 왼쪽 위 구석의 작은 톱니바퀴 ----- */
(function () {
  const gear = document.getElementById('gear'), box = document.getElementById('settings'), cb = document.getElementById('optSimple');
  if (!gear) return;
  cb.checked = Opt.simple;
  gear.addEventListener('click', e => { e.stopPropagation(); box.classList.toggle('on'); });
  cb.addEventListener('change', () => Opt.setSimple(cb.checked));
  document.addEventListener('click', e => { if (!e.target.closest('#gear,#settings')) box.classList.remove('on'); });
})();
