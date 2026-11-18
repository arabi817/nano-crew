// 소화 미션: 소화효소 배선(긴), 영양소 검출, 융털 흡수, 소화관 조립, 큰창자 비우기
import { draggable, sortGame, wireGame, pick, shuffle, esc } from './kit.js';

// 소화효소 배선: 단계(0 입, 1 위, 2 작은창자)마다 패널 하나
export const digestWire = step => (el, api, C) => {
  const p = C.panels[step];
  return wireGame(el, api, { cols: C.cols, chains: p.right, extra: p.extra });
};

// 영양소 검출: 시약을 시험관에 넣으면 색이 변함 → 들어 있는 영양소 고르기
export function nutrientTest(el, api, C) {
  const rounds = pick(C.reagents, C.rounds);
  let r = 0;
  const draw = () => {
    const R = rounds[r];
    el.innerHTML = `<div class="nt">
      <div class="nt-shelf">${shuffle(C.reagents).map(g => `<div class="nt-bottle ${g === R ? 'use' : 'off'}" data-n="${esc(g.short)}"><i></i><span>${esc(g.name)}</span></div>`).join('')}</div>
      <div class="nt-bench">
        <div class="nt-tube"><div class="nt-liquid"></div></div>
        ${R.heat ? '<button class="nt-heat press" disabled>가열하기</button>' : ''}
        <div class="nt-msg">${r + 1}번째 시험관 · 반짝이는 시약 병을 시험관에 끌어 넣으세요</div>
      </div>
      <div class="nt-choices"></div></div>`;
    const liquid = el.querySelector('.nt-liquid'), msg = el.querySelector('.nt-msg');
    const ask = () => {
      liquid.style.background = R.color; liquid.classList.add('react');
      msg.textContent = `${R.colorName}으로 변했어요! 어떤 영양소가 들어 있나요?`;
      el.querySelector('.nt-choices').innerHTML = shuffle(C.reagents.map(g => g.nutrient)).map(n => `<button class="og-btn press" data-n="${esc(n)}">${esc(n)}</button>`).join('');
      el.querySelectorAll('.nt-choices button').forEach(b => b.onclick = () => {
        if (b.dataset.n !== R.nutrient) return api.wrong();
        api.good(); r++;
        if (r >= rounds.length) api.success(); else setTimeout(draw, 500);
      });
    };
    draggable(el.querySelector('.nt-bottle.use'), {
      onDrop: under => {
        if (!under?.closest?.('.nt-tube')) return false;
        el.querySelector('.nt-bottle.use').style.visibility = 'hidden';
        liquid.style.background = '#cfe6f3'; liquid.classList.add('drop');
        if (R.heat) {
          msg.textContent = '이 시약은 가열해야 색이 변해요';
          const h = el.querySelector('.nt-heat'); h.disabled = false;
          h.onclick = () => { h.disabled = true; h.classList.add('on'); setTimeout(ask, 900); };
        } else setTimeout(ask, 500);
        return true;
      },
    });
  };
  draw();
  return () => { };
}

// 융털 흡수: 수용성 → 모세혈관, 지용성 → 암죽관
export function villi(el, api, C) {
  const pool = [...C.water.map(l => ({ label: l, ok: [C.bins[0]] })), ...C.fat.map(l => ({ label: l, ok: [C.bins[1]] }))];
  const items = pick(pool, C.count);
  return sortGame(el, api, {
    items, tray: '작은창자 안의 영양소', cls: 'villi',
    bins: [
      { name: C.bins[0], html: `<b>${esc(C.bins[0])}</b><small>탱크</small>` },
      { name: C.bins[1], html: `<b>${esc(C.bins[1])}</b><small>탱크</small>` },
    ],
  });
}

// 소화관 조립: 몸 그림의 빈 자리에 부품 끼우기 (자리에는 이름이 없어요)
export function gutAssembly(el, api, C) {
  // 몸 안 자리 (그림 기준 %좌표)
  const slots = {
    '입': [50, 8], '식도': [50, 22], '위': [70, 36], '작은창자': [50, 66], '큰창자': [50, 80], '항문': [50, 94],
    '간': [27, 36], '쓸개': [30, 51], '이자': [70, 51],
  };
  const parts = [...C.tube, ...C.organs];
  el.innerHTML = `<div class="ga">
    <div class="ga-body"><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="ga-outline">
      <path d="M50 2 C70 2 74 14 66 20 C82 24 84 40 82 60 C82 82 72 98 50 98 C28 98 18 82 18 60 C16 40 18 24 34 20 C26 14 30 2 50 2Z" fill="#f3c9b8" stroke="#1a1018" stroke-width="1.2"/></svg>
      ${Object.entries(slots).map(([n, [x, y]]) => `<div class="ga-slot ${C.organs.includes(n) ? 'organ' : ''}" data-n="${esc(n)}" style="left:${x}%;top:${y}%"></div>`).join('')}
    </div>
    <div class="ga-parts"><div class="sg-h">부품</div><div class="ga-tray">${shuffle(parts).map(n => `<div class="sg-item ga-part" data-n="${esc(n)}">${esc(n)}</div>`).join('')}</div></div></div>`;
  let got = 0;
  el.querySelectorAll('.ga-part').forEach(p => draggable(p, {
    onDrop: under => {
      const s = under?.closest?.('.ga-slot'); if (!s || s.classList.contains('ok')) return false;
      if (s.dataset.n !== p.dataset.n) { api.wrong(); return false; }
      p.style.transform = ''; p.dataset.locked = 1; s.classList.add('ok'); s.append(p);
      api.good(); if (++got >= parts.length) api.success(); return true;
    },
  }));
  return () => { };
}

// 큰창자 비우기: 레버를 끝까지 당겨 2초 버티기 (보이는 미션)
export function colon(el, api, C) {
  el.innerHTML = `<div class="lv">
    <div class="lv-tank"><div class="lv-water"></div><div class="lv-waste"></div><div class="lv-tag a">${esc(C.labels[0])}</div><div class="lv-tag b">${esc(C.labels[1])}</div></div>
    <div class="lv-rail"><div class="lv-handle">당기기</div></div>
    <div class="lv-msg">손잡이를 아래 끝까지 당긴 채로 기다리세요</div></div>`;
  const rail = el.querySelector('.lv-rail'), handle = el.querySelector('.lv-handle'), water = el.querySelector('.lv-water'), waste = el.querySelector('.lv-waste');
  let id = null, sy = 0, held = 0, raf = 0, last = 0, done = false;
  const max = () => rail.clientHeight - handle.clientHeight;
  handle.addEventListener('pointerdown', e => { if (done) return; e.preventDefault(); id = e.pointerId; handle.setPointerCapture(id); sy = e.clientY - (parseFloat(handle.style.top) || 0); });
  handle.addEventListener('pointermove', e => { if (e.pointerId !== id) return; handle.style.top = Math.max(0, Math.min(max(), e.clientY - sy)) + 'px'; });
  const release = e => { if (e.pointerId !== id) return; id = null; if (!done) handle.style.top = '0px'; };
  handle.addEventListener('pointerup', release); handle.addEventListener('pointercancel', release);
  const loop = t => {
    const dt = last ? t - last : 16; last = t;
    const atBottom = (parseFloat(handle.style.top) || 0) >= max() - 4 && id !== null;
    held = atBottom ? held + dt : Math.max(0, held - dt * 2);
    const k = Math.min(1, held / 2000);
    water.style.height = (60 - k * 55) + '%'; waste.style.transform = `translateY(${k * 120}%)`;
    if (k >= 1 && !done) { done = true; api.success(); }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
