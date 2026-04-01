#!/bin/bash
# Generate tray icons from the OCT logo SVG with status-colored backgrounds.
# The entire circle is filled with the status color, internal elements stay white.
# Outputs base64 strings for icons.ts
#
# Requires: ImageMagick (convert)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

# Status colors
declare -A COLORS=(
  [ok]="#00a858"       # Strong green (slightly darker for better contrast)
  [warning]="#e6940a"  # Amber/orange (better visibility than pure yellow)
  [error]="#dc2626"    # Red
)

BASE_SVG="$SCRIPT_DIR/tray-icon-base.svg"

# Create SVG with status color filled into the circle
create_status_svg() {
  local color="$1"
  local output="$2"
  sed "s/STATUS_COLOR/${color}/" "$BASE_SVG" > "$output"
}

# Render SVG to PNG at a given size
render_png() {
  local svg="$1"
  local size="$2"
  local output="$3"
  convert -background none -density 300 "$svg" -resize "${size}x${size}" -gravity center -extent "${size}x${size}" "$output"
}

# Create ICO from 16x16 + 32x32 PNGs
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

echo "" >&2
echo "=== BASE64 OUTPUT ===" >&2

echo "// ICO format (Windows) - 16x16 + 32x32"
echo "const ICO_ICONS = {"
for status in ok warning error; do
  b64=$(base64 -w0 "$WORK_DIR/${status}.ico")
  echo "  ${status}: '${b64}',"
done
echo "};"
echo ""

echo "// PNG format (macOS/Linux) - 32x32"
echo "const PNG_ICONS = {"
for status in ok warning error; do
  b64=$(base64 -w0 "$WORK_DIR/${status}_tray.png")
  echo "  ${status}: '${b64}',"
done
echo "};"

# Copy preview files
for status in ok warning error; do
  cp "$WORK_DIR/${status}_32.png" "/tmp/tray_${status}_32.png"
  cp "$WORK_DIR/${status}_16.png" "/tmp/tray_${status}_16.png"
done

echo "" >&2
echo "Preview files in /tmp/tray_{ok,warning,error}_{16,32}.png" >&2
echo "Done!" >&2
