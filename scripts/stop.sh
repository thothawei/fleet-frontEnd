#!/usr/bin/env bash
# 強制關閉前後端（不論當初怎麼啟動的）。
set -uo pipefail

ADMIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$(cd "$ADMIN_DIR/../line-fleet-dispatch" && pwd)"

echo "■ 關閉前端 (vite)..."
if pkill -f "vite" 2>/dev/null; then echo "  已停止 vite"; else echo "  無執行中的 vite"; fi

echo "■ 關閉後端 (docker compose down)..."
( cd "$BACKEND_DIR" && docker compose down )

echo "✔ 前後端已全部關閉"
