// 미션 창: 화면 가운데 금속 패널. 틀리면 흔들리고, 다 맞히면 초록 체크.
import { ICON } from './icons.js';
import { sfx } from '../common/sfx.js';
import { esc } from '../common/util.js';

export function openPanel({ title, sub = '', mount, onSuccess, onClose }) {
  const ov = document.createElement('div');
  ov.className = 'mpanel-ov';
  ov.innerHTML = `
    <div class="mpanel metal">
      <div class="mpanel-head">
        <div class="mpanel-title">${esc(title)}</div>
        <button class="mpanel-x press" aria-label="닫기">${ICON.close}</button>
      </div>
      <div class="mpanel-sub">${esc(sub)}</div>
      <div class="mpanel-body screen"></div>
      <div class="mpanel-done">${ICON.check}<div>완료!</div></div>
    </div>`;
  document.body.appendChild(ov);
  const panel = ov.querySelector('.mpanel'), body = ov.querySelector('.mpanel-body');
  let closed = false, finished = false, cleanup = null;
  const api = {
    wrong() {
      panel.classList.remove('shake'); void panel.offsetWidth; panel.classList.add('shake');
      sfx('bad');
    },
    good() { sfx('tick'); },
    success() {
      if (finished) return; finished = true;
      sfx('ok'); ov.classList.add('done');
      setTimeout(() => { close(); onSuccess?.(); }, 950);
    },
  };
  cleanup = mount(body, api);
  function close() {
    if (closed) return; closed = true;
    try { cleanup?.(); } catch { }
    ov.remove(); onClose?.();
  }
  ov.querySelector('.mpanel-x').onclick = () => { sfx('click'); close(); };
  return { close };
}

// 간단한 선택 창 (모자 고르기 등)
export function openSheet({ title, html, onMount, onClose }) {
  const ov = document.createElement('div');
  ov.className = 'mpanel-ov';
  ov.innerHTML = `<div class="sheet metal"><div class="mpanel-head"><div class="mpanel-title">${esc(title)}</div>
    <button class="mpanel-x press" aria-label="닫기">${ICON.close}</button></div><div class="sheet-body">${html}</div></div>`;
  document.body.appendChild(ov);
  const close = () => { ov.remove(); onClose?.(); };
  ov.querySelector('.mpanel-x').onclick = close;
  onMount?.(ov, close);
  return { close };
}
