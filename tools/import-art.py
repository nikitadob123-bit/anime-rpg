#!/usr/bin/env python3
"""Импорт арта в assets/vn: <src>/<id>_<mood>.(png|jpg|jpeg|webp) -> assets/vn/<id>_<mood>.webp (бюст 720 px по высоте),
cg_*.png -> assets/vn/cg_*.webp (≤1280 px). Генерирует assets/vn/manifest.json.
Вырезание фона: tools/matte.py (нейро-маска + closed-form matting + defringe) — или готовая альфа, если исходник PNG с прозрачностью.
Геометрия лица (центр, ширина) для выравнивания голов и настроений: tools/geom.py. Запуск: tools/import-art.sh [папка]."""
import os, re, sys, json, hashlib
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/vn-art'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'vn')
os.makedirs(OUT, exist_ok=True)
EXT = ('.png', '.jpg', '.jpeg', '.webp')
PORT_H, CG_MAX, Q = 720, 1280, 88

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


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import matte; HAVE_MATTE = matte.available()
except Exception: HAVE_MATTE = False
try:
    import cv2; CASCADE = cv2.CascadeClassifier(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'lbpcascade_animeface.xml')); HAVE_FACE = not CASCADE.empty()
except Exception: HAVE_FACE = False
import geom
METHOD = 'm5' if HAVE_MATTE else 'k8'   # m3 — нейро-маска + closed-form matting + defringe; k8 — запасной chroma-ключ
OVERRIDES = {}
_ov = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'face-overrides.json')
if os.path.exists(_ov): OVERRIDES = json.load(open(_ov))

def has_alpha(im):
    if im.mode not in ('RGBA', 'LA'): return False
    a = np.asarray(im.getchannel('A')); return (a < 250).mean() > 0.05

def silhouette_estimate(alpha):
    """Запасная оценка лица по силуэту: (fx, fy, fw)."""
    a = np.asarray(alpha) > 127; h, w = a.shape
    est = 0.45 * float(np.sqrt(a.sum())); rows = np.where(a.sum(axis=1) > 6)[0]; top = int(rows[0]) if len(rows) else 0
    hb = a[top: top + max(30, int((h - top) * 0.3))]; ys, xs = np.where(hb)
    return (float(xs.mean()) if len(xs) else w / 2, top + 0.62 * est, est)

