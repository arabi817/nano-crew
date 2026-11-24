// 게임 화면 위에 겹치는 버튼과 글자 (HTML)
import { ICON } from './icons.js';
import { openMinimap } from './minimap.js';
import { openSheet } from './panel.js';
import { HATS, COLORS } from '../common/colors.js';
import { avatarSVG, hatAvailable } from '../player/avatarSvg.js';
import { P } from '../net/room.js';
import { sfx } from '../common/sfx.js';
import { $, esc } from '../common/util.js';

export class Hud {
  constructor(app) {
    this.app = app;
    $('#btn-use').innerHTML = ICON.use + '<span>사용</span>';
    $('#btn-report').innerHTML = ICON.report + '<span>신고</span>';
    $('#btn-map').innerHTML = ICON.map + '<span>지도</span>';
    $('#btn-hat').innerHTML = ICON.hat + '<span>꾸미기</span>';
    $('#btn-kill').innerHTML = ICON.kill + '<span>킬</span><b class="cd"></b>';
    $('#btn-use').onclick = () => app.useAction();
    $('#btn-report').onclick = () => app.reportAction();
    $('#btn-kill').onclick = () => app.killAction();
    $('#btn-vent').innerHTML = ICON.vent + '<span>통로</span>';
    $('#btn-sab').innerHTML = ICON.sab + '<span>고장내기</span><b class="cd"></b>'   // '인체 고장 내기'는 84px 버튼에 안 들어가서 줄임;
    $('#btn-vent').onclick = () => app.ventAction();
    $('#btn-sab').onclick = () => app.sabAction();
    $('#btn-map').onclick = () => { sfx('click'); openMinimap(app); };
    $('#btn-hat').onclick = () => { sfx('click'); this.openHats(); };
    this.setPhase(app.phase);
  }
  setPhase(ph) { document.body.dataset.phase = ph; }
  setTasks(tasks, { fake = false, dead = false } = {}) {
    $('.tasks-head').innerHTML = fake
      ? `<span class="imp-head">바이러스</span><div class="imp-goal">들키지 말고 크루원을 쓰러뜨리세요.<br>인체를 고장 내서 몸속 비상사태를 일으키세요.</div><div class="imp-fake">가짜 미션 (하는 척만)</div>`
      : dead ? '미션 <small>유령도 할 수 있어요</small>' : '미션 <small>나는 크루원</small>';
    $('#task-list').innerHTML = tasks.map(t =>
      `<li class="${t.done ? 'done' : ''}"><b>${esc(t.room)}</b> ${esc(t.title)}${t.n > 1 && !fake ? ` <small>${t.step}/${t.n}</small>` : ''}</li>`).join('');
  }
  setRole(role, dead) {
    document.body.dataset.role = role || '';
    document.body.classList.toggle('ghost', !!dead);
  }
  showProgress(on) { document.querySelector('.pbar').style.visibility = on ? '' : 'hidden'; }
  setProgress(r) { $('#pbar-fill').style.width = Math.round(Math.max(0, Math.min(1, r)) * 100) + '%'; }
  setUse(on) { const b = $('#btn-use'); if (b.disabled === !on) return; b.disabled = !on; b.classList.toggle('ready', on); }
  setReport(on) { const b = $('#btn-report'); if (b.disabled === !on) return; b.disabled = !on; b.classList.toggle('ready', on); }
  setVent(on) { const b = $('#btn-vent'); if (b.disabled === !on) return; b.disabled = !on; b.classList.toggle('ready', on); }
  setSab(cdMs) { // cdMs < 0 이면 진행 중
    const b = $('#btn-sab'), cd = Math.ceil(cdMs / 1000), t = cdMs < 0 ? '' : cd > 0 ? cd : '';
    if (b.querySelector('.cd').textContent !== String(t)) b.querySelector('.cd').textContent = t;
    b.classList.toggle('dim', cdMs < 0 || cd > 0);
  }
  setKill(target, cdMs) {
    const b = $('#btn-kill'), cd = Math.ceil(cdMs / 1000), t = cd > 0 ? String(cd) : '';
    const el = b.querySelector('.cd'); if (el.textContent !== t) el.textContent = t;   // 바뀔 때만 (매 장면마다 고치면 화면 전체 다시 계산)
    const on = !!target && cd <= 0;
    if (b.disabled !== !on) { b.disabled = !on; b.classList.toggle('ready', on); }
  }
  setLobby(n) { $('#lobby-banner').textContent = `${this.app?.meta?.free ? '방장이' : '선생님이'} 시작하기를 기다리는 중 · ${n}명 접속`; }
  setConn(ok) { $('#conn-banner').hidden = ok; }
  toast(text) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  openHats() {
    const a = this.app, col = COLORS[a.myPlayer.c].hex;
    openSheet({
      title: '꾸미기',
      html: `<div class="hat-grid">${HATS.filter(h => hatAvailable(h.id)).map(h => `<button class="hat-btn press ${(a.myPlayer.hat || 0) === h.id ? 'sel' : ''}" data-h="${h.id}">
        ${avatarSVG(col, h.id, 64)}<span>${h.name}</span></button>`).join('')}</div>`,
      onMount: (ov, close) => ov.querySelectorAll('.hat-btn').forEach(b => b.onclick = () => {
        sfx('click'); a.db.update(P.player(a.code, a.uid), { hat: +b.dataset.h }); close();
      }),
    });
  }
}
