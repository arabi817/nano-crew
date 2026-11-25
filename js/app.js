// 학생 패드 화면의 흐름: 방 코드 → 닉네임(색+번호) → 대기실 → 게임
import { createDB } from './net/db.js';
import { P, spawnOrder, createRoom } from './net/room.js';
import { decodePos, findPos } from './net/posSync.js';
import { COLORS, NAME_MAX, nickOf, nickKey, checkName } from './common/colors.js';
import { avatarSVG } from './player/avatarSvg.js';
import { applyLogo } from './common/assets.js';
import { WorldScene } from './scenes/WorldScene.js';
import { Hud } from './ui/hud.js';
import { Joystick } from './ui/joystick.js';
import { openPanel, openSheet } from './ui/panel.js';
import { MISSIONS, SAB_FIX } from './missions/index.js';
import { SPOTS, SAB_SPOTS, VENTS, CCTV, useMap, MAP_ID, walkable, spawnPoint, lobbySpawn, roomAt, roomName, doorsOf, setBlockedDoors } from './map/map.js';
import { CONTENT } from '../data/content.js';
import { PLACES } from './game/shared.js';
import { sfx, unlockAudio } from './common/sfx.js';
import { $, esc } from './common/util.js';
import { ICON } from './ui/icons.js';
import { settingsOf, settingsHTML, VISION_NAME } from './common/rules.js';
import { MAP_NAME } from './map/map.js';
import { MeetingUI } from './game/meeting.js';
import { showRoleReveal, showKilled, showEnd, hideEnd, setPaused, fakeTask } from './game/screens.js';

const app = window.NC = {
  db: null, code: null, uid: null, players: {}, myPlayer: null, phase: 'lobby',
  tasks: [], done: {}, allDone: {}, panel: null, minimap: null, nearTask: null,
  scene: null, joy: null, hud: null, dpr: 1, startPos: null,
};

function show(id) { document.querySelectorAll('.screen-page').forEach(s => s.hidden = s.id !== id); }
function say(sel, text) { $(sel).textContent = text; }
function notice(title, text, btn = '처음으로') {
  $('#notice-title').textContent = title; $('#notice-text').textContent = text;
  $('#notice-btn').textContent = btn; $('#notice').hidden = false;
  $('#notice-btn').onclick = () => {   // 처음으로 (다른 학교 선생님 서버(srv)였다면 그대로 유지)
    const u = new URLSearchParams(); if (app.db?.mode === 'local') u.set('local', '1'); if (app.db?.server?.srv) u.set('srv', app.db.server.srv);
    location.href = location.pathname + (u.toString() ? '?' + u : '');
  };
}

boot();
async function boot() {
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
  try { app.db = await createDB(); }
  catch (e) { notice('연결 실패', '서버에 연결하지 못했어요. 선생님께 알려 주세요.\n' + e.message, '다시 시도'); return; }
  app.uid = app.db.uid;
  $('#mode-badge').hidden = app.db.mode !== 'local';
  const q = new URLSearchParams(location.search);
  const room = q.get('room') || '';
  $('#code-input').value = room;
  $('#code-form').onsubmit = e => { e.preventDefault(); tryCode($('#code-input').value.trim()); };
  // 첫 화면: 선생님과 함께하기 / 친구들끼리 하기(방 만들기 · 친구 방 들어가기)
  const step = id => ['join-choose', 'join-friends', 'code-form'].forEach(k => { $('#' + k).hidden = k !== id; });
  const codeStep = label => { $('#code-form .join-label').textContent = label; say('#code-msg', ''); step('code-form'); setTimeout(() => $('#code-input').focus(), 50); };
  $('#go-teacher').onclick = () => codeStep('선생님 방 코드');
  $('#go-friends').onclick = () => step('join-friends');
  $('#btn-friend-join').onclick = () => codeStep('친구 방 코드');
  document.querySelectorAll('.join-back').forEach(b => b.onclick = () => step('join-choose'));
  $('#btn-make').onclick = async () => {
    $('#btn-make').disabled = true; say('#make-msg', '방을 만드는 중...');
    try { const code = await createRoom(app.db, { free: true }); say('#make-msg', ''); tryCode(code); }
    catch (e) { say('#make-msg', '방을 만들지 못했어요. 다시 눌러 주세요'); $('#btn-make').disabled = false; }
  };
  show('page-join');
  if (room) { codeStep('방 코드'); tryCode(room); return; }   // 선생님 QR로 들어오면 바로
  // 새로고침·화면 꺼짐으로 나왔다면: 내가 있던 방으로 돌아가기 (방장이면 꼭 돌아가야 게임이 이어져요)
  try {
    const last = localStorage.getItem('nc_last_room'), lastSrv = localStorage.getItem('nc_last_srv') || '';
    if (last && lastSrv !== (app.db.server?.srv || '')) {   // 다른 서버의 방이었으면: 그 서버로 다시 열어서 돌아가기
      const b = $('#go-back-room'); b.hidden = false;
      b.innerHTML = `방 ${esc(last)}로 돌아가기<small>아까 있던 방</small>`;
      b.onclick = () => { const u = new URLSearchParams({ room: last }); if (lastSrv) u.set('srv', lastSrv); if (app.db.mode === 'local') u.set('local', '1'); location.href = location.pathname + '?' + u; };
    } else if (last && await app.db.get(P.player(last, app.uid))) {
      const m = await app.db.get(P.meta(last)), b = $('#go-back-room');
      if (m) {
        b.hidden = false;
        b.innerHTML = `방 ${esc(last)}로 돌아가기<small>${m.free && m.hostUid === app.uid ? '내가 방장인 방' : '아까 있던 방'}</small>`;
        b.onclick = () => { codeStep('방 코드'); tryCode(last); };
      }
    }
  } catch { }
}

