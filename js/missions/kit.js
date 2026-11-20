// 미션 조작 도구 모음: 끌어 놓기, 칸에 분류하기, 선 잇기, 순서대로 누르기
import { shuffle, esc } from '../common/util.js';

export { shuffle, esc };
export const pick = (arr, n) => shuffle(arr).slice(0, n);

// 손가락으로 끌기. 놓았을 때 onDrop(아래 요소, 이벤트)이 true면 그대로, 아니면 제자리로.
export function draggable(node, { onDrop, onMove } = {}) {
  let sx = 0, sy = 0, id = null;
  node.style.touchAction = 'none';
  node.addEventListener('pointerdown', e => {
    if (node.dataset.locked || id !== null) return;
    e.preventDefault(); id = e.pointerId; node.setPointerCapture(id);
    sx = e.clientX; sy = e.clientY; node.classList.add('dragging');
  });
  node.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    node.style.transform = `translate(${e.clientX - sx}px, ${e.clientY - sy}px)`;
    onMove?.(e);
  });
  const up = e => {
    if (e.pointerId !== id) return;
    id = null; node.classList.remove('dragging');
    node.style.visibility = 'hidden';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    node.style.visibility = '';
    if (!onDrop?.(under, e)) { node.classList.add('snapback'); node.style.transform = ''; setTimeout(() => node.classList.remove('snapback'), 220); }
  };
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', up);
}

// 칸에 분류하기. items: [{label, ok:[칸 이름...]}]  ok가 비어 있으면 '그대로 두기'(옮기면 틀림)
export function sortGame(el, api, { items, bins, tray = '물질', note = '', cls = '' }) {
  el.innerHTML = `<div class="sg ${cls}">
    <div class="sg-tray"><div class="sg-h">${esc(tray)}</div><div class="sg-items"></div>${note ? `<div class="sg-note">${esc(note)}</div>` : ''}</div>
    <div class="sg-bins">${bins.map(b => `<div class="sg-bin" data-bin="${esc(b.name)}"><div class="sg-bin-h">${b.html || esc(b.name)}</div><div class="sg-bin-in"></div></div>`).join('')}</div></div>`;
  const wrap = el.querySelector('.sg-items');
  const need = items.filter(i => i.ok.length).length; let got = 0;
  for (const it of shuffle(items)) {
    const n = document.createElement('div');
    n.className = 'sg-item'; n.innerHTML = esc(it.label); wrap.append(n);
    draggable(n, {
      onDrop: under => {
        const bin = under?.closest?.('.sg-bin'); if (!bin || !el.contains(bin)) return false;
        if (it.ok.includes(bin.dataset.bin)) {
          n.style.transform = ''; n.dataset.locked = 1; n.classList.add('ok');
          bin.querySelector('.sg-bin-in').append(n); api.good();
          if (++got >= need) api.success();
          return true;
        }
        api.wrong(); return false;
      },
    });
  }
  return () => { };
}

// 두 구역 사이 옮기기. items: [{label, from:'A', to:'B'}]  (from === to 이면 그대로 두기)
export function zoneSwap(el, api, { zones, items, cls = '' }) {
  el.innerHTML = `<div class="zs ${cls}">${zones.map(z => `<div class="zs-zone" data-z="${esc(z.name)}"><div class="zs-h">${esc(z.name)}${z.sub ? `<small>${esc(z.sub)}</small>` : ''}</div><div class="zs-in"></div></div>`).join('<div class="zs-wall"></div>')}</div>`;
  const zoneEl = name => el.querySelector(`.zs-zone[data-z="${CSS.escape(name)}"] .zs-in`);
  const need = items.filter(i => i.from !== i.to).length; let got = 0;
  for (const it of shuffle(items)) {
    const n = document.createElement('div'); n.className = 'sg-item'; n.innerHTML = esc(it.label);
    zoneEl(it.from).append(n);
    let at = it.from;
    draggable(n, {
      onDrop: under => {
        const z = under?.closest?.('.zs-zone'); if (!z || !el.contains(z)) return false;
        const dest = z.dataset.z; if (dest === at) return false;
        if (dest === it.to && it.from !== it.to) {
          at = dest; n.style.transform = ''; n.dataset.locked = 1; n.classList.add('ok'); zoneEl(dest).append(n);
          api.good(); if (++got >= need) api.success(); return true;
        }
        api.wrong(); return false;
      },
    });
  }
  return () => { };
}

