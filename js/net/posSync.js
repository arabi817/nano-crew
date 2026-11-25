// 위치 보내기(움직일 때만, 초당 6회)와 받기(보간해서 부드럽게).
// 위치는 rooms/{코드}/pos/{구역}/{uid} 에 저장해요. 구역이 바뀌면 옛 칸을 지우고 새 칸에 써요.
import { zoneAt, nearZones } from '../map/map.js';

export function encodePos(x, y, face) { return `${Math.round(x)},${Math.round(y)},${face < 0 ? 0 : 1}`; }
export function decodePos(s) {
  if (typeof s !== 'string') return null;
  const [x, y, f] = s.split(',').map(Number);
  if (!isFinite(x) || !isFinite(y)) return null;
  return { x, y, face: f ? 1 : -1 };
}

export class PosSender {
  // root: rooms/{코드}/pos,  opts.removeOnDisconnect: 창을 닫으면 위치 지우기(봇용)
  constructor(db, root, uid, hz, opts = {}) {
    Object.assign(this, { db, root, uid, iv: 1000 / hz, last: -1e9, lastSent: '', wasMoving: false, zone: null, opts });
  }
  tick(now, x, y, face, moving, force = false) {
    const due = force || (moving && now - this.last >= this.iv) || (!moving && this.wasMoving);
    this.wasMoving = moving;
    if (!due) return;
    const enc = encodePos(x, y, face), zone = zoneAt(x, y);
    if (enc === this.lastSent && zone === this.zone && !force) return;
    const path = `${this.root}/${zone}/${this.uid}`;
    if (zone !== this.zone && this.zone) {
      const upd = { [`${this.zone}/${this.uid}`]: null, [`${zone}/${this.uid}`]: enc };
      this.db.update(this.root, upd);
      if (this.opts.removeOnDisconnect) this.db.onDisconnectCancel(`${this.root}/${this.zone}/${this.uid}`);
    } else this.db.set(path, enc);
    if (zone !== this.zone && this.opts.removeOnDisconnect) this.db.onDisconnectRemove(path);
    this.opts.onSend?.(zone, enc);
    this.zone = zone; this.lastSent = enc; this.last = now;
  }
  // 처음 시작할 때 다른 구역에 남은 내 옛 위치를 정리
  async adoptOld() {
    const all = (await this.db.get(this.root)) || {};
    const upd = {};
    for (const z of Object.keys(all)) if (all[z]?.[this.uid] != null && z !== this.zone) upd[`${z}/${this.uid}`] = null;
    if (Object.keys(upd).length) await this.db.update(this.root, upd);
  }
}

// 내 위치(구역)가 바뀔 때마다 '가까운 구역'만 골라서 듣기
export class ZoneListener {
  constructor(db, root, { onPos, onGone }) {
    Object.assign(this, { db, root, onPos, onGone, subs: new Map(), where: new Map(), zone: null, extra: [] });
  }
  // CCTV를 보는 동안만: 카메라가 비추는 구역도 받아요
  setExtra(zones) { this.extra = zones || []; const z = this.zone; this.zone = null; this.setZone(z); }
  setZone(zone) {
    if (zone === this.zone) return;
    this.zone = zone;
    const want = new Set(nearZones(zone)); for (const z of this.extra) want.add(z);
    for (const [z, off] of this.subs) if (!want.has(z)) {
      off(); this.subs.delete(z);
      for (const [uid, wz] of this.where) if (wz === z) { this.where.delete(uid); this.onGone(uid); }
    }
    for (const z of want) if (!this.subs.has(z)) {
      this.subs.set(z, this.db.onChildren(`${this.root}/${z}`, {
        added: (uid, v) => { this.where.set(uid, z); this.onPos(uid, v); },
        changed: (uid, v) => { this.where.set(uid, z); this.onPos(uid, v); },
        removed: uid => { if (this.where.get(uid) === z) { this.where.delete(uid); this.onGone(uid); } },
      }));
    }
  }
  stop() { for (const off of this.subs.values()) off(); this.subs.clear(); }
}

// 구역 어디에 있든 이 사람의 위치를 찾기 (다시 들어오기·내보내기용)
export async function findPos(db, root, uid) {
  const all = (await db.get(root)) || {};
  for (const [z, kids] of Object.entries(all)) if (kids?.[uid] != null) return { zone: z, enc: kids[uid] };
  return null;
}

export class RemoteMotion {
  constructor(delay, iv) { this.delay = delay; this.iv = iv; this.buf = []; this.x = 0; this.y = 0; this.face = 1; this.has = false; this.moving = false; }
  push(p, t) {
    if (!p) return;
    const last = this.buf[this.buf.length - 1];
    if (!this.has || !last || Math.hypot(p.x - last.x, p.y - last.y) > 500) {
      this.buf = [{ t, ...p }]; this.x = p.x; this.y = p.y; this.face = p.face; this.has = true; return;
    }
    if (p.x === last.x && p.y === last.y && p.face === last.face) return; // 구역 옮김으로 생긴 같은 값
    // 오래 서 있다가 움직이기 시작하면, 출발 시각을 지금 바로 전으로 당겨 둠
    if (t - last.t > this.iv * 2.5) this.buf.push({ ...last, t: t - this.iv });
    this.buf.push({ t, ...p });
    if (this.buf.length > 24) this.buf.shift();
  }
  sample(now) {
    const b = this.buf; if (!b.length) return;
    const rt = now - this.delay;
    const px = this.x, py = this.y;
    if (rt <= b[0].t) { this.x = b[0].x; this.y = b[0].y; }
    else if (rt >= b[b.length - 1].t) { const l = b[b.length - 1]; this.x = l.x; this.y = l.y; this.face = l.face; }
    else {
      let i = 0; while (i < b.length - 2 && b[i + 1].t <= rt) i++;
      const a = b[i], c = b[i + 1], k = (rt - a.t) / Math.max(1, c.t - a.t);
      this.x = a.x + (c.x - a.x) * k; this.y = a.y + (c.y - a.y) * k; this.face = c.face;
      if (i > 0) b.splice(0, i);
    }
    this.moving = Math.hypot(this.x - px, this.y - py) > 0.3;
  }
}
