#!/bin/bash

# Update Gateway Configuration Script
# This script updates the main gateway's .env file to enable federation

set -e

echo "🔧 Updating Gateway Configuration for Federation..."
echo "================================================"

# Change to project root directory
cd "$(dirname "$0")/../.."

# Backup existing .env file
if [ -f ".env" ]; then
  echo "📋 Backing up existing .env file..."
  cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Update SERVICE_ENDPOINTS in .env file
echo "🔄 Updating SERVICE_ENDPOINTS configuration..."

# Create the federation service endpoints configuration
FEDERATION_CONFIG='[{"name":"products","url":"http://localhost:4001/graphql"},{"name":"reviews","url":"http://localhost:4002/graphql"}]'

# Check if SERVICE_ENDPOINTS exists in .env
if grep -q "^SERVICE_ENDPOINTS=" .env 2>/dev/null; then
  # Replace existing SERVICE_ENDPOINTS
  echo "📝 Updating existing SERVICE_ENDPOINTS..."

  # Use sed to replace the line (works on both macOS and Linux)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^SERVICE_ENDPOINTS=.*|SERVICE_ENDPOINTS=$FEDERATION_CONFIG|" .env
  else
    # Linux
    sed -i "s|^SERVICE_ENDPOINTS=.*|SERVICE_ENDPOINTS=$FEDERATION_CONFIG|" .env
  fi
else
  # Add SERVICE_ENDPOINTS if it doesn't exist
  echo "➕ Adding SERVICE_ENDPOINTS configuration..."
  echo "" >> .env
  echo "# Federation services configuration" >> .env
  echo "SERVICE_ENDPOINTS=$FEDERATION_CONFIG" >> .env
fi

echo ""
echo "✅ Gateway configuration updated successfully!"
echo ""
echo "📋 Current SERVICE_ENDPOINTS configuration:"
echo "$FEDERATION_CONFIG"
echo ""
echo "💡 The gateway will now federate schemas from:"
echo "   🛍️  Products Service: http://localhost:4001/graphql"
echo "   ⭐ Reviews Service:  http://localhost:4002/graphql"
echo ""
echo "🚀 To apply changes, restart the gateway:"
echo "   npm run start:dev"
echo ""
echo "🔄 To revert to original configuration:"
echo "   Restore from backup: .env.backup.*"