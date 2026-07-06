#!/usr/bin/env bash
# 一起啟動「後端(docker) + 前端(vite)」；按 Ctrl+C 會一起關閉前後端。
set -uo pipefail

ADMIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$(cd "$ADMIN_DIR/../line-fleet-dispatch" && pwd)"

cleanup() {
  echo ""
  echo "■ 關閉前端 (vite)..."
  pkill -f "vite" 2>/dev/null || true
  echo "■ 關閉後端 (docker compose down)..."
  ( cd "$BACKEND_DIR" && docker compose down )
  echo "✔ 前後端已全部關閉"
}
# 不論正常結束或 Ctrl+C，都收尾
trap cleanup EXIT INT TERM

echo "▶ 啟動後端 (docker，含 build)... 位置：$BACKEND_DIR"
( cd "$BACKEND_DIR" && docker compose up --build -d ) || { echo "後端啟動失敗"; exit 1; }

echo "▶ 後端就緒於 http://localhost:8080"
echo "▶ 啟動前端 (vite dev)... 按 Ctrl+C 可一起關閉前後端"
cd "$ADMIN_DIR"
npm run dev
