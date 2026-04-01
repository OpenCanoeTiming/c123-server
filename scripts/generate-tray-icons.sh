#!/bin/bash
# Generate tray icons with status indicators from the OCT logo SVG.
# Outputs base64 strings for icons.ts
#
# Requires: ImageMagick (convert)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

# Status dot colors
GREEN="#00d26a"
YELLOW="#f5a623"
RED="#ff3b30"
DOT_OUTLINE="#1a1a1a"

# Base SVG (logo without status dot)
BASE_SVG="$SCRIPT_DIR/tray-icon-base.svg"

# Create SVG variants with status dot overlays
create_status_svg() {
  local color="$1"
  local output="$2"
  # Take the base SVG and add a status dot in bottom-right
  # The dot is a filled circle with a dark outline
  sed 's|</svg>|  <!-- Status indicator dot -->\n  <circle cx="52" cy="52" r="9" fill="'"$DOT_OUTLINE"'" stroke="none" />\n  <circle cx="52" cy="52" r="7.5" fill="'"$color"'" stroke="none" />\n</svg>|' "$BASE_SVG" > "$output"
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

echo "Generating tray icons..."

# Generate for each status
for status in ok warning error; do
  case $status in
    ok)      color="$GREEN" ;;
    warning) color="$YELLOW" ;;
    error)   color="$RED" ;;
  esac

  svg="$WORK_DIR/${status}.svg"
  create_status_svg "$color" "$svg"

  # Render PNGs
  render_png "$svg" 16 "$WORK_DIR/${status}_16.png"
  render_png "$svg" 32 "$WORK_DIR/${status}_32.png"

  # Create ICO (16+32)
  create_ico "$WORK_DIR/${status}_16.png" "$WORK_DIR/${status}_32.png" "$WORK_DIR/${status}.ico"

  # Also render a single 32x32 PNG for macOS/Linux
  cp "$WORK_DIR/${status}_32.png" "$WORK_DIR/${status}_tray.png"
done

echo ""
echo "=== BASE64 OUTPUT FOR icons.ts ==="
echo ""

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

echo ""
echo "=== PREVIEW FILES ==="
# Copy preview files for inspection
for status in ok warning error; do
  cp "$WORK_DIR/${status}_32.png" "/tmp/tray_${status}_32.png"
  cp "$WORK_DIR/${status}_16.png" "/tmp/tray_${status}_16.png"
  echo "/tmp/tray_${status}_32.png  /tmp/tray_${status}_16.png"
done

echo ""
echo "Done!"
