// 맵 데이터: 방(사각형)과 복도(사각형)를 이은 구조. 걸을 수 있는 곳 = 방 + 복도.
// 좌표 단위는 픽셀(게임 세계 기준). 대기실(탐사정 격납고)은 오른쪽에 떨어져 있어요.
export const WORLD = { w: 5800, h: 2700 };

export const ROOMS = [
  { id: 'meeting', name: '중앙 회의실', x: 1300, y: 1000, w: 900, h: 700, floor: 0x8ea2a8 },
  { id: 'power', name: '세포 발전소', x: 200, y: 1950, w: 700, h: 500, floor: 0x9fd38a },
  { id: 'digest', name: '소화실 (입·위)', x: 200, y: 200, w: 700, h: 550, floor: 0xffc79a },
  { id: 'small', name: '작은창자실', x: 1350, y: 150, w: 800, h: 600, floor: 0xf5d98a },
  { id: 'large', name: '큰창자실', x: 2600, y: 200, w: 700, h: 550, floor: 0xd9b48a },
  { id: 'heart', name: '심장실', x: 2650, y: 1050, w: 700, h: 600, floor: 0xf29a9a },
  { id: 'vessel', name: '혈관 관제실', x: 1400, y: 2000, w: 700, h: 450, floor: 0xcf8f9f },
  { id: 'lung', name: '허파실', x: 150, y: 950, w: 800, h: 800, floor: 0x9fd6f0 },
  { id: 'kidney', name: '콩팥실', x: 2500, y: 1950, w: 550, h: 500, floor: 0xd8a48f },
  { id: 'bladder', name: '방광 처리실', x: 3250, y: 2000, w: 450, h: 450, floor: 0xf2e38a },
  { id: 'lobby', name: '탐사정 격납고', x: 4300, y: 300, w: 1300, h: 850, floor: 0x9aa7b8, lobby: true },
];

export const HALLS = [
  { a: 'digest', b: 'small', x: 900, y: 400, w: 450, h: 160 },
  { a: 'small', b: 'large', x: 2150, y: 400, w: 450, h: 160 },
  { a: 'small', b: 'meeting', x: 1670, y: 750, w: 160, h: 250 },
  { a: 'lung', b: 'meeting', x: 950, y: 1270, w: 350, h: 160 },
  { a: 'meeting', b: 'heart', x: 2200, y: 1270, w: 450, h: 160 },
  { a: 'meeting', b: 'vessel', x: 1670, y: 1700, w: 160, h: 300 },
  { a: 'digest', b: 'lung', x: 470, y: 750, w: 160, h: 200 },
  { a: 'lung', b: 'power', x: 470, y: 1750, w: 160, h: 200 },
  { a: 'power', b: 'vessel', x: 900, y: 2150, w: 500, h: 160 },
  { a: 'vessel', b: 'kidney', x: 2100, y: 2150, w: 400, h: 160 },
  { a: 'kidney', b: 'bladder', x: 3050, y: 2150, w: 200, h: 160 },
  { a: 'large', b: 'heart', x: 2920, y: 750, w: 160, h: 300 },
  { a: 'heart', b: 'kidney', x: 2700, y: 1650, w: 160, h: 300 },
];

export const TABLE = { x: 1750, y: 1350, r: 170 };     // 회의 테이블 (못 지나감)
export const BLOCKS = [{ x: TABLE.x, y: TABLE.y, r: TABLE.r }];

