# GraphQL Federation E2E Test

This directory contains end-to-end tests demonstrating **Apollo Federation** with **NestJS GraphQL** using **GatewayQL**.

## Overview

The test demonstrates a complete federated GraphQL architecture with:

- **2 Subgraph Services**: Products and Reviews
- **1 Gateway Service**: Apollo Gateway that merges both schemas
- **Federation Features**: Cross-service queries, entity references, and schema stitching

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Apollo Gateway                      │
│              (Port: Dynamic in tests)                │
│                                                       │
│  Merges schemas from both subgraphs using            │
│  IntrospectAndCompose                                │
└───────────────┬─────────────────┬───────────────────┘
                │                 │
        ┌───────▼──────┐   ┌──────▼───────┐
        │   Products   │   │   Reviews    │
        │   Service    │   │   Service    │
        │  Port: 4001  │   │  Port: 4002  │
        └──────────────┘   └──────────────┘
```

## Services

### Products Service (Port 4001)

**Schema:**

```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
  category: String!
  reviews: [Review] # Federated from Reviews service
}

type Query {
  products: [Product!]!
  product(id: ID!): Product
}

type Mutation {
  createProduct(name: String!, price: Float!, category: String!): Product!
}
```

**Mock Data:**

- Laptop ($999.99, Electronics)
- Coffee Maker ($79.99, Home)
- Desk Chair ($249.99, Furniture)

### Reviews Service (Port 4002)

**Schema:**

```graphql
type Review @key(fields: "id") {
  id: ID!
  productId: String!
  rating: Int!
  comment: String!
}

extend type Product @key(fields: "id") {
  id: ID! @external
  reviews: [Review!]!
}

type Query {
  reviews: [Review!]!
  reviewsByProduct(productId: String!): [Review!]!
}

type Mutation {
  createReview(productId: String!, rating: Int!, comment: String!): Review!
}
```

**Mock Data:**

- 2 reviews for Laptop (ratings: 5, 4)
- 1 review for Coffee Maker (rating: 5)
- 1 review for Desk Chair (rating: 3)

## Test Scenarios

### 1. Individual Service Queries

Tests that each service works independently:

- ✅ Query all products from Products service
- ✅ Query single product by ID
- ✅ Query all reviews from Reviews service
- ✅ Query reviews filtered by product ID

### 2. Federated Gateway Queries

Tests the gateway's ability to route and merge queries:

- ✅ Query products through gateway
- ✅ Query reviews through gateway
- ✅ **Merge queries from both services in a single request**
- ✅ **Federated query: Product with its reviews (cross-service)**
- ✅ **Complex query: All products with their reviews**

### 3. Mutations

Tests write operations through the gateway:

- ✅ Create product via gateway
- ✅ Create review via gateway

## Key Features Demonstrated

### 1. Apollo Federation Directives

```typescript
@ObjectType()
@Directive('@key(fields: "id")')
class Product {
  @Field(() => ID)
  id: string;
  // ... other fields
}
```

### 2. Schema Extension

The Reviews service extends the Product type:

```typescript
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
class Product {
  @Field(() => ID)
  @Directive('@external')
  id: string;
}
```

### 3. Reference Resolvers

Linking entities across services:

```typescript
@Resolver(() => Product)
class ProductResolver {
  @ResolveField(() => [Review])
  reviews(@Parent() product: Product): Review[] {
    return reviews.filter((r) => r.productId === product.id);
  }
}
```

### 4. Gateway Configuration

Using `IntrospectAndCompose` for dynamic schema composition:

```typescript
GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
  driver: ApolloGatewayDriver,
  gateway: {
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'products', url: 'http://localhost:4001/graphql' },
        { name: 'reviews', url: 'http://localhost:4002/graphql' },
      ],
    }),
  },
});
```

## Running the Tests

### Prerequisites

```bash
npm install
```

### Run E2E Tests

```bash
# Build the project
npm run pretest:e2e

# Run all e2e tests
npm run test:e2e

# Run only federation tests
npm run test:e2e -- gateway-federation.e2e-spec.ts
```

### Run in Watch Mode

```bash
# For development
jest --config ./dist-test/test/jest-e2e.json --watch gateway-federation
```

## Example Queries

### Query Products with Reviews (Federated)

```graphql
query {
  product(id: "1") {
    id
    name
    price
    category
    reviews {
      id
      rating
      comment
    }
  }
}
```

**Response:**

```json
{
  "data": {
    "product": {
      "id": "1",
      "name": "Laptop",
      "price": 999.99,
      "category": "Electronics",
      "reviews": [
        {
          "id": "1",
          "rating": 5,
          "comment": "Excellent laptop!"
        },
        {
          "id": "2",
          "rating": 4,
          "comment": "Good value for money"
        }
      ]
    }
  }
}
```

### Merged Query from Both Services

```graphql
query {
  products {
    id
    name
    price
  }
  reviews {
    id
    rating
    comment
  }
}
```

This single query fetches data from **both** subgraph services through the gateway!

## How It Works

1. **Service Initialization**: The test starts both Products and Reviews services on separate ports
2. **Gateway Setup**: Apollo Gateway introspects both services and composes a unified schema
3. **Query Execution**:
   - Simple queries are routed to the appropriate service
   - Federated queries are split across services and merged by the gateway
4. **Entity Resolution**: When querying `product.reviews`, the gateway:
   - Fetches the product from Products service
   - Passes the product ID to Reviews service
   - Merges the results

## Benefits of This Approach

- ✅ **Separation of Concerns**: Each service owns its domain
- ✅ **Independent Deployment**: Services can be deployed separately
- ✅ **Type Safety**: Full TypeScript support across services
- ✅ **Schema Composition**: Automatic schema merging
- ✅ **Performance**: Efficient query planning and execution
- ✅ **Scalability**: Services can scale independently

## Adapting for Your Use Case

To use this pattern in your own project:

1. **Create Subgraph Services**: Define your domain services with `@key` directives
2. **Extend Types**: Use `@extends` and `@external` for cross-service relationships
3. **Configure Gateway**: Set up `IntrospectAndCompose` with your service URLs
4. **Test Federation**: Use this test as a template for your scenarios

## References

- [Apollo Federation Documentation](https://www.apollographql.com/docs/federation/)
- [NestJS GraphQL](https://docs.nestjs.com/graphql/quick-start)
- [Apollo Gateway](https://www.apollographql.com/docs/apollo-server/using-federation/apollo-gateway-setup/)