async function tryCode(code) {
  if (!/^\d{4}$/.test(code)) return say('#code-msg', '방 코드 숫자 4개를 넣어 주세요');
  say('#code-msg', '확인하는 중...');
  let meta;
  try { meta = await app.db.get(P.meta(code)); } catch (e) { return say('#code-msg', '연결이 불안정해요. 다시 눌러 주세요'); }
  if (!meta) return say('#code-msg', '그런 방이 없어요. 코드를 다시 확인해 주세요');
  app.code = code;
  const me = await app.db.get(P.player(code, app.uid));
  if (me) { app.myPlayer = me; return enterGame(true); }
  openPicker();
}

function openPicker() {
  show('page-pick');
  const { db, code, uid } = app;
  let c = Math.floor(Math.random() * COLORS.length), taken = {};
  const input = $('#name-input');
  // 글자 수 제한(maxLength)은 일부 패드에서 한글 입력이 아예 안 되게 해서 쓰지 않아요. 8글자 넘으면 아래 안내 글로 알려요
  input.removeAttribute('maxlength');
  let composing = false, lastC = -1;
  try { input.value = localStorage.getItem('nc_last_name') || ''; } catch { }
  $('#color-grid').innerHTML = COLORS.map((col, i) =>
    `<button class="swatch press" data-c="${i}" style="--sw:${col.hex}"><span>${col.name}</span></button>`).join('');
  const problem = () => {
    const name = input.value.trim();
    const bad = checkName(name); if (bad) return bad;
    const owner = taken[nickKey(name)];
    if (owner && owner !== uid) return '이미 다른 친구가 쓰는 이름이에요';
    return null;
  };
  function render() {
    if (c !== lastC) {   // 색을 바꿀 때만 그림을 다시 그려요 (친구가 들어올 때마다 다시 그리지 않게)
      lastC = c;
      document.querySelectorAll('.swatch').forEach(b => b.classList.toggle('sel', +b.dataset.c === c));
      $('#pick-preview').innerHTML = avatarSVG(COLORS[c].hex, 0, 150);
    }
    const name = input.value.trim();
    $('#pick-name').textContent = name || '이름을 지어 주세요';
    const p = name ? problem() : null;
    say('#pick-msg', p || '');
    $('#pick-go').disabled = !name || !!p;
  }
  // 한글 조합 중(ㄱ→가→각)에는 화면을 건드리지 않아요. 친구 32명이 한꺼번에 들어오면 이름 목록이 계속 바뀌거든요
  const unsub = db.onValue(P.nicks(code), v => { taken = v || {}; if (!composing) render(); });
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; render(); });
  input.oninput = () => { if (!composing) render(); else $('#pick-name').textContent = input.value.trim(); };
  input.onkeydown = e => { if (e.key === 'Enter' && !$('#pick-go').disabled) $('#pick-go').click(); };
  $('#color-grid').onclick = e => { const b = e.target.closest('.swatch'); if (!b) return; sfx('click'); c = +b.dataset.c; render(); };
  $('#pick-go').onclick = async () => {
    const name = input.value.trim();
    if (problem()) return render();
    $('#pick-go').disabled = true; say('#pick-msg', '');
    const k = nickKey(name);
    try {
      const cur = await db.get(P.nick(code, k));
      if (cur && cur !== uid) throw new Error('taken');
      const me = { c, name, hat: 0, on: true, j: db.now() };
      await db.update(P.room(code), { [`nicks/${k}`]: uid, [`players/${uid}`]: me });
      try { localStorage.setItem('nc_last_name', name); } catch { }
      unsub(); app.myPlayer = me; enterGame(false);
    } catch (e) {
      say('#pick-msg', '방금 다른 친구가 같은 이름을 썼어요. 다른 이름을 지어 주세요'); $('#pick-go').disabled = false;
    }
  };
  render();
  setTimeout(() => input.focus(), 100);
}

function defaultStart(phase) {
  if (phase === 'playing') {
    const order = spawnOrder(app.players), i = Math.max(0, order.indexOf(app.uid));
    return spawnPoint(i, order.length);
  }
  return lobbySpawn();
}
// 저장된 위치가 지금 상태(대기실/게임)와 맞으면 그 자리에서 다시 시작
app.getStartPos = () => {
  const p = app.startPos, r = p && roomAt(p.x, p.y);
  const ok = p && (app.phase === 'lobby' ? r?.lobby : !r?.lobby);
  return ok ? p : defaultStart(app.phase);
};

