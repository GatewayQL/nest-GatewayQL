# Federation Tutorial

This comprehensive tutorial will guide you through building a GraphQL Federation architecture using GatewayQL, from basic concepts to production deployment.

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Basic GraphQL knowledge
- Familiarity with NestJS (helpful but not required)

## Table of Contents

1. [Understanding Federation](#understanding-federation)
2. [Setting Up the Environment](#setting-up-the-environment)
3. [Building Your First Subgraph](#building-your-first-subgraph)
4. [Creating Related Services](#creating-related-services)
5. [Configuring the Gateway](#configuring-the-gateway)
6. [Testing Federation](#testing-federation)
7. [Advanced Patterns](#advanced-patterns)
8. [Production Deployment](#production-deployment)

## Understanding Federation

### What is GraphQL Federation?

GraphQL Federation enables you to compose multiple GraphQL services (called **subgraphs**) into a single, unified schema. Instead of one large monolithic GraphQL server, you can have multiple smaller services that each own their domain.

### Key Concepts

- **Gateway**: The entry point that federates multiple subgraphs
- **Subgraph**: An individual GraphQL service
- **Entity**: A type that can be referenced across subgraphs
- **Reference Resolver**: Resolves entities from other subgraphs

### Architecture We'll Build

```
Gateway (GatewayQL)
├── Products Service (Port 4001)
│   ├── Products management
│   └── Product entities
└── Reviews Service (Port 4002)
    ├── Reviews management
    └── Extends Product entities
```

## Setting Up the Environment

### 1. Clone and Explore

```bash
# If you haven't already, clone the GatewayQL project
git clone <repository-url>
cd nest-GatewayQL

# Navigate to examples
cd examples

# Explore the federation example
ls -la
```

### 2. Start the Complete Example

```bash
# Install dependencies
./scripts/install-dependencies.sh

# Start all federation services
./scripts/start-federation.sh

# Seed example data
./scripts/seed-data.sh
```

### 3. Verify Setup

Open these URLs to verify everything is running:

- **Gateway**: http://localhost:3000/graphql
- **Products Service**: http://localhost:4001/graphql
- **Reviews Service**: http://localhost:4002/graphql

### 4. Try a Federated Query

In the Gateway GraphQL Playground, run:

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

This query fetches products from the Products service and their reviews from the Reviews service!

## Building Your First Subgraph

Let's build the Products service step by step.

### 1. Create the Service Structure

```bash
mkdir -p tutorial-services/products-service/src/products/{entities,dto,resolvers}
cd tutorial-services/products-service
```

### 2. Initialize Package Configuration

```json
// package.json
{
  "name": "tutorial-products-service",
  "version": "1.0.0",
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build"
  },
  "dependencies": {
    "@nestjs/apollo": "^12.0.11",
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/graphql": "^12.0.11",
    "@nestjs/typeorm": "^10.0.1",
    "apollo-server-express": "^3.12.1",
    "graphql": "^16.8.1",
    "pg": "^8.11.3",
    "reflect-metadata": "^0.1.13",
    "typeorm": "^0.3.17"
  }
}
```

### 3. Create the Product Entity

```typescript
// src/products/entities/product.entity.ts
import { ObjectType, Field, ID, Float, Directive } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('products')
@ObjectType()
@Directive('@key(fields: "id")') // 🔑 Federation key
export class Product {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column()
  @Field()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @Field(() => Float)
  price: number;

  @Column()
  @Field()
  category: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Field()
  createdAt: Date;
}
```

**Key Points:**
- `@Directive('@key(fields: "id")')` makes this an entity that can be referenced from other services
- Standard TypeORM entity with GraphQL decorators

### 4. Create Input DTOs

```typescript
// src/products/dto/create-product.input.ts
import { InputType, Field, Float } from '@nestjs/graphql';
import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';

@InputType()
export class CreateProductInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  price: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  category: string;
}
```

### 5. Create the Service

```typescript
// src/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductInput } from './dto/create-product.input';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductInput: CreateProductInput): Promise<Product> {
    const product = this.productRepository.create(createProductInput);
    return await this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.productRepository.delete(id);
    return result.affected > 0;
  }
}
```

### 6. Create the Resolver

```typescript
// src/products/products.resolver.ts
import { Resolver, Query, Mutation, Args, ID, ResolveReference } from '@nestjs/graphql';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { CreateProductInput } from './dto/create-product.input';

@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Mutation(() => Product)
  createProduct(@Args('createProductInput') createProductInput: CreateProductInput) {
    return this.productsService.create(createProductInput);
  }

  @Query(() => [Product], { name: 'products' })
  findAll() {
    return this.productsService.findAll();
  }

  @Query(() => Product, { name: 'product', nullable: true })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.findOne(id);
  }

  @Mutation(() => Boolean)
  removeProduct(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.remove(id);
  }

  // 🔑 Federation: Entity reference resolver
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    return this.productsService.findOne(reference.id);
  }
}
```

**Key Point:** `@ResolveReference()` tells the gateway how to resolve Product entities when they're referenced from other services.

### 7. Create the Module

```typescript
// src/products/products.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsResolver } from './products.resolver';
import { Product } from './entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  providers: [ProductsResolver, ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

### 8. Configure Federation in App Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';
import { Product } from './products/entities/product.entity';

@Module({
  imports: [
    // Database configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'products_service',
      entities: [Product],
      synchronize: true, // Only for development
      logging: process.env.NODE_ENV === 'development',
    }),

    // 🔑 GraphQL Federation configuration
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver, // Use Federation driver
      autoSchemaFile: {
        federation: 2, // Apollo Federation v2
      },
      playground: process.env.NODE_ENV !== 'production',
      introspection: true,
    }),

    ProductsModule,
  ],
})
export class AppModule {}
```

### 9. Create Main Application File

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for federation
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const port = process.env.PORT || 4001;
  await app.listen(port);

  console.log(`🚀 Products Service running on: http://localhost:${port}`);
  console.log(`🔍 GraphQL Federation: http://localhost:${port}/graphql`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Products Service:', error);
  process.exit(1);
});
```

### 10. Test Your First Subgraph

```bash
# Install dependencies
npm install

# Start the service
npm run start:dev
```

Visit http://localhost:4001/graphql and test:

```graphql
mutation {
  createProduct(createProductInput: {
    name: "My First Product"
    price: 99.99
    category: "Tutorial"
  }) {
    id
    name
    price
  }
}

query {
  products {
    id
    name
    price
    category
  }
}
```

## Creating Related Services

Now let's create the Reviews service that will extend our Product entity.

### 1. Reviews Service Setup

```bash
mkdir -p tutorial-services/reviews-service/src/reviews/{entities,dto,resolvers}
cd tutorial-services/reviews-service
```

### 2. Review Entity

```typescript
// src/reviews/entities/review.entity.ts
import { ObjectType, Field, ID, Int, Directive } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('reviews')
@ObjectType()
@Directive('@key(fields: "id")') // Reviews can also be referenced
export class Review {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column('uuid')
  @Field()
  productId: string; // Reference to Product

  @Column('int')
  @Field(() => Int)
  rating: number;

  @Column('text')
  @Field()
  comment: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  reviewerName?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Field()
  createdAt: Date;
}

// 🔑 Extend Product entity from Products service
@ObjectType()
@Directive('@extends')            // This extends an existing type
@Directive('@key(fields: "id")')  // Reference the same key
export class Product {
  @Field(() => ID)
  @Directive('@external')          // This field is external (from another service)
  id: string;

  @Field(() => [Review])
  reviews?: Review[];              // This field is provided by THIS service
}
```

**Key Points:**
- `@extends` indicates this extends a type from another service
- `@external` marks fields that come from other services
- `@key(fields: "id")` must match the original Product entity

### 3. Reviews Input DTO

```typescript
// src/reviews/dto/create-review.input.ts
import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsNumber, Min, Max, IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class CreateReviewInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  comment: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  reviewerName?: string;
}
```

### 4. Reviews Service

```typescript
// src/reviews/reviews.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewInput } from './dto/create-review.input';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async create(createReviewInput: CreateReviewInput): Promise<Review> {
    const review = this.reviewRepository.create(createReviewInput);
    return await this.reviewRepository.save(review);
  }

  async findAll(): Promise<Review[]> {
    return await this.reviewRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findByProductId(productId: string): Promise<Review[]> {
    return await this.reviewRepository.find({
      where: { productId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({ where: { id } });

    if (!review) {
      throw new NotFoundException(`Review with ID "${id}" not found`);
    }

    return review;
  }
}
```

### 5. Reviews Resolvers

```typescript
// src/reviews/reviews.resolver.ts
import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveReference,
  ResolveField,
  Parent
} from '@nestjs/graphql';
import { ReviewsService } from './reviews.service';
import { Review, Product } from './entities/review.entity';
import { CreateReviewInput } from './dto/create-review.input';

@Resolver(() => Review)
export class ReviewsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Mutation(() => Review)
  createReview(@Args('createReviewInput') createReviewInput: CreateReviewInput) {
    return this.reviewsService.create(createReviewInput);
  }

  @Query(() => [Review], { name: 'reviews' })
  findAll() {
    return this.reviewsService.findAll();
  }

  @Query(() => [Review], { name: 'reviewsByProduct' })
  findByProduct(@Args('productId') productId: string) {
    return this.reviewsService.findByProductId(productId);
  }

  // 🔑 Federation: Entity reference resolver
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    return this.reviewsService.findOne(reference.id);
  }
}

// 🔑 Federation: Resolver for extended Product type
@Resolver(() => Product)
export class ProductResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  // This adds the 'reviews' field to Product
  @ResolveField(() => [Review])
  reviews(@Parent() product: Product): Promise<Review[]> {
    return this.reviewsService.findByProductId(product.id);
  }

  // 🔑 Federation: Product reference resolver
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    // We don't store Product data, just return the reference
    return { id: reference.id };
  }
}
```

**Key Points:**
- `ReviewsResolver` handles Review entities
- `ProductResolver` extends the Product type with reviews
- `@ResolveField('reviews')` adds reviews to any Product query

### 6. Reviews Module

```typescript
// src/reviews/reviews.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsResolver, ProductResolver } from './reviews.resolver';
import { Review } from './entities/review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  providers: [ReviewsResolver, ProductResolver, ReviewsService], // Both resolvers!
  exports: [ReviewsService],
})
export class ReviewsModule {}
```

### 7. Start Reviews Service

```bash
# In reviews-service directory
npm install
npm run start:dev  # Runs on port 4002
```

Test the Reviews service at http://localhost:4002/graphql:

```graphql
mutation {
  createReview(createReviewInput: {
    productId: "YOUR_PRODUCT_ID_HERE"
    rating: 5
    comment: "Great product!"
    reviewerName: "Tutorial User"
  }) {
    id
    rating
    comment
  }
}
```

## Configuring the Gateway

Now let's configure GatewayQL to federate both services.

### 1. Update Gateway Configuration

```bash
# Set the federation endpoints
export SERVICE_ENDPOINTS='[
  {"name":"products","url":"http://localhost:4001/graphql"},
  {"name":"reviews","url":"http://localhost:4002/graphql"}
]'
```

Or update your `.env` file:

```bash
SERVICE_ENDPOINTS=[{"name":"products","url":"http://localhost:4001/graphql"},{"name":"reviews","url":"http://localhost:4002/graphql"}]
```

### 2. Start the Gateway

```bash
# From the main GatewayQL directory
npm run start:dev
```

### 3. Verify Federation

Visit http://localhost:3000/graphql and test the federated query:

```graphql
# This query spans both services!
query {
  products {
    id
    name
    price
    category
    reviews {  # This comes from Reviews service
      id
      rating
      comment
      reviewerName
    }
  }
}
```

## Testing Federation

Let's create some test data and verify everything works.

### 1. Create Test Products

In the Gateway playground (http://localhost:3000/graphql):

```graphql
mutation CreateProduct1 {
  createProduct(createProductInput: {
    name: "Wireless Headphones"
    price: 99.99
    category: "Electronics"
  }) {
    id
    name
  }
}

