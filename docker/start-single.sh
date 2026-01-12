#!/bin/sh
set -eu

export API_PORT="${API_PORT:-8787}"

node /app/server/api.mjs &
api_pid="$!"

term_handler() {
  kill "$api_pid" 2>/dev/null || true
  exit 0
}

trap term_handler INT TERM

nginx -g 'daemon off;' &
nginx_pid="$!"

wait "$nginx_pid"
kill "$api_pid" 2>/dev/null || true
