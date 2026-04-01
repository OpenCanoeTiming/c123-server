#!/bin/bash
# Generate tray icons from the OCT logo SVG with status indicator dots.
# White paddle-in-waves logo with a colored status dot in the bottom-right.
# Outputs base64 strings for icons.ts
#
# Requires: ImageMagick (convert)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

# Status colors
declare -A COLORS=(
  [ok]="#00d26a"
  [warning]="#f5a623"
  [error]="#ff3b30"
)

BASE_SVG="$SCRIPT_DIR/tray-icon-base.svg"

create_status_svg() {
  local color="$1"
  local output="$2"
  sed "s/STATUS_COLOR/${color}/" "$BASE_SVG" > "$output"
}

render_png() {
  local svg="$1"
  local size="$2"
  local output="$3"
  convert -background none -density 300 "$svg" -resize "${size}x${size}" -gravity center -extent "${size}x${size}" "$output"
}

create_ico() {
  local png16="$1"
  local png32="$2"
  local output="$3"
  convert "$png16" "$png32" "$output"
}

echo "Generating tray icons..." >&2

for status in ok warning error; do
  color="${COLORS[$status]}"
  svg="$WORK_DIR/${status}.svg"
  create_status_svg "$color" "$svg"

  render_png "$svg" 16 "$WORK_DIR/${status}_16.png"
  render_png "$svg" 32 "$WORK_DIR/${status}_32.png"
  create_ico "$WORK_DIR/${status}_16.png" "$WORK_DIR/${status}_32.png" "$WORK_DIR/${status}.ico"
  cp "$WORK_DIR/${status}_32.png" "$WORK_DIR/${status}_tray.png"
done

echo "// ICO format (Windows) - 16x16 + 32x32"
echo "const ICO_ICONS = {"
for status in ok warning error; do
  echo "  ${status}: '$(base64 -w0 "$WORK_DIR/${status}.ico")',"
done
echo "};"
echo ""
echo "// PNG format (macOS/Linux) - 32x32"
echo "const PNG_ICONS = {"
for status in ok warning error; do
  echo "  ${status}: '$(base64 -w0 "$WORK_DIR/${status}_tray.png")',"
done
echo "};"

for status in ok warning error; do
  cp "$WORK_DIR/${status}_32.png" "/tmp/tray_${status}_32.png"
  cp "$WORK_DIR/${status}_16.png" "/tmp/tray_${status}_16.png"
done
echo "Done!" >&2
