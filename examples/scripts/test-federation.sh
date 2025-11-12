#!/bin/bash

# Federation E2E Test Runner Script
# This script runs comprehensive E2E tests for the federation example

set -e

echo "🧪 Running Federation E2E Tests..."
echo "=================================="

# Change to examples directory
cd "$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Check if services are running
check_services() {
  print_status $BLUE "🔍 Checking if services are running..."

  local services=("http://localhost:4001/graphql" "http://localhost:4002/graphql" "http://localhost:3000/health")
  local all_running=true

  for service in "${services[@]}"; do
    if curl -f -s "$service" > /dev/null 2>&1; then
      print_status $GREEN "✅ Service at $service is running"
    else
      print_status $YELLOW "⚠️  Service at $service is not running"
      all_running=false
    fi
  done

  if [ "$all_running" = false ]; then
    print_status $YELLOW "🚀 Starting services..."
    ./scripts/start-federation.sh
    sleep 10
  fi
}

# Install dependencies if needed
install_deps() {
  print_status $BLUE "📦 Checking dependencies..."

  if [ ! -d "node_modules" ]; then
    print_status $YELLOW "📥 Installing test dependencies..."
    npm install
  fi

  if [ ! -d "services/products-service/node_modules" ] || [ ! -d "services/reviews-service/node_modules" ]; then
    print_status $YELLOW "📥 Installing service dependencies..."
    ./scripts/install-dependencies.sh
  fi

  print_status $GREEN "✅ Dependencies ready"
}

# Run specific test suites
run_tests() {
  local test_type=${1:-"all"}

  case $test_type in
    "products")
      print_status $BLUE "🛍️  Running Products Service tests..."
      npm run test:products
      ;;
    "reviews")
      print_status $BLUE "⭐ Running Reviews Service tests..."
      npm run test:reviews
      ;;
    "gateway")
      print_status $BLUE "🌐 Running Federation Gateway tests..."
      npm run test:federation
      ;;
    "all")
      print_status $BLUE "🧪 Running all E2E tests..."

      print_status $BLUE "1️⃣  Products Service E2E Tests"
      npm run test:products

      print_status $BLUE "2️⃣  Reviews Service E2E Tests"
      npm run test:reviews

      print_status $BLUE "3️⃣  Federation Gateway E2E Tests"
      npm run test:federation
      ;;
    "watch")
      print_status $BLUE "👀 Running tests in watch mode..."
      npm run test:watch
      ;;
    "coverage")
      print_status $BLUE "📊 Running tests with coverage..."
      npm run test:cov
      ;;
    "debug")
      print_status $BLUE "🐛 Running tests in debug mode..."
      npm run test:debug
      ;;
    *)
      print_status $RED "❌ Unknown test type: $test_type"
      echo "Available options: products, reviews, gateway, all, watch, coverage, debug"
      exit 1
      ;;
  esac
}

# Generate test report
generate_report() {
  print_status $BLUE "📊 Generating test report..."

  if [ -f "coverage/lcov-report/index.html" ]; then
    print_status $GREEN "✅ Coverage report generated: coverage/lcov-report/index.html"
  fi
}

# Cleanup function
cleanup() {
  print_status $BLUE "🧹 Test cleanup..."

  # Optional: Stop services if they were started by this script
  # Uncomment if you want automatic cleanup
  # ./scripts/stop-federation.sh
}

# Main execution
main() {
  local test_type=${1:-"all"}
  local skip_setup=${2:-"false"}

  print_status $BLUE "🎯 Test Target: $test_type"

  # Setup
  if [ "$skip_setup" != "true" ]; then
    install_deps
    check_services
  fi

  # Seed test data
  if [ "$test_type" = "all" ] || [ "$test_type" = "gateway" ]; then
    print_status $BLUE "🌱 Seeding test data..."
    ./scripts/seed-data.sh || print_status $YELLOW "⚠️  Seeding failed, tests will create their own data"
  fi

  # Run tests
  print_status $BLUE "🚀 Starting test execution..."
  start_time=$(date +%s)

  run_tests "$test_type"

  end_time=$(date +%s)
  duration=$((end_time - start_time))

  # Results
  print_status $GREEN "🎉 Tests completed successfully!"
  print_status $BLUE "⏱️  Total time: ${duration}s"

  generate_report

  print_status $BLUE "📋 Next Steps:"
  echo ""
  echo "🌐 Access services:"
  echo "   Products:  http://localhost:4001/graphql"
  echo "   Reviews:   http://localhost:4002/graphql"
  echo "   Gateway:   http://localhost:3000/graphql"
  echo ""
  echo "🔧 Available commands:"
  echo "   ./scripts/test-federation.sh [products|reviews|gateway|all|watch|coverage|debug]"
  echo "   ./scripts/stop-federation.sh    # Stop all services"
  echo "   npm run docker:logs             # View service logs"
  echo ""
}

# Handle script arguments
case "${1:-}" in
  "--help" | "-h")
    echo "Federation E2E Test Runner"
    echo ""
    echo "Usage: $0 [test_type] [skip_setup]"
    echo ""
    echo "Test types:"
    echo "  products   - Run Products service E2E tests"
    echo "  reviews    - Run Reviews service E2E tests"
    echo "  gateway    - Run Federation gateway E2E tests"
    echo "  all        - Run all E2E tests (default)"
    echo "  watch      - Run tests in watch mode"
    echo "  coverage   - Run tests with coverage report"
    echo "  debug      - Run tests in debug mode"
    echo ""
    echo "Options:"
    echo "  skip_setup - Skip dependency installation and service checks"
    echo ""
    echo "Examples:"
    echo "  $0 all                    # Run all tests"
    echo "  $0 gateway               # Run only gateway tests"
    echo "  $0 watch                 # Run in watch mode"
    echo "  $0 coverage              # Generate coverage report"
    echo "  $0 all true              # Skip setup, run all tests"
    exit 0
    ;;
  *)
    # Trap cleanup on script exit
    trap cleanup EXIT

    # Run main function with arguments
    main "${1:-all}" "${2:-false}"
    ;;
esac