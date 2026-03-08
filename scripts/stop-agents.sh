#!/bin/bash

# stop-agents.sh
# Stops all running agents spawned by spawn-agents.sh

LOG_DIR="/Users/christorres/vibecoding/logs"
PIDS_FILE="$LOG_DIR/.agent-pids"

if [ ! -f "$PIDS_FILE" ]; then
  echo "No agents found (no .agent-pids file)."
  exit 0
fi

PIDS=$(cat $PIDS_FILE)
echo "Stopping agents: $PIDS"
kill $PIDS 2>/dev/null && echo "Done." || echo "Some agents may have already finished."
rm -f "$PIDS_FILE"
