#!/usr/bin/env bash
# Build the gated single-file page and refresh the Pages root copy.
set -euo pipefail
cd "$(dirname "$0")"

python3 build.py

rm -rf gated
mkdir -p gated
cp build/index.html gated/index.html

PASS="$(cat .passphrase)"

npx --yes staticrypt@3.5.4 gated/index.html \
  --password "$PASS" \
  --directory gated \
  --remember 0 \
  --short \
  --template-title "Power under pressure" \
  --template-instructions "Passphrase required" \
  --template-button "Open" \
  --template-color-primary "#0073AB" \
  --template-color-secondary "#152330"

cp gated/index.html index.html
echo "--- gated ---"
du -h gated/index.html index.html
