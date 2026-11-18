// 닉네임 = 색깔 + 번호 (실명은 쓰지 않아요)
export const COLORS = [
  { name: '빨강', hex: '#e5484d' }, { name: '주황', hex: '#f7801e' }, { name: '노랑', hex: '#ffcc33' },
  { name: '연두', hex: '#9ad94e' }, { name: '초록', hex: '#2f9e5a' }, { name: '청록', hex: '#14a3a0' },
  { name: '하늘', hex: '#55c2f0' }, { name: '파랑', hex: '#3b5fd9' }, { name: '보라', hex: '#8a4fc4' },
  { name: '분홍', hex: '#f27bb3' }, { name: '갈색', hex: '#9a6136' }, { name: '흰색', hex: '#eef1f4' },
];
export const MAX_NUM = 40;
export const HATS = [
  { id: 0, name: '없음' }, { id: 1, name: '야구모자' }, { id: 2, name: '리본' },
  { id: 3, name: '왕관' }, { id: 4, name: '새싹' }, { id: 5, name: '요리사' },
];
export const nickOf = p => p ? `${COLORS[p.c]?.name ?? '?'} ${p.n}` : '';
export const nickKey = (c, n) => `${c}_${n}`;
export const hexNum = h => parseInt(h.slice(1), 16);

// 색 섞기: t만큼 to 색 쪽으로
export function mix(hex, t, to = '#ffffff') {
  const a = hexNum(hex), b = hexNum(to);
  const ch = (v, s) => (v >> s) & 255;
  const m = s => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}
