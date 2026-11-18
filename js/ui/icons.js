// 버튼 그림 (이모지 대신 직접 그린 단순한 SVG)
const S = (body, vb = '0 0 48 48') => `<svg class="ico" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const K = 'stroke="#1a1018" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
export const ICON = {
  use: S(`<path d="M18 26 V10 a4 4 0 0 1 8 0 V22 l10 2 a5 5 0 0 1 4 6 l-2 10 a4 4 0 0 1 -4 3 H22 a4 4 0 0 1 -3 -1.5 L9 30 a3.5 3.5 0 0 1 5 -5 Z" fill="#fff" ${K}/>`),
  report: S(`<path d="M8 20 h8 l18 -10 v28 l-18 -10 h-8 z" fill="#fff" ${K}/><path d="M14 28 l3 11 h6 l-3 -11" fill="#fff" ${K}/><path d="M39 18 q4 6 0 12" fill="none" ${K}/>`),
  map: S(`<path d="M6 12 l12 -4 l12 4 l12 -4 v28 l-12 4 l-12 -4 l-12 4 z" fill="#fff" ${K}/><path d="M18 8 v28 M30 12 v28" fill="none" ${K}/>`),
  hat: S(`<path d="M8 32 q0 -20 16 -20 q16 0 16 20 z" fill="#fff" ${K}/><path d="M34 31 h10 q1 4 -3 4 h-11" fill="#fff" ${K}/>`),
  kill: S(`<path d="M10 38 L30 18" fill="none" stroke="#1a1018" stroke-width="9" stroke-linecap="round"/><path d="M10 38 L30 18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="34" cy="14" r="8" fill="#fff" ${K}/><path d="M30 10 l8 8 M38 10 l-8 8" stroke="#1a1018" stroke-width="3" stroke-linecap="round"/>`),
  close: S(`<path d="M12 12 L36 36 M36 12 L12 36" fill="none" stroke="#1a1018" stroke-width="7" stroke-linecap="round"/><path d="M12 12 L36 36 M36 12 L12 36" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`),
  check: S(`<circle cx="24" cy="24" r="21" fill="#3fbf5f" ${K}/><path d="M13 25 l7 7 l15 -16" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`),
};
