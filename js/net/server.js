// 어느 Firebase 서버에 연결할지 정해요.
//  - 학생: 방 링크·QR에 서버 정보(srv)가 있으면 그 서버, 없으면 기본 서버(config.js)
//  - 교사: 이 컴퓨터에 저장한 '내 서버'(localStorage nc_my_server)가 있으면 그 서버, 없으면 기본 서버
// 다른 학교 선생님이 자기 무료 Firebase를 쓰게 해서, 기본 서버 사용량을 나누는 장치예요 (setup.html 안내).
import { firebaseConfig as DEFAULT } from '../../config.js';

const KEYS = { apiKey: 'k', authDomain: 'u', databaseURL: 'd', projectId: 'p', appId: 'a' };

// 설정값 ↔ 링크에 넣는 짧은 글자 (base64url)
export function encodeServer(cfg) {
  const o = {}; for (const [k, s] of Object.entries(KEYS)) if (cfg[k]) o[s] = cfg[k];
  return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeServer(s) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
    const c = {}; for (const [k, sk] of Object.entries(KEYS)) if (o[sk]) c[k] = String(o[sk]);
    return c.apiKey && c.databaseURL && c.projectId ? c : null;
  } catch { return null; }
}

// Firebase 콘솔에서 복사한 글(firebaseConfig = { apiKey: "...", ... })에서 값만 골라내기
export function parsePasted(text) {
  const c = {};
  for (const k of Object.keys(KEYS)) {
    const m = String(text).match(new RegExp(`${k}["']?\\s*:\\s*["']([^"']+)["']`));
    if (m) c[k] = m[1].trim();
  }
  if (!c.databaseURL && c.projectId) c.databaseURL = '';   // 아래에서 '빠짐'으로 알려 줘요
  return c;
}
export function missingKeys(c) { return ['apiKey', 'databaseURL', 'projectId', 'appId'].filter(k => !c[k]); }

export const myServer = () => { try { return JSON.parse(localStorage.getItem('nc_my_server') || 'null'); } catch { return null; } };
export const saveMyServer = c => { try { c ? localStorage.setItem('nc_my_server', JSON.stringify(c)) : localStorage.removeItem('nc_my_server'); } catch { } };

// role: 'host'(교사 화면) / 'student'
export function pickServer(role) {
  const q = new URLSearchParams(location.search);
  const fromLink = q.get('srv') && decodeServer(q.get('srv'));
  if (fromLink) return { cfg: fromLink, custom: true, srv: q.get('srv') };
  if (role === 'host') { const m = myServer(); if (m) return { cfg: m, custom: true, srv: encodeServer(m) }; }
  return { cfg: DEFAULT, custom: false, srv: '' };
}
export const isDefault = cfg => cfg.projectId === DEFAULT.projectId;
