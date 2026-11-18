// 학생 패드 화면의 흐름: 방 코드 → 닉네임(색+번호) → 대기실 → 게임
import { createDB } from './net/db.js';
import { P, spawnOrder } from './net/room.js';
import { decodePos, findPos } from './net/posSync.js';
import { COLORS, MAX_NUM, nickOf, nickKey } from './common/colors.js';
import { avatarSVG } from './player/avatarSvg.js';
import { WorldScene } from './scenes/WorldScene.js';
import { Hud } from './ui/hud.js';
import { Joystick } from './ui/joystick.js';
import { openPanel, openSheet } from './ui/panel.js';
import { MISSIONS, SAB_FIX } from './missions/index.js';
import { SPOTS, SAB_SPOTS, VENTS, spawnPoint, lobbySpawn, roomAt, roomName, doorsOf, setBlockedDoors } from './map/map.js';
import { CONTENT } from '../data/content.js';
import { PLACES } from './game/shared.js';
import { sfx, unlockAudio } from './common/sfx.js';
import { $, esc } from './common/util.js';
import { settingsOf } from './common/rules.js';
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

  app.meta = meta;
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
  });
  db.onValue(P.done(code), v => { app.allDone = v || {}; app.done = app.allDone[uid] || {}; refreshTasks(); });
  db.onValue(P.privOf(code, uid), v => { app.priv = v; refreshTasks(); maybeReveal(); });
  db.onValue(P.game(code), onGame);
  if (rejoin) app.hud.toast('다시 들어왔어요! 같은 캐릭터로 이어서 해요');
  if (new URLSearchParams(location.search).has('debug')) startDebug();
}

function startPhaser() {
  const el = $('#phaser');
  const dpr = app.dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = el.clientWidth, H = el.clientHeight;
  app.game_ = new Phaser.Game({
    type: Phaser.AUTO, parent: el, width: W * dpr, height: H * dpr, backgroundColor: '#140c12',
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    input: { keyboard: true, mouse: false, touch: false }, banner: false,
  });
  app.game_.scene.add('world', WorldScene, true, { app }); // 장면이 켜지면 app.scene이 채워져요
  addEventListener('resize', () => app.game_.scale.resize(el.clientWidth * dpr, el.clientHeight * dpr));
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
  const uid = app.uid;
  app.scene?.setBodies?.(g.bodies);
  if (JSON.stringify(g.sab || null) !== JSON.stringify(prev.sab || null)) onSab(g.sab);
  // 내가 쓰러짐
  if (g.dead?.[uid] && !app.wasDead) {
    app.wasDead = true;
    if (!g.ejected?.[uid] && app.phase === 'playing') { closeOverlays(); sfx('kill'); showKilled(); }
  }
  if (!g.dead?.[uid]) app.wasDead = false;
  // 회의
  if (g.meeting) {
    if (!app.meeting) { closeOverlays(); app.meeting = new MeetingUI(app); }
    app.meeting.update(g.meeting);
  } else if (app.meeting) {
    app.meeting.close(); app.meeting = null;
    if (app.phase === 'playing') { spawnTeleport(); app.hud.toast(app.amDead() ? '유령으로 미션을 계속하세요' : '회의가 끝났어요. 다시 탐사 시작!'); }
  }
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
  if (g.winner && g.reveal) showEnd({ winner: g.winner, reveal: g.reveal, players: app.players, myId: uid, myTasks: app.priv?.tasks, done: app.done });
  refreshTasks();
}

function maybeReveal() {
  const m = app.meta, pv = app.priv;
  if (!m || m.state !== 'playing' || !pv?.role || !app.scene?.ready || app.revealing) return;
  const key = `nc_rv_${app.code}_${m.startedAt}`;
  if (sessionStorage.getItem(key)) return;
  const left = (app.game.revealUntil || 0) - app.db.now();
  if (left < 800) { sessionStorage.setItem(key, 1); return; }
  sessionStorage.setItem(key, 1);
  app.revealing = true;
  showRoleReveal({ role: pv.role, mates: pv.mates || [], players: app.players, me: app.myPlayer, impCount: app.game.impCount, ms: left })
    .then(() => { app.revealing = false; });
}

function closeOverlays() { app.panel?.close(); app.minimap?.close(); app.sheet?.close(); app.joy?.reset(); }
let leftShown = false;
function kicked() { if (leftShown) return; leftShown = true; closeOverlays(); app.meeting?.close(); app.game_?.destroy(true); notice('방에서 나왔어요', '선생님이 방에서 내보냈어요. 다시 들어가려면 방 코드를 넣어 주세요.'); }
function ended() { if (leftShown) return; leftShown = true; closeOverlays(); app.meeting?.close(); hideEnd(); app.game_?.destroy(true); notice('판이 끝났어요', '선생님이 판을 끝냈어요. 수고했어요!'); }

