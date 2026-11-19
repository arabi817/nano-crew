import { BANNED, NAME_MAX } from '../../data/names.js';
export { NAME_MAX };
// 캐릭터 색깔 (한 방에서 여러 명이 같은 색을 써도 돼요)
export const COLORS = [
  { name: '빨강', hex: '#e5484d' }, { name: '주황', hex: '#f7801e' }, { name: '노랑', hex: '#ffcc33' },
  { name: '연두', hex: '#9ad94e' }, { name: '초록', hex: '#2f9e5a' }, { name: '청록', hex: '#14a3a0' },
  { name: '하늘', hex: '#55c2f0' }, { name: '파랑', hex: '#3b5fd9' }, { name: '보라', hex: '#8a4fc4' },
  { name: '분홍', hex: '#f27bb3' }, { name: '갈색', hex: '#9a6136' }, { name: '흰색', hex: '#eef1f4' },
];
export const HATS = [
  { id: 0, name: '없음' }, { id: 1, name: '야구모자' }, { id: 2, name: '리본' },
  { id: 3, name: '왕관' }, { id: 4, name: '새싹' }, { id: 5, name: '요리사' },
  // 6번부터: GPT 그림으로만 있는 장식 (그림이 없으면 꾸미기 창에 안 보여요). 저장 규칙상 19번까지 쓸 수 있어요.
  { id: 6, name: '적혈구 띠' }, { id: 7, name: '미토 비니' }, { id: 8, name: '헤드램프' },
  { id: 9, name: '보안경' }, { id: 10, name: '고양이 귀' }, { id: 11, name: '별 핀' },
  { id: 12, name: '헤드셋' }, { id: 13, name: '토끼 귀' },
];
// 닉네임: 학생이 직접 입력 (예전 방식 '색깔 + 번호'도 읽을 수 있게 남겨 둠)
export const nickOf = p => !p ? '' : p.name || `${COLORS[p.c]?.name ?? '?'} ${p.n}`;
export const nickKey = name => String(name).toLowerCase();      // 같은 이름 막기용 열쇠
export const byNick = (a, b) => nickOf(a).localeCompare(nickOf(b), 'ko');
export const nickKeyOf = p => p?.name ? nickKey(p.name) : `${p?.c}_${p?.n}`;

// 이름 검사: 문제가 없으면 null, 있으면 안내 문장
export function checkName(raw) {
  const name = String(raw || '').trim();
  if (!name) return '이름을 넣어 주세요';
  if (name.length > NAME_MAX) return `${NAME_MAX}글자까지 쓸 수 있어요`;
  if (!/^[가-힣a-zA-Z0-9]+$/.test(name)) return '한글, 영어, 숫자만 쓸 수 있어요 (띄어쓰기·특수문자 안 돼요)';
  const plain = name.toLowerCase().replace(/[0-9]/g, '');
  if (BANNED.some(w => plain.includes(w.toLowerCase()))) return '쓸 수 없는 이름이에요. 다른 이름을 지어 주세요';
  return null;
}
export const hexNum = h => parseInt(h.slice(1), 16);

// 색 섞기: t만큼 to 색 쪽으로
export function mix(hex, t, to = '#ffffff') {
  const a = hexNum(hex), b = hexNum(to);
  const ch = (v, s) => (v >> s) & 255;
  const m = s => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}
