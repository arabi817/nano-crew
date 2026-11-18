// 교사 TV 화면. 판정은 Judge(js/host/judge.js)가 하고, 여기서는 보여 주기와 교사 버튼만 맡아요.
// ※ 게임 중 학생 위치는 절대 보여 주지 않아요. (판정용으로만 받아요)
import { createDB } from './net/db.js';
import { P, createRoom, isBot } from './net/room.js';
import { COLORS, nickOf, nickKey } from './common/colors.js';
import { avatarSVG } from './player/avatarSvg.js';
import { findPos } from './net/posSync.js';
import { Judge } from './host/judge.js';
import { settingsOf } from './common/rules.js';
import { chatHTML, callerText, avatarOf, PHASE_NAME } from './game/shared.js';
import { openSheet } from './ui/panel.js';
import { sfx, setMuted, muted } from './common/sfx.js';
import { $, esc } from './common/util.js';

let db, code = null, judge = null, lastMeetPhase = '', lastState = '';

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
  document.addEventListener('pointerdown', () => sfx('none'), { once: true });
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
  if (db.mode === 'local') { $('#qr').hidden = true; $('#qr-local').hidden = false; } else drawQR(url);
  $('#btn-open-student').onclick = () => window.open(url, '_blank', 'noopener');
  $('#btn-bots').onclick = () => {
    const u = new URL('bots.html', location.href); u.searchParams.set('room', code);
    if (db.mode === 'local') u.searchParams.set('local', '1');
    window.open(u.toString(), '_blank', 'noopener');
  };
  judge = new Judge(db, code, render);
  judge.start();
  $('#btn-start').onclick = async () => { try { await judge.startGame(); } catch (e) { alertSheet(e.message); } };
  $('#btn-again').onclick = () => judge.resetToLobby();
  $('#btn-pause').onclick = () => judge.togglePause();
  $('#btn-force').onclick = () => judge.forceMeeting();
  $('#btn-people').onclick = openPeople;
  $('#btn-end').onclick = endRoom;
  $('#btn-mute').onclick = () => { setMuted(!muted); $('#btn-mute').textContent = muted ? '소리 꺼짐' : '소리 켜짐'; };
  setInterval(tickTime, 250);
}

// ───── 화면 그리기 ─────
let rafPending = false;
function render() { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; draw(); }); }
function draw() {
  const m = judge.meta;
  if (!m) { leave('방이 삭제됐어요'); return; }
  const g = judge.game, meeting = g.meeting;
  const hv = m.state === 'lobby' ? 'lobby' : m.state === 'ended' ? 'ended' : meeting ? 'meet' : 'play';
  document.body.dataset.hv = hv;
  $('#h-phase').textContent = { lobby: '대기 중', play: m.paused ? '일시정지' : '게임 중', meet: '회의 중', ended: '게임 끝' }[hv];
  $('#btn-pause').textContent = m.paused ? '다시 시작' : '일시정지';
  if (m.state !== lastState) { if (m.state === 'playing') sfx('start'); lastState = m.state; }
  if (hv === 'lobby') drawRoster();
  if (hv === 'play') drawPlay();
  if (hv === 'meet') drawMeeting(meeting);
  if (hv === 'ended') drawEnd();
}

function drawRoster() {
  const players = judge.players;
  const list = Object.entries(players).sort((a, b) => (a[1].c - b[1].c) || (a[1].n - b[1].n));
  const real = list.filter(([id]) => !isBot(id)), bots = list.length - real.length;
  $('#roster-count').textContent = `${real.length}명` + (bots ? ` + 봇 ${bots}` : '');
  $('#roster').innerHTML = list.map(([id, p]) => `
    <div class="r-card ${p.on === false ? 'off' : ''} ${isBot(id) ? 'bot' : ''}">
      ${avatarSVG(COLORS[p.c]?.hex || '#999', p.hat || 0, 64)}
      <div class="nm">${esc(nickOf(p))}</div>
      <button class="r-kick" data-id="${esc(id)}" title="내보내기">X</button>
    </div>`).join('');
  $('#roster').querySelectorAll('.r-kick').forEach(b => b.onclick = () => kick(b.dataset.id));
}

