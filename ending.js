/* ===== 5단계: 엔딩 연출 =====
   data.js 의 ENDINGS[lose|win|flee] 를 위에서부터 차례로 실행해요. (game.js 보다 먼저 불러오고, game.js 의 함수는 실행 시점에만 써요)
   화면 구성(#ending, 아래→위): 흰 막 / 일러스트 / 검은 막 / 크레딧 / 대화창 / 끝 화면(다시 시도) */
const Ending = (function () {
  const $e = s => document.querySelector(s);
  const el = $e('#ending'), W = $e('#endW'), K = $e('#endK'), IMG = $e('#endImg'), CR = $e('#endCred'), UI = $e('#endUi'), FIN = $e('#endFin'), GAME = $e('#game');
  let run = 0, tms = [], clk = null, kind = '';
  const later = (fn, ms) => { const id = setTimeout(fn, ms); tms.push(id); return id; };
  const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const snd = (fn, ...a) => { try { if (window.Snd) return Snd[fn](...a); } catch (e) {} };

  /* ----- 클릭·키 한 번에 한 단계 ----- */
  function fire() { if (!clk) return; const f = clk; clk = null; f(); }
  el.addEventListener('click', e => { if (e.target.closest('button')) return; fire(); });
  window.addEventListener('keydown', e => {
    if (!el.classList.contains('on')) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest && e.target.closest('button,input,#settings,#gear')) return;
    e.preventDefault(); if (!e.repeat) fire();
  });

  /* ----- 배경 막: white = 흰 막, black = 검은 막(일러스트 위), none = 둘 다 걷음 ----- */
  function bg(k, ms) {
    const d = (ms == null ? 1000 : ms) + 'ms';
    W.style.transitionDuration = K.style.transitionDuration = d;
    if (k === 'white') { W.style.opacity = 1; K.style.opacity = 0; }
    else if (k === 'black') { K.style.opacity = 1; }
    else { W.style.opacity = 0; K.style.opacity = 0; }
  }

  /* ----- 일러스트(없는 파일은 안내 문구) ----- */
  const imgP = {};
  function load(src) {
    if (!imgP[src]) imgP[src] = new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = src; });
    return imgP[src];
  }
  function img(src, ms, my) {
    const d = ms == null ? 900 : ms;
    IMG.querySelectorAll('.ri').forEach(o => { o.style.transitionDuration = d + 'ms'; o.classList.remove('on'); setTimeout(() => o.remove(), d + 80); });
    if (!src) return;
    load(src).then(ok => {
      if (my !== run) return;
      const o = document.createElement('div'); o.className = 'ri';
      o.style.transitionDuration = d + 'ms';
      if (ok) o.style.backgroundImage = `url("${src}")`;
      else { o.classList.add('noimg'); o.textContent = `(일러스트 없음: ${src.split('/').pop()})`; }
      IMG.appendChild(o);
      requestAnimationFrame(() => requestAnimationFrame(() => o.classList.add('on')));
    });
  }

  /* ----- 대화창: 줄마다 클릭 한 번. 색이 지정된 줄은 이름을 따로 칠하지 않고, 흰 글씨 줄만 이름을 칠해요 ----- */
  function line(t, c) {
    if (c === 'b') return `<span class="blue">${esc(t)}</span>`;
    if (c && c !== 'k') return `<span style="color:${c}">${esc(t)}</span>`;
    return fmt(esc(t));
  }
  function say(lines, next) {
    const q = lines.map(l => typeof l === 'string' ? [l, 'k'] : l); let k = 0;
    const show = () => {
      const [t, c, auto] = q[k];
      UI.style.opacity = 1;
      UI.innerHTML = `<div class="panel dlg">${line(t, c)}${auto ? '' : '<span class="tip">▼</span>'}</div>`;
      const go = () => { clk = null; k++; if (k < q.length) show(); else { UI.innerHTML = ''; next(); } };
      if (auto) later(go, auto); else clk = go;
    };
    show();
  }
  function type(o, next) {
    const c = o.color || 'b', chars = [...o.text]; let n = 0;
    UI.style.opacity = 1;
    UI.innerHTML = `<div class="panel dlg">${line('', c)}</div>`;
    const sp = UI.querySelector('span');
    (function step() {
      if (n >= chars.length) return later(next, o.after != null ? o.after : 600);
      sp.textContent += chars[n++]; later(step, o.ms || 60);
    })();
  }

  /* ----- 크레딧: 줄이 차례로 떠오르고, 클릭하면 다음으로 ----- */
  function credits(next) {
    K.style.transitionDuration = '600ms'; K.style.opacity = 1;
    CR.innerHTML = CREDITS.map((t, i) => `<div style="animation-delay:${(i * 0.4).toFixed(2)}s">${t ? esc(t) : '&nbsp;'}</div>`).join('') + '<span class="tip">▼</span>';
    CR.classList.add('on');
    const t0 = performance.now();
    const go = () => { if (performance.now() - t0 < 900) { clk = go; return; } clk = null; CR.classList.remove('on'); next(); };
    clk = go;
  }

  /* ----- 끝 화면: 반투명 검정 + (제목) + 다시 시도 버튼 ----- */
  function fin(o) {
    const m = Object.assign({}, ENDING_META[o.kind || kind] || {}, o);
    FIN.style.background = `rgba(0,0,0,${m.dim != null ? m.dim : 0.6})`;
    FIN.innerHTML = (m.title ? `<div id="endTitle">${esc(m.title)}</div>` : '') + `<button id="endRetry">${esc(m.btn || '다시 시도')}</button>`;
    FIN.classList.add('on');
    const b = $e('#endRetry'); b.onclick = () => init();
    later(() => b.focus({ preventScroll: true }), 300);
  }

  /* ----- 전투 화면 연출(쿵쿵·웅웅·소음) 정리 ----- */
  function clean() { GAME.classList.remove('thump', 'drone'); try { stopNoise(); } catch (e) {} snd('beat', false); }

  /* ----- 스크립트 실행기 ----- */
  function step(i, sc, my) {
    if (my !== run) return;
    const o = sc[i]; if (!o) return;
    const nx = () => step(i + 1, sc, my);
    if (o.say) return say(o.say, nx);
    if (o.type) return type(o.type, nx);
    if (o.wait != null) return later(nx, o.wait);
    if (o.pause) { clk = () => { clk = null; nx(); }; return; }
    if (o.credits) return credits(nx);
    if (o.fin) { fin(o.fin); return; }
    if ('bg' in o) bg(o.bg, o.ms);
    if ('img' in o) img(o.img, o.ms, my);
    if ('ui' in o) {
      if (o.ms === 0) { UI.style.transition = 'none'; UI.style.opacity = o.ui ? 1 : 0; if (!o.ui) UI.innerHTML = ''; UI.offsetWidth; UI.style.transition = ''; }   // ms:0 이면 즉시
      else { UI.style.opacity = o.ui ? 1 : 0; if (!o.ui) later(() => { if (my === run) UI.innerHTML = ''; }, 700); }
    }
    if ('bgm' in o) snd('bgm', o.bgm, { fade: o.fade });
    if ('bgmStop' in o) snd('stopBgm', o.bgmStop);
    if ('sfx' in o) snd('sfx', o.sfx, { loop: !!o.loop });
    if ('sfxStop' in o) snd('stopSfx', o.sfxStop);
    if (o.clean) clean();
    nx();
  }

  function reset() {
    run++; tms.forEach(clearTimeout); tms = []; clk = null;
    el.classList.remove('on'); GAME.classList.remove('ending');
    W.style.transitionDuration = K.style.transitionDuration = '0ms'; W.style.opacity = 0; K.style.opacity = 0;
    IMG.innerHTML = ''; UI.innerHTML = ''; UI.style.opacity = 0; CR.innerHTML = ''; CR.classList.remove('on');
    FIN.classList.remove('on'); FIN.innerHTML = '';
    snd('stopSfx');
  }
  function play(k) {
    reset(); kind = k;
    const sc = ENDINGS[k]; if (!sc) return;
    sc.forEach(o => { if (o.img) load(o.img); });          // 일러스트는 미리 내려받아 둠(없으면 안내 문구)
    el.classList.add('on'); GAME.classList.add('ending');
    if (k === 'win') void el.offsetWidth;   // 엔딩2: 켜지자마자 바뀌면 페이드가 생략되므로, 먼저 화면에 그려서 하얗게 서서히 변하게 함
    step(0, sc, run);
  }
  return { play, reset };
})();
