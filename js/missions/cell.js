// 세포 발전소(공통)와 노폐물 배출(긴): 받기 → 옮기기 → 넣기
import { draggable, shuffle, esc } from './kit.js';

// 캡슐을 운반통(가방)에 넣는 간단한 단계
function carry(el, api, { item, from, to, color }) {
  el.innerHTML = `<div class="cy"><div class="cy-src"><div class="sg-h">${esc(from)}</div>
      <div class="cy-cap" style="--cc:${color}">${esc(item)}</div></div>
    <div class="cy-arrow"></div>
    <div class="cy-dst"><div class="sg-h">${esc(to)}</div><div class="cy-slot"></div></div></div>`;
  draggable(el.querySelector('.cy-cap'), {
    onDrop: under => {
      const s = under?.closest?.('.cy-slot'); if (!s) return false;
      const cap = el.querySelector('.cy-cap'); cap.style.transform = ''; cap.dataset.locked = 1; s.append(cap);
      api.success(); return true;
    },
  });
  return () => { };
}

export const powerPick = idx => (el, api, C) => carry(el, api, {
  item: `${C.inputs[idx]} 캡슐`, from: idx === 0 ? '작은창자에서 흡수한 영양소' : '폐에서 받은 기체', to: '내 가방', color: idx === 0 ? '#ffcc33' : '#9fdcf5',
});

// 발전기: 캡슐 두 개 넣기 → 레버 → 식 완성
export function powerFinal(el, api, C) {
  const [a, b, p1, p2, e] = C.equation;
  el.innerHTML = `<div class="pw">
    <div class="pw-bag"><div class="sg-h">내 가방</div>${C.inputs.map((n, i) => `<div class="cy-cap pw-in" data-n="${esc(n)}" style="--cc:${i ? '#9fdcf5' : '#ffcc33'}">${esc(n)}</div>`).join('')}</div>
    <div class="pw-machine"><div class="pw-hopper">넣는 곳</div><div class="pw-gauge"><div class="pw-fill"></div><span>에너지</span></div>
      <button class="pw-lever press" disabled>레버 당기기</button><div class="pw-out"></div></div>
    <div class="pw-eq" hidden></div></div>`;
  let fed = 0;
  const lever = el.querySelector('.pw-lever');
  el.querySelectorAll('.pw-in').forEach(c => draggable(c, {
    onDrop: under => {
      if (!under?.closest?.('.pw-hopper')) return false;
      c.style.transform = ''; c.dataset.locked = 1; el.querySelector('.pw-hopper').append(c); api.good();
      if (++fed >= C.inputs.length) lever.disabled = false;
      return true;
    },
  }));
  lever.onclick = () => {
    lever.disabled = true; el.querySelector('.pw-fill').style.width = '100%';
    el.querySelector('.pw-out').innerHTML = C.outputs.map(o => `<span class="pw-o">${esc(o)}</span>`).join('');
    setTimeout(equation, 1100);
  };
  const equation = () => {
    const box = el.querySelector('.pw-eq'); box.hidden = false;
    const blanks = [p1, p2], chips = shuffle([...C.outputs, ...C.inputs]);
    box.innerHTML = `<div class="pw-line">${esc(a)} + ${esc(b)} → <span class="pw-blank" data-i="0"></span> + <span class="pw-blank" data-i="1"></span> + ${esc(e)}</div>
      <div class="pw-chips">${chips.map(c => `<div class="sg-item pw-chip" data-n="${esc(c)}">${esc(c)}</div>`).join('')}</div>`;
    let got = 0;
    box.querySelectorAll('.pw-chip').forEach(ch => draggable(ch, {
      onDrop: under => {
        const s = under?.closest?.('.pw-blank'); if (!s || s.classList.contains('ok')) return false;
        if (!blanks.includes(ch.dataset.n) || box.querySelector(`.pw-blank.ok[data-n="${CSS.escape(ch.dataset.n)}"]`)) { api.wrong(); return false; }
        ch.style.transform = ''; ch.dataset.locked = 1; s.classList.add('ok'); s.dataset.n = ch.dataset.n; s.append(ch);
        api.good(); if (++got >= 2) api.success(); return true;
      },
    }));
  };
  return () => { };
}

// 노폐물 배출: 0 이산화탄소 받기, 1 폐 배출구로, 2 요소 받기, 3 콩팥으로
export const wasteStep = step => (el, api) => carry(el, api, [
  { item: '이산화탄소', from: '세포 발전소 배출구', to: '운반통', color: '#9aa7ad' },
  { item: '이산화탄소', from: '운반통', to: '폐 배출구 (날숨)', color: '#9aa7ad' },
  { item: '요소', from: '혈액', to: '운반통', color: '#f2e38a' },
  { item: '요소', from: '운반통', to: '콩팥', color: '#f2e38a' },
][step]);
