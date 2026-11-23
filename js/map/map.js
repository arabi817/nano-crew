// 맵 데이터: 방(사각형)과 복도(사각형)를 이은 구조. 걸을 수 있는 곳 = 방 + 복도.
// 좌표 단위는 픽셀(게임 세계 기준). 대기실(탐사정 격납고)은 오른쪽에 떨어져 있어요.
// 맵이 2개예요: small(지금 맵, 방 11개) / big(넓은 맵, 방 14개 + 새 미션 3개 자리). 교사가 대기실에서 골라요.
// 아래 WORLD·ROOMS·HALLS·SPOTS 등은 '지금 쓰는 맵'을 담는 그릇이에요. useMap(id)를 부르면 내용이 통째로 바뀌어요
// (다른 파일은 같은 그릇을 import해서 그대로 써요).
const SMALL = {};
SMALL.WORLD = { w: 5800, h: 2700 };

SMALL.ROOMS = [
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

SMALL.HALLS = [
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

SMALL.TABLE = { x: 1750, y: 1350, r: 170 };     // 회의 테이블 (못 지나감)

// 미션 장치 위치 (미션 단계마다 하나씩)
SMALL.SPOTS = {
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
  nephron1: { room: 'kidney', x: 2580, y: 2040, label: '토리 장치' },
  nephron2: { room: 'kidney', x: 2970, y: 2040, label: '세뇨관 장치' },
  wasteSort: { room: 'kidney', x: 2775, y: 2410 },
  wasteUreaDrop: { room: 'kidney', x: 2580, y: 2420, label: '요소 넣기' },
  // 방광 처리실
  ureaFactory: { room: 'bladder', x: 3330, y: 2090 },
};

// 사보타주 해결 장치
SMALL.SAB_SPOTS = {
  o2Lung: { room: 'lung', x: 690, y: 1680, kind: 'o2', side: 'lung', other: '심장실' },
  o2Heart: { room: 'heart', x: 2730, y: 1120, kind: 'o2', side: 'heart', other: '허파실' },
  kidneyStop: { room: 'kidney', x: 2970, y: 2420, kind: 'kidney' },
  lightsPanel: { room: 'vessel', x: 2000, y: 2390, kind: 'lights' },   // 시야 차단 스위치
  nerveRelay: { room: 'heart', x: 3020, y: 1590, kind: 'comms' },      // 신경 신호 다이얼
};

// 혈관 통로(벤트): 바이러스만 써요. 서로 먼 방끼리 4쌍
SMALL.VENTS = {
  vDigest: { room: 'digest', x: 820, y: 680, to: 'vKidney' },
  vKidney: { room: 'kidney', x: 2775, y: 2205, to: 'vDigest' },
  vLarge: { room: 'large', x: 2680, y: 680, to: 'vPower' },
  vPower: { room: 'power', x: 820, y: 2400, to: 'vLarge' },
  vSmall: { room: 'small', x: 2080, y: 600, to: 'vBladder' },
  vBladder: { room: 'bladder', x: 3600, y: 2410, to: 'vSmall' },
  vLung: { room: 'lung', x: 420, y: 1660, to: 'vHeart' },
  vHeart: { room: 'heart', x: 3270, y: 1370, to: 'vLung' },
};

// ── 넓은 맵 (32명용, 약 1.9배): 3줄 × 5칸 격자. 위 = 소화, 가운데 = 호흡·순환(+회의실), 아래 = 세포 호흡·배설 ──
// 방 배치·방별 미션은 선생님 승인 (실험실 [넓힌 맵 초안], HANDOFF 3-2-2)
const BIG = {};
{
  const COL = [200, 1350, 2500, 3750, 4900], ROW = [200, 1200, 2350], H = [650, 800, 650];
  const room = (id, name, c, r, floor) => ({ id, name, x: COL[c], y: ROW[r], w: c === 2 ? 900 : 800, h: H[r], floor, c, r });
  BIG.WORLD = { w: 7700, h: 3200 };
  BIG.ROOMS = [
    room('mouth', '입·식도실', 0, 0, 0xffc79a),
    room('stomach', '위실', 1, 0, 0xf6b48a),
    room('liver', '간실', 2, 0, 0xc98a7a),
    room('pancreas', '이자실', 3, 0, 0xf2e0a0),
    room('small', '작은창자실', 4, 0, 0xf5d98a),
    room('lungR', '오른쪽 허파실', 0, 1, 0x9fd6f0),
    room('heart', '심장실', 1, 1, 0xf29a9a),
    room('meeting', '중앙 회의실', 2, 1, 0x8ea2a8),
    room('vessel', '혈관 관제실', 3, 1, 0xcf8f9f),
    room('lungL', '왼쪽 허파실', 4, 1, 0xa3dcea),
    room('muscle', '근육실 (세포 발전소)', 0, 2, 0x9fd38a),
    room('large', '큰창자실', 1, 2, 0xd9b48a),
    room('kidney', '콩팥실', 2, 2, 0xd8a48f),
    room('bladder', '방광 처리실', 3, 2, 0xf2e38a),
    { id: 'lobby', name: '탐사정 격납고', x: 6200, y: 200, w: 1300, h: 850, floor: 0x9aa7b8, lobby: true },
  ];
  const at = (c, r) => BIG.ROOMS.find(x => x.c === c && x.r === r);
  const hallH = (c, r) => { const a = at(c, r), b = at(c + 1, r), cy = a.y + a.h / 2; return { a: a.id, b: b.id, x: a.x + a.w, y: cy - 80, w: b.x - (a.x + a.w), h: 160 }; };
  const hallV = (c, r) => { const a = at(c, r), b = at(c, r + 1), cx = a.x + a.w / 2; return { a: a.id, b: b.id, x: cx - 80, y: a.y + a.h, w: 160, h: b.y - (a.y + a.h) }; };
  BIG.HALLS = [
    hallH(0, 0), hallH(1, 0), hallH(2, 0), hallH(3, 0),
    hallH(0, 1), hallH(1, 1), hallH(2, 1), hallH(3, 1),
    hallH(0, 2), hallH(1, 2), hallH(2, 2),
    hallV(0, 0), hallV(2, 0), hallV(4, 0),
    hallV(1, 1), hallV(2, 1), hallV(3, 1),
  ];
  BIG.TABLE = { x: 2950, y: 1600, r: 170 };
  BIG.SPOTS = {
    // 입·식도실
    digestWireMouth: { room: 'mouth', x: 360, y: 330, label: '입 패널' },
    nutrientTest: { room: 'mouth', x: 820, y: 330 },
    // 위실
    digestWireStomach: { room: 'stomach', x: 1500, y: 330, label: '위 패널' },
    gutAssembly: { room: 'stomach', x: 2000, y: 330 },
    // 간실
    ureaFactory: { room: 'liver', x: 2680, y: 330 },
    bileSend: { room: 'liver', x: 3220, y: 330 },
    wasteUreaPick: { room: 'liver', x: 2680, y: 740, label: '요소 받기' },
    // 이자실
    pancreasSend: { room: 'pancreas', x: 4150, y: 330 },
    // 작은창자실
    digestWireSmall: { room: 'small', x: 5050, y: 340, label: '작은창자 패널' },
    villi: { room: 'small', x: 5550, y: 340 },
    powerGlucose: { room: 'small', x: 5300, y: 520, label: '포도당 캡슐' },
    // 오른쪽 허파실
    breathModel: { room: 'lungR', x: 330, y: 1330 },
    diaphragm: { room: 'lungR', x: 870, y: 1330 },
    powerO2: { room: 'lungR', x: 330, y: 1620, label: '산소 캡슐 (오른쪽 허파)' },
    // 심장실
    heartbeat: { room: 'heart', x: 2030, y: 1330 },
    heartWiring: { room: 'heart', x: 2030, y: 1880 },
    // 혈관 관제실
    rbcCard: { room: 'vessel', x: 3880, y: 1700 },
    bloodScan: { room: 'vessel', x: 4420, y: 1700 },
    vesselCheck: { room: 'vessel', x: 3900, y: 1890 },
    // 왼쪽 허파실
    alveoliFilter: { room: 'lungL', x: 5030, y: 1330 },
    airPath: { room: 'lungL', x: 5570, y: 1330 },
    powerO2b: { room: 'lungL', x: 5570, y: 1620, label: '산소 캡슐 (왼쪽 허파)' },
    wasteCO2Out: { room: 'lungL', x: 5570, y: 1890, label: '이산화탄소 배출구' },
    // 근육실
    wasteCO2Pick: { room: 'muscle', x: 330, y: 2480, label: '이산화탄소 받기' },
    powerFinal: { room: 'muscle', x: 600, y: 2480, label: '발전기' },
    energyUse: { room: 'muscle', x: 870, y: 2480 },
    // 큰창자실
    colon: { room: 'large', x: 1750, y: 2690 },
    // 콩팥실
    nephron1: { room: 'kidney', x: 2640, y: 2470, label: '토리 장치' },
    nephron2: { room: 'kidney', x: 3260, y: 2470, label: '세뇨관 장치' },
    wasteUreaDrop: { room: 'kidney', x: 2640, y: 2880, label: '요소 넣기' },
    // 방광 처리실
    wasteSort: { room: 'bladder', x: 4430, y: 2470 },
  };
  // 산소 부족은 양쪽 허파에서 동시에 눌러요 (id·side는 작은 맵과 같은 이름을 그대로 써요)
  BIG.SAB_SPOTS = {
    o2Lung: { room: 'lungR', x: 330, y: 1890, kind: 'o2', side: 'lung', other: '왼쪽 허파실' },
    o2Heart: { room: 'lungL', x: 5030, y: 1890, kind: 'o2', side: 'heart', other: '오른쪽 허파실' },
    kidneyStop: { room: 'kidney', x: 3260, y: 2880, kind: 'kidney' },
    lightsPanel: { room: 'vessel', x: 4420, y: 1890, kind: 'lights' },
    nerveRelay: { room: 'heart', x: 1480, y: 1330, kind: 'comms' },
  };
  BIG.VENTS = {
    vMouth: { room: 'mouth', x: 860, y: 770, to: 'vBladder' },
    vBladder: { room: 'bladder', x: 3900, y: 2910, to: 'vMouth' },
    vLiver: { room: 'liver', x: 3250, y: 770, to: 'vMuscle' },
    vMuscle: { room: 'muscle', x: 600, y: 2900, to: 'vLiver' },
    vPancreas: { room: 'pancreas', x: 4400, y: 770, to: 'vLarge' },
    vLarge: { room: 'large', x: 1480, y: 2910, to: 'vPancreas' },
    vHeart: { room: 'heart', x: 1480, y: 1890, to: 'vKidney' },
    vKidney: { room: 'kidney', x: 2950, y: 2910, to: 'vHeart' },
  };
}
export const MAPS = { small: SMALL, big: BIG };
export const MAP_NAME = { small: '작은 맵', big: '넓은 맵' };

// ── 지금 쓰는 맵 (그릇) ──
export const WORLD = {}, TABLE = {}, LOBBY = {}, SPOTS = {}, SAB_SPOTS = {}, VENTS = {};
export const ROOMS = [], HALLS = [], BLOCKS = [];
export const PLACES = [];   // 대기실 뺀 방 {id, name} (회의 채팅 [장소], 혈관 막힘 고르기)
export const TASK_SPOTS = SPOTS; // 예전 이름
export let MAP_ID = '';
const AREAS = [];
const NEAR = {}, ADJ = {};
const refill = (o, src) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, structuredClone(src)); };
const relist = (a, src) => { a.length = 0; a.push(...src); };

