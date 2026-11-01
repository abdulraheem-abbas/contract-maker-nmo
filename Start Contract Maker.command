#!/bin/zsh
set -eu
TASK_CONTRACT_DIR="${0:A:h}"
if [[ -d "$TASK_CONTRACT_DIR/NMO Contract Maker.app" ]]; then
  /usr/bin/open "$TASK_CONTRACT_DIR/NMO Contract Maker.app"
else
  exec "$TASK_CONTRACT_DIR/.venv/bin/python" "$TASK_CONTRACT_DIR/run.py"
fi
