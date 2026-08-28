#!/bin/bash
# BHULEKH LEDGER - Digital Land Governance & Ownership Platform Startup Script

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================================================="
echo "  BHULEKH LEDGER | Verifiable Digital Land Governance Platform   "
echo "================================================================="
echo "Starting FastAPI Backend and Next.js Light-Mode Frontend..."

# 1. Start FastAPI Backend on Port 8000
cd "$PROJECT_ROOT/backend"
if [ ! -d "venv" ]; then
    echo "Creating python venv..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi

echo "Seeding database..."
./venv/bin/python seed_data.py

echo "Launching FastAPI Backend on http://localhost:8000 ..."
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 2. Start Next.js Frontend on Port 3000
cd "$PROJECT_ROOT/frontend"
echo "Launching Next.js Frontend on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!

echo "-----------------------------------------------------------------"
echo "  Backend API:  http://localhost:8000"
echo "  API Docs:     http://localhost:8000/docs"
echo "  Frontend UI:  http://localhost:3000"
echo "-----------------------------------------------------------------"
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
