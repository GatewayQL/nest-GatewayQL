# GraphQL Federation

GatewayQL provides comprehensive support for **Apollo Federation v2**, enabling you to build scalable microservices architectures with unified GraphQL schemas.

## Overview

GraphQL Federation allows you to compose a single, unified GraphQL schema from multiple independently developed and deployed GraphQL services (subgraphs). GatewayQL acts as the gateway that:

- **Federates** multiple GraphQL services into a single endpoint
- **Routes** queries to the appropriate services
- **Merges** results from multiple services
- **Extends** types across service boundaries

## Architecture

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
        └──────┬───────┘   └──────┬───────┘
               │                   │
        ┌──────▼───────┐   ┌──────▼───────┐
        │ products_db  │   │ reviews_db   │
        │ (PostgreSQL) │   │ (PostgreSQL) │
        └──────────────┘   └──────────────┘
```

## Key Benefits

- **🏗️ Microservices Architecture**: Independent development and deployment
- **📊 Unified Schema**: Single GraphQL endpoint for clients
- **🔄 Type Safety**: Full TypeScript support across services
- **⚡ Performance**: Efficient query planning and execution
- **🛡️ Isolation**: Services can fail independently
- **📈 Scalability**: Scale services individually based on demand

## Getting Started

### 1. Quick Example

```bash
# Clone and setup the federation example
cd examples
./scripts/start-federation.sh

# Access the federated gateway
open http://localhost:3000/graphql
```

### 2. Example Query

Query products with their reviews (data from two different services):

```graphql
query {
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
    }
  }
}
```

### 3. Service Configuration

Configure your gateway to federate multiple services:

```bash
# Set federation endpoints
export SERVICE_ENDPOINTS='[
  {"name":"products","url":"http://localhost:4001/graphql"},
  {"name":"reviews","url":"http://localhost:4002/graphql"}
]'
```

## Core Concepts

### Entity Keys

Entities are types that can be referenced across services using `@key` directives:

```typescript
@Entity()
@ObjectType()
@Directive('@key(fields: "id")')
export class Product {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Float)
  price: number;
}
```

### Schema Extension

Services can extend types defined in other services:

```typescript
// In Reviews service - extend Product from Products service
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class Product {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  @Field(() => [Review])
  reviews?: Review[];
}
```

### Reference Resolvers

Resolve entities across service boundaries:

```typescript
@Resolver(() => Product)
export class ProductResolver {
  @ResolveField(() => [Review])
  reviews(@Parent() product: Product): Promise<Review[]> {
    return this.reviewsService.findByProductId(product.id);
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    return { id: reference.id };
  }
}
```

## Configuration

### Gateway Configuration

GatewayQL automatically configures federation based on your service endpoints:

```typescript
// Conditional federation - only when services are configured
...(process.env.SERVICE_ENDPOINTS && JSON.parse(process.env.SERVICE_ENDPOINTS).length > 0
  ? [GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      useFactory: async (graphQLConfigService: GraphQLConfigService) => ({
        ...graphQLConfigService.createGatewayOptions(),
        server: {
          plugins: [ApolloServerPluginLandingPageLocalDefault()],
          context: ({ req }) => ({ headers: req.headers }),
        },
      }),
      imports: [SystemConfigModule],
      inject: [GraphQLConfigService],
    })]
  : [])
```

### Service Discovery

GatewayQL uses `IntrospectAndCompose` for automatic service discovery:

```typescript
export class GraphQLConfigService {
  public createGatewayOptions() {
    const services = this.serviceList();

    return {
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: services,
        }),
      },
    };
  }
}
```

### Environment Configuration

```bash
# Federation services (JSON array)
SERVICE_ENDPOINTS='[
  {"name":"products","url":"http://products-service:4001/graphql"},
  {"name":"reviews","url":"http://reviews-service:4002/graphql"},
  {"name":"users","url":"http://users-service:4003/graphql"}
]'

