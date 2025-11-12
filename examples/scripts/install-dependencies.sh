#!/bin/bash

# Install Dependencies for Federation Example
# This script installs Node.js dependencies for all services

set -e

echo "📦 Installing Federation Example Dependencies..."
echo "=============================================="

# Change to examples directory
cd "$(dirname "$0")/.."

# Function to install dependencies with error handling
install_deps() {
  local service_dir=$1
  local service_name=$2

  echo ""
  echo "📥 Installing $service_name dependencies..."
  echo "========================================="

  if [ -d "$service_dir" ]; then
    cd "$service_dir"

    if [ -f "package.json" ]; then
      echo "Found package.json in $service_dir"

      # Clean install
      if [ -d "node_modules" ]; then
        echo "Cleaning existing node_modules..."
        rm -rf node_modules package-lock.json
      fi

      echo "Running npm install..."
      npm install

      echo "✅ $service_name dependencies installed successfully!"
    else
      echo "❌ No package.json found in $service_dir"
      return 1
    fi

    # Return to examples directory
    cd "$(dirname "$0")/.."
  else
    echo "❌ Directory $service_dir not found"
    return 1
  fi
}

# Install dependencies for each service
echo "🚀 Installing dependencies for all federation services..."

# Products Service
install_deps "services/products-service" "Products Service"

# Reviews Service
install_deps "services/reviews-service" "Reviews Service"

echo ""
echo "🎉 All dependencies installed successfully!"
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. 🚀 Start the federation:"
echo "   ./scripts/start-federation.sh"
echo ""
echo "2. 🌱 Seed example data:"
echo "   ./scripts/seed-data.sh"
echo ""
echo "3. 🌐 Open GraphQL Playground:"
echo "   http://localhost:3000/graphql"
echo ""
echo "💡 For local development:"
echo "   cd services/products-service && npm run start:dev"
echo "   cd services/reviews-service && npm run start:dev"