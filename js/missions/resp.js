// 호흡 미션: 호흡 모형, 호흡 운동 조절, 공기 경로 (폐포 필터는 alveoliFilter.js)
import { shuffle, esc } from './kit.js';

// 호흡 모형: 고무막 당기기 → 풍선 부풂(들숨), 놓으면 날숨. 두 번 한 뒤 모형이 우리 몸의 무엇인지 고르기 (보이는 미션)
export function breathModel(el, api, C) {
  el.innerHTML = `<div class="bm">
    <div class="bm-jar"><svg class="bm-tube" viewBox="0 0 208 126" aria-hidden="true">
      <path d="M104 0 V70 M104 70 L72 122 M104 70 L136 122" fill="none" stroke="#1a1018" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M104 0 V70 M104 70 L72 122 M104 70 L136 122" fill="none" stroke="#e6eef5" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="86" y="30" width="36" height="22" rx="5" fill="#c9925a" stroke="#1a1018" stroke-width="4"/></svg><div class="bm-balloon l"></div><div class="bm-balloon r"></div>
      <div class="bm-sheet"><div class="bm-knob">당기기</div></div></div>
    <div class="bm-side"><div class="bm-state"></div><div class="bm-count"></div><div class="bm-quiz"></div></div></div>`;
  const knob = el.querySelector('.bm-knob'), sheet = el.querySelector('.bm-sheet'), state = el.querySelector('.bm-state');
  const balloons = el.querySelectorAll('.bm-balloon'), count = el.querySelector('.bm-count');
  let id = null, sy = 0, pulled = 0, cycles = 0, wasDown = false;
  const set = k => {
    pulled = k;
    sheet.style.transform = `translateY(${k * 46}px)`;
    balloons.forEach(b => b.style.transform = `scale(${0.55 + k * 0.6})`);
    state.innerHTML = k > 0.85 ? C.pull.map(t => `<div class="bm-s on">${esc(t)}</div>`).join('') : k < 0.1 && wasDown ? `<div class="bm-s">${esc(C.release[0])}</div>` : '<div class="bm-s dim">고무막을 아래로 당겨 보세요</div>';
    count.textContent = `호흡 ${Math.min(cycles, C.cycles)} / ${C.cycles}`;
  };
  knob.addEventListener('pointerdown', e => { if (cycles >= C.cycles) return; e.preventDefault(); id = e.pointerId; knob.setPointerCapture(id); sy = e.clientY; });
  knob.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    const k = Math.max(0, Math.min(1, (e.clientY - sy) / 46)); set(k);
    if (k > 0.85 && !wasDown) { wasDown = true; api.good(); }
  });
  const up = e => {
    if (e.pointerId !== id) return; id = null; set(0);
    if (wasDown) { cycles++; wasDown = cycles < C.cycles ? false : wasDown; set(0); }
    if (cycles >= C.cycles) quiz();
  };
  knob.addEventListener('pointerup', up); knob.addEventListener('pointercancel', up);
  set(0);
  const quiz = () => {
    const parts = Object.entries(C.parts), opts = shuffle(Object.values(C.parts));
    let i = 0;
    const box = el.querySelector('.bm-quiz');
    const q = () => {
      if (i >= parts.length) return api.success();
      const [model] = parts[i];
      box.innerHTML = `<div class="bm-q">모형의 <b>${esc(model)}</b>은(는) 우리 몸의?</div>${opts.map(o => `<button class="og-btn press" data-o="${esc(o)}">${esc(o)}</button>`).join('')}`;
      box.querySelectorAll('button').forEach(b => b.onclick = () => { if (b.dataset.o !== parts[i][1]) return api.wrong(); api.good(); i++; q(); });
    };
    q();
  };
  return () => { };
}

// 호흡 운동 조절: 들숨/날숨에 맞게 스위치 맞추기
export function diaphragm(el, api, C) {
  const rounds = shuffle(['in', 'out']);
  let r = 0;
  const draw = () => {
    const mode = rounds[r];
    el.innerHTML = `<div class="dg"><div class="dg-title">${mode === 'in' ? '들숨' : '날숨'}이 되게 맞추세요 <small>${r + 1} / 2</small></div>
      ${C.rows.map((row, k) => {
        const opts = shuffle([row.in, row.out]);
        return `<div class="dg-row" data-k="${k}"><span class="dg-name">${esc(row.name)}</span>${opts.map(o => `<button class="dg-opt press" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
      }).join('')}</div>`;
    // 줄마다 맞는 쪽을 누르면 고정, 틀리면 흔들려요. 다 맞추면 자동으로 다음 (어몽어스처럼)
    let got = 0;
    el.querySelectorAll('.dg-row').forEach((row, k) => row.querySelectorAll('.dg-opt').forEach(b => b.onclick = () => {
      if (row.dataset.done) return;
      if (b.dataset.o !== C.rows[k][mode]) return api.wrong();
      row.dataset.done = 1; b.classList.add('on'); api.good();
      if (++got >= C.rows.length) { r++; if (r >= rounds.length) api.success(); else setTimeout(draw, 500); }
    }));
  };
  draw();
  return () => { };
}

// 공기 경로: 흩어진 점을 공기가 지나가는 순서대로 손가락으로 이어 그리기
export function airPath(el, api, C) {
  const spots = shuffle([[18, 22], [72, 18], [30, 72], [80, 70], [50, 46], [14, 52], [62, 84]]).slice(0, C.path.length);
  const order = C.path;
  const labels = shuffle(order);
  el.innerHTML = `<div class="ap"><svg class="ap-svg"></svg>${labels.map((t, i) => `<div class="ap-dot" data-t="${esc(t)}" style="left:${spots[i][0]}%;top:${spots[i][1]}%"><i></i><span>${esc(t)}</span></div>`).join('')}
    <div class="ap-msg">첫 번째 점에 손가락을 대고, 떼지 말고 차례대로 지나가세요</div></div>`;
  const root = el.querySelector('.ap'), svg = el.querySelector('.ap-svg');
  let id = null, chain = [], cur = null;
  const ctr = d => { const a = d.querySelector('i').getBoundingClientRect(), b = root.getBoundingClientRect(); return [a.left + a.width / 2 - b.left, a.top + a.height / 2 - b.top]; };
  const draw = () => {
    const pts = chain.map(ctr); if (cur) pts.push(cur);
    svg.innerHTML = pts.length > 1 ? `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#1a1018" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#9fdcf5" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  };
  const reset = () => { chain = []; cur = null; root.querySelectorAll('.ap-dot').forEach(d => d.classList.remove('ok')); draw(); };
  const hit = (x, y) => document.elementFromPoint(x, y)?.closest?.('.ap-dot');
  root.addEventListener('pointerdown', e => {
    const d = hit(e.clientX, e.clientY); if (!d) return;
    e.preventDefault(); id = e.pointerId; root.setPointerCapture(id);
    if (d.dataset.t !== order[0]) { api.wrong(); id = null; return; }
    chain = [d]; d.classList.add('ok'); draw();
  });
  root.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    const b = root.getBoundingClientRect(); cur = [e.clientX - b.left, e.clientY - b.top];
    const d = hit(e.clientX, e.clientY);
    if (d && !chain.includes(d)) {
      if (d.dataset.t === order[chain.length]) {
        chain.push(d); d.classList.add('ok'); api.good();
        if (chain.length >= order.length) { id = null; cur = null; draw(); return api.success(); }
      } else { api.wrong(); id = null; reset(); return; }
    }
    draw();
  });
  const up = e => { if (e.pointerId !== id) return; id = null; if (chain.length < order.length) reset(); };
  root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
  return () => { };
}
