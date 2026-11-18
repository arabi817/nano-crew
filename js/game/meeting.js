// 학생 패드의 회의 창: 경보 → OX 퀴즈 → 토론(정해진 문장) → 투표 → 결과·추방
import { CONTENT } from '../../data/content.js';
import { P } from '../net/room.js';
import { nickOf, COLORS } from '../common/colors.js';
import { STAGE1_TASKS } from '../missions/index.js';
import { PLACES, chatHTML, callerText, avatarOf, PHASE_NAME, missionName } from './shared.js';
import { sfx } from '../common/sfx.js';
import { esc } from '../common/util.js';
import { ALARM_MS } from '../common/rules.js';

export class MeetingUI {
  constructor(app) {
    this.app = app; this.m = null; this.my = { ans: null, vote: null, sent: 0, lastSent: 0 };
    this.data = { right: {}, vote: {}, chat: {} }; this.unsubs = []; this.draft = null; this.ejectShown = false;
    this.el = document.createElement('div'); this.el.className = 'meet';
    document.body.appendChild(this.el);
    this.el.innerHTML = `
      <div class="meet-alarm"><div class="ma-big"></div><div class="ma-who"></div></div>
      <div class="meet-main">
        <div class="meet-top"><div class="mt-title"></div><div class="mt-phase"></div><div class="mt-time"></div></div>
        <div class="meet-ox"></div>
        <div class="meet-body">
          <div class="meet-grid"></div>
          <div class="meet-side metal-dark">
            <div class="chat-log"></div>
            <div class="chat-compose"></div>
          </div>
        </div>
        <div class="meet-bottom"></div>
      </div>
      <div class="meet-eject"></div>`;
    this.$ = s => this.el.querySelector(s);
    this.timer = setInterval(() => this.tickTime(), 200);
    sfx('alarm');
  }
  get alive() { return !this.app.game?.dead?.[this.app.uid]; }
  get canVote() { return this.alive && !!this.data.right[this.app.uid]; }

  update(m) {
    const first = !this.m || this.m.id !== m.id;
    const phaseChanged = !this.m || this.m.phase !== m.phase;
    this.m = m;
    if (first) this.subscribe(m.id);
    this.el.dataset.phase = m.phase;
    this.$('.mt-title').textContent = m.body ? '쓰러진 대원 발견!' : '긴급 회의!';
    this.$('.ma-big').textContent = m.body ? '쓰러진 대원 발견!' : '긴급 회의!';
    this.$('.ma-who').textContent = callerText(m, this.app.players);
    this.$('.mt-phase').textContent = PHASE_NAME[m.phase] || '';
    if (phaseChanged && m.phase === 'vote') sfx('click');
    this.render();
  }
  subscribe(id) {
    this.unsubs.forEach(u => u()); this.unsubs = [];
    this.my = { ans: null, vote: null, sent: 0, lastSent: 0 }; this.ejectShown = false;
    const base = P.meet(this.app.code, id);
    for (const k of ['right', 'vote', 'chat']) {
      this.unsubs.push(this.app.db.onValue(`${base}/${k}`, v => { this.data[k] = v || {}; this.render(); }));
    }
  }
  tickTime() {
    if (!this.m) return;
    const now = this.app.db.now();
    this.el.classList.toggle('alarming', now < (this.m.startAt || 0));
    const left = Math.max(0, Math.ceil((this.m.endsAt - now) / 1000));
    this.$('.mt-time').textContent = this.m.phase === 'result' ? '' : `${left}초`;
    this.$('.mt-time').classList.toggle('hurry', left <= 5);
  }

  render() {
    const m = this.m; if (!m) return;
    this.renderOX(); this.renderGrid(); this.renderChat(); this.renderBottom();
    if (m.phase === 'result' && !this.ejectShown) { this.ejectShown = true; setTimeout(() => this.showEject(), 2600); }
  }

