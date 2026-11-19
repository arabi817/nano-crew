# 발·모자 그림 만들기: GPT 원본(초록 배경) → 배경 지우기 → 굵은 테두리 → 게임 칸에 맞추기
# 사용: python tools/art/make_parts.py   (assets/_raw/foot_master.png, hat1~5_master.png 를 읽어요)
import os, sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from make_body import remove_green, thicken, recolor, colors, save, raw_file, W, H, ROOT

RAW = ROOT / 'assets' / '_raw'
OUT = Path(os.environ.get('ART_OUT', ROOT / 'assets' / 'characters'))
BODY_BASE_L = 0.59          # 몸 빨강(#e5484d 근처)의 밝기 → 발은 이것보다 어두워서 진하게 칠해져요

EDGE = 3.3                  # 몸통과 같은 '덧댄 테두리' 두께 (게임 그림 기준 px)

def load(name, final_w):
    """배경 지우고 잘라낸 뒤, 줄였을 때 테두리가 EDGE px이 되도록 원본에서 두껍게 해요."""
    a = remove_green(np.array(Image.open(raw_file(RAW, name)).convert('RGBA')))
    ys, xs = np.nonzero(a[..., 3] > 0)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    px = max(1, round(EDGE * a.shape[1] / final_w))
    a = np.pad(a, ((px + 2, px + 2), (px + 2, px + 2), (0, 0)))
    return Image.fromarray(thicken(a, px))

def head_top():
    a = np.array(Image.open(OUT / 'body_0_na.png').convert('RGBA'))
    return np.nonzero(a[:, W // 2 - 40, 3] > 0)[0].min()

# 모자: (가로 폭, 가운데 x, 아래 끝 y). 6·8·10·13은 몸 '뒤'에 그려요(js/player/avatarSvg.js BEHIND_HATS) — 원래 SVG 모자 자리의 4배, 머리 꼭대기 120 기준
HATS = {
    1: (196, 186, 178),   # 야구모자 (챙이 오른쪽)
    2: (104, 214, 176),   # 리본 (안테나 옆)
    3: (150, 166, 156),   # 왕관
    4: (156, 166, 138),   # 새싹
    5: (196, 168, 152),   # 요리사 모자
    6: (236, 160, 190),   # 적혈구 머리띠
    7: (224, 160, 176),   # 미토콘드리아 비니
    8: (226, 160, 182),   # 헤드램프
    9: (196, 160, 168),   # 보안경 (이마)
    10: (236, 160, 200),  # 고양이 귀
    11: (78, 96, 170),    # 별 핀 (왼쪽 옆머리, 안테나는 보임)
    12: (304, 160, 246),  # 헤드셋 (귀 자리까지)
    13: (220, 160, 196),  # 토끼 귀
}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if raw_file(RAW, 'foot_master'):
        foot = load('foot_master', 88)
        k = min(88 / foot.width, 66 / foot.height)
        foot = foot.resize((round(foot.width * k), round(foot.height * k)), Image.LANCZOS)
        can = Image.new('RGBA', (96, 72)); can.alpha_composite(foot, ((96 - foot.width) // 2, (72 - foot.height) // 2))
        base = np.array(can)
        for i, hexc in enumerate(colors()):
            save(recolor(base, hexc, BODY_BASE_L), OUT / f'foot_{i}.png')
        print('foot x12')
    if raw_file(RAW, 'down_master'):   # 쓰러진 대원 (기절): 400×256 칸 (화면 100×64의 4배) → 12색
        im = load('down_master', 380)
        k = min(392 / im.width, 248 / im.height)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        can = Image.new('RGBA', (400, 256)); can.alpha_composite(im, ((400 - im.width) // 2, (256 - im.height) // 2))
        base = np.array(can)
        for i, hexc in enumerate(colors()):
            save(recolor(base, hexc), OUT / f'down_{i}.png')
        print('down x12')
    dy = head_top() - 120
    for h, (w, cx, bottom) in HATS.items():
        if not raw_file(RAW, f'hat{h}_master'): continue
        im = load(f'hat{h}_master', w)
        k = w / im.width
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        can = Image.new('RGBA', (W, H))
        can.alpha_composite(im, (round(cx - im.width / 2), max(0, round(bottom + dy - im.height))))
        save(np.array(can), OUT / f'hat{h}.png')
        print('hat', h)

if __name__ == '__main__':
    main()
