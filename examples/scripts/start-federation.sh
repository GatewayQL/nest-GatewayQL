#!/bin/bash

# GraphQL Federation Example Startup Script
# This script starts all federation services using Docker Compose

set -e

echo "🚀 Starting GraphQL Federation Example..."
echo "========================================"

# Change to examples directory
cd "$(dirname "$0")/.."

# Stop any existing containers
echo "📦 Stopping any existing containers..."
docker-compose -f docker-compose.federation.yml down

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker-compose -f docker-compose.federation.yml pull postgres

# Build and start services
echo "🔨 Building and starting federation services..."
docker-compose -f docker-compose.federation.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
echo "Checking PostgreSQL..."
until docker-compose -f docker-compose.federation.yml exec -T federation_postgres pg_isready -U postgres; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready"

echo "Checking Products Service..."
until curl -f http://localhost:4001/graphql > /dev/null 2>&1; do
  echo "Products Service is unavailable - sleeping"
  sleep 2
done
echo "✅ Products Service is ready"

echo "Checking Reviews Service..."
until curl -f http://localhost:4002/graphql > /dev/null 2>&1; do
  echo "Reviews Service is unavailable - sleeping"
  sleep 2
done
echo "✅ Reviews Service is ready"

echo "Checking Gateway Service..."
until curl -f http://localhost:3000/health > /dev/null 2>&1; do
  echo "Gateway Service is unavailable - sleeping"
  sleep 2
done
echo "✅ Gateway Service is ready"

echo ""
echo "🎉 Federation Example is ready!"
echo "==============================="
echo ""
echo "📍 Service URLs:"
echo "   🌟 Gateway (Federation):  http://localhost:3000/graphql"
echo "   🛍️  Products Service:      http://localhost:4001/graphql"
echo "   ⭐ Reviews Service:       http://localhost:4002/graphql"
echo "   🔧 Admin GraphQL:         http://localhost:3000/admin"
echo "   ❤️  Health Check:         http://localhost:3000/health"
echo ""
echo "📊 Database:"
echo "   🐘 PostgreSQL:            localhost:5433"
echo "       - products_service"
echo "       - reviews_service"
echo "       - gatewayql"
echo ""
echo "📚 To seed example data, run:"
echo "   ./scripts/seed-data.sh"
echo ""
echo "🔍 To view logs, run:"
echo "   docker-compose -f docker-compose.federation.yml logs -f [service_name]"
echo ""
echo "🛑 To stop all services, run:"
echo "   ./scripts/stop-federation.sh"