// 미션 장치 위치 (미션 단계마다 하나씩)
export const SPOTS = {
  // 소화실
  digestWireMouth: { room: 'digest', x: 330, y: 310, label: '입 패널' },
  digestWireStomach: { room: 'digest', x: 780, y: 310, label: '위 패널' },
  nutrientTest: { room: 'digest', x: 300, y: 680 },
  gutAssembly: { room: 'digest', x: 600, y: 680 },
  // 작은창자실
  digestWireSmall: { room: 'small', x: 1500, y: 310, label: '작은창자 패널' },
  villi: { room: 'small', x: 2000, y: 310 },
  powerGlucose: { room: 'small', x: 1750, y: 450, label: '포도당 캡슐' },
  // 큰창자실
  colon: { room: 'large', x: 2950, y: 475 },
  // 심장실
  heartWiring: { room: 'heart', x: 3255, y: 1560 },
  heartbeat: { room: 'heart', x: 3260, y: 1180 },
  // 혈관 관제실
  rbcCard: { room: 'vessel', x: 1500, y: 2200 },
  bloodScan: { room: 'vessel', x: 2000, y: 2200 },
  vesselCheck: { room: 'vessel', x: 1750, y: 2390 },
  wasteUreaPick: { room: 'vessel', x: 1500, y: 2390, label: '요소 받기' },
  // 허파실
  alveoliFilter: { room: 'lung', x: 250, y: 1060 },
  breathModel: { room: 'lung', x: 250, y: 1260 },
  powerO2: { room: 'lung', x: 250, y: 1460, label: '산소 캡슐 (왼쪽)' },
  wasteCO2Out: { room: 'lung', x: 250, y: 1660, label: '이산화탄소 배출구' },
  diaphragm: { room: 'lung', x: 850, y: 1060 },
  airPath: { room: 'lung', x: 720, y: 1080 },
  powerO2b: { room: 'lung', x: 850, y: 1580, label: '산소 캡슐 (오른쪽)' },
  // 세포 발전소
  powerFinal: { room: 'power', x: 560, y: 2230, label: '발전기' },
  wasteCO2Pick: { room: 'power', x: 230, y: 2230, label: '이산화탄소 받기' },
  // 콩팥실
  nephron1: { room: 'kidney', x: 2580, y: 2040, label: '사구체 장치' },
  nephron2: { room: 'kidney', x: 2970, y: 2040, label: '세뇨관 장치' },
  wasteSort: { room: 'kidney', x: 2775, y: 2410 },
  wasteUreaDrop: { room: 'kidney', x: 2580, y: 2420, label: '요소 넣기' },
  // 방광 처리실
  ureaFactory: { room: 'bladder', x: 3330, y: 2090 },
};
export const TASK_SPOTS = SPOTS; // 예전 이름

// 사보타주 해결 장치
export const SAB_SPOTS = {
  o2Lung: { room: 'lung', x: 690, y: 1680, kind: 'o2', side: 'lung' },
  o2Heart: { room: 'heart', x: 2730, y: 1120, kind: 'o2', side: 'heart' },
  kidneyStop: { room: 'kidney', x: 2970, y: 2420, kind: 'kidney' },
};

// 혈관 통로(벤트): 바이러스만 써요. 서로 먼 방끼리 4쌍
export const VENTS = {
  vDigest: { room: 'digest', x: 820, y: 680, to: 'vKidney' },
  vKidney: { room: 'kidney', x: 2775, y: 2205, to: 'vDigest' },
  vLarge: { room: 'large', x: 2680, y: 680, to: 'vPower' },
  vPower: { room: 'power', x: 820, y: 2400, to: 'vLarge' },
  vSmall: { room: 'small', x: 2080, y: 600, to: 'vBladder' },
  vBladder: { room: 'bladder', x: 3600, y: 2410, to: 'vSmall' },
  vLung: { room: 'lung', x: 420, y: 1660, to: 'vHeart' },
  vHeart: { room: 'heart', x: 3270, y: 1370, to: 'vLung' },
};

export const LOBBY = ROOMS.find(r => r.lobby);
export const roomById = id => ROOMS.find(r => r.id === id);
export const roomName = id => roomById(id)?.name.replace(/ \(.*\)/, '') ?? '';

const AREAS = [...ROOMS, ...HALLS];
const inRect = (a, x, y) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h;
const inAreas = (x, y) => AREAS.some(a => inRect(a, x, y));

// 혈관 막힘(사보타주): 막힌 방의 문(복도 입구) 사각형
let blockedDoors = [];
export function doorsOf(roomId) {
  const r = ROOMS.find(q => q.id === roomId); if (!r) return [];
  const out = [], D = 46;
  for (const h of HALLS) {
    if (h.a !== roomId && h.b !== roomId) continue;
    if (h.w > h.h) { // 가로 복도: 방이 왼쪽/오른쪽
      if (Math.abs(h.x - (r.x + r.w)) < 2) out.push({ x: h.x, y: h.y, w: D, h: h.h });
      else out.push({ x: h.x + h.w - D, y: h.y, w: D, h: h.h });
    } else {
      if (Math.abs(h.y - (r.y + r.h)) < 2) out.push({ x: h.x, y: h.y, w: h.w, h: D });
      else out.push({ x: h.x, y: h.y + h.h - D, w: h.w, h: D });
    }
  }
  return out;
}
export function setBlockedDoors(list) { blockedDoors = list || []; }
const inDoor = (x, y) => blockedDoors.some(d => inRect(d, x, y));

