// 미션 실험실: 개선안 시제품 (게임에는 아직 안 씀)
// 원칙: 행동 자체가 과학 과정 · 안 보이는 과정을 보이게 · 오답엔 과학적 이유 · 성공하면 경로 다시 보기
import { draggable, shuffle, esc } from '../missions/kit.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = (box, text, kind = '') => { box.className = `px-msg ${kind}`; box.innerHTML = text; };

// ───────── 1. 산소·포도당 배송 (세포 발전소 개선안) ─────────
function delivery(el, api) {
  el.innerHTML = `<div class="dv">
    <div class="dv-stage"></div>
    <div class="dv-route"><em>할 일</em>${['산소 싣기', '포도당 싣기', '심장 펌프', '세포에 내리기'].map((n, i) => `<span data-i="${i}">${n}</span>`).join('<i>·</i>')}
      <small>게임에서는 장소마다 하나씩 하지만, 몸속에서는 동시에 일어나요</small></div>
    <div class="dv-play">
      <div class="dv-src"><div class="dv-src-h"></div><div class="dv-src-in"></div></div>
      <div class="dv-blood"><div class="dv-blood-h">혈액</div>
        <div class="dv-rbc"><b>적혈구</b><div class="dv-seats">${'<span class="dv-seat"></span>'.repeat(4)}</div></div>
        <div class="dv-plasma"><b>혈장</b><div class="dv-plasma-in"></div></div></div>
      <div class="dv-cell" hidden><div class="dv-cell-h">세포</div><div class="dv-mito">미토콘드리아</div><div class="dv-cell-in"></div>
        <div class="dv-energy"><i></i><span>에너지</span></div></div>
    </div>
    <div class="dv-ctrl"></div>
    <div class="px-msg"></div></div>`;
  const $ = s => el.querySelector(s), msg = $('.px-msg'), stage = $('.dv-stage'), ctrl = $('.dv-ctrl');
  const setRoute = i => el.querySelectorAll('.dv-route span').forEach((s, k) => s.className = k < i ? 'done' : k === i ? 'on' : '');
  const token = (cls, text) => { const t = document.createElement('div'); t.className = `px-tok ${cls}`; t.innerHTML = text; return t; };
  // 산소가 붙을수록 어두운 붉은색 → 선명한 붉은색
  const rbcColor = () => {
    const k = el.querySelectorAll('.dv-seat.full').length / 4, lerp = (a, b) => Math.round(a + (b - a) * k);
    $('.dv-rbc').style.background = `rgb(${lerp(124, 255)}, ${lerp(29, 59)}, ${lerp(39, 59)})`;
  };
  let alive = true;

  // 1) 허파실: O₂를 적혈구의 헤모글로빈 자리에 싣기
  const lung = () => {
    setRoute(0); stage.innerHTML = '<b>① 허파실</b> 허파꽈리의 산소(O₂)를 혈액에 실어요';
    $('.dv-src-h').textContent = '허파꽈리'; const box = $('.dv-src-in'); box.innerHTML = '';
    say(msg, 'O₂를 끌어서 <b>혈액</b>에 실어 보세요. 어디에 실어야 멀리까지 갈까요?');
    let n = 0;
    for (let i = 0; i < 4; i++) {
      const t = token('px-o2', 'O<sub>2</sub>'); box.append(t);
      draggable(t, { onDrop: under => {
        const seat = under?.closest?.('.dv-seat:not(.full)');
        if (seat) { t.remove(); seat.classList.add('full'); seat.innerHTML = 'O<sub>2</sub>'; rbcColor(); api.good();
          say(msg, '적혈구 속 <b>헤모글로빈</b>에 산소가 붙었어요. 적혈구가 선명한 붉은색이 돼요.', 'ok');
          if (++n >= 4) setTimeout(() => alive && gut(), 900); return true; }
        if (under?.closest?.('.dv-plasma')) { api.wrong();
          say(msg, '산소는 혈장에는 아주 조금만 녹아요. 대부분은 <b>적혈구의 헤모글로빈</b>에 붙어서 운반돼요.', 'bad'); return false; }
        return false;
      } });
    }
  };
  // 2) 작은창자실: 포도당을 혈장에 녹이기
  const gut = () => {
    setRoute(1); stage.innerHTML = '<b>② 작은창자실</b> 융털에서 흡수한 포도당을 혈액에 실어요';
    $('.dv-src-h').textContent = '융털 (작은창자)'; const box = $('.dv-src-in'); box.innerHTML = '';
    say(msg, '포도당은 어디에 실을까요?');
    let n = 0;
    for (let i = 0; i < 3; i++) {
      const t = token('px-glu', '포도당'); box.append(t);
      draggable(t, { onDrop: under => {
        if (under?.closest?.('.dv-plasma')) { t.style.transform = ''; t.dataset.locked = 1; t.classList.add('px-in'); $('.dv-plasma-in').append(t); api.good();
          say(msg, '포도당은 <b>혈장에 녹아서</b> 운반돼요. 이 혈액도 심장을 거쳐 온몸으로 가요.', 'ok');
          if (++n >= 3) setTimeout(() => alive && heart(), 900); return true; }
        if (under?.closest?.('.dv-rbc')) { api.wrong();
          say(msg, '적혈구는 산소를 나르는 세포예요. 포도당은 적혈구가 아니라 <b>혈장</b>에 녹아서 가요.', 'bad'); return false; }
        return false;
      } });
    }
  };
  // 3) 심장: 온몸으로 보내는 쪽(좌심실)을 수축
  const heart = () => {
    setRoute(2); stage.innerHTML = '<b>③ 심장</b> 혈액을 온몸의 세포로 보내요';
    $('.dv-src-h').textContent = '심장'; $('.dv-src-in').innerHTML = '<div class="dv-heart"><span>우심실</span><span>좌심실</span></div>';
    say(msg, '산소를 실은 혈액을 <b>온몸</b>으로 내보내는 방은 어디일까요? 눌러서 수축시키세요.');
    ctrl.innerHTML = shuffle(['우심실', '좌심실']).map(v => `<button class="btn press" data-v="${v}">${v} 수축</button>`).join('');
    ctrl.querySelectorAll('button').forEach(b => b.onclick = () => {
      if (b.dataset.v === '우심실') { api.wrong(); say(msg, '우심실은 혈액을 <b>폐</b>로 보내요(허파순환). 온몸으로 보내는 건 벽이 더 두꺼운 <b>좌심실</b>이에요.', 'bad'); return; }
      ctrl.innerHTML = ''; api.good();
      say(msg, '좌심실이 수축해 혈액이 <b>대동맥 → 온몸의 모세혈관</b>으로 가요.', 'ok');
      el.querySelector('.dv-blood').classList.add('flow');
      setTimeout(() => alive && cell(), 1300);
    });
  };
  // 4) 세포: 산소·포도당 내리기 → 세포 호흡 → CO₂를 혈액으로
  const cell = () => {
    setRoute(3); stage.innerHTML = '<b>④ 세포</b> 모세혈관에서 산소와 포도당을 세포로 내려요';
    el.querySelector('.dv-blood').classList.remove('flow');
    $('.dv-src').hidden = true; $('.dv-cell').hidden = false; $('.dv-play').classList.add('cellmode');
    say(msg, '적혈구의 O₂와 혈장의 포도당을 <b>세포</b>로 끌어 넣으세요.');
    let need = 0;
    const toCell = (node, kind) => { need++; draggable(node, { onDrop: under => {
      if (!under?.closest?.('.dv-cell')) return false;
      const seat = node.closest('.dv-seat');
      node.style.transform = ''; node.dataset.locked = 1; node.className = `px-tok ${kind} px-in`; $('.dv-cell-in').append(node); api.good();
      if (seat) { seat.classList.remove('full'); rbcColor(); }   // 산소를 내릴 때마다 적혈구가 어두운 붉은색으로
      if (--need === 0) setTimeout(() => alive && burn(), 500); return true; } }); };
    el.querySelectorAll('.dv-seat.full').forEach(seat => {
      const t = token('px-o2', 'O<sub>2</sub>'); seat.innerHTML = ''; seat.append(t); toCell(t, 'px-o2');
    });
    el.querySelectorAll('.dv-plasma-in .px-glu').forEach(old => { const t = token('px-glu', '포도당'); t.classList.add('px-in'); old.replaceWith(t); toCell(t, 'px-glu'); });   // 새 조각으로 바꿔서 끌기 다시 붙이기
  };
  const burn = () => {
    say(msg, '재료가 다 모였어요. <b>세포 호흡</b> 스위치를 누르세요.');
    ctrl.innerHTML = '<button class="btn press">세포 호흡 시작</button>';
    ctrl.querySelector('button').onclick = async () => {
      ctrl.innerHTML = ''; api.good();
      $('.dv-mito').classList.add('on'); $('.dv-cell-in').innerHTML = '';
      await sleep(700); if (!alive) return;
      $('.dv-energy').classList.add('full');
      $('.dv-cell-in').innerHTML = '<div class="px-tok px-co2 out">CO<sub>2</sub></div><div class="px-tok px-h2o">물</div>';
      say(msg, '포도당 + 산소 → 이산화탄소 + 물 + <b>에너지</b>. 에너지는 상자로 나가지 않고 <b>세포가 일하는 데</b> 쓰여요. 이제 CO₂를 혈액으로 내보내세요.', 'ok');
      const co2 = $('.dv-cell-in .px-co2');
      draggable(co2, { onDrop: under => {
        if (under?.closest?.('.dv-seat') || under?.closest?.('.dv-plasma')) { co2.style.transform = ''; co2.dataset.locked = 1; co2.classList.add('px-in'); $('.dv-plasma-in').append(co2); api.good(); finish(); return true; }
        return false; } });
    };
  };
  const finish = async () => {
    setRoute(4);
    say(msg, '<b>정리</b> 폐에서 적혈구에 실린 산소 → 폐정맥 → 좌심방 → 좌심실 → 대동맥 → 온몸의 모세혈관 → 세포. 포도당은 혈장에 녹아서 가요. 세포 호흡으로 생긴 CO₂는 다시 혈액에 실려 폐로 가요.', 'sum');
    await sleep(2600); if (alive) api.success();
  };
  lung();
  return () => { alive = false; };
}

