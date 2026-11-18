// 맵 그림. assets/list.js에 그림 파일이 있으면 그 그림을, 없으면 코드로 그린 그림을 써요. (칸 설명은 assets/ASSETS.md)
import { ROOMS, HALLS, TABLE, TASK_SPOTS, SAB_SPOTS, VENTS, doorsOf } from './map.js';
import { hasArt, useArt } from '../common/assets.js';

const INK = 0x1a1018;

const gfx = (scene, d = -800) => scene.add.graphics().setDepth(d);

function blob(cx, cy, rx, ry, rot = 0, wob = 0, ph = 0, n = 44) {
  const pts = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, k = 1 + wob * Math.sin(a * 3 + ph);
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    pts.push({ x: cx + x * c - y * s, y: cy + x * s + y * c });
  }
  return pts;
}
function inkFill(g, pts, color, lw = 6) {
  g.fillStyle(color, 1); g.fillPoints(pts, true);
  if (lw) { g.lineStyle(lw, INK, 1); g.strokePoints(pts, true, true); }
}
function tube(g, pts, w, color) { // 둥근 관 (외곽선 포함)
  for (const [lw, col] of [[w + 10, INK], [w, color]]) {
    g.lineStyle(lw, col, 1); g.strokePoints(pts, false, false);
    g.fillStyle(col, 1); pts.forEach(p => g.fillCircle(p.x, p.y, lw / 2));
  }
}
const pt = (x, y) => ({ x, y });

// 그림 파일 한 장 놓기: (x, y) = 그림 가운데, w×h = 화면 크기. into(컨테이너)를 주면 그 안에 넣어요.
// 그림이 목록에 없으면 false → 코드 그림을 그려요.
function art(scene, path, x, y, w, h, { depth = -800, rot = 0, flip = false, into = null, onImage } = {}) {
  return useArt(scene, path, key => {
    const im = scene.add.image(x, y, key).setDisplaySize(w, h).setRotation(rot).setFlipX(flip);
    if (into) into.add(im); else im.setDepth(depth);
    onImage?.(im);
  });
}

