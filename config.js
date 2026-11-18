// ─────────────────────────────────────────────
//  Firebase 설정값 (이 파일 하나만 고치면 됩니다)
//  SETUP.md 안내를 따라 Firebase 콘솔에서 복사해 붙여 넣으세요.
//  apiKey가 비어 있으면 '혼자 시험 모드'로 켜집니다.
//  (혼자 시험 모드: 같은 컴퓨터의 브라우저 창끼리만 연결돼요)
// ─────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyDHEeCZ51pDLamWMT_dbe9Ogi5RFEiafXg",
  authDomain: "nano-crew-science.firebaseapp.com",
  databaseURL: "https://nano-crew-science-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nano-crew-science",
  appId: "1:61618233102:web:3d02e06afa76d373b7415f",
};

// 통신 설정 (보통은 바꾸지 않아도 됩니다)
export const NET = {
  sendHz: 6,          // 움직일 때 1초에 위치를 보내는 횟수 (6이면 사용량 절약, 8~10이면 더 매끄러움)
  interpDelayMs: 230, // 다른 친구 움직임을 부드럽게 보여 주려고 늦춰 그리는 시간 (sendHz를 올리면 180으로)
};
