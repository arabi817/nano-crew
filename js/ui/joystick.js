// 왼쪽 아래 가상 조이스틱. 손가락을 댄 곳에 조이스틱이 생겨요.
export class Joystick {
  constructor(zone) {
    this.zone = zone; this.vec = { x: 0, y: 0 }; this.id = null; this.R = 62;
    zone.innerHTML = '<div class="joy-base"><div class="joy-knob"></div></div>';
    this.base = zone.querySelector('.joy-base'); this.knob = zone.querySelector('.joy-knob');
    zone.addEventListener('pointerdown', e => {
      if (this.id !== null) return;
      e.preventDefault();
      this.id = e.pointerId; zone.setPointerCapture(e.pointerId);
      const r = zone.getBoundingClientRect();
      this.cx = e.clientX; this.cy = e.clientY;
      this.base.style.left = (e.clientX - r.left) + 'px'; this.base.style.top = (e.clientY - r.top) + 'px';
      this.base.classList.add('active'); this.move(e);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === this.id) this.move(e); });
    const end = e => {
      if (e.pointerId !== this.id) return;
      this.id = null; this.vec = { x: 0, y: 0 };
      this.knob.style.transform = ''; this.base.classList.remove('active');
      this.base.style.left = ''; this.base.style.top = '';
    };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  }
  move(e) {
    let dx = e.clientX - this.cx, dy = e.clientY - this.cy;
    const d = Math.hypot(dx, dy), k = d > this.R ? this.R / d : 1;
    dx *= k; dy *= k;
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // 조금만 밀어도(8px 넘으면) 최고 속도 — 방향만 따라요 (살살 미는 학생이 느려지지 않게, 선생님 결정 2026-11-24)
    const m = Math.hypot(dx, dy) || 1;
    this.vec = d < 8 ? { x: 0, y: 0 } : { x: dx / m, y: dy / m };
  }
  reset() { this.vec = { x: 0, y: 0 }; }
}
