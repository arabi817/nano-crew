// 배설 미션: 콩팥단위 필터(긴), 노폐물 분류, 요소 공장, 콩팥 정지 사보타주 퍼즐
import { sortGame, zoneSwap, orderGame, pick, esc } from './kit.js';

// 위쪽 흐름 띠: 지금이 콩팥단위의 어느 단계인지 (1 여과 → 2 재흡수·분비 → 오줌)
function nephronFrame(el, step) {
  const names = ['① 여과 <small>토리 → 보먼주머니</small>', '② 재흡수·분비 <small>세뇨관 ↔ 모세혈관</small>', '오줌'];
  el.innerHTML = `<div class="nx"><div class="nx-flow">${names.map((n, i) => `<span class="${i < step ? 'done' : i === step ? 'on' : ''}">${n}</span>`).join('<i>→</i>')}</div>
    <div class="nx-play"></div></div>`;
  return el.querySelector('.nx-play');
}

// 1단계 여과: 토리 → 보먼주머니 (걸러지지 않는 물질은 그대로)
export function nephronFilter(el, api, C) {
  const items = [...C.pass.map(l => ({ label: l, ok: ['보먼주머니'] })), ...C.block.map(l => ({ label: l, ok: [] }))];
  return sortGame(nephronFrame(el, 0), api, {
    items, tray: '토리 (혈액)', note: '여과되지 않는 물질은 토리(혈액)에 그대로 두세요', cls: 'neph',
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
  const play = nephronFrame(el, 1);
  const cleanup = zoneSwap(play, api, { zones: [{ name: T, sub: '여과액 → 나중에 오줌이 돼요' }, { name: B, sub: '혈액' }], items, cls: 'neph2' });
  // 시작 안내: 1단계에서 걸러진 물질이 여기로 왔다는 것을 먼저 보여 줘요
  play.insertAdjacentHTML('beforeend', `<div class="nx-intro"><div class="nx-card">
    <b>1단계에서 걸러진 <em>여과액</em>(${C.pass.map(esc).join('·')})이 <em>세뇨관</em>으로 흘러왔어요.</b>
    <p>몸에 필요한 물질은 <em>모세혈관으로 되돌리고</em>(재흡수), 혈액에 남은 노폐물은 <em>세뇨관으로 내보내요</em>(분비).</p>
    <button class="btn press nx-go">시작</button></div></div>`);
  play.querySelector('.nx-go').onclick = () => play.querySelector('.nx-intro').remove();
  return cleanup;
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
    items, tray: '멈춘 토리 (혈액)', note: '여과되지 않는 물질은 토리(혈액)에 그대로 두세요', cls: 'neph',
    bins: [{ name: '보먼주머니', html: '<b>보먼주머니</b>' }],
  });
}
