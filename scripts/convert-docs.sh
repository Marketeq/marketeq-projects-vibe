#!/bin/bash

# convert-docs.sh
# Converts all .docx documentation files to .md so agents can read them.
# Output mirrors the same folder structure under /docs/md/

DOCS_DIR="/Users/christorres/vibecoding/marketeq-projects-vibe/docs/Technical Documentation"
OUT_DIR="/Users/christorres/vibecoding/marketeq-projects-vibe/docs/md"

if ! command -v pandoc &>/dev/null; then
  echo "pandoc not found. Install with: brew install pandoc"
  exit 1
fi

echo "Converting .docx files to markdown..."
echo ""

COUNT=0
FAILED=0

while IFS= read -r -d '' FILE; do
  # Mirror folder structure
  REL="${FILE#$DOCS_DIR/}"
  OUT_FILE="$OUT_DIR/${REL%.docx}.md"
  OUT_FOLDER="$(dirname "$OUT_FILE")"

  mkdir -p "$OUT_FOLDER"

  if pandoc "$FILE" -t markdown -o "$OUT_FILE" 2>/dev/null; then
    echo "  ✓ $REL"
    COUNT=$((COUNT + 1))
  else
    echo "  ✗ FAILED: $REL"
    FAILED=$((FAILED + 1))
  fi
done < <(find "$DOCS_DIR" -name "*.docx" -print0)

echo ""
echo "Done. Converted: $COUNT | Failed: $FAILED"
echo "Markdown files at: $OUT_DIR"
