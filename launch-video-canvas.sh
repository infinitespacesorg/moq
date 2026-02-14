#!/bin/bash
# Launch MoQ Video Canvas — starts relay + React dev server
# Usage: ./launch-video-canvas.sh [--react | --vanilla]
#
# --react   (default) Start the React video canvas
# --vanilla           Start the original vanilla TypeScript canvas

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RELAY_DIR="$SCRIPT_DIR/rs"
REACT_DIR="$SCRIPT_DIR/js/video-canvas-react"
VANILLA_DIR="$SCRIPT_DIR/js/video-canvas"

# Default to React version
CANVAS_DIR="$REACT_DIR"
CANVAS_LABEL="React"

while [[ $# -gt 0 ]]; do
  case $1 in
    --vanilla)
      CANVAS_DIR="$VANILLA_DIR"
      CANVAS_LABEL="Vanilla"
      shift
      ;;
    --react)
      CANVAS_DIR="$REACT_DIR"
      CANVAS_LABEL="React"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--react | --vanilla]"
      exit 1
      ;;
  esac
done

# Ensure tools are available
source "$HOME/.cargo/env" 2>/dev/null || true
export PATH="$HOME/.bun/bin:$PATH"

echo "╔══════════════════════════════════════════╗"
echo "║   MoQ Video Canvas — Infinite Spaces     ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Relay:  http://localhost:4443            ║"
echo "║  Canvas: http://localhost:5555            ║"
echo "║  Mode:   $CANVAS_LABEL$(printf '%*s' $((27 - ${#CANVAS_LABEL})) '')║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check for required tools
if ! command -v cargo &>/dev/null; then
  echo "ERROR: cargo not found. Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  exit 1
fi

if ! command -v bun &>/dev/null; then
  echo "ERROR: bun not found. Install bun: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

# Trap to kill both processes on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $RELAY_PID $CANVAS_PID 2>/dev/null
  wait $RELAY_PID $CANVAS_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# Start relay using dev config (anonymous access, self-signed TLS, port 4443)
echo "[relay] Building and starting moq-relay..."
cd "$RELAY_DIR"
cargo run --bin moq-relay -- moq-relay/cfg/dev.toml &
RELAY_PID=$!

# Wait a moment for relay to start binding
sleep 2

# Start video canvas dev server
echo "[$CANVAS_LABEL] Starting video canvas dev server on port 5555..."
cd "$CANVAS_DIR"
bun run dev -- --port 5555 &
CANVAS_PID=$!

echo ""
echo "Both services starting. Press Ctrl+C to stop."
echo ""

# Wait for either to exit
wait -n $RELAY_PID $CANVAS_PID
