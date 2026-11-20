// 미션 실험실: 지금 미션을 하나씩 해 보고(시간·틀린 횟수 기록), 분석과 개선안 시제품을 봐요.
import { MISSIONS, SAB_FIX } from '../missions/index.js';
import { CONTENT } from '../../data/content.js';
import { SPOTS, ROOMS } from '../map/map.js';
import { openPanel } from '../ui/panel.js';
import { esc } from '../common/util.js';
import { REVIEW, AU_PRINCIPLES, WHY_RANDOM, PRINCIPLES, MISCONCEPTIONS } from './review.js';
import { PROTOS } from './proto.js';

const $ = s => document.querySelector(s);
const UNIT = CONTENT.units;
const TYPE = { common: '공통', long: '긴 미션', short: '짧은 미션' };
const roomName = spot => ROOMS.find(r => r.id === SPOTS[spot]?.room)?.name ?? '';
const results = {};   // 미션·단계별 마지막 결과

// 미션 창을 열고 시간·틀린 횟수를 재요
function play({ key, title, sub, note, big, mount, onDone }) {
  const t0 = performance.now(); let wrong = 0;
  openPanel({
    title, sub, note, big,
    mount: (el, api) => mount(el, { ...api, wrong() { wrong++; api.wrong(); } }),
    onSuccess: () => { results[key] = { sec: (performance.now() - t0) / 1000, wrong }; onDone?.(); renderNow(); },
  });
}

function resultChip(key) {
  const r = results[key];
  return r ? `<span class="chip ${r.wrong ? 'warn' : 'ok'}">${r.sec.toFixed(1)}초 · 틀림 ${r.wrong}번</span>` : '';
}

// ── 지금 미션 해 보기 ──
function renderNow() {
  const units = Object.keys(UNIT);
  const byUnit = u => Object.values(MISSIONS).filter(m => m.unit === u);
  $('[data-page="now"]').innerHTML = `
    <p class="lab-lead">미션 이름 아래 <b>단계 버튼</b>을 누르면 게임과 똑같은 미션 창이 열려요. 끝나면 걸린 시간과 틀린 횟수가 남아요.
      <b>진단 보기</b>를 누르면 문제점과 개선안 요약이 나와요.</p>
    ${units.map(u => `<h2 class="lab-unit">${esc(UNIT[u])}</h2><div class="lab-grid">${byUnit(u).map(card).join('')}</div>`).join('')}
    <h2 class="lab-unit">사보타주</h2><div class="lab-grid">
      <div class="lab-card"><div class="lc-top"><b>콩팥 정지 해결</b><span class="badge sab">사보타주</span></div>
        <div class="lc-steps"><button class="lc-step press" data-sab="kidney">해 보기</button>${resultChip('sab:kidney')}</div></div></div>`;
  document.querySelectorAll('.lc-step[data-m]').forEach(b => b.onclick = () => {
    const m = MISSIONS[b.dataset.m], i = +b.dataset.i, s = m.steps[i];
    play({ key: `${m.id}:${i}`, title: m.title + (m.steps.length > 1 ? ` (${i + 1}/${m.steps.length})` : ''), sub: s.sub, note: s.note, big: s.big, mount: s.mount });
  });
  document.querySelectorAll('.lc-all').forEach(b => b.onclick = () => {
    const m = MISSIONS[b.dataset.m];
    const go = i => i < m.steps.length && play({
      key: `${m.id}:${i}`, title: `${m.title} (${i + 1}/${m.steps.length})`, sub: m.steps[i].sub, mount: m.steps[i].mount,
      onDone: () => setTimeout(() => go(i + 1), 300),
    });
    go(0);
  });
  document.querySelector('[data-sab="kidney"]').onclick = () =>
    play({ key: 'sab:kidney', title: '콩팥 정지 해결', sub: '여과: 토리의 혈액에서 보먼주머니로 빠져나가는 물질만 끌어 보내 콩팥을 다시 움직이세요.', mount: SAB_FIX.kidney });
  document.querySelectorAll('.lc-more').forEach(b => b.onclick = () => b.closest('.lab-card').classList.toggle('open'));
  document.querySelectorAll('.lc-proto').forEach(b => b.onclick = () => openProto(b.dataset.p));
}

