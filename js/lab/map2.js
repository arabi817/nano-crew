// 넓힌 맵 초안 (게임에는 안 씀 — 실험실에서 지금 맵과 비교만 해요)
// 3줄 × 5칸 격자: 위 = 소화, 가운데 = 호흡·순환(+회의실), 아래 = 세포 호흡·배설
const COL = [200, 1350, 2500, 3750, 4900];          // 칸 왼쪽 x (방 사이 복도 350)
const ROW = [200, 1200, 2350];                      // 줄 위쪽 y (줄 사이 복도 350)
const H = [650, 800, 650];                          // 줄마다 방 높이
const W = c => (c === 2 ? 900 : 800);               // 가운데 칸만 조금 넓게
const room = (id, name, c, r, floor, isNew, note) => ({ id, name, x: COL[c], y: ROW[r], w: W(c), h: H[r], floor, isNew, note, c, r });

export const ROOMS2 = [
  room('mouth', '입·식도실', 0, 0, '#ffc79a', true, '지금 소화실(입·위)을 둘로 나눔. 소화효소 배선 1단계(입)'),
  room('stomach', '위실', 1, 0, '#f6b48a', true, '소화효소 배선 2단계(위), 영양소 검출'),
  room('liver', '간실', 2, 0, '#c98a7a', true, '새 방. 요소 공장(암모니아 → 요소), 쓸개즙 저장 이야기'),
  room('pancreas', '이자실', 3, 0, '#f2e0a0', true, '새 방. 이자액(소화효소) 미션 자리'),
  room('small', '작은창자실', 4, 0, '#f5d98a', false, '소화효소 배선 3단계, 융털 흡수, 포도당 캡슐'),
  room('lungR', '오른쪽 허파실', 0, 1, '#9fd6f0', true, '지금 허파실을 둘로. 산소 부족 사보타주 한쪽 버튼'),
  room('heart', '심장실', 1, 1, '#f29a9a', false, '심장 박동, 심장 배선'),
  room('meeting', '중앙 회의실', 2, 1, '#8ea2a8', false, '긴급 회의 버튼 (게임 시작 자리)'),
  room('vessel', '혈관 관제실', 3, 1, '#cf8f9f', false, '혈구 스캔, 혈관 정비, 적혈구 카드'),
  room('lungL', '왼쪽 허파실', 4, 1, '#9fd6f0', true, '허파꽈리 필터, 호흡 모형, 산소 부족 다른 쪽 버튼'),
  room('muscle', '근육실 (세포 발전소)', 0, 2, '#9fd38a', true, '세포 발전소를 근육 세포로: 에너지를 쓰는 곳이 보이게'),
  room('large', '큰창자실', 1, 2, '#d9b48a', false, '큰창자 비우기'),
  room('kidney', '콩팥실', 2, 2, '#d8a48f', false, '콩팥단위 필터, 노폐물 분류'),
  room('bladder', '방광 처리실', 3, 2, '#f2e38a', false, '노폐물 배출 마지막'),
];
export const LOBBY2 = { id: 'lobby', name: '탐사정 격납고', x: 6200, y: 200, w: 1300, h: 850, floor: '#9aa7b8' };
export const WORLD2 = { w: 7700, h: 3200 };

// 이웃한 방끼리 복도 (가로: 같은 줄, 세로: 같은 칸)
const at = (c, r) => ROOMS2.find(x => x.c === c && x.r === r);
const hallH = (c, r) => { const a = at(c, r), b = at(c + 1, r); const cy = a.y + a.h / 2; return { a: a.id, b: b.id, x: a.x + a.w, y: cy - 80, w: b.x - (a.x + a.w), h: 160 }; };
const hallV = (c, r) => { const a = at(c, r), b = at(c, r + 1); const cx = a.x + a.w / 2; return { a: a.id, b: b.id, x: cx - 80, y: a.y + a.h, w: 160, h: b.y - (a.y + a.h) }; };
export const HALLS2 = [
  hallH(0, 0), hallH(1, 0), hallH(2, 0), hallH(3, 0),
  hallH(0, 1), hallH(1, 1), hallH(2, 1), hallH(3, 1),
  hallH(0, 2), hallH(1, 2), hallH(2, 2),
  hallV(0, 0), hallV(2, 0), hallV(4, 0),
  hallV(1, 1), hallV(2, 1), hallV(3, 1),
];
