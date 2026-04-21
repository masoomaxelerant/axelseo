#!/bin/bash
# Render build script for the API + Worker service
# Installs Python deps, Node.js (for Lighthouse), Playwright browsers, and Chromium

set -e

echo "=== Installing Python dependencies ==="
pip install -e ".[dev]"
pip install -e ../../packages/crawler
pip install -e ../../packages/auditor

echo "=== Installing Playwright browsers ==="
python -m playwright install chromium
python -m playwright install-deps chromium 2>/dev/null || true

echo "=== Installing Node.js + Lighthouse ==="
# Node.js should already be available on Render
if command -v node &>/dev/null; then
    echo "Node.js found: $(node --version)"
    npm install -g lighthouse
    echo "Lighthouse installed"
else
    echo "WARNING: Node.js not found — Lighthouse scores will be unavailable"
    echo "Add a Node.js environment to your Render service"
fi

echo "=== Running database migrations ==="
alembic upgrade head

echo "=== Build complete ==="
