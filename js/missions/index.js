// 미션 목록. 미션마다 단계(장치 위치 + 조작 화면)가 있어요.
// done/{uid}/{미션} 값 = 끝낸 단계 수. 단계 수와 같으면 완료.
import { CONTENT } from '../../data/content.js';
import * as alveoli from './alveoliFilter.js';
import * as D from './digest.js';
import * as Ci from './circ.js';
import * as R from './resp.js';
import * as E from './excr.js';
import * as Ce from './cell.js';
import * as B from './big.js';
import * as F from './fix.js';
import { shuffle } from '../common/util.js';

const M = CONTENT.missions;
const one = (key, spot, fn) => [{ spot, fn }];

const DEF = {
  power: [
    { spot: 'powerGlucose', fn: Ce.powerPick(0) },
    { spot: 'powerO2', alt: ['powerO2b'], fn: Ce.powerPick(1) }, // 산소 캡슐은 허파실 양쪽 끝 2곳 중 아무 데서나
    { spot: 'powerFinal', fn: Ce.powerFinal },
  ],
  digestWire: [
    { spot: 'digestWireMouth', fn: D.digestWire(0) },
    { spot: 'digestWireStomach', fn: D.digestWire(1) },
    { spot: 'digestWireSmall', fn: D.digestWire(2) },
  ],
  nephron: [
    { spot: 'nephron1', fn: E.nephronFilter },
    { spot: 'nephron2', fn: E.nephronReabsorb },
  ],
  waste: [0, 1, 2, 3].map(i => ({ spot: ['wasteCO2Pick', 'wasteCO2Out', 'wasteUreaPick', 'wasteUreaDrop'][i], fn: Ce.wasteStep(i) })),
  nutrientTest: one('nutrientTest', 'nutrientTest', D.nutrientTest),
  villi: one('villi', 'villi', D.villi),
  gutAssembly: one('gutAssembly', 'gutAssembly', D.gutAssembly),
  colon: one('colon', 'colon', D.colon),
  heartWiring: one('heartWiring', 'heartWiring', Ci.heartWiring),
  rbcCard: one('rbcCard', 'rbcCard', Ci.rbcCard),
  heartbeat: one('heartbeat', 'heartbeat', Ci.heartbeat),
  bloodScan: one('bloodScan', 'bloodScan', Ci.bloodScan),
  vesselCheck: one('vesselCheck', 'vesselCheck', Ci.vesselCheck),
  alveoliFilter: one('alveoliFilter', 'alveoliFilter', alveoli.mount),
  breathModel: one('breathModel', 'breathModel', R.breathModel),
  diaphragm: one('diaphragm', 'diaphragm', R.diaphragm),
  airPath: one('airPath', 'airPath', R.airPath),
  wasteSort: one('wasteSort', 'wasteSort', E.wasteSort),
  ureaFactory: one('ureaFactory', 'ureaFactory', E.ureaFactory),
  // 넓은 맵에만
  pancreasSend: one('pancreasSend', 'pancreasSend', B.pancreasSend),
  bileSend: one('bileSend', 'bileSend', B.bileSend),
  energyUse: one('energyUse', 'energyUse', B.energyUse),
};

export const MISSIONS = Object.fromEntries(Object.entries(DEF).map(([id, steps]) => {
  const c = M[id];
  return [id, {
    id, title: c.title, unit: c.unit, type: c.type, visible: !!c.visible, bigOnly: !!c.bigOnly,
    steps: steps.map((s, i) => ({
      spot: s.spot,
      spots: [s.spot, ...(s.alt || [])],
      sub: Array.isArray(c.guide) ? c.guide[i] : c.guide,
      name: c.steps?.[i] || '',
      note: (Array.isArray(c.notes) ? c.notes[i] : c.note) || '',
      big: !!c.bigGuide,
      mount: (el, api) => s.fn(el, api, c),
    })),
    // 예전 코드와 맞추기 (한 단계짜리)
    get sub() { return this.steps[0].sub; },
    get mount() { return this.steps[0].mount; },
  }];
}));

export const SAB_FIX = { kidney: (el, api) => E.kidneyFix(el, api, M.nephron), lights: F.quizFix, comms: F.quizFix };

// 미션 나눠 주기 (어몽어스 규칙): 공통 1 + 긴 1 + 짧은 2 (짧은 2개는 서로 다른 단원)
// unit: 'all' 또는 한 단원. 특정 단원만 고르면 그 단원에서 뽑고, 모자라면 다른 단원에서 채워요.
export function assignTasks({ unit = 'all', exclude = [], map = 'small' } = {}) {
  const ok = id => !exclude.includes(id) && (!MISSIONS[id].bigOnly || map === 'big');   // 새 미션 3개는 넓은 맵에만 자리가 있어요
  const ids = Object.keys(MISSIONS).filter(ok);
  const of = type => ids.filter(id => MISSIONS[id].type === type);
  const common = of('common');
  let longs = of('long'), shorts = of('short');
  if (unit !== 'all') {
    const lu = longs.filter(id => MISSIONS[id].unit === unit); if (lu.length) longs = lu;
    const su = shorts.filter(id => MISSIONS[id].unit === unit); if (su.length >= 2) shorts = su;
  }
  const out = [...common.slice(0, 1)];
  if (longs.length) out.push(shuffle(longs)[0]);
  const s = shuffle(shorts);
  const first = s[0];
  if (first) {
    out.push(first);
    const second = unit === 'all' ? s.find(id => MISSIONS[id].unit !== MISSIONS[first].unit) : s.find(id => id !== first);
    if (second) out.push(second);
  }
  return out;
}

export const STAGE1_TASKS = ['heartWiring', 'alveoliFilter']; // 예전 이름 (로비 등에서 씀)
export const stepCount = id => MISSIONS[id]?.steps.length || 1;
