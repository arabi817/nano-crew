// 배설 미션: 콩팥단위 필터(긴), 노폐물 분류, 요소 공장, 콩팥 정지 사보타주 퍼즐
import { sortGame, zoneSwap, orderGame, pick, esc } from './kit.js';

// 1단계 여과: 토리 → 보먼주머니 (걸러지지 않는 물질은 그대로)
export function nephronFilter(el, api, C) {
  const items = [...C.pass.map(l => ({ label: l, ok: ['보먼주머니'] })), ...C.block.map(l => ({ label: l, ok: [] }))];
  return sortGame(el, api, {
    items, tray: '토리 (혈액)', note: '걸러지지 않는 물질은 그대로 두세요', cls: 'neph',
    bins: [{ name: '보먼주머니', html: '<b>보먼주머니</b><small>여과된 물질</small>' }],
  });
}

// 2단계 재흡수와 분비: 세뇨관 ↔ 모세혈관
export function nephronReabsorb(el, api, C) {
  const T = '세뇨관', B = '모세혈관';
  const items = [
    ...C.reabsorbAll.map(l => ({ label: `${l} (모두)`, from: T, to: B })),
    ...C.reabsorbMost.map(l => ({ label: `${l} (대부분)`, from: T, to: B })),
    ...C.secrete.map(l => ({ label: l, from: B, to: T })),
  ];
  return zoneSwap(el, api, { zones: [{ name: T }, { name: B }], items, cls: 'neph2' });
}

// 노폐물 분류: 상자를 슈트에 넣기
export function wasteSort(el, api, C) {
  const names = Object.keys(C.items);
  const items = Array.from({ length: C.count }, (_, i) => {
    const n = names[i < names.length ? i : Math.floor(Math.random() * names.length)];
    return { label: n, ok: C.items[n] };
  });
  return sortGame(el, api, {
    items, tray: '노폐물 상자', cls: 'chutes',
    bins: C.chutes.map(c => ({ name: c, html: `<b>${esc(c)}</b><small>슈트</small>` })),
  });
}

// 요소 공장: 순서대로 누르기
export function ureaFactory(el, api, C) {
  return orderGame(el, api, { order: C.order, title: '요소가 만들어져 몸 밖으로 나가는 순서', cls: 'urea' });
}

// 콩팥 정지(사보타주) 해결: 짧은 여과 퍼즐
export function kidneyFix(el, api, C) {
  const items = [...pick(C.pass, 3).map(l => ({ label: l, ok: ['보먼주머니'] })), ...pick(C.block, 1).map(l => ({ label: l, ok: [] }))];
  return sortGame(el, api, {
    items, tray: '멈춘 토리', note: '걸러지는 물질만 보먼주머니로!', cls: 'neph',
    bins: [{ name: '보먼주머니', html: '<b>보먼주머니</b>' }],
  });
}