// 여러 줄 선 잇기. cols: 칸 제목들, chains: 올바른 줄들 [[a,b,c],...], extra: 헷갈리게 하는 줄들
// 이웃한 칸끼리 같은 줄(chain)에 속한 것만 이을 수 있어요.
const WIRE = ['#e5484d', '#3b8bea', '#ffcc33', '#3fbf5f', '#f27bb3'];
export function wireGame(el, api, { cols, chains, extra = [] }) {
  const all = [...chains, ...extra];
  const colors = shuffle(WIRE);
  const chainOf = {}; // "열:글자" → 올바른 줄 번호
  chains.forEach((c, ci) => c.forEach((v, k) => { chainOf[`${k}:${v}`] = ci; }));
  const colNodes = cols.map((_, k) => shuffle([...new Set(all.map(c => c[k]))]));
  el.innerHTML = `<div class="wg" style="--cols:${cols.length}"><svg class="wg-svg"></svg>
    ${cols.map((t, k) => `<div class="wg-col"><div class="wg-title">${esc(t)}</div>${colNodes[k].map(v => `<div class="wg-node" data-k="${k}" data-v="${esc(v)}"><span class="wg-dot l"></span><span class="wg-label">${esc(v)}</span><span class="wg-dot r"></span></div>`).join('')}</div>`).join('')}</div>`;
  const root = el.querySelector('.wg'), svg = root.querySelector('.wg-svg');
  const need = chains.reduce((s, c) => s + c.length - 1, 0);
  const links = []; let drag = null;
  const rel = (cx, cy) => { const b = root.getBoundingClientRect(); return { x: cx - b.left, y: cy - b.top }; };
  const ctr = e => { const a = e.getBoundingClientRect(); return rel(a.left + a.width / 2, a.top + a.height / 2); };
  const d = (p, q) => { const mx = (p.x + q.x) / 2; return `M${p.x} ${p.y} C${mx} ${p.y} ${mx} ${q.y} ${q.x} ${q.y}`; };
  const wire = (p, q, c) => `<path d="${d(p, q)}" stroke="#1a1018" stroke-width="18" fill="none" stroke-linecap="round"/><path d="${d(p, q)}" stroke="${c}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
  const draw = () => {
    svg.innerHTML = links.map(l => wire(ctr(l.a), ctr(l.b), l.c)).join('') + (drag ? wire(ctr(drag.dot), drag.q, '#ffffff') : '');
  };
  const linked = (node, side) => node.dataset[side] === '1';
  root.querySelectorAll('.wg-node').forEach(node => {
    const k = +node.dataset.k;
    if (k === cols.length - 1) node.querySelector('.wg-dot.r').remove();
    if (k === 0) node.querySelector('.wg-dot.l').remove();
    const start = node.querySelector('.wg-dot.r'); if (!start) return;
    node.addEventListener('pointerdown', e => {
      if (linked(node, 'out') || drag) return;
      e.preventDefault(); node.setPointerCapture(e.pointerId);
      drag = { node, dot: start, q: rel(e.clientX, e.clientY) }; draw();
    });
    node.addEventListener('pointermove', e => { if (drag?.node !== node) return; drag.q = rel(e.clientX, e.clientY); draw(); });
    const up = e => {
      if (drag?.node !== node) return;
      drag = null;
      const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('.wg-node');
      if (t && root.contains(t) && +t.dataset.k === k + 1 && !linked(t, 'in')) {
        const a = chainOf[`${k}:${node.dataset.v}`], b = chainOf[`${k + 1}:${t.dataset.v}`];
        if (a !== undefined && a === b) {
          node.dataset.out = '1'; t.dataset.in = '1'; node.classList.add('ok'); t.classList.add('ok');
          links.push({ a: start, b: t.querySelector('.wg-dot.l'), c: colors[a % colors.length] });
          api.good(); if (links.length >= need) api.success();
        } else api.wrong();
      }
      draw();
    };
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', () => { if (drag?.node === node) { drag = null; draw(); } });
  });
  const ro = new ResizeObserver(draw); ro.observe(root);
  return () => ro.disconnect();
}

// 순서대로 누르기. order: 올바른 순서. 틀리면 처음부터.
export function orderGame(el, api, { order, title = '', cls = '' }) {
  el.innerHTML = `<div class="og ${cls}">${title ? `<div class="og-title">${esc(title)}</div>` : ''}
    <div class="og-track">${order.map((_, i) => `<span class="og-slot" data-i="${i}">${i + 1}</span>`).join('<i class="og-arrow"></i>')}</div>
    <div class="og-btns">${shuffle(order).map(v => `<button class="og-btn press" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div></div>`;
  let i = 0;
  const reset = () => {
    i = 0; el.querySelectorAll('.og-btn').forEach(b => { b.disabled = false; b.classList.remove('ok'); });
    el.querySelectorAll('.og-slot').forEach((s, k) => { s.textContent = k + 1; s.classList.remove('ok'); });
  };
  el.querySelectorAll('.og-btn').forEach(b => b.onclick = () => {
    if (b.dataset.v === order[i]) {
      b.disabled = true; b.classList.add('ok');
      const s = el.querySelector(`.og-slot[data-i="${i}"]`); s.textContent = order[i]; s.classList.add('ok');
      i++; api.good(); if (i >= order.length) api.success();
    } else { api.wrong(); reset(); }
  });
  return () => { };
}
