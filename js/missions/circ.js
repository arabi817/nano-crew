// 순환 미션: 심장 배선, 적혈구 카드, 심장 박동, 혈구 스캔, 혈관 정비
import { wireGame, sortGame, orderGame, pick, shuffle, esc } from './kit.js';

export function heartWiring(el, api, C) {
  return wireGame(el, api, { cols: [C.leftTitle, C.rightTitle], chains: C.pairs });
}

// 적혈구 카드: 알맞은 빠르기로 긁기 → 나온 경로를 순서대로 누르기
export function rbcCard(el, api, C) {
  const route = C.routes[Math.floor(Math.random() * C.routes.length)];
  el.innerHTML = `<div class="rc"><div class="rc-reader"><div class="rc-slot"></div><div class="rc-card">적혈구 카드</div></div>
    <div class="rc-msg">카드를 왼쪽에서 오른쪽 끝까지 한 번에 긁으세요</div></div>`;
  const reader = el.querySelector('.rc-reader'), card = el.querySelector('.rc-card'), msg = el.querySelector('.rc-msg');
  let id = null, sx = 0, t0 = 0;
  card.addEventListener('pointerdown', e => { e.preventDefault(); id = e.pointerId; card.setPointerCapture(id); sx = e.clientX; t0 = performance.now(); });
  card.addEventListener('pointermove', e => { if (e.pointerId !== id) return; card.style.transform = `translateX(${Math.max(0, Math.min(reader.clientWidth - card.clientWidth, e.clientX - sx))}px)`; });
  const up = e => {
    if (e.pointerId !== id) return; id = null;
    const dx = e.clientX - sx, dt = performance.now() - t0, full = reader.clientWidth - card.clientWidth - 10;
    card.style.transform = '';
    if (dx < full) { msg.textContent = '끝까지 긁어 주세요'; return api.wrong(); }
    if (dt < 350) { msg.textContent = '너무 빨라요! 조금 천천히'; return api.wrong(); }
    if (dt > 1600) { msg.textContent = '너무 느려요! 조금 빠르게'; return api.wrong(); }
    api.good();
    orderGame(el, api, { order: route.path, title: `${route.name} 경로가 나왔어요! 혈액이 지나가는 순서대로 누르세요`, cls: 'rc-order' });
  };
  card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up);
  return () => { };
}

// 심장 박동: 깜빡이는 순서 따라 누르기, 단계마다 길어짐
export function heartbeat(el, api, C) {
  el.innerHTML = `<div class="hb"><div class="hb-msg"></div><div class="hb-pads">${C.pads.map((p, i) => `<button class="hb-pad press p${i}" data-i="${i}">${esc(p)}</button>`).join('')}</div>
    <div class="hb-steps">${C.lengths.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div></div>`;
  const pads = [...el.querySelectorAll('.hb-pad')], msg = el.querySelector('.hb-msg');
  let stage = 0, seq = [], input = 0, playing = false, alive = true;
  const timers = [];
  const later = (f, ms) => timers.push(setTimeout(() => alive && f(), ms));
  const play = () => {
    playing = true; input = 0; msg.textContent = '잘 보세요...';
    seq = Array.from({ length: C.lengths[stage] }, () => Math.floor(Math.random() * pads.length));
    seq.forEach((p, k) => { later(() => pads[p].classList.add('lit'), 500 + k * 600); later(() => pads[p].classList.remove('lit'), 500 + k * 600 + 380); });
    later(() => { playing = false; msg.textContent = '똑같이 누르세요!'; }, 500 + seq.length * 600);
  };
  pads.forEach(b => b.onclick = () => {
    if (playing) return;
    const i = +b.dataset.i;
    b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 180);
    if (i !== seq[input]) { api.wrong(); msg.textContent = '틀렸어요. 다시 볼게요'; later(play, 900); return; }
    input++;
    if (input >= seq.length) {
      el.querySelector(`.hb-steps i[data-i="${stage}"]`).classList.add('ok'); api.good(); stage++;
      playing = true; msg.textContent = stage < C.lengths.length ? '잘했어요! 다음은 더 길어요' : '완벽해요!';
      if (stage >= C.lengths.length) api.success(); else later(play, 700);
    }
  });
  later(play, 300);
  return () => { alive = false; timers.forEach(clearTimeout); };
}

// 혈구 스캔: 혈구 그림에 이름표와 특징 카드 붙이기 (보이는 미션)
const CELL_SVG = {
  '적혈구': '<svg viewBox="0 0 60 60"><ellipse cx="30" cy="30" rx="24" ry="20" fill="#e5484d" stroke="#1a1018" stroke-width="3"/><ellipse cx="30" cy="30" rx="11" ry="8" fill="#b8323d"/></svg>',
  '백혈구': '<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="27" fill="#eef1f4" stroke="#1a1018" stroke-width="3"/><path d="M18 26 q6 -10 14 -2 q8 -8 12 4 q-4 10 -12 4 q-8 8 -14 -6z" fill="#7d3bb0" stroke="#1a1018" stroke-width="2"/></svg>',
  '혈소판': '<svg viewBox="0 0 60 60"><path d="M24 26 l8 -4 l6 6 l-4 7 l-8 1 z" fill="#c9a0dc" stroke="#1a1018" stroke-width="2.5"/><path d="M38 38 l5 -2 l3 4 l-4 3z" fill="#c9a0dc" stroke="#1a1018" stroke-width="2"/></svg>',
};
export function bloodScan(el, api, C) {
  const names = Object.keys(C.cells);
  const feats = names.flatMap(n => C.cells[n].map(f => ({ label: f, ok: [n] })));
  const items = [...names.map(n => ({ label: n, ok: [n] })), ...pick(feats, C.cards - names.length + 1)];
  const r = sortGame(el, api, {
    items, tray: '이름표와 특징 카드', cls: 'scan',
    bins: shuffle(names).map(n => ({ name: n, html: `<div class="scan-cell">${CELL_SVG[n]}</div>` })),
  });
  el.querySelector('.sg').insertAdjacentHTML('beforeend', '<div class="scan-light"></div>');
  return r;
}

// 혈관 정비: 나온 혈관에 맞는 특징만 켜기
export function vesselCheck(el, api, C) {
  const names = pick(Object.keys(C.vessels), C.rounds);
  const allFeats = Object.values(C.vessels).flat();
  let r = 0;
  const draw = () => {
    const v = names[r], right = C.vessels[v];
    el.innerHTML = `<div class="vc"><div class="vc-top"><div class="vc-cross v-${esc(v)}"></div><div class="vc-name">${esc(v)}<small>${r + 1} / ${names.length}</small></div></div>
      <div class="vc-grid">${shuffle(allFeats).map(f => `<button class="vc-sw press" data-f="${esc(f)}"><i></i>${esc(f)}</button>`).join('')}</div>
      <div class="vc-tip">맞는 특징을 모두 켜면 바로 다음으로 넘어가요</div></div>`;
    // 맞는 칸만 켜져요. 틀린 칸을 누르면 흔들려요. 다 켜면 자동 완료 (어몽어스처럼)
    let got = 0;
    el.querySelectorAll('.vc-sw').forEach(b => b.onclick = () => {
      if (b.classList.contains('on')) return;
      if (!right.includes(b.dataset.f)) return api.wrong();
      b.classList.add('on'); api.good();
      if (++got >= right.length) { r++; if (r >= names.length) api.success(); else setTimeout(draw, 500); }
    });
  };
  draw();
  return () => { };
}
