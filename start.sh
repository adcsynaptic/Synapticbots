#!/bin/bash
# ── SENTINEL Startup Script ──────────────────────────────────────────
# Starts the Next.js SaaS dashboard. The Python bot engine is started
# via the "Start Engine" button on the dashboard (spawns main.py).

# for local run use the following command:
# docker build -t synapticbots:local .
# docker run --rm -it -p 3000:3000 -v /home/adc/synaptic/nikhil_crypto/Synapticbots/data:/app/data --name synapticbots synapticbots:local


set -e

echo "🚀 Starting SENTINEL Dashboard..."

# Ensure data directory exists
mkdir -p /app/data

# Start Next.js SaaS dashboard (the bot is started via the UI)
cd /app/sentinel-saas/nextjs_space
exec npx next start -p ${PORT:-3000}
