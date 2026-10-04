#!/bin/sh
# Использование: tools/import-art.sh [папка-источник]  (по умолчанию /workspace/vn-art)
cd "$(dirname "$0")/.." && python3 tools/import-art.py "${1:-/workspace/vn-art}"
