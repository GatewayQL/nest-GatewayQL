# Federation E2E Tests

This directory contains comprehensive End-to-End tests for the **GraphQL Federation** example, demonstrating testing strategies for microservices architecture with **NestJS** and **Apollo Federation**.

## 🧪 Test Structure

```
test/
├── e2e/
│   ├── products-service.e2e-spec.ts      # Products service isolated tests
│   ├── reviews-service.e2e-spec.ts       # Reviews service isolated tests
│   └── federation-gateway.e2e-spec.ts    # Full federation integration tests
├── utils/
│   ├── test-setup.ts                     # Global test configuration
│   ├── test-helpers.ts                   # Common test utilities
│   ├── docker-helpers.ts                 # Docker container management
│   └── integration-helpers.ts            # Federation test scenarios
├── jest-e2e.json                         # Jest configuration
└── README.md                             # This file
```

## 🚀 Quick Start

### Run All Tests

```bash
# From examples directory
./scripts/test-federation.sh
```

### Run Specific Test Suites

```bash
# Products service only
./scripts/test-federation.sh products

# Reviews service only
./scripts/test-federation.sh reviews

# Federation gateway only
./scripts/test-federation.sh gateway

# Watch mode
./scripts/test-federation.sh watch

# With coverage
./scripts/test-federation.sh coverage
```

### Run Tests with NPM

```bash
# Install dependencies first
npm install

# Run all E2E tests
npm run test:e2e

# Run specific tests
npm run test:products
npm run test:reviews
npm run test:federation

# Coverage report
npm run test:cov
```

## 📋 Test Categories

### 1. Products Service E2E (`products-service.e2e-spec.ts`)

Tests the **Products microservice** in isolation:

#### **Product Queries**
- ✅ Empty state handling
- ✅ Retrieve all products
- ✅ Get specific product by ID
- ✅ Handle non-existent products

#### **Product Mutations**
- ✅ Create new products
- ✅ Input validation
- ✅ Remove products
- ✅ Seed sample data

#### **Federation Features**
- ✅ Entity reference resolution (`_entities`)
- ✅ Service SDL introspection (`_service`)

#### **Error Handling**
- ✅ Invalid UUID formats
- ✅ Database connection issues
- ✅ Validation errors

#### **Performance**
- ✅ Bulk operations
- ✅ Response time benchmarks

### 2. Reviews Service E2E (`reviews-service.e2e-spec.ts`)

Tests the **Reviews microservice** with federation capabilities:

#### **Review Queries**
- ✅ Empty state handling
- ✅ Retrieve all reviews
- ✅ Get specific review by ID
- ✅ Filter reviews by product ID

#### **Review Mutations**
- ✅ Create new reviews
- ✅ Rating validation (1-5)
- ✅ Remove reviews
- ✅ Handle optional reviewer names

#### **Federation Features**
- ✅ Product entity extension
- ✅ Cross-service relationship resolution
- ✅ Federation directive testing

#### **Business Logic**
- ✅ Multiple reviews per product
- ✅ Anonymous reviews
- ✅ Rating aggregation scenarios

### 3. Federation Gateway E2E (`federation-gateway.e2e-spec.ts`)

Tests the **complete federation** with all services:

#### **Individual Service Queries via Gateway**
- ✅ Products query routing
- ✅ Reviews query routing
- ✅ Service isolation verification

#### **Federated Cross-Service Queries**
- ✅ Products with their reviews
- ✅ Multiple products with reviews
- ✅ Mixed queries from both services
- ✅ Complex nested relationships

#### **Federated Mutations**
- ✅ Create products through gateway
- ✅ Create reviews through gateway
- ✅ End-to-end workflows

#### **Federation Error Handling**
- ✅ Service unavailability scenarios
- ✅ Invalid federated references
- ✅ Cross-service relationship errors

#### **Federation Performance**
- ✅ Complex federated queries
- ✅ Query optimization
- ✅ Response time testing

#### **Schema Composition**
- ✅ Schema merging verification
- ✅ Federation directive introspection
- ✅ Type system integration

## 🛠️ Test Utilities

### Core Helpers (`test-helpers.ts`)

```typescript
// GraphQL request helper
const gql = gqlRequest(app);
const response = await gql(`query { products { id name } }`);

// Assertions
const data = expectGraphQLSuccess(response);
expectGraphQLError(response);

// Database management
await cleanDatabase(app, [Product, Review]);

// Service readiness
await waitForService('http://localhost:4001/graphql');
```

### Docker Management (`docker-helpers.ts`)

```typescript
// Docker environment setup
const manager = new DockerTestManager(FEDERATION_TEST_ENVIRONMENT);
await manager.startServices();
await manager.stopServices();

// Service health monitoring
const isHealthy = await manager.isServiceHealthy('products_service');
const logs = await manager.getLogs('products_service');
```

### Integration Scenarios (`integration-helpers.ts`)

