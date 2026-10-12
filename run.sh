#!/usr/bin/env bash
set -e

echo "====================================================================="
echo "  RELAY - TCP/HTTP Session Proxy and Load Balancer"
echo "  Computer Networks Monorepo"
echo "====================================================================="

if ! command -v java &> /dev/null; then
    echo "[ERROR] Java 17+ is required but not found in PATH."
    exit 1
fi

echo "[1/3] Building Web Dashboard bundle (if needed)..."
if [ ! -f "web/dist/index.html" ]; then
    (cd web && npm install && npm run build)
fi

echo "[2/3] Starting Relay Engine and Control-Plane..."
echo ""
echo "====================================================================="
echo "  SERVICES LISTENING:"
echo "  - Web Management UI:      http://localhost:8000/"
echo "  - Control-Plane REST API: http://localhost:8000/api/..."
echo "  - Live WebSocket Stream:  ws://localhost:8000/live"
echo "  - Raw Socket Load Balancer Engine: http://localhost:8080/"
echo "    - /api/*    -> API Pool (Ports 9001, 9002)"
echo "    - /static/* -> Static Pool (Ports 9003, 9004)"
echo ""
echo "  DEMO CREDENTIALS:"
echo "  - Email:    demo@relay.dev"
echo "  - Password: Demo@1234"
echo "====================================================================="
echo ""

chmod +x ./gradlew || true
./gradlew :api:run
