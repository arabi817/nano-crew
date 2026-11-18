# assets/list.js 다시 만들기: assets 폴더(characters·rooms·props·devices·ui)에 실제로 있는 그림을 모두 적어요.
# 사용: python3 tools/art/update_list.py   (그림을 넣거나 뺀 뒤 한 번 실행)
from pathlib import Path

A = Path(__file__).resolve().parents[2] / 'assets'
FOLDERS = ['characters', 'rooms', 'props', 'devices', 'ui']

def key(p):  # body_2.png 가 body_10.png 보다 앞에 오게
    import re
    return [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', p)]

lines = []
for f in FOLDERS:
    files = sorted((p.relative_to(A).as_posix() for p in (A / f).glob('*') if p.suffix in ('.png', '.jpg')), key=key)
    if files:
        lines.append(f'  // {f}')
        lines += [f"  '{x}'," for x in files]
(A / 'list.js').write_text(
    "// 지금 assets 폴더에 '들어 있는' 그림 목록이에요. (tools/art/update_list.py가 자동으로 만들어요)\n"
    "// 여기 적힌 그림만 불러오고, 목록에 없으면 지금의 코드 그림을 그대로 써요.\n"
    "// (없는 그림을 찾으러 가면 학생 패드에 오류가 쌓여서 목록으로 관리해요. 자세한 칸 설명은 ASSETS.md)\n"
    "export const LIST = [\n" + '\n'.join(lines) + "\n];\n", encoding='utf-8')
print(sum(1 for l in lines if not l.strip().startswith('//')), 'files')
