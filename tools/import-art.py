#!/usr/bin/env python3
"""Импорт арта в assets/vn: <src>/<id>_<mood>.(png|jpg|jpeg|webp) -> assets/vn/<id>_<mood>.webp (≈560 px по короткой стороне),
cg_*.png -> assets/vn/cg_*.webp (≤1280 px). Генерирует assets/vn/manifest.json. Повторный запуск пропускает неизменённые файлы."""
import os, re, sys, json, hashlib
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/vn-art'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'vn')
os.makedirs(OUT, exist_ok=True)
EXT = ('.png', '.jpg', '.jpeg', '.webp')
PORT_H, CG_MAX, Q = 720, 1280, 80

def key_bg(im, thresh=48):
    """Вырезает однотонный светло-серый фон (заливка от краёв). Возвращает RGBA или None, если фон не однотонный."""
    w, h = im.size
    a = np.array(im).astype(int)
    border = np.concatenate([a[0, :], a[:, 0], a[:, -1]])
    bg = tuple(int(x) for x in np.median(border, axis=0))
    if min(bg) < 150: return None
    work = im.copy(); mark = (255, 0, 255)
    seeds = [(x, 0) for x in range(0, w, 40)] + [(0, y) for y in range(0, h, 40)] + [(w - 1, y) for y in range(0, h, 40)]
    for sd in seeds:
        px = work.getpixel(sd)
        if px == mark: continue
        if sum(abs(px[i] - bg[i]) for i in range(3)) < thresh: ImageDraw.floodfill(work, sd, mark, thresh=thresh)
    m = np.array(work); isbg = (m[:, :, 0] == 255) & (m[:, :, 1] == 0) & (m[:, :, 2] == 255)
    if isbg.mean() < 0.12 or isbg.mean() > 0.9: return None
    alpha = Image.fromarray(np.where(isbg, 0, 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    out = im.convert('RGBA'); out.putalpha(alpha); return out

def key_bg_grad(im, sat_max=26, dev=20):
    """Фон-градиент (тёмный/виньетка): заливка от краёв по пикселям с малым градиентом, низкой насыщенностью и яркостью в диапазоне фона."""
    w, h = im.size
    a = np.array(im).astype(int)
    sm = np.array(im.filter(ImageFilter.GaussianBlur(1.6))).astype(int)
    gx = np.abs(np.diff(sm, axis=1, prepend=sm[:, :1])).sum(axis=2); gy = np.abs(np.diff(sm, axis=0, prepend=sm[:1])).sum(axis=2)
    grad = np.maximum(gx, gy)
    lum = sm.mean(axis=2); sat = sm.max(axis=2) - sm.min(axis=2)
    # поверхность фона: квадратичная аппроксимация яркости по краевой полосе
    yy, xx = np.mgrid[0:h, 0:w]; xn, yn = xx / w, yy / h
    band = np.zeros((h, w), bool); band[:4, :] = True; band[: int(h * 0.75), :4] = True; band[: int(h * 0.75), -4:] = True
    B = np.stack([np.ones(band.sum()), xn[band], yn[band], xn[band] * yn[band], xn[band] ** 2, yn[band] ** 2], 1)
    coef = np.linalg.lstsq(B, lum[band], rcond=None)[0]
    fit = coef[0] + coef[1] * xn + coef[2] * yn + coef[3] * xn * yn + coef[4] * xn ** 2 + coef[5] * yn ** 2
    cand = (grad < 4.2) & (sat < sat_max) & (np.abs(lum - fit) < dev)
    img = Image.fromarray(np.where(cand, 255, 0).astype('uint8')).convert('RGB')
    for sd in [(x, 0) for x in range(0, w, 24)] + [(0, y) for y in range(0, int(h * 0.8), 24)] + [(w - 1, y) for y in range(0, int(h * 0.8), 24)]:
        if img.getpixel(sd) == (255, 255, 255): ImageDraw.floodfill(img, sd, (255, 0, 255))
    isbg = (np.array(img)[:, :, 1] == 0) & (np.array(img)[:, :, 0] == 255)
    if isbg.mean() < 0.12 or isbg.mean() > 0.9: return None
    alpha = Image.fromarray(np.where(isbg, 0, 255).astype('uint8')).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.3))
    out = im.convert('RGBA'); out.putalpha(alpha); return out

DIMS = {}
def convert(src, dst, cg):
    im = Image.open(src).convert('RGB'); keyed = False
    if not cg:
        k = key_bg(im) or key_bg_grad(im) or key_bg_grad(im, 80, 34)
        if k is not None:
            keyed = True; bb = k.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
            if bb:
                pad = int(0.02 * im.size[0]); bb = (max(0, bb[0] - pad), 0, min(im.size[0], bb[2] + pad), im.size[1]); im = k.crop(bb)
            else: im = k
    w, h = im.size
    k = min(1.0, (CG_MAX / max(w, h)) if cg else (PORT_H / h))
    if k < 1: im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=Q, method=6, alpha_quality=88)
    DIMS[os.path.basename(dst)] = [im.size[0], im.size[1], 1 if keyed else 0]
    return im.size

man_path = os.path.join(OUT, 'manifest.json')
old, olddim = {}, {}
if os.path.exists(man_path):
    try: _m = json.load(open(man_path)); old = _m.get('src', {}); olddim = _m.get('dim', {})
    except Exception: old = {}
portraits, cgs, srcs, n_new = {}, {}, {}, 0
for f in sorted(os.listdir(SRC)) if os.path.isdir(SRC) else []:
    name, ext = os.path.splitext(f)
    if ext.lower() not in EXT: continue
    low = name.lower()
    if low.startswith('ref_'): continue
    p = os.path.join(SRC, f)
    sig = 'k6-%d-%d' % (os.path.getsize(p), int(os.path.getmtime(p)))
    cg = low.startswith('cg_')
    if not cg and not re.match(r'^[a-z0-9]+(_[a-z0-9]+)*_[a-z]+$', low):
        print('пропуск (имя):', f); continue
    out_name = low + '.webp'; dst = os.path.join(OUT, out_name)
    if old.get(out_name) != sig or not os.path.exists(dst):
        try: convert(p, dst, cg); n_new += 1; print('+', out_name, os.path.getsize(dst) // 1024, 'KB')
        except Exception as e: print('ОШИБКА', f, e); continue
    srcs[out_name] = sig
    if out_name not in DIMS and out_name in olddim: DIMS[out_name] = olddim[out_name]
    if cg: cgs[low] = out_name
    else:
        cid, mood = low.rsplit('_', 1); portraits.setdefault(cid, {})[mood] = out_name
# удаляем webp, которых больше нет в источнике
for f in os.listdir(OUT):
    if f.endswith('.webp') and f not in srcs: os.remove(os.path.join(OUT, f))
pre = sorted(list(cgs.values()) + [v['neutral'] for v in portraits.values() if 'neutral' in v])
ver = hashlib.md5(json.dumps([portraits, cgs, srcs], sort_keys=True).encode()).hexdigest()[:8]
json.dump({'v': ver, 'portraits': portraits, 'cg': cgs, 'pre': pre, 'dim': DIMS, 'src': srcs}, open(man_path, 'w'), ensure_ascii=False, indent=1, sort_keys=True)
cnt = sum(len(v) for v in portraits.values())
print('готово: портретов %d (персонажей %d), CG %d, новых/обновлённых %d, вес %d KB' % (cnt, len(portraits), len(cgs), n_new, sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) // 1024))
