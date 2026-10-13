#!/usr/bin/env python3
"""Процедурные иконки пользовательского ремесла (v2.15): 200 штук, аниме-стиль игровых иконок —
чистый силуэт, цел-шейдинг (свет/тень полутонами), тёмный контур, свечение и рамка по редкости 0…7.
Выход: assets/craft/icons.webp (атлас 20×10 по 128 px) и js/data-craft-icons.js (группа/редкость/имя каждой иконки).
Детерминированно (seed по индексу). Без внешних API.  python3 tools/make-craft-icons.py [--sheet out.jpg]"""
import math, random, sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

S = 512          # холст рисования (супер-сэмплинг ×4)
YS, XS = np.mgrid[0:S, 0:S].astype(np.float32)
OUT = 128
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RAR = ['#b8bcc8', '#6ee08a', '#5aa8ff', '#3fe6d2', '#c27aff', '#ffb23a', '#ff3b5c', '#fff1c4']
RAR_GLOW = ['#9aa0b0', '#6ee08a', '#5aa8ff', '#3fe6d2', '#c27aff', '#ffb23a', '#ff3b5c', '#ffd66e']

def hx(c, a=255):
    c = c.lstrip('#'); return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)

# материалы: (основа, свет, тень)
M = {
    'iron': ('#7d828c', '#c3c8d2', '#454950'), 'steel': ('#9aa7b8', '#eef4fb', '#566174'), 'silver': ('#c4d0e2', '#ffffff', '#76839a'),
    'gold': ('#e0ac42', '#fff0a6', '#93631a'), 'bronze': ('#bd7a40', '#f2b57c', '#74431f'), 'obsid': ('#3d3654', '#857aae', '#1b1728'),
    'crim': ('#b9304a', '#ff8c9c', '#661225'), 'jade': ('#36b296', '#aaf7df', '#195f50'), 'azure': ('#4a7fd6', '#b0d0ff', '#22468a'),
    'void': ('#5c3fae', '#b9a0ff', '#2a185c'), 'holy': ('#fff3d2', '#ffffff', '#d2ae62'), 'rose': ('#e07aa8', '#ffd0e6', '#8a3a62'),
    'wood': ('#8a5a34', '#c88f5c', '#4b2e18'), 'dwood': ('#5a3a2a', '#916649', '#2b1b11'), 'bone': ('#e2d6b8', '#fffaea', '#9a8a68'),
    'leath': ('#8e5a3a', '#cc8e66', '#4f2e17'), 'dleath': ('#5d4a3e', '#927a69', '#30261e'),
    'c_red': ('#a8323e', '#ea7078', '#5a1520'), 'c_blue': ('#2f4f9a', '#7395e6', '#172857'), 'c_pur': ('#6a3a9a', '#ad80e6', '#371b5c'),
    'c_grn': ('#2f7a4a', '#70d290', '#163f27'), 'c_wht': ('#d6d6e6', '#ffffff', '#8c8ca6'), 'c_blk': ('#2e2a3a', '#5e5876', '#141120'),
    'ruby': ('#e8203c', '#ffa0ae', '#760a1c'), 'saph': ('#2a6cff', '#b0ceff', '#0e2a7a'), 'emer': ('#16c060', '#a0ffc4', '#0a5a2a'),
    'amet': ('#a040ff', '#e4b6ff', '#48147a'), 'topaz': ('#ffb020', '#ffeaa8', '#8a5800'), 'diam': ('#d4f4ff', '#ffffff', '#78aec8'),
    'aqua': ('#20d6d0', '#b8fffb', '#0a6a6a'),
}
GEMS = ['ruby', 'saph', 'emer', 'amet', 'topaz', 'aqua', 'diam']
LINE = (18, 10, 28, 255)

def tier_mats(r, rnd):
    """металл/отделка/камень по редкости: обычные — железо/дерево, высокие — золото, цветные сплавы, бриллиант"""
    if r <= 0: return rnd.choice(['iron', 'iron', 'steel', 'bronze']), rnd.choice(['wood', 'dwood', 'leath']), None
    if r == 1: return rnd.choice(['steel', 'iron', 'bronze']), rnd.choice(['wood', 'leath', 'bronze']), rnd.choice([None, 'emer'])
    if r == 2: return rnd.choice(['steel', 'silver']), rnd.choice(['bronze', 'leath', 'azure']), rnd.choice(['saph', 'aqua', 'emer'])
    if r == 3: return rnd.choice(['silver', 'steel', 'jade']), rnd.choice(['gold', 'jade', 'azure']), rnd.choice(['aqua', 'emer', 'saph'])
    if r == 4: return rnd.choice(['silver', 'void', 'obsid']), rnd.choice(['gold', 'void', 'silver']), rnd.choice(['amet', 'amet', 'rose' if False else 'saph'])
    if r == 5: return rnd.choice(['gold', 'silver', 'steel']), rnd.choice(['gold', 'crim', 'gold']), rnd.choice(['topaz', 'ruby', 'topaz'])
    if r == 6: return rnd.choice(['crim', 'obsid', 'silver']), rnd.choice(['gold', 'crim', 'obsid']), rnd.choice(['ruby', 'ruby', 'amet'])
    return rnd.choice(['holy', 'silver', 'holy']), 'gold', rnd.choice(['diam', 'topaz', 'diam'])

# ───── маски и цел-шейдинг ─────
def mask_poly(pts):
    m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in pts], fill=255); return m
def mask_ell(cx, cy, rx, ry):
    m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255); return m