mutation CreateProduct2 {
  createProduct(createProductInput: {
    name: "Coffee Mug"
    price: 15.99
    category: "Home"
  }) {
    id
    name
  }
}
```

### 2. Create Reviews for Products

```graphql
mutation CreateReview1 {
  createReview(createReviewInput: {
    productId: "PRODUCT_ID_1"  # Replace with actual ID
    rating: 5
    comment: "Amazing sound quality!"
    reviewerName: "AudioLover"
  }) {
    id
    rating
  }
}

mutation CreateReview2 {
  createReview(createReviewInput: {
    productId: "PRODUCT_ID_1"
    rating: 4
    comment: "Good value for money"
    reviewerName: "TechReviewer"
  }) {
    id
    rating
  }
}
```

### 3. Test Complex Federated Queries

```graphql
# Get all products with their reviews
query ProductsWithReviews {
  products {
    id
    name
    price
    category
    reviews {
      id
      rating
      comment
      reviewerName
      createdAt
    }
  }
}

# Get specific product with reviews
query ProductDetails($id: ID!) {
  product(id: $id) {
    id
    name
    price
    category
    createdAt
    reviews {
      rating
      comment
      reviewerName
    }
  }
}

# Query from both services in one request
query MixedQuery {
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

### 4. Test Schema Introspection

```graphql
# See the unified schema
query SchemaIntrospection {
  __schema {
    types {
      name
      kind
      fields {
        name
        type {
          name
        }
      }
    }
  }
}

# Check Product type (should include reviews field)
query ProductTypeInfo {
  __type(name: "Product") {
    name
    fields {
      name
      type {
        name
        ofType {
          name
        }
      }
    }
  }
}
```

## Advanced Patterns

### 1. Computed Fields

Add computed fields to your entities:

```typescript
// In Products service
@ResolveField(() => String)
displayPrice(@Parent() product: Product): string {
  return `$${product.price.toFixed(2)}`;
}

@ResolveField(() => Boolean)
isExpensive(@Parent() product: Product): boolean {
  return product.price > 100;
}
```

### 2. Cross-Service Aggregations

```typescript
// In Reviews service - add to ProductResolver
@ResolveField(() => Float, { nullable: true })
async averageRating(@Parent() product: Product): Promise<number | null> {
  const reviews = await this.reviewsService.findByProductId(product.id);

  if (reviews.length === 0) return null;

  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return sum / reviews.length;
}

@ResolveField(() => Int)
async reviewCount(@Parent() product: Product): Promise<number> {
  const reviews = await this.reviewsService.findByProductId(product.id);
  return reviews.length;
}
```

### 3. DataLoader for N+1 Prevention

```typescript
// In Reviews service
import DataLoader from 'dataloader';

@Injectable()
export class ReviewsService {
  private reviewsLoader = new DataLoader<string, Review[]>(
    async (productIds: string[]) => {
      const reviews = await this.reviewRepository.find({
        where: { productId: In([...productIds]) },
      });

      return productIds.map(id =>
        reviews.filter(review => review.productId === id)
      );
    }
  );

  async findByProductIds(productIds: string[]): Promise<Review[][]> {
    return this.reviewsLoader.loadMany(productIds);
  }
}
```

### 4. Authentication Context

```typescript
// Pass user context through federation
@ResolveField(() => [Review])
async reviews(
  @Parent() product: Product,
  @Context() context: any
): Promise<Review[]> {
  const user = context.user;

  // Filter reviews based on user permissions
  const reviews = await this.reviewsService.findByProductId(product.id);

  if (!user) {
    // Return only public reviews
    return reviews.filter(review => review.isPublic);
  }

  return reviews;
}
```

### 5. Caching Strategies

```typescript
// Cache expensive operations
@ResolveField(() => [Review])
@CacheKey((product: Product) => `reviews:${product.id}`)
@CacheTTL(300) // 5 minutes
async reviews(@Parent() product: Product): Promise<Review[]> {
  return this.reviewsService.findByProductId(product.id);
}
```

## Production Deployment

### 1. Docker Configuration

Create Dockerfiles for each service:

```dockerfile
# products-service/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build

EXPOSE 4001
CMD ["npm", "run", "start:prod"]
```

### 2. Docker Compose for Development

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: federation_tutorial
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  products-service:
    build: ./tutorial-services/products-service
    environment:
      DB_HOST: postgres
      DB_DATABASE: products_service
      PORT: 4001
    ports:
      - "4001:4001"
    depends_on:
      - postgres

  reviews-service:
    build: ./tutorial-services/reviews-service
    environment:
      DB_HOST: postgres
      DB_DATABASE: reviews_service
      PORT: 4002
    ports:
      - "4002:4002"
    depends_on:
      - postgres

  gateway:
    build: ../../  # Main GatewayQL
    environment:
      SERVICE_ENDPOINTS: '[
        {"name":"products","url":"http://products-service:4001/graphql"},
        {"name":"reviews","url":"http://reviews-service:4002/graphql"}
      ]'
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - products-service
      - reviews-service

