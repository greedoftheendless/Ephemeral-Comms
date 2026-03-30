#!/usr/bin/env bash
PROJECT="$HOME/Ephemeral-Comms"
SESSION="ephemeral"
# Kill existing session if it exists
tmux kill-session -t "$SESSION" 2>/dev/null
# Create new session
tmux new-session -d -s "$SESSION" -c "$PROJECT"
# ── Pane 0: Backend ─────────────────────────────────────────
tmux send-keys -t "$SESSION:0" \
  "cd $PROJECT && nix develop --command bash -c 'cd backend && npm install && node server.js'" Enter
# ── Pane 1: Frontend ────────────────────────────────────────
tmux split-window -h -t "$SESSION:0" -c "$PROJECT"
tmux send-keys -t "$SESSION:0.1" \
  "cd $PROJECT && nix develop --command bash -c 'npm run dev'" Enter
# ── Pane 2: Selenium ────────────────────────────────────────
tmux split-window -v -t "$SESSION:0.1" -c "$PROJECT"
tmux send-keys -t "$SESSION:0.2" \
  "cd $PROJECT && nix-shell -p python313 python313Packages.selenium geckodriver --run 'python selenium-testing.py'" Enter
# Layout clean
tmux select-layout -t "$SESSION:0" tiled
# Attach
tmux attach-session -t "$SESSION"
