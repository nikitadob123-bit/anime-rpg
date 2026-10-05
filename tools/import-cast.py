#!/usr/bin/env python3
"""Import the replacement cast, preserving generated alpha and one frame per actor.

Usage: python tools/import-cast.py SOURCE_DIR
SOURCE_DIR contains <actor>_<mood>.png; geometry is reviewed in cast-frames.json.
Requires Pillow. Never alters the player, CGs, story, or save data.
"""
import hashlib
import io
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/vn'


def main(source):
    manifest_path = OUT / 'manifest.json'
    man = json.loads(manifest_path.read_text())
    frames = json.loads((ROOT / 'tools/data/cast-frames.json').read_text())
    # Validate the complete input before replacing any game asset.
    for actor, frame in frames.items():
        assert actor not in ('hero', 'hero_demon')
        for mood in man['portraits'][actor]:
            path = source / f'{actor}_{mood}.png'
            with Image.open(path) as im:
                assert im.mode == 'RGBA' and im.size == tuple(frame['canvas']), path
                assert im.getchannel('A').getextrema()[0] == 0, f'No transparency: {path}'

    count = 0
    for actor, frame in frames.items():
        fx, fy, fw = frame['face']
        width, height = frame['canvas']
        # Same waist-level crop and face anchor for every emotion; no stretching.
        bottom = min(height, round(fy + 2.9 * fw))
        scale = 240 / fw
        dims = [round(width * scale), round(bottom * scale), 1,
                round(fx * scale), round(fy * scale), 240, 0, 0,
                round(bottom * scale), 1]
        for mood, filename in man['portraits'][actor].items():
            path = source / f'{actor}_{mood}.png'
            with Image.open(path) as im:
                sprite = im.crop((0, 0, width, bottom)).resize(tuple(dims[:2]), Image.Resampling.LANCZOS)
                # Remove subpixel alpha noise while preserving antialiased edges.
                sprite.putalpha(sprite.getchannel('A').point(lambda a: min(255, round(a / 8) * 8)))
                for quality in range(85, 24, -5):
                    encoded = io.BytesIO()
                    sprite.save(encoded, 'WEBP', quality=quality, method=4)
                    if encoded.tell() <= 88000:
                        break
                assert encoded.tell() <= 88000, filename
                (OUT / filename).write_bytes(encoded.getvalue())
                if mood == 'neutral':
                    aw = min(width, 2.15 * fw)
                    ah = aw * 1.25
                    ax = min(max(0, fx - aw / 2), width - aw)
                    ay = min(max(0, fy - 1.02 * fw), height - ah)
                    avatar = f'{actor}_av.webp'
                    im.crop((round(ax), round(ay), round(ax + aw), round(ay + ah))).resize(
                        (256, 320), Image.Resampling.LANCZOS).save(
                        OUT / avatar, 'WEBP', quality=88, method=4, alpha_quality=100)
                    man.setdefault('av', {})[actor] = avatar
                    man['src'][avatar] = 'cast2-' + hashlib.sha256(path.read_bytes()).hexdigest()[:12]
            man['dim'][filename] = list(dims)
            man['src'][filename] = 'cast2-' + hashlib.sha256(path.read_bytes()).hexdigest()[:12]
            count += 1
    man['pre'] = sorted(set(man['pre']) | set(man['av'].values()))
    man['v'] = hashlib.sha256(json.dumps([man['portraits'], man['dim'], man['src'],
        man['av']], sort_keys=True).encode()).hexdigest()[:8]
    manifest_path.write_text(json.dumps(man, ensure_ascii=False, sort_keys=True, separators=(',', ':')))
    print(f'Imported {count} portraits and {len(frames)} avatars; manifest {man["v"]}')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
