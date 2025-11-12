#!/bin/bash

# GraphQL Federation Example Stop Script
# This script stops all federation services

set -e

echo "🛑 Stopping GraphQL Federation Example..."
echo "========================================="

# Change to examples directory
cd "$(dirname "$0")/.."

# Stop all services
echo "📦 Stopping federation services..."
docker-compose -f docker-compose.federation.yml down

# Optional: Remove volumes (uncomment if you want to clear data)
# echo "🗑️  Removing volumes..."
# docker-compose -f docker-compose.federation.yml down -v

echo ""
echo "✅ Federation Example stopped successfully!"
echo ""
echo "💡 To start again, run:"
echo "   ./scripts/start-federation.sh"
echo ""
echo "🗑️  To completely remove all data, run:"
echo "   docker-compose -f docker-compose.federation.yml down -v"