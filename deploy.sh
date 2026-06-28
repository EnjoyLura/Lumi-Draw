#!/bin/bash
set -e

echo "=== Lumi-Draw Deploy ==="

cd /home/ubuntu/Lumi-Draw

# Build admin
echo "[1/4] Building admin..."
cd admin && npx vite build && cd ..

# Build miniapp H5
echo "[2/4] Building miniapp H5..."
cd miniapp && npx uni build -p h5 && cd ..

# Build and start docker
echo "[3/4] Building Docker containers..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose build server

echo "[4/4] Starting services..."
docker compose up -d

echo ""
echo "=== Deploy Complete ==="
echo "API:      http://122.51.235.145/api/health"
echo "Admin:    http://122.51.235.145/admin"
echo "Miniapp:  http://122.51.235.145"
echo ""

docker compose ps
