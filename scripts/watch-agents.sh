#!/bin/bash

# watch-agents.sh
# Shows live status of all running agents and their logs.

LOG_DIR="/Users/christorres/vibecoding/logs"
PIDS_FILE="$LOG_DIR/.agent-pids"

echo "======================================"
echo "  Marketeq Agent Status"
echo "======================================"

# Show running agents
if [ -f "$PIDS_FILE" ]; then
  echo "Agent PIDs: $(cat $PIDS_FILE)"
  echo ""
  for PID in $(cat $PIDS_FILE); do
    if kill -0 $PID 2>/dev/null; then
      echo "  PID $PID — RUNNING"
    else
      echo "  PID $PID — DONE"
    fi
  done
else
  echo "No .agent-pids file found. Run spawn-agents.sh first."
fi

echo ""
echo "Log files:"
ls -lh "$LOG_DIR"/*.log 2>/dev/null || echo "  No logs yet."
echo ""
echo "Watching all logs (Ctrl+C to exit):"
echo "======================================"
tail -f "$LOG_DIR"/*.log 2>/dev/null || echo "No logs to watch."