export function drawMap(scene) {
  const anims = [];
  const base = gfx(scene, -1000);
  const areas = [...ROOMS, ...HALLS];
  base.fillStyle(INK, 1); areas.forEach(a => base.fillRoundedRect(a.x - 36, a.y - 36, a.w + 72, a.h + 72, 22));
  base.fillStyle(0x4a3346, 1); areas.forEach(a => base.fillRoundedRect(a.x - 28, a.y - 28, a.w + 56, a.h + 56, 16));
  base.fillStyle(0x634660, 1); areas.forEach(a => base.fillRect(a.x - 10, a.y - 10, a.w + 20, a.h + 20));
  HALLS.forEach(h => {
    base.fillStyle(0x6b5a69, 1); base.fillRect(h.x, h.y, h.w, h.h);
    base.fillStyle(0xe8c860, 0.35);
    if (h.w > h.h) for (let x = h.x + 10; x < h.x + h.w - 20; x += 60) base.fillRect(x, h.y + h.h / 2 - 4, 30, 8);
    else for (let y = h.y + 10; y < h.y + h.h - 20; y += 60) base.fillRect(h.x + h.w / 2 - 4, y, 8, 30);
  });
  ROOMS.forEach(r => {
    base.fillStyle(r.floor, 1); base.fillRect(r.x, r.y, r.w, r.h);
    useArt(scene, `rooms/${r.id}.jpg`, key => scene.add.image(r.x, r.y, key).setOrigin(0).setDisplaySize(r.w, r.h).setDepth(-999));
    base.lineStyle(2, 0x000000, 0.07);
    for (let x = r.x + 80; x < r.x + r.w; x += 80) base.lineBetween(x, r.y, x, r.y + r.h);
    for (let y = r.y + 80; y < r.y + r.h; y += 80) base.lineBetween(r.x, y, r.x + r.w, y);
    PROPS[r.id]?.(scene, r, anims);
    scene.add.text(r.x + r.w / 2, r.y + 22, r.name, {
      fontFamily: 'Jua', fontSize: '34px', color: '#ffffff', stroke: '#1a1018', strokeThickness: 7,
    }).setOrigin(0.5, 0).setAlpha(0.7).setDepth(-700).setResolution(2);
  });

  // 미션 장치
  const spots = {};
  for (const [id, s] of Object.entries(TASK_SPOTS)) {
    if (!art(scene, 'devices/task.png', s.x, s.y, 100, 76, { depth: -600 })) {
      const g = gfx(scene, -600);
      g.fillStyle(INK, 1); g.fillRoundedRect(s.x - 50, s.y - 38, 100, 76, 12);
      g.fillStyle(0x56656e, 1); g.fillRoundedRect(s.x - 44, s.y - 32, 88, 64, 9);
      g.fillStyle(0x9fe3c0, 1); g.fillRoundedRect(s.x - 34, s.y - 24, 68, 34, 6);
      g.fillStyle(0xffcc33, 1); g.fillCircle(s.x - 20, s.y + 20, 6); g.fillStyle(0xe5484d, 1); g.fillCircle(s.x, s.y + 20, 6);
    }
    const hl = gfx(scene, -590);
    hl.lineStyle(7, 0xffe14d, 1); hl.strokeRoundedRect(s.x - 58, s.y - 46, 116, 92, 16);
    const tw = scene.tweens.add({ targets: hl, alpha: { from: 1, to: 0.25 }, duration: 600, yoyo: true, repeat: -1 });
    spots[id] = { setPending(on) { hl.setVisible(on); tw[on ? 'resume' : 'pause'](); } };
  }

  // 혈관 통로 (벤트): 둥근 철망 뚜껑
  for (const v of Object.values(VENTS)) {
    if (art(scene, 'devices/vent.png', v.x, v.y, 92, 58, { depth: -620 })) continue;
    const g = gfx(scene, -620);
    g.fillStyle(INK, 1); g.fillEllipse(v.x, v.y, 92, 58);
    g.fillStyle(0x7a2b38, 1); g.fillEllipse(v.x, v.y, 80, 46);
    g.lineStyle(6, INK, 1);
    for (let i = -2; i <= 2; i++) g.lineBetween(v.x + i * 14, v.y - 18 + Math.abs(i) * 3, v.x + i * 14, v.y + 18 - Math.abs(i) * 3);
  }
  // 사보타주 해결 장치
  const sabSpots = {};
  for (const [id, s] of Object.entries(SAB_SPOTS)) {
    if (!art(scene, `devices/sab_${s.kind}.png`, s.x, s.y, 88, 80, { depth: -610 })) {
      const g = gfx(scene, -610);
      g.fillStyle(INK, 1); g.fillRoundedRect(s.x - 44, s.y - 40, 88, 80, 12);
      g.fillStyle(0x56656e, 1); g.fillRoundedRect(s.x - 38, s.y - 34, 76, 68, 9);
      if (s.kind === 'o2') { g.fillStyle(0xffffff, 1); g.fillCircle(s.x, s.y, 22); g.fillStyle(0x3b8bea, 1); g.fillCircle(s.x, s.y, 16); }
      else { g.fillStyle(0xd9877c, 1); g.fillRoundedRect(s.x - 26, s.y - 22, 52, 44, 8); }
    }
    const hl = gfx(scene, -600);
    hl.lineStyle(8, 0xff3b3b, 1); hl.strokeRoundedRect(s.x - 54, s.y - 50, 108, 100, 16); hl.setVisible(false);
    const tw = scene.tweens.add({ targets: hl, alpha: { from: 1, to: 0.2 }, duration: 350, yoyo: true, repeat: -1 });
    sabSpots[id] = { setOn(on) { hl.setVisible(on); } };
  }
  // 혈관 막힘: 문에 혈전 덩어리
  const clotG = gfx(scene, -500), clotIms = [], clotArt = hasArt('devices/clot.png');
  const setClot = roomId => {
    clotG.clear(); clotIms.splice(0).forEach(im => im.destroy()); if (!roomId) return;
    for (const d of doorsOf(roomId)) {
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2, horiz = d.w < d.h;
      for (let i = -2; i <= 2; i++) {
        const x = horiz ? cx : cx + i * d.w / 5, y = horiz ? cy + i * d.h / 5 : cy;
        if (clotArt) { art(scene, 'devices/clot.png', x, y, 62, 62, { depth: -500, rot: i * 1.1, onImage: im => roomId === clotRoom ? clotIms.push(im) : im.destroy() }); continue; }
        clotG.fillStyle(INK, 1); clotG.fillCircle(x, y, 30); clotG.fillStyle(0x8e1f2c, 1); clotG.fillCircle(x, y, 24);
        clotG.fillStyle(0xc0394a, 1); clotG.fillCircle(x - 6, y - 6, 9);
      }
    }
  };
  let clotRoom = null;
  const setClotRoom = roomId => { clotRoom = roomId; setClot(roomId); };

  const cam = scene.cameras.main;
  scene.events.on('update', time => {
    const v = cam.worldView, t = time / 1000;
    for (const a of anims) {
      const r = a.r;
      if (r.x > v.right + 60 || r.x + r.w < v.x - 60 || r.y > v.bottom + 60 || r.y + r.h < v.y - 60) continue;
      a.fn(t);
    }
  });
  return { spots, sabSpots, setClot: setClotRoom };
}

