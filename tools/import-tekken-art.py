"""Импорт артов коллабы «Железный Кулак»:
  python3 tools/import-tekken-art.py <папка>

Принимает файлы <id>.png/jpg/webp и листы sheet_rewards.png / .jpg / .webp (4×4, порядок — tekken-art-requests.json).
Баннер и фоны масштабируются в свой размер без вырезания фона.
Портреты — квадрат 512 (центр), фон сохраняется (ожидается тёмный, удобный для вырезания).
Иконки наград — квадрат 512, мягкое удаление однотонного края, как в import-icons.py.
Результат: img/tekken/<id>.webp, затем node tools/tekken-art-index.js.
"""
import json, os, sys, subprocess
from pathlib import Path
try:
    import numpy as np
    from PIL import Image, ImageFilter
except ImportError:
    sys.exit('need Pillow and numpy')

root = Path(__file__).resolve().parents[1]
out = root / 'img/tekken'; out.mkdir(parents=True, exist_ok=True)
req_path = Path('/workspace/tekken-art-requests.json')
reqs = json.loads(req_path.read_text()) if req_path.exists() else {'assets': [], 'sheets': []}
by_id = {a['id']: a for a in reqs.get('assets', [])}
sheets = {s['id']: s for s in reqs.get('sheets', [])}

def save_rgb(im, dest, size=None):
    if size:
        tw, th = size if isinstance(size, (list, tuple)) else (size, size)
        im = im.convert('RGB')
        # cover-crop to aspect, then resize
        sw, sh = im.size
        if sw / sh > tw / th:
            nw = int(sh * tw / th); left = (sw - nw) // 2
            im = im.crop((left, 0, left + nw, sh))
        else:
            nh = int(sw * th / tw); top = (sh - nh) // 2
            im = im.crop((0, top, sw, top + nh))
        im = im.resize((tw, th), Image.LANCZOS)
        im.save(dest, 'WEBP', quality=84, method=6)
    else:
        im.convert('RGB').save(dest, 'WEBP', quality=84, method=6)

def _blur(d, sigma=0.8):
    # лёгкое размытие без scipy
    im = Image.fromarray((np.clip(d, 0, 255)).astype('uint8'), 'L')
    return np.array(im.filter(ImageFilter.GaussianBlur(radius=sigma)), dtype=float)

def soft_icon(im, size=512):
    a = np.array(im.convert('RGB')).astype(float)
    h, w = a.shape[:2]
    edge = np.concatenate([a[:3].reshape(-1, 3), a[-3:].reshape(-1, 3), a[:, :3].reshape(-1, 3), a[:, -3:].reshape(-1, 3)])
    bg = np.median(edge, axis=0)
    d = _blur(np.abs(a - bg).max(axis=2), 0.8)
    LO, HI = 14, 46
    soft = np.clip((d - LO) / (HI - LO), 0, 1)
    cand = d < HI
    # фон — только область, связанная с краем кадра (flood fill)
    bgreg = np.zeros((h, w), dtype=bool)
    vis = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        if cand[0, x]: stack.append((0, x))
        if cand[h - 1, x]: stack.append((h - 1, x))
    for y in range(h):
        if cand[y, 0]: stack.append((y, 0))
        if cand[y, w - 1]: stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if vis[y, x]: continue
        if not cand[y, x]: continue
        vis[y, x] = True
        bgreg[y, x] = True
        if y > 0: stack.append((y - 1, x))
        if y + 1 < h: stack.append((y + 1, x))
        if x > 0: stack.append((y, x - 1))
        if x + 1 < w: stack.append((y, x + 1))
    alpha = np.where(bgreg, soft, 1.0)
    m = (alpha > 0) & (alpha < 1)
    al = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.where(m[..., None], np.clip((a - bg * (1 - al)) / al, 0, 255), a)
    im2 = Image.fromarray(np.dstack([rgb, alpha * 255]).astype('uint8'), 'RGBA')
    bb = Image.fromarray((alpha > 0.06).astype('uint8') * 255).getbbox()
    im2 = im2.crop(bb) if bb else im2
    side = max(im2.size) + 8
    c = Image.new('RGBA', (side, side))
    c.paste(im2, ((side - im2.size[0]) // 2, (side - im2.size[1]) // 2))
    return c.resize((size, size), Image.LANCZOS)

def write_asset(idn, im):
    meta = by_id.get(idn, {})
    kind = meta.get('kind') or ('bg' if idn.startswith('bg_') or idn == 'banner' else 'portrait' if idn.startswith('tk_') and 'token' not in idn and 'event' not in idn and not any(x in idn for x in ('gloves','gene','title','frame','bolt','pack')) else 'icon')
    size = meta.get('size') or ([1024, 576] if kind in ('banner', 'bg') else 512)
    dest = out / (idn + '.webp')
    if kind == 'icon':
        soft_icon(im, size if isinstance(size, int) else size[0]).save(dest, 'WEBP', quality=86, method=6)
    else:
        save_rgb(im, dest, size)
    print(idn, kind, dest.name)

src = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
ok = 0
for f in sorted(src.iterdir()):
    if f.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp') or f.name.startswith('.'):
        continue
    idn = f.stem
    im = Image.open(f)
    sheet_id = idn if idn in sheets else next((k for k, sh in sheets.items() if Path(sh.get("file") or k).stem == idn), None)
    if sheet_id:
        idn = sheet_id
    if idn in sheets:
        sh = sheets[idn]
        cols, rows = sh.get('grid', [4, 4])
        cells = sh.get('cells', [])
        w, h = im.size
        cw, ch = w // cols, h // rows
        for i, cid in enumerate(cells):
            if not cid: continue
            r, c = divmod(i, cols)
            write_asset(cid, im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)))
            ok += 1
    else:
        write_asset(idn, im); ok += 1
print(ok, 'files')
subprocess.run(['node', str(root / 'tools/tekken-art-index.js')], check=True)