// 반지름 r인 캐릭터가 (x,y)에 설 수 있나?
export function walkable(x, y, r) {
  if (!inAreas(x, y) || inDoor(x, y)) return false;
  for (let i = 0; i < 8; i++) {
    const an = i * Math.PI / 4, px = x + Math.cos(an) * r, py = y + Math.sin(an) * r;
    if (!inAreas(px, py) || inDoor(px, py)) return false;
  }
  for (const b of BLOCKS) if (Math.hypot(x - b.x, y - b.y) < b.r + r) return false;
  return true;
}
export const roomAt = (x, y) => ROOMS.find(r => inRect(r, x, y)) || null;

export function spawnPoint(i, n) {
  const an = -Math.PI / 2 + i * 2 * Math.PI / Math.max(n, 1);
  return { x: TABLE.x + Math.cos(an) * 265, y: TABLE.y + Math.sin(an) * 265 };
}
export function randomPointIn(r, inset = 90) {
  for (let k = 0; k < 40; k++) {
    const x = r.x + inset + Math.random() * (r.w - 2 * inset);
    const y = r.y + inset + Math.random() * (r.h - 2 * inset);
    if (walkable(x, y, 24)) return { x, y };
  }
  return { x: r.x + r.w / 2, y: r.y + inset };
}
export const lobbySpawn = () => randomPointIn(LOBBY, 140);

// ── 구역: 위치를 방·복도별로 나눠 저장 → 학생은 '내 구역 + 바로 옆 구역'만 받아요 (사용량 절약) ──
// 방 구역 이름 = 방 id, 복도 구역 이름 = h0, h1 ...
HALLS.forEach((h, i) => { h.zone = 'h' + i; });
export function zoneAt(x, y) {
  const r = roomAt(x, y); if (r) return r.id;
  const h = HALLS.find(h => inRect(h, x, y)); if (h) return h.zone;
  // 경계에 걸친 경우: 가장 가까운 구역
  let best = 'meeting', bd = Infinity;
  for (const a of AREAS) {
    const dx = Math.max(a.x - x, 0, x - a.x - a.w), dy = Math.max(a.y - y, 0, y - a.y - a.h), d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = a.zone || a.id; }
  }
  return best;
}
const NEAR = {};
for (const r of ROOMS) NEAR[r.id] = new Set([r.id]);
for (const h of HALLS) {
  NEAR[h.zone] = new Set([h.zone, h.a, h.b]);
  for (const [me, other] of [[h.a, h.b], [h.b, h.a]]) { NEAR[me].add(h.zone); NEAR[me].add(other); }
}
export const nearZones = z => NEAR[z] || new Set([z]);

// ── 봇 길 찾기용: 방 그래프 ──
function hallEnds(h) {
  const horiz = h.w > h.h, cx = h.x + h.w / 2, cy = h.y + h.h / 2;
  const p1 = horiz ? { x: h.x - 70, y: cy } : { x: cx, y: h.y - 70 };
  const p2 = horiz ? { x: h.x + h.w + 70, y: cy } : { x: cx, y: h.y + h.h + 70 };
  return roomAt(p1.x, p1.y)?.id === h.a ? { [h.a]: p1, [h.b]: p2 } : { [h.a]: p2, [h.b]: p1 };
}
const ADJ = {};
for (const h of HALLS) {
  (ADJ[h.a] ||= []).push({ to: h.b, h });
  (ADJ[h.b] ||= []).push({ to: h.a, h });
}
export function nearestRoomId(x, y) {
  const r = roomAt(x, y); if (r) return r.id;
  const h = HALLS.find(h => inRect(h, x, y));
  return h ? h.a : 'meeting';
}
export function route(fromId, toId) {
  const prev = { [fromId]: null }, q = [fromId];
  while (q.length) {
    const c = q.shift(); if (c === toId) break;
    for (const e of ADJ[c] || []) if (!(e.to in prev)) { prev[e.to] = { from: c, h: e.h }; q.push(e.to); }
  }
  if (!(toId in prev)) return [];
  const hops = []; let c = toId;
  while (prev[c]) { hops.unshift({ from: prev[c].from, to: c, h: prev[c].h }); c = prev[c].from; }
  const pts = [];
  for (const hp of hops) { const e = hallEnds(hp.h); pts.push(e[hp.from], e[hp.to]); }
  pts.push(randomPointIn(roomById(toId), 110));
  return pts;
}
