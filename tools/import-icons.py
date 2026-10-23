"""Импорт иконок: python tools/import-icons.py <папка с <id>.png> [размер=256]
Мягкое удаление однотонного фона (тёмно-синего): фон — только область, связанная с краем кадра; альфа плавно растёт с отличием от цвета фона
(свечение и тёмные предметы не съедаются, внутренние дыры не трогаются). Для круглых сцен (SCENES) — мягкая круглая/эллиптическая маска по
границе сцены. Результат: обрезка по объекту, квадрат, webp → img/icons/<id>.webp; затем node tools/icons-index.js. Нужны numpy, scipy, PIL."""
import sys, os, subprocess
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
src = sys.argv[1]; size = int(sys.argv[2]) if len(sys.argv) > 2 else 256
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); out = os.path.join(root, 'img/icons'); os.makedirs(out, exist_ok=True)
LO, HI = 14, 46   # отличие от фона: ниже LO — прозрачно, выше HI — непрозрачно
SCENES = {'ev_fish', 'ev_stars', 'ph_dawn', 'ph_dusk'}   # круглые сцены — целиком
for f in sorted(os.listdir(src)):
    idn, ext = os.path.splitext(f)
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'): continue
    a = np.array(Image.open(os.path.join(src, f)).convert('RGB')).astype(float); h, w = a.shape[:2]
    edge = np.concatenate([a[:3].reshape(-1, 3), a[-3:].reshape(-1, 3), a[:, :3].reshape(-1, 3), a[:, -3:].reshape(-1, 3)]); bg = np.median(edge, axis=0)
    d = np.abs(a - bg).max(axis=2); d = ndi.gaussian_filter(d, 0.8)
    soft = np.clip((d - LO) / (HI - LO), 0, 1)
    cand = d < HI; lab, _ = ndi.label(cand); bl = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgreg = np.isin(lab, list(bl))
    alpha = np.where(bgreg, soft, 1.0)
    if idn in SCENES:
        obj = ndi.binary_fill_holes(d > HI); ys, xs = np.nonzero(obj)
        if len(ys):
            cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2; ry, rx = (ys.max() - ys.min()) / 2 + 3, (xs.max() - xs.min()) / 2 + 3
            yy, xx = np.mgrid[:h, :w]; r = np.sqrt(((yy - cy) / ry) ** 2 + ((xx - cx) / rx) ** 2)
            alpha = np.maximum(alpha, np.clip((1.0 - r) / 0.06, 0, 1))
    # снять синий ореол на полупрозрачных краях
    m = (alpha > 0) & (alpha < 1); al = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.where(m[..., None], np.clip((a - bg * (1 - al)) / al, 0, 255), a)
    im = Image.fromarray(np.dstack([rgb, alpha * 255]).astype('uint8'), 'RGBA')
    bb = Image.fromarray((alpha > 0.06).astype('uint8') * 255).getbbox(); im = im.crop(bb) if bb else im
    s = max(im.size) + 8; c = Image.new('RGBA', (s, s)); c.paste(im, ((s - im.size[0]) // 2, (s - im.size[1]) // 2))
    c = c.resize((min(size, 512),) * 2, Image.LANCZOS); c.save(os.path.join(out, idn + '.webp'), 'WEBP', quality=86, method=6); print(idn, end=' ')
print(); subprocess.run(['node', os.path.join(root, 'tools/icons-index.js')])
