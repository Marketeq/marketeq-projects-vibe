#!/bin/bash
# Nightly consistent backup of the n8n database + config, 7 day rotation.
# VACUUM INTO is an online backup: no downtime, no torn copy.
set -uo pipefail
SRC=/var/lib/docker/volumes/n8n_data/_data
DEST=/var/backups/n8n
LOG=/var/log/n8n-backup.log
STAMP=$(date -u +%Y%m%d-%H%M%S)
mkdir -p "$DEST"
OUT="$DEST/n8n-$STAMP.sqlite"
sqlite3 "file:$SRC/database.sqlite?mode=ro" "VACUUM INTO '$OUT';" 2>>"$LOG"
if [ ! -s "$OUT" ]; then echo "$(date -u +%FT%TZ) BACKUP FAILED" >> "$LOG"; exit 1; fi
chk=$(sqlite3 "$OUT" "PRAGMA quick_check;" 2>&1 | head -1)
gzip -f "$OUT"
cp "$SRC/config" "$DEST/config-$STAMP.json" 2>/dev/null
cp /root/docker-compose.yml "$DEST/docker-compose-$STAMP.yml" 2>/dev/null
chmod 600 "$DEST"/config-* 2>/dev/null
find "$DEST" -type f -mtime +7 -delete
echo "$(date -u +%FT%TZ) ok $(du -h "$OUT.gz"|cut -f1) integrity=$chk kept=$(ls "$DEST"/*.sqlite.gz 2>/dev/null|wc -l)" >> "$LOG"
