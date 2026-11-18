// 통신 층: '혼자 시험 모드'(LocalDB)와 Firebase(FirebaseDB)를 같은 사용법으로 감쌉니다.
// 게임 코드는 이 파일의 함수만 쓰고, 어느 쪽에 연결됐는지 몰라도 됩니다.
import { firebaseConfig } from '../../config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2';
const OVERHEAD = 90; // Firebase 메시지 하나에 붙는 포장(경로 등) 추정 바이트

const segs = p => p.split('/').filter(Boolean);
const clone = v => (v === undefined || v === null) ? null : JSON.parse(JSON.stringify(v));
const isPrefix = (a, b) => a.length <= b.length && a.every((k, i) => b[i] === k);
const size = v => (v == null ? 4 : JSON.stringify(v).length);

function getIn(obj, s) {
  let o = obj;
  for (const k of s) { if (o == null || typeof o !== 'object') return null; o = o[k]; }
  return o === undefined ? null : o;
}
function setIn(obj, s, v) {
  if (!s.length) return;
  const stack = []; let o = obj;
  for (let i = 0; i < s.length - 1; i++) {
    if (o[s[i]] == null || typeof o[s[i]] !== 'object') { if (v == null) return; o[s[i]] = {}; }
    stack.push([o, s[i]]); o = o[s[i]];
  }
  const last = s[s.length - 1];
  if (v == null) {
    delete o[last];
    for (let i = stack.length - 1; i >= 0; i--) {
      const [par, k] = stack[i];
      if (Object.keys(par[k]).length === 0) delete par[k]; else break;
    }
  } else o[last] = clone(v);
}

export function newStats() { return { inMsgs: 0, inBytes: 0, outMsgs: 0, outBytes: 0 }; }

export async function createDB({ forceLocal = false } = {}) {
  const q = new URLSearchParams(location.search);
  const local = forceLocal || q.has('local') || !firebaseConfig.apiKey;
  if (!local) {
    const miss = ['apiKey', 'databaseURL', 'projectId', 'appId'].filter(k => !firebaseConfig[k]);
    if (miss.length) throw new Error(`config.js에 ${miss.join(', ')} 값이 비어 있어요. SETUP.md 1부 5번을 확인해 주세요.`);
  }
  const db = local ? new LocalDB() : new FirebaseDB();
  await db.init();
  return db;
}

// ───────── 혼자 시험 모드: 같은 컴퓨터의 창끼리 BroadcastChannel로 주고받기 ─────────
class LocalDB {
  constructor() {
    this.mode = 'local'; this.tree = {}; this.subs = new Set();
    this.disc = new Map(); this.stats = newStats(); this.synced = false;
  }
  async init() {
    // 새로고침하면 같은 사람(같은 uid), 새 창이면 새 사람
    const nav = performance.getEntriesByType?.('navigation')?.[0]?.type;
    let uid = sessionStorage.getItem('nc_uid');
    if (!uid || (nav !== 'reload' && nav !== 'back_forward')) {
      uid = 'L' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('nc_uid', uid);
    }
    this.uid = uid;
    try { this.tree = JSON.parse(localStorage.getItem('nc_tree') || '{}') || {}; } catch { this.tree = {}; }
    this.ch = new BroadcastChannel('nanocrew-local-v1');
    this.ch.onmessage = e => this._recv(e.data);
    await new Promise(res => { this._snapRes = res; setTimeout(res, 350); this.ch.postMessage({ t: 'hello', from: uid }); });
    addEventListener('pagehide', () => this._fireDisconnect());
    setInterval(() => this._persist(), 1500);
  }
  _persist() { try { localStorage.setItem('nc_tree', JSON.stringify(this.tree)); } catch { } }
  _recv(m) {
    if (m.t === 'hello') { if (m.from !== this.uid) this.ch.postMessage({ t: 'snap', to: m.from, tree: this.tree }); return; }
    if (m.t === 'snap') { if (m.to === this.uid && !this.synced) { this.synced = true; this.tree = m.tree || {}; this._snapRes?.(); } return; }
    if (m.t === 'ops') {
      // 실제 Firebase처럼 '듣고 있는 칸'의 변화만 받은 양으로 셈
      const heard = m.ops.filter(([p]) => { const s = segs(p); return [...this.subs].some(sub => isPrefix(sub.path, s) || isPrefix(s, sub.path)); });
      if (heard.length) { this.stats.inMsgs += heard.length; this.stats.inBytes += size(heard) + OVERHEAD * heard.length; }
      this._apply(m.ops);
    }
  }
  _write(ops) {
    this._apply(ops);
    this.stats.outMsgs++; this.stats.outBytes += size(ops) + OVERHEAD;
    this.ch.postMessage({ t: 'ops', ops });
    return Promise.resolve();
  }
  _apply(ops) {
    const changed = [];
    for (const [p, v] of ops) { setIn(this.tree, segs(p), v); changed.push(segs(p)); }
    for (const s of [...this.subs]) {
      for (const c of changed) if (isPrefix(s.path, c) || isPrefix(c, s.path)) this._eval(s, c);
    }
  }
  _eval(s, changed, initial = false) {
    if (!this.subs.has(s)) return;
    const val = getIn(this.tree, s.path);
    if (s.kind === 'v') {
      const j = JSON.stringify(val ?? null);
      if (!initial && j === s.last) return;
      s.last = j; s.cb(clone(val)); return;
    }
    const obj = (val && typeof val === 'object') ? val : {};
    const keys = (changed && changed.length > s.path.length)
      ? [changed[s.path.length]]
      : new Set([...Object.keys(obj), ...s.kids.keys()]);
    for (const k of keys) {
      const v = obj[k]; const had = s.kids.has(k);
      if (v === undefined || v === null) { if (had) { s.kids.delete(k); s.h.removed?.(k); } continue; }
      const j = JSON.stringify(v);
      if (!had) { s.kids.set(k, j); s.h.added?.(k, clone(v)); }
      else if (s.kids.get(k) !== j) { s.kids.set(k, j); s.h.changed?.(k, clone(v)); }
    }
  }
  set(p, v) { return this._write([[p, v]]); }
  update(p, obj) {
    const base = segs(p).join('/');
    return this._write(Object.entries(obj).map(([k, v]) => [base + '/' + segs(k).join('/'), v]));
  }
  remove(p) { return this.set(p, null); }
  get(p) { return Promise.resolve(clone(getIn(this.tree, segs(p)))); }
  onValue(p, cb) {
    const s = { kind: 'v', path: segs(p), cb }; this.subs.add(s); this._eval(s, null, true);
    return () => this.subs.delete(s);
  }
  onChildren(p, h) {
    const s = { kind: 'c', path: segs(p), h, kids: new Map() }; this.subs.add(s); this._eval(s, null, true);
    return () => this.subs.delete(s);
  }
  onDisconnectSet(p, v) { this.disc.set(p, v); }
  onDisconnectRemove(p) { this.disc.set(p, null); }
  onDisconnectCancel(p) { this.disc.delete(p); }
  _fireDisconnect() {
    if (!this.disc.size) return;
    const ops = [...this.disc.entries()]; this.disc.clear();
    this._apply(ops); this.ch.postMessage({ t: 'ops', ops }); this._persist();
  }
  onConnection(cb) { cb(true); return () => { }; }
  now() { return Date.now(); }
}

