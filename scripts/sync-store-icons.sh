#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sync_icon() {
  local app_dir="$1"
  local source_icon="$ROOT_DIR/$app_dir/assets/icon.png"
  local target_dir="$ROOT_DIR/$app_dir/store-assets"
  local target_icon="$target_dir/play-icon-512.png"

  mkdir -p "$target_dir"
  sips -z 512 512 "$source_icon" --out "$target_icon" >/dev/null
  echo "Synced $target_icon"
}

sync_icon "apps/mobile"
sync_icon "apps/mobile-admin"
