"""
모바일용 작은 그림 만들기
사용법:  python make_mobile_images.py
  - img/ 폴더의 모든 .png 를 높이 1280px 로 줄여서 img/m/ 폴더에 .webp 로 저장해요.
  - 비율은 그대로 유지해요. 게임은 그림을 화면 전체 크기로 늘려서 쓰기 때문에 모양이 바뀌지 않아요.
  - PC 에서는 원본(img/)을 계속 쓰고, 모바일(터치 기기)에서만 img/m/ 을 써요.
  - 준비: pip install pillow
"""
import glob, os
from PIL import Image

SRC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
OUT_DIR = os.path.join(SRC_DIR, 'm')
TARGET_H = 1280
QUALITY = 85

os.makedirs(OUT_DIR, exist_ok=True)
files = sorted(glob.glob(os.path.join(SRC_DIR, '*.png')))
for f in files:
    im = Image.open(f).convert('RGBA')
    w, h = im.size
    new_w = round(w * TARGET_H / h)
    im = im.resize((new_w, TARGET_H), Image.LANCZOS)
    out = os.path.join(OUT_DIR, os.path.splitext(os.path.basename(f))[0] + '.webp')
    im.save(out, 'WEBP', quality=QUALITY)
    print(f'{os.path.basename(f)}  {w}x{h}  ->  {new_w}x{TARGET_H}')
print(f'done: {len(files)} files -> {OUT_DIR}')