volumes:
  postgres_data:
```

### 3. Kubernetes Deployment

```yaml
# k8s/products-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: products-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: products-service
  template:
    metadata:
      labels:
        app: products-service
    spec:
      containers:
      - name: products-service
        image: your-registry/products-service:latest
        ports:
        - containerPort: 4001
        env:
        - name: DB_HOST
          value: "postgres-service"
        - name: DB_DATABASE
          value: "products_service"
---
apiVersion: v1
kind: Service
metadata:
  name: products-service
spec:
  selector:
    app: products-service
  ports:
  - port: 4001
    targetPort: 4001
```

### 4. Health Checks

Add health endpoints to each service:

```typescript
// In each service
@Controller('health')
export class HealthController {
  constructor(
    @InjectRepository(Product) // or Review
    private repository: Repository<Product>,
  ) {}

  @Get()
  async check(): Promise<any> {
    try {
      // Test database connection
      await this.repository.query('SELECT 1');

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected'
      };
    } catch (error) {
      throw new ServiceUnavailableException('Service unhealthy');
    }
  }
}
```

### 5. Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
PORT=4001

# Database
DB_HOST=production-postgres.amazonaws.com
DB_SSL=true
DB_POOL_SIZE=10

# Monitoring
ENABLE_TRACING=true
LOG_LEVEL=warn

# Security
JWT_SECRET=super-secure-production-secret
CORS_ORIGIN=https://yourdomain.com
```

