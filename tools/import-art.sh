#!/bin/sh
# Использование: tools/import-art.sh [папка-источник]  (по умолчанию /workspace/vn-art)
# Для качественного вырезания нужен venv с rembg/pymatting/opencv (иначе — запасной chroma-ключ):
#   python3 -m venv --system-site-packages .venv-matte && .venv-matte/bin/pip install "rembg[cpu]" opencv-python-headless==4.11.0.86
cd "$(dirname "$0")/.." || exit 1
PY=python3
for c in .venv-matte/bin/python /workspace/.venv-matte/bin/python; do [ -x "$c" ] && PY="$c" && break; done
exec "$PY" tools/import-art.py "${1:-/workspace/vn-art}"
