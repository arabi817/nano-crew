// 게임 화면 속 캐릭터 (Phaser). 걸을 때 통통 튀고, 발이 번갈아 움직여요.
import { COLORS, HATS } from '../common/colors.js';
import { bodySVG, footSVG } from './avatarSvg.js';

function addSvg(scene, key, svg) {
  return new Promise(res => {
    if (scene.textures.exists(key)) return res();
    const img = new Image();
    img.onload = () => { if (!scene.textures.exists(key)) scene.textures.addImage(key, img); res(); };
    img.onerror = () => res();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

export function loadAvatarTextures(scene) {
  const jobs = [];
  COLORS.forEach((c, ci) => {
    HATS.forEach(h => jobs.push(addSvg(scene, `av_${ci}_${h.id}`, bodySVG(c.hex, h.id))));
    jobs.push(addSvg(scene, `ft_${ci}`, footSVG(c.hex)));
  });
  return Promise.all(jobs);
}

export class Avatar {
  constructor(scene, { c = 0, hat = 0, label = '' }) {
    this.scene = scene; this.c = c; this.hat = hat;
    this.root = scene.add.container(0, 0);
    this.shadow = scene.add.ellipse(0, 33, 48, 12, 0x000000, 0.28);
    this.footL = scene.add.image(-11, 29, `ft_${c}`).setScale(0.5);
    this.footR = scene.add.image(11, 29, `ft_${c}`).setScale(0.5);
    this.body = scene.add.image(0, -7.5, `av_${c}_${hat}`).setScale(0.5);
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
    this.body.setTexture(`av_${c}_${hat}`);
    this.footL.setTexture(`ft_${c}`); this.footR.setTexture(`ft_${c}`);
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