def mask_ring(cx, cy, rx, ry, w):
    m = mask_ell(cx, cy, rx, ry); return ImageChops.subtract(m, mask_ell(cx, cy, rx - w, ry - w))
def mask_rect(x0, y0, x1, y1, rad=0):
    m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).rounded_rectangle([x0, y0, x1, y1], radius=rad, fill=255); return m
def mask_line(pts, w):
    m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).line(pts, fill=255, width=int(w), joint='curve')
    for p in (pts[0], pts[-1]): ImageDraw.Draw(m).ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=255)
    return m
def shift(m, dx, dy): return ImageChops.offset(m, int(dx), int(dy))
def band(m, a, b): return ImageChops.multiply(m, b) if a is None else ImageChops.multiply(a, b)
def inv(m): return ImageChops.invert(m)
def dil(m, r): return m.filter(ImageFilter.MaxFilter(2 * int(r) + 1)) if r > 0 else m
def halfplane(cx, cy, ang):
    """маска полуплоскости «слева» от оси через (cx,cy) с направлением ang (рад) — освещённая сторона"""
    nx, ny = math.cos(ang - math.pi / 2), math.sin(ang - math.pi / 2)
    v = ((XS - cx) * nx + (YS - cy) * ny) > 0
    return Image.fromarray((v * 255).astype(np.uint8))

class Layer:
    def __init__(self):
        self.img = Image.new('RGBA', (S, S), (0, 0, 0, 0)); self.union = Image.new('L', (S, S), 0)
    def fill(self, m, col):
        self.img.paste(Image.new('RGBA', (S, S), hx(col) if isinstance(col, str) else col), (0, 0), m)
    def part(self, m, mat, split=None, line=5, rim=10, gloss=True):
        base, lt, dk = M[mat] if isinstance(mat, str) else mat
        self.fill(ImageChops.subtract(dil(m, line), m), LINE)            # контур детали
        self.fill(m, base)
        if split is not None:                                               # светлая половина (цел-шейдинг)
            self.fill(ImageChops.multiply(m, halfplane(*split)), blend(base, lt, 0.55))
        self.fill(ImageChops.multiply(m, inv(shift(m, -rim, -rim))), dk)    # тень у нижне-правого края
        if gloss: self.fill(ImageChops.multiply(m, inv(shift(m, rim * 0.45, rim * 0.45))), lt)  # блик у верхне-левого края
        self.union = ImageChops.lighter(self.union, dil(m, line))
    def line(self, pts, w, col):
        m = mask_line(pts, w); self.fill(m, col); return m

def blend(a, b, t):
    A, B = hx(a), hx(b); return tuple(int(A[i] + (B[i] - A[i]) * t) for i in range(3)) + (255,)

def gem(L, cx, cy, r, kind, cut='round'):
    if cut == 'round': m = mask_ell(cx, cy, r, r)
    elif cut == 'oval': m = mask_ell(cx, cy, r * 0.75, r)
    else: m = mask_poly([(cx, cy - r), (cx + r * 0.8, cy), (cx, cy + r), (cx - r * 0.8, cy)])
    L.part(m, kind, split=(cx, cy, math.pi * 0.75), line=4, rim=max(3, r * 0.35))
    L.fill(mask_ell(cx - r * 0.35, cy - r * 0.35, r * 0.22, r * 0.18), (255, 255, 255, 235))

def sparkle(L, cx, cy, s, col=(255, 255, 255, 255)):
    L.fill(mask_poly([(cx, cy - s), (cx + s * 0.22, cy - s * 0.22), (cx + s, cy), (cx + s * 0.22, cy + s * 0.22), (cx, cy + s), (cx - s * 0.22, cy + s * 0.22), (cx - s, cy), (cx - s * 0.22, cy - s * 0.22)]), col)

# ───── формы (вертикально, остриём вверх; центр 256,256) ─────
def blade_pts(kind, top, bot, w, rnd):
    cx = 256; pts = []
    if kind == 'straight': return [(cx, top), (cx + w, top + w * 2.2), (cx + w, bot), (cx - w, bot), (cx - w, top + w * 2.2)]
    if kind == 'broad': return [(cx, top), (cx + w * 1.35, top + w * 1.4), (cx + w * 1.15, bot - 30), (cx + w * 1.4, bot), (cx - w * 1.4, bot), (cx - w * 1.15, bot - 30), (cx - w * 1.35, top + w * 1.4)]
    if kind == 'leaf':
        n = 14; L_ = []; R_ = []
        for i in range(n + 1):
            t = i / n; y = top + (bot - top) * t; ww = w * (0.15 + 1.35 * math.sin(math.pi * min(1, t * 0.95 + 0.05)) ** 0.8) if t < 0.92 else w * 0.75
            L_.append((cx - ww, y)); R_.append((cx + ww, y))
        return [(cx, top - 6)] + R_ + L_[::-1]
    if kind == 'curve':      # катана: изгиб
        n = 16; A = []; B = []
        for i in range(n + 1):
            t = i / n; y = top + (bot - top) * t; off = 38 * (1 - t) ** 2; ww = w * (0.35 + 0.65 * min(1, t * 5))
            A.append((cx + off + ww * 0.55, y)); B.append((cx + off - ww * 0.75, y))
        return [(cx + 40, top - 4)] + A + B[::-1]
    if kind == 'wave':       # фламберг
        n = 22; A = []; B = []
        for i in range(n + 1):
            t = i / n; y = top + w * 2 + (bot - top - w * 2) * t; s = math.sin(t * math.pi * 6) * w * 0.28
            A.append((cx + w + s, y)); B.append((cx - w + s, y))
        return [(cx, top)] + A + B[::-1]
    if kind == 'jag':        # зазубренный
        pts = [(cx, top)]; n = 7
        for i in range(n):
            y = top + w * 2 + (bot - top - w * 2) * i / n
            pts += [(cx + w, y), (cx + w * 1.45, y + (bot - top) / n * 0.4)]
        pts += [(cx + w, bot), (cx - w, bot), (cx - w, top + w * 2)]
        return pts
    return blade_pts('straight', top, bot, w, rnd)