// ───────── Firebase Realtime Database + 익명 로그인 ─────────
class FirebaseDB {
  constructor() { this.mode = 'firebase'; this.stats = newStats(); this.offset = 0; }
  async init() {
    const [appM, A, D] = await Promise.all([
      import(`${FB}/firebase-app.js`), import(`${FB}/firebase-auth.js`), import(`${FB}/firebase-database.js`),
    ]);
    this.A = A; this.D = D;
    this.app = appM.initializeApp(firebaseConfig);
    const auth = A.getAuth(this.app);
    // 이 기기에 저장된 익명 계정이 있으면 그대로 씀 → 다시 들어와도 같은 캐릭터
    const user = await new Promise((res, rej) => {
      let first = true;
      const off = A.onAuthStateChanged(auth, u => {
        if (u) { off(); res(u); }
        else if (first) { first = false; A.signInAnonymously(auth).catch(rej); }
      });
    });
    this.uid = user.uid;
    this.d = D.getDatabase(this.app);
    D.onValue(this.r('.info/serverTimeOffset'), s => { this.offset = s.val() || 0; });
  }
  r(p) { return this.D.ref(this.d, p); }
  _out(v) { this.stats.outMsgs++; this.stats.outBytes += size(v) + OVERHEAD; }
  _in(v) { this.stats.inMsgs++; this.stats.inBytes += size(v) + OVERHEAD; }
  set(p, v) { this._out(v); return this.D.set(this.r(p), v); }
  update(p, o) { this._out(o); return this.D.update(this.r(p), o); }
  remove(p) { this._out(null); return this.D.remove(this.r(p)); }
  async get(p) { const s = await this.D.get(this.r(p)); this._in(s.val()); return s.val(); }
  onValue(p, cb) {
    return this.D.onValue(this.r(p), s => { this._in(s.val()); cb(s.val()); }, e => console.warn('읽기 거부:', p, e.message));
  }
  onChildren(p, h) {
    const ref = this.r(p), u = [], D = this.D;
    const wrap = f => s => { this._in(s.val()); f(s.key, s.val()); };
    if (h.added) u.push(D.onChildAdded(ref, wrap(h.added)));
    if (h.changed) u.push(D.onChildChanged(ref, wrap(h.changed)));
    if (h.removed) u.push(D.onChildRemoved(ref, s => h.removed(s.key)));
    return () => u.forEach(f => f());
  }
  onDisconnectSet(p, v) { this.D.onDisconnect(this.r(p)).set(v); }
  onDisconnectRemove(p) { this.D.onDisconnect(this.r(p)).remove(); }
  onDisconnectCancel(p) { this.D.onDisconnect(this.r(p)).cancel(); }
  onConnection(cb) { return this.D.onValue(this.r('.info/connected'), s => cb(!!s.val())); }
  now() { return Date.now() + this.offset; }
}