def detect_faces(rgb, alpha):
    """Допустимые детекции лица каскадом: [(cx, cy, w)] — центр в верхней части кадра, внутри силуэта, размер правдоподобен."""
    if not HAVE_FACE: return []
    a = np.asarray(alpha) > 127; h, w = a.shape; est = 0.45 * float(np.sqrt(a.sum())); out = []
    g = cv2.equalizeHist(cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2GRAY))
    for r in CASCADE.detectMultiScale(g, scaleFactor=1.05, minNeighbors=3, minSize=(60, 60)):
        x, y, ww, hh = [int(v) for v in r]
        if y + hh / 2 > h * 0.6 or not (0.65 * est <= ww <= 1.5 * est): continue
        if not a[min(h - 1, y + hh // 2), min(w - 1, x + ww // 2)]: continue
        out.append((x + ww / 2, y + hh / 2, float(ww)))
    return out

def soften_borders(im, side=90, top=60):
    """Персонаж, обрезанный краем исходного кадра (руки, плащ, волосы), даёт прямую «бумажную» кромку внутри экрана — плавно растворяем альфу у боковых/верхней границ там, где контент их касается."""
    a = np.asarray(im.convert('RGBA')).astype(np.float32); h, w = a.shape[:2]; al = a[..., 3] / 255.
    from scipy.ndimage import gaussian_filter1d
    def ramp(n, k): t = np.clip(np.arange(n) / float(k), 0, 1); return t * t * (3 - 2 * t)
    mult = np.ones((h, w), np.float32)
    for col, rev in ((0, False), (w - 1, True)):
        rows = gaussian_filter1d((al[:, col] > 0.3).astype(np.float32), 12)          # где контент касается края
        r = ramp(side, side); r = r[::-1] if rev else r
        prof = np.ones(w, np.float32); sl = slice(w - side, w) if rev else slice(0, side); prof[sl] = r
        mult *= 1 - rows[:, None] * (1 - prof[None, :])
    cols = gaussian_filter1d((al[0, :] > 0.3).astype(np.float32), 12)
    prof = np.ones(h, np.float32); prof[:top] = ramp(top, top); mult *= 1 - cols[None, :] * (1 - prof[:, None])
    a[..., 3] = np.clip(a[..., 3] * mult, 0, 255)
    return Image.fromarray(a.astype('uint8'), 'RGBA')

def cut_portrait(src, name):
    """-> (RGBA полного кадра | None, исходный RGB)"""
    raw = Image.open(src)
    if has_alpha(raw): return raw.convert('RGBA'), raw.convert('RGB')           # уже настоящий PNG с альфой — ничего не вырезаем
    rgb = raw.convert('RGB')
    if HAVE_MATTE:
        ck = os.path.join(ROOT, '.tmp', 'matte', name + '-%d-%d-%d.png' % (os.path.getsize(src), int(os.path.getmtime(src)), int(os.path.getmtime(matte.__file__))))
        if os.path.exists(ck): return Image.open(ck).convert('RGBA'), rgb
        k = matte.matte(rgb, name=name); os.makedirs(os.path.dirname(ck), exist_ok=True); k.save(ck); return k, rgb
    return (key_bg(rgb) or key_bg_grad(rgb) or key_bg_grad(rgb, 80, 34)), rgb

man_path = os.path.join(OUT, 'manifest.json')
old, olddim = {}, {}
if os.path.exists(man_path):
    try: _m = json.load(open(man_path)); old = _m.get('src', {}); olddim = _m.get('dim', {})
    except Exception: old = {}
portraits, cgs, srcs, DIMS, n_new = {}, {}, {}, {}, 0
files = []
for f in sorted(os.listdir(SRC)) if os.path.isdir(SRC) else []:
    name, ext = os.path.splitext(f); low = name.lower()
    if ext.lower() not in EXT or low.startswith('ref_'): continue
    cg = low.startswith('cg_')
    if not cg and not re.match(r'^[a-z0-9]+(_[a-z0-9]+)*_[a-z]+$', low): print('пропуск (имя):', f); continue
    p = os.path.join(SRC, f); files.append((low, p, cg, METHOD + '-%d-%d' % (os.path.getsize(p), int(os.path.getmtime(p)))))

# CG: просто в webp
for low, p, cg, sig in files:
    if not cg: continue
    out_name = low + '.webp'; dst = os.path.join(OUT, out_name); im = Image.open(p).convert('RGB'); w, h = im.size
    if old.get(out_name) != sig or not os.path.exists(dst):
        k = min(1.0, CG_MAX / max(w, h))
        if k < 1: im = im.resize((round(w * k), round(h * k)), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=80, method=6); n_new += 1; print('+', out_name)
        DIMS[out_name] = [im.size[0], im.size[1], 0]
    else: DIMS[out_name] = olddim.get(out_name) or [w, h, 0]
    srcs[out_name] = sig; cgs[low] = out_name

# Портреты, фаза A: вырезание (кэш в .tmp/matte)
CUT, RGB = {}, {}
for low, p, cg, sig in files:
    if cg: continue
    try: k, rgb = cut_portrait(p, low)
    except Exception as e: print('ОШИБКА', low, e); continue
    if k is None: print('не удалось вырезать', low); continue
    CUT[low], RGB[low] = k, rgb
# Фаза B: геометрия лиц по персонажам
GEOM, HOW = {}, {}
chars = {}
for low in CUT: chars.setdefault(low.rsplit('_', 1)[0], {})[low.rsplit('_', 1)[1]] = low
for cid, moods in chars.items():
    alphas = {mn: CUT[low].getchannel('A') for mn, low in moods.items()}
    if 'neutral' in moods:
        det = lambda mn, moods=moods: detect_faces(RGB[moods[mn]], alphas[mn])
        res, how, T = geom.solve(alphas, det, silhouette_estimate)
        for mn, low in moods.items():
            GEOM[low] = res[mn]; HOW[low] = how[mn] + ('' if T[mn][3] >= 0.99 and mn == 'neutral' else ' s=%.2f' % T[mn][0] if mn != 'neutral' else '')
    else:
        for mn, low in moods.items(): GEOM[low] = silhouette_estimate(alphas[mn]); HOW[low] = 'est'
for low in list(GEOM):
    if low in OVERRIDES: GEOM[low] = tuple(OVERRIDES[low]); HOW[low] = 'manual'
# Фаза C: кадрирование по X, продление вниз, сохранение
for low, p, cg, sig in files:
    if cg or low not in CUT: continue
    k = CUT[low]; fx, fy, fw = GEOM[low]; out_name = low + '.webp'; dst = os.path.join(OUT, out_name)
    bb = k.split()[3].point(lambda v: 255 if v > 10 else 0).getbbox()
    pad = max(6, int(0.02 * k.size[0])); x0 = max(0, bb[0] - pad) if bb else 0; x1 = min(k.size[0], bb[2] + pad) if bb else k.size[0]
    k = soften_borders(k); kk = k.crop((x0, 0, x1, k.size[1])); fx -= x0
    w, h = kk.size                      # без синтетического продления: низ бюста просто уходит под окно диалога (затухание — маской в CSS)
    dims = [w, h, 1, round(fx), round(fy), round(fw)]
    if old.get(out_name) != sig or not os.path.exists(dst) or olddim.get(out_name) != dims:
        kk.save(dst, 'WEBP', quality=Q, method=6, alpha_quality=100, exact=False); n_new += 1; print('+', out_name, os.path.getsize(dst) // 1024, 'KB', '|', HOW[low])
    DIMS[out_name] = dims; srcs[out_name] = sig
    cid, mood = low.rsplit('_', 1); portraits.setdefault(cid, {})[mood] = out_name
for f in os.listdir(OUT):
    if f.endswith('.webp') and f not in srcs: os.remove(os.path.join(OUT, f))
pre = sorted(list(cgs.values()) + [v['neutral'] for v in portraits.values() if 'neutral' in v])
ver = hashlib.md5(json.dumps([portraits, cgs, srcs, DIMS], sort_keys=True).encode()).hexdigest()[:8]
json.dump({'v': ver, 'portraits': portraits, 'cg': cgs, 'pre': pre, 'dim': DIMS, 'src': srcs}, open(man_path, 'w'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
cnt = sum(len(v) for v in portraits.values())
print('метод вырезания:', 'нейро-маска (isnet-anime) + closed-form matting + defringe' if HAVE_MATTE else 'запасной chroma-ключ', '| лица:', 'каскад + совмещение силуэтов' if HAVE_FACE else 'оценка по силуэту')
print('готово: портретов %d (персонажей %d), CG %d, новых/обновлённых %d, вес %d KB' % (cnt, len(portraits), len(cgs), n_new, sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) // 1024))
