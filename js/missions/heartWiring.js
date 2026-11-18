// 심장 배선: 왼쪽(심장의 방) 플러그를 끌어 오른쪽(혈관) 소켓에 꽂아요. 판마다 순서와 선 색이 바뀜.
import { shuffle, esc } from '../common/util.js';

const WIRE = ['#e5484d', '#3b8bea', '#ffcc33', '#3fbf5f'];

export function mount(el, api, C) {
  const left = shuffle(C.pairs.map(p => p[0])), right = shuffle(C.pairs.map(p => p[1]));
  const ans = Object.fromEntries(C.pairs), cols = shuffle(WIRE);
  el.innerHTML = `<div class="hw">
    <svg class="hw-svg"></svg>
    <div class="hw-col"><div class="hw-title">${esc(C.leftTitle)}</div>
      ${left.map((n, i) => `<div class="hw-node L" data-n="${esc(n)}"><span class="hw-label">${esc(n)}</span><span class="hw-plug" style="--wc:${cols[i]}"></span></div>`).join('')}</div>
    <div></div>
    <div class="hw-col"><div class="hw-title">${esc(C.rightTitle)}</div>
      ${right.map(n => `<div class="hw-node R" data-n="${esc(n)}"><span class="hw-sock"></span><span class="hw-label">${esc(n)}</span></div>`).join('')}</div>
  </div>`;
  const root = el.querySelector('.hw'), svg = root.querySelector('.hw-svg');
  const links = []; let drag = null;
  const rel = (cx, cy) => { const b = root.getBoundingClientRect(); return { x: cx - b.left, y: cy - b.top }; };
  const center = e => { const a = e.getBoundingClientRect(); return rel(a.left + a.width / 2, a.top + a.height / 2); };
  const d = (p, q) => { const mx = (p.x + q.x) / 2; return `M${p.x} ${p.y} C${mx} ${p.y} ${mx} ${q.y} ${q.x} ${q.y}`; };
  const wire = (p, q, c) => `<path d="${d(p, q)}" stroke="#1a1018" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="${d(p, q)}" stroke="${c}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  function draw() {
    let s = '';
    for (const l of links) s += wire(center(l.plug), center(l.sock), l.color);
    if (drag) s += wire(center(drag.plug), drag.q, drag.color);
    svg.innerHTML = s;
  }
  root.querySelectorAll('.hw-node.L').forEach((node, i) => {
    const plug = node.querySelector('.hw-plug'), color = cols[i];
    node.addEventListener('pointerdown', e => {
      if (node.classList.contains('ok') || drag) return;
      e.preventDefault(); node.setPointerCapture(e.pointerId);
      drag = { node, plug, color, q: rel(e.clientX, e.clientY) }; node.classList.add('grab'); draw();
    });
    node.addEventListener('pointermove', e => { if (drag?.node !== node) return; drag.q = rel(e.clientX, e.clientY); draw(); });
    const up = e => {
      if (drag?.node !== node) return;
      const dd = drag; drag = null; node.classList.remove('grab');
      const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('.hw-node.R');
      if (t && !t.classList.contains('ok')) {
        if (ans[dd.node.dataset.n] === t.dataset.n) {
          node.classList.add('ok'); t.classList.add('ok'); t.style.setProperty('--wc', dd.color);
          links.push({ plug: dd.plug, sock: t.querySelector('.hw-sock'), color: dd.color });
          api.good();
          if (links.length === C.pairs.length) api.success();
        } else api.wrong();
      }
      draw();
    };
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', () => { if (drag?.node === node) { drag = null; node.classList.remove('grab'); draw(); } });
  });
  const ro = new ResizeObserver(draw); ro.observe(root);
  return () => ro.disconnect();
}
