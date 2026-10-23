"""Импорт иконок: python3 tools/import-icons.py <папка с <id>.png/jpg> — убирает однотонный тёмный/светлый фон заливкой от краёв, обрезает, 512px webp → img/icons/<id>.webp, затем node tools/icons-index.js."""
import sys, os, subprocess
from PIL import Image
import numpy as np
from collections import deque
src = sys.argv[1]; root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); out = os.path.join(root, 'img/icons')
for f in sorted(os.listdir(src)):
    idn, ext = os.path.splitext(f)
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'): continue
    im = Image.open(os.path.join(src, f)).convert('RGBA'); a = np.array(im).astype(int); h, w = a.shape[:2]
    if a[..., 3].min() > 250:
        bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])[:, :3], axis=0); tol = 38
        diff = np.abs(a[..., :3] - bg).max(axis=2) < tol; m = np.zeros((h, w), bool); q = deque()
        for x in range(w): q += [(0, x), (h - 1, x)]
        for y in range(h): q += [(y, 0), (y, w - 1)]
        while q:
            y, x = q.popleft()
            if 0 <= y < h and 0 <= x < w and not m[y, x] and diff[y, x]: m[y, x] = True; q += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
        a[..., 3] = np.where(m, 0, 255)
    im = Image.fromarray(a.astype('uint8')); bb = im.getbbox(); im = im.crop(bb) if bb else im
    s = max(im.size); c = Image.new('RGBA', (s, s)); c.paste(im, ((s - im.size[0]) // 2, (s - im.size[1]) // 2)); c = c.resize((min(512, s),) * 2, Image.LANCZOS)
    c.save(os.path.join(out, idn + '.webp'), 'WEBP', quality=82); print(idn)
subprocess.run(['node', os.path.join(root, 'tools/icons-index.js')])
