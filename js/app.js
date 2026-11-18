// 학생 패드 화면의 흐름: 방 코드 → 닉네임(색+번호) → 대기실 → 게임
import { createDB } from './net/db.js';
import { P, spawnOrder } from './net/room.js';
import { decodePos, findPos } from './net/posSync.js';
import { COLORS, MAX_NUM, nickOf, nickKey } from './common/colors.js';
import { avatarSVG } from './player/avatarSvg.js';
import { WorldScene } from './scenes/WorldScene.js';
import { Hud } from './ui/hud.js';
import { Joystick } from './ui/joystick.js';
import { openPanel } from './ui/panel.js';
import { MISSIONS, STAGE1_TASKS } from './missions/index.js';
import { TASK_SPOTS, spawnPoint, lobbySpawn, roomAt, roomName } from './map/map.js';
import { sfx, unlockAudio } from './common/sfx.js';
import { $, esc } from './common/util.js';

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
  $('#notice-btn').onclick = () => { location.href = location.pathname + (app.db?.mode === 'local' ? '?local=1' : ''); };
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
  show('page-join');
  if (room) tryCode(room);
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
  let c = null, n = null, taken = {};
  $('#color-grid').innerHTML = COLORS.map((col, i) =>
    `<button class="swatch press" data-c="${i}" style="--sw:${col.hex}"><span>${col.name}</span></button>`).join('');
  $('#num-grid').innerHTML = Array.from({ length: MAX_NUM }, (_, i) =>
    `<button class="num press" data-n="${i + 1}">${i + 1}</button>`).join('');
  const isTaken = (cc, nn) => taken[nickKey(cc, nn)] && taken[nickKey(cc, nn)] !== uid;
  function render() {
    document.querySelectorAll('.swatch').forEach(b => b.classList.toggle('sel', +b.dataset.c === c));
    document.querySelectorAll('.num').forEach(b => {
      const nn = +b.dataset.n;
      b.disabled = c === null || isTaken(c, nn);
      b.classList.toggle('sel', nn === n);
    });
    if (c !== null && n !== null && isTaken(c, n)) n = null;
    $('#pick-preview').innerHTML = avatarSVG(c === null ? '#9aa7b8' : COLORS[c].hex, 0, 150);
    $('#pick-name').textContent = c === null ? '색깔을 고르세요' : n === null ? `${COLORS[c].name} ?` : `${COLORS[c].name} ${n}`;
    $('#pick-go').disabled = c === null || n === null;
  }
  const unsub = db.onValue(P.nicks(code), v => { taken = v || {}; render(); });
  $('#color-grid').onclick = e => { const b = e.target.closest('.swatch'); if (!b) return; sfx('click'); c = +b.dataset.c; render(); };
  $('#num-grid').onclick = e => { const b = e.target.closest('.num'); if (!b || b.disabled) return; sfx('click'); n = +b.dataset.n; render(); };
  $('#pick-go').onclick = async () => {
    $('#pick-go').disabled = true; say('#pick-msg', '');
    const k = nickKey(c, n);
    try {
      const cur = await db.get(P.nick(code, k));
      if (cur && cur !== uid) throw new Error('taken');
      const me = { c, n, hat: 0, on: true, j: db.now() };
      await db.update(P.room(code), { [`nicks/${k}`]: uid, [`players/${uid}`]: me });
      unsub(); app.myPlayer = me; enterGame(false);
    } catch (e) {
      say('#pick-msg', '방금 다른 친구가 골랐어요. 다른 번호를 골라 주세요'); n = null; render();
    }
  };
  render();
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
  if (!meta) return notice('방이 없어요', '선생님이 판을 끝냈어요.');
  app.phase = meta.state; app.players = players || {}; app.done = done || {};
  app.myPlayer = app.players[uid] || app.myPlayer;
  app.myColor = COLORS[app.myPlayer.c].hex;
  app.startPos = decodePos(pos?.enc);
  localStorage.setItem('nc_last_room', code);

  show('page-game');
  app.hud = new Hud(app);
  app.joy = new Joystick($('#joy-zone'));
  refreshTasks();
  try { await document.fonts.load('20px Jua'); } catch { }
  startPhaser();

  db.onConnection(ok => {
    app.hud.setConn(ok);
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
    app.scene?.syncPlayers(app.players);
    app.hud.setLobby(Object.values(app.players).filter(p => p.on !== false).length);
    updateProgress();
  });
  db.onValue(P.done(code), v => {
    app.allDone = v || {}; app.done = app.allDone[uid] || {};
    refreshTasks(); updateProgress();
  });
  if (rejoin) app.hud.toast('다시 들어왔어요! 같은 캐릭터로 이어서 해요');
  if (new URLSearchParams(location.search).has('debug')) startDebug();
}