// ───── 방마다 소품 ─────
const PROPS = {
  meeting(scene, r) {
    const g = gfx(scene), { x, y } = TABLE;
    g.lineStyle(12, 0x7a8e95, 1); g.strokeCircle(x, y, 300);
    if (art(scene, 'props/table.png', x, y + 6, 360, 360)) return;
    g.fillStyle(INK, 1); g.fillCircle(x, y + 12, TABLE.r + 8);
    g.fillStyle(0x4f6169, 1); g.fillCircle(x, y, TABLE.r);
    g.lineStyle(8, INK, 1); g.strokeCircle(x, y, TABLE.r);
    g.fillStyle(0x627882, 1); g.fillCircle(x, y, TABLE.r - 32);
    g.fillStyle(0x9aa7ad, 1); g.fillCircle(x, y, 42); g.lineStyle(5, INK, 1); g.strokeCircle(x, y, 42);
    g.fillStyle(0xe5484d, 1); g.fillCircle(x, y - 4, 27); g.strokeCircle(x, y - 4, 27);
    g.fillStyle(0xffffff, 0.7); g.fillEllipse(x - 9, y - 15, 14, 8);
  },
  power(scene, r) {
    const g = gfx(scene);
    [[r.x + 170, r.y + 150, 0.3], [r.x + 190, r.y + r.h - 110, -0.2], [r.x + r.w - 170, r.y + r.h - 120, 0.5]].forEach(([x, y, rot]) => {
      if (art(scene, 'props/mitochondria.png', x, y, 216, 124, { rot })) return;
      inkFill(g, blob(x, y, 100, 54, rot), 0x5cae4c);
      inkFill(g, blob(x, y, 82, 38, rot), 0xa6e08f, 0);
      const c = Math.cos(rot), s = Math.sin(rot), pts = [];
      for (let i = 0; i <= 24; i++) { const u = -70 + i * 140 / 24, v = Math.sin(i * 1.3) * 22; pts.push(pt(x + u * c - v * s, y + u * s + v * c)); }
      g.lineStyle(6, 0x3d8a37, 1); g.strokePoints(pts);
    });
    const mx = r.x + r.w - 260, my = r.y + 70;
    g.fillStyle(INK, 1); g.fillRoundedRect(mx - 6, my - 6, 192, 152, 16);
    g.fillStyle(0x56656e, 1); g.fillRoundedRect(mx, my, 180, 140, 12);
    g.fillStyle(0x2c3439, 1); g.fillCircle(mx + 90, my + 70, 44);
    const core = scene.add.circle(mx + 90, my + 70, 30, 0xffd84a).setDepth(-790).setStrokeStyle(5, INK);
    scene.tweens.add({ targets: core, scale: { from: 0.8, to: 1.08 }, alpha: { from: 0.7, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
  },
  digest(scene, r, anims) {
    const g = gfx(scene);
    const mx = r.x + 190, my = r.y + r.h / 2 + 40;
    if (!art(scene, 'props/mouth.png', mx, my, 216, 156)) {
    g.fillStyle(INK, 1); g.fillEllipse(mx, my, 210, 150);
    g.fillStyle(0x9c3b3b, 1); g.fillEllipse(mx, my, 196, 136);
    g.fillStyle(0xe0607a, 1); g.fillEllipse(mx, my + 30, 120, 50);
    g.fillStyle(0xffffff, 1); g.lineStyle(3, INK, 1);
    for (let i = 0; i < 5; i++) {
      const tx = mx - 70 + i * 30;
      g.fillRect(tx, my - 64, 22, 22); g.strokeRect(tx, my - 64, 22, 22);
      g.fillRect(tx, my + 42, 22, 22); g.strokeRect(tx, my + 42, 22, 22);
    }
    }
    const sx = r.x + r.w - 220, sy = r.y + r.h / 2 + 30, st = gfx(scene, -795), wall = gfx(scene, -790);
    // 위 그림이 있으면 꿈틀거림(크기 변화)만 주고, 없으면 코드로 출렁이는 위를 그려요
    const stomachArt = art(scene, 'props/stomach.png', sx, sy, 300, 230, { depth: -795, onImage: im =>
      scene.tweens.add({ targets: im, scaleX: im.scaleX * 1.05, scaleY: im.scaleY * 0.95, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }) });
    anims.push({
      r, fn: t => {
        st.clear();
        if (!stomachArt) {
          inkFill(st, blob(sx, sy, 135, 95, -0.5, 0.06, t * 2), 0xf08a6a);
          inkFill(st, blob(sx - 8, sy - 4, 92, 56, -0.5, 0.09, t * 2 + 1), 0xf7b08f, 0);
        }
        wall.clear();
        const top = [pt(r.x, r.y)];
        for (let x = r.x; x <= r.x + r.w; x += 20) top.push(pt(x, r.y + 30 + Math.sin(x * 0.03 + t * 3) * 10));
        top.push(pt(r.x + r.w, r.y));
        inkFill(wall, top, 0xf0905e, 5);
        const left = [pt(r.x, r.y)];
        for (let y = r.y; y <= r.y + r.h; y += 20) left.push(pt(r.x + 28 + Math.sin(y * 0.03 + t * 3) * 10, y));
        left.push(pt(r.x, r.y + r.h));
        inkFill(wall, left, 0xf0905e, 5);
      },
    });
  },
  small(scene, r, anims) {
    const g = gfx(scene, -790);
    const bottom = r.y + r.h;
    anims.push({
      r, fn: t => {
        g.clear();
        for (let x = r.x + 40; x < r.x + r.w - 20; x += 54) {
          const a = Math.sin(t * 2.2 + x * 0.02) * 0.28;
          for (const [y0, dir] of [[r.y, 1], [bottom, -1]]) {
            if (dir < 0 && x > 1630 && x < 1870) continue; // 복도 입구 비우기
            const tx = x + Math.sin(a) * 60, ty = y0 + dir * Math.cos(a) * 64;
            g.lineStyle(26, INK, 1); g.lineBetween(x, y0, tx, ty); g.fillStyle(INK, 1); g.fillCircle(tx, ty, 13);
            g.lineStyle(17, 0xf7a65e, 1); g.lineBetween(x, y0, tx, ty); g.fillStyle(0xf7a65e, 1); g.fillCircle(tx, ty, 8.5);
          }
        }
      },
    });
  },
  large(scene, r) {
    const g = gfx(scene);
    const x = r.x + 130, y = r.y + 140, w = r.w - 260, h = r.h - 260;
    if (art(scene, 'props/colon.png', x + w / 2, y + h / 2, w + 70, h + 70)) return;
    g.lineStyle(62, INK, 1); g.strokeRoundedRect(x, y, w, h, 90);
    g.lineStyle(48, 0xc48b5c, 1); g.strokeRoundedRect(x, y, w, h, 90);
    g.fillStyle(0x7a5030, 1);
    for (let i = 0; i < 9; i++) g.fillCircle(x + 40 + i * (w - 80) / 8, y, 7);
  },
  heart(scene, r) {
    const g = gfx(scene);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2 - 10;
    tube(g, [pt(cx - 40, cy - 40), pt(cx - 40, r.y + 70), pt(r.x + 130, r.y + 70)], 34, 0x4f7bd9);
    tube(g, [pt(cx + 30, cy - 50), pt(cx + 30, r.y + 110), pt(cx + 150, r.y + 110), pt(cx + 150, r.y + 50)], 38, 0xd6404f);
    const c = scene.add.container(cx, cy).setDepth(-780);
    const h = scene.add.graphics();
    if (!art(scene, 'props/heart.png', 0, 22, 236, 230, { into: c })) {
    h.fillStyle(INK, 1); h.fillCircle(-48, -22, 63); h.fillCircle(48, -22, 63); h.fillTriangle(-108, 4, 108, 4, 0, 128);
    h.fillStyle(0xd6404f, 1); h.fillCircle(-48, -22, 56); h.fillCircle(48, -22, 56); h.fillTriangle(-98, 4, 98, 4, 0, 116);
    h.fillStyle(0xffffff, 0.45); h.fillEllipse(-62, -46, 34, 20);
    h.lineStyle(5, 0x8e2333, 1); h.lineBetween(0, -40, 0, 70);
    }
    c.add(h);
    scene.tweens.add({ targets: c, scale: { from: 1, to: 1.09 }, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.easeOut', repeatDelay: 260 });
  },
  vessel(scene, r, anims) {
    const g = gfx(scene);
    tube(g, [pt(r.x + 80, r.y + r.h - 90), pt(r.x + 300, r.y + r.h - 160), pt(r.x + 520, r.y + r.h - 90)], 22, 0xd6404f);
    tube(g, [pt(r.x + 140, r.y + r.h - 50), pt(r.x + 360, r.y + r.h - 110), pt(r.x + 620, r.y + r.h - 60)], 18, 0x4f7bd9);
    const mons = [r.x + 40, r.x + 510];
    mons.forEach(mx => { g.fillStyle(INK, 1); g.fillRoundedRect(mx - 6, r.y + 24, 162, 98, 10); g.fillStyle(0x1f2a30, 1); g.fillRoundedRect(mx, r.y + 30, 150, 86, 8); });
    const e = gfx(scene, -790);
    anims.push({
      r, fn: t => {
        e.clear(); e.lineStyle(4, 0x6dfc9c, 1);
        mons.forEach((mx, k) => {
          const pts = [];
          for (let i = 0; i <= 30; i++) {
            const u = (i / 30 + t * 0.5 + k * 0.3) % 1;
            const beat = u > 0.45 && u < 0.55 ? Math.sin((u - 0.45) * Math.PI * 20) * 26 : 0;
            pts.push(pt(mx + 10 + i * 130 / 30, r.y + 75 - beat));
          }
          e.strokePoints(pts);
        });
      },
    });
  },
  lung(scene, r) {
    const g = gfx(scene);
    const top = pt(r.x + 400, r.y + 230);
    const ends = [pt(r.x + 260, r.y + 430), pt(r.x + 400, r.y + 570), pt(r.x + 560, r.y + 460), pt(r.x + 620, r.y + 300)];
    ends.forEach(e => tube(g, [top, pt((top.x + e.x) / 2, (top.y + e.y) / 2 + 30), e], 16, 0xe6eef5));
    tube(g, [pt(top.x, r.y + 40), top], 24, 0xe6eef5);
    ends.forEach((e, k) => {
      const c = scene.add.container(e.x, e.y).setDepth(-780);
      const cl = scene.add.graphics();
      const offs = art(scene, 'props/alveoli.png', 0, 0, 130, 130, { into: c, rot: k * 0.9 }) ? [] : [[0, 0], [-30, -18], [30, -18], [-36, 18], [36, 18], [0, 34], [0, -36]];
      offs.forEach(([ox, oy]) => { cl.fillStyle(INK, 1); cl.fillCircle(ox, oy, 25); });
      offs.forEach(([ox, oy]) => { cl.fillStyle(0xf2a6b8, 1); cl.fillCircle(ox, oy, 19); cl.fillStyle(0xffffff, 0.5); cl.fillCircle(ox - 6, oy - 6, 5); });
      c.add(cl);
      scene.tweens.add({ targets: c, scale: { from: 0.92, to: 1.08 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: k * 80 });
    });
  },
  kidney(scene, r) {
    const g = gfx(scene);
    [[r.x + 140, r.y + 320, 0.25], [r.x + 400, r.y + 320, -0.25]].forEach(([x, y, rot]) => {
      // 콩팥 그림: 오목한 곳이 오른쪽을 보는 왼쪽 콩팥 1장 → 오른쪽 것은 좌우 뒤집기
      if (art(scene, 'props/kidney.png', x, y, 170, 230, { rot, flip: rot < 0 })) return;
      const pts = blob(x, y, 70, 100, rot).map((p, i, a) => {
        const ang = i / a.length * Math.PI * 2;
        const dent = Math.max(0, Math.cos(ang - (rot < 0 ? Math.PI : 0))) ** 6 * 30;
        return pt(p.x + (rot < 0 ? dent : -dent), p.y);
      });
      inkFill(g, pts, 0xa8524a);
      g.fillStyle(0xd9877c, 1); g.fillEllipse(x, y, 60, 110);
    });
    if (art(scene, 'props/glomerulus.png', r.x + r.w / 2, r.y + 150, 100, 100)) return;
    g.fillStyle(INK, 1); g.fillCircle(r.x + r.w / 2, r.y + 150, 44);
    g.fillStyle(0xd6404f, 1); g.fillCircle(r.x + r.w / 2, r.y + 150, 37);
    g.lineStyle(5, 0x8e2333, 1);
    for (let i = 0; i < 5; i++) g.strokeCircle(r.x + r.w / 2 + Math.cos(i * 1.3) * 12, r.y + 150 + Math.sin(i * 1.3) * 12, 14);
  },
  bladder(scene, r, anims) {
    const g = gfx(scene), cx = r.x + r.w / 2 + 40, cy = r.y + r.h / 2 + 30, R = 115;
    tube(g, [pt(r.x + 30, r.y + 120), pt(cx - 60, r.y + 120), pt(cx - 40, cy - 60)], 18, 0xe8c84a);
    g.fillStyle(INK, 1); g.fillCircle(cx, cy, R + 8);
    g.fillStyle(0xf6efc8, 1); g.fillCircle(cx, cy, R);
    const w = gfx(scene, -790);
    anims.push({
      r, fn: t => {
        w.clear(); const lvl = cy + 10 + Math.sin(t * 0.7) * 25, pts = [];
        for (let a = 0; a <= 40; a++) {
          const x = cx - R + a * (2 * R) / 40;
          const yy = lvl + Math.sin(a * 0.5 + t * 3) * 6;
          const lim = Math.sqrt(Math.max(0, R * R - (x - cx) ** 2));
          pts.push(pt(x, Math.max(yy, cy - lim)));
        }
        for (let a = 0; a <= 30; a++) { const an = a / 30 * Math.PI; pts.push(pt(cx + Math.cos(an) * R, cy + Math.sin(an) * R)); }
        w.fillStyle(0xf2cf3a, 1); w.fillPoints(pts, true);
        w.lineStyle(8, INK, 1); w.strokeCircle(cx, cy, R);
      },
    });
  },
  lobby(scene, r, anims) {
    const g = gfx(scene);
    const crate = (x, y, s) => {
      if (art(scene, 'props/crate.png', x + s / 2, y + s / 2, s + 10, s + 10)) return;
      g.fillStyle(INK, 1); g.fillRoundedRect(x - 5, y - 5, s + 10, s + 10, 8);
      g.fillStyle(0xc9925a, 1); g.fillRoundedRect(x, y, s, s, 6);
      g.lineStyle(6, 0x8e5e33, 1); g.lineBetween(x + 10, y + 10, x + s - 10, y + s - 10); g.lineBetween(x + s - 10, y + 10, x + 10, y + s - 10);
    };
    crate(r.x + 60, r.y + r.h - 170, 110); crate(r.x + 180, r.y + r.h - 130, 80); crate(r.x + r.w - 170, r.y + r.h - 170, 110);
    const wx = r.x + r.w / 2, wy = r.y + 170;
    g.fillStyle(INK, 1); g.fillRoundedRect(wx - 260, wy - 90, 520, 180, 90);
    g.fillStyle(0xc0c9d2, 1); g.fillRoundedRect(wx - 248, wy - 78, 496, 156, 78);
    g.fillStyle(0x5a1e2c, 1); g.fillRoundedRect(wx - 228, wy - 60, 456, 120, 60);
    const cells = gfx(scene, -795);
    anims.push({
      r, fn: t => {
        cells.clear();
        for (let i = 0; i < 7; i++) {
          const u = ((t * 0.08 + i / 7) % 1), x = wx - 210 + u * 420, y = wy - 20 + Math.sin(i * 2 + t) * 24;
          cells.fillStyle(0xe5484d, 1); cells.fillEllipse(x, y, 46, 30); cells.fillStyle(0xb8323d, 1); cells.fillEllipse(x, y, 20, 12);
        }
      },
    });
    const lx = r.x + r.w - 110, ly = r.y + 330;
    g.fillStyle(INK, 1); g.fillRoundedRect(lx - 6, ly - 6, 92, 212, 12);
    g.fillStyle(0x6b7c87, 1); g.fillRoundedRect(lx, ly, 80, 200, 8);
    g.lineStyle(4, INK, 1); g.lineBetween(lx + 40, ly, lx + 40, ly + 200);
    g.fillStyle(INK, 1); g.fillCircle(lx + 32, ly + 100, 5); g.fillCircle(lx + 48, ly + 100, 5);
  },
};
