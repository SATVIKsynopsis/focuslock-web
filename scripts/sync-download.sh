#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

APP_DIST="${APP_DIST:-../focuslock/dist}"
SITE_URL="${SITE_URL:-http://localhost:4321}"
OUT="public/download"

for f in FocusLock.dmg FocusLock.zip checksums.txt latest.json; do
    [[ -f "$APP_DIST/$f" ]] || { echo "error: $APP_DIST/$f not found. Run scripts/package.sh in the app repo first." >&2; exit 1; }
done
[[ -f "$APP_DIST/../scripts/install.sh" ]] || { echo "error: can't find the app's scripts/install.sh" >&2; exit 1; }

mkdir -p "$OUT"
cp "$APP_DIST"/{FocusLock.dmg,FocusLock.zip,checksums.txt,latest.json} "$OUT/"

base="${SITE_URL%/}/download"
escaped="$(printf '%s' "$base" | sed 's/[&|\\]/\\&/g')"
sed "s|__FOCUSLOCK_BASE_URL__|$escaped|" "$APP_DIST/../scripts/install.sh" > "$OUT/install.sh"

(cd "$OUT" && shasum -a 256 -c checksums.txt >/dev/null) || { echo "error: checksum mismatch after copy" >&2; exit 1; }

echo "Synced v$(sed -n 's/.*"version": "\(.*\)".*/\1/p' "$OUT/latest.json") into $OUT/"
echo "install.sh downloads from: $base"
