# n8n host configuration (srv1149839)

Operational configuration for the n8n instance at `n8n.srv1149839.hstgr.cloud`
(145.223.126.80, Hostinger KVM 1, Ubuntu 24.04 + Docker + Traefik).

Added after incident **MQ-N8N-2026-0813**, in which the instance ran out of Node heap,
restarted with its scheduled workflows switched off, and went twelve days before anyone
diagnosed it. Nothing here existed before; the box was running the stock Hostinger
n8n template defaults.

## Why each setting exists

| Setting | Reason |
| --- | --- |
| `NODE_OPTIONS=--max-old-space-size=3072` | Node had no heap ceiling and aborted outright on exhaustion. |
| `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` | Default keeps binary payloads in RAM. The report workflow downloads nine images and builds a PDF every ten minutes. |
| `EXECUTIONS_DATA_PRUNE` / `MAX_AGE=72` / `PRUNE_MAX_COUNT=500` | Heavy runs store ~12.8 MB each. Unbounded retention is what grew the database. |
| `DB_SQLITE_POOL_SIZE=3` | Clears an n8n deprecation, switches to WAL, and is a prerequisite for n8n 2.x. |
| Image pinned to `1.120.4` | Was untagged (`:latest`), so any `docker compose pull` would have jumped to 2.x unannounced. |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, `NODES_EXCLUDE=[]`, `N8N_GIT_NODE_DISABLE_BARE_REPOS=true` | Pins current behaviour so n8n 2.0's default flips become no-ops. 15 `executeCommand` uses and 7 `$env` uses exist across the workflows. |
| 4 GB swapfile (in `/etc/fstab`, not in this repo) | Box had none. |

## Files

| File | Deploys to |
| --- | --- |
| `docker-compose.yml` | `/root/docker-compose.yml` |
| `n8n-healthcheck.sh` | `/usr/local/bin/` |
| `n8n-backup.sh` | `/usr/local/bin/` |
| `n8n-db-maintenance.sh` | `/usr/local/bin/` |
| `crontab` | `/etc/cron.d/n8n-monitoring` and `/etc/cron.d/n8n-db-maintenance` |
| `n8n-alerts.env.example` | copy to `/etc/n8n-alerts.env`, fill in, `chmod 600` |

## Alerting

Fires **only on state change**, so a sustained outage costs one notification rather than
one every fifteen minutes. State in `/var/lib/n8n-alerts.state`.

Primary channel is **ntfy.sh push**: no account, no API key, verified working from this host.
Secondary is Brevo email, currently inert because Brevo's account-level Authorised IPs list
rejects both `145.223.126.80` and `2a02:4780:2d:5e4c::1` with a 401. There is no API to manage
that list; add the IPs at app.brevo.com/security/authorised_ips and email starts working with
no code change.

The failure-rate check triggers at 80% rather than 50% on purpose. Rachel's Featured Report
workflow had its own defects producing roughly half-failed runs, and a lower bar would have
made the alert noise people learn to ignore.

## Database maintenance

SQLite does not return freed pages to the filesystem without an explicit `VACUUM`. Pruning
alone let the file reach 7.2 GB of which 94% was dead space, which is what exhausted the heap.
`auto_vacuum` is set to `INCREMENTAL` and the daily job reclaims pages, with a full offline
vacuum if the file ever passes 3 GB.

## Gotcha

Saving a workflow through the public API updates the database but leaves the running in-memory
copy untouched. Changes do nothing until you `POST /workflows/{id}/deactivate` then `/activate`.

## Restore

Nightly backups land in `/var/backups/n8n/` (7 kept) via `VACUUM INTO`, alongside the
encryption-key `config` and the compose file. To restore: stop n8n, gunzip the snapshot over
`/var/lib/docker/volumes/n8n_data/_data/database.sqlite`, restore `config` beside it, start n8n.
**The `config` file holds `encryptionKey`.** Without the matching key every stored credential is
unreadable, so it must be restored together with the database.
