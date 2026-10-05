#!/usr/bin/env python3
"""Контактная сводка вырезанных портретов на тёмном (#10131c) и светлом (#f0f0f0) фоне → shots/portraits-dark.jpg, shots/portraits-light.jpg."""
import os, json
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = json.load(open(os.path.join(ROOT, 'assets', 'vn', 'manifest.json')))
files = sorted(f for f in man['dim'] if not f.startswith('cg_'))
TW, TH, COLS = 200, 150, 10
for name, bg in (('dark', (16, 19, 28)), ('light', (240, 240, 240))):
    rows = (len(files) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * TW, rows * TH), bg); d = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        im = Image.open(os.path.join(ROOT, 'assets', 'vn', f)).convert('RGBA')
        k = min((TW - 6) / im.width, (TH - 14) / im.height); im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        x, y = (i % COLS) * TW + (TW - im.width) // 2, (i // COLS) * TH + 12
        sheet.paste(im, (x, y), im)
        d.text(((i % COLS) * TW + 3, (i // COLS) * TH + 1), f[:-5], fill=(230, 200, 60) if name == 'dark' else (140, 20, 20))
    os.makedirs(os.path.join(ROOT, 'shots'), exist_ok=True)
    sheet.save(os.path.join(ROOT, 'shots', 'portraits-%s.jpg' % name), quality=86); print('shots/portraits-%s.jpg' % name, sheet.size)
