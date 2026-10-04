"""Метрики качества вырезания: доля краевых пикселей, цвет которых ≈ цвету исходного серого фона (остатки каймы), и покрытие насыщенных (эффекты) пикселей."""
import sys, numpy as np
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__file__))
import matte
def metrics(src, rgba):
    x = np.asarray(src.convert('RGB')).astype(np.float64) / 255.; o = np.asarray(rgba).astype(np.float64) / 255.
    a = o[..., 3]; F = o[..., :3]
    m = (a > 0.5).astype(np.float32); bgx = matte.bg_model(x, m)
    edge = (a > 0.05) & (a < 0.95)
    d = np.sqrt(((F - bgx) ** 2).sum(2))
    resid = float(((d < 0.07) & edge).sum() / max(1, edge.sum()))
    mx, mn = x.max(2), x.min(2); sat = (mx - mn) / (mx + 1e-3); bsat = (bgx.max(2) - bgx.min(2)) / (bgx.max(2) + 1e-3)
    dx = np.sqrt(((x - bgx) ** 2).sum(2)); eff = (dx > 0.2) & (sat - bsat > 0.25)
    cov = float((a[eff] > 0.4).mean()) if eff.sum() > 200 else 1.0
    return dict(edge_px=int(edge.sum()), resid=round(resid, 3), eff_px=int(eff.sum()), eff_cov=round(cov, 3), alpha_mean=round(float(a.mean()), 3), top_alpha=round(float(a[:3].mean()), 3))
if __name__ == '__main__':
    for n in sys.argv[1:]:
        print(n, metrics(Image.open(f'/workspace/vn-art/{n}.jpg'), Image.open(f'/workspace/matte-test/{n}_cut.png')))
