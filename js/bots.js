// 가짜 접속자(봇). 실제 학생처럼 방을 돌아다니며 위치를 보내요 → 32명일 때 부드러운지, 사용량은 얼마인지 확인.
// Firebase 모드에서는 교사 화면과 같은 브라우저(같은 계정)여야 보안 규칙을 통과해요.
import { createDB } from './net/db.js';
import { P, spawnOrder } from './net/room.js';
import { PosSender } from './net/posSync.js';
import { COLORS, MAX_NUM, nickKey } from './common/colors.js';
import { ROOMS, LOBBY, randomPointIn, spawnPoint, route, nearestRoomId, zoneAt, nearZones } from './map/map.js';
import { NET } from '../config.js';
import { $ } from './common/util.js';
import { CONTENT } from '../data/content.js';

const SPEED = 270;
let db, code, bots = [], phase = 'lobby', players = {}, timer = 0, unsubs = [];
const rooms = ROOMS.filter(r => !r.lobby).map(r => r.id);

class Bot {
  constructor(id, c, n) {
    Object.assign(this, { id, c, n, x: 0, y: 0, face: 1, path: [], wait: Math.random() * 3000 });
    this.sender = new PosSender(db, P.pos(code), id, NET.sendHz, { removeOnDisconnect: true, onSend: countSend });
    this.sender.last = -Math.random() * 1000; // 봇마다 보내는 때를 흩어 놓기
  }
  place(p) { this.x = p.x; this.y = p.y; this.path = []; this.wait = 500 + Math.random() * 2500; this.sender.tick(performance.now(), this.x, this.y, this.face, false, true); }
  plan() {
    if (phase === 'lobby') this.path = [randomPointIn(LOBBY, 120)];
    else {
      let to; do { to = rooms[Math.floor(Math.random() * rooms.length)]; } while (rooms.length > 1 && to === nearestRoomId(this.x, this.y));
      this.path = route(nearestRoomId(this.x, this.y), to);
    }
  }
  step(dt, now) {
    if (game.meeting || phase === 'ended') return; // 회의 중엔 멈춤
    if (!this.path.length) {
      this.wait -= dt; if (this.wait <= 0) this.plan();
      this.sender.tick(now, this.x, this.y, this.face, false); return;
    }
    const t = this.path[0], dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy), s = SPEED * dt / 1000;
    if (Math.abs(dx) > 2) this.face = dx < 0 ? -1 : 1;
    if (d <= s) { this.x = t.x; this.y = t.y; this.path.shift(); if (!this.path.length) this.wait = 800 + Math.random() * 4000; }
    else { this.x += dx / d * s; this.y += dy / d * s; }
    this.sender.tick(now, this.x, this.y, this.face, true);
  }
}

boot();
async function boot() {
  db = await createDB();
  $('#mode-badge').hidden = db.mode !== 'local';
  $('#room').value = new URLSearchParams(location.search).get('room') || '';
  $('#btn-go').onclick = start;
  $('#btn-stop').onclick = () => stop(false);
}

async function start() {
  code = $('#room').value.trim();
  const want = Math.max(1, Math.min(31, +$('#count').value || 30));
  const meta = await db.get(P.meta(code));
  if (!meta) return $('#warn').textContent = '그런 방이 없어요.';
  if (db.mode === 'firebase' && meta.hostUid !== db.uid) return $('#warn').textContent = '교사 화면을 연 브라우저에서 이 창을 열어 주세요 (보안 규칙 때문이에요).';
  $('#warn').textContent = ''; $('#btn-go').disabled = true; $('#btn-stop').disabled = false;
  phase = meta.state;
  const taken = (await db.get(P.nicks(code))) || {};
  const upd = {}; let i = 0;
  outer: for (let n = MAX_NUM; n >= 1; n--) for (let c = 0; c < COLORS.length; c++) {
    if (bots.length >= want) break outer;
    const k = nickKey(c, n); if (taken[k]) continue;
    const id = 'bot' + String(i++).padStart(2, '0');
    const b = new Bot(id, c, n); bots.push(b);
    upd[`players/${id}`] = { c, n, hat: Math.floor(Math.random() * 6), on: true, j: db.now() + i };
    upd[`nicks/${k}`] = id;
    [`players/${id}`, `nicks/${k}`].forEach(p => db.onDisconnectRemove(`${P.room(code)}/${p}`));
  }
  await db.update(P.room(code), upd);
  unsubs.push(db.onValue(P.players(code), v => { players = v || {}; }));
  players = (await db.get(P.players(code))) || {};
  placeAll();
  unsubs.push(db.onValue(P.meta(code), m => {
    if (!m) return stop(true);
    if (m.state !== phase) { phase = m.state; if (phase !== 'ended') placeAll(); }
  }));
  unsubs.push(db.onValue(P.game(code), g => onBotGame(g || {})));
  // 창이 뒤에 가려져도 느려지지 않게 '워커' 시계를 씀 (일반 타이머는 숨은 탭에서 1초에 1번으로 느려짐)
  let last = performance.now();
  const tick = () => { const now = performance.now(), dt = Math.min(200, now - last); last = now; bots.forEach(b => b.step(dt, now)); };
  try {
    const w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),50)'], { type: 'text/javascript' })));
    w.onmessage = tick; timer = { stop: () => w.terminate() };
  } catch { const id = setInterval(tick, 50); timer = { stop: () => clearInterval(id) }; }
  startStats();
}