### 6. Load Balancing

```yaml
# nginx.conf for load balancing
upstream products_service {
    server products-1:4001;
    server products-2:4001;
    server products-3:4001;
}

upstream reviews_service {
    server reviews-1:4002;
    server reviews-2:4002;
    server reviews-3:4002;
}

server {
    listen 80;

    location /products/ {
        proxy_pass http://products_service/;
    }

    location /reviews/ {
        proxy_pass http://reviews_service/;
    }
}
```

## Troubleshooting

### Common Issues

**1. Schema Composition Failures**

```bash
# Check service SDL
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ _service { sdl } }"}'
```

**2. Entity Resolution Errors**

```typescript
// Ensure reference resolvers are implemented
@ResolveReference()
resolveReference(reference: { __typename: string; id: string }) {
  console.log('Resolving reference:', reference);
  return this.service.findOne(reference.id);
}
```

**3. CORS Issues**

```typescript
// In each service main.ts
app.enableCors({
  origin: true, // or specific origins
  credentials: true,
});
```

**4. Database Connection Issues**

```typescript
// Add connection logging
TypeOrmModule.forRoot({
  // ... other config
  logging: ['error', 'warn', 'info'],
  logger: 'advanced-console',
}),
```

### Debugging Tips

1. **Check Service Health**: Verify each service is running
2. **Validate SDL**: Ensure each service exports valid SDL
3. **Test Isolation**: Test each service independently first
4. **Monitor Logs**: Check gateway and service logs for errors
5. **Use Introspection**: Query `__schema` to verify composition

## Next Steps

Congratulations! You've built a complete GraphQL Federation system. Here's what to explore next:

### Advanced Topics
- **Performance Optimization**: Implement DataLoader, caching
- **Security**: Add authentication, authorization
- **Monitoring**: Set up tracing, metrics collection
- **Testing**: Write comprehensive E2E tests

### Additional Services
- **Users Service**: User management and authentication
- **Orders Service**: Shopping cart and order processing
- **Inventory Service**: Stock management
- **Notifications Service**: Email/SMS notifications

### Production Concerns
- **Service Discovery**: Consul, Kubernetes service discovery
- **Circuit Breakers**: Hystrix, resilience4j
- **Rate Limiting**: Service-level rate limiting
- **Caching**: Redis, CDN integration

### Resources

- [GatewayQL Documentation](../index.md)
- [Federation Examples](../../examples/README.md)
- [Apollo Federation Specification](https://www.apollographql.com/docs/federation/federation-spec/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

---

*Happy coding with GraphQL Federation! 🚀*