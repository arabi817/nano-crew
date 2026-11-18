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
  setAlpha(a) { this.root.setAlpha(a); this.root.setVisible(a > 0.01); }
  destroy() { this.root.destroy(); }
}