// ───────── 2. 심장 리듬 (심장 박동 개선안) ─────────
function rhythm(el, api) {
  el.innerHTML = `<div class="hr">
    <div class="hr-heart">
      <div class="hr-in l">대정맥 ↓</div><div class="hr-in r">폐정맥 ↓</div>
      <!-- 동맥은 심실에서 나와 심장 위쪽으로 올라가요 -->
      <div class="hr-out l"><b>폐동맥 ↑<small>폐로</small></b><div class="hr-valve sl"></div></div>
      <div class="hr-out r"><b>대동맥 ↑<small>온몸으로</small></b><div class="hr-valve sl"></div></div>
      <div class="hr-ch ra" data-c="ra"><i></i><span>우심방</span></div><div class="hr-ch la" data-c="la"><i></i><span>좌심방</span></div>
      <div class="hr-valve av l"></div><div class="hr-valve av r"></div>
      <div class="hr-ch rv" data-c="rv"><i></i><span>우심실</span></div><div class="hr-ch lv" data-c="lv"><i></i><span>좌심실</span></div>
    </div>
    <div class="hr-side"><div class="hr-beats">${'<i></i>'.repeat(3)}</div>
      <button class="btn press hr-a">양쪽 심방 수축</button><button class="btn press hr-v">양쪽 심실 수축</button>
      <div class="hr-note">그림의 왼쪽이 몸의 오른쪽(우심방·우심실)이에요. 색은 산소가 적은 피(어두운 붉은색), 많은 피(밝은 붉은색).</div></div>
    <div class="px-msg"></div></div>`;
  const $ = s => el.querySelector(s), msg = $('.px-msg');
  const fill = (c, k) => el.querySelector(`.hr-ch.${c} i`).style.transform = `scaleY(${k})`;
  let state = 'atria', beats = 0, busy = false, alive = true;   // atria: 심방에 피가 차 있음, ventricles: 심실에 피가 차 있음
  // 시작: 정맥에서 들어온 혈액으로 심방은 가득, 심실도 이미 절반쯤 차 있음 (심방-심실 사이 판막은 열려 있음)
  ['ra', 'la'].forEach(c => fill(c, 1)); ['rv', 'lv'].forEach(c => fill(c, 0.55));
  el.querySelectorAll('.hr-valve.av').forEach(v => v.classList.add('open'));
  say(msg, '심장이 한 번 뛸 때 어느 방이 먼저 수축할까요? 버튼을 순서대로 눌러 <b>3번</b> 뛰게 하세요.');
  const squeeze = cs => cs.forEach(c => { const n = el.querySelector(`.hr-ch.${c}`); n.classList.remove('sq'); void n.offsetWidth; n.classList.add('sq'); });
  $('.hr-a').onclick = async () => {
    if (busy || !alive) return;
    if (state !== 'atria') { api.wrong(); say(msg, '심실이 이미 혈액으로 가득해요. 이제 <b>심실</b>이 수축해 혈액을 내보낼 차례예요.', 'bad'); return; }
    busy = true; squeeze(['ra', 'la']);
    ['ra', 'la'].forEach(c => fill(c, 0.15)); ['rv', 'lv'].forEach(c => fill(c, 1));
    say(msg, '양쪽 <b>심방</b>이 함께 수축 → 열려 있는 판막을 지나 혈액을 <b>심실로 밀어 보내</b> 심실을 가득 채워요.', 'ok'); api.good();
    await sleep(700); state = 'ventricles'; busy = false;
  };
  $('.hr-v').onclick = async () => {
    if (busy || !alive) return;
    if (state !== 'ventricles') { api.wrong(); say(msg, '심실이 아직 덜 찼어요. 먼저 <b>심방</b>이 수축해 혈액을 심실로 밀어 보내야 해요.', 'bad'); return; }
    busy = true; squeeze(['rv', 'lv']);
    el.querySelectorAll('.hr-valve.av').forEach(v => v.classList.remove('open'));
    el.querySelectorAll('.hr-valve.sl').forEach(v => v.classList.add('open'));
    el.querySelectorAll('.hr-out').forEach(o => { o.classList.remove('pulse'); void o.offsetWidth; o.classList.add('pulse'); });
    ['rv', 'lv'].forEach(c => fill(c, 0.15));
    say(msg, '양쪽 <b>심실</b>이 함께 수축 → 심방 쪽 판막이 <b>닫혀 거꾸로 흐르지 않고</b>, 동맥 쪽 판막이 열려 혈액이 폐동맥(폐로)·대동맥(온몸으로) 나가요.', 'ok'); api.good();
    el.querySelectorAll('.hr-beats i')[beats].classList.add('ok');
    await sleep(800);
    el.querySelectorAll('.hr-valve.sl').forEach(v => v.classList.remove('open'));
    el.querySelectorAll('.hr-valve.av').forEach(v => v.classList.add('open'));
    ['ra', 'la'].forEach(c => fill(c, 1)); ['rv', 'lv'].forEach(c => fill(c, 0.55));   // 쉬는 동안 정맥 혈액이 심방을 채우고, 열린 판막으로 심실도 절반쯤 차요
    state = 'atria'; busy = false;
    if (++beats >= 3) {
      busy = true;
      say(msg, '<b>정리</b> 심방(둘이 함께) → 심실(둘이 함께) 순서로 수축해요. 판막은 혈액이 한 방향으로만 흐르게 막아 줘요.', 'sum');
      await sleep(2400); if (alive) api.success();
    }
  };
  return () => { alive = false; };
}

