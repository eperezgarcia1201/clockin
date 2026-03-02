#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

EMPLOYEE_ICON="$ROOT_DIR/apps/mobile/assets/icon.png"
ADMIN_ICON="$ROOT_DIR/apps/mobile-admin/assets/icon.png"
EMPLOYEE_ADAPTIVE_ICON="$ROOT_DIR/apps/mobile/assets/adaptive-icon.png"
ADMIN_ADAPTIVE_ICON="$ROOT_DIR/apps/mobile-admin/assets/adaptive-icon.png"

for file in \
  "$EMPLOYEE_ICON" \
  "$ADMIN_ICON" \
  "$EMPLOYEE_ADAPTIVE_ICON" \
  "$ADMIN_ADAPTIVE_ICON"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing icon asset: $file"
    exit 1
  fi
done

hash_file() {
  shasum -a 256 "$1" | awk '{ print $1 }'
}

employee_icon_hash="$(hash_file "$EMPLOYEE_ICON")"
admin_icon_hash="$(hash_file "$ADMIN_ICON")"
employee_adaptive_hash="$(hash_file "$EMPLOYEE_ADAPTIVE_ICON")"
admin_adaptive_hash="$(hash_file "$ADMIN_ADAPTIVE_ICON")"

if [[ "$employee_icon_hash" == "$admin_icon_hash" ]]; then
  echo "Icon check failed: apps/mobile/assets/icon.png matches apps/mobile-admin/assets/icon.png"
  exit 1
fi

if [[ "$employee_adaptive_hash" == "$admin_adaptive_hash" ]]; then
  echo "Icon check failed: apps/mobile/assets/adaptive-icon.png matches apps/mobile-admin/assets/adaptive-icon.png"
  exit 1
fi

echo "Icon check passed:"
echo "  employee icon hash: $employee_icon_hash"
echo "  admin icon hash:    $admin_icon_hash"
echo "  employee adaptive:  $employee_adaptive_hash"
echo "  admin adaptive:     $admin_adaptive_hash"
