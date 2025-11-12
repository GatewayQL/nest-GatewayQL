# GraphQL Federation Example

This directory contains a complete **Apollo Federation** example with **NestJS** demonstrating microservices architecture using **GatewayQL**.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GatewayQL Gateway                   │
│              (http://localhost:3000)                 │
│                                                      │
│  🔄 Federates schemas from microservices using      │
│     IntrospectAndCompose                            │
└───────────────┬─────────────────┬───────────────────┘
                │                 │
        ┌───────▼──────┐   ┌──────▼───────┐
        │   Products   │   │   Reviews    │
        │   Service    │   │   Service    │
        │  Port: 4001  │   │  Port: 4002  │
        └──────────────┘   └──────────────┘
                │                 │
        ┌───────▼──────┐   ┌──────▼───────┐
        │ products_db  │   │ reviews_db   │
        │ (PostgreSQL) │   │ (PostgreSQL) │
        └──────────────┘   └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

### 1. Start the Federation

```bash
# Make scripts executable (first time only)
chmod +x examples/scripts/*.sh

# Start all services
./examples/scripts/start-federation.sh
```

### 2. Seed Example Data

```bash
# Add sample products and reviews
./examples/scripts/seed-data.sh
```

### 3. Explore GraphQL

Visit the GraphQL Playground:
- **Gateway (Federation)**: http://localhost:3000/graphql
- **Products Service**: http://localhost:4001/graphql
- **Reviews Service**: http://localhost:4002/graphql
- **Admin API**: http://localhost:3000/admin

## 📁 Project Structure

```
examples/
├── services/
│   ├── products-service/          # Products microservice
│   │   ├── src/
│   │   │   ├── products/
│   │   │   │   ├── entities/      # TypeORM entities
│   │   │   │   ├── dto/           # GraphQL inputs
│   │   │   │   ├── products.service.ts
│   │   │   │   ├── products.resolver.ts
│   │   │   │   └── products.module.ts
│   │   │   ├── app.module.ts      # Federation configuration
│   │   │   └── main.ts
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env
│   │
│   └── reviews-service/           # Reviews microservice
│       ├── src/
│       │   ├── reviews/
│       │   │   ├── entities/      # TypeORM entities + Product extension
│       │   │   ├── dto/
│       │   │   ├── reviews.service.ts
│       │   │   ├── reviews.resolver.ts
│       │   │   └── reviews.module.ts
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── package.json
│       ├── Dockerfile
│       └── .env
│
├── scripts/
│   ├── init-databases.sql         # Database initialization
│   ├── start-federation.sh        # Start all services
│   ├── stop-federation.sh         # Stop all services
│   └── seed-data.sh              # Populate with sample data
│
├── docker-compose.federation.yml  # Complete stack definition
└── README.md                      # This file
```

## 🔧 Services

### Products Service (Port 4001)

**Responsibilities:**
- Manage product catalog
- Product CRUD operations
- Serve product data to federation

**GraphQL Schema:**
```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
  category: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Query {
  products: [Product!]!
  product(id: ID!): Product
}

type Mutation {
  createProduct(createProductInput: CreateProductInput!): Product!
  removeProduct(id: ID!): Boolean!
  seedProducts: [Product!]!
}
```

**Database:** `products_service` (PostgreSQL)

### Reviews Service (Port 4002)

**Responsibilities:**
- Manage product reviews
- Extend Product type with reviews field
- Handle review CRUD operations

**GraphQL Schema:**
```graphql
type Review @key(fields: "id") {
  id: ID!
  productId: String!
  rating: Int!
  comment: String!
  reviewerName: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

extend type Product @key(fields: "id") {
  id: ID! @external
  reviews: [Review!]!
}

type Query {
  reviews: [Review!]!
  review(id: ID!): Review
  reviewsByProduct(productId: String!): [Review!]!
}

type Mutation {
  createReview(createReviewInput: CreateReviewInput!): Review!
  removeReview(id: ID!): Boolean!
  seedReviews: [Review!]!
}
```

**Database:** `reviews_service` (PostgreSQL)

### Gateway Service (Port 3000)

**Responsibilities:**
- Federate subgraph schemas
- Route queries to appropriate services
- Merge federated query results
- Provide unified GraphQL API

**Configuration:**
```typescript
SERVICE_ENDPOINTS=[
  {"name":"products","url":"http://products_service:4001/graphql"},
  {"name":"reviews","url":"http://reviews_service:4002/graphql"}
]
```

## 🔍 Federation Features Demonstrated

### 1. Entity Keys
```typescript
@ObjectType()
@Directive('@key(fields: "id")')
class Product {
  @Field(() => ID)
  id: string;
}
```

### 2. Schema Extension
```typescript
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
class Product {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  @Field(() => [Review])
  reviews?: Review[];
}
```

### 3. Reference Resolvers
```typescript
@ResolveField(() => [Review])
reviews(@Parent() product: Product): Promise<Review[]> {
  return this.reviewsService.findByProductId(product.id);
}

@ResolveReference()
resolveReference(reference: { __typename: string; id: string }) {
  return this.productsService.findOne(reference.id);
}
```

## 📚 Example Queries

### Simple Service Queries

**Get all products:**
```graphql
query {
  products {
    id
    name
    price
    category
  }
}
```

**Get all reviews:**
```graphql
query {
  reviews {
    id
    rating
    comment
    reviewerName
  }
}
```

### Federated Queries

**Product with reviews (cross-service):**
```graphql
query {
  product(id: "550e8400-e29b-41d4-a716-446655440001") {
    id
    name
    price
    category
    reviews {
      id
      rating
      comment
      reviewerName
    }
  }
}
```

**All products with their reviews:**
```graphql
query {
  products {
    id
    name
    price
    reviews {
      rating
      comment
    }
  }
}
```

**Mixed query from both services:**
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

### Mutations

**Create a product:**
```graphql
mutation {
  createProduct(createProductInput: {
    name: "New Laptop"
    price: 1299.99
    category: "Electronics"
  }) {
    id
    name
    price
  }
}
```

**Create a review:**
```graphql
mutation {
  createReview(createReviewInput: {
    productId: "550e8400-e29b-41d4-a716-446655440001"
    rating: 5
    comment: "Amazing product!"
    reviewerName: "John Doe"
  }) {
    id
    rating
    comment
  }
}
```

## 🛠️ Development

### Running Services Locally

**Products Service:**
```bash
cd examples/services/products-service
npm install
npm run start:dev
```

**Reviews Service:**
```bash
cd examples/services/reviews-service
npm install
npm run start:dev
```

**Gateway Service:**
```bash
# From project root
SERVICE_ENDPOINTS='[{"name":"products","url":"http://localhost:4001/graphql"},{"name":"reviews","url":"http://localhost:4002/graphql"}]' npm run start:dev
```

### Database Management

**Connect to PostgreSQL:**
```bash
docker exec -it federation_postgres psql -U postgres -d products_service
```

**View logs:**
```bash
docker-compose -f examples/docker-compose.federation.yml logs -f products_service
```

### Testing Federation

**Test service health:**
```bash
curl http://localhost:4001/graphql  # Products
curl http://localhost:4002/graphql  # Reviews
curl http://localhost:3000/health   # Gateway
```

**Test federation query:**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ products { id name reviews { rating } } }"}' \
  http://localhost:3000/graphql