def draw_sword(L, r, rnd, dagger=False):
    met, trim, gm = tier_mats(r, rnd)
    kinds = ['straight', 'broad', 'leaf', 'curve', 'wave', 'jag'] if not dagger else ['straight', 'leaf', 'curve', 'jag']
    kind = rnd.choice(kinds[:2 + min(len(kinds) - 2, r)])
    top, bot = (70, 330) if not dagger else (140, 320); w = rnd.uniform(20, 28) if not dagger else rnd.uniform(18, 26)
    bm = mask_poly(blade_pts(kind, top, bot, w, rnd))
    L.part(bm, met, split=(256, 200, -math.pi / 2), rim=11)
    if r >= 3: L.fill(mask_line([(256, top + 50), (256, bot - 20)], 5 + (r >= 6) * 3), blend(M[met][1], RAR_GLOW[r], 0.6))  # дол/руна
    # гарда
    gw = rnd.uniform(60, 92) + r * 4; gk = rnd.choice(['bar', 'cross', 'wing', 'cres'][:2 + (r >= 3) + (r >= 5)])
    gy = bot + 6
    if gk == 'bar': gp = mask_rect(256 - gw, gy - 12, 256 + gw, gy + 14, 10)
    elif gk == 'cross': gp = mask_poly([(256 - gw, gy - 4), (256 - gw * 0.4, gy - 16), (256, gy - 22), (256 + gw * 0.4, gy - 16), (256 + gw, gy - 4), (256 + gw * 0.5, gy + 16), (256 - gw * 0.5, gy + 16)])
    elif gk == 'wing': gp = mask_poly([(256 - gw, gy - 40), (256 - gw * 0.5, gy - 8), (256, gy - 14), (256 + gw * 0.5, gy - 8), (256 + gw, gy - 40), (256 + gw * 0.6, gy + 18), (256, gy + 14), (256 - gw * 0.6, gy + 18)])
    else: gp = ImageChops.subtract(mask_ell(256, gy + 30, gw, 46), mask_ell(256, gy + 52, gw * 0.85, 46))
    L.part(gp, trim if r >= 2 else met, split=(256, gy, 0), rim=7)
    hl = 70 if not dagger else 56
    L.part(mask_rect(244, gy + 14, 268, gy + 14 + hl, 6), rnd.choice(['leath', 'dleath', 'c_red', 'c_blue']) if r < 5 else rnd.choice(['c_red', 'c_pur', 'c_blk']), split=(256, gy + 40, -math.pi / 2), rim=5)
    for i in range(3): L.fill(mask_rect(244, gy + 26 + i * 18, 268, gy + 30 + i * 18, 2), LINE)
    py = gy + 14 + hl + 14
    L.part(mask_ell(256, py, 20, 18), trim if r >= 1 else met, split=(256, py, math.pi * 0.75), rim=6)
    if gm: gem(L, 256, gy + 1, 11 + r, gm, 'diamond' if r >= 4 else 'round'); gem(L, 256, py, 8, gm) if r >= 3 else None

def draw_axe(L, r, rnd):
    met, trim, gm = tier_mats(r, rnd)
    L.part(mask_rect(244, 90, 268, 440, 8), 'wood' if r < 3 else ('dwood' if r < 6 else 'obsid'), split=(256, 260, -math.pi / 2), rim=6)
    double = rnd.random() < 0.35 + r * 0.06; kind = rnd.choice(['cres', 'beard', 'broad'])
    def head(sgn):
        x0 = 256 + sgn * 12
        if kind == 'cres': pts = [(x0, 110), (x0 + sgn * 70, 80), (x0 + sgn * 128, 120), (x0 + sgn * 140, 175), (x0 + sgn * 125, 235), (x0 + sgn * 70, 260), (x0, 220)]
        elif kind == 'beard': pts = [(x0, 120), (x0 + sgn * 90, 110), (x0 + sgn * 120, 150), (x0 + sgn * 128, 250), (x0 + sgn * 90, 290), (x0 + sgn * 70, 200), (x0, 190)]
        else: pts = [(x0, 105), (x0 + sgn * 110, 70), (x0 + sgn * 120, 160), (x0 + sgn * 110, 255), (x0, 225)]
        L.part(mask_poly(pts), met, split=(256 + sgn * 70, 170, -math.pi / 2 if sgn > 0 else math.pi / 2), rim=10)
        L.fill(mask_poly([(x0 + sgn * 6, 140), (x0 + sgn * 22, 140), (x0 + sgn * 22, 200), (x0 + sgn * 6, 200)]), M[trim if r >= 2 else met][2])
    head(1)
    if double: head(-1)
    L.part(mask_rect(236, 120, 276, 220, 8), trim if r >= 2 else met, split=(256, 170, 0), rim=6)
    L.part(mask_poly([(256, 40), (272, 96), (240, 96)]), met, rim=5)
    L.part(mask_ell(256, 446, 20, 16), trim, rim=5)
    if gm: gem(L, 256, 170, 12 + r, gm, 'diamond' if r >= 5 else 'round')

