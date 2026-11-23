// 학생 화면과 교사 화면이 같이 쓰는 회의 도우미
import { CONTENT } from '../../data/content.js';
import { ROOMS } from '../map/map.js';
import { MISSIONS } from '../missions/index.js';
import { COLORS, nickOf } from '../common/colors.js';
import { avatarSVG } from '../player/avatarSvg.js';
import { esc } from '../common/util.js';

export const PLACES = ROOMS.filter(r => !r.lobby).map(r => ({ id: r.id, name: r.name.replace(/ \(.*\)/, '') }));
export const placeName = id => PLACES.find(p => p.id === id)?.name ?? '?';
export const missionName = id => MISSIONS[id]?.title ?? '?';

// 채팅 한 줄: { u: 보낸 사람, t: 문장 틀 id, a: [고른 값들] } → 화면 글자
export function chatText(msg, players) {
  if (msg.t === 'free') return String(msg.a?.[0] ?? '').slice(0, 40);   // 자유 입력
  const tpl = CONTENT.chat.find(c => c.id === msg.t); if (!tpl) return '';
  let i = 0;
  return tpl.text.replace(/\[[^\]]+\]/g, () => {
    const slot = tpl.slots[i], v = (msg.a || [])[i++];
    if (slot === 'place') return placeName(v);
    if (slot === 'person') return nickOf(players[v]) || '?';
    if (slot === 'mission') return missionName(v);
    return '?';
  });
}

export function callerText(m, players) {
  if (m.caller === 'teacher') return '선생님이 회의를 열었어요';
  const who = nickOf(players[m.caller]) || '누군가';
  return m.body ? `${who}이(가) 쓰러진 ${nickOf(players[m.body]) || '대원'}을(를) 발견했어요` : `${who}이(가) 긴급 회의를 열었어요`;
}

export function avatarOf(p, size = 56) { return avatarSVG(COLORS[p?.c]?.hex || '#999', p?.hat || 0, size); }

export function chatHTML(chat, players) {
  return Object.entries(chat || {}).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([, m]) => {
    const p = players[m.u];
    return `<div class="chat-line"><span class="chat-who" style="--pc:${COLORS[p?.c]?.hex || '#999'}">${esc(nickOf(p) || '?')}</span>${esc(chatText(m, players))}</div>`;
  }).join('');
}

export const PHASE_NAME = { ox: 'OX 퀴즈', discuss: '토론', vote: '투표', result: '결과' };

// 회의를 연 사람 표시 (확성기)
export const MEGAPHONE = '<svg class="mega" viewBox="0 0 48 48" aria-label="회의를 연 사람"><path d="M8 20 h8 l18 -10 v28 l-18 -10 h-8 z" fill="#ffcc33" stroke="#1a1018" stroke-width="4" stroke-linejoin="round"/><path d="M14 28 l3 11 h6 l-3 -11" fill="#ffcc33" stroke="#1a1018" stroke-width="4" stroke-linejoin="round"/></svg>';

// 회의 채팅 칸: 학생 문장 + "○○이(가) 투표했어요. N명 남음" 알림을 들어온 순서대로
export class MeetingFeed {
  constructor() { this.seen = new Map(); this.n = 0; }
  stamp(key) { if (!this.seen.has(key)) this.seen.set(key, ++this.n); return this.seen.get(key); }
  html(chat, vote, players, eligible) {
    const items = [];
    for (const [k, m] of Object.entries(chat || {})) items.push({ t: this.stamp('c' + k), m });
    let voted = 0;
    const order = Object.keys(vote || {}).filter(id => eligible.includes(id)).map(id => ({ id, t: this.stamp('v' + id) })).sort((a, b) => a.t - b.t);
    for (const v of order) { voted++; items.push({ t: v.t, sys: `${nickOf(players[v.id]) || '누군가'}이(가) 투표했어요. ${Math.max(0, eligible.length - voted)}명 남음` }); }
    items.sort((a, b) => a.t - b.t);
    return items.map(it => it.sys ? `<div class="chat-line sys">${esc(it.sys)}</div>` : chatHTML({ x: it.m }, players)).join('');
  }
}
