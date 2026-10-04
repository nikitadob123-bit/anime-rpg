"""Качественное вырезание персонажа с серого/градиентного фона → RGBA с мягкой альфой и очищенным цветом (без серой каймы).
Метод: нейросеть isnet-anime (rembg, onnxruntime) даёт грубую маску → из неё строится trimap → closed-form matting (pymatting)
считает точную мягкую альфу (волосы, рога, крылья) → estimate_foreground_ml «вычитает» цвет фона из полупрозрачных краёв (defringe)
→ чистка островков/дыр. Зависимости: pip install "rembg[cpu]" (в venv: /workspace/.venv-matte). Модель ~/.u2net/isnet-anime.onnx."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

_sess = {}
def available():
    try:
        import rembg, pymatting  # noqa
        return True
    except Exception:
        return False

def _session(model):
    if model not in _sess:
        from rembg import new_session
        _sess[model] = new_session(model)
    return _sess[model]

def nn_mask(im, model='isnet-anime'):
    from rembg import remove
    return np.asarray(remove(im, session=_session(model), only_mask=True)).astype(np.float32) / 255.

def plausible(m, band=7):
    """Маска похожа на персонажа: умеренное покрытие, фон по бокам, есть уверенное ядро."""
    h, w = m.shape; cov = (m > 0.5).mean(); side = np.concatenate([m[: int(h * 0.75), :6].ravel(), m[: int(h * 0.75), -6:].ravel()])
    return 0.04 < cov < 0.9 and (side > 0.5).mean() < 0.45 and ndi.binary_erosion(m > 0.92, iterations=band).any()

MASK_DIR = __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), 'data', 'masks')
def prior_mask(name, size):
    """Готовая маска-подсказка tools/data/masks/<имя>.png (для кадров, где нейросети не справляются, напр. золотая аура вместо серого фона)."""
    import os
    p = os.path.join(MASK_DIR, (name or '') + '.png')
    if not name or not os.path.exists(p): return None
    mk = Image.open(p).convert('L')
    if mk.size != size: mk = mk.resize(size, Image.BILINEAR)
    return np.asarray(mk).astype(np.float32) / 255.

def pick_mask(im, band=7, name=None):
    pm = prior_mask(name, im.size)
    if pm is not None and plausible(pm, band): return pm, 'prior'
    for model in ('isnet-anime', 'u2net', 'birefnet-general-lite'):
        if model == 'birefnet-general-lite':
            _sess.clear(); import gc; gc.collect()          # тяжёлая модель — освобождаем память от лёгких сессий
        m = nn_mask(im, model)
        if plausible(m, band): return m, model
    km = key_mask(im)
    if km is not None and plausible(km, band): return km, 'key'
    raise RuntimeError('не удалось получить маску')

def key_mask(im):
    """Резервная маска: заливка от краёв по пикселям, похожим на гладкую модель фона (серый/градиент/виньетка). Возвращает float [0..1] или None."""
    from PIL import ImageDraw, ImageFilter
    w, h = im.size; a = np.asarray(im.convert('RGB')).astype(np.int32)
    sm = np.asarray(im.convert('RGB').filter(ImageFilter.GaussianBlur(1.6))).astype(np.int32)
    gx = np.abs(np.diff(sm, axis=1, prepend=sm[:, :1])).sum(2); gy = np.abs(np.diff(sm, axis=0, prepend=sm[:1])).sum(2); grad = np.maximum(gx, gy)
    lum = sm.mean(2); sat = sm.max(2) - sm.min(2)
    yy, xx = np.mgrid[0:h, 0:w]; xn, yn = xx / w, yy / h
    band = np.zeros((h, w), bool); band[:4, :] = True; band[: int(h * 0.75), :4] = True; band[: int(h * 0.75), -4:] = True
    B = np.stack([np.ones(band.sum()), xn[band], yn[band], xn[band] * yn[band], xn[band] ** 2, yn[band] ** 2], 1)
    co = np.linalg.lstsq(B, lum[band], rcond=None)[0]
    fit = co[0] + co[1] * xn + co[2] * yn + co[3] * xn * yn + co[4] * xn ** 2 + co[5] * yn ** 2
    for sat_max, dev in ((26, 20), (80, 34)):
        cand = (grad < 4.2) & (sat < sat_max) & (np.abs(lum - fit) < dev)
        lab, n = ndi.label(cand); seeds = set()
        for arr in (lab[0, :], lab[: int(h * 0.8), 0], lab[: int(h * 0.8), -1]): seeds |= set(np.unique(arr)) - {0}
        isbg = np.isin(lab, list(seeds))
        if 0.12 < isbg.mean() < 0.9: break
    else: return None
    fgm = ndi.median_filter((~isbg).astype(np.uint8) * 255, size=5) > 127
    return ndi.gaussian_filter(fgm.astype(np.float32), 1.0)

def bg_model(x, m):
    """Гладкая модель фона (квадр. поверхность по RGB по пикселям, которые нейросеть считает фоном) — для контроля/дефринджа."""
    h, w = m.shape; yy, xx = np.mgrid[0:h, 0:w]; xn, yn = xx / w, yy / h
    sel = (ndi.binary_erosion(m < 0.03, iterations=10)); sel[::2, :] = False; sel[:, ::2] = False
    if sel.sum() < 500: return None
    B = np.stack([np.ones(sel.sum()), xn[sel], yn[sel], xn[sel] * yn[sel], xn[sel] ** 2, yn[sel] ** 2], 1)
    Bf = np.stack([np.ones(h * w), xn.ravel(), yn.ravel(), (xn * yn).ravel(), (xn ** 2).ravel(), (yn ** 2).ravel()], 1)
    out = np.zeros((h, w, 3), np.float32)
    for c in range(3):
        co = np.linalg.lstsq(B, x[..., c][sel], rcond=None)[0]; out[..., c] = (Bf @ co).reshape(h, w)
    return out

def matte(im, band=7, effects=True, name=None):
    """RGBA-результат; matte.last — каким способом получена маска."""
    import pymatting
    im = im.convert('RGB'); x = np.asarray(im).astype(np.float64) / 255.
    m, how = pick_mask(im, band, name); matte.last = how
    # отбрасываем островки нейро-маски без связи с главным телом (мелочь) и заливаем дыры внутри силуэта, которые фоном не являются
    hard = m > 0.5
    lab, n = ndi.label(hard)
    if n > 1:
        sizes = ndi.sum(hard, lab, range(1, n + 1)); keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(400, sizes.max() * 0.004)])
        m = np.where(keep | ndi.binary_dilation(keep, iterations=6) & (m > 0.5), m, np.minimum(m, 0.0))
    fg = ndi.binary_erosion(m > 0.92, iterations=band)
    bgm = ndi.binary_erosion(m < 0.06, iterations=band + 3)
    # магические эффекты/дым: нейросеть их часто отбрасывает; добавляем в «неизвестную» зону пиксели, заметно отличающиеся по цвету
    # от гладкой модели фона и связанные с силуэтом — closed-form сам решит, какая там альфа
    eff = np.zeros(m.shape, bool)
    if effects:
        bgx = bg_model(x, m)
        if bgx is not None:
            d = np.sqrt(((x - bgx) ** 2).sum(axis=2)); mx, mn = x.max(2), x.min(2); sat = (mx - mn) / (mx + 1e-3)
            bsat = (bgx.max(2) - bgx.min(2)) / (bgx.max(2) + 1e-3)
            cand = ndi.binary_opening((d > 0.16) & (sat - bsat > 0.12), iterations=1)
            cand = ndi.binary_closing(cand, iterations=2)
            lab, n = ndi.label(cand | (m > 0.3))
            main = np.unique(lab[m > 0.5]); main = main[main > 0]
            eff = np.isin(lab, main) & cand & ~(m > 0.3) & ndi.binary_dilation(m > 0.3, iterations=90)
            eff = ndi.binary_dilation(eff, iterations=3) & ~fg
    tri = np.full(m.shape, 0.5); tri[fg] = 1.0; tri[bgm & ~eff] = 0.0
    alpha = pymatting.estimate_alpha_cf(x, tri, laplacian_kwargs={'epsilon': 1e-6}, cg_kwargs={'maxiter': 2000})
    alpha = np.clip(alpha, 0, 1)
    # хвосты: далеко от силуэта нейросети альфа обнуляется, внутри уверенного ядра — 1
    near = ndi.binary_dilation(m > 0.04, iterations=band + 4) | eff
    alpha = np.where(near, alpha, 0); alpha[fg] = 1.0
    alpha[alpha < 0.03] = 0
    # мелкие островки альфы (пыль от матирования)
    lab, n = ndi.label(alpha > 0.15)
    if n > 1:
        sizes = ndi.sum(alpha > 0.15, lab, range(1, n + 1)); small = [i + 1 for i, s in enumerate(sizes) if s < 60]
        if small: alpha[np.isin(lab, small)] = 0
    F = pymatting.estimate_foreground_ml(x, alpha)
    F = np.clip(F, 0, 1)
    out = np.dstack([F, alpha]); return Image.fromarray(np.round(out * 255).astype('uint8'), 'RGBA')