async function enterGame(rejoin) {
  const { db, code, uid } = app;
  const [pos, meta, players, done] = await Promise.all([
    findPos(db, P.pos(code), uid), db.get(P.meta(code)), db.get(P.players(code)), db.get(P.doneOf(code, uid)),
  ]);
  if (!meta) return notice('방이 없어요', '판이 끝난 방이에요.');
  app.phase = meta.state; app.players = players || {}; app.done = done || {};
  app.myPlayer = app.players[uid] || app.myPlayer;
  app.myColor = COLORS[app.myPlayer.c].hex;
  app.startPos = decodePos(pos?.enc);
  localStorage.setItem('nc_last_room', code);
  try { localStorage.setItem('nc_last_srv', app.db.server?.srv || ''); } catch { }   // 어느 서버의 방이었는지

  app.meta = meta;
  useMap(settingsOf(meta).map);
  if (meta.free && meta.hostUid === uid) await startHostJudge();   // 친구들끼리 하기: 내가 방장이면 이 패드가 심판
  [app.game, app.priv] = await Promise.all([db.get(P.game(code)), db.get(P.privOf(code, uid))]);
  app.game = app.game || {};

  show('page-game');
  app.hud = new Hud(app);
  app.joy = new Joystick($('#joy-zone'));
  app.hud.setPhase(app.phase === 'ended' ? 'playing' : app.phase);
  refreshTasks();
  try { await document.fonts.load('20px Jua'); } catch { }
  startPhaser();

  db.onConnection(ok => {
    app.hud.setConn(ok);
    app.connected = ok;
    if (ok) { db.onDisconnectSet(P.player(code, uid) + '/on', false); db.update(P.player(code, uid), { on: true }).catch(() => { }); }
  });
  db.onValue(P.meta(code), onMeta);
  db.onValue(P.players(code), v => {
    app.players = v || {};
    if (!app.players[uid]) {
      // 판 종료로 방이 통째로 지워진 건지, 나만 내보내진 건지 구분
      db.get(P.meta(code)).then(m => m ? kicked() : ended()).catch(() => ended());
      return;
    }
    app.myPlayer = app.players[uid]; app.myColor = COLORS[app.myPlayer.c].hex;
    // 와이파이가 잠깐 끊겼다 붙으면, 서버가 늦게 '나감(on:false)'으로 바꿔 놓을 때가 있어요 → 다른 친구 화면에 내가 투명하게 보임.
    // 연결돼 있는데 내가 '나감'으로 되어 있으면 바로 되돌려요
    if (app.myPlayer.on === false && app.connected !== false) app.db.update(P.player(code, uid), { on: true }).catch(() => { });
    app.scene?.syncPlayers(app.players);
    app.hud.setLobby(Object.values(app.players).filter(p => p.on !== false).length);
    const hp = app.meta?.free && !app.judge && app.players[app.meta.hostUid];
    $('#host-gone').hidden = !hp || hp.on !== false;   // 친구들끼리 하기: 방장 패드가 꺼지면 알려 줘요
    renderHostBox();
  });
  db.onValue(P.doneOf(code, uid), v => { app.done = v || {}; refreshTasks(); });   // 내 것만 받아요 (예전엔 누가 미션 하나 끝낼 때마다 전원 목록을 32대가 다 받았어요)
  db.onValue(P.privOf(code, uid), v => { app.priv = v; refreshTasks(); maybeReveal(); });
  db.onValue(P.game(code), onGame);
  if (rejoin) app.hud.toast('다시 들어왔어요! 같은 캐릭터로 이어서 해요');
  if (new URLSearchParams(location.search).has('debug')) startDebug();
}

function startPhaser() {
  const el = $('#phaser');
  try { app.lite = localStorage.getItem('nc_lite') === '1'; } catch { }
  const dpr = app.dpr = app.lite ? 1 : Math.min(window.devicePixelRatio || 1, 2);   // 느린 패드는 일반 화질
  const W = el.clientWidth, H = el.clientHeight;
  app.game_ = new Phaser.Game({
    type: Phaser.AUTO, parent: el, width: W * dpr, height: H * dpr, backgroundColor: '#140c12',
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    input: { keyboard: true, mouse: false, touch: false }, banner: false,
  });
  app.game_.scene.add('world', WorldScene, true, { app }); // 장면이 켜지면 app.scene이 채워져요
  if (!app.onResize) addEventListener('resize', app.onResize = () => app.game_?.scale.resize(el.clientWidth * app.dpr, el.clientHeight * app.dpr));
}
// ───── CCTV: 혈관 관제실 모니터 (한 번 최대 10초, 한 판에 3번) ─────
const CAM_SEC = 10, CAM_MAX = 3;
function openCams() {
  if (app.cams || !app.scene?.ready) return;
  if (app.game?.sab?.kind === 'comms') return app.hud.toast('신경 신호가 끊겨 모니터 화면이 안 나와요');
  const key = `nc_cam_${app.code}_${app.meta?.startedAt}`;
  let used = 0; try { used = +sessionStorage.getItem(key) || 0; } catch { }
  if (used >= CAM_MAX) return app.hud.toast(`이번 판에는 모니터를 ${CAM_MAX}번 다 봤어요`);
  try { sessionStorage.setItem(key, used + 1); } catch { }
  const left = CAM_MAX - used - 1, alive = !app.amDead();
  const cams = CCTV.cams || [];
  const ov = document.createElement('div'); ov.className = 'cam-ov';
  ov.innerHTML = `<div class="cam-top"><b>혈관 관제실 모니터</b><span class="cam-time">${CAM_SEC}초</span><span class="cam-left">이번 판 남은 횟수 ${left}번</span>
      <button class="mpanel-x press" aria-label="닫기">${ICON.close}</button></div>
    <div class="cam-help">복도 카메라 화면이에요. <b>누가 어디로 가는지</b> 지켜보고, 회의 때 "○○실 앞 복도에서 △△를 봤어요"처럼 증거로 말해요.
      보는 동안 복도 카메라에 <b class="red">빨간 불</b>이 켜져서 다른 친구들도 누가 보고 있는지 알아요.</div>
    <div class="cam-tiles">${cams.map(c => `<div class="cam-tile"><span>${esc(c.name)}</span><i class="cam-rec">REC</i></div>`).join('')}</div>`;
  document.body.appendChild(ov);
  document.body.classList.add('watching-cams');
  app.joy?.reset();
  app.scene.startCams(ov.querySelector('.cam-top').offsetHeight + ov.querySelector('.cam-help').offsetHeight);   // 카메라 칸은 안내 글 아래부터
  if (alive) app.db.set(visPath(), 'cams');   // 다른 사람 눈에 카메라 빨간 불 (유령이 볼 땐 안 켜져요)
  const end = app.db.now() + CAM_SEC * 1000;
  const t = setInterval(() => {
    const s = Math.max(0, Math.ceil((end - app.db.now()) / 1000));
    ov.querySelector('.cam-time').textContent = `${s}초`;
    if (s <= 0 || app.game?.sab?.kind === 'comms') close();
  }, 250);
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    clearInterval(t); ov.remove(); document.body.classList.remove('watching-cams');
    app.scene?.stopCams(); if (alive) app.db.remove(visPath());
    app.cams = null;
  }
  ov.querySelector('.mpanel-x').onclick = () => { sfx('click'); close(); };
  app.cams = { close };
}