def draw_staff(L, r, rnd, wand=False):
    met, trim, gm = tier_mats(r, rnd)
    top, bot = (110, 460) if not wand else (190, 420)
    wood = 'wood' if r < 2 else rnd.choice(['dwood', 'wood', 'bone']) if r < 5 else rnd.choice(['obsid', 'holy', 'dwood', 'bone'])
    if not wand and rnd.random() < 0.5:   # витой посох
        pts = [(256 + math.sin(t / 30) * 6, t) for t in range(top, bot, 6)]
        L.part(mask_line(pts, 22), wood, split=(256, 300, -math.pi / 2), rim=5)
    else: L.part(mask_rect(245, top, 267, bot, 9), wood, split=(256, 300, -math.pi / 2), rim=5)
    for y in ([top + 40, bot - 50] if not wand else [top + 30]): L.part(mask_rect(240, y, 272, y + 14, 4), trim if r >= 1 else met, rim=4)
    kind = rnd.choice(['orb', 'prong', 'cres', 'ring', 'crystal'][:2 + min(3, r)]) if not wand else rnd.choice(['star', 'orb', 'crystal', 'cres'][:1 + min(3, r)])
    cy = top - (40 if not wand else 30); gk = gm or rnd.choice(['saph', 'emer'])
    if kind == 'orb':
        L.part(mask_poly([(232, top + 10), (280, top + 10), (300, top - 30), (256, top - 6), (212, top - 30)]), trim if r >= 1 else met, rim=5)
        gem(L, 256, cy - 10, 38 if not wand else 28, gk)
    elif kind == 'prong':
        for s in (-1, 1): L.part(mask_poly([(256, top + 14), (256 + s * 14, top), (256 + s * 60, top - 70), (256 + s * 40, top - 110), (256 + s * 46, top - 70)]), met, rim=5)
        gem(L, 256, top - 60, 32, gk, 'oval')
    elif kind == 'cres':
        L.part(ImageChops.subtract(mask_ell(256, cy - 10, 70, 70), mask_ell(280, cy - 30, 62, 62)), trim, split=(256, cy, math.pi * 0.75), rim=8)
        gem(L, 246, cy + 6, 20, gk)
    elif kind == 'ring':
        L.part(mask_ring(256, cy - 20, 66, 66, 16), trim, split=(256, cy, math.pi * 0.75), rim=6)
        gem(L, 256, cy - 20, 26, gk, 'diamond')
        for a in range(0, 360, 60): L.part(mask_ell(256 + 66 * math.cos(math.radians(a)), cy - 20 + 66 * math.sin(math.radians(a)), 8, 8), trim, rim=3)
    elif kind == 'star':
        s = 64; pts = []
        for i in range(10):
            a = -math.pi / 2 + i * math.pi / 5; rr = s if i % 2 == 0 else s * 0.45; pts.append((256 + rr * math.cos(a), cy + rr * math.sin(a)))
        L.part(mask_poly(pts), trim if r >= 1 else 'gold', split=(256, cy, math.pi * 0.75), rim=8); gem(L, 256, cy, 14, gk)
    else:
        L.part(mask_poly([(256, cy - 90), (296, cy - 10), (276, cy + 40), (236, cy + 40), (216, cy - 10)]), gk, split=(256, cy, -math.pi / 2), rim=9)
        L.fill(mask_poly([(256, cy - 80), (266, cy - 10), (256, cy + 30), (246, cy - 10)]), (255, 255, 255, 140))
        L.part(mask_poly([(226, cy + 30), (286, cy + 30), (266, cy + 60), (246, cy + 60)]), trim if r >= 1 else met, rim=4)

def draw_shield(L, r, rnd):
    met, trim, gm = tier_mats(r, rnd)
    kind = rnd.choice(['round', 'kite', 'heater', 'tower'])
    if kind == 'round': m = mask_ell(256, 256, 170, 170)
    elif kind == 'kite': m = mask_poly([(256, 80), (390, 130), (380, 260), (256, 450), (132, 260), (122, 130)])
    elif kind == 'heater': m = mask_poly([(110, 100), (402, 100), (396, 260), (330, 380), (256, 440), (182, 380), (116, 260)])
    else: m = mask_rect(140, 70, 372, 450, 40)
    face = met if r >= 2 else rnd.choice(['wood', 'iron', 'steel'])
    if r >= 4: face = rnd.choice(['c_pur', 'c_blue', 'obsid', 'void']) if r < 6 else rnd.choice(['crim', 'c_red', 'holy'])
    L.part(m, trim if r >= 1 else met, split=(256, 256, math.pi * 0.75), rim=10)
    inner = Image.fromarray(np.array(m)).filter(ImageFilter.MinFilter(37))
    L.part(inner, face, split=(256, 256, math.pi * 0.75), rim=10, line=4)
    em = rnd.choice(['boss', 'cross', 'star', 'chev', 'wing'][: 2 + min(3, r)])
    ec = trim if r >= 1 else met
    if em == 'boss': L.part(mask_ell(256, 250, 46, 46), ec, split=(256, 250, math.pi * 0.75), rim=8)
    elif em == 'cross': L.part(ImageChops.lighter(mask_rect(236, 140, 276, 380, 6), mask_rect(170, 210, 342, 250, 6)), ec, split=(256, 250, math.pi * 0.75), rim=7)
    elif em == 'chev': L.part(mask_poly([(160, 200), (256, 280), (352, 200), (352, 250), (256, 330), (160, 250)]), ec, rim=7)
    elif em == 'star':
        pts = []
        for i in range(16):
            a = -math.pi / 2 + i * math.pi / 8; rr = 90 if i % 2 == 0 else 34; pts.append((256 + rr * math.cos(a), 252 + rr * math.sin(a)))
        L.part(mask_poly(pts), ec, split=(256, 252, math.pi * 0.75), rim=7)
    else:
        for s in (-1, 1): L.part(mask_poly([(256, 260), (256 + s * 120, 180), (256 + s * 100, 230), (256 + s * 120, 240), (256 + s * 80, 290)]), ec, rim=6)
    if gm: gem(L, 256, 252, 20 + r * 2, gm, 'diamond' if r >= 5 else 'round')

