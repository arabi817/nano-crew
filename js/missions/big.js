// 넓은 맵에만 있는 짧은 미션 3개: 이자액 보내기(이자실), 쓸개즙 보내기(간실), 에너지 쓰기(근육실)
import { draggable, shuffle, esc } from './kit.js';
import { hasArt, artUrl } from '../common/assets.js';

const img = (path, cls) => hasArt(path) ? `<img class="${cls}" src="${artUrl(path)}" alt="" draggable="false">` : '';

// 카드 고르기: 맞는 카드만 상자(병·통)에 끌어 넣어요. 틀린 카드는 왜 아닌지 한 줄로 알려 줘요.
// 맞는 카드를 다 넣으면 then()
function pickInto(el, api, C, { art, then }) {
  el.innerHTML = `<div class="bp">
    <div class="bp-cards">${shuffle(C.cards).map(c => `<div class="sg-item bp-card" data-l="${esc(c.label)}">${esc(c.label)}</div>`).join('')}</div>
    <div class="bp-box">${img(art, 'bp-art')}<div class="sg-h">${esc(C.box)}</div><div class="bp-in"></div></div>
    <div class="bp-msg"></div>
    <div class="bp-after"></div></div>`;
  const msg = el.querySelector('.bp-msg'), inBox = el.querySelector('.bp-in');
  const need = C.cards.filter(c => c.ok).length; let got = 0;
  el.querySelectorAll('.bp-card').forEach(n => {
    const card = C.cards.find(c => c.label === n.dataset.l);
    draggable(n, {
      onDrop: under => {
        if (!under?.closest?.('.bp-box')) return false;
        if (!card.ok) { api.wrong(); msg.className = 'bp-msg bad'; msg.textContent = card.why; return false; }
        n.style.transform = ''; n.dataset.locked = 1; n.classList.add('ok'); inBox.append(n); api.good();
        msg.className = 'bp-msg'; msg.textContent = '';
        if (++got >= need) then();
        return true;
      },
    });
  });
  return { msg, after: el.querySelector('.bp-after') };
}

// 끝 문장을 보여 주고 잠깐 뒤 완료
function finish(el, api, text, ms = 2600) {
  const d = el.querySelector('.bp-done') || el.querySelector('.bp').appendChild(Object.assign(document.createElement('div'), { className: 'bp-done' }));
  d.scrollIntoView?.({ block: 'nearest' });
  d.textContent = text;
  const t = setTimeout(() => api.success(), ms);
  return () => clearTimeout(t);
}

// ── 이자실: 이자액 보내기 ──
export function pancreasSend(el, api, C) {
  let stop = null;
  const ui = pickInto(el, api, C, {
    art: 'devices/juicetank.png',
    then: () => {
      el.querySelectorAll('.bp-card:not(.ok)').forEach(n => { n.dataset.locked = 1; n.classList.add('off'); });
      ui.after.innerHTML = `<div class="bp-send">${img('ui/smallint.png', 'bp-dst')}<button class="og-btn press bp-go">${esc(C.send)}</button></div>`;
      ui.after.querySelector('.bp-go').onclick = e => {
        e.target.disabled = true; api.good();
        el.querySelector('.bp-box').classList.add('bp-flow');
        stop = finish(el, api, C.done);
      };
    },
  });
  return () => stop?.();
}

// ── 간실: 쓸개즙 보내기 (순서 누르기 → OX) ──
export function bileSend(el, api, C) {
  el.innerHTML = `<div class="bp">
    <div class="og-track bl-track">${C.order.map(([, role], i) => `<span class="og-slot bl-slot" data-i="${i}"><b>${i + 1}</b><small>${esc(role)}</small></span>`).join('<i class="og-arrow"></i>')}</div>
    <div class="og-btns">${shuffle(C.order.map(o => o[0])).map(v => `<button class="og-btn press bl-btn" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>
    <div class="bp-after"></div></div>`;
  let i = 0, stop = null;
  const reset = () => {
    i = 0; el.querySelectorAll('.bl-btn').forEach(b => { b.disabled = false; b.classList.remove('ok'); });
    el.querySelectorAll('.bl-slot').forEach((s, k) => { s.querySelector('b').textContent = k + 1; s.classList.remove('ok'); });
  };
  el.querySelectorAll('.bl-btn').forEach(b => b.onclick = () => {
    if (b.dataset.v !== C.order[i][0]) { api.wrong(); reset(); return; }
    b.disabled = true; b.classList.add('ok');
    const s = el.querySelector(`.bl-slot[data-i="${i}"]`); s.querySelector('b').textContent = C.order[i][0]; s.classList.add('ok');
    api.good();
    if (++i >= C.order.length) ox();
  });
  const ox = () => {
    const box = el.querySelector('.bp-after');
    box.innerHTML = `<div class="bl-ox"><div class="bl-q">${esc(C.ox.q)}</div>
      <div class="bl-ab"><button class="bl-o press" data-a="O">O</button><button class="bl-x press" data-a="X">X</button></div>
      <div class="bp-msg"></div></div>`;
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      if (b.dataset.a !== C.ox.a) { api.wrong(); box.querySelector('.bp-msg').className = 'bp-msg bad'; box.querySelector('.bp-msg').textContent = '다시 생각해 보세요.'; return; }
      box.querySelectorAll('[data-a]').forEach(x => x.disabled = true); b.classList.add('ok'); api.good();
      box.querySelector('.bp-msg').textContent = '';
      stop = finish(el, api, C.done, 3600);   // 설명이 길어서 조금 더 오래
    });
  };
  return () => stop?.();
}

// ── 근육실: 에너지 쓰기 ──
export function energyUse(el, api, C) {
  let stop = null;
  pickInto(el, api, C, {
    art: 'devices/energymeter.png',
    then: () => {
      el.querySelectorAll('.bp-card:not(.ok)').forEach(n => { n.dataset.locked = 1; n.classList.add('off'); });
      el.querySelector('.bp-box').classList.add('bp-glow');
      stop = finish(el, api, C.done);
    },
  });
  return () => stop?.();
}