// ───── 친구들끼리 하기: 방장 패드 ─────
// 심판(js/host/judge.js)은 방장 패드에서만 불러와요 → 다른 학생 패드에는 OX 정답이 가지 않아요
async function startHostJudge() {
  if (app.judge) return;
  const { Judge } = await import('./host/judge.js');
  app.judge = new Judge(app.db, app.code, () => renderHostBox());
  app.judge.start();
}
function renderHostBox() {
  const box = $('#host-box'), J = app.judge;
  const st = app.meta?.state;
  if (!J || !app.meta || st === 'playing') { box.hidden = true; return; }
  box.hidden = false;
  if (st === 'ended') {
    box.innerHTML = `<button class="btn btn-yellow press hb-go" data-a="again">다시 하기 (대기실로)</button>`;
  } else {
    const s = settingsOf(app.meta), n = Object.values(app.players).filter(p => p.on !== false).length;
    box.innerHTML = `<div class="hb-code">방 코드<b>${esc(app.code)}</b></div>
      <div class="hb-n">${n}명 들어옴</div>
      <div class="hb-set">바이러스 <button data-a="imp-">−</button><span>${s.imps}</span><button data-a="imp+">+</button></div>
      <button class="hb-tog" data-a="map">${esc(MAP_NAME[s.map] || '작은 맵')}</button>
      <button class="hb-tog" data-a="vision">시야 ${esc(VISION_NAME[s.vision] || '넓게')}</button>
      <button class="btn btn-yellow press hb-go" data-a="start">게임 시작</button>
      <div class="hb-note">나는 방장이에요 · 이 화면을 끄면 게임이 멈춰요 · 3명부터 시작할 수 있어요</div>`;
  }
  box.onclick = async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    sfx('click');
    const s = settingsOf(app.meta);
    if (a === 'imp-' || a === 'imp+') J.setSetting('imps', Math.max(1, Math.min(10, s.imps + (a === 'imp+' ? 1 : -1))));
    else if (a === 'map') J.setMap(s.map === 'big' ? 'small' : 'big');
    else if (a === 'vision') { const o = ['wide', 'normal', 'narrow']; J.setVision(o[(o.indexOf(s.vision) + 1) % 3]); }
    else if (a === 'again') J.resetToLobby();
    else if (a === 'start') { try { await J.startGame(); } catch (err) { app.hud.toast(err.message); } }
  };
}

// 느린 패드: 일반 화질 + 안개 가볍게 (한 번 느렸던 패드는 다음에도 처음부터 가볍게)
app.setLite = () => {
  if (app.lite || !app.game_) return;
  if (app.isFrozen() || !app.scene?.ready) return;   // 미션 창 등이 열려 있으면 다음에
  app.lite = true; try { localStorage.setItem('nc_lite', '1'); } catch { }
  // 화질은 게임 화면을 새로 만들 때만 바뀌어서, 지금 자리 그대로 조용히 다시 만들어요
  app.startPos = { x: app.scene.x, y: app.scene.y };
  app.scene = null; app.game_.destroy(true); app.game_ = null;
  startPhaser();
};
// 선생님이 대기실에서 맵을 바꾸면: 게임 화면을 새 맵으로 다시 만들어요 (새 대기실에서 시작)
function restartWorld() {
  if (!app.game_) return;
  app.minimap?.close(); closeOverlays();
  app.scene = null; app.startPos = null;
  app.game_.destroy(true); app.game_ = null;
  startPhaser();
  app.hud.toast(`맵이 바뀌었어요: ${settingsOf(app.meta).map === 'big' ? '넓은 맵' : '작은 맵'}`);
}