def draw_head(L, r, rnd):
    met, trim, gm = tier_mats(r, rnd)
    kind = rnd.choice(['helm', 'hood', 'hat', 'crown', 'horn'][: 3 + (r >= 3) + (r >= 4)])
    if kind == 'helm' or kind == 'horn':
        dome = ImageChops.lighter(mask_ell(256, 250, 150, 160), mask_rect(106, 250, 406, 380, 30))
        dome = ImageChops.multiply(dome, mask_rect(0, 80, S, 400))
        L.part(dome, met, split=(256, 260, math.pi * 0.75), rim=12)
        L.fill(mask_rect(160, 270, 352, 292, 8), LINE); L.fill(mask_rect(244, 290, 268, 380, 6), LINE)
        L.part(mask_rect(242, 92, 270, 360, 8), trim if r >= 1 else met, rim=5)
        if kind == 'horn':
            for s in (-1, 1): L.part(mask_poly([(256 + s * 120, 190), (256 + s * 200, 120), (256 + s * 210, 40), (256 + s * 160, 110), (256 + s * 110, 160)]), 'bone' if r < 6 else trim, split=(256 + s * 160, 120, math.pi * 0.75), rim=7)
        elif r >= 2: L.part(mask_poly([(256, 60), (300, 90), (330, 160), (272, 110), (240, 110), (182, 160), (212, 90)]), 'c_red' if r < 5 else 'crim', rim=6)
        if gm: gem(L, 256, 210, 14 + r, gm, 'diamond')
    elif kind == 'hood':
        cl = rnd.choice(['c_grn', 'c_blk', 'dleath', 'c_blue', 'c_pur'])
        L.part(mask_poly([(256, 70), (360, 150), (400, 300), (390, 420), (122, 420), (112, 300), (152, 150)]), cl, split=(256, 250, math.pi * 0.75), rim=12)
        L.fill(mask_ell(256, 300, 92, 104), (12, 8, 20, 255))
        L.fill(mask_ell(222, 300, 12, 6), hx(RAR_GLOW[r])); L.fill(mask_ell(290, 300, 12, 6), hx(RAR_GLOW[r]))
        if r >= 2: L.part(mask_rect(130, 400, 382, 424, 8), trim, rim=4)
        if gm: gem(L, 256, 180, 12 + r, gm)
    elif kind == 'hat':
        cl = rnd.choice(['c_pur', 'c_blue', 'c_blk', 'c_red'])
        L.part(mask_poly([(256, 50), (300, 130), (330, 320), (182, 320), (212, 130)]), cl, split=(256, 200, -math.pi / 2), rim=10)
        L.part(mask_ell(256, 330, 190, 50), cl, split=(256, 330, math.pi * 0.75), rim=8)
        L.part(mask_rect(186, 290, 326, 320, 6), trim if r >= 1 else 'leath', rim=4)
        if gm: gem(L, 256, 305, 14 + r, gm)
        if r >= 3: sparkle(L, 290, 160, 18, hx(RAR_GLOW[r]))
    else:  # crown / circlet
        pts = [(116, 340), (116, 200), (176, 260), (216, 160), (256, 230), (296, 160), (336, 260), (396, 200), (396, 340)]
        L.part(mask_poly(pts), trim if r >= 4 else met, split=(256, 260, math.pi * 0.75), rim=10)
        L.part(mask_rect(110, 320, 402, 360, 8), trim if r >= 4 else met, rim=6)
        for x in (216, 296): gem(L, x, 160, 12, gm or 'ruby')
        gem(L, 256, 330, 16 + r, gm or 'saph', 'diamond')

