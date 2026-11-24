// 방 데이터 경로 모음. 데이터 모양은 database.rules.json과 짝을 이룹니다.
//  rooms/{코드}/meta        방 상태 (호스트 uid, lobby/playing)
//  rooms/{코드}/players/{uid} 닉네임(c=색 번호, n=번호), 모자, 접속 여부
//  rooms/{코드}/nicks/{c_n}  같은 닉네임 중복 막기
//  rooms/{코드}/pos/{구역}/{uid} 위치 "x,y,방향" (짧은 글자 + 구역별 저장으로 사용량 절약)
//  rooms/{코드}/done/{uid}   끝낸 미션
//  rooms/{코드}/private/{uid} 역할·미션 목록 (본인과 호스트만 읽기, 2단계부터)
export const P = {
  room: c => `rooms/${c}`,
  meta: c => `rooms/${c}/meta`,
  players: c => `rooms/${c}/players`,
  player: (c, u) => `rooms/${c}/players/${u}`,
  nicks: c => `rooms/${c}/nicks`,
  nick: (c, k) => `rooms/${c}/nicks/${k}`,
  pos: c => `rooms/${c}/pos`,
  done: c => `rooms/${c}/done`,
  doneOf: (c, u) => `rooms/${c}/done/${u}`,
  game: c => `rooms/${c}/game`,          // 호스트가 쓰는 공개 게임 상태 (죽음, 시체, 회의, 승리)
  priv: c => `rooms/${c}/private`,
  privOf: (c, u) => `rooms/${c}/private/${u}`,
  req: c => `rooms/${c}/req`,            // 학생 → 호스트 요청 (킬, 신고, 긴급 회의)
  reqOf: (c, u) => `rooms/${c}/req/${u}`,
  meet: (c, m) => `rooms/${c}/meet/${m}`, // 회의별 OX 답, 투표권, 채팅, 투표
};

// extra: { free: true } = 친구들끼리 하기 (방을 만든 학생 패드가 심판도 해요)
export async function createRoom(db, extra = {}) {
  for (let i = 0; i < 20; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (await db.get(P.meta(code))) continue;
    await db.set(P.meta(code), { hostUid: db.uid, createdAt: db.now(), state: 'lobby', ...extra });
    return code;
  }
  throw new Error('방 코드를 만들지 못했어요');
}

export const isBot = id => id.startsWith('bot');

// 게임 시작 때 회의 테이블 둘레에 서는 순서 (모든 기기가 같은 순서를 계산)
export function spawnOrder(players) {
  return Object.entries(players || {})
    .sort((a, b) => ((a[1].j || 0) - (b[1].j || 0)) || (a[0] < b[0] ? -1 : 1))
    .map(e => e[0]);
}
