// '나노 탐사대원' 그림 (SVG 한 곳에서 그려서 게임 화면·접속 화면·교사 화면이 같은 모양을 씀)
// 생김새: 동그란 몸 + 둥근 유리 헬멧 창 + 짧은 안테나 + 작은 팔·발
import { mix, COLORS } from '../common/colors.js';
import { hasArt, artUrl } from '../common/assets.js';

// ── 그림 파일(assets/characters) 칸 ──
// 몸통·모자 그림은 viewBox -40 -55 80 95 와 같은 칸(320×380, 4배)에 맞춰 그려져 있어요.
// 발 그림은 viewBox -12 -9 24 18 칸(96×72, 4배).
export const BEHIND_HATS = [6, 8, 10, 13];   // 머리띠류: 몸 뒤에 그려서 머리 위로 나온 부분만 보여요
export const ANTENNA_HATS = [0, 2, 11];   // 이 장식일 때만 안테나가 보여요 (없음·리본·별 핀)
export const bodyArt = (ci, hat = 0) => {
  const na = `characters/body_${ci}_na.png`;
  if (!ANTENNA_HATS.includes(hat) && hasArt(na)) return na;
  const p = `characters/body_${ci}.png`;
  return hasArt(p) ? p : null;
};
export const footArt = ci => hasArt(`characters/foot_${ci}.png`) ? `characters/foot_${ci}.png` : null;
export const hatArt = h => h && hasArt(`characters/hat${h}.png`) ? `characters/hat${h}.png` : null;
// 고를 수 있는 장식인지 (1~5번은 코드 그림이 있어서 항상, 6번부터는 그림이 있을 때만)
export const hatAvailable = h => h <= 5 || !!hatArt(h);
const colorIndex = hex => COLORS.findIndex(c => c.hex.toLowerCase() === String(hex).toLowerCase());

const INK = '#1a1018';

