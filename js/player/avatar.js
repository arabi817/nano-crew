// 게임 화면 속 캐릭터 (Phaser). 걸을 때 통통 튀고, 발이 번갈아 움직여요.
import { COLORS, HATS } from '../common/colors.js';
import { bodySVG, footSVG, hatOnlySVG, bodyArt, footArt, hatArt, BEHIND_HATS } from './avatarSvg.js';
import { loadImg } from '../common/assets.js';

// 화면에서 몸통은 가로 80, 발은 가로 24 크기 (그림 파일이 더 크면 그만큼 줄여요)
export const fitScale = (scene, key, w) => w / (scene.textures.get(key).getSourceImage().width || w);

function addSvg(scene, key, svg) {
  return new Promise(res => {
    if (scene.textures.exists(key)) return res();
    const img = new Image();
    img.onload = () => { if (!scene.textures.exists(key)) scene.textures.addImage(key, img); res(); };
    img.onerror = () => res();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

// 그림 파일 모드: 몸통·장식·발 그림을 미리 받아 두고, 대원 모습(색 × 장식) 텍스처는 화면에 나올 때 만들어요.
// (12색 × 장식 14종을 다 만들면 패드 메모리를 너무 많이 써서)
const IMG = new Map();
const artMode = () => !!bodyArt(0, 0);
const want = path => {
  if (!path || IMG.has(path)) return;
  const pr = loadImg(path); IMG.set(path, pr);
  pr.then(img => { pr.__img = img; });
};

export function loadAvatarTextures(scene) {
  if (!artMode()) {   // 예전 방식: 코드 그림(SVG)을 전부 미리 만들기
    const jobs = [];
    COLORS.forEach((c, ci) => {
      HATS.forEach(h => jobs.push(addSvg(scene, `av_${ci}_${h.id}`, bodySVG(c.hex, h.id))));
      jobs.push(addSvg(scene, `ft_${ci}`, footSVG(c.hex)));
    });
    return Promise.all(jobs);
  }
  COLORS.forEach((c, ci) => { want(bodyArt(ci, 0)); want(bodyArt(ci, 1)); want(footArt(ci)); });
  HATS.forEach(h => want(hatArt(h.id)));
  return Promise.all([...IMG.values()]).then(() => Promise.all(COLORS.map((c, ci) => {
    const ft = footArt(ci);
    if (!ft) return addSvg(scene, `ft_${ci}`, footSVG(c.hex));
    return IMG.get(ft).then(img => { if (img && !scene.textures.exists(`ft_${ci}`)) scene.textures.addImage(`ft_${ci}`, img); });
  })));
}

// 대원 모습 텍스처 이름 (없으면 지금 만들어요). 그림 파일 모드가 아니면 미리 만든 것을 그대로 써요.
export function avKey(scene, ci, hat = 0) {
  const key = `av_${ci}_${hat}`;
  if (scene.textures.exists(key) || !artMode()) return key;
  const body = bodyArt(ci, hat), ht = hatArt(hat);
  // 미리 받아 둔 그림은 이미 다 불러온 상태라 바로 그려요
  const bodyImg = IMG.get(body)?.__img, hatImg = ht && IMG.get(ht)?.__img;
  if (!bodyImg) return key;
  const imgs = BEHIND_HATS.includes(hat) ? [hatImg, bodyImg] : [bodyImg, hatImg];   // 머리띠류는 몸 뒤에
  const { width: w, height: h } = bodyImg;
  const tex = scene.textures.createCanvas(key, w, h), ctx = tex.getContext();
  imgs.forEach(img => img && ctx.drawImage(img, 0, 0, w, h));
  tex.refresh();
  if (hat && !ht && hat <= 5) overlaySvgHat(scene, key, hat);   // 장식 그림이 아직 없으면 코드 모자를 얹어요
  return key;
}

export class Avatar {
  constructor(scene, { c = 0, hat = 0, label = '' }) {
    this.scene = scene; this.c = c; this.hat = hat;
    this.root = scene.add.container(0, 0);
    this.shadow = scene.add.ellipse(0, 33, 48, 12, 0x000000, 0.28);
    this.footL = scene.add.image(-11, 29, `ft_${c}`).setScale(fitScale(scene, `ft_${c}`, 24));
    this.footR = scene.add.image(11, 29, `ft_${c}`).setScale(fitScale(scene, `ft_${c}`, 24));
    const bk = avKey(scene, c, hat);
    this.body = scene.add.image(0, -7.5, bk).setScale(fitScale(scene, bk, 80));
    this.inner = scene.add.container(0, 0, [this.footL, this.footR, this.body]);
    this.label = scene.add.text(0, -58, label, {
      fontFamily: 'Jua', fontSize: '21px', color: '#ffffff', stroke: '#1a1018', strokeThickness: 6,
    }).setOrigin(0.5, 1).setResolution(2);
    this.root.add([this.shadow, this.inner, this.label]);
    this.t = 0; this.face = 1; this.flip = 1;
  }
  setLook(c, hat) {
    if (c === this.c && hat === this.hat) return;
    this.c = c; this.hat = hat;
    const bk = avKey(this.scene, c, hat);
    this.body.setTexture(bk).setScale(fitScale(this.scene, bk, 80));
    this.footL.setTexture(`ft_${c}`); this.footR.setTexture(`ft_${c}`);
    this.footL.setScale(fitScale(this.scene, `ft_${c}`, 24)); this.footR.setScale(fitScale(this.scene, `ft_${c}`, 24));
  }
  setLabel(t) { this.label.setText(t); }
  setPos(x, y) { this.root.setPosition(x, y); this.root.setDepth(y); }
  update(dt, moving, face) {
    if (face) this.face = face;
    this.flip += (this.face - this.flip) * Math.min(1, dt / 70);
    this.inner.scaleX = this.flip;
    if (moving) {
      this.t += dt;
      const ph = this.t * 0.0135;
      this.inner.y = -Math.abs(Math.sin(ph)) * 7;
      this.inner.rotation = Math.sin(ph) * 0.08;
      this.footL.y = 29 - Math.max(0, Math.sin(ph)) * 6 - this.inner.y;
      this.footR.y = 29 - Math.max(0, -Math.sin(ph)) * 6 - this.inner.y;
      this.footL.x = -11 + Math.sin(ph) * 3; this.footR.x = 11 - Math.sin(ph) * 3;
    } else {
      const k = Math.min(1, dt / 90);
      this.inner.y *= 1 - k; this.inner.rotation *= 1 - k;
      this.footL.y += (29 - this.footL.y) * k; this.footR.y += (29 - this.footR.y) * k;
      this.footL.x += (-11 - this.footL.x) * k; this.footR.x += (11 - this.footR.x) * k;
    }
  }
  // 보이는 미션 효과 (다른 친구 화면에도 보여요)
  setFx(id) {
    if (id === this.fxId) return;
    this.fxId = id; this.fx?.destroy(); this.fx = null; this.fxTweens?.forEach(t => t.remove()); this.fxTweens = [];
    if (!id) return;
    const s = this.scene, c = s.add.container(0, 0); this.fx = c;
    if (id === 'bloodScan') { // 초록 스캔 빛이 위아래로 훑음
      const beam = s.add.rectangle(0, -10, 74, 10, 0x6dfc9c, 0.75).setStrokeStyle(2, 0x1a1018);
      const glow = s.add.ellipse(0, 30, 80, 22, 0x6dfc9c, 0.35);
      c.add([glow, beam]);
      this.fxTweens.push(s.tweens.add({ targets: beam, y: { from: -40, to: 30 }, duration: 700, yoyo: true, repeat: -1 }));
    } else if (id === 'colon') { // 찌꺼기가 아래로 쏟아짐
      for (let i = 0; i < 3; i++) {
        const d = s.add.circle(30 + i * 8, -20, 6, 0x8a5a2b).setStrokeStyle(2, 0x1a1018);
        c.add(d);
        this.fxTweens.push(s.tweens.add({ targets: d, y: { from: -30, to: 40 }, alpha: { from: 1, to: 0 }, duration: 800, delay: i * 250, repeat: -1 }));
      }
    } else if (id === 'breathModel') { // 머리 위 풍선이 부풀었다 줄었다
      const b = s.add.ellipse(0, -84, 26, 30, 0xf2a6b8).setStrokeStyle(3, 0x1a1018);
      c.add(b);
      this.fxTweens.push(s.tweens.add({ targets: b, scale: { from: 0.6, to: 1.25 }, duration: 900, yoyo: true, repeat: -1 }));
    }
    this.root.addAt(c, 1);
  }
  setAlpha(a) { this.root.setAlpha(a); this.root.setVisible(a > 0.01); }
  destroy() { this.root.destroy(); }
}