  renderOX() {
    const m = this.m, box = this.$('.meet-ox');
    if (m.phase !== 'ox' && m.phase !== 'discuss') { box.innerHTML = ''; return; }
    if (m.phase === 'ox') {
      const me = this.my.ans;
      box.innerHTML = `<div class="ox-q metal">${esc(m.q.text)}</div>
        ${this.alive ? `<div class="ox-btns"><button class="ox-b o press ${me === 'O' ? 'sel' : ''}" data-a="O">O</button><button class="ox-b x press ${me === 'X' ? 'sel' : ''}" data-a="X">X</button></div>
          <div class="ox-tip">${me ? '답을 골랐어요. 시간이 끝나면 정답이 나와요' : '10초 안에 맞히면 이번 회의에서 투표할 수 있어요'}</div>`
          : '<div class="ox-tip">유령은 이번 회의를 지켜만 봐요</div>'}`;
      box.querySelectorAll('.ox-b').forEach(b => b.onclick = () => {
        if (this.my.ans) return;
        this.my.ans = b.dataset.a; sfx('click');
        this.app.db.set(`${P.meet(this.app.code, m.id)}/ans/${this.app.uid}`, this.my.ans);
        this.renderOX();
      });
    } else {
      const got = this.data.right[this.app.uid];
      box.innerHTML = `<div class="ox-q small metal">${esc(m.q.text)} <b class="ox-ans">정답 ${esc(m.qa || '')}</b></div>
        ${this.alive ? `<div class="ox-result ${got ? 'ok' : 'no'}">${got ? '정답! 이번 회의에서 투표할 수 있어요' : '이번 회의 투표권 없음'}</div>` : ''}`;
    }
  }

  renderGrid() {
    const m = this.m, g = this.app.game || {}, players = this.app.players;
    const ids = Object.keys(this.app.privIds()).filter(id => players[id]);
    ids.sort((a, b) => (g.dead?.[a] ? 1 : 0) - (g.dead?.[b] ? 1 : 0) || players[a].c - players[b].c || players[a].n - players[b].n);
    const counts = m.result?.counts || {}, voting = m.phase === 'vote', showRes = m.phase === 'result';
    const mates = this.app.priv?.mates || [];
    this.$('.meet-grid').innerHTML = ids.map(id => {
      const p = players[id], dead = !!g.dead?.[id], voted = !!this.data.vote[id];
      const mine = this.my.vote === id, n = counts[id] || 0;
      return `<button class="mg-card ${dead ? 'dead' : ''} ${mine ? 'mine' : ''} ${id === this.app.uid ? 'me' : ''}" data-id="${esc(id)}" ${voting && this.canVote && !this.my.vote && !dead ? '' : 'disabled'}>
        ${avatarOf(p, 46)}<span class="mg-name ${mates.includes(id) ? 'mate' : ''}">${esc(nickOf(p))}</span>
        ${dead ? '<span class="mg-tag">유령</span>' : ''}${voting && voted ? '<span class="mg-voted">투표함</span>' : ''}
        ${showRes && n ? `<span class="mg-count">${n}표</span>` : ''}</button>`;
    }).join('');
    this.$('.meet-grid').querySelectorAll('.mg-card').forEach(b => b.onclick = () => this.vote(b.dataset.id));
  }

  renderBottom() {
    const m = this.m, box = this.$('.meet-bottom');
    if (m.phase === 'vote') {
      box.innerHTML = this.canVote
        ? (this.my.vote ? `<div class="mb-msg">투표했어요: ${this.my.vote === 'skip' ? '건너뛰기' : esc(nickOf(this.app.players[this.my.vote]))}</div>`
          : `<div class="mb-msg">의심되는 대원을 누르거나</div><button class="btn btn-gray press mb-skip">건너뛰기</button>`)
        : `<div class="mb-msg no">${this.alive ? '이번 회의 투표권 없음' : '유령은 투표할 수 없어요'}</div>`;
      box.querySelector('.mb-skip')?.addEventListener('click', () => this.vote('skip'));
    } else if (m.phase === 'result') {
      const c = m.result?.counts?.skip || 0;
      box.innerHTML = `<div class="mb-msg">투표 결과${c ? ` · 건너뛰기 ${c}표` : ''}</div>`;
    } else if (m.phase === 'discuss') box.innerHTML = '<div class="mb-msg">말로 토론하거나 오른쪽에서 문장을 골라 보내세요</div>';
    else box.innerHTML = '';
  }

  vote(target) {
    if (!this.canVote || this.my.vote || this.m.phase !== 'vote') return;
    if (target !== 'skip' && this.app.game?.dead?.[target]) return;
    this.my.vote = target; sfx('vote');
    this.app.db.set(`${P.meet(this.app.code, this.m.id)}/vote/${this.app.uid}`, target);
    this.render();
  }

