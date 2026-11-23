// 몸속 비상사태 고치기 (과학 내용 없는 조작): 시야 차단 = 스위치 모두 켜기, 신경 신호 끊김 = 다이얼 맞추기

// 시야 차단: 스위치 5개 중 몇 개가 꺼져 있어요. 눌러서 모두 켜면 해결
export function lightsFix(el, api) {
  const n = 5, on = Array.from({ length: n }, () => Math.random() < 0.5);
  if (on.every(Boolean)) on[Math.floor(Math.random() * n)] = false;
  if (on.filter(v => !v).length < 2) on[on.indexOf(true)] = false;   // 적어도 2개는 꺼진 채로 시작
  el.innerHTML = `<div class="fx"><div class="fx-sw">${on.map((v, i) => `<button class="fx-s press${v ? ' on' : ''}" data-i="${i}"><i></i></button>`).join('')}</div>
    <div class="fx-msg">꺼진 스위치를 눌러 모두 초록으로 켜세요</div></div>`;
  el.querySelectorAll('.fx-s').forEach(b => b.onclick = () => {
    const i = +b.dataset.i; on[i] = !on[i]; b.classList.toggle('on', on[i]); api.good();
    if (on.every(Boolean)) { el.querySelectorAll('.fx-s').forEach(x => x.disabled = true); api.success(); }
  });
  return () => { };
}

// 신경 신호 끊김: 다이얼(밀대)을 돌려 아래 신호 물결을 위 신호와 같게 맞춘 뒤 잠깐 유지
export function commsFix(el, api) {
  const target = 15 + Math.floor(Math.random() * 70);
  let v = target < 50 ? 90 : 10, hold = null;
  const W = 300, H = 60;
  const wave = val => { const f = 1 + val / 18, pts = []; for (let x = 0; x <= W; x += 4) pts.push(`${x},${(H / 2 + Math.sin(x / W * Math.PI * 2 * f) * 22).toFixed(1)}`); return pts.join(' '); };
  el.innerHTML = `<div class="fx">
    <div class="fx-wv"><small>맞출 신호</small><svg viewBox="0 0 ${W} ${H}"><polyline points="${wave(target)}" class="fx-t"/></svg></div>
    <div class="fx-wv"><small>지금 신호</small><svg viewBox="0 0 ${W} ${H}"><polyline points="${wave(v)}" class="fx-c"/></svg></div>
    <input class="fx-dial" type="range" min="0" max="100" value="${v}" aria-label="신호 다이얼">
    <div class="fx-msg">다이얼을 좌우로 밀어 보세요</div></div>`;
  const line = el.querySelector('.fx-c'), msg = el.querySelector('.fx-msg'), dial = el.querySelector('.fx-dial');
  dial.oninput = () => {
    v = +dial.value; line.setAttribute('points', wave(v));
    const ok = Math.abs(v - target) <= 3;
    line.classList.toggle('ok', ok);
    if (ok && !hold) { msg.textContent = '신호가 맞아요! 잠깐 그대로…'; hold = setTimeout(() => { dial.disabled = true; api.success(); }, 900); }
    if (!ok) { clearTimeout(hold); hold = null; msg.textContent = Math.abs(v - target) <= 12 ? '거의 다 왔어요' : '다이얼을 좌우로 밀어 보세요'; }
  };
  return () => clearTimeout(hold);
}
