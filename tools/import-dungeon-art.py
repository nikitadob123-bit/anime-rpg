"""Импорт артов подземелий: python3 tools/import-dungeon-art.py <папка с <id>.png/jpg/webp>
Квадрат до 512 px, webp → img/dungeons/<id>.webp, затем node tools/dungeon-art-index.js.
Ожидаются готовые 1:1 сцены; фон не вырезается."""
import os, sys, subprocess
from PIL import Image
src = sys.argv[1]
size = int(sys.argv[2]) if len(sys.argv) > 2 else 512
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'img/dungeons'); os.makedirs(out, exist_ok=True)
ok = 0
for f in sorted(os.listdir(src)):
    idn, ext = os.path.splitext(f)
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp') or idn.startswith('.'): continue
    im = Image.open(os.path.join(src, f)).convert('RGB')
    s = min(im.size); l, t = (im.size[0] - s) // 2, (im.size[1] - s) // 2
    im = im.crop((l, t, l + s, t + s)).resize((min(size, s),) * 2, Image.LANCZOS)
    im.save(os.path.join(out, idn + '.webp'), 'WEBP', quality=82, method=6); print(idn, im.size); ok += 1
print(ok, 'files')
subprocess.run(['node', os.path.join(root, 'tools/dungeon-art-index.js')], check=True)
