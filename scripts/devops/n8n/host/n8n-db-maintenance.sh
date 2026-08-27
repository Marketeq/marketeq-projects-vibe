#!/bin/bash
# Reclaims SQLite free pages so the n8n DB cannot silently bloat again.
# Incident MQ-N8N-2026-0813: DB reached 7.2GB (94% dead space) and OOM-killed n8n.
V=/var/lib/docker/volumes/n8n_data/_data/database.sqlite
L=/var/log/n8n-db-maintenance.log
B=$(du -m "$V" | cut -f1)
sqlite3 "$V" "PRAGMA incremental_vacuum;" 2>>"$L"
A=$(du -m "$V" | cut -f1)
echo "$(date -u +%FT%TZ) incremental_vacuum ${B}MB -> ${A}MB freelist=$(sqlite3 "file:$V?mode=ro" "PRAGMA freelist_count;")" >> "$L"
# Safety net: if the file ever exceeds 3GB, do a full offline vacuum.
if [ "$A" -gt 3072 ]; then
  cd /root && docker compose stop n8n && sqlite3 "$V" "VACUUM;" && docker compose up -d n8n
  echo "$(date -u +%FT%TZ) FULL VACUUM triggered, now $(du -m "$V"|cut -f1)MB" >> "$L"
fi
