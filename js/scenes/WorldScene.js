// 게임 세계 화면: 맵 그리기, 내 캐릭터 이동, 다른 친구 위치 받기, 시야(안개)
import { WORLD, walkable, TASK_SPOTS, roomAt, zoneAt } from '../map/map.js';
import { drawMap } from '../map/drawMap.js';
import { Avatar, loadAvatarTextures } from '../player/avatar.js';
import { PosSender, RemoteMotion, ZoneListener, decodePos } from '../net/posSync.js';
import { P } from '../net/room.js';
import { nickOf } from '../common/colors.js';
import { NET } from '../../config.js';

const SPEED = 270, RADIUS = 20, USE_RANGE = 115;
export const VISION = 380; // 크루원 시야 반지름

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }
  init(data) { this.app = data.app; this.ready = false; this.app.scene = this; }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#140c12');
    cam.setBounds(-400, -400, WORLD.w + 800, WORLD.h + 800);
    this.mapInfo = drawMap(this);
    this.avatars = new Map(); this.motions = new Map();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false);
    this.input.keyboard.on('keydown-E', () => this.app.useAction());
    this.makeFog();
    this.scale.on('resize', () => this.fitZoom()); this.fitZoom();
    loadAvatarTextures(this).then(() => this.onReady());
  }

  fitZoom() {
    const dpr = this.app.dpr || 1;
    const w = this.scale.width / dpr, h = this.scale.height / dpr;
    const z = Math.max(0.45, Math.min(1.5, Math.min(w, h) / (VISION * 2.05)));
    this.cameras.main.setZoom(z * dpr);
  }

  onReady() {
    const a = this.app;
    this.me = new Avatar(this, { c: a.myPlayer.c, hat: a.myPlayer.hat || 0, label: nickOf(a.myPlayer) });
    this.me.label.setColor('#ffe680');
    const s = a.getStartPos();
    this.x = s.x; this.y = s.y; this.face = 1;
    this.me.setPos(this.x, this.y);
    this.cameras.main.startFollow(this.me.root, true, 0.2, 0.2);
    this.cameras.main.centerOn(this.x, this.y);
    this.sender = new PosSender(a.db, P.pos(a.code), a.uid, NET.sendHz);
    this.sender.tick(performance.now(), this.x, this.y, 1, false, true);
    this.sender.adoptOld();
    this.syncPlayers(a.players);
    // 내 구역 + 바로 옆 구역의 위치만 받아요
    this.zl = new ZoneListener(a.db, P.pos(a.code), {
      onPos: (k, v) => this.onPos(k, v),
      onGone: k => this.motions.delete(k),
    });
    this.zl.setZone(zoneAt(this.x, this.y));
    this.events.once('shutdown', () => this.zl?.stop());
    this.ready = true;
    a.onSceneReady();
  }

  onPos(uid, v) {
    if (uid === this.app.uid) return;
    let m = this.motions.get(uid);
    if (!m) { m = new RemoteMotion(NET.interpDelayMs, 1000 / NET.sendHz); this.motions.set(uid, m); }
    m.push(decodePos(v), performance.now());
  }

  syncPlayers(players) {
    if (!this.ready && !this.me) return;
    const me = players[this.app.uid];
    if (me && this.me) { this.me.setLook(me.c, me.hat || 0); this.me.setLabel(nickOf(me)); }
    for (const [uid, p] of Object.entries(players)) {
      if (uid === this.app.uid) continue;
      let av = this.avatars.get(uid);
      if (!av) { av = new Avatar(this, { c: p.c, hat: p.hat || 0, label: nickOf(p) }); av.setAlpha(0); this.avatars.set(uid, av); }
      av.setLook(p.c, p.hat || 0); av.setLabel(nickOf(p)); av.online = p.on !== false;
    }
    for (const [uid, av] of this.avatars) if (!players[uid]) { av.destroy(); this.avatars.delete(uid); }
  }

  teleport(x, y) {
    this.x = x; this.y = y; this.me.setPos(x, y);
    this.cameras.main.centerOn(x, y);
    this.sender.tick(performance.now(), x, y, this.face, false, true);
    this.zl.setZone(zoneAt(x, y));
  }

  setSpotPending(id, on) { this.mapInfo.spots[id]?.setPending(on); }

  update(time, dtRaw) {
    if (!this.ready) return;
    const a = this.app, dt = Math.min(dtRaw, 50), now = performance.now();
    let vx = 0, vy = 0;
    if (!a.isFrozen()) {
      const k = this.keys;
      vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
      const j = a.joy?.vec; if (j && (j.x || j.y)) { vx = j.x; vy = j.y; }
    }
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    const step = SPEED * dt / 1000;
    let moved = false;
    if (len > 0.05) {
      const nx = this.x + vx * step, ny = this.y + vy * step;
      if (walkable(nx, this.y, RADIUS)) { this.x = nx; moved = true; }
      if (walkable(this.x, ny, RADIUS)) { this.y = ny; moved = true; }
      if (vx < -0.1) this.face = -1; else if (vx > 0.1) this.face = 1;
    }
    this.me.setPos(this.x, this.y);
    this.me.update(dt, moved, this.face);
    this.sender.tick(now, this.x, this.y, this.face, moved);
    this.zl.setZone(zoneAt(this.x, this.y));

    const fog = a.phase === 'playing';
    let visible = 0;
    for (const [uid, av] of this.avatars) {
      const m = this.motions.get(uid);
      if (!m || !m.has) { av.setAlpha(0); continue; }
      m.sample(now);
      av.setPos(m.x, m.y); av.update(dt, m.moving, m.face);
      const d = Math.hypot(m.x - this.x, m.y - this.y);
      let al = fog ? (d < VISION * 0.82 ? 1 : d < VISION ? (VISION - d) / (VISION * 0.18) : 0) : 1;
      if (!av.online) al *= 0.35;
      av.setAlpha(al); if (al > 0) visible++;
    }
    this.visibleCount = visible;
    this.updateFog(fog);

    // 가까운 미션 찾기
    let near = null;
    if (a.phase === 'playing') {
      let best = USE_RANGE;
      for (const t of a.tasks) {
        if (t.done) continue;
        const s = TASK_SPOTS[t.id]; if (!s) continue;
        const d = Math.hypot(s.x - this.x, s.y - this.y);
        if (d < best) { best = d; near = t.id; }
      }
    }
    a.setNearTask(near);
    a.myRoom = roomAt(this.x, this.y)?.id || null;
  }

  makeFog() {
    const S = 512, tex = this.textures.createCanvas('fogHole', S, S), ctx = tex.getContext();
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.32, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(10,6,10,0)'); g.addColorStop(1, 'rgba(10,6,10,0.94)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); tex.refresh();
    this.fogImg = this.add.image(0, 0, 'fogHole').setDepth(9000).setDisplaySize(VISION * 2, VISION * 2);
    this.fogRects = this.add.graphics().setDepth(9000);
  }
  updateFog(on) {
    this.fogImg.setVisible(on); this.fogRects.setVisible(on);
    if (!on) return;
    const R = VISION, x = this.x, y = this.y, v = this.cameras.main.worldView, m = 200;
    this.fogImg.setPosition(x, y);
    const g = this.fogRects; g.clear(); g.fillStyle(0x0a060a, 0.94);
    const L = v.x - m, T = v.y - m, Rr = v.right + m, B = v.bottom + m;
    g.fillRect(L, T, Rr - L, (y - R) - T);
    g.fillRect(L, y + R, Rr - L, B - (y + R));
    g.fillRect(L, y - R, (x - R) - L, 2 * R);
    g.fillRect(x + R, y - R, Rr - (x + R), 2 * R);
  }
}