function startPhaser() {
  const el = $('#phaser');
  const dpr = app.dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = el.clientWidth, H = el.clientHeight;
  app.game = new Phaser.Game({
    type: Phaser.AUTO, parent: el, width: W * dpr, height: H * dpr, backgroundColor: '#140c12',
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    input: { keyboard: true, mouse: false, touch: false }, banner: false,
  });
  app.game.scene.add('world', WorldScene, true, { app }); // 장면이 켜지면 app.scene이 채워져요
  addEventListener('resize', () => app.game.scale.resize(el.clientWidth * dpr, el.clientHeight * dpr));
}

app.onSceneReady = () => { refreshTasks(); };

function onMeta(m) {
  if (!m) return ended();
  const prev = app.phase; app.phase = m.state;
  if (prev === m.state) return;
  app.hud.setPhase(m.state); closeOverlays(); refreshTasks();
  if (!app.scene?.ready) return;
  if (m.state === 'playing') {
    const p = defaultStart('playing'); app.scene.teleport(p.x, p.y);
    sfx('start'); app.hud.toast('탐사 시작! 미션을 해결하세요');
  } else {
    const p = lobbySpawn(); app.scene.teleport(p.x, p.y);
    app.hud.toast('대기실로 돌아왔어요');
  }
}

function closeOverlays() { app.panel?.close(); app.minimap?.close(); app.joy?.reset(); }
let leftShown = false;
function kicked() { if (leftShown) return; leftShown = true; closeOverlays(); app.game?.destroy(true); notice('방에서 나왔어요', '선생님이 방에서 내보냈어요. 다시 들어가려면 방 코드를 넣어 주세요.'); }
function ended() { if (leftShown) return; leftShown = true; closeOverlays(); app.game?.destroy(true); notice('판이 끝났어요', '선생님이 판을 끝냈어요. 수고했어요!'); }

function refreshTasks() {
  app.tasks = STAGE1_TASKS.map(id => ({ id, title: MISSIONS[id].title, room: roomName(TASK_SPOTS[id].room), done: !!app.done[id] }));
  app.hud?.setTasks(app.tasks);
  if (app.scene?.ready) app.tasks.forEach(t => app.scene.setSpotPending(t.id, app.phase === 'playing' && !t.done));
}

function updateProgress() {
  // 1단계: 봇을 뺀 실제 참가자 기준 (2단계에서 호스트가 계산하도록 바꿈)
  const real = Object.keys(app.players).filter(id => !id.startsWith('bot'));
  const total = real.length * STAGE1_TASKS.length;
  let n = 0; real.forEach(id => { n += Object.keys(app.allDone[id] || {}).length; });
  app.hud?.setProgress(total ? n / total : 0);
}

app.isFrozen = () => !!app.panel || !!app.minimap || !$('#notice').hidden;
app.setNearTask = id => { if (id === app.nearTask) return; app.nearTask = id; app.hud?.setUse(!!id); };
app.useAction = () => {
  if (app.panel || app.phase !== 'playing') return;
  const id = app.nearTask; if (!id || app.done[id]) return;
  const M = MISSIONS[id];
  app.joy.reset();
  app.panel = openPanel({
    title: M.title, sub: M.sub, mount: M.mount,
    onSuccess: () => { app.db.set(P.doneOf(app.code, app.uid) + '/' + id, 1); app.hud.toast(`${M.title} 완료!`); },
    onClose: () => { app.panel = null; },
  });
};

function startDebug() {
  const box = $('#debug'); box.hidden = false;
  let last = { ...app.db.stats }, lt = performance.now();
  setInterval(() => {
    const s = app.db.stats, now = performance.now(), dt = (now - lt) / 1000;
    const inMs = (s.inMsgs - last.inMsgs) / dt, inKB = (s.inBytes - last.inBytes) / dt / 1024;
    const outMs = (s.outMsgs - last.outMsgs) / dt;
    box.innerHTML = `${esc(app.db.mode)} · FPS ${Math.round(app.game?.loop.actualFps || 0)}<br>
      받음 ${inMs.toFixed(0)}회/초 · ${inKB.toFixed(1)}KB/초(추정)<br>보냄 ${outMs.toFixed(1)}회/초 · 보이는 친구 ${app.scene?.visibleCount ?? 0}`;
    last = { ...s }; lt = now;
  }, 1000);
}