function drawPlay() {
  const s = settingsOf(judge.meta), g = judge.game;
  const show = s.progress !== 'hidden';
  $('#bp-box').style.visibility = show ? '' : 'hidden';
  const p = s.progress === 'always' ? judge.progress() : (g.progress || { d: 0, t: 0 });
  const r = p.t ? p.d / p.t : 0;
  $('#bp-fill').style.width = Math.round(r * 100) + '%'; $('#bp-num').textContent = Math.round(r * 100) + '%';
  $('#bp-note').textContent = s.progress === 'meeting' ? '진행 바는 회의 때만 바뀌어요' : '';
  $('#st-imp').textContent = judge.impLeft();
  $('#st-alive').textContent = judge.ids().filter(id => judge.alive(id)).length;
}

function drawMeeting(m) {
  const players = judge.players, g = judge.game, cur = judge.cur;
  if (lastMeetPhase !== `${m.id}${m.phase}`) {
    if (m.phase === 'ox' && !lastMeetPhase.startsWith(String(m.id))) sfx('alarm');
    if (m.phase === 'result') setTimeout(() => showEject(m), 2600); else $('#hm-eject').classList.remove('on');
    lastMeetPhase = `${m.id}${m.phase}`;
  }
  $('#hm-title').textContent = m.body ? '쓰러진 대원 발견!' : '긴급 회의!';
  $('#hm-phase').textContent = PHASE_NAME[m.phase] || '';
  $('#hm-who').textContent = callerText(m, players);
  const voters = judge.aliveVoters();
  if (m.phase === 'ox') $('#hm-ox').innerHTML = `<div class="hox-q">${esc(m.q.text)}</div><div class="hox-sub">O / X 를 패드에서 고르세요 · 답한 사람 ${Object.keys(cur.ans).length}명</div>`;
  else {
    const nRight = voters.filter(id => cur.right[id]).length;
    $('#hm-ox').innerHTML = `<div class="hox-q small">${esc(m.q.text)} <b>정답 ${esc(m.qa || '')}</b></div><div class="hox-sub">이번 회의 투표권: ${nRight}명 / 살아 있는 대원 ${voters.length}명</div>`;
  }
  const ids = judge.ids().filter(id => players[id]);
  ids.sort((a, b) => (g.dead?.[a] ? 1 : 0) - (g.dead?.[b] ? 1 : 0) || players[a].c - players[b].c || players[a].n - players[b].n);
  const counts = m.result?.counts || {};
  $('#hm-grid').innerHTML = ids.map(id => {
    const dead = !!g.dead?.[id], n = counts[id] || 0;
    return `<div class="hm-card ${dead ? 'dead' : ''}">${avatarOf(players[id], 48)}<span>${esc(nickOf(players[id]))}</span>
      ${dead ? '<i class="tag">유령</i>' : ''}${m.phase === 'vote' && cur.vote[id] ? '<i class="tag ok">투표함</i>' : ''}
      ${m.phase === 'result' && n ? `<i class="tag cnt">${n}표</i>` : ''}</div>`;
  }).join('') + (m.phase === 'result' ? `<div class="hm-card skip">건너뛰기 <b>${counts.skip || 0}표</b></div>` : '');
  const chat = $('#hm-chat');
  chat.innerHTML = chatHTML(cur.chat, players) || '<div class="chat-empty">패드에서 고른 문장이 여기에 나와요. 말로 토론해도 돼요.</div>';
  chat.scrollTop = chat.scrollHeight;
}

function showEject(m) {
  const r = m.result; if (!r) return;
  const p = judge.players[r.ejected], box = $('#hm-eject');
  let sub = '';
  if (r.ejected && r.wasImp !== undefined) sub = r.wasImp ? '임포스터였어요!' : '임포스터가 아니었어요';
  box.innerHTML = r.ejected
    ? `<div class="ej-fly">${avatarOf(p, 160)}</div><div class="ej-text">${esc(nickOf(p))}이(가) 추방됐어요</div><div class="ej-sub">${sub}</div>${r.impLeft !== undefined ? `<div class="ej-left">남은 임포스터 ${r.impLeft}명</div>` : ''}`
    : `<div class="ej-text">아무도 추방되지 않았어요</div><div class="ej-sub">${r.tie ? '표가 같았어요' : '건너뛰기가 가장 많았어요'}</div>`;
  box.classList.add('on'); sfx('eject');
}