export function useMap(id) {
  if (!MAPS[id]) id = 'small';
  if (id === MAP_ID) return false;
  MAP_ID = id;
  const M = MAPS[id];
  refill(WORLD, M.WORLD); refill(TABLE, M.TABLE); refill(SPOTS, M.SPOTS); refill(SAB_SPOTS, M.SAB_SPOTS); refill(VENTS, M.VENTS);
  const rooms = structuredClone(M.ROOMS), lob = rooms.findIndex(r => r.lobby);
  refill(LOBBY, rooms[lob]); rooms[lob] = LOBBY;         // LOBBY는 ROOMS 안의 그 방 자체
  relist(ROOMS, rooms); relist(HALLS, structuredClone(M.HALLS));
  relist(BLOCKS, [{ x: TABLE.x, y: TABLE.y, r: TABLE.r }]);
  relist(AREAS, [...ROOMS, ...HALLS]);
  relist(PLACES, ROOMS.filter(r => !r.lobby).map(r => ({ id: r.id, name: r.name.replace(/ \(.*\)/, '') })));
  blockedDoors = [];
  // 구역(방·복도) 이웃, 봇 길 찾기 그래프
  HALLS.forEach((h, i) => { h.zone = 'h' + i; });
  for (const k of Object.keys(NEAR)) delete NEAR[k];
  for (const k of Object.keys(ADJ)) delete ADJ[k];
  for (const r of ROOMS) NEAR[r.id] = new Set([r.id]);
  for (const h of HALLS) {
    NEAR[h.zone] = new Set([h.zone, h.a, h.b]);
    for (const [me, other] of [[h.a, h.b], [h.b, h.a]]) { NEAR[me].add(h.zone); NEAR[me].add(other); }
    (ADJ[h.a] ||= []).push({ to: h.b, h });
    (ADJ[h.b] ||= []).push({ to: h.a, h });
  }
  return true;
}
// 미션 장소가 어느 맵·방에 있는지 (실험실 등에서 씀)
export const spotRoomName = (spot, mapId = MAP_ID) => {
  const M = MAPS[mapId], s = M.SPOTS[spot] || MAPS.big.SPOTS[spot];
  const r = (M.SPOTS[spot] ? M : MAPS.big).ROOMS.find(q => q.id === s?.room);
  return r ? r.name : '';
};

