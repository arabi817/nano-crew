# 방 바닥·소품·장치·로고 만들기: assets/_raw 의 GPT 원본 → 게임 칸 크기에 맞춰 저장
# 사용: python tools/art/make_map.py   (원본이 있는 것만 만들어요)
import sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from make_body import remove_green, thicken, save, raw_file, ROOT

RAW, A = ROOT / 'assets' / '_raw', ROOT / 'assets'
EDGE = 3        # 덧댄 바깥 테두리 (저장 그림 기준 px)

# 방 바닥: 방 크기 그대로 (js/map/map.js ROOMS)
ROOMS = {'meeting': (900, 700), 'power': (700, 500), 'digest': (700, 550), 'small': (800, 600),
         'large': (700, 550), 'heart': (700, 600), 'vessel': (700, 450), 'lung': (800, 800),
         'kidney': (550, 500), 'bladder': (450, 450), 'lobby': (1300, 850)}

# 투명 그림: 저장 폴더, 저장 크기(화면 크기의 2배, 로고는 그대로)
CUTOUTS = {'table': ('props', 720, 720), 'mitochondria': ('props', 432, 248), 'mouth': ('props', 432, 312),
           'stomach': ('props', 600, 460), 'colon': ('props', 1020, 720), 'heart': ('props', 472, 460),
           'alveoli': ('props', 260, 260), 'kidney': ('props', 340, 460), 'glomerulus': ('props', 200, 200),
           'crate': ('props', 240, 240), 'vessels': ('props', 680, 380), 'task': ('devices', 200, 152), 'sab_o2': ('devices', 176, 160),
           'sab_kidney': ('devices', 176, 160), 'vent': ('devices', 184, 116), 'clot': ('devices', 124, 124),
           'logo': ('ui', 1200, 400), 'virus': ('ui', 600, 600)}

def cover(im, w, h):
    """가운데를 기준으로 잘라서 w×h를 꽉 채우기"""
    k = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))

def contain(name, w, h):
    """배경 지우고, 테두리 덧대고, 비율 그대로 w×h 칸 가운데에 넣기"""
    a = remove_green(np.array(Image.open(raw_file(RAW, name)).convert('RGBA')))
    ys, xs = np.nonzero(a[..., 3] > 0)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    k = min((w - 4) / a.shape[1], (h - 4) / a.shape[0])
    px = max(1, round(EDGE / k))
    a = np.pad(a, ((px + 2, px + 2), (px + 2, px + 2), (0, 0)))
    im = Image.fromarray(thicken(a, px))
    k = min(w / im.width, h / im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    can = Image.new('RGBA', (w, h)); can.alpha_composite(im, ((w - im.width) // 2, (h - im.height) // 2))
    return np.array(can)

def tube_tile(name):
    """가로 관 그림 → 이음매 없이 반복되는 한 조각 (높이 64). 고리가 있으면 고리 한 주기만큼 잘라요."""
    a = remove_green(np.array(Image.open(raw_file(RAW, name)).convert('RGBA')))
    rows = np.nonzero((a[..., 3] > 0).mean(1) > 0.6)[0]
    a = a[rows.min():rows.max() + 1]
    w = a.shape[1]
    mid = a[a.shape[0] // 2, :, :3].astype(int).sum(1)            # 가운데 줄 밝기 → 고리(진한 선) 위치
    dark = np.nonzero(mid < 200)[0]
    groups = np.split(dark, np.nonzero(np.diff(dark) > 80)[0] + 1) if len(dark) else []   # 고리 하나의 앞뒤 테두리는 한 묶음
    rings = [g.mean() for g in groups if len(g)]
    if len(rings) >= 4:                                            # 고리 두 개 사이 한가운데부터 한 주기
        per = np.median(np.diff(rings[1:-1])) if len(rings) > 4 else np.diff(rings).mean()
        x0 = int(rings[1] + per / 2); x1 = int(x0 + per)
    else:
        x0, x1 = int(w * 0.3), int(w * 0.7)                        # 매끈한 관: 가운데만 (끝의 둥근 하이라이트 피하기)
    im = Image.fromarray(a[:, x0:x1])
    k = 64 / im.height
    return im.resize((max(8, round(im.width * k)), 64), Image.LANCZOS)

def main(only=None):
    made = []
    for name in ('tube_red', 'tube_blue', 'tube_air', 'tube_yellow'):
        if not raw_file(RAW, name) or (only and name not in only): continue
        tube_tile(name).save(A / 'props' / f'{name}.png', optimize=True)
        made.append(f'props/{name}.png')
    # 미션 종류별 장치: _raw/dev_<종류> → devices/<종류>.png (화면 110×86의 2배)
    for p in sorted(RAW.glob('dev_*')):
        name = p.stem
        if only and name not in only: continue
        save(contain(name, 220, 172), A / 'devices' / f'{name[4:]}.png')
        made.append(f'devices/{name[4:]}.png')
    for rid, (w, h) in ROOMS.items():
        src = raw_file(RAW, f'floor_{rid}')
        if not src or (only and f'floor_{rid}' not in only): continue
        (A / 'rooms').mkdir(exist_ok=True)
        cover(Image.open(src).convert('RGB'), w, h).save(A / 'rooms' / f'{rid}.jpg', quality=84, optimize=True)
        made.append(f'rooms/{rid}.jpg')
    # 복도 바닥(반복 무늬)과 방 뒷벽(가로로 반복)
    for src, dst, size in (('hall_tile', 'hall', (512, 512)), ('wall_tile', 'wall', None)):
        if not raw_file(RAW, src) or (only and src not in only): continue
        im = Image.open(raw_file(RAW, src)).convert('RGB')
        if size is None: size = (round(im.width * 192 / im.height), 192)   # 벽 높이 96의 2배
        im.resize(size, Image.LANCZOS).save(A / 'rooms' / f'{dst}.jpg', quality=84, optimize=True)
        made.append(f'rooms/{dst}.jpg')
    for name, (folder, w, h) in CUTOUTS.items():
        if not raw_file(RAW, name) or (only and name not in only): continue
        (A / folder).mkdir(exist_ok=True)
        save(contain(name, w, h), A / folder / f'{name}.png')
        made.append(f'{folder}/{name}.png')
    print('\n'.join(made))

if __name__ == '__main__':
    main(sys.argv[1:] or None)