app.onSceneReady = () => { refreshTasks(); app.scene.setBodies(app.game.bodies); onSab(app.game.sab); maybeReveal(); };

// ───── 상태 바뀜 처리 ─────
function spawnTeleport() {
  if (!app.scene?.ready) return;
  const p = defaultStart('playing'); app.scene.teleport(p.x, p.y);
}

function onMeta(m) {
  if (!m) return ended();
  app.meta = m;
  if (useMap(settingsOf(m).map)) restartWorld();
  renderHostBox();
  $('#lobby-settings').innerHTML = settingsHTML(m);
  setPaused(!!m.paused && m.state === 'playing');
  const prev = app.phase; app.phase = m.state;
  if (prev === m.state) return;
  app.hud.setPhase(m.state === 'ended' ? 'playing' : m.state); refreshTasks();
  if (m.state !== 'ended') closeOverlays();
  if (m.state === 'lobby') {
    hideEnd(); app.meeting?.close(); app.meeting = null; app.priv = null; app.wasDead = false;
    if (app.scene?.ready) { const p = lobbySpawn(); app.scene.teleport(p.x, p.y); }
    app.hud.toast('대기실로 돌아왔어요');
  } else if (m.state === 'playing') {
    spawnTeleport(); sfx('start'); maybeReveal();
  }
}

function onGame(g) {
  const prev = app.game || {};
  app.game = g = g || {};
  // 회의 창 열고 닫기를 가장 먼저 (아래 다른 일에서 오류가 나도 투표 화면에 갇히지 않게)
  try { syncMeeting(g); } catch (e) { console.error(e); }
  try { onGameRest(g, prev); } catch (e) { console.error(e); }
}
function syncMeeting(g) {
  if (g.meeting) {
    if (!app.meeting) { closeOverlays(); document.querySelectorAll('.meet').forEach(el => el.remove()); app.meeting = new MeetingUI(app); }
    app.meeting.update(g.meeting);
  } else if (app.meeting || document.querySelector('.meet')) {
    app.meeting?.close(); app.meeting = null;
    document.querySelectorAll('.meet').forEach(el => el.remove());   // 혹시 남은 회의 창도 정리
    if (app.phase === 'playing') { spawnTeleport(); app.hud.toast(app.amDead() ? '유령으로 미션을 계속하세요' : '회의가 끝났어요. 다시 탐사 시작!'); }
  }
}
function onGameRest(g, prev) {
  const uid = app.uid;
  app.scene?.setBodies?.(g.bodies);
  maybeReveal();   // 역할 화면: 게임 정보가 늦게 와도 뜨게
  if (JSON.stringify(g.sab || null) !== JSON.stringify(prev.sab || null)) onSab(g.sab);
  // 내가 쓰러짐
  if (g.dead?.[uid] && !app.wasDead) {
    app.wasDead = true;
    if (!g.ejected?.[uid] && app.phase === 'playing') { closeOverlays(); sfx('kill'); showKilled(avatarSVG(COLORS[app.myPlayer?.c]?.hex || '#999', app.myPlayer?.hat || 0, 150)); }
  }
  if (!g.dead?.[uid]) app.wasDead = false;
  // 진행 바
  const st = settingsOf(app.meta);
  app.hud.showProgress(st.progress !== 'hidden');
  if (g.progress) app.hud.setProgress(g.progress.t ? g.progress.d / g.progress.t : 0);
  // 승리
  if (g.winner && !prev.winner) {
    app.meeting?.close(); app.meeting = null; closeOverlays();
    const myWin = (g.winner.team === 'imp') === (app.priv?.role === 'imp');
    sfx(myWin ? 'win' : 'lose');
  }
  if (g.winner && g.reveal) showEnd({ winner: g.winner, reveal: g.reveal, players: app.players, myId: uid, myTasks: app.priv?.tasks, done: app.done, free: !!app.meta?.free });
  refreshTasks();
}

// 1초마다 확인: 게임에는 회의가 없는데 회의 창이 남아 있으면 닫기 (투표 화면에 갇힘 방지)
setInterval(() => { if (app.game && !app.game.meeting && (app.meeting || document.querySelector('.meet'))) { try { syncMeeting(app.game); } catch (e) { console.error(e); } } }, 1000);

function maybeReveal() {
  const m = app.meta, pv = app.priv;
  if (!m || m.state !== 'playing' || !pv?.role || !app.scene?.ready || app.revealing) return;
  const key = `nc_rv_${app.code}_${m.startedAt}`;
  if (sessionStorage.getItem(key)) return;
  // 게임 정보(revealUntil)가 역할보다 늦게 도착할 수 있어요 → 올 때까지 기다림 (예전엔 여기서 '이미 봄'으로 처리돼 역할 화면이 안 떴어요)
  if (!app.game?.revealUntil || app.game.revealUntil < m.startedAt) return;
  const now = app.db.now(), left = app.game.revealUntil - now;
  if (now - m.startedAt > 20000) { sessionStorage.setItem(key, 1); return; }   // 한참 뒤에 다시 들어온 경우만 건너뜀 (역할은 미션 목록 머리에도 나와요)
  sessionStorage.setItem(key, 1);
  app.revealing = true;
  showRoleReveal({ role: pv.role, mates: pv.mates || [], players: app.players, me: app.myPlayer, impCount: app.game.impCount, ms: Math.max(left, 3000) })
    .then(() => { app.revealing = false; });
}