function drawEnd() {
  const g = judge.game, w = g.winner; if (!w) return;
  if (!$('#ev-big').dataset.at || $('#ev-big').dataset.at !== String(w.at)) { $('#ev-big').dataset.at = w.at; sfx('win'); }
  $('#ev-big').textContent = w.team === 'imp' ? '임포스터 승리' : '크루원 승리';
  document.querySelector('.end-view').className = 'end-view hv-ended ' + w.team;
  $('#ev-reason').textContent = w.reason;
  const reveal = g.reveal || {}, players = judge.players;
  const ids = Object.keys(reveal).filter(id => players[id]).sort((a, b) => (reveal[a] === 'imp' ? 0 : 1) - (reveal[b] === 'imp' ? 0 : 1));
  $('#ev-grid').innerHTML = ids.map(id => `<div class="end-p ${reveal[id]}">${avatarOf(players[id], 64)}<span>${esc(nickOf(players[id]))}</span><small>${reveal[id] === 'imp' ? '임포스터' : '크루원'}${g.ejected?.[id] ? ' · 추방' : g.dead?.[id] ? ' · 쓰러짐' : ''}</small></div>`).join('');
}

function tickTime() {
  const m = judge?.game?.meeting; if (!m) return;
  const left = Math.max(0, Math.ceil((m.endsAt - db.now()) / 1000));
  $('#hm-time').textContent = m.phase === 'result' ? '' : (db.now() < (m.startAt || 0) ? '소집 중' : `${left}초`);
}

// ───── 교사 버튼 ─────
function openPeople() {
  const players = judge.players;
  const ids = Object.keys(players).sort((a, b) => players[a].c - players[b].c || players[a].n - players[b].n);
  openSheet({
    title: '참가자 (역할은 안 보여요)',
    html: `<div class="people">${ids.map(id => `<div class="pp ${judge.game.dead?.[id] ? 'dead' : ''}">${avatarOf(players[id], 40)}<span>${esc(nickOf(players[id]))}</span><button class="r-kick-b press" data-id="${esc(id)}">내보내기</button></div>`).join('')}</div>`,
    onMount: (ov, close) => ov.querySelectorAll('.r-kick-b').forEach(b => b.onclick = async () => { close(); await kick(b.dataset.id); }),
  });
}

async function kick(id) {
  const p = judge.players[id]; if (!p) return;
  if (!confirm(`${nickOf(p)}을(를) 방에서 내보낼까요?`)) return;
  judge.onKicked(id);
  const upd = { [`players/${id}`]: null, [`nicks/${nickKey(p.c, p.n)}`]: null };
  const at = await findPos(db, P.pos(code), id);
  if (at) upd[`pos/${at.zone}/${id}`] = null;
  db.update(P.room(code), upd);
}

async function endRoom() {
  if (!confirm('판을 끝낼까요? 이 방의 데이터가 모두 지워져요.')) return;
  judge?.stop(); judge = null;
  await db.remove(P.room(code));
  leave('방을 지웠어요');
}

function leave(msg) {
  judge?.stop(); judge = null;
  localStorage.removeItem('nc_host_room');
  document.body.dataset.view = 'start'; $('#btn-resume').hidden = true; $('#btn-new').disabled = false;
  $('#start-msg').textContent = msg;
}

function alertSheet(text) { openSheet({ title: '알림', html: `<p class="sheet-p">${esc(text)}</p>` }); }

function drawQR(text) {
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), cell = 10, m = 3, cv = $('#qr');
  cv.width = cv.height = (n + m * 2) * cell;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#1a1018';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + m) * cell, (r + m) * cell, cell, cell);
}