  // ── 채팅: 문장 틀 고르기 → 빈칸 고르기 → 보내기 ──
  renderChat() {
    const log = this.$('.chat-log'), atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 20;
    log.innerHTML = chatHTML(this.data.chat, this.app.players) || '<div class="chat-empty">아직 아무 말도 없어요</div>';
    if (atBottom) log.scrollTop = log.scrollHeight;
    const m = this.m, box = this.$('.chat-compose');
    const open = (m.phase === 'discuss' || m.phase === 'vote') && this.alive;
    if (!open) { box.innerHTML = this.alive ? '' : '<div class="chat-note">유령은 말할 수 없어요</div>'; this.draft = null; return; }
    if (this.my.sent >= 8) { box.innerHTML = '<div class="chat-note">이번 회의에서는 더 보낼 수 없어요</div>'; return; }
    if (box.dataset.state === JSON.stringify(this.draft) && box.innerHTML) return; // 고르는 중엔 다시 그리지 않음
    box.dataset.state = JSON.stringify(this.draft);
    if (!this.draft) {
      box.innerHTML = `<div class="chat-h">문장 고르기</div><div class="tpl-list">${CONTENT.chat.map(t => `<button class="tpl press" data-t="${t.id}">${esc(t.text)}</button>`).join('')}</div>`;
      box.querySelectorAll('.tpl').forEach(b => b.onclick = () => { sfx('click'); this.draft = { t: b.dataset.t, a: [] }; this.stepDraft(); });
    } else this.stepDraft();
  }
  stepDraft() {
    const box = this.$('.chat-compose'), tpl = CONTENT.chat.find(t => t.id === this.draft.t);
    box.dataset.state = JSON.stringify(this.draft);
    const i = this.draft.a.length;
    if (i >= tpl.slots.length) return this.send();
    const slot = tpl.slots[i], g = this.app.game || {};
    let opts = [];
    if (slot === 'place') opts = PLACES.map(p => [p.id, p.name]);
    if (slot === 'mission') opts = (this.app.priv?.tasks || STAGE1_TASKS).map(t => [t, missionName(t)]);
    if (slot === 'person') opts = Object.keys(this.app.privIds()).filter(id => this.app.players[id] && !g.dead?.[id] && id !== this.app.uid)
      .map(id => [id, nickOf(this.app.players[id])]);
    const label = { place: '장소', person: '사람', mission: '미션' }[slot];
    box.innerHTML = `<div class="chat-h"><button class="tpl-back press">뒤로</button> ${label} 고르기</div>
      <div class="opt-list ${slot}">${opts.map(([v, n]) => `<button class="opt press" data-v="${esc(v)}" ${slot === 'person' ? `style="--pc:${COLORS[this.app.players[v]?.c]?.hex}"` : ''}>${esc(n)}</button>`).join('')}</div>`;
    box.querySelector('.tpl-back').onclick = () => { this.draft = null; box.dataset.state = ''; this.renderChat(); };
    box.querySelectorAll('.opt').forEach(b => b.onclick = () => { sfx('click'); this.draft.a.push(b.dataset.v); this.stepDraft(); });
  }
  send() {
    const now = Date.now(), d = this.draft; this.draft = null;
    const box = this.$('.chat-compose'); box.dataset.state = '';
    if (now - this.my.lastSent < 2500) { box.innerHTML = '<div class="chat-note">조금 있다가 다시 보내 주세요</div>'; setTimeout(() => this.renderChat(), 1500); return; }
    this.my.lastSent = now; this.my.sent++;
    this.app.db.push(`${P.meet(this.app.code, this.m.id)}/chat`, { u: this.app.uid, t: d.t, a: d.a });
    this.renderChat();
  }

  showEject() {
    const r = this.m?.result; if (!r) return;
    const box = this.$('.meet-eject'), p = this.app.players[r.ejected];
    let line2 = '';
    if (r.ejected && r.wasImp !== undefined) line2 = r.wasImp ? '임포스터였어요!' : '임포스터가 아니었어요';
    const left = r.impLeft !== undefined ? `<div class="ej-left">남은 임포스터 ${r.impLeft}명</div>` : '';
    box.innerHTML = r.ejected
      ? `<div class="ej-fly">${avatarOf(p, 120)}</div><div class="ej-text">${esc(nickOf(p))}이(가) 추방됐어요</div><div class="ej-sub">${line2}</div>${left}`
      : `<div class="ej-text">아무도 추방되지 않았어요</div><div class="ej-sub">${r.tie ? '표가 같았어요' : '건너뛰기가 가장 많았어요'}</div>`;
    this.el.classList.add('ejecting'); sfx('eject');
  }

  close() {
    clearInterval(this.timer); this.unsubs.forEach(u => u()); this.el.remove();
  }
}
