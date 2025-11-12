#!/bin/bash

# Seed Example Data Script
# This script seeds the federation services with example data

set -e

echo "🌱 Seeding Federation Example Data..."
echo "===================================="

# Function to make GraphQL requests
make_graphql_request() {
  local url=$1
  local query=$2
  local description=$3

  echo "📤 $description..."
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"$query\"}" \
    "$url")

  if echo "$response" | grep -q '"errors"'; then
    echo "❌ Error: $response"
    return 1
  else
    echo "✅ Success"
    return 0
  fi
}

echo ""
echo "🛍️  Seeding Products Service..."
echo "==============================="

# Seed products
make_graphql_request \
  "http://localhost:4001/graphql" \
  "mutation { seedProducts { id name price category } }" \
  "Creating sample products"

echo ""
echo "⭐ Seeding Reviews Service..."
echo "============================="

# Seed reviews
make_graphql_request \
  "http://localhost:4002/graphql" \
  "mutation { seedReviews { id productId rating comment reviewerName } }" \
  "Creating sample reviews"

echo ""
echo "🌟 Testing Federation Gateway..."
echo "==============================="

# Test federated query
echo "📤 Testing federated product with reviews query..."
federated_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"query { products { id name price category } reviews { id rating comment reviewerName } }"}' \
  "http://localhost:3000/graphql")

if echo "$federated_response" | grep -q '"errors"'; then
  echo "❌ Federation test failed: $federated_response"
else
  echo "✅ Federation test successful!"
fi

echo ""
echo "🎉 Data seeding completed!"
echo "========================="
echo ""
echo "📚 Example Queries to try:"
echo ""
echo "🔹 Get all products:"
echo 'curl -X POST -H "Content-Type: application/json" \'
echo '  -d '"'"'{"query":"{ products { id name price category } }"}'"'"' \'
echo '  http://localhost:3000/graphql'
echo ""
echo "🔹 Get all reviews:"
echo 'curl -X POST -H "Content-Type: application/json" \'
echo '  -d '"'"'{"query":"{ reviews { id rating comment reviewerName } }"}'"'"' \'
echo '  http://localhost:3000/graphql'
echo ""
echo "🔹 Get products with reviews (federated):"
echo 'curl -X POST -H "Content-Type: application/json" \'
echo '  -d '"'"'{"query":"{ products { id name price reviews { rating comment } } }"}'"'"' \'
echo '  http://localhost:3000/graphql'
echo ""
echo "🌐 Open GraphQL Playground:"
echo "   Products: http://localhost:4001/graphql"
echo "   Reviews:  http://localhost:4002/graphql"
echo "   Gateway:  http://localhost:3000/graphql"