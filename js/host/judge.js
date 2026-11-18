// 교사 노트북의 '심판'. 게임 규칙 판정은 모두 여기서 해요.
// 역할·미션 배정, 킬 거리 확인, 신고·긴급 회의, OX 채점, 투표 집계, 승리 판정.
// 상태는 모두 Firebase에 있어서, 교사 화면을 새로고침해도 이어서 판정해요.
import { P, isBot } from '../net/room.js';
import { decodePos } from '../net/posSync.js';
import { TABLE } from '../map/map.js';
import { CONTENT } from '../../data/content.js';
import { STAGE1_TASKS } from '../missions/index.js';
import { settingsOf, KILL_RANGE, REPORT_RANGE, EMERGENCY_RANGE, REVEAL_MS, ALARM_MS, RESULT_MS } from '../common/rules.js';
import { shuffle } from '../common/util.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Judge {
  constructor(db, code, onChange) {
    Object.assign(this, { db, code, onChange });
    this.meta = null; this.players = {}; this.priv = {}; this.game = {}; this.done = {};
    this.zones = {}; this.cur = { id: null, ans: {}, right: {}, vote: {}, chat: {} };
    this.unsubs = []; this.meetUnsubs = []; this.stepKey = ''; this.pausedAt = 0;
  }
  get R() { return P.room(this.code); }
  get s() { return settingsOf(this.meta); }

  start() {
    const { db, code } = this, ch = () => this.onChange?.();
    this.unsubs.push(
      db.onValue(P.meta(code), m => { this.meta = m; ch(); }),
      db.onValue(P.players(code), v => { this.players = v || {}; ch(); }),
      db.onValue(P.priv(code), v => { this.priv = v || {}; ch(); }),
      db.onValue(P.game(code), v => { this.game = v || {}; this.watchMeeting(); this.publishProgress(); ch(); }),
      db.onValue(P.done(code), v => { this.done = v || {}; this.publishProgress(); this.checkWin(); ch(); }),
      db.onChildren(P.pos(code), {
        added: (z, v) => { this.zones[z] = v || {}; }, changed: (z, v) => { this.zones[z] = v || {}; },
        removed: z => { delete this.zones[z]; },
      }),
      db.onChildren(P.req(code), { added: (u, r) => this.onReq(u, r), changed: (u, r) => this.onReq(u, r) }),
    );
    this.timer = setInterval(() => this.tick(), 250);
  }
  stop() { this.unsubs.forEach(u => u()); this.meetUnsubs.forEach(u => u()); clearInterval(this.timer); }

  // ── 상태 도우미 ──
  posOf(id) { for (const z in this.zones) { const v = this.zones[z]?.[id]; if (v) return decodePos(v); } return null; }
  alive(id) { return !this.game.dead?.[id]; }
  roleOf(id) { return this.priv[id]?.role; }
  ids() { return Object.keys(this.priv); }
  aliveVoters() { return this.ids().filter(id => this.alive(id) && this.players[id]); }
  progress() {
    let d = 0, t = 0;
    for (const id of this.ids()) {
      const p = this.priv[id]; if (p.role !== 'crew') continue;
      for (const task of p.tasks || []) { t++; if (this.done[id]?.[task]) d++; }
    }
    return { d, t };
  }
  impLeft() { return this.ids().filter(id => this.roleOf(id) === 'imp' && this.alive(id)).length; }

  // ── 게임 시작 ──
  async startGame() {
    const ids = Object.keys(this.players);
    if (ids.length < 3) throw new Error('3명 이상이 있어야 시작할 수 있어요');
    const s = this.s;
    const nImp = Math.max(1, Math.min(s.imps, Math.floor((ids.length - 1) / 2)));
    const imps = shuffle(ids).slice(0, nImp);
    const now = this.db.now();
    const priv = {};
    for (const id of ids) {
      const isImp = imps.includes(id);
      priv[id] = { role: isImp ? 'imp' : 'crew', tasks: [...STAGE1_TASKS] };
      if (isImp) { priv[id].mates = imps.filter(x => x !== id); priv[id].killReadyAt = now + REVEAL_MS + s.killCd * 1000; }
    }
    const crewTasks = (ids.length - nImp) * STAGE1_TASKS.length;
    await this.db.update(this.R, {
      private: priv, done: null, meet: null, req: null,
      game: { round: 0, impCount: nImp, revealUntil: now + REVEAL_MS, progress: { d: 0, t: crewTasks }, members: Object.fromEntries(ids.map(id => [id, true])) },
      'meta/state': 'playing', 'meta/startedAt': now, 'meta/paused': false, 'meta/settings': s,
    });
  }

  async resetToLobby() {
    await this.db.update(this.R, { private: null, game: null, done: null, meet: null, req: null, 'meta/state': 'lobby', 'meta/paused': false });
  }

  // ── 학생 요청 처리 ──
  onReq(uid, r) {
    this.db.remove(P.reqOf(this.code, uid));
    if (!r || this.meta?.state !== 'playing' || this.meta.paused || this.game.meeting) return;
    if (!this.priv[uid] || !this.alive(uid)) return;
    if (this.db.now() < (this.game.revealUntil || 0)) return;
    if (r.t === 'kill') this.tryKill(uid, r.target);
    else if (r.t === 'report') this.tryReport(uid, r.target);
    else if (r.t === 'emergency') this.tryEmergency(uid);
  }
  tryKill(uid, target) {
    const me = this.priv[uid], tg = this.priv[target];
    if (me?.role !== 'imp' || !tg || tg.role === 'imp' || !this.alive(target)) return;
    const now = this.db.now();
    if (now < (me.killReadyAt || 0) - 600) return;
    const a = this.posOf(uid), b = this.posOf(target);
    if (!a || !b || dist(a, b) > KILL_RANGE * 1.6) return;
    // 바로 반영해서 같은 순간 겹친 요청을 막음
    (this.game.dead ||= {})[target] = true;
    me.killReadyAt = now + this.s.killCd * 1000;
    this.db.update(this.R, {
      [`game/dead/${target}`]: true,
      [`game/bodies/${target}`]: `${Math.round(b.x)},${Math.round(b.y)}`,
      [`private/${uid}/killReadyAt`]: me.killReadyAt,
    });
    this.checkWin();
  }
  tryReport(uid, body) {
    const bp = decodePos(this.game.bodies?.[body]), a = this.posOf(uid);
    if (!bp || !a || dist(a, bp) > REPORT_RANGE * 1.6) return;
    this.startMeeting(uid, body);
  }
  tryEmergency(uid) {
    if (this.game.emerg?.[uid]) return;
    const a = this.posOf(uid);
    if (!a || dist(a, TABLE) > EMERGENCY_RANGE * 1.4) return;
    (this.game.emerg ||= {})[uid] = true;
    this.db.set(`${this.R}/game/emerg/${uid}`, true);
    this.startMeeting(uid, '');
  }

  // ── 회의 ──
  pickQuestion() {
    const s = this.s, used = this.game.oxUsed || {};
    let pool = CONTENT.ox.map((q, i) => ({ ...q, i })).filter(q => s.unit === 'all' || q.unit === s.unit);
    if (!pool.length) pool = CONTENT.ox.map((q, i) => ({ ...q, i }));
    const fresh = pool.filter(q => !used[q.i]);
    const list = fresh.length ? fresh : pool;
    return list[Math.floor(Math.random() * list.length)];
  }
  startMeeting(caller, body) {
    if (this.game.meeting || this.meta?.state !== 'playing') return;
    const now = this.db.now(), s = this.s, id = (this.game.round || 0) + 1, q = this.pickQuestion();
    const meeting = { id, phase: 'ox', caller, body: body || '', startAt: now + ALARM_MS, endsAt: now + ALARM_MS + s.oxSec * 1000, q: { i: q.i, text: q.q } };
    this.game.meeting = meeting;
    const upd = { 'game/meeting': meeting, 'game/round': id, 'game/bodies': null, [`game/oxUsed/${q.i}`]: true };
    if (s.progress === 'meeting') upd['game/progress'] = this.progress();
    this.db.update(this.R, upd);
  }
  watchMeeting() {
    const id = this.game.meeting?.id || null;
    if (id === this.cur.id) return;
    this.meetUnsubs.forEach(u => u()); this.meetUnsubs = [];
    this.cur = { id, ans: {}, right: {}, vote: {}, chat: {} };
    if (!id) return;
    const base = P.meet(this.code, id), ch = () => this.onChange?.();
    for (const k of ['ans', 'right', 'vote', 'chat']) {
      this.meetUnsubs.push(this.db.onValue(`${base}/${k}`, v => { this.cur[k] = v || {}; ch(); }));
    }
  }
  tick() {
    const m = this.game.meeting;
    if (!m || this.meta?.paused || this.meta?.state !== 'playing') return;
    const now = this.db.now();
    if (m.phase === 'vote' && now < m.endsAt) {
      const voters = this.aliveVoters().filter(id => this.cur.right[id]);
      if (voters.every(id => this.cur.vote[id])) return this.step(m, 'vote');
      return;
    }
    if (now >= m.endsAt) this.step(m, m.phase);
  }
  step(m, phase) {
    const key = `${m.id}:${phase}`;
    if (this.stepKey === key) return; this.stepKey = key;
    const now = this.db.now(), s = this.s, base = `meet/${m.id}`;
    if (phase === 'ox') {
      const ans = CONTENT.ox[m.q.i]?.a, right = {};
      for (const id of this.aliveVoters()) right[id] = this.cur.ans[id] === ans;
      this.db.update(this.R, {
        [`${base}/right`]: right,
        'game/meeting/phase': 'discuss', 'game/meeting/qa': ans || '', 'game/meeting/endsAt': now + s.discussSec * 1000,
      });
    } else if (phase === 'discuss') {
      this.db.update(this.R, { 'game/meeting/phase': 'vote', 'game/meeting/endsAt': now + s.voteSec * 1000 });
    } else if (phase === 'vote') {
      const counts = {};
      for (const [id, v] of Object.entries(this.cur.vote)) {
        if (!this.alive(id) || !this.cur.right[id]) continue;
        if (v !== 'skip' && (!this.priv[v] || !this.alive(v))) continue;
        counts[v] = (counts[v] || 0) + 1;
      }
      let max = 0, top = [];
      for (const [k, c] of Object.entries(counts)) { if (c > max) { max = c; top = [k]; } else if (c === max) top.push(k); }
      const ejected = top.length === 1 && top[0] !== 'skip' && max > 0 ? top[0] : '';
      const result = { counts, ejected, tie: top.length > 1 };
      const upd = { 'game/meeting/phase': 'result', 'game/meeting/endsAt': now + RESULT_MS };
      if (ejected) {
        (this.game.dead ||= {})[ejected] = true;
        upd[`game/dead/${ejected}`] = true; upd[`game/ejected/${ejected}`] = true;
        if (s.revealOnEject) { result.wasImp = this.roleOf(ejected) === 'imp'; result.impLeft = this.impLeft(); }
      }
      upd['game/meeting/result'] = result;
      this.db.update(this.R, upd);
    } else if (phase === 'result') {
      if (this.checkWin()) return;
      const upd = { 'game/meeting': null };
      for (const id of this.ids()) if (this.roleOf(id) === 'imp') upd[`private/${id}/killReadyAt`] = now + s.killCd * 1000;
      this.game.meeting = null;
      this.db.update(this.R, upd);
    }
  }

  // ── 진행 바 ──
  publishProgress() {
    if (this.meta?.state !== 'playing' || this.s.progress !== 'always') return;
    const p = this.progress(), g = this.game.progress;
    if (!g || g.d !== p.d || g.t !== p.t) { this.game.progress = p; this.db.update(this.R, { 'game/progress': p }); }
  }

  // ── 승리 판정 ──
  checkWin() {
    if (this.meta?.state !== 'playing' || this.game.winner) return false;
    const ids = this.ids(); if (!ids.length) return false;
    const imp = ids.filter(id => this.roleOf(id) === 'imp' && this.alive(id)).length;
    const crew = ids.filter(id => this.roleOf(id) === 'crew' && this.alive(id)).length;
    const p = this.progress();
    let w = null;
    if (imp === 0) w = { team: 'crew', reason: '임포스터를 모두 찾아냈어요' };
    else if (crew <= imp) w = { team: 'imp', reason: '남은 크루원 수가 임포스터 수와 같아졌어요' };
    else if (p.t > 0 && p.d >= p.t) w = { team: 'crew', reason: '미션을 모두 끝냈어요' };
    if (!w) return false;
    this.endGame(w);
    return true;
  }
  endGame(w) {
    const reveal = {};
    for (const id of this.ids()) reveal[id] = this.roleOf(id);
    this.game.winner = w;
    this.db.update(this.R, {
      'game/winner': { ...w, at: this.db.now() }, 'game/reveal': reveal, 'game/meeting': null,
      'game/progress': this.progress(), 'meta/state': 'ended',
    });
  }

  // ── 교사 버튼 ──
  forceMeeting() { this.startMeeting('teacher', ''); }
  togglePause() {
    const now = this.db.now();
    if (!this.meta?.paused) { this.pausedAt = now; this.db.update(this.R, { 'meta/paused': true, 'meta/pausedAt': now }); return; }
    const gap = now - (this.meta.pausedAt || now), upd = { 'meta/paused': false };
    if (this.game.meeting) { upd['game/meeting/endsAt'] = this.game.meeting.endsAt + gap; if (this.game.meeting.startAt) upd['game/meeting/startAt'] = this.game.meeting.startAt + gap; }
    for (const id of this.ids()) if (this.roleOf(id) === 'imp' && this.priv[id].killReadyAt) upd[`private/${id}/killReadyAt`] = this.priv[id].killReadyAt + gap;
    this.db.update(this.R, upd);
  }
  // 게임 중 내보낸 학생은 '나간 사람'으로 처리 (승리 계산에서 빠짐)
  onKicked(id) {
    if (this.meta?.state !== 'playing' || !this.priv[id]) return;
    (this.game.dead ||= {})[id] = true;
    this.db.update(this.R, { [`game/dead/${id}`]: true });
    this.checkWin();
  }
  realCount() { return Object.keys(this.players).filter(id => !isBot(id)).length; }
}
