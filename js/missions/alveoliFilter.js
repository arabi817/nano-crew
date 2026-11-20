// 폐포 필터: 기체 입자를 손가락으로 밀어 폐포 ↔ 모세혈관으로 옮겨요.
// 이미 제자리에 있는 입자를 건드리면 틀림 → 그냥 다 옮기면 안 되게 함.
import { rint } from '../common/util.js';

// 글자를 한 덩어리(span)로 묶어 입자 정중앙에 한 줄로, 2는 아래첨자로 붙여요
const LABEL = { O2: '<span class="af-lb">O<sub>2</sub></span>', CO2: '<span class="af-lb">CO<sub>2</sub></span>' };
const MID = 0.5, TOP_MAX = 0.42, BOT_MIN = 0.6;

export function mount(el, api, C) {
  el.innerHTML = `<div class="af">
    <div class="af-top"><span class="af-tag">${C.topName}</span></div>
    <div class="af-bot"><span class="af-tag">${C.bottomName}</span>
      <i class="rbc" style="--d:0s;--y:30%"></i><i class="rbc" style="--d:-3s;--y:62%"></i><i class="rbc" style="--d:-6s;--y:45%"></i></div>
    <svg class="af-mem" viewBox="0 0 200 20" preserveAspectRatio="none">
      <path d="M0 10 Q10 2 20 10 T40 10 T60 10 T80 10 T100 10 T120 10 T140 10 T160 10 T180 10 T200 10" fill="none" stroke="#1a1018" stroke-width="7"/>
      <path d="M0 10 Q10 2 20 10 T40 10 T60 10 T80 10 T100 10 T120 10 T140 10 T160 10 T180 10 T200 10" fill="none" stroke="#f2a6b8" stroke-width="3.5"/>
    </svg>
    <div class="af-parts"></div></div>`;
  const root = el.querySelector('.af'), layer = root.querySelector('.af-parts');
  const parts = [];
  const placeIn = zone => {
    for (let k = 0; k < 30; k++) {
      const bx = 0.08 + Math.random() * 0.84, by = zone === 'top' ? 0.1 + Math.random() * 0.28 : 0.64 + Math.random() * 0.28;
      if (parts.every(p => Math.hypot((p.bx - bx) * 1.6, p.by - by) > 0.14)) return { bx, by };
    }
    return { bx: 0.1 + Math.random() * 0.8, by: zone === 'top' ? 0.25 : 0.78 };
  };
  const add = (type, zone, mover) => {
    const p = { type, zone, mover, done: false, ph: Math.random() * 6.28, ...placeIn(zone), el: document.createElement('div') };
    p.el.className = 'af-p ' + type.toLowerCase(); p.el.innerHTML = LABEL[type] || type;
    layer.append(p.el); parts.push(p);
  };
  for (let i = rint(...C.move); i > 0; i--) add(C.toBottom, 'top', true);
  for (let i = rint(...C.move); i > 0; i--) add(C.toTop, 'bot', true);
  for (let i = rint(...C.stay); i > 0; i--) add(C.toTop, 'top', false);
  for (let i = rint(...C.stay); i > 0; i--) add(C.toBottom, 'bot', false);

  let W = 1, H = 1; const ro = new ResizeObserver(() => { W = root.clientWidth; H = root.clientHeight; }); ro.observe(root);
  let raf = 0, drag = null;
  const loop = t => {
    const s = t / 1000;
    for (const p of parts) {
      const x = p === drag?.p ? p.bx : p.bx + Math.sin(s * 1.1 + p.ph) * 0.012;
      const y = p === drag?.p ? p.by : p.by + Math.cos(s * 0.9 + p.ph) * 0.016;
      p.el.style.transform = `translate(${x * W}px, ${y * H}px) translate(-50%, -50%)`;
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const frac = e => { const b = root.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height }; };
  parts.forEach(p => {
    p.el.addEventListener('pointerdown', e => {
      if (p.done || drag) return;
      e.preventDefault(); p.el.setPointerCapture(e.pointerId);
      drag = { p, sx: p.bx, sy: p.by }; p.el.classList.add('grab');
    });
    p.el.addEventListener('pointermove', e => {
      if (drag?.p !== p) return;
      const f = frac(e); p.bx = Math.min(0.95, Math.max(0.05, f.x)); p.by = Math.min(0.95, Math.max(0.05, f.y));
    });
    const up = () => {
      if (drag?.p !== p) return;
      const { sx, sy } = drag; drag = null; p.el.classList.remove('grab');
      const zone = p.by < MID ? 'top' : 'bot';
      if (zone !== p.zone) {
        if (p.mover && !p.done) {
          p.zone = zone; p.done = true; p.el.classList.add('moved'); api.good();
          if (parts.filter(q => q.mover).every(q => q.done)) api.success();
        } else { api.wrong(); p.bx = sx; p.by = sy; }
      }
      p.by = p.zone === 'top' ? Math.min(p.by, TOP_MAX) : Math.max(p.by, BOT_MIN);
    };
    p.el.addEventListener('pointerup', up); p.el.addEventListener('pointercancel', up);
  });
  return () => { cancelAnimationFrame(raf); ro.disconnect(); };
}