// ───────── 3. 허파꽈리 기체 교환 (허파꽈리 필터 개선안) ─────────
const ROUNDS = [
  { name: '허파: 허파꽈리 ↔ 폐 모세혈관', top: '허파꽈리 (들이마신 공기)', bot: '폐 모세혈관 (온몸에서 돌아온 혈액)', o2: [9, 2], co2: [1, 8] },
  { name: '온몸: 모세혈관 ↔ 조직 세포', top: '온몸 모세혈관 (폐에서 온 혈액)', bot: '조직 세포 (호흡해서 산소를 씀)', o2: [9, 2], co2: [2, 9] },
];
function gas(el, api) {
  let r = 0, alive = true;
  const draw = () => {
    const R = ROUNDS[r];
    const cnt = { o2: [...R.o2], co2: [...R.co2] };
    el.innerHTML = `<div class="gx">
      <div class="gx-title">${r + 1} / ${ROUNDS.length} · ${esc(R.name)}</div>
      <div class="gx-box top"><span class="gx-h">${esc(R.top)}</span><div class="gx-dots"></div><div class="gx-meter"></div></div>
      <div class="gx-mem">${['o2', 'co2'].map(g => `<div class="gx-gate" data-g="${g}"><b>${g === 'o2' ? 'O<sub>2</sub>' : 'CO<sub>2</sub>'} 통로</b>
          <button class="gx-dir press" data-d="down">↓</button><button class="gx-dir press" data-d="up">↑</button></div>`).join('')}
        <button class="btn press gx-open">통로 열기</button></div>
      <div class="gx-box bot"><span class="gx-h">${esc(R.bot)}</span><div class="gx-dots"></div><div class="gx-meter"></div></div>
      <div class="px-msg"></div></div>`;
    const msg = el.querySelector('.px-msg');
    say(msg, '양쪽의 O₂·CO₂ 개수를 보고, 기체가 <b>저절로</b> 움직일 방향을 예상해 화살표를 고른 뒤 통로를 여세요.');
    const paint = () => ['top', 'bot'].forEach((side, k) => {
      const box = el.querySelector(`.gx-box.${side}`);
      box.querySelector('.gx-dots').innerHTML = shuffle([...Array(cnt.o2[k]).fill('o2'), ...Array(cnt.co2[k]).fill('co2')])
        .map(g => `<span class="px-tok px-${g} px-sm">${g === 'o2' ? 'O<sub>2</sub>' : 'CO<sub>2</sub>'}</span>`).join('');
      box.querySelector('.gx-meter').innerHTML = `O₂ <b>${cnt.o2[k]}</b> · CO₂ <b>${cnt.co2[k]}</b>`;
    });
    paint();
    const pickD = {};
    el.querySelectorAll('.gx-gate').forEach(g => g.querySelectorAll('.gx-dir').forEach(b => b.onclick = () => {
      g.querySelectorAll('.gx-dir').forEach(x => x.classList.toggle('on', x === b)); pickD[g.dataset.g] = b.dataset.d;
    }));
    const done = {};
    el.querySelector('.gx-open').onclick = async () => {
      if (!pickD.o2 || !pickD.co2) { say(msg, '두 통로의 화살표를 모두 골라 주세요.'); return; }
      let bad = [];
      for (const g of ['o2', 'co2']) {
        if (done[g]) continue;
        const real = cnt[g][0] > cnt[g][1] ? 'down' : 'up';
        if (pickD[g] !== real) bad.push(g); else done[g] = true;
      }
      // 맞는 통로는 확산: 많은 쪽 → 적은 쪽으로 비슷해질 때까지
      for (const g of ['o2', 'co2']) {
        if (!done[g] || el.querySelector(`.gx-gate[data-g="${g}"]`).classList.contains('ok')) continue;
        el.querySelector(`.gx-gate[data-g="${g}"]`).classList.add('ok'); api.good();
        while (Math.abs(cnt[g][0] - cnt[g][1]) > 1 && alive) {
          if (cnt[g][0] > cnt[g][1]) { cnt[g][0]--; cnt[g][1]++; } else { cnt[g][1]--; cnt[g][0]++; }
          paint(); await sleep(160);
        }
      }
      if (bad.length) {
        api.wrong();
        const g = bad[0] === 'o2' ? 'O₂' : 'CO₂';
        say(msg, `${g} 통로를 열었는데 아무것도 움직이지 않아요. 기체는 <b>많은 쪽에서 적은 쪽으로만</b> 저절로 퍼져요(확산). 개수를 다시 보세요.`, 'bad');
        bad.forEach(x => { const n = el.querySelector(`.gx-gate[data-g="${x}"]`); n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); });
        return;
      }
      say(msg, r === 0 ? '허파꽈리의 O₂는 혈액으로, 혈액의 CO₂는 허파꽈리로 확산했어요. 이제 이 혈액이 온몸으로 가요.'
        : '<b>정리</b> 허파에서도 온몸에서도 기체는 농도가 높은 곳에서 낮은 곳으로 확산해요. "걸러 내는 필터"가 아니에요.', r === 0 ? 'ok' : 'sum');
      await sleep(2200); if (!alive) return;
      if (++r >= ROUNDS.length) api.success(); else draw();
    };
  };
  draw();
  return () => { alive = false; };
}