function refreshTasks() {
  const list = app.priv?.tasks || [];
  const fake = app.priv?.role === 'imp';
  app.tasks = list.filter(id => MISSIONS[id]).map(id => {
    const M = MISSIONS[id], n = M.steps.length, step = fake ? 0 : Math.min(n, +app.done[id] || 0);
    const spot = M.steps[Math.min(step, n - 1)].spot;
    return { id, title: M.title, step, n, spot, room: roomName(SPOTS[spot].room), done: step >= n };
  });
  app.hud?.setTasks(app.tasks, { fake, dead: app.amDead() });
  app.hud?.setRole(app.priv?.role, app.amDead());
  if (app.scene?.ready) {
    const on = new Set(app.phase === 'playing' && !fake ? app.tasks.filter(t => !t.done).map(t => t.spot) : []);
    Object.keys(SPOTS).forEach(id => app.scene.setSpotPending(id, on.has(id)));
  }
}

// ───── 사보타주 경보 ─────
let sabTimer = 0;
function onSab(sab) {
  const big = sab && sab.kind !== 'clot';
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
    box.hidden = true;
    if (app.sabPanel) { app.panel?.close(); app.sabPanel = false; }
    if (app.lastSabAt && app.phase === 'playing' && !app.game?.meeting && !app.game?.winner) app.hud?.toast('사보타주를 막았어요!');
    return;
  }
  if (sab.at !== app.lastSabAt) { app.lastSabAt = sab.at; sfx('alarm'); }
  box.hidden = false;
  const S = CONTENT.sabotage[sab.kind];
  const tick = () => {
    const left = Math.max(0, Math.ceil((sab.endsAt - app.db.now()) / 1000));
    box.innerHTML = sab.kind === 'clot'
      ? `<b>혈관 막힘</b> ${esc(roomName(sab.room))} 문이 막혔어요 · ${left}초`
      : `<b>${esc(S.name)}!</b> ${esc(S.guide)} <span class="sab-time">${left}초</span>`;
  };
  tick(); sabTimer = setInterval(tick, 250);
}

// ───── 버튼 ─────
app.amDead = () => !!app.game?.dead?.[app.uid];
app.privIds = () => app.game?.members || app.players;
app.isFrozen = () => !!app.panel || !!app.minimap || !!app.sheet || !$('#notice').hidden || !!app.meeting
  || !!app.revealing || !!app.meta?.paused || app.phase === 'ended' || !!app.faking;
app.setNear = n => {
  app.near = n;
  const big = app.game?.sab && app.game.sab.kind !== 'clot';
  const canUse = !!n.sab || !!n.task || (n.table && !app.game?.emerg?.[app.uid] && !big);
  app.hud?.setUse(canUse);
  app.hud?.setReport(!!n.body);
  app.hud?.setKill(n.kill, app.priv?.killReadyAt ? app.priv.killReadyAt - app.db.now() : 0);
  app.hud?.setVent(!!n.vent);
  app.hud?.setSab(app.game?.sab ? -1 : (app.game?.sabReadyAt || 0) - app.db.now());
};
function blocked() { return app.phase !== 'playing' || app.isFrozen() || app.db.now() < (app.game?.revealUntil || 0); }
function request(t, target = '') { app.db.set(P.reqOf(app.code, app.uid), { t, target, n: Date.now() }); }
const visPath = () => `rooms/${app.code}/vis/${app.uid}`;
const holdPath = () => `rooms/${app.code}/sabHold/${app.uid}`;

app.useAction = () => {
  if (blocked() || !app.near) return;
  app.joy.reset();
  if (app.near.sab) return openSabFix(app.near.sab);
  const id = app.near.task;
  if (id) {
    const M = MISSIONS[id], t = app.tasks.find(x => x.id === id), step = t.step, S = M.steps[step];
    if (app.priv?.role === 'imp' && !app.amDead()) { app.faking = true; fakeTask(M.title).then(() => { app.faking = false; }); return; }
    const visible = M.visible && !app.amDead();
    if (visible) { app.db.set(visPath(), id); app.db.onDisconnectRemove(visPath()); }
    app.panel = openPanel({
      title: M.title + (t.n > 1 ? ` (${step + 1}/${t.n})` : ''), sub: S.sub, mount: S.mount,
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
      title: '콩팥 정지 해결', sub: '걸러지는 물질만 보먼주머니로 보내 콩팥을 다시 움직이세요.', mount: SAB_FIX.kidney,
      onSuccess: () => request('fix', 'kidney'), onClose: () => { app.panel = null; },
    });
    return;
  }
  // 산소 부족: 누르고 있는 동안만 신호를 보냄
  const other = s.side === 'lung' ? '심장실' : '폐실';
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
  sfx('vent'); app.scene.ventTo(to.x, to.y + 50);
};
// 사보타주 메뉴 (임포스터, 유령이어도 가능)
app.sabAction = () => {
  if (blocked() || app.priv?.role !== 'imp') return;
  const g = app.game || {};
  if (g.sab) return app.hud.toast('이미 사보타주가 진행 중이에요');
  const wait = Math.ceil(((g.sabReadyAt || 0) - app.db.now()) / 1000);
  if (wait > 0) return app.hud.toast(`${wait}초 뒤에 쓸 수 있어요`);
  const S = CONTENT.sabotage;
  app.sheet = openSheet({
    title: '사보타주',
    html: `<div class="sab-menu">
      <button class="sab-opt press" data-k="o2"><b>${S.o2.name}</b><small>${S.o2.sec}초 안에 못 막으면 승리</small></button>
      <button class="sab-opt press" data-k="kidney"><b>${S.kidney.name}</b><small>${S.kidney.sec}초 안에 못 막으면 승리</small></button>
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
