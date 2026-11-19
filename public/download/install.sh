#!/usr/bin/env bash
set -euo pipefail

main() {
    local base_url="${FOCUSLOCK_BASE_URL:-http://localhost:4321/download}"
    local app_name="FocusLock"
    local bundle_id="dev.focuslock.FocusLock"

    local green="" red="" reset=""
    if [[ -t 1 ]]; then green=$'\033[1;32m' red=$'\033[1;31m' reset=$'\033[0m'; fi
    say() { printf '%s==>%s %s\n' "$green" "$reset" "$*"; }
    die() { printf '%serror:%s %s\n' "$red" "$reset" "$*" >&2; exit 1; }

    [[ "$(uname -s)" == "Darwin" ]] || die "FocusLock is macOS-only."
    [[ "$(uname -m)" == "arm64" ]] || die "FocusLock currently needs an Apple Silicon Mac."
    local major
    major="$(sw_vers -productVersion | cut -d. -f1)"
    (( major >= 14 )) || die "FocusLock needs macOS 14 or later (you have $(sw_vers -productVersion))."
    [[ "$base_url" != __* ]] || die "this copy of install.sh has no download URL configured."

    local dest="${FOCUSLOCK_INSTALL_DIR:-}"
    if [[ -z "$dest" ]]; then
        if [[ -w /Applications ]]; then dest=/Applications; else dest="$HOME/Applications"; fi
    fi
    mkdir -p "$dest"

    tmp="$(mktemp -d)"
    trap 'status=$?; rm -rf "$tmp"; exit $status' EXIT

    say "Downloading ${app_name}…"
    local zip_url="$base_url/$app_name.zip"
    [[ "$base_url" == http* ]] && zip_url="$zip_url?via=installer"
    curl -fsSL "$zip_url" -o "$tmp/$app_name.zip" || die "download failed: $zip_url"
    curl -fsSL "$base_url/checksums.txt" -o "$tmp/checksums.txt" || die "download failed: $base_url/checksums.txt"

    say "Verifying checksum…"
    local expected actual
    expected="$(awk -v f="$app_name.zip" '$2 == f { print $1 }' "$tmp/checksums.txt")"
    actual="$(shasum -a 256 "$tmp/$app_name.zip" | awk '{ print $1 }')"
    [[ -n "$expected" ]] || die "checksums.txt has no entry for $app_name.zip"
    [[ "$expected" == "$actual" ]] || die "checksum mismatch (expected $expected, got $actual). Not installing."

    ditto -x -k "$tmp/$app_name.zip" "$tmp/unpacked"
    [[ -d "$tmp/unpacked/$app_name.app" ]] || die "the zip doesn't contain $app_name.app"
    codesign --verify --deep --strict "$tmp/unpacked/$app_name.app" 2>/dev/null \
        || die "the app's signature is invalid. Not installing."

    local running="$dest/$app_name.app/Contents/MacOS/$app_name"
    if pgrep -fq "^$running"; then
        say "Quitting the running ${app_name}…"
        osascript -e "quit app id \"$bundle_id\"" >/dev/null 2>&1 || true
        for _ in 1 2 3 4 5 6 7 8 9 10; do pgrep -fq "^$running" || break; sleep 0.3; done
        pkill -f "^$running" 2>/dev/null || true
    fi

    say "Installing to $dest/$app_name.app…"
    rm -rf "${dest:?}/$app_name.app"
    ditto "$tmp/unpacked/$app_name.app" "$dest/$app_name.app"
    xattr -dr com.apple.quarantine "$dest/$app_name.app" 2>/dev/null || true

    local version
    version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$dest/$app_name.app/Contents/Info.plist")"
    say "Installed $app_name $version."

    if [[ "${FOCUSLOCK_NO_LAUNCH:-}" != "1" ]]; then
        open "$dest/$app_name.app"
        say "Launched. Look for 🎯 in your menu bar."
    fi
    echo "    Uninstall: quit FocusLock (🎯 → Quit), then delete $dest/$app_name.app"
}

main "$@"