function closeOverlays() { app.panel?.close(); app.minimap?.close(); app.sheet?.close(); app.cams?.close(); app.joy?.reset(); }
let leftShown = false;
function kicked() { if (leftShown) return; leftShown = true; closeOverlays(); app.meeting?.close(); app.game_?.destroy(true); notice('방에서 나왔어요', '선생님이 방에서 내보냈어요. 다시 들어가려면 방 코드를 넣어 주세요.'); }
function ended() { if (leftShown) return; leftShown = true; closeOverlays(); app.meeting?.close(); hideEnd(); app.game_?.destroy(true); notice('판이 끝났어요', `${app.meta?.free ? '방장이' : '선생님이'} 판을 끝냈어요. 수고했어요!`); }

function refreshTasks() {
  const list = app.priv?.tasks || [];
  const fake = app.priv?.role === 'imp';
  app.tasks = list.filter(id => MISSIONS[id]).map(id => {
    const M = MISSIONS[id], n = M.steps.length, step = fake ? 0 : Math.min(n, +app.done[id] || 0);
    const S = M.steps[Math.min(step, n - 1)];
    return { id, title: M.title, step, n, spot: S.spot, spots: S.spots, room: roomName(SPOTS[S.spot].room), done: step >= n };
  });
  app.hud?.setTasks(app.tasks, { fake, dead: app.amDead() });
  app.hud?.setRole(app.priv?.role, app.amDead());
  showSpectate(app.isSpectator());
  if (app.scene?.ready) {
    // 바이러스도 가짜 미션 장치가 빛나요 (그 앞에서 하는 척하며 섞이도록)
    const on = new Set(app.phase === 'playing' ? app.tasks.filter(t => !t.done).flatMap(t => t.spots) : []);
    Object.keys(SPOTS).forEach(id => app.scene.setSpotPending(id, on.has(id)));
  }
}

// ───── 사보타주 경보 ─────
let sabTimer = 0;
function onSab(sab) {
  const big = sab && (sab.kind === 'o2' || sab.kind === 'kidney');   // 못 막으면 지는 비상사태만 화면 테두리가 빨갛게
  document.body.classList.toggle('sab-comms', sab?.kind === 'comms');   // 신경 신호 끊김: 미션 목록 가리기
  setBlockedDoors(sab?.kind === 'clot' ? doorsOf(sab.room) : []);
  const mi = app.scene?.mapInfo;
  if (mi) {
    mi.setClot(sab?.kind === 'clot' ? sab.room : null);
    for (const [id, s] of Object.entries(SAB_SPOTS)) mi.sabSpots[id].setOn(!!sab && s.kind === sab.kind);
  }
  document.body.classList.toggle('sab-big', !!big);
  clearInterval(sabTimer);
  const box = $('#sab-banner');
  if (!sab) {
    box.hidden = true; $('#sab-line').hidden = true;
    if (app.sabPanel) { app.panel?.close(); app.sabPanel = false; }
    if (app.lastSabAt && app.phase === 'playing' && !app.game?.meeting && !app.game?.winner) app.hud?.toast('몸속 비상사태를 막았어요!');
    return;
  }
  if (sab.at !== app.lastSabAt) { app.lastSabAt = sab.at; sfx('alarm'); }
  box.hidden = false;
  const S = CONTENT.sabotage[sab.kind];
  const tick = () => {
    const left = Math.max(0, Math.ceil((sab.endsAt - app.db.now()) / 1000));
    const fixRoom = roomName(Object.values(SAB_SPOTS).find(s => s.kind === sab.kind)?.room);
    if (!sab.endsAt) {   // 시야 차단·신경 신호 끊김: 시간 없음
      box.innerHTML = `<b>${esc(S.name)}!</b> ${esc(S.guide)}`;
      const line = $('#sab-line'); line.hidden = false;
      line.innerHTML = `<b>${esc(fixRoom)}</b> ${esc(S.name)} 고치기` + (sab.kind === 'comms' ? '<br><small>신경 신호가 끊겨 미션 목록이 안 보여요</small>' : '');
      return;
    }
    box.innerHTML = sab.kind === 'clot'
      ? `<b>혈관 막힘</b> ${esc(roomName(sab.room))} 문이 막혔어요 · ${left}초`
      : `<b>${esc(S.name)}!</b> ${esc(MAP_ID === 'big' && S.guideBig || S.guide)} <span class="sab-time">${left}초</span>`;
    // 미션 목록 아래에도 빨간 항목으로 (어몽어스처럼)
    const line = $('#sab-line'); line.hidden = false;
    line.innerHTML = sab.kind === 'o2' ? `<b>${MAP_ID === 'big' ? '오른쪽·왼쪽 허파실' : '허파실·심장실'}</b> 산소 공급 버튼 동시에 누르기 (${left}초)`
      : sab.kind === 'kidney' ? `<b>콩팥실</b> 콩팥 정지 고치기 (${left}초)`
      : `<b>${esc(roomName(sab.room))}</b> 혈관 막힘 · 문 열릴 때까지 ${left}초`;
  };
  tick(); sabTimer = setInterval(tick, 250);
}