function hatSVG(h) {
  switch (h) {
    case 1: return `<path d="M-17 -16 Q-16 -38 2 -38 Q20 -38 20 -16 Q2 -24 -17 -16 Z" fill="#3b5fd9" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M12 -21 L33 -19 Q35 -14 29 -14 L12 -15 Z" fill="#2c47a8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="2" cy="-37" r="3" fill="${INK}"/>`;
    case 2: return `<path d="M14 -22 L3 -33 L3 -12 Z" fill="#f27bb3" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M14 -22 L27 -33 L26 -12 Z" fill="#f27bb3" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="14" cy="-22" r="4.5" fill="#ffb3d6" stroke="${INK}" stroke-width="3"/>`;
    case 3: return `<path d="M-13 -17 L-16 -37 L-6 -28 L2 -41 L10 -28 L20 -37 L17 -17 Q2 -22 -13 -17 Z" fill="#ffcc33" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="2" cy="-23" r="3" fill="#e5484d" stroke="${INK}" stroke-width="2"/>`;
    case 4: return `<path d="M2 -22 L2 -35" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <path d="M2 -22 L2 -35" stroke="#5aa83a" stroke-width="3" stroke-linecap="round"/>
      <path d="M2 -34 Q-10 -47 -17 -37 Q-6 -30 2 -34 Z" fill="#7ccf4a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M2 -34 Q14 -49 21 -39 Q10 -30 2 -34 Z" fill="#7ccf4a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    case 5: return `<path d="M-13 -18 L-13 -28 Q-22 -32 -17 -41 Q-12 -50 -3 -44 Q2 -53 10 -45 Q20 -50 23 -40 Q27 -31 17 -28 L17 -18 Q2 -23 -13 -18 Z" fill="#ffffff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M-13 -24 Q2 -28 17 -24" fill="none" stroke="#c9d1d8" stroke-width="3"/>`;
    default: return '';
  }
}

// 모자만 따로 (몸통 그림 파일 위에 얹을 때)
export const hatOnlySVG = (hat, w = 160, h = 190) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="-40 -55 80 95">${hatSVG(hat)}</svg>`;

// 몸통 (발 제외). 원점(0,0) = 몸 중심 근처. viewBox -40 -55 80 95
export function bodySVG(color, hat = 0, w = 160, h = 190) {
  const light = mix(color, 0.5, '#ffffff'), dark = mix(color, 0.35, '#000000');
  const antenna = hat === 0 || hat === 2
    ? `<path d="M1 -22 Q3 -32 8 -38" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
       <circle cx="9" cy="-40" r="5" fill="${light}" stroke="${INK}" stroke-width="3"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="-40 -55 80 95">
  ${antenna}
  <ellipse cx="-27" cy="10" rx="7" ry="9" fill="${dark}" stroke="${INK}" stroke-width="3.5"/>
  <ellipse cx="27" cy="10" rx="7" ry="9" fill="${dark}" stroke="${INK}" stroke-width="3.5"/>
  <circle cx="0" cy="4" r="27" fill="${color}" stroke="${INK}" stroke-width="4"/>
  <path d="M-18 16 Q-3 27 16 18" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round" opacity=".5"/>
  <path d="M-21 6 Q-22 -3 -17 -10" fill="none" stroke="${light}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="3" cy="-3" r="16" fill="#e3e9ef" stroke="${INK}" stroke-width="4"/>
  <circle cx="3" cy="-17.5" r="1.6" fill="${INK}"/><circle cx="17.5" cy="-3" r="1.6" fill="${INK}"/>
  <circle cx="3" cy="11.5" r="1.6" fill="${INK}"/><circle cx="-11.5" cy="-3" r="1.6" fill="${INK}"/>
  <circle cx="3" cy="-3" r="11" fill="#9fdcf5" stroke="${INK}" stroke-width="2.5"/>
  <ellipse cx="-1" cy="-3" rx="2.4" ry="3.4" fill="${INK}"/>
  <ellipse cx="7" cy="-3" rx="2.4" ry="3.4" fill="${INK}"/>
  <path d="M-4 -10 Q1 -13 6 -11.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
  ${hatSVG(hat)}
</svg>`;
}

export function footSVG(color) {
  const dark = mix(color, 0.35, '#000000');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="36" viewBox="-12 -9 24 18">
  <ellipse cx="0" cy="0" rx="10" ry="7" fill="${dark}" stroke="${INK}" stroke-width="3"/></svg>`;
}

// 접속 화면·교사 화면용 (발까지 포함한 한 장)
export function avatarSVG(color, hat = 0, size = 80) {
  const ci = colorIndex(color), art = ci >= 0 && bodyArt(ci, hat);
  if (art) {
    const ft = footArt(ci), ht = hatArt(hat);
    const foot = x => ft
      ? `<image href="${artUrl(ft)}" x="${x - 12}" y="22" width="24" height="18"/>`
      : `<ellipse cx="${x}" cy="31" rx="10" ry="7" fill="${mix(color, 0.35, '#000000')}" stroke="${INK}" stroke-width="3"/>`;
    const hatPart = ht ? `<image href="${artUrl(ht)}" x="-40" y="-55" width="80" height="95"/>`
      : hat ? hatSVG(hat) : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.1875}" viewBox="-40 -55 80 95">
  <ellipse cx="0" cy="36" rx="24" ry="5" fill="rgba(0,0,0,.25)"/>
  ${foot(-11)}${foot(11)}
  ${BEHIND_HATS.includes(hat) ? hatPart : ''}
  <image href="${artUrl(art)}" x="-40" y="-55" width="80" height="95"/>
  ${BEHIND_HATS.includes(hat) ? '' : hatPart}</svg>`;
  }
  const body = bodySVG(color, hat).replace(/<svg[^>]*>|<\/svg>/g, '');
  const dark = mix(color, 0.35, '#000000');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.1875}" viewBox="-40 -55 80 95">
  <ellipse cx="0" cy="36" rx="24" ry="5" fill="rgba(0,0,0,.25)"/>
  <ellipse cx="-11" cy="31" rx="10" ry="7" fill="${dark}" stroke="${INK}" stroke-width="3"/>
  <ellipse cx="11" cy="31" rx="10" ry="7" fill="${dark}" stroke="${INK}" stroke-width="3"/>
  ${body}</svg>`;
}
