#!/bin/bash
cd /home/codex/Desktop/CBC-Senior-School-Management-System/CBC-Senior-School-Management-System/backend
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started: PID=$BACKEND_PID"

cd /home/codex/Desktop/CBC-Senior-School-Management-System/CBC-Senior-School-Management-System/frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started: PID=$FRONTEND_PID"

sleep 5
echo ""
echo "Servers running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:5000"
