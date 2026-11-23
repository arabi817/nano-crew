// 미션 실험실: 지금 미션을 하나씩 해 보고(시간·틀린 횟수 기록), 분석과 개선안 시제품을 봐요.
import { MISSIONS, SAB_FIX } from '../missions/index.js';
import { CONTENT } from '../../data/content.js';
import { SPOTS, ROOMS, spotRoomName } from '../map/map.js';
import { openPanel } from '../ui/panel.js';
import { esc } from '../common/util.js';
import { REVIEW, AU_PRINCIPLES, WHY_RANDOM, PRINCIPLES, MISCONCEPTIONS } from './review.js';
import { PROTOS } from './proto.js';
import { ROOMS as ROOMS1, HALLS as HALLS1 } from '../map/map.js';
import { ROOMS2, HALLS2, LOBBY2 } from './map2.js';
import { VISION_R } from '../common/rules.js';

const $ = s => document.querySelector(s);
const UNIT = CONTENT.units;
const TYPE = { common: '공통', long: '긴 미션', short: '짧은 미션' };
const roomName = spot => SPOTS[spot] ? spotRoomName(spot, 'small') : `${spotRoomName(spot, 'big')} (넓은 맵)`;   // 새 미션은 넓은 맵에만 있어요
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
    <h2 class="lab-unit">몸속 비상사태</h2><div class="lab-grid">
      <div class="lab-card"><div class="lc-top"><b>콩팥 정지 해결</b><span class="badge sab">몸속 비상사태</span></div>
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
// ── 넓힌 맵 초안: 지금 맵과 같은 비율로 나란히 ──
function renderMap2() {
  const hex = n => typeof n === 'number' ? '#' + n.toString(16).padStart(6, '0') : n;
  const area = (rooms, halls) => rooms.filter(r => !r.lobby).reduce((s, r) => s + r.w * r.h, 0) + halls.reduce((s, h) => s + h.w * h.h, 0);
  const a1 = area(ROOMS1, HALLS1), a2 = area(ROOMS2, HALLS2);
  const seen = (n, A, v) => (n * Math.PI * VISION_R[v][0] ** 2 / A).toFixed(1);
  const svg = (rooms, halls, w, h) => `<svg class="m2-svg" viewBox="0 0 ${w} ${h}">
    ${halls.map(x => `<rect x="${x.x}" y="${x.y}" width="${x.w}" height="${x.h}" fill="#6b5a69" stroke="#1a1018" stroke-width="14"/>`).join('')}
    ${rooms.map(r => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="24" fill="${hex(r.floor)}" stroke="${r.isNew ? '#ffcc33' : '#1a1018'}" stroke-width="${r.isNew ? 40 : 18}"/>
      <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${r.w < 700 ? 74 : 92}" font-weight="900" fill="#1a1018">${esc(r.name.replace(/ \(.*\)/, ''))}</text>`).join('')}</svg>`;
  const W = 7700, Hh = 3200;   // 두 그림을 같은 축척으로
  const rooms1 = ROOMS1.map(r => ({ ...r })), rows = [[10, '10명'], [16, '16명'], [20, '20명'], [32, '32명']];
  $('[data-page="map2"]').innerHTML = `
    <p class="lab-lead">지금 게임 맵은 그대로 두고, 넓힌다면 어떻게 할지 그려 본 <b>초안</b>이에요. 두 그림은 <b>같은 축척</b>이에요.
      노란 테두리가 새로 생기는 방이에요. 아직 바닥 그림·소품·미션 장소는 없고, 방 배치만 있어요.</p>
    <div class="m2-grid">
      <div class="m2-card"><h3>지금 맵 <small>방 ${ROOMS1.filter(r => !r.lobby).length}개 · ${(a1 / 1e6).toFixed(1)}백만 px²</small></h3>${svg(rooms1, HALLS1, W, Hh)}</div>
      <div class="m2-card"><h3>넓힌 맵 초안 <small>방 ${ROOMS2.length}개 · ${(a2 / 1e6).toFixed(1)}백만 px² (${(a2 / a1).toFixed(1)}배)</small></h3>${svg([...ROOMS2, LOBBY2], HALLS2, W, Hh)}</div>
    </div>
    <h2 class="lab-unit">내 시야 안에 늘 보이는 친구 수 (평균)</h2>
    <table class="lab-table"><thead><tr><th>인원</th><th>지금 맵 · 시야 넓게</th><th>지금 맵 · 시야 좁게</th><th>넓힌 맵 · 시야 넓게</th><th>넓힌 맵 · 시야 좁게</th></tr></thead>
      <tbody>${rows.map(([n, t]) => `<tr><td>${t}</td><td>${seen(n, a1, 'wide')}명</td><td>${seen(n, a1, 'narrow')}명</td><td>${seen(n, a2, 'wide')}명</td><td>${seen(n, a2, 'narrow')}명</td></tr>`).join('')}</tbody></table>
    <p class="lab-lead">참고: 어몽어스 10명은 약 1명 안팎이에요. 1~1.5명이면 '가끔 마주치고, 숨을 곳도 있는' 정도예요.</p>
    <h2 class="lab-unit">방 목록과 쓰임 (초안)</h2>
    <table class="lab-table"><thead><tr><th>방</th><th>구분</th><th>들어갈 미션·역할</th></tr></thead>
      <tbody>${ROOMS2.map(r => `<tr><td>${esc(r.name)}</td><td>${r.isNew ? '<b style="color:#b8860b">새로</b>' : '지금 있음'}</td><td>${esc(r.note)}</td></tr>`).join('')}</tbody></table>
    <h2 class="lab-unit">실제로 넓히려면 할 일</h2>
    <table class="lab-table"><thead><tr><th>할 일</th><th>내용</th></tr></thead><tbody>
      <tr><td>맵 데이터</td><td>방·복도 좌표, 미션 장소 28곳 + 새 방 자리, 혈관 통로(벤트) 다시 잇기, 몸속 비상사태 장치 위치</td></tr>
      <tr><td>그림 (GPT)</td><td>새 방 바닥 4~6장, 간·이자·근육 소품, 기존 방 크기 바뀐 것 바닥 다시 맞추기</td></tr>
      <tr><td>새 미션 (선생님 확인 필요)</td><td>이자실(이자액), 간실(쓸개즙) 같은 새 내용은 문제·보기를 먼저 확인받고 만들어요</td></tr>
      <tr><td>시험</td><td>봇 30명으로 길 막힘·몰림·통신량 확인</td></tr></tbody></table>`;
}

renderNow(); renderReview(); renderProto(); renderMap2();