def draw_body(L, r, rnd):
    met, trim, gm = tier_mats(r, rnd)
    kind = rnd.choice(['plate', 'vest', 'robe'])
    if kind == 'plate':
        L.part(mask_poly([(176, 120), (336, 120), (370, 210), (350, 420), (256, 450), (162, 420), (142, 210)]), met, split=(256, 280, -math.pi / 2), rim=12)
        for s in (-1, 1): L.part(mask_poly([(256 + s * 80, 110), (256 + s * 170, 130), (256 + s * 200, 200), (256 + s * 170, 250), (256 + s * 120, 200)]), trim if r >= 1 else met, split=(256 + s * 150, 180, math.pi * 0.75), rim=8)
        L.fill(mask_rect(176, 300, 336, 310, 3), M[met][2]); L.fill(mask_line([(256, 140), (256, 290)], 5), M[met][2])
        L.part(mask_poly([(210, 110), (302, 110), (256, 150)]), 'c_blk', rim=3, gloss=False)
        if gm: gem(L, 256, 220, 18 + r, gm, 'diamond' if r >= 4 else 'round')
    elif kind == 'vest':
        lc = rnd.choice(['leath', 'dleath'])
        L.part(mask_poly([(170, 110), (230, 110), (256, 170), (282, 110), (342, 110), (380, 200), (360, 430), (152, 430), (132, 200)]), lc, split=(256, 280, -math.pi / 2), rim=12)
        L.part(mask_rect(152, 330, 360, 360, 6), 'dleath' if lc == 'leath' else 'leath', rim=4)
        L.part(mask_rect(238, 330, 274, 360, 4), trim if r >= 1 else 'bronze', rim=3)
        for y in (200, 250, 300): L.fill(mask_ell(256, y, 6, 6), M['bronze'][1])
        if r >= 3: L.part(mask_poly([(132, 200), (170, 110), (190, 150), (160, 230)]), trim, rim=4)
        if gm: gem(L, 256, 345, 10 + r, gm)
    else:
        cl = rnd.choice(['c_pur', 'c_blue', 'c_wht', 'c_red', 'c_grn'])
        L.part(mask_poly([(196, 100), (316, 100), (350, 160), (400, 440), (112, 440), (162, 160)]), cl, split=(256, 280, -math.pi / 2), rim=12)
        L.part(mask_poly([(206, 100), (256, 200), (306, 100), (290, 96), (256, 160), (222, 96)]), trim if r >= 1 else 'c_wht', rim=4)
        L.part(mask_rect(196, 260, 316, 290, 6), trim if r >= 2 else 'leath', rim=4)
        L.part(mask_rect(244, 290, 268, 440, 4), trim if r >= 2 else cl, rim=4)
        if r >= 4:
            for s in (-1, 1): sparkle(L, 256 + s * 80, 360, 14, hx(RAR_GLOW[r]))
        if gm: gem(L, 256, 275, 12 + r, gm)

