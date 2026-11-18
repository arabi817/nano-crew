# 대원 몸통 그림 만들기: GPT가 그린 빨간 원본 1장 → 배경 지우기 → 12색 칠하기 → assets/characters/ 저장
# 사용: python tools/art/make_body.py assets/_raw/body_master.png [바깥선추가px]   (Pillow, numpy 필요)
import colorsys, re, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
import os
OUT = Path(os.environ.get('ART_OUT', ROOT / 'assets' / 'characters'))   # 시험용으로 다른 폴더에 만들 때 ART_OUT
W, H = 320, 380                       # viewBox -40 -55 80 95 의 4배

def colors():
    src = (ROOT / 'js/common/colors.js').read_text(encoding='utf-8')
    return re.findall(r"hex: '(#[0-9a-fA-F]{6})'", src)[:12]

def remove_green(a):
    r, g, b = [a[..., i].astype(int) for i in range(3)]
    key = (g > 140) & (g > r + 60) & (g > b + 60)
    a[key, 3] = 0
    spill = (a[..., 3] > 0) & (g > np.maximum(r, b))           # 외곽선 가장자리에 남은 초록 빼기
    a[spill, 1] = np.maximum(r, b)[spill]
    return a

def thicken(a, px):
    """바깥 외곽선을 px만큼 더 두껍게 (몸 둘레에 진한 색 테두리를 한 겹 더)."""
    if px <= 0: return a
    alpha = Image.fromarray(a[..., 3])
    grown = np.array(alpha.filter(ImageFilter.MaxFilter(px * 2 + 1)))
    ink = np.zeros_like(a); ink[..., :3] = (26, 16, 24); ink[..., 3] = grown
    out = Image.fromarray(ink); out.alpha_composite(Image.fromarray(a))
    return np.array(out)

def measure(a):
    """원본에서 팔 끝~팔 끝 폭, 몸 바닥, 몸 꼭대기(안테나 제외)를 재요."""
    al = a[..., 3] > 0
    ys, xs = np.nonzero(al)
    x0, x1, bottom = xs.min(), xs.max(), ys.max()
    cx = (x0 + x1) / 2
    top = np.nonzero(al[:, int(cx - 60)])[0].min() - 4      # 안테나 줄기를 피해 조금 옆 기둥에서
    return x0, x1, cx, top, bottom

FULL_W, BOTTOM = 300, 348          # SVG에서 팔 끝~팔 끝 = 75×4, 몸 바닥 = 87×4

def place(img, m):
    x0, x1, cx, top, bottom = m
    k = FULL_W / (x1 - x0)
    im = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    can = Image.new('RGBA', (W, H))
    can.alpha_composite(im, (round(W / 2 - cx * k), round(BOTTOM - bottom * k)))
    # 안테나 없는 판을 만들 때 쓸 몸 타원 (캔버스 좌표)
    ry = (bottom - top) * k / 2
    return can, (W / 2, BOTTOM - ry, ry)

def recolor(a, target):
    """빨간 칠(분홍 안테나 공 포함)만 골라 target 색으로, 밝고 어두운 정도는 그대로."""
    out = a.copy()
    rgb = a[..., :3] / 255.0
    hls = np.apply_along_axis(lambda p: colorsys.rgb_to_hls(*p), 2, rgb)
    hsv_s = rgb.max(2) - rgb.min(2)
    h, l, s = hls[..., 0], hls[..., 1], hls[..., 2]
    paint = (a[..., 3] > 0) & ((h > 0.88) | (h < 0.045)) & (hsv_s > 0.18) & (rgb.max(2) > 0.3)
    base = np.median(l[paint & (s > 0.6)])
    th, tl, ts = colorsys.rgb_to_hls(*[int(target[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    ys, xs = np.nonzero(paint)
    for y, x in zip(ys, xs):
        L = l[y, x]
        nl = tl * L / base if L <= base else tl + (1 - tl) * (L - base) / (1 - base)
        ns = min(1, ts * s[y, x] / 0.75) if ts > 0.05 else ts
        out[y, x, :3] = [round(v * 255) for v in colorsys.hls_to_rgb(th, min(1, nl), ns)]
    return out

def no_antenna(a, body):
    cx, cy, ry = body
    yy, xx = np.mgrid[0:H, 0:W]
    rx = ry * 0.97
    outside = (((xx - cx) / (rx + 3)) ** 2 + ((yy - cy) / (ry + 3)) ** 2 > 1) & (yy < cy - ry * 0.55)
    b = a.copy(); b[outside, 3] = 0
    return b

def save(arr, path):
    # 256색으로 줄여서 용량을 1/3 정도로 (학교 와이파이용). 투명도는 그대로.
    Image.fromarray(arr).quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)

def main(src, outline=0):
    a = thicken(remove_green(np.array(Image.open(src).convert('RGBA'))), outline)
    can, body = place(Image.fromarray(a), measure(a))
    base = np.array(can)
    OUT.mkdir(parents=True, exist_ok=True)
    for i, hexc in enumerate(colors()):
        c = recolor(base, hexc)
        save(c, OUT / f'body_{i}.png')
        save(no_antenna(c, body), OUT / f'body_{i}_na.png')
        print('body', i, hexc)

if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 0)  # 두 번째 값: 바깥 선 더 굵게(원본 px)
