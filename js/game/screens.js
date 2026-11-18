// 학생 화면 연출: 역할 공개, 쓰러짐, 결과 화면, 일시정지
import { nickOf } from '../common/colors.js';
import { avatarOf, missionName } from './shared.js';
import { esc } from '../common/util.js';
import { stepCount } from '../missions/index.js';

function overlay(cls, html) {
  const ov = document.createElement('div');
  ov.className = 'fx-ov ' + cls; ov.innerHTML = html;
  document.body.appendChild(ov);
  return ov;
}

export function showRoleReveal({ role, mates = [], players, me, impCount, ms }) {
  const imp = role === 'imp';
  const mateHTML = imp && mates.length
    ? `<div class="rv-mates">함께하는 바이러스<div class="rv-row">${mates.map(id => `<div class="rv-m">${avatarOf(players[id], 70)}<b>${esc(nickOf(players[id]))}</b></div>`).join('')}</div></div>` : '';
  const ov = overlay('role-reveal ' + (imp ? 'imp' : 'crew'), `
    <div class="rv-small">당신은</div>
    <div class="rv-big">${imp ? '바이러스' : '크루원'}</div>
    <div class="rv-me">${avatarOf(me, 130)}</div>
    <div class="rv-desc">${imp ? '들키지 말고 크루원을 쓰러뜨리세요. 미션은 하는 척만 할 수 있어요.'
      : `몸속에 바이러스 ${impCount || ''}명이 숨어 있어요. 미션을 끝내고 바이러스를 찾아내세요!`}</div>
    ${mateHTML}`);
  return new Promise(res => setTimeout(() => { ov.classList.add('out'); setTimeout(() => { ov.remove(); res(); }, 400); }, ms));
}

export function showKilled() {
  const ov = overlay('killed', `<div class="kd-big">쓰러졌어요!</div>
    <div class="kd-desc">바이러스에게 당했어요. 이제 유령이 되어 벽을 지나다니며 미션을 계속할 수 있어요.<br>유령은 회의에서 말하거나 투표할 수 없어요.</div>`);
  setTimeout(() => { ov.classList.add('out'); setTimeout(() => ov.remove(), 400); }, 3200);
}

export function showEnd({ winner, reveal, players, myId, myTasks, done }) {
  document.querySelector('.fx-ov.end')?.remove();
  const myRole = reveal?.[myId], won = myRole && ((winner.team === 'imp') === (myRole === 'imp'));
  const imps = Object.entries(reveal || {}).filter(([, r]) => r === 'imp').map(([id]) => id);
  const list = Object.keys(reveal || {}).sort((a, b) => (reveal[a] === 'imp' ? 0 : 1) - (reveal[b] === 'imp' ? 0 : 1));
  const fin = t => (+done?.[t] || 0) >= stepCount(t);
  const mine = (myTasks || []).map(t => `<li class="${fin(t) ? 'ok' : ''}">${esc(missionName(t))} ${fin(t) ? '완료' : '못 함'}</li>`).join('');
  overlay('end ' + (winner.team === 'imp' ? 'imp' : 'crew'), `
    <div class="end-big">${winner.team === 'imp' ? '바이러스 승리' : '크루원 승리'}</div>
    <div class="end-reason">${esc(winner.reason)}</div>
    ${myRole ? `<div class="end-me ${won ? 'win' : 'lose'}">${won ? '이겼어요!' : '졌어요'}</div>` : ''}
    <div class="end-imps">바이러스는 ${imps.map(id => `<b>${esc(nickOf(players[id]) || '?')}</b>`).join(', ') || '없었어요'}</div>
    <div class="end-grid">${list.map(id => `<div class="end-p ${reveal[id]}">${avatarOf(players[id], 52)}<span>${esc(nickOf(players[id]) || '?')}</span><small>${reveal[id] === 'imp' ? '바이러스' : '크루원'}</small></div>`).join('')}</div>
    ${myRole === 'crew' && mine ? `<div class="end-mine"><b>내가 한 미션</b><ul>${mine}</ul></div>` : ''}
    <div class="end-wait">선생님이 새 판을 준비하면 대기실로 돌아가요</div>`);
}
export function hideEnd() { document.querySelector('.fx-ov.end')?.remove(); }

export function setPaused(on) {
  const cur = document.querySelector('.fx-ov.paused');
  if (on && !cur) overlay('paused', '<div class="ps-big">잠깐 멈춤</div><div class="ps-desc">선생님이 게임을 멈췄어요</div>');
  if (!on && cur) cur.remove();
}

// 바이러스가 미션 자리에서 '하는 척'
export function fakeTask(title) {
  const ov = overlay('fake', `<div class="metal fake-box"><div class="mpanel-title">${esc(title)}</div><div class="fake-desc">하는 척하는 중...</div><div class="pbar-track"><div class="pbar-fill"></div></div></div>`);
  const fill = ov.querySelector('.pbar-fill'); requestAnimationFrame(() => { fill.style.transition = 'width 3s linear'; fill.style.width = '100%'; });
  return new Promise(res => setTimeout(() => { ov.remove(); res(); }, 3100));
}
