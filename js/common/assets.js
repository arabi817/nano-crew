// 그림 파일 바꿔 끼우기: assets/list.js에 적힌 그림이 있으면 그 그림을, 없으면 코드 그림을 써요.
import { LIST } from '../../assets/list.js';

const SET = new Set(LIST);
export const hasArt = path => SET.has(path);
export const artUrl = path => `assets/${path}`;

// Phaser 장면에서 그림을 불러온 뒤 cb(텍스처 이름)를 불러요. 그림이 없으면 false를 돌려줘요.
export function useArt(scene, path, cb) {
  if (!SET.has(path)) return false;
  const key = 'art:' + path;
  if (scene.textures.exists(key)) { cb(key); return true; }
  scene.load.once(`filecomplete-image-${key}`, () => cb(key));
  const asked = scene.__artAsked || (scene.__artAsked = new Set());
  if (!asked.has(key)) { asked.add(key); scene.load.image(key, artUrl(path)); }
  scene.load.start();
  return true;
}

// 여러 그림을 한꺼번에 HTMLImageElement로 불러오기 (캐릭터 합성용)
export function loadImg(path) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img); img.onerror = () => res(null);
    img.src = artUrl(path);
  });
}

// 로고 그림이 있으면 제목 글자 '어몸어스' 자리에 그림을 넣어요 (작은 부제는 그대로)
export function applyLogo() {
  if (!SET.has('ui/logo.png')) return;
  document.querySelectorAll('h1.logo').forEach(h => {
    const t = [...h.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (!t) return;
    const img = document.createElement('img');
    img.src = artUrl('ui/logo.png'); img.alt = t.textContent.trim(); img.className = 'logo-img';
    t.replaceWith(img);
  });
}