export const PROTOS = {
  delivery: {
    title: '산소·포도당 배송', compare: 'power', mount: delivery,
    sub: '산소는 적혈구에, 포도당은 혈장에 실어 세포까지 배송하고 세포 호흡을 일으키세요.',
    from: '세포 발전소 (공통 미션)',
    how: '허파실에서 O₂를 적혈구에 싣고 → 작은창자실에서 포도당을 혈장에 녹이고 → 좌심실을 수축시키고 → 세포에 내려 세포 호흡 스위치를 켠 뒤 CO₂를 혈액으로 돌려보내요. (게임에서는 장소 3곳으로 나눠요)',
    learn: '산소 운반 = 적혈구(헤모글로빈), 포도당 운반 = 혈장, 온몸으로 보내는 방 = 좌심실, 에너지는 세포 활동에 쓰임',
    wrong: '포도당을 적혈구에 실으면 "포도당은 혈장에 녹아서 가요", 우심실을 누르면 "우심실은 폐로 보내요"가 바로 떠요.',
  },
  rhythm: {
    title: '심장 리듬', compare: 'heartbeat', mount: rhythm,
    sub: '심방과 심실을 알맞은 순서로 수축시켜 심장을 3번 뛰게 하세요.',
    from: '심장 박동 (사이먼 게임)',
    how: '[양쪽 심방 수축] → [양쪽 심실 수축]을 번갈아 3번. 판막이 열리고 닫히는 모습과 혈액이 차고 빠지는 모습이 보여요.',
    learn: '심방 둘이 함께 → 심실 둘이 함께 수축, 판막은 역류를 막음. 피는 파란색이 아니라 어둡고 밝은 붉은색.',
    wrong: '순서가 틀리면 "심실이 비어 있어요 / 이미 가득해요"처럼 지금 심장 상태로 이유를 알려 줘요.',
  },
  gas: {
    title: '허파꽈리 기체 교환', compare: 'alveoliFilter', mount: gas,
    sub: '양쪽의 기체 개수를 보고 확산 방향을 예상해 통로를 여세요.',
    from: '허파꽈리 필터',
    how: '허파꽈리·혈액의 O₂·CO₂ 개수(농도계)를 보고 두 통로의 방향(↑/↓)을 고른 뒤 [통로 열기]. 맞으면 입자가 저절로 퍼져 개수가 비슷해져요. 허파와 온몸 조직 두 판.',
    learn: '기체 교환은 농도 차에 따른 확산 (필터·여과가 아님). 허파와 온몸 조직에서 방향이 반대.',
    wrong: '방향이 틀리면 통로를 열어도 아무것도 안 움직이고, "많은 쪽에서 적은 쪽으로만 퍼져요"가 떠요.',
  },
};
