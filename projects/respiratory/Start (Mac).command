#!/bin/bash
# Serves this folder locally and opens the lesson in the default browser.
cd "$(dirname "$0")"
PORT=8000
while lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((PORT+1)); done
echo "Human Respiratory System lesson → http://localhost:$PORT/respiratory_system.html"
echo "Keep this window open while using the lesson. Close it (or press Ctrl+C) to stop."
( sleep 1; open "http://localhost:$PORT/respiratory_system.html" ) &
if command -v node >/dev/null 2>&1; then
  node scripts/build-config.js
  node scripts/serve.js $PORT
else
  python3 -m http.server $PORT
fi