// ───── 버튼 ─────
// 구경꾼: 게임이 시작된 뒤에 들어와 역할·미션을 받지 못한 학생 (다음 판부터 참가)
app.isSpectator = () => app.phase === 'playing' && !!app.game?.members && !app.game.members[app.uid];
app.amDead = () => !!app.game?.dead?.[app.uid] || app.isSpectator();   // 구경꾼은 유령처럼 다녀요
app.privIds = () => app.game?.members || app.players;
app.isFrozen = () => !!app.panel || !!app.cams || !!app.sheet || !$('#notice').hidden || !!app.meeting
  || !!app.revealing || !!app.meta?.paused || app.phase === 'ended' || !!app.faking;
app.setNear = n => {
  app.near = n;
  const big = app.game?.sab && app.game.sab.kind !== 'clot';
  const canUse = !!n.sab || !!n.task || !!n.cam || (n.table && !app.game?.emerg?.[app.uid] && !big);
  app.hud?.setUse(canUse);
  app.hud?.setReport(!!n.body);
  app.hud?.setKill(n.kill, app.priv?.killReadyAt ? app.priv.killReadyAt - app.db.now() : 0);
  app.hud?.setVent(!!n.vent);
  app.hud?.setSab(app.game?.sab ? -1 : (app.game?.sabReadyAt || 0) - app.db.now());
};
// 구경꾼 안내 띠 (화면 위쪽 가운데)
function showSpectate(on) {
  let el = document.getElementById('spectate');
  if (!on) { el?.remove(); return; }
  if (el) return;
  el = document.createElement('div'); el.id = 'spectate'; el.className = 'spectate';
  el.innerHTML = '<b>게임이 이미 시작됐어요</b>이번 판은 구경만 할 수 있어요. 다음 판부터 함께해요!';
  document.body.appendChild(el);
}
function blocked() { return app.phase !== 'playing' || app.isFrozen() || app.db.now() < (app.game?.revealUntil || 0); }
function request(t, target = '') { app.db.set(P.reqOf(app.code, app.uid), { t, target, n: Date.now() }); }
const visPath = () => `rooms/${app.code}/vis/${app.uid}`;
const holdPath = () => `rooms/${app.code}/sabHold/${app.uid}`;

app.useAction = () => {
  if (blocked() || !app.near) return;
  app.joy.reset();
  if (app.near.sab) return openSabFix(app.near.sab);
  if (app.near.cam && !app.near.task) return openCams();
  const id = app.near.task;
  if (id) {
    const M = MISSIONS[id], t = app.tasks.find(x => x.id === id), step = t.step, S = M.steps[step];
    if (app.priv?.role === 'imp' && !app.amDead()) { app.faking = true; fakeTask(M.title).then(() => { app.faking = false; }); return; }
    const visible = M.visible && !app.amDead();
    if (visible) { app.db.set(visPath(), id); app.db.onDisconnectRemove(visPath()); }
    app.panel = openPanel({
      title: M.title + (t.n > 1 ? ` (${step + 1}/${t.n})` : ''), sub: S.sub, note: S.note, big: S.big, mount: S.mount,
      onSuccess: () => {
        app.db.set(P.doneOf(app.code, app.uid) + '/' + id, step + 1);
        app.hud.toast(step + 1 >= t.n ? `${M.title} 완료!` : `${M.title} ${step + 1}/${t.n} · 다음은 ${roomName(SPOTS[M.steps[step + 1].spot].room)}`);
      },
      onClose: () => { app.panel = null; if (visible) app.db.remove(visPath()); },
    });
    return;
  }
  if (app.near.table && !app.amDead() && !app.game?.emerg?.[app.uid]) {
    app.sheet = openSheet({
      title: '긴급 회의',
      html: `<p class="sheet-p">긴급 회의를 열까요? 한 판에 <b>한 번만</b> 열 수 있어요.</p><div class="sheet-btns"><button class="btn btn-red press" data-y>회의 열기</button><button class="btn btn-gray press" data-n>취소</button></div>`,
      onMount: (ov, close) => {
        ov.querySelector('[data-y]').onclick = () => { request('emergency'); close(); };
        ov.querySelector('[data-n]').onclick = close;
      },
      onClose: () => { app.sheet = null; },
    });
  }
};