# Gateway settings
GRAPHQL_PLAYGROUND=true
GRAPHQL_INTROSPECTION=true
```

## Example Implementation

### Products Service

A complete federated microservice:

```typescript
// Product Entity
@Entity('products')
@ObjectType()
@Directive('@key(fields: "id")')
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
}

// Federation Configuration
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { federation: 2 },
    }),
    TypeOrmModule.forFeature([Product]),
  ],
})
export class AppModule {}

// Reference Resolution
@Resolver(() => Product)
export class ProductsResolver {
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    return this.productsService.findOne(reference.id);
  }
}
```

### Reviews Service

Service that extends Products:

```typescript
// Reviews Entity
@Entity('reviews')
@ObjectType()
@Directive('@key(fields: "id")')
export class Review {
  @Field(() => ID)
  id: string;

  @Field()
  productId: string;

  @Field(() => Int)
  rating: number;

  @Field()
  comment: string;
}

// Product Extension
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class Product {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  @Field(() => [Review])
  reviews?: Review[];
}

// Cross-Service Resolution
@Resolver(() => Product)
export class ProductResolver {
  @ResolveField(() => [Review])
  reviews(@Parent() product: Product): Promise<Review[]> {
    return this.reviewsService.findByProductId(product.id);
  }
}
```

## Advanced Features

### Query Complexity Protection

Federation queries are protected by the same complexity limits:

```bash
MAX_QUERY_COMPLEXITY=100
```

### Caching

Federation responses can be cached:

```typescript
@Field(() => [Review])
@CacheTTL(300) // 5 minutes
reviews(@Parent() product: Product): Promise<Review[]> {
  return this.reviewsService.findByProductId(product.id);
}
```

### Rate Limiting

Federation endpoints respect global rate limits:

```bash
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### Authentication

Authentication flows through the gateway to all services:

```typescript
// Gateway forwards auth headers
context: ({ req }) => ({
  headers: req.headers,
  user: req.user
})

// Services receive auth context
@ResolveField()
@UseGuards(JwtAuthGuard)
reviews(@Parent() product: Product, @Context() context): Promise<Review[]> {
  const user = context.user;
  return this.reviewsService.findByProductId(product.id, user);
}
```

## Monitoring & Health

### Health Checks

Each service provides individual health endpoints:

```bash
curl http://products-service:4001/health
curl http://reviews-service:4002/health
curl http://gateway:3000/health  # Aggregated health
```

### Metrics

Federation metrics are collected across all services:

```bash
curl http://gateway:3000/metrics
```

### Distributed Tracing

Enable tracing across federated services:

```bash
ENABLE_TRACING=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

## Testing

### Federation E2E Tests

GatewayQL includes comprehensive federation testing:

```bash
cd examples
./scripts/test-federation.sh
```

Test categories:
- **Individual Service Tests**: Isolated service functionality
- **Federation Integration**: Cross-service queries and mutations
- **Error Handling**: Service unavailability scenarios
- **Performance**: Complex federated query benchmarks

### Testing Cross-Service Relationships

```typescript
it('should query products with reviews (federated)', async () => {
  // Create product in Products service
  const product = await createProduct({ name: "Test Product" });

  // Create review in Reviews service
  await createReview({
    productId: product.id,
    rating: 5,
    comment: "Great!"
  });

  // Query through federation gateway
  const response = await gql(`
    query {
      product(id: "${product.id}") {
        name
        reviews {
          rating
          comment
        }
      }
    }
  `);

  expect(response.data.product.reviews).toHaveLength(1);
});
```

## Production Deployment

### Docker Composition

Deploy federated services with Docker:

```yaml
version: '3.8'
services:
  gateway:
    image: gatewayql:latest
    environment:
      SERVICE_ENDPOINTS: '[
        {"name":"products","url":"http://products:4001/graphql"},
        {"name":"reviews","url":"http://reviews:4002/graphql"}
      ]'
    ports:
      - "3000:3000"
    depends_on:
      - products
      - reviews

  products:
    image: products-service:latest
    environment:
      DB_HOST: postgres
    depends_on:
      - postgres

  reviews:
    image: reviews-service:latest
    environment:
      DB_HOST: postgres
    depends_on:
      - postgres
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gatewayql-gateway
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: gateway
        image: gatewayql:latest
        env:
        - name: SERVICE_ENDPOINTS
          value: '[
            {"name":"products","url":"http://products-service:4001/graphql"},
            {"name":"reviews","url":"http://reviews-service:4002/graphql"}
          ]'
