"""Геометрия персонажа: центр лица и ширина лица для каждого настроения.
Настроения одного персонажа генерировались «в той же рамке», но иногда кадр немного уезжал — поэтому:
 1) относительный масштаб/сдвиг каждого настроения к neutral находится совмещением силуэтов (регистрация по альфа-маске; если кадр совпал — тождество);
 2) абсолютный размер лица берётся консенсусом (медиана) каскада lbpcascade_animeface по всем настроениям, приведённым к масштабу neutral;
 3) если лицо не нашлось нигде (sub_*) — оценка по силуэту.
Результат: (fx, fy, fw) для каждого изображения в его собственных пикселях."""
import numpy as np
from PIL import Image

def _small(a, f=4):
    im = Image.fromarray(((a > 127) * 255).astype('uint8'))
    return np.asarray(im.resize((a.shape[1] // f, a.shape[0] // f), Image.BOX)) > 100

def _iou_shift(a, b_img, s, dx, dy):
    w = max(1, round(b_img.width * s)); h = max(1, round(b_img.height * s))
    bb = np.asarray(b_img.resize((w, h), Image.BILINEAR)) > 127
    canvas = np.zeros_like(a)
    y0, x0 = max(0, dy), max(0, dx); y1, x1 = min(a.shape[0], dy + h), min(a.shape[1], dx + w)
    if y1 <= y0 or x1 <= x0: return 0.0
    canvas[y0:y1, x0:x1] = bb[y0 - dy: y1 - dy, x0 - dx: x1 - dx]
    return (canvas & a).sum() / max(1, (canvas | a).sum())

def register(alpha_n, alpha_m):
    """Находит (s, tx, ty, iou): точка p в изображении настроения → p' = s*p + t в системе neutral. Работает на уменьшенных масках в 2 прохода."""
    f = 4
    an = _small(np.asarray(alpha_n), f); im_m = Image.fromarray(((_small(np.asarray(alpha_m), f)) * 255).astype('uint8'))
    best = (0, 1.0, 0, 0)
    for s in np.arange(0.62, 1.7, 0.04):
        for dx in range(-60, 61, 6):
            for dy in range(-60, 61, 6):
                v = _iou_shift(an, im_m, s, dx, dy)
                if v > best[0]: best = (v, s, dx, dy)
    v0, s0, dx0, dy0 = best
    for s in np.arange(s0 - 0.04, s0 + 0.041, 0.01):
        for dx in range(dx0 - 6, dx0 + 7, 2):
            for dy in range(dy0 - 6, dy0 + 7, 2):
                v = _iou_shift(an, im_m, s, dx, dy)
                if v > best[0]: best = (v, s, dx, dy)
    v, s, dx, dy = best
    return float(s), float(dx * f), float(dy * f), float(v)

def solve(items, detect, estimate):
    """items: {name: alpha(L)} одного персонажа, ключ 'neutral' обязателен. detect(name) -> [(cx, cy, w)...] допустимые детекции.
    estimate(alpha)->(fx,fy,fw) запасная оценка. Возвращает {name: (fx, fy, fw)} и {name: 'face'|'est'|'reg'} для отчёта."""
    ref = items['neutral']; T = {'neutral': (1.0, 0.0, 0.0, 1.0)}
    for n, a in items.items():
        if n == 'neutral': continue
        s, tx, ty, iou = register(ref, a)
        if iou < 0.75 or abs(np.log(s)) < 0.07 and abs(tx) < 40 and abs(ty) < 40:
            s, tx, ty = 1.0, 0.0, 0.0     # кадр совпал (или регистрация ненадёжна) — тождество
        T[n] = (s, tx, ty, iou)
    # консенсус по лицу в системе neutral
    cands = []
    for n in items:
        s, tx, ty, _ = T[n]
        for (cx, cy, w) in detect(n): cands.append((s * cx + tx, s * cy + ty, s * w, n))
    out, how = {}, {}
    if cands:
        fxn = float(np.median([c[0] for c in cands])); fyn = float(np.median([c[1] for c in cands])); fwn = float(np.median([c[2] for c in cands]))
        for n in items:
            s, tx, ty, _ = T[n]; out[n] = ((fxn - tx) / s, (fyn - ty) / s, fwn / s); how[n] = 'face+reg'
    else:
        fxn, fyn, fwn = estimate(ref)
        for n in items:
            s, tx, ty, _ = T[n]; out[n] = ((fxn - tx) / s, (fyn - ty) / s, fwn / s); how[n] = 'est'
    return out, how, T