```typescript
// Scenario builder
const suite = new FederationTestSuite();
await suite.setup();

const scenario = suite.createScenario();
await scenario
  .withProducts(TEST_SCENARIOS.ecommerce.products)
  .withReviews(TEST_SCENARIOS.ecommerce.reviews);

const result = await scenario.queryProductsWithReviews();
```

## 📊 Test Scenarios

### E-commerce Scenario
```typescript
const ecommerce = {
  products: [
    { name: 'Gaming Laptop', price: 1299.99, category: 'Electronics' },
    { name: 'Wireless Mouse', price: 29.99, category: 'Electronics' },
    { name: 'Standing Desk', price: 299.99, category: 'Furniture' },
  ],
  reviews: [
    { productIndex: 0, rating: 5, comment: 'Amazing performance!' },
    { productIndex: 0, rating: 4, comment: 'Good value' },
    // ...
  ]
};
```

### Performance Testing
```typescript
const performance = {
  products: Array.from({ length: 20 }, (_, i) => ({
    name: `Performance Product ${i + 1}`,
    price: Math.random() * 500 + 50,
    category: ['Electronics', 'Home', 'Sports'][i % 3],
  })),
  // 50 reviews across 20 products
};
```

## 🔧 Configuration

### Jest Configuration (`jest-e2e.json`)

```json
{
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "setupFilesAfterEnv": ["<rootDir>/utils/test-setup.ts"],
  "testTimeout": 60000,
  "verbose": true
}
```

### Environment Variables

```bash
# Test database configuration
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Service URLs
PRODUCTS_SERVICE_URL=http://localhost:4001/graphql
REVIEWS_SERVICE_URL=http://localhost:4002/graphql
GATEWAY_SERVICE_URL=http://localhost:3000/graphql
```

## 🐛 Debugging Tests

### Debug Mode

```bash
# Run tests in debug mode
./scripts/test-federation.sh debug

# Or with npm
npm run test:debug
```

### View Service Logs

```bash
# All services
npm run docker:logs

# Specific service
docker-compose -f docker-compose.federation.yml logs -f products_service
```

### Test-Specific Debugging

```typescript
// Add debugging to individual tests
it('should debug federation query', async () => {
  const response = await gql(`query { products { id name } }`);

  console.log('Response:', JSON.stringify(response.body, null, 2));

  if (response.body.errors) {
    console.error('GraphQL Errors:', response.body.errors);
  }
});
```

## 📈 Performance Testing

### Response Time Benchmarks

```typescript
it('should handle bulk operations efficiently', async () => {
  const startTime = Date.now();

  // Perform bulk operations
  await Promise.all(bulkOperations);

  const endTime = Date.now();
  expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
});
```

### Memory Usage Testing

```typescript
beforeEach(() => {
  const memUsage = process.memoryUsage();
  console.log('Memory usage:', memUsage);
});
```

## 🧹 Test Cleanup

### Database Cleanup

```typescript
beforeEach(async () => {
  // Clean databases before each test
  await cleanDatabase(productsApp, [Product]);
  await cleanDatabase(reviewsApp, [Review]);
});
```

### Service Cleanup

```typescript
afterAll(async () => {
  // Graceful shutdown
  await gatewayApp?.close();
  await reviewsApp?.close();
  await productsApp?.close();
});
```

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Federation E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5433:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd examples
          ./scripts/install-dependencies.sh

      - name: Run E2E tests
        run: |
          cd examples
          ./scripts/test-federation.sh all true
```

## 📊 Coverage Reports

### Generate Coverage

```bash
./scripts/test-federation.sh coverage
```

Coverage reports are generated in:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format
- `coverage/coverage-final.json` - JSON format

### Coverage Targets

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 85%
- **Lines**: > 80%

## 🎯 Best Practices

### 1. Test Isolation
- Each test starts with a clean database
- Services are isolated by port and database
- No shared state between tests

### 2. Error Testing
- Test both success and failure scenarios
- Validate error messages and codes
- Test edge cases and boundary conditions

### 3. Performance Awareness
- Include performance benchmarks
- Test with realistic data volumes
- Monitor memory usage and response times

### 4. Federation-Specific Testing
- Test entity references and extensions
- Verify schema composition
- Test cross-service relationships

### 5. Maintainable Tests
- Use helper functions and utilities
- Create reusable test scenarios
- Document complex test logic

## 🔗 Related Documentation

- [Federation Example README](../README.md)
- [GatewayQL Documentation](../../README.md)
- [Apollo Federation Testing Guide](https://www.apollographql.com/docs/federation/testing/)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)

## 🤝 Contributing

To add new tests:

1. Follow the existing test structure
2. Add new scenarios to `integration-helpers.ts`
3. Include both positive and negative test cases
4. Update this README with new test categories
5. Ensure tests are deterministic and fast

## 📄 License

These tests are part of the GatewayQL project and follow the same license.