// ── 회의에서 봇도 OX에 답하고(70% 정답) 투표해요 ──
let game = {}, handled = '';
function onBotGame(g) {
  const prevMeet = game.meeting; game = g;
  const m = g.meeting;
  if (!m && prevMeet) placeAll(); // 회의가 끝나면 회의실로
  if (!m) return;
  const key = `${m.id}:${m.phase}`; if (key === handled) return; handled = key;
  const alive = bots.filter(b => !g.dead?.[b.id] && g.members?.[b.id]);
  const base = P.meet(code, m.id);
  if (m.phase === 'ox') {
    const ans = CONTENT.ox[m.q.i]?.a, wait = Math.max(0, m.startAt - db.now());
    alive.forEach(b => setTimeout(() => {
      const a = Math.random() < 0.7 ? ans : (ans === 'O' ? 'X' : 'O');
      db.set(`${base}/ans/${b.id}`, a);
    }, wait + 1000 + Math.random() * 6000));
  }
  if (m.phase === 'vote') {
    db.get(`${base}/right`).then(right => {
      const targets = Object.keys(g.members || {}).filter(id => !g.dead?.[id]);
      alive.filter(b => right?.[b.id]).forEach(b => setTimeout(() => {
        const v = Math.random() < 0.4 ? 'skip' : targets[Math.floor(Math.random() * targets.length)];
        db.set(`${base}/vote/${b.id}`, v);
      }, 2000 + Math.random() * 15000));
    });
  }
}

function placeAll() {
  const order = spawnOrder(players);
  bots.forEach(b => b.place(phase === 'playing' ? spawnPoint(Math.max(0, order.indexOf(b.id)), order.length) : randomPointIn(LOBBY, 120)));
}

async function stop(roomGone) {
  timer?.stop?.(); timer = null; unsubs.forEach(u => u()); unsubs = [];
  if (!roomGone && bots.length) {
    const upd = {};
    bots.forEach(b => {
      upd[`players/${b.id}`] = null; upd[`nicks/${nickKey(b.c, b.n)}`] = null;
      if (b.sender.zone) upd[`pos/${b.sender.zone}/${b.id}`] = null;
    });
    await db.update(P.room(code), upd);
  }
  bots = []; $('#btn-go').disabled = false; $('#btn-stop').disabled = true;
  $('#stats').textContent = roomGone ? '방이 삭제돼서 봇이 빠졌어요.' : '봇을 모두 뺐어요.';
}

// ── 사용량 추정 ──
// 위치 한 번을 학생 한 명이 받을 때 약 MSG_BYTES 바이트 (Firebase 포장·암호화 포함 어림값)
const MSG_BYTES = 115;
let sent = 0, heard = 0;
function countSend(zone) {
  sent++;
  // 이 위치를 받는 사람 = 내 구역이 이 구역 근처인 봇들 (봇들이 학생처럼 흩어져 있다고 보고 셈)
  let n = 0; for (const b of bots) if (nearZones(zoneAt(b.x, b.y)).has(zone)) n++;
  heard += bots.length ? n / bots.length : 1;
}
let statT = 0;
function startStats() {
  clearInterval(statT);
  let ls = sent, lh = heard, lt = performance.now();
  statT = setInterval(() => {
    if (!bots.length) return clearInterval(statT);
    const now = performance.now(), dt = (now - lt) / 1000;
    const msgs = (sent - ls) / dt, got = (heard - lh) / dt;
    ls = sent; lh = heard; lt = now;
    const mb = perSec => perSec * MSG_BYTES * 600 / 1024 / 1024; // 10분 동안 MB
    const all = mb(msgs) * 32, zoned = mb(got) * 32;
    $('#stats').innerHTML = `봇 <b>${bots.length}</b>명 · 상태 <b>${phase === 'playing' ? '게임 중' : '대기실'}</b><br>
      봇이 보내는 위치: <b>${msgs.toFixed(0)}</b>회/초 (한 명당 ${(msgs / bots.length).toFixed(1)}회)<br>
      학생 한 명이 받는 위치: <b>${got.toFixed(0)}</b>회/초 (구역 나누기 전이면 ${msgs.toFixed(0)}회)<br>
      한 반 32명 10분(추정): <b>${zoned.toFixed(0)} MB</b> (구역 나누기 전이면 ${all.toFixed(0)} MB)<br>
      <small>※ 봇은 쉬지 않고 돌아다녀서 실제 수업보다 많게 나와요.</small>`;
  }, 2000);
}
