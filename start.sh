#!/usr/bin/env bash
#
# I.P. & M.D Platform — Start All Services (Windows Git Bash / Linux / Mac)
# Usage: ./start.sh
#
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Detect OS for venv paths
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    VENV_PYTHON="Scripts/python.exe"
    VENV_UVICORN="Scripts/uvicorn.exe"
    IS_WINDOWS=1
else
    VENV_PYTHON="bin/python"
    VENV_UVICORN="bin/uvicorn"
    IS_WINDOWS=0
fi

echo ""
echo "============================================"
echo "  I.P. & M.D Platform — Starting Services"
echo "============================================"
echo ""

# ─── 1. Docker Infrastructure ───
echo "[1/4] Starting Docker infrastructure..."
if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    docker-compose up -d 2>&1
    echo "  OK   PostgreSQL (port 5434) + Redis (port 6379)"
    echo "  Waiting for PostgreSQL..."
    sleep 3
else
    echo "  SKIP Docker Desktop not running. Starting services without Docker."
    echo "  (Start Docker Desktop manually if you need the database)"
fi

# ─── 2. Database Migrations ───
echo "[2/4] Running database migrations..."
API_DIR="$PROJECT_ROOT/services/api"
cd "$API_DIR"
if [ -d ".venv" ]; then
    ".venv/$VENV_PYTHON" -m alembic upgrade head 2>/dev/null || echo "  WARN: Migrations failed (database may not be running)"
else
    python -m alembic upgrade head 2>/dev/null || echo "  WARN: Migrations failed"
fi
echo "  OK   Migrations done"

# ─── 3. Seed Demo Users ───
echo "[3/4] Seeding demo users..."
if [ -d ".venv" ]; then
    ".venv/$VENV_PYTHON" -m app.seed 2>&1 || echo "  WARN: Seed failed (database may not be running)"
else
    python -m app.seed 2>&1 || echo "  WARN: Seed failed"
fi
echo "  OK   Seed done"

# ─── 4. Start All Services ───
echo "[4/4] Starting services..."
echo ""

# API Backend (port 8000)
cd "$API_DIR"
if [ -d ".venv" ]; then
    ".venv/$VENV_UVICORN" app.main:app --host 0.0.0.0 --port 8000 --reload &
else
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
fi
API_PID=$!
echo "  API Backend    → http://localhost:8000  (PID $API_PID)"

# AI Service (port 8001)
cd "$PROJECT_ROOT/services/ai"
if [ -d ".venv" ]; then
    ".venv/$VENV_UVICORN" app.main:app --host 0.0.0.0 --port 8001 --reload &
else
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
fi
AI_PID=$!
echo "  AI Service     → http://localhost:8001  (PID $AI_PID)"

# Next.js Frontend (port 3000)
cd "$PROJECT_ROOT/apps/web"
if [ -f "node_modules/.bin/next" ]; then
    npx next dev &
else
    npm run dev &
fi
WEB_PID=$!
echo "  Web Frontend   → http://localhost:3000  (PID $WEB_PID)"

echo ""
echo "============================================"
echo "  All services started!"
echo "  Frontend:  http://localhost:3000"
echo "  API:       http://localhost:8000/docs"
echo "  AI:        http://localhost:8001/docs"
echo "  Database:  localhost:5434 (if Docker running)"
echo "  Redis:     localhost:6379 (if Docker running)"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $API_PID $AI_PID $WEB_PID 2>/dev/null || true
    wait $API_PID $AI_PID $WEB_PID 2>/dev/null || true
    echo "Done."
}
trap cleanup EXIT INT TERM

# Wait for any process to exit
wait
