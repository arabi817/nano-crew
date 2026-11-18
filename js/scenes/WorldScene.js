// 게임 세계 화면: 맵 그리기, 내 캐릭터 이동, 다른 친구 위치 받기, 시야(안개)
import { WORLD, walkable, SPOTS, SAB_SPOTS, VENTS, TABLE, roomAt, zoneAt, seeThrough, lineOfSight } from '../map/map.js';
import { KILL_RANGE, REPORT_RANGE, EMERGENCY_RANGE } from '../common/rules.js';
import { drawMap } from '../map/drawMap.js';
import { Avatar, loadAvatarTextures, fitScale } from '../player/avatar.js';
import { PosSender, RemoteMotion, ZoneListener, decodePos } from '../net/posSync.js';
import { P } from '../net/room.js';
import { nickOf } from '../common/colors.js';
import { NET } from '../../config.js';

const SPEED = 270, RADIUS = 20, USE_RANGE = 115;
export const VISION = 380; // 크루원 시야 반지름
export const IMP_VISION = 500; // 바이러스는 시야가 더 넓어요 (명세)

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }
  init(data) { this.app = data.app; this.ready = false; this.app.scene = this; }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#140c12');
    cam.setBounds(-400, -400, WORLD.w + 800, WORLD.h + 800);
    this.mapInfo = drawMap(this);
    this.avatars = new Map(); this.motions = new Map(); this.bodies = new Map(); this.vis = {};
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false);
    this.input.keyboard.on('keydown-E', () => this.app.useAction());
    this.input.keyboard.on('keydown-Q', () => this.app.killAction());
    this.input.keyboard.on('keydown-R', () => this.app.reportAction());
    this.input.keyboard.on('keydown-V', () => this.app.ventAction());
    this.input.keyboard.on('keydown-F', () => this.app.sabAction());
    this.makeFog();
    this.scale.on('resize', () => this.fitZoom()); this.fitZoom();
    loadAvatarTextures(this).then(() => this.onReady());
  }

  fitZoom() {
    const dpr = this.app.dpr || 1;
    const w = this.scale.width / dpr, h = this.scale.height / dpr;
    const z = Math.max(0.45, Math.min(1.5, Math.min(w, h) / (this.visionR() * 2.05)));
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
    this.setBodies(a.game?.bodies);
    // 내 구역 + 바로 옆 구역의 위치만 받아요
    this.zl = new ZoneListener(a.db, P.pos(a.code), {
      onPos: (k, v) => this.onPos(k, v),
      onGone: k => this.motions.delete(k),
    });
    this.zl.setZone(zoneAt(this.x, this.y));
    // 보이는 미션: 누가 어떤 미션을 하는 중인지
    this.vis = {};
    this.unsubVis = a.db.onValue(`rooms/${a.code}/vis`, v => { this.vis = v || {}; });
    this.events.once('shutdown', () => { this.zl?.stop(); this.unsubVis?.(); });
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

  // 혈관 통로: 잠깐 사라졌다가 짝 통로에서 나타나요
  ventTo(x, y) {
    this.ghostPuff(this.x, this.y);
    this.teleport(x, y);
    this.ghostPuff(x, y);
  }
  ghostPuff(x, y) {
    const c = this.add.circle(x, y + 10, 30, 0x7a2b38, 0.8).setDepth(y + 1).setStrokeStyle(5, 0x1a1018);
    this.tweens.add({ targets: c, scale: 2, alpha: 0, duration: 450, onComplete: () => c.destroy() });
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
    const ghost = a.amDead();
    if (len > 0.05) {
      const nx = this.x + vx * step, ny = this.y + vy * step;
      // 유령은 벽을 통과해요 (맵 바깥으로만 못 나감)
      const ok = (x, y) => ghost ? (x > 60 && y > 60 && x < 3850 && y < 2600) : walkable(x, y, RADIUS);
      if (ok(nx, this.y)) { this.x = nx; moved = true; }
      if (ok(this.x, ny)) { this.y = ny; moved = true; }
      if (vx < -0.1) this.face = -1; else if (vx > 0.1) this.face = 1;
    }
    this.me.setPos(this.x, this.y);
    this.me.update(dt, moved, this.face);
    this.me.root.setAlpha(ghost ? 0.55 : 1);
    this.sender.tick(now, this.x, this.y, this.face, moved);
    this.zl.setZone(zoneAt(this.x, this.y));

    const playing = a.phase === 'playing', fog = playing && !ghost, dead = a.game?.dead || {};
    const VR = this.visionR();
    if (VR !== this.lastVR) { this.lastVR = VR; this.fitZoom(); }
    const mates = a.priv?.mates || [];
    let visible = 0;
    for (const [uid, av] of this.avatars) {
      const m = this.motions.get(uid);
      if (!m || !m.has) { av.setAlpha(0); continue; }
      m.sample(now);
      av.setPos(m.x, m.y); av.update(dt, m.moving, m.face);
      const d = Math.hypot(m.x - this.x, m.y - this.y);
      let al = fog ? (d < VR * 0.82 ? 1 : d < VR ? (VR - d) / (VR * 0.18) : 0) : 1;
      if (fog && al > 0 && !lineOfSight(this.x, this.y, m.x, m.y)) al = 0; // 벽 너머는 안 보여요
      if (!av.online) al *= 0.35;
      if (playing && dead[uid]) al = ghost ? al * 0.5 : 0; // 유령은 유령끼리만 보여요
      av.setAlpha(al); if (al > 0) visible++;
      av.label.setColor(mates.includes(uid) ? '#ff6b6b' : '#ffffff');
      av.dist = d;
      av.setFx(playing && !dead[uid] ? this.vis[uid] : null);
    }
    this.visibleCount = visible;
    this.updateFog(fog);
    for (const b of this.bodies.values()) {
      const d = Math.hypot(b.x - this.x, b.y - this.y);
      b.root.setVisible(!fog || (d < VR && lineOfSight(this.x, this.y, b.x, b.y)));
    }

    // 가까운 미션·킬 대상·시체·긴급 버튼 찾기
    this.me.setFx(playing && !ghost ? this.vis[a.uid] : null);
    const near = { task: null, kill: null, body: null, table: false, sab: null, vent: null };
    if (playing && !a.isFrozen()) {
      let best = USE_RANGE;
      for (const t of a.tasks) {
        if (t.done) continue;
        for (const id of t.spots || [t.spot]) {
          const s = SPOTS[id]; if (!s) continue;
          const d = Math.hypot(s.x - this.x, s.y - this.y);
          if (d < best) { best = d; near.task = t.id; }
        }
      }
      const sab = a.game?.sab;
      if (sab && !ghost) for (const [id, s] of Object.entries(SAB_SPOTS)) {
        if (s.kind === sab.kind && Math.hypot(s.x - this.x, s.y - this.y) < USE_RANGE + 20) near.sab = id;
      }
      if (!ghost && a.priv?.role === 'imp') for (const [id, v] of Object.entries(VENTS)) {
        if (Math.hypot(v.x - this.x, v.y - this.y) < 95) near.vent = id;
      }
      if (!ghost) {
        if (a.priv?.role === 'imp') {
          let kb = KILL_RANGE;
          for (const [uid, av] of this.avatars) {
            if (dead[uid] || mates.includes(uid) || !a.game?.members?.[uid] || av.dist == null) continue;
            if (!this.motions.get(uid)?.has || av.dist >= kb) continue;
            kb = av.dist; near.kill = uid;
          }
        }
        let bb = REPORT_RANGE;
        for (const [uid, b] of this.bodies) { const d = Math.hypot(b.x - this.x, b.y - this.y); if (d < bb) { bb = d; near.body = uid; } }
        near.table = Math.hypot(TABLE.x - this.x, TABLE.y - this.y) < EMERGENCY_RANGE;
      }
    }
    a.setNear(near);
    this.updateArrows(playing, ghost);
    a.myRoom = roomAt(this.x, this.y)?.id || null;
  }

  // 화살표: 큰 사보타주 해결 장소(빨강), 여러 단계 미션의 다음 장소(노랑). 화면 밖일 때만 가장자리에 떠요.
  updateArrows(playing, ghost) {
    const a = this.app, box = this.arrowBox ||= document.getElementById('arrows');
    if (!box) return;
    const targets = [];
    if (playing && !a.isFrozen()) {
      const sab = a.game?.sab;
      if (sab && sab.kind !== 'clot' && !ghost) for (const s of Object.values(SAB_SPOTS)) if (s.kind === sab.kind) targets.push({ x: s.x, y: s.y, red: true });
      if (a.priv?.role !== 'imp') for (const t of a.tasks) {
        if (t.done || t.step === 0) continue;
        for (const id of t.spots || [t.spot]) { const s = SPOTS[id]; if (s) targets.push({ x: s.x, y: s.y }); }
      }
    }
    while (box.children.length < targets.length) box.appendChild(Object.assign(document.createElement('div'), { className: 'nav-arrow' }));
    const v = this.cameras.main.worldView, W = box.clientWidth, H = box.clientHeight, pad = 46;
    [...box.children].forEach((el, i) => {
      const t = targets[i];
      if (!t) { el.style.display = 'none'; return; }
      const sx = (t.x - v.x) / v.width * W, sy = (t.y - v.y) / v.height * H;
      if (sx > pad && sx < W - pad && sy > pad && sy < H - pad) { el.style.display = 'none'; return; } // 화면 안이면 안 보여요
      const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy;
      const k = Math.min((W / 2 - pad) / Math.abs(dx || 1e-6), (H / 2 - pad) / Math.abs(dy || 1e-6));
      const ang = Math.atan2(dy, dx);
      el.style.display = ''; el.classList.toggle('red', !!t.red);
      el.style.transform = `translate(${cx + dx * k - 15}px, ${cy + dy * k - 16}px) rotate(${ang}rad)`;
    });
  }

  // 쓰러진 대원 (어지러운 별이 도는 모습)
  setBodies(obj) {
    obj = obj || {};
    for (const [uid, b] of this.bodies) if (!obj[uid]) { b.root.destroy(); this.bodies.delete(uid); }
    for (const [uid, v] of Object.entries(obj)) {
      if (this.bodies.has(uid)) continue;
      const p = decodePos(v), pl = this.app.players[uid]; if (!p || !pl) continue;
      const root = this.add.container(p.x, p.y).setDepth(p.y - 5);
      root.add(this.add.ellipse(0, 22, 76, 18, 0x000000, 0.3));
      root.add(this.add.image(0, 10, `av_${pl.c}_0`).setScale(fitScale(this, `av_${pl.c}_0`, 80)).setRotation(-Math.PI / 2).setTint(0xcccccc));
      const stars = this.add.container(-4, -18);
      for (let i = 0; i < 3; i++) stars.add(this.add.star(Math.cos(i * 2.09) * 18, Math.sin(i * 2.09) * 7, 5, 4, 9, 0xffe14d).setStrokeStyle(2, 0x1a1018));
      root.add(stars);
      this.tweens.add({ targets: stars, angle: 360, duration: 2400, repeat: -1 });
      this.bodies.set(uid, { root, x: p.x, y: p.y });
    }
  }

  visionR() { return this.app.priv?.role === 'imp' && !this.app.amDead?.() ? IMP_VISION : VISION; }

  // 시야: 내 자리에서 사방으로 시선을 쏴서 벽에 막히는 곳까지만 밝게 (어몽어스처럼).
  // 시야 밖은 맵 모양이 희미하게 보일 정도로만 어둡게 해요.
  makeFog() {
    const S = 512, tex = this.textures.createCanvas('fogHole', S, S), ctx = tex.getContext();
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(8,4,10,0)'); g.addColorStop(1, 'rgba(8,4,10,0.8)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.fill(); tex.refresh(); // 원 안쪽만 (바깥은 RT가 덮음)
    this.fogImg = this.add.image(0, 0, 'fogHole').setDepth(9001);
    this.fogPoly = this.make.graphics({ add: false });
    this.rays = 140;
  }
  visPolygon(x, y, R) {
    const pts = [], n = this.rays, step = 14;
    for (let i = 0; i < n; i++) {
      const an = i / n * Math.PI * 2, c = Math.cos(an), s = Math.sin(an);
      let d = step;
      while (d < R && seeThrough(x + c * d, y + s * d)) d += step;
      if (d < R) { // 벽 경계를 조금 더 정확히
        let lo = d - step, hi = d;
        for (let k = 0; k < 3; k++) { const mid = (lo + hi) / 2; if (seeThrough(x + c * mid, y + s * mid)) lo = mid; else hi = mid; }
        d = Math.min(R, hi + 26); // 벽 앞면이 살짝 보이게
      }
      pts.push({ x: x + c * d, y: y + s * d });
    }
    return pts;
  }
  updateFog(on) {
    this.fogImg.setVisible(on);
    if (!on) { this.fogRT?.setVisible(false); return; }
    const cam = this.cameras.main, v = cam.worldView, pad = 60;
    const W = Math.ceil(v.width + pad * 2), H = Math.ceil(v.height + pad * 2);
    if (!this.fogRT || this.fogRT.width < W || this.fogRT.height < H) {
      this.fogRT?.destroy();
      this.fogRT = this.add.renderTexture(0, 0, W + 100, H + 100).setOrigin(0, 0).setDepth(9000);
    }
    const rt = this.fogRT, ox = v.x - pad, oy = v.y - pad, R = this.visionR();
    rt.setVisible(true).setPosition(ox, oy);
    rt.clear(); rt.fill(0x08040a, 0.8);
    const poly = this.visPolygon(this.x, this.y, R).map(p => ({ x: p.x - ox, y: p.y - oy }));
    this.fogPoly.clear(); this.fogPoly.fillStyle(0xffffff, 1); this.fogPoly.fillPoints(poly, true);
    rt.erase(this.fogPoly);
    this.fogImg.setPosition(this.x, this.y).setDisplaySize(R * 2, R * 2);
  }

}