const inRect = (a, x, y) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h;
const inAreas = (x, y) => AREAS.some(a => inRect(a, x, y));

export const roomById = id => ROOMS.find(r => r.id === id);
export const roomName = id => roomById(id)?.name.replace(/ \(.*\)/, '') ?? '';

// 혈관 막힘(사보타주): 막힌 방의 문(복도 입구) 사각형
let blockedDoors = [];
useMap('small');
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
// 시선이 지나갈 수 있는 곳 (방·복도 안, 막힌 문 제외). 벽과 맵 바깥은 시야를 가려요.
export const seeThrough = (x, y) => inAreas(x, y) && !inDoor(x, y);
// 두 점 사이가 벽에 막히지 않았나?
export function lineOfSight(ax, ay, bx, by, step = 18) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / step);
  for (let i = 1; i < n; i++) { const k = i / n; if (!seeThrough(ax + (bx - ax) * k, ay + (by - ay) * k)) return false; }
  return true;
}

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
export const nearZones = z => NEAR[z] || new Set([z]);

// ── 봇 길 찾기용: 방 그래프 ──
function hallEnds(h) {
  const horiz = h.w > h.h, cx = h.x + h.w / 2, cy = h.y + h.h / 2;
  const p1 = horiz ? { x: h.x - 70, y: cy } : { x: cx, y: h.y - 70 };
  const p2 = horiz ? { x: h.x + h.w + 70, y: cy } : { x: cx, y: h.y + h.h + 70 };
  return roomAt(p1.x, p1.y)?.id === h.a ? { [h.a]: p1, [h.b]: p2 } : { [h.a]: p2, [h.b]: p1 };
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
