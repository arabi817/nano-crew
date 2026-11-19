// 게임 규칙 값 모음 (교사 설정의 기본값 + 거리·시간 상수)
import { TABLE } from '../map/map.js';

export const DEFAULT_SETTINGS = {
  imps: 3,              // 바이러스 수 (1~4)
  npc: false,           // 컴퓨터 세균 (구조만 준비)
  killCd: 30,           // 킬 쿨타임(초)
  oxSec: 10,            // OX 시간(초)
  discussSec: 45,       // 토론 시간(초)
  voteSec: 60,          // 투표 시간(초)
  progress: 'meeting',  // 진행 바: always / meeting / hidden
  revealOnEject: true,  // 추방 시 역할 공개
  unit: 'all',          // 단원 선택
};
export const settingsOf = meta => ({ ...DEFAULT_SETTINGS, ...(meta?.settings || {}) });

export const KILL_RANGE = 115;      // 킬 가능 거리
export const REPORT_RANGE = 160;    // 신고 가능 거리
export const EMERGENCY_RANGE = TABLE.r + 110; // 긴급 회의 버튼 사용 거리 (테이블 중심에서)
export const REVEAL_MS = 4500;      // 역할 공개 연출 시간
export const ALARM_MS = 2600;       // 회의 소집 경보 시간
export const RESULT_MS = 8000;      // 투표 결과 + 추방 연출 시간
export const FIRST_SPEAK_MS = 15000;  // 토론 시작: 신고한 사람이 먼저 말하는 시간
export const PICK_SPEAK_MS = 20000;   // 손들기 방식: 선생님이 지명한 학생이 말하는 시간

export const isAlive = (game, id) => !game?.dead?.[id];

// 대기실에 보여 줄 방 설정 표 (어몽어스 대기실 왼쪽 위처럼)
const UNIT_NAME = { all: '전체 복습', digest: '소화', circ: '순환', resp: '호흡', excr: '배설' };
const PROGRESS_NAME = { always: '항상', meeting: '회의 때만', hidden: '안 보이기' };
export function settingsRows(meta) {
  const s = settingsOf(meta);
  return [
    ['바이러스', `${s.imps}명`],
    ['킬 쿨타임', `${s.killCd}초`],
    ['OX 시간', `${s.oxSec}초`],
    ['토론 시간', `${s.discussSec}초`],
    ['투표 시간', `${s.voteSec}초`],
    ['긴급 회의', '1인 1회'],
    ['진행 바', PROGRESS_NAME[s.progress] || s.progress],
    ['추방 시 역할 공개', s.revealOnEject ? '켜기' : '끄기'],
    ['단원', UNIT_NAME[s.unit] || s.unit],
  ];
}
export const settingsHTML = meta => `<div class="set-h">방 설정</div><table class="set-tb">${settingsRows(meta).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
