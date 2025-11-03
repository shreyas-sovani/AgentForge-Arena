#!/bin/bash

# Start API server in background
echo "🚀 Starting API server..."
cd api && npm run dev &
API_PID=$!

# Wait for API to be ready
sleep 2

# Start frontend dev server
echo "🎨 Starting frontend dev server..."
cd frontend && npm run dev &
FRONTEND_PID=$!

# Trap CTRL+C and kill both processes
trap "echo '⏹️  Stopping servers...'; kill $API_PID $FRONTEND_PID; exit" INT

echo ""
echo "✅ Both servers running!"
echo "   API: http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press CTRL+C to stop both servers"

# Wait for both processes
wait
