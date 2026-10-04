#!/usr/bin/env python3
"""Единоразовая перекраска палитры v2.6.0 (индиго/циан -> чёрно-фиолетовый/багровый). Не нужна при сборке; оставлена как документация преобразования."""
import re, sys, colorsys
def remap(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255); H = h * 360
    if s < 0.12: return r, g, b
    if 165 <= H < 205: nh = 342                       # циан -> багрянец
    elif 205 <= H <= 275: nh = 262 + (H - 235) * 0.45  # индиго/синий -> пурпур
    else: return r, g, b
    # тёмные тона глубже
    if l < 0.3: l *= 0.72
    nr, ng, nb = colorsys.hls_to_rgb(nh / 360, l, min(1, s * (1.05 if l < 0.4 else 1)))
    return round(nr * 255), round(ng * 255), round(nb * 255)
def hexrep(m):
    t = m.group(1)
    if len(t) == 3: t = ''.join(c * 2 for c in t)
    r, g, b = int(t[0:2], 16), int(t[2:4], 16), int(t[4:6], 16); r, g, b = remap(r, g, b)
    return '#%02x%02x%02x' % (r, g, b)
def rgbarep(m):
    r, g, b = int(m.group(2)), int(m.group(3)), int(m.group(4)); r, g, b = remap(r, g, b)
    return '%s(%d,%d,%d%s' % (m.group(1), r, g, b, m.group(5))
for p in sys.argv[1:]:
    s = open(p).read()
    s = re.sub(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])', hexrep, s)
    s = re.sub(r'(rgba?)\((\d+),\s*(\d+),\s*(\d+)([,)])', rgbarep, s)
    open(p, 'w').write(s)
