#!/usr/bin/env bash
# trendx dev supervisor
# Wraps `pnpm dev` (turbo) and auto-restarts on crash with exponential backoff.
# Writes status + last-restart timestamp to /tmp/trendx-supervisor.json
# so the web app's Service Quality page can surface it.

set -u
cd "$(dirname "$0")/.."

STATE_FILE=/tmp/trendx-supervisor.json
LOG_FILE=/tmp/trendx-dev.log
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:4001/health}
WEB_URL=${WEB_URL:-http://127.0.0.1:4002}

restarts=0
last_start=$(date +%s)

write_state() {
  cat > "$STATE_FILE" <<JSON
{
  "pid": ${1:-0},
  "status": "$2",
  "restarts": $restarts,
  "lastStartUnix": $last_start,
  "lastEventUnix": $(date +%s),
  "lastExitCode": ${3:-0}
}
JSON
}

cleanup_ports() {
  for p in 4001 4002; do
    pids=$(lsof -i :"$p" -sTCP:LISTEN -t 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
      echo "[supervisor] killing stale listeners on :$p ($pids)"
      kill -9 $pids 2>/dev/null || true
    fi
  done
  pkill -9 -f "trendx/apps.*(nodemon|next dev|tsx watch|nest start)" 2>/dev/null || true
}

trap 'echo "[supervisor] SIGTERM received, stopping..."; write_state 0 stopped 0; kill 0 2>/dev/null; exit 0' SIGINT SIGTERM

echo "[supervisor] starting trendx dev (web:4002, api:4001)"
write_state 0 starting 0

while true; do
  cleanup_ports
  last_start=$(date +%s)

  pnpm dev >> "$LOG_FILE" 2>&1 &
  child=$!
  write_state $child running 0
  echo "[supervisor] pnpm dev started (pid=$child) — log: $LOG_FILE"

  wait $child
  exit_code=$?
  uptime=$(( $(date +%s) - last_start ))
  restarts=$((restarts + 1))
  write_state 0 crashed $exit_code

  # If it ran fine for a while, reset backoff feel.
  if (( uptime >= 60 )); then
    backoff=2
  else
    # Exponential: 2s,4s,8s,16s,30s cap
    backoff=$(( 2 * (restarts > 4 ? 16 : 1 << (restarts > 4 ? 4 : restarts - 1)) ))
    (( backoff > 30 )) && backoff=30
  fi
  echo "[supervisor] pnpm dev exited code=$exit_code after ${uptime}s. restart #$restarts in ${backoff}s..."
  sleep "$backoff"
done
