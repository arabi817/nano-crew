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

export const isAlive = (game, id) => !game?.dead?.[id];