```

### Service Mesh Integration

GatewayQL works seamlessly with service meshes like Istio:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: gatewayql
spec:
  http:
  - match:
    - uri:
        prefix: /graphql
    route:
    - destination:
        host: gatewayql-gateway
```

## Best Practices

### 1. Service Boundaries

Design clear service boundaries:
- **Products**: Product catalog, inventory
- **Reviews**: User reviews, ratings
- **Users**: Authentication, profiles
- **Orders**: Order management, payments

### 2. Schema Design

Follow federation schema design patterns:
- Use meaningful entity keys
- Design for query efficiency
- Minimize cross-service dependencies
- Plan for service evolution

### 3. Error Handling

Implement graceful degradation:
- Handle service unavailability
- Provide partial responses when possible
- Use circuit breakers for resilience

### 4. Performance

Optimize federation performance:
- Use DataLoader for N+1 query prevention
- Implement efficient entity resolution
- Cache cross-service lookups
- Monitor query complexity

### 5. Security

Secure federated services:
- Authenticate at the gateway
- Propagate user context to services
- Use service-to-service authentication
- Implement authorization consistently

## Troubleshooting

### Common Issues

**Service Discovery Failures**
```bash
# Check service health
curl http://products-service:4001/graphql

# Verify federation configuration
echo $SERVICE_ENDPOINTS | jq
```

**Schema Composition Errors**
```bash
# Check service SDL
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ _service { sdl } }"}' \
  http://products-service:4001/graphql
```

**Query Planning Issues**
```bash
# Enable GraphQL debugging
GRAPHQL_DEBUG=true
```

### Monitoring Federation Health

```typescript
// Custom health check
@Get('/federation/health')
async checkFederationHealth(): Promise<any> {
  const services = await Promise.all([
    this.checkService('products'),
    this.checkService('reviews'),
  ]);

  return {
    status: services.every(s => s.healthy) ? 'healthy' : 'unhealthy',
    services,
  };
}
```

## Migration Guide

### From Monolithic GraphQL

1. **Identify Service Boundaries**: Split by domain
2. **Extract Services**: Create independent services
3. **Add Federation**: Implement `@key` directives
4. **Test Integration**: Verify cross-service queries
5. **Deploy Incrementally**: Gradual migration

### From REST APIs

1. **Create GraphQL Wrappers**: Wrap existing APIs
2. **Define Federation Schema**: Add federation directives
3. **Implement Resolvers**: Connect to existing services
4. **Gateway Configuration**: Configure service endpoints
5. **Client Migration**: Update client queries

## Resources

- [Federation Tutorial](tutorial.md) - Step-by-step guide
- [Example Implementation](../../examples/README.md) - Complete working example
- [Apollo Federation Docs](https://www.apollographql.com/docs/federation/) - Official documentation
- [Schema Design Guide](schema-design.md) - Best practices for federated schemas

## Next Steps

1. **Try the Example**: Start with the provided federation example
2. **Build Your Services**: Create your own federated microservices
3. **Test Thoroughly**: Use the E2E testing framework
4. **Deploy to Production**: Follow the deployment guide
5. **Monitor & Scale**: Use the observability features

---

*For more detailed information, see the [Federation Tutorial](tutorial.md) and [API Reference](../api/index.md).*