```

## 🔧 Configuration

### Environment Variables

**Products Service (.env):**
```env
NODE_ENV=development
PORT=4001
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=products_service
```

**Reviews Service (.env):**
```env
NODE_ENV=development
PORT=4002
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=reviews_service
```

**Gateway Service:**
```env
SERVICE_ENDPOINTS=[{"name":"products","url":"http://localhost:4001/graphql"},{"name":"reviews","url":"http://localhost:4002/graphql"}]
```

## 🧪 Testing

The services include comprehensive test examples in the main project's `test/e2e/federation/` directory.

**Run federation tests:**
```bash
# From project root
npm run test:e2e -- gateway-federation.e2e-spec.ts
```

## 🚀 Production Deployment

### Docker Production Build

```bash
# Build production images
docker-compose -f examples/docker-compose.federation.yml build

# Run in production mode
NODE_ENV=production docker-compose -f examples/docker-compose.federation.yml up -d
```

### Kubernetes Deployment

See `k8s/` directory for Kubernetes deployment manifests (coming soon).

## 📊 Monitoring

### Health Checks

- **Gateway Health**: http://localhost:3000/health
- **Gateway Metrics**: http://localhost:3000/metrics
- **Service Health**: Check GraphQL endpoints

### Logging

```bash
# View all logs
docker-compose -f examples/docker-compose.federation.yml logs -f

# View specific service logs
docker-compose -f examples/docker-compose.federation.yml logs -f products_service
```

## 🔄 Common Operations

### Stop All Services
```bash
./examples/scripts/stop-federation.sh
```

### Reset Data
```bash
# Stop services and remove volumes
docker-compose -f examples/docker-compose.federation.yml down -v

# Restart
./examples/scripts/start-federation.sh
./examples/scripts/seed-data.sh
```

### Add New Service

1. Create new service in `services/` directory
2. Add to `docker-compose.federation.yml`
3. Update `SERVICE_ENDPOINTS` configuration
4. Restart gateway to pick up new service

## 🎯 Use Cases

This example demonstrates:

- ✅ **Microservices Architecture**: Separate, independently deployable services
- ✅ **Schema Federation**: Unified GraphQL API from multiple services
- ✅ **Cross-Service Relations**: Products linked to their reviews
- ✅ **Database Per Service**: Each service has its own database
- ✅ **Type Safety**: Full TypeScript support across all services
- ✅ **Development Experience**: Hot reload, debugging, GraphQL Playground
- ✅ **Production Ready**: Docker, health checks, logging, metrics

## 📖 Further Reading

- [Apollo Federation Documentation](https://www.apollographql.com/docs/federation/)
- [NestJS GraphQL](https://docs.nestjs.com/graphql/quick-start)
- [GatewayQL Documentation](../README.md)

## 🤝 Contributing

To contribute to this example:

1. Fork the repository
2. Create a feature branch
3. Add your improvements
4. Test with the federation example
5. Submit a pull request

## 📄 License

This example is part of the GatewayQL project and follows the same license.