#!/bin/bash
#
# Checks for raw HTML elements in app/ that should use design system components.
# COMPONENTS.md is the ONLY source of UI — ABSOLUTE LAW, ZERO EXCEPTIONS.
#
# Usage:
#   bash scripts/check-design-system.sh              # check staged/modified files only
#   bash scripts/check-design-system.sh --all        # check entire app/ directory
#   bash scripts/check-design-system.sh app/path.tsx  # check a specific file
#
# Lines with "// ds-ignore" are excluded (for intentional custom components).
# Exit code: 1 if violations found, 0 if clean.

set -euo pipefail

VIOLATIONS=0

check_element() {
  local file="$1"
  local pattern="$2"
  local hint="$3"

  matches=$(grep -n "$pattern" "$file" 2>/dev/null | grep -v "ds-ignore" | grep -v "^\s*//" || true)
  if [ -n "$matches" ]; then
    count=$(echo "$matches" | wc -l | tr -d ' ')
    echo "  ${pattern}> (${count}x) — ${hint}"
    echo "$matches" | while IFS= read -r line; do
      echo "    ${file}:${line}"
    done
    VIOLATIONS=$((VIOLATIONS + count))
  fi
}

check_file() {
  local file="$1"
  local found=0

  for pattern in "<button" "<label" "<input " "<textarea" "<select" "<dialog"; do
    case "$pattern" in
      "<button")  hint="Use Button or IconButton" ;;
      "<label")   hint="Use Label" ;;
      "<input ")  hint="Use Input" ;;
      "<textarea") hint="Use Textarea" ;;
      "<select")  hint="Use Select or Popover + Button" ;;
      "<dialog")  hint="Use Dialog" ;;
    esac
    result=$(grep -c "$pattern" "$file" 2>/dev/null | tr -d ' ' || echo "0")
    if [ "$result" -gt 0 ]; then
      if [ "$found" -eq 0 ]; then
        echo ""
        echo "WARNING: $file"
        found=1
      fi
      check_element "$file" "$pattern" "$hint"
    fi
  done
}

# Determine which files to check
if [ "${1:-}" = "--all" ]; then
  echo "Checking ALL app/ files for raw HTML elements..."
  FILES=$(find app -name "*.tsx" -o -name "*.jsx" 2>/dev/null)
elif [ -n "${1:-}" ] && [ -f "$1" ]; then
  echo "Checking $1 for raw HTML elements..."
  FILES="$1"
else
  echo "Checking modified/staged app/ files for raw HTML elements..."
  FILES=$(git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep -E '^app/.*\.(tsx|jsx)$' || true)
  STAGED=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | grep -E '^app/.*\.(tsx|jsx)$' || true)
  FILES=$(echo -e "${FILES}\n${STAGED}" | sort -u | grep -v '^$' || true)

  if [ -z "$FILES" ]; then
    echo "No modified app/ files to check."
    exit 0
  fi
fi

for file in $FILES; do
  [ -f "$file" ] && check_file "$file"
done

echo ""
if [ "$VIOLATIONS" -gt 0 ]; then
  echo "Found ${VIOLATIONS} raw HTML element(s). Use design system components from COMPONENTS.md."
  echo "Add '// ds-ignore' to a line to mark intentional custom elements."
  exit 1
else
  echo "PASSED: No raw HTML violations found."
  exit 0
fi
