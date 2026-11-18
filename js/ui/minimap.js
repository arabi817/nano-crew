// 미니맵: 방 배치, 내 위치, 남은 미션 위치만 보여 줘요 (다른 친구 위치는 안 보임)
import { ROOMS, HALLS, SPOTS, SAB_SPOTS, VENTS } from '../map/map.js';
import { ICON } from './icons.js';

const MAP = { x: 100, y: 100, w: 3700, h: 2420 }; // 대기실 제외한 본 맵 범위

export function openMinimap(app) {
  const ov = document.createElement('div');
  ov.className = 'mpanel-ov';
  ov.innerHTML = `<div class="minimap metal"><div class="mpanel-head"><div class="mpanel-title">몸속 지도</div>
    <button class="mpanel-x press" aria-label="닫기">${ICON.close}</button></div><canvas></canvas></div>`;
  document.body.appendChild(ov);
  const cv = ov.querySelector('canvas'), ctx = cv.getContext('2d');
  let raf = 0, closed = false;
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  function draw(t) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const s = Math.min(W / MAP.w, H / MAP.h), ox = (W - MAP.w * s) / 2 - MAP.x * s, oy = (H - MAP.h * s) / 2 - MAP.y * s;
    const X = x => ox + x * s, Y = y => oy + y * s;
    ctx.fillStyle = '#1a1018';
    [...ROOMS, ...HALLS].filter(a => !a.lobby).forEach(a => ctx.fillRect(X(a.x) - 5, Y(a.y) - 5, a.w * s + 10, a.h * s + 10));
    HALLS.forEach(h => { ctx.fillStyle = '#6b5a69'; ctx.fillRect(X(h.x), Y(h.y), h.w * s, h.h * s); });
    ROOMS.filter(r => !r.lobby).forEach(r => {
      ctx.fillStyle = hex(r.floor); ctx.fillRect(X(r.x), Y(r.y), r.w * s, r.h * s);
      ctx.font = `${Math.max(12, 44 * s)}px Jua`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = '#1a1018'; ctx.fillStyle = '#fff';
      const name = r.name.replace(/ \(.*\)/, '');
      ctx.strokeText(name, X(r.x + r.w / 2), Y(r.y + r.h / 2)); ctx.fillText(name, X(r.x + r.w / 2), Y(r.y + r.h / 2));
    });
    const blink = 0.5 + 0.5 * Math.sin(t / 200);
    if (app.priv?.role !== 'imp') app.tasks.filter(k => !k.done).forEach(k => {
      const sp = SPOTS[k.spot]; if (!sp) return;
      ctx.fillStyle = `rgba(255,225,77,${0.4 + 0.6 * blink})`; ctx.strokeStyle = '#1a1018'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.rect(X(sp.x) - 9, Y(sp.y) - 9, 18, 18); ctx.fill(); ctx.stroke();
    });
    const sab = app.game?.sab;
    if (sab) Object.values(SAB_SPOTS).filter(s => s.kind === sab.kind).forEach(sp => {
      ctx.fillStyle = `rgba(255,60,60,${0.3 + 0.7 * blink})`; ctx.strokeStyle = '#1a1018'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(X(sp.x), Y(sp.y), 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    if (app.priv?.role === 'imp') Object.values(VENTS).forEach(v => {
      ctx.fillStyle = '#7a2b38'; ctx.strokeStyle = '#1a1018'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(X(v.x), Y(v.y), 9, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    const sc = app.scene;
    if (sc?.ready && app.phase === 'playing') {
      ctx.fillStyle = app.myColor; ctx.strokeStyle = '#1a1018'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(X(sc.x), Y(sc.y), 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (!closed) raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  const close = () => { closed = true; cancelAnimationFrame(raf); ov.remove(); app.minimap = null; };
  ov.querySelector('.mpanel-x').onclick = close;
  ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
  app.minimap = { close };
}