def draw_boots(L, r, rnd):
    met, trim, gm = tier_mats(r, rnd)
    kind = rnd.choice(['plate', 'leather', 'wing'][: 2 + (r >= 3)])
    mat = met if kind == 'plate' else rnd.choice(['leath', 'dleath'])
    for dx, sh in ((-62, 0.85), (40, 1.0)):
        x = 256 + dx
        pts = [(x - 46, 110), (x + 34, 110), (x + 38, 330), (x + 110, 360), (x + 116, 410), (x - 52, 410), (x - 50, 300)]
        L.part(mask_poly(pts), mat, split=(x, 260, -math.pi / 2), rim=10)
        L.part(mask_rect(x - 52, 380, x + 118, 412, 8), 'dleath' if kind != 'plate' else M[met] and met, rim=4)
        L.part(mask_rect(x - 54, 100, x + 40, 136, 8), trim if r >= 1 else mat, rim=4)
        if kind == 'plate': L.part(mask_ell(x - 6, 300, 30, 26), trim if r >= 2 else met, rim=5)
        if kind == 'wing':
            L.part(mask_poly([(x - 46, 170), (x - 120, 110), (x - 150, 140), (x - 110, 160), (x - 150, 190), (x - 100, 200), (x - 46, 220)]), 'c_wht' if r < 7 else 'holy', split=(x - 100, 160, math.pi * 0.75), rim=5)
        if gm and r >= 2: gem(L, x - 6, 118, 9 + r // 2, gm)

def draw_ring(L, r, rnd):
    met, trim, gm = tier_mats(r, rnd)
    band_m = trim if r >= 2 else met
    L.part(mask_ring(256, 310, 165, 140, 42 + rnd.randint(-6, 10)), band_m, split=(256, 300, math.pi * 0.75), rim=10)
    cut = rnd.choice(['round', 'diamond', 'oval'])
    setting = mask_poly([(180, 160), (332, 160), (306, 214), (206, 214)])
    L.part(setting, band_m, rim=5)
    g = gm or rnd.choice(['ruby', 'saph', 'emer'] if r >= 1 else ['iron'])
    if g == 'iron': L.part(mask_ell(256, 160, 52, 38), 'iron', rim=6)
    else: gem(L, 256, 140, 58 + r * 3, g, cut)
    if r >= 4:
        for s in (-1, 1): gem(L, 256 + s * 72, 200, 12, rnd.choice(GEMS))
    if r >= 6: sparkle(L, 330, 110, 22, hx(RAR_GLOW[r]))

def draw_amulet(L, r, rnd):
    met, trim, gm = tier_mats(r, rnd)
    ch = trim if r >= 1 else met
    for i in range(15):
        t = i / 14; x = 120 + 272 * t; y = 70 + 140 * (1 - (2 * t - 1) ** 2)
        L.part(mask_ring(x, y, 14, 11, 6), ch, rim=3, line=3, gloss=False)
    kind = rnd.choice(['round', 'drop', 'star', 'cres', 'heart'][: 2 + min(3, r)])
    cy = 320; g = gm or ('emer' if r >= 1 else None)
    if kind == 'round': L.part(mask_ell(256, cy, 76, 76), ch, split=(256, cy, math.pi * 0.75), rim=10)
    elif kind == 'drop': L.part(mask_poly([(256, 210)] + [(256 + 74 * math.sin(t), cy + 30 - 74 * math.cos(t) * -1) for t in np.linspace(math.pi * 0.6, -math.pi * 0.6, 20)][::-1] + []), ch, split=(256, cy, math.pi * 0.75), rim=10) if False else L.part(ImageChops.lighter(mask_ell(256, cy + 20, 70, 70), mask_poly([(256, 200), (316, cy + 0), (196, cy + 0)])), ch, split=(256, cy, math.pi * 0.75), rim=10)
    elif kind == 'star':
        pts = []
        for i in range(12):
            a = -math.pi / 2 + i * math.pi / 6; rr = 96 if i % 2 == 0 else 50; pts.append((256 + rr * math.cos(a), cy + rr * math.sin(a)))
        L.part(mask_poly(pts), ch, split=(256, cy, math.pi * 0.75), rim=9)
    elif kind == 'cres': L.part(ImageChops.subtract(mask_ell(256, cy, 90, 90), mask_ell(290, cy - 26, 74, 74)), ch, split=(256, cy, math.pi * 0.75), rim=9)
    else:
        L.part(ImageChops.lighter(ImageChops.lighter(mask_ell(222, cy - 14, 46, 46), mask_ell(290, cy - 14, 46, 46)), mask_poly([(180, cy), (332, cy), (256, cy + 100)])), ch, split=(256, cy, math.pi * 0.75), rim=9)
    L.part(mask_rect(240, 196, 272, 226, 8), ch, rim=4)
    if g: gem(L, 256 if kind != 'cres' else 220, cy + (10 if kind in ('drop',) else 0), 28 + r * 2, g, 'diamond' if r >= 5 else 'round')
    else: L.part(mask_ell(256, cy, 26, 26), 'iron', rim=5)

DRAW = {'sword': lambda L, r, rnd: draw_sword(L, r, rnd), 'dagger': lambda L, r, rnd: draw_sword(L, r, rnd, True), 'axe': draw_axe,
        'staff': lambda L, r, rnd: draw_staff(L, r, rnd), 'wand': lambda L, r, rnd: draw_staff(L, r, rnd, True), 'shield': draw_shield,
        'head': draw_head, 'body': draw_body, 'boots': draw_boots, 'ring': draw_ring, 'amulet': draw_amulet}
ROT = {'sword': -45, 'dagger': -45, 'axe': -35, 'staff': -40, 'wand': -45}
SCALE = {'sword': 1.18, 'dagger': 1.3, 'axe': 1.05, 'staff': 1.12, 'wand': 1.15, 'shield': 0.86, 'head': 0.84, 'body': 0.86, 'boots': 0.86, 'ring': 0.92, 'amulet': 0.92}
NAMES = {'sword': 'Клинок', 'dagger': 'Кинжал', 'axe': 'Топор', 'staff': 'Посох', 'wand': 'Жезл', 'shield': 'Щит', 'head': 'Шлем', 'body': 'Доспех', 'boots': 'Сапоги', 'ring': 'Кольцо', 'amulet': 'Амулет'}
# группы и число иконок (сумма 200)
GROUPS = [('sword', 24), ('dagger', 16), ('axe', 16), ('staff', 16), ('wand', 16), ('shield', 16), ('head', 20), ('body', 20), ('boots', 16), ('ring', 20), ('amulet', 20)]

# ───── рамка по редкости ─────
_FR = {}
def frame(r):
    if r in _FR: return _FR[r].copy()
    _FR[r] = _frame(r); return _FR[r].copy()
def _frame(r):
    c = hx(RAR[r]); g = hx(RAR_GLOW[r])
    bg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ys, xs = np.mgrid[0:S, 0:S]; d = np.sqrt((xs - 256) ** 2 + (ys - 240) ** 2) / 330
    k = np.clip(1 - d, 0, 1) ** 1.6 * (0.18 + 0.06 * r)
    base = np.array([16, 12, 26], float); col = np.array(g[:3], float)
    rgb = base[None, None, :] * (1 - k[..., None]) + col[None, None, :] * k[..., None] * 0.9 + base * k[..., None] * 0.1
    a = np.full((S, S), 255, np.uint8)
    img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), a]), 'RGBA')
    rr = mask_rect(8, 8, S - 8, S - 8, 64)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); out.paste(img, (0, 0), rr)
    dr = ImageDraw.Draw(out)
    if r >= 5:   # лучи за предметом
        rays = Image.new('L', (S, S), 0); rd = ImageDraw.Draw(rays); n = 12 if r < 7 else 18
        for i in range(n):
            a0 = i * 2 * math.pi / n; w = 0.09
            rd.polygon([(256, 250), (256 + 400 * math.cos(a0 - w), 250 + 400 * math.sin(a0 - w)), (256 + 400 * math.cos(a0 + w), 250 + 400 * math.sin(a0 + w))], fill=60 + 18 * (r - 5))
        rays = ImageChops.multiply(rays.filter(ImageFilter.GaussianBlur(6)), rr)
        out.paste(Image.new('RGBA', (S, S), g[:3] + (255,)), (0, 0), rays)
    if r >= 7:   # нимб
        halo = mask_ring(256, 250, 200, 200, 10).filter(ImageFilter.GaussianBlur(3))
        out.paste(Image.new('RGBA', (S, S), (255, 240, 200, 255)), (0, 0), ImageChops.multiply(halo, Image.new('L', (S, S), 170)))
    bw = 7 + r * 1.6
    dr.rounded_rectangle([8 + bw / 2, 8 + bw / 2, S - 8 - bw / 2, S - 8 - bw / 2], radius=60, outline=c, width=int(bw))
    dr.rounded_rectangle([8, 8, S - 8, S - 8], radius=64, outline=(10, 6, 16, 255), width=4)
    if r >= 2: dr.rounded_rectangle([8 + bw + 8, 8 + bw + 8, S - 16 - bw, S - 16 - bw], radius=48, outline=c[:3] + (110,), width=3)
    if r >= 3:   # угловые ромбы
        for (x, y) in ((40, 40), (S - 40, 40), (40, S - 40), (S - 40, S - 40)):
            s = 16 + r * 2
            dr.polygon([(x, y - s), (x + s, y), (x, y + s), (x - s, y)], fill=c, outline=(20, 10, 30, 255))
            if r >= 6: dr.polygon([(x, y - s * 0.5), (x + s * 0.5, y), (x, y + s * 0.5), (x - s * 0.5, y)], fill=(255, 255, 255, 255))
    if r >= 4:   # засечки по серединам сторон
        for (x, y, hor) in ((256, 14, 1), (256, S - 14, 1), (14, 256, 0), (S - 14, 256, 0)):
            s = 10 + r * 2
            if hor: dr.polygon([(x - s * 2.2, y), (x, y - s * 0.7), (x + s * 2.2, y), (x, y + s * 0.7)], fill=c)
            else: dr.polygon([(x, y - s * 2.2), (x + s * 0.7, y), (x, y + s * 2.2), (x - s * 0.7, y)], fill=c)
    return out