// 사보타주 해결 창
function openSabFix(spotId) {
  const s = SAB_SPOTS[spotId];
  app.sabPanel = true;
  if (s.kind === 'kidney') {
    app.panel = openPanel({
      title: '콩팥 정지 해결', sub: '여과: 토리의 혈액에서 보먼주머니로 빠져나가는 물질만 끌어 보내 콩팥을 다시 움직이세요.', mount: SAB_FIX.kidney,
      onSuccess: () => request('fix', 'kidney'), onClose: () => { app.panel = null; },
    });
    return;
  }
  if (s.kind === 'lights' || s.kind === 'comms') {   // 시간 제한 없는 비상사태: 조작만 하면 해결
    const S = CONTENT.sabotage[s.kind];
    app.panel = openPanel({
      title: `${S.name} 고치기`, sub: S.fix, mount: SAB_FIX[s.kind],
      onSuccess: () => request('fix', s.kind), onClose: () => { app.panel = null; },
    });
    return;
  }
  // 산소 부족: 누르고 있는 동안만 신호를 보냄
  const other = s.other;
  app.panel = openPanel({
    title: '산소 공급 버튼', sub: `손바닥 칸을 누르고 있으세요. ${other}에서도 누군가 동시에 눌러야 해요.`,
    mount: el => {
      el.innerHTML = `<div class="o2"><div class="o2-pad">누르고 있기</div><div class="o2-msg">${other} 쪽을 기다리는 중...</div></div>`;
      const pad = el.querySelector('.o2-pad');
      const on = e => { e.preventDefault(); pad.setPointerCapture?.(e.pointerId); pad.classList.add('on'); app.db.set(holdPath(), s.side); app.db.onDisconnectRemove(holdPath()); };
      const off = () => { pad.classList.remove('on'); app.db.remove(holdPath()); };
      pad.addEventListener('pointerdown', on); pad.addEventListener('pointerup', off); pad.addEventListener('pointercancel', off);
      return off;
    },
    onClose: () => { app.panel = null; app.db.remove(holdPath()); },
  });
}

app.killAction = () => {
  if (blocked() || app.priv?.role !== 'imp' || app.amDead() || !app.near?.kill) return;
  if ((app.priv.killReadyAt || 0) > app.db.now()) return;
  request('kill', app.near.kill); sfx('kill');
};
app.reportAction = () => {
  if (blocked() || app.amDead() || !app.near?.body) return;
  request('report', app.near.body);
};
// 혈관 통로: 짝 통로로 순간 이동
app.ventAction = () => {
  if (blocked() || app.priv?.role !== 'imp' || app.amDead() || !app.near?.vent) return;
  const to = VENTS[VENTS[app.near.vent].to];
  // 통로 바로 아래에 나오되, 그 자리가 벽이면 위·옆으로 (작은 맵 방광실·세포 발전소 통로는 아래가 벽이었어요)
  const land = [[0, 50], [0, -50], [60, 0], [-60, 0], [0, 0]].map(([dx, dy]) => ({ x: to.x + dx, y: to.y + dy })).find(p => walkable(p.x, p.y, 20)) || { x: to.x, y: to.y };
  sfx('vent'); app.scene.ventTo(land.x, land.y);
};
// 사보타주 메뉴 (바이러스, 유령이어도 가능)
app.sabAction = () => {
  if (blocked() || app.priv?.role !== 'imp') return;
  const g = app.game || {};
  if (g.sab) return app.hud.toast('이미 몸속 비상사태가 진행 중이에요');
  const wait = Math.ceil(((g.sabReadyAt || 0) - app.db.now()) / 1000);
  if (wait > 0) return app.hud.toast(`${wait}초 뒤에 쓸 수 있어요`);
  const S = CONTENT.sabotage;
  app.sheet = openSheet({
    title: '인체 고장 내기',
    html: `<div class="sab-menu">
      <button class="sab-opt press" data-k="o2"><b>${S.o2.name}</b><small>${S.o2.sec}초 안에 못 막으면 승리</small></button>
      <button class="sab-opt press" data-k="kidney"><b>${S.kidney.name}</b><small>${S.kidney.sec}초 안에 못 막으면 승리</small></button>
      <div class="sab-two">
        <button class="sab-opt sab-minor press" data-k="lights"><b>${S.lights.name}</b><small>크루원 시야가 좁아져요</small></button>
        <button class="sab-opt sab-minor press" data-k="comms"><b>${S.comms.name}</b><small>미션 목록이 사라져요</small></button>
      </div>
      <div class="sab-clot"><b>${S.clot.name}</b> <small>${S.clot.sec}초 동안 고른 방의 문을 막아요</small>
        <div class="opt-list">${PLACES.map(p => `<button class="opt press" data-room="${p.id}">${esc(p.name)}</button>`).join('')}</div></div></div>`,
    onMount: (ov, close) => {
      ov.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { request('sab', b.dataset.k); close(); });
      ov.querySelectorAll('[data-room]').forEach(b => b.onclick = () => { request('sab', 'clot:' + b.dataset.room); close(); });
    },
    onClose: () => { app.sheet = null; },
  });
};

function startDebug() {
  const box = $('#debug'); box.hidden = false;
  window.nanoApp = app; // 시험할 때 콘솔에서 살펴보기용
  let last = { ...app.db.stats }, lt = performance.now();
  setInterval(() => {
    const s = app.db.stats, now = performance.now(), dt = (now - lt) / 1000;
    const inMs = (s.inMsgs - last.inMsgs) / dt, inKB = (s.inBytes - last.inBytes) / dt / 1024;
    const outMs = (s.outMsgs - last.outMsgs) / dt;
    box.innerHTML = `${esc(app.db.mode)} · FPS ${Math.round(app.game_?.loop.actualFps || 0)}<br>
      받음 ${inMs.toFixed(0)}회/초 · ${inKB.toFixed(1)}KB/초(추정)<br>보냄 ${outMs.toFixed(1)}회/초 · 보이는 친구 ${app.scene?.visibleCount ?? 0}`;
    last = { ...s }; lt = now;
  }, 1000);
}

applyLogo();
