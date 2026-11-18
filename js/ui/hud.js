// 게임 화면 위에 겹치는 버튼과 글자 (HTML)
import { ICON } from './icons.js';
import { openMinimap } from './minimap.js';
import { openSheet } from './panel.js';
import { HATS, COLORS } from '../common/colors.js';
import { avatarSVG } from '../player/avatarSvg.js';
import { P } from '../net/room.js';
import { sfx } from '../common/sfx.js';
import { $, esc } from '../common/util.js';

export class Hud {
  constructor(app) {
    this.app = app;
    $('#btn-use').innerHTML = ICON.use + '<span>사용</span>';
    $('#btn-report').innerHTML = ICON.report + '<span>신고</span>';
    $('#btn-map').innerHTML = ICON.map + '<span>지도</span>';
    $('#btn-hat').innerHTML = ICON.hat + '<span>모자</span>';
    $('#btn-use').onclick = () => app.useAction();
    $('#btn-map').onclick = () => { sfx('click'); openMinimap(app); };
    $('#btn-hat').onclick = () => { sfx('click'); this.openHats(); };
    this.setPhase(app.phase);
  }
  setPhase(ph) { document.body.dataset.phase = ph; }
  setTasks(tasks) {
    $('#task-list').innerHTML = tasks.map(t =>
      `<li class="${t.done ? 'done' : ''}"><b>${esc(t.room)}</b> ${esc(t.title)}</li>`).join('');
  }
  setProgress(r) { $('#pbar-fill').style.width = Math.round(Math.max(0, Math.min(1, r)) * 100) + '%'; }
  setUse(on) { const b = $('#btn-use'); b.disabled = !on; b.classList.toggle('ready', on); }
  setLobby(n) { $('#lobby-banner').textContent = `선생님이 시작하기를 기다리는 중 · ${n}명 접속`; }
  setConn(ok) { $('#conn-banner').hidden = ok; }
  toast(text) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  openHats() {
    const a = this.app, col = COLORS[a.myPlayer.c].hex;
    openSheet({
      title: '모자 고르기',
      html: `<div class="hat-grid">${HATS.map(h => `<button class="hat-btn press ${(a.myPlayer.hat || 0) === h.id ? 'sel' : ''}" data-h="${h.id}">
        ${avatarSVG(col, h.id, 76)}<span>${h.name}</span></button>`).join('')}</div>`,
      onMount: (ov, close) => ov.querySelectorAll('.hat-btn').forEach(b => b.onclick = () => {
        sfx('click'); a.db.update(P.player(a.code, a.uid), { hat: +b.dataset.h }); close();
      }),
    });
  }
}
