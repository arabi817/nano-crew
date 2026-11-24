// 학생 패드의 회의 창: 경보 → OX 퀴즈 → 토론(정해진 문장) → 투표 → 결과·추방
import { CONTENT } from '../../data/content.js';
import { P } from '../net/room.js';
import { nickOf, COLORS, byNick } from '../common/colors.js';
import { MISSIONS } from '../missions/index.js';
import { PLACES, callerText, avatarOf, PHASE_NAME, missionName, MEGAPHONE, MeetingFeed } from './shared.js';
import { sfx } from '../common/sfx.js';
import { esc } from '../common/util.js';
import { ALARM_MS, settingsOf } from '../common/rules.js';
import { BANNED } from '../../data/names.js';

const CHAT_MAX = 8;   // 한 회의에서 보낼 수 있는 말 수
const FREE_MAX = 40;  // 자유 입력 글자 수

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
        <div class="meet-speak"></div>
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
  get alive() { return !this.app.game?.dead?.[this.app.uid] && !this.app.isSpectator?.(); }   // 구경꾼은 말·투표 없이 지켜보기만
  get who() { return this.app.isSpectator?.() ? '구경 중에는' : '유령은'; }
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
    this.my = { ans: null, vote: null, sent: 0, lastSent: 0 }; this.ejectShown = false; this.feed = new MeetingFeed();
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
    this.renderSpeak();
  }

  // ── 발언 순서: 지금 말하는 사람 · 자유 토론 · 손들기 ──
  renderSpeak() {
    const m = this.m, box = this.$('.meet-speak');
    if (!m || (m.phase !== 'discuss' && m.phase !== 'vote')) { box.innerHTML = ''; box.dataset.k = ''; return; }
    const now = this.app.db.now(), sp = m.speaker && now < m.speaker.until ? m.speaker : null;
    const handMode = !!this.app.game?.handMode, uid = this.app.uid;
    const order = Object.entries(m.hands || {}).filter(([, t]) => t).sort((a, b) => a[1] - b[1]).map(e => e[0]);
    const myIdx = order.indexOf(uid), showHand = handMode && m.phase === 'discuss' && this.alive;
    const k = JSON.stringify([m.phase, sp?.u, sp?.until, handMode, myIdx, showHand]);
    if (box.dataset.k !== k) {
      box.dataset.k = k;
      let html = '';
      if (sp) {
        const p = this.app.players[sp.u], me = sp.u === uid;
        const why = sp.first ? (m.body ? '쓰러진 대원을 발견한 사람이 먼저 말해요' : '회의를 연 사람이 먼저 말해요') : '선생님이 불렀어요';
        html = `<div class="sp-bar ${me ? 'me' : ''}">${avatarOf(p, 40)}<div class="sp-txt"><b>${me ? '지금 내 차례! 모두에게 말해 주세요' : `${esc(nickOf(p))}의 발언 시간`}</b>
          <small>${why}${me ? '' : ' · 다른 친구는 조용히 들어요'}</small></div><span class="sp-left"></span></div>`;
      } else if (m.phase === 'discuss') {
        html = handMode
          ? `<div class="sp-bar free"><div class="sp-txt"><b>손을 들고, 선생님이 부르면 말해요</b><small>채팅은 언제든 보낼 수 있어요</small></div></div>`
          : `<div class="sp-bar free"><div class="sp-txt"><b>자유 토론</b><small>말로 하거나 오른쪽 채팅으로 이야기해요</small></div></div>`;
      }
      if (showHand) html += `<button class="btn ${myIdx >= 0 ? 'btn-gray' : 'btn-hand'} press sp-hand">${myIdx >= 0 ? `손 내리기 · ${myIdx + 1}번째` : '손들기'}</button>`;
      box.innerHTML = html;
      box.querySelector('.sp-hand')?.addEventListener('click', () => {
        sfx('click'); this.app.db.set(P.reqOf(this.app.code, uid), { t: 'hand', target: '', n: Date.now() });
      });
    }
    const left = box.querySelector('.sp-left');
    if (left && sp) left.textContent = `${Math.max(0, Math.ceil((sp.until - now) / 1000))}초`;
  }

  render() {
    const m = this.m; if (!m) return;
    this.renderOX(); this.renderSpeak(); this.renderGrid(); this.renderChat(); this.renderBottom();
    if (m.phase === 'result' && !this.ejectShown) { this.ejectShown = true; setTimeout(() => this.showEject(), 2600); }
  }

  renderOX() {
    const m = this.m, box = this.$('.meet-ox');
    if (m.phase !== 'ox' && m.phase !== 'discuss') { box.innerHTML = ''; return; }
    if (m.phase === 'ox') {
      const me = this.my.ans;
      box.innerHTML = `<div class="ox-q metal">${esc(m.q.text)}</div>
        ${this.alive ? `<div class="ox-btns"><button class="ox-b o press ${me === 'O' ? 'sel' : ''}" data-a="O">O</button><button class="ox-b x press ${me === 'X' ? 'sel' : ''}" data-a="X">X</button></div>
          <div class="ox-tip">${me ? '답을 골랐어요. 시간이 끝나면 정답이 나와요' : `${settingsOf(this.app.meta).oxSec}초 안에 맞히면 이번 회의에서 투표할 수 있어요`}</div>`
          : `<div class="ox-tip">${this.who} 이번 회의를 지켜만 봐요</div>`}`;
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
    ids.sort((a, b) => (g.dead?.[a] ? 1 : 0) - (g.dead?.[b] ? 1 : 0) || byNick(players[a], players[b]));
    const counts = m.result?.counts || {}, voting = m.phase === 'vote', showRes = m.phase === 'result';
    const mates = this.app.priv?.mates || [];
    // 채팅이 올 때마다 32명 그림을 다시 만들지 않게: 보이는 게 바뀔 때만 다시 그려요
    const key = JSON.stringify([m.phase, m.caller, ids, voting && Object.keys(this.data.vote).sort(), this.my.vote, this.canVote, showRes && counts, ids.map(id => players[id]?.c + '/' + (players[id]?.hat || 0) + (g.dead?.[id] ? 'd' : ''))]);
    if (this.gridKey === key) return; this.gridKey = key;
    this.$('.meet-grid').innerHTML = ids.map(id => {
      const p = players[id], dead = !!g.dead?.[id], voted = !!this.data.vote[id];
      const mine = this.my.vote === id, n = counts[id] || 0;
      return `<button class="mg-card ${dead ? 'dead' : ''} ${mine ? 'mine' : ''} ${id === this.app.uid ? 'me' : ''}" data-id="${esc(id)}" ${voting && this.canVote && !this.my.vote && !dead ? '' : 'disabled'}>
        ${avatarOf(p, 46)}<span class="mg-name ${mates.includes(id) ? 'mate' : ''}">${esc(nickOf(p))}</span>${id === m.caller ? MEGAPHONE : ''}
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
        : `<div class="mb-msg no">${this.alive ? '이번 회의 투표권 없음' : `${this.who} 투표할 수 없어요`}</div>`;
      box.querySelector('.mb-skip')?.addEventListener('click', () => this.vote('skip'));
    } else if (m.phase === 'result') {
      const c = m.result?.counts?.skip || 0;
      box.innerHTML = `<div class="mb-msg">투표 결과${c ? ` · 건너뛰기 ${c}표` : ''}</div>`;
    } else if (m.phase === 'discuss') box.innerHTML = '<div class="mb-msg">토론이 끝나면 투표해요</div>';
    else box.innerHTML = '';
  }

  vote(target) {
    if (!this.canVote || this.my.vote || this.m.phase !== 'vote') return;
    if (target !== 'skip' && this.app.game?.dead?.[target]) return;
    this.my.vote = target; sfx('vote');
    this.app.db.set(`${P.meet(this.app.code, this.m.id)}/vote/${this.app.uid}`, target);
    this.render();
  }

  // ── 채팅: ① 문장 고르기 → ② 빈칸 채우기 → ③ 보내기 (처음 보는 학생도 따라 할 수 있게 단계와 미리보기를 보여 줘요) ──
  renderChat() {
    const log = this.$('.chat-log'), atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 20;
    const g = this.app.game || {}, eligible = Object.keys(this.app.privIds()).filter(id => !g.dead?.[id] && this.data.right[id]);
    const open = (this.m.phase === 'discuss' || this.m.phase === 'vote') && this.alive;
    log.innerHTML = this.feed.html(this.data.chat, this.data.vote, this.app.players, eligible)
      || (open ? '<div class="chat-empty hint">아래에서 할 말을 골라 보내 보세요!<br>보낸 말은 모두의 화면에 나와요</div>' : '<div class="chat-empty">아직 아무 말도 없어요</div>');
    if (atBottom) log.scrollTop = log.scrollHeight;
    const box = this.$('.chat-compose');
    if (!open) { box.innerHTML = this.alive ? '' : `<div class="chat-note">${this.who} 말할 수 없어요</div>`; this.draft = null; box.dataset.state = ''; return; }
    if (this.my.sent >= CHAT_MAX) { box.innerHTML = '<div class="chat-note">이번 회의에서 보낼 수 있는 말을 다 썼어요</div>'; return; }
    const state = JSON.stringify(this.draft);
    if (box.dataset.state === state && box.innerHTML) return; // 고르는 중엔 다시 그리지 않음
    box.dataset.state = state;
    // 자유 입력 방식: 위에 글 입력칸, 아래에 정해진 문장 고르기
    if (settingsOf(this.app.meta).chat === 'free') {
      if (!box.querySelector('.cc-free')) {
        box.innerHTML = `<div class="cc-free"><input class="cc-in" maxlength="${FREE_MAX}" placeholder="직접 써서 보내기 (${FREE_MAX}자까지)"><button class="btn press cc-fsend">보내기</button></div>
          <div class="cc-fmsg"></div><div class="cc-or">또는 정해진 문장 고르기</div><div class="cc-tpl"></div>`;
        const inp = box.querySelector('.cc-in'), go = () => this.sendFree(inp);
        box.querySelector('.cc-fsend').onclick = go;
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      }
    } else box.querySelector('.cc-free') && (box.innerHTML = '');
    if (!this.draft) this.stepPick(); else this.stepDraft();
  }
  chatHead(step) {
    const names = ['문장 고르기', '빈칸 채우기', '보내기'];
    return `<div class="cc-steps">${names.map((n, i) => `<span class="${i + 1 === step ? 'on' : i + 1 < step ? 'done' : ''}"><i>${i + 1}</i>${n}</span>`).join('')}
      <em class="cc-left">남은 말 ${CHAT_MAX - this.my.sent}</em></div>`;
  }
  // 문장 틀의 [빈칸]을 고른 값 또는 색칠된 빈칸으로 바꿔서 보여 주기
  preview(tpl, a, cur = -1) {
    let i = 0;
    return esc(tpl.text).replace(/\[([^\]]+)\]/g, (_, label) => {
      const k = i++, v = a[k];
      if (v !== undefined) return `<b class="cc-fill">${esc(this.slotText(tpl.slots[k], v))}</b>`;
      return `<span class="cc-blank ${k === cur ? 'cur' : ''}">${esc(label)}</span>`;
    });
  }
  slotText(slot, v) {
    if (slot === 'place') return PLACES.find(p => p.id === v)?.name ?? '?';
    if (slot === 'person') return nickOf(this.app.players[v]) || '?';
    if (slot === 'mission') return missionName(v);
    return v;
  }
  ccBox() { return this.$('.cc-tpl') || this.$('.chat-compose'); }
  stepPick() {
    const box = this.ccBox();
    box.innerHTML = `${this.chatHead(1)}<div class="tpl-list">${[...CONTENT.chat].sort((a, b) => a.slots.length - b.slots.length).map(t =>
      `<button class="tpl press" data-t="${t.id}">${this.preview(t, [])}</button>`).join('')}</div>`;
    box.querySelectorAll('.tpl').forEach(b => b.onclick = () => { sfx('click'); this.draft = { t: b.dataset.t, a: [] }; this.stepDraft(); });
  }
  stepDraft() {
    const box = this.ccBox(), tpl = CONTENT.chat.find(t => t.id === this.draft.t);
    box.dataset.state = JSON.stringify(this.draft);
    const i = this.draft.a.length;
    if (i >= tpl.slots.length) return this.stepConfirm();
    const slot = tpl.slots[i], g = this.app.game || {};
    let opts = [];
    if (slot === 'place') opts = PLACES.map(p => [p.id, p.name]);
    if (slot === 'mission') opts = (this.app.priv?.tasks || Object.keys(MISSIONS)).map(t => [t, missionName(t)]);
    if (slot === 'person') opts = Object.keys(this.app.privIds()).filter(id => this.app.players[id] && !g.dead?.[id] && id !== this.app.uid)
      .map(id => [id, nickOf(this.app.players[id])]);
    const label = { place: '장소', person: '사람', mission: '미션' }[slot];
    box.innerHTML = `${this.chatHead(2)}
      <div class="cc-preview">${this.preview(tpl, this.draft.a, i)}</div>
      <div class="cc-ask">노란 빈칸에 들어갈 <b>${label}</b>을(를) 누르세요</div>
      <div class="opt-list ${slot}">${opts.map(([v, n]) => `<button class="opt press" data-v="${esc(v)}">${slot === 'person' ? avatarOf(this.app.players[v], 30) : ''}<span>${esc(n)}</span></button>`).join('')}</div>
      <button class="tpl-back press">처음부터 다시</button>`;
    box.querySelector('.tpl-back').onclick = () => { sfx('click'); this.draft = null; box.dataset.state = ''; this.renderChat(); };
    box.querySelectorAll('.opt').forEach(b => b.onclick = () => { sfx('click'); this.draft.a.push(b.dataset.v); this.stepDraft(); });
  }
  stepConfirm() {
    const box = this.ccBox(), tpl = CONTENT.chat.find(t => t.id === this.draft.t);
    box.dataset.state = JSON.stringify(this.draft);
    box.innerHTML = `${this.chatHead(3)}
      <div class="cc-preview final">${this.preview(tpl, this.draft.a)}</div>
      <div class="cc-btns"><button class="btn press cc-send">보내기</button><button class="btn btn-gray press cc-redo">다시 고르기</button></div>`;
    box.querySelector('.cc-send').onclick = () => this.send();
    box.querySelector('.cc-redo').onclick = () => { sfx('click'); this.draft = null; box.dataset.state = ''; this.renderChat(); };
  }
  // 자유 입력 보내기: 금지어 거르기 + 글자 수·간격 제한
  sendFree(inp) {
    const msg = this.$('.cc-fmsg'), text = inp.value.replace(/\s+/g, ' ').trim().slice(0, FREE_MAX), now = Date.now();
    if (!text) return;
    const plain = text.toLowerCase().replace(/[\s0-9]/g, '');
    if (BANNED.some(w => plain.includes(String(w).toLowerCase()))) { msg.textContent = '쓸 수 없는 말이 들어 있어요. 고쳐서 다시 보내 주세요'; return; }
    if (now - this.my.lastSent < 2500) { msg.textContent = '잠깐! 조금 있다가 다시 보내 주세요'; return; }
    if (this.my.sent >= CHAT_MAX) return;
    this.my.lastSent = now; this.my.sent++; sfx('click'); inp.value = ''; msg.textContent = '';
    this.app.db.push(`${P.meet(this.app.code, this.m.id)}/chat`, { u: this.app.uid, t: 'free', a: [text] });
    this.$('.chat-compose').dataset.state = ''; this.renderChat();   // '남은 말' 숫자 새로 그리기 (입력칸은 그대로)
  }
  send() {
    const now = Date.now(), d = this.draft;
    const box = this.$('.chat-compose');
    if (now - this.my.lastSent < 2500) { box.querySelector('.cc-btns')?.insertAdjacentHTML('afterend', '<div class="chat-note">잠깐! 조금 있다가 다시 눌러 주세요</div>'); return; }
    this.draft = null; box.dataset.state = '';
    this.my.lastSent = now; this.my.sent++; sfx('click');
    this.app.db.push(`${P.meet(this.app.code, this.m.id)}/chat`, { u: this.app.uid, t: d.t, a: d.a });
    this.renderChat();
  }

  showEject() {
    const r = this.m?.result; if (!r) return;
    const box = this.$('.meet-eject'), p = this.app.players[r.ejected];
    let line2 = '';
    if (r.ejected && r.wasImp !== undefined) line2 = r.wasImp ? '바이러스였어요!' : '바이러스가 아니었어요';
    const left = r.impLeft !== undefined ? `<div class="ej-left">남은 바이러스 ${r.impLeft}명</div>` : '';
    box.innerHTML = r.ejected
      ? `<div class="ej-fly">${avatarOf(p, 120)}</div><div class="ej-text">${esc(nickOf(p))}이(가) 추방됐어요</div><div class="ej-sub">${line2}</div>${left}`
      : `<div class="ej-text">아무도 추방되지 않았어요</div><div class="ej-sub">${r.tie ? '표가 같았어요' : '건너뛰기가 가장 많았어요'}</div>`;
    this.el.classList.add('ejecting'); sfx('eject');
  }

  close() {
    clearInterval(this.timer); this.unsubs.forEach(u => u()); this.el.remove();
  }
}
