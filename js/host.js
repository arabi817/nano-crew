// 교사 호스트 화면. 1단계: 방 만들기, QR, 접속자 목록, 시작, 내보내기, 판 종료
// ※ 게임 중 학생 위치는 절대 받지도, 보여 주지도 않아요.
import { createDB } from './net/db.js';
import { P, createRoom, isBot } from './net/room.js';
import { COLORS, nickOf, nickKey } from './common/colors.js';
import { avatarSVG } from './player/avatarSvg.js';
import { findPos } from './net/posSync.js';
import { STAGE1_TASKS } from './missions/index.js';
import { $, esc } from './common/util.js';

let db, code = null, players = {}, done = {}, unsubs = [];

boot();
async function boot() {
  try { db = await createDB(); } catch (e) { $('#start-msg').textContent = '서버 연결 실패: ' + e.message; return; }
  const badge = $('#mode-badge'); badge.hidden = false;
  if (db.mode === 'firebase') { badge.textContent = '온라인 서버 연결됨'; badge.classList.add('online'); }
  const last = localStorage.getItem('nc_host_room');
  if (last) {
    const m = await db.get(P.meta(last));
    if (m && m.hostUid === db.uid) { const b = $('#btn-resume'); b.hidden = false; b.textContent = `이어서 하기 (방 ${last})`; b.onclick = () => openRoom(last); }
  }
  $('#btn-new').onclick = async () => {
    $('#btn-new').disabled = true;
    try { openRoom(await createRoom(db)); } catch (e) { $('#start-msg').textContent = e.message; $('#btn-new').disabled = false; }
  };
}

function studentURL() {
  const u = new URL('index.html', location.href);
  u.search = ''; u.searchParams.set('room', code);
  if (db.mode === 'local') u.searchParams.set('local', '1');
  return u.toString();
}

function openRoom(c) {
  code = c; localStorage.setItem('nc_host_room', c);
  document.body.dataset.view = 'room';
  $('#h-code').textContent = c; $('#qr-code').textContent = c;
  const url = studentURL();
  $('#qr-url').textContent = url;
  if (db.mode === 'local') { $('#qr').hidden = true; $('#qr-local').hidden = false; }
  else drawQR(url);
  $('#btn-open-student').onclick = () => window.open(url, '_blank', 'noopener');
  $('#btn-bots').onclick = () => {
    const u = new URL('bots.html', location.href); u.searchParams.set('room', code);
    if (db.mode === 'local') u.searchParams.set('local', '1');
    window.open(u.toString(), '_blank', 'noopener');
  };
  $('#btn-start').onclick = () => db.update(P.meta(code), { state: 'playing', startedAt: db.now() });
  $('#btn-lobby').onclick = () => db.update(P.meta(code), { state: 'lobby' });
  $('#btn-end').onclick = endRoom;

  unsubs.push(db.onValue(P.meta(code), m => {
    if (!m) { leave('방이 삭제됐어요'); return; }
    document.body.dataset.phase = m.state;
    $('#h-phase').textContent = m.state === 'playing' ? '게임 중' : '대기 중';
  }));
  unsubs.push(db.onValue(P.players(code), v => { players = v || {}; renderRoster(); renderProgress(); }));
  unsubs.push(db.onValue(P.done(code), v => { done = v || {}; renderProgress(); }));
}

function renderRoster() {
  const list = Object.entries(players).sort((a, b) => (a[1].c - b[1].c) || (a[1].n - b[1].n));
  const real = list.filter(([id]) => !isBot(id)), bots = list.length - real.length;
  const online = list.filter(([, p]) => p.on !== false).length;
  $('#roster-count').textContent = `${real.length}명` + (bots ? ` + 봇 ${bots}` : '');
  $('#st-online').textContent = online;
  $('#roster').innerHTML = list.map(([id, p]) => `
    <div class="r-card ${p.on === false ? 'off' : ''} ${isBot(id) ? 'bot' : ''}">
      ${avatarSVG(COLORS[p.c]?.hex || '#999', p.hat || 0, 64)}
      <div class="nm">${esc(nickOf(p))}</div>
      <button class="r-kick" data-id="${esc(id)}" title="내보내기">X</button>
    </div>`).join('');
  $('#roster').querySelectorAll('.r-kick').forEach(b => b.onclick = () => kick(b.dataset.id));
}

function renderProgress() {
  const real = Object.keys(players).filter(id => !isBot(id));
  const total = real.length * STAGE1_TASKS.length;
  let n = 0; real.forEach(id => { n += Object.keys(done[id] || {}).length; });
  const r = total ? n / total : 0;
  $('#bp-fill').style.width = Math.round(r * 100) + '%';
  $('#bp-num').textContent = Math.round(r * 100) + '%';
}

async function kick(id) {
  const p = players[id]; if (!p) return;
  if (!confirm(`${nickOf(p)}을(를) 방에서 내보낼까요?`)) return;
  const upd = { [`players/${id}`]: null, [`nicks/${nickKey(p.c, p.n)}`]: null, [`done/${id}`]: null };
  const at = await findPos(db, P.pos(code), id);
  if (at) upd[`pos/${at.zone}/${id}`] = null;
  db.update(P.room(code), upd);
}

async function endRoom() {
  if (!confirm('판을 끝낼까요? 이 방의 데이터가 모두 지워져요.')) return;
  await db.remove(P.room(code));
}

function leave(msg) {
  unsubs.forEach(u => u()); unsubs = [];
  localStorage.removeItem('nc_host_room');
  document.body.dataset.view = 'start'; $('#btn-resume').hidden = true; $('#btn-new').disabled = false;
  $('#start-msg').textContent = msg;
}

function drawQR(text) {
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), cell = 10, m = 3, cv = $('#qr');
  cv.width = cv.height = (n + m * 2) * cell;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#1a1018';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + m) * cell, (r + m) * cell, cell, cell);
}