def render(group, r, idx):
    rnd = random.Random(idx * 7919 + r * 31 + 5)
    L = Layer(); DRAW[group](L, r, rnd)
    obj = L.img; un = L.union
    ang = ROT.get(group, 0); sc = SCALE.get(group, 1)
    def tf(im):
        im = im.rotate(ang, resample=Image.BICUBIC, center=(256, 256))
        if sc != 1:
            n = int(S * sc); im = im.resize((n, n), Image.LANCZOS); o = (n - S) // 2
            im = im.crop((o, o, o + S, o + S)) if n > S else ImageOps_pad(im, n)
        return im
    obj = tf(obj); un = tf(un)
    # общий толстый внешний контур
    outer = ImageChops.subtract(dil(un, 6), un)
    canvas = frame(r)
    if r >= 1:   # свечение вокруг предмета
        gl = dil(un, 6 + r * 2).filter(ImageFilter.GaussianBlur(14 + r * 3)); gl = gl.point(lambda v: min(255, int(v * (0.35 + r * 0.09))))
        canvas.paste(Image.new('RGBA', (S, S), hx(RAR_GLOW[r])), (0, 0), gl)
    canvas.paste(Image.new('RGBA', (S, S), LINE), (0, 0), outer)
    canvas.alpha_composite(obj)
    if r >= 4:   # искры
        L2 = Layer(); n = r - 2
        for i in range(n):
            a = rnd.uniform(0, 2 * math.pi); d = rnd.uniform(150, 200); sparkle(L2, 256 + d * math.cos(a), 250 + d * math.sin(a), rnd.uniform(10, 18) + r, (255, 255, 255, 255) if r == 7 else hx(RAR_GLOW[r]))
        canvas.alpha_composite(L2.img)
    m = mask_rect(8, 8, S - 8, S - 8, 64); out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); out.paste(canvas, (0, 0), m)
    return out.resize((OUT, OUT), Image.LANCZOS)

def ImageOps_pad(im, n):
    o = (S - n) // 2; c = Image.new(im.mode, (S, S), 0); c.paste(im, (o, o)); return c

def main():
    icons = []; i = 0
    for g, n in GROUPS:
        for j in range(n):
            r = (j * 8) // n          # равномерно по редкостям 0…7
            icons.append({'g': g, 'r': r, 'n': NAMES[g] + ' ' + str(j + 1)}); i += 1
    cols = 20; rows = (len(icons) + cols - 1) // cols
    atlas = Image.new('RGBA', (cols * OUT, rows * OUT), (0, 0, 0, 0))
    for k, ic in enumerate(icons):
        im = render(ic['g'], ic['r'], k); atlas.paste(im, ((k % cols) * OUT, (k // cols) * OUT))
        if k % 20 == 19: print('…', k + 1, flush=True)
    os.makedirs(os.path.join(ROOT, 'assets/craft'), exist_ok=True)
    atlas.save(os.path.join(ROOT, 'assets/craft/icons.webp'), 'WEBP', quality=86, method=6)
    js = '/* Сгенерировано tools/make-craft-icons.py — не править руками. 200 иконок ремесла: атлас assets/craft/icons.webp, ' + str(cols) + ' столбцов по ' + str(OUT) + ' px. */\n'
    js += '(function () {\n  const D = globalThis.RPG.D;\n  D.CRAFT_ICON_COLS = ' + str(cols) + '; D.CRAFT_ICON_PX = ' + str(OUT) + '; D.CRAFT_ICON_ATLAS = \'assets/craft/icons.webp\';\n'
    js += '  D.CRAFT_ICONS = ' + json.dumps([[ic['g'], ic['r'], ic['n']] for ic in icons], ensure_ascii=False) + '.map((a, i) => ({ id: i, g: a[0], r: a[1], n: a[2] }));\n})();\n'
    open(os.path.join(ROOT, 'js/data-craft-icons.js'), 'w').write(js)
    if '--sheet' in sys.argv:
        out = sys.argv[sys.argv.index('--sheet') + 1]
        sh = Image.new('RGB', atlas.size, (24, 18, 34)); sh.paste(atlas, (0, 0), atlas)
        sh = sh.resize((1200, int(1200 * sh.size[1] / sh.size[0])), Image.LANCZOS); sh.save(out, quality=88)
    print('icons', len(icons), 'atlas', atlas.size, os.path.getsize(os.path.join(ROOT, 'assets/craft/icons.webp')) // 1024, 'KB')

if __name__ == '__main__': main()