function card(m) {
  const r = REVIEW[m.id] || {};
  return `<div class="lab-card">
    <div class="lc-top"><b>${esc(m.title)}</b><span class="badge ${m.type}">${TYPE[m.type]}</span>${m.visible ? '<span class="badge vis">보이는 미션</span>' : ''}
      ${r.pri ? `<span class="badge pri p-${r.pri}">개선 ${r.pri}</span>` : ''}</div>
    <div class="lc-steps">${m.steps.map((s, i) => `<button class="lc-step press" data-m="${m.id}" data-i="${i}">
        ${m.steps.length > 1 ? `${i + 1}. ${esc(s.name || '')}` : '해 보기'}<small>${esc(roomName(s.spot))}</small></button>${resultChip(`${m.id}:${i}`)}`).join('')}
      ${m.steps.length > 1 ? `<button class="lc-all press" data-m="${m.id}">처음부터 끝까지</button>` : ''}</div>
    ${r.learn ? `<button class="lc-more press">진단 보기</button>
    <div class="lc-review">
      <div><i>배우는 것</i>${esc(r.learn)}</div>
      <div><i>문제</i>${esc(r.problem)}</div>
      <div><i>개선안</i>${esc(r.idea)}</div>
      <div><i>닮은 어몽어스 미션</i>${esc(r.au)}</div>
      ${r.proto ? `<button class="btn press lc-proto" data-p="${r.proto}">개선안 시제품 해 보기</button>` : ''}
    </div>` : ''}
  </div>`;
}

// ── 분석 ──
function renderReview() {
  const table = (rows, h) => `<table class="lab-table"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const missions = Object.values(MISSIONS);
  $('[data-page="review"]').innerHTML = `
    <p class="lab-lead">Claude가 미션 코드를 하나씩 살펴본 분석에 GPT의 교차 의견을 더했어요. 게임에는 아직 아무것도 반영하지 않았어요.</p>
    <h2 class="lab-unit">1. 어몽어스 미션은 왜 바로 이해될까?</h2>${table(AU_PRINCIPLES, ['설계 원리', '예'])}
    <h2 class="lab-unit">2. 우리 미션은 왜 "아무거나 클릭"처럼 느껴질까?</h2>${table(WHY_RANDOM, ['원인', '지금 모습'])}
    <h2 class="lab-unit">3. 학습이 되는 미션 원칙</h2>${table(PRINCIPLES, ['원칙', '뜻'])}
    <h2 class="lab-unit">4. 미션별 진단 (개선 우선순위 순)</h2>
    ${table(missions.filter(m => REVIEW[m.id]).sort((a, b) => '상중하'.indexOf(REVIEW[a.id].pri) - '상중하'.indexOf(REVIEW[b.id].pri))
      .map(m => [`${m.title} (${REVIEW[m.id].pri})`, REVIEW[m.id].problem, REVIEW[m.id].idea]), ['미션 (우선순위)', '문제', '개선안'])}
    <h2 class="lab-unit">5. 개선할 때 꼭 피할 오개념</h2>${table(MISCONCEPTIONS, ['오개념', '바른 표현'])}`;
}

// ── 개선안 맛보기 ──
function openProto(id) {
  const p = PROTOS[id];
  play({ key: `proto:${id}`, title: `[개선안] ${p.title}`, sub: p.sub, mount: p.mount, onDone: renderProto });
  switchTab('proto');
}
function renderProto() {
  $('[data-page="proto"]').innerHTML = `
    <p class="lab-lead">"행동 자체가 과학 과정"이 되게 다시 만든 시제품 ${Object.keys(PROTOS).length}가지예요. 지금 미션과 비교해 보시고, 이 방향이 좋으면 나머지도 이렇게 바꿀게요.
      <b>게임에는 아직 넣지 않았어요.</b></p>
    <div class="lab-grid proto">${Object.entries(PROTOS).map(([id, p]) => `<div class="lab-card">
      <div class="lc-top"><b>${esc(p.title)}</b><span class="badge pri p-상">시제품</span></div>
      <div class="lc-review show">
        <div><i>바꾸는 미션</i>${esc(p.from)}</div>
        <div><i>학생이 하는 일</i>${esc(p.how)}</div>
        <div><i>배우는 것</i>${esc(p.learn)}</div>
        <div><i>틀리면</i>${esc(p.wrong)}</div>
      </div>
      <div class="lc-steps"><button class="btn press" data-proto="${id}">해 보기</button>${resultChip(`proto:${id}`)}
        <button class="lc-step press" data-cmp="${p.compare}">비교: 지금 미션</button></div></div>`).join('')}</div>`;
  document.querySelectorAll('[data-proto]').forEach(b => b.onclick = () => openProto(b.dataset.proto));
  document.querySelectorAll('[data-cmp]').forEach(b => b.onclick = () => {
    const m = MISSIONS[b.dataset.cmp];
    const go = i => i < m.steps.length && play({ key: `${m.id}:${i}`, title: `${m.title} (${i + 1}/${m.steps.length})`, sub: m.steps[i].sub, mount: m.steps[i].mount, onDone: () => setTimeout(() => go(i + 1), 300) });
    go(0);
  });
}

function switchTab(t) {
  document.querySelectorAll('.lab-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  document.querySelectorAll('.lab-page').forEach(p => p.hidden = p.dataset.page !== t);
}
document.querySelectorAll('.lab-tab').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
renderNow(); renderReview(); renderProto();
