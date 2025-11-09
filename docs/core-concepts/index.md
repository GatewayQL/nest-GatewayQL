---
layout: default
title: Core Concepts
---

# Core Concepts

Understanding the core concepts of Nest GatewayQL is essential for effectively using and configuring the gateway. This guide explains the fundamental architecture and components.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [GraphQL Federation](#graphql-federation)
- [Gateway Components](#gateway-components)
- [Policies](#policies)
- [Authentication & Authorization](#authentication--authorization)
- [Consumers & Credentials](#consumers--credentials)
- [Request Pipeline](#request-pipeline)
- [Configuration Model](#configuration-model)

## Architecture Overview

Nest GatewayQL follows a layered architecture pattern built on NestJS and Apollo Federation:

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│              (Web Apps, Mobile Apps, Services)              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Security Layer                            │
│  ┌────────────┬─────────────┬──────────────┬──────────┐   │
│  │   Helmet   │    CORS     │ Rate Limiting│  Logging │   │
│  └────────────┴─────────────┴──────────────┴──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              GraphQL Gateway Layer                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Apollo Federation Gateway                    │  │
│  │  - Query Complexity Analysis                          │  │
│  │  - Schema Composition                                 │  │
│  │  - Request Routing                                    │  │
│  │  - Response Caching                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Business Logic Layer                       │
│  ┌────────────┬──────────────┬────────────┬──────────────┐ │
│  │   Users    │  Credentials │    Auth    │   Policies   │ │
│  │   Module   │    Module    │   Module   │    Module    │ │
│  └────────────┴──────────────┴────────────┴──────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                 Infrastructure Layer                        │
│  ┌────────────┬──────────────┬────────────┬──────────────┐ │
│  │  Database  │   Logging    │   Health   │    Cache     │ │
│  │  (TypeORM) │   (Winston)  │   Checks   │  (Optional)  │ │
│  └────────────┴──────────────┴────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
   Service A      Service B      Service C
  (Microservice) (Microservice) (Microservice)
```

### Key Principles

1. **Separation of Concerns**: Each layer has specific responsibilities
2. **Modularity**: Components are loosely coupled and independently deployable
3. **Scalability**: Horizontal scaling with stateless design
4. **Security First**: Multiple security layers protect the API
5. **Observability**: Comprehensive logging and health monitoring

## GraphQL Federation

GraphQL Federation is the core concept that enables Nest GatewayQL to aggregate multiple microservices.

### What is GraphQL Federation?

GraphQL Federation allows you to compose multiple GraphQL services into a single unified graph. Each service:

- Owns its domain data and schema
- Can reference types from other services
- Is independently developed and deployed
- Contributes to a unified graph

### Federation Example

**Users Service** (users-service):
```graphql
type User @key(fields: "id") {
  id: ID!
  username: String!
  email: String!
}
```

**Orders Service** (orders-service):
```graphql
type Order {
  id: ID!
  userId: ID!
  product: String!
  amount: Float!
}

extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

**Gateway Query** (combined):
```graphql
query {
  user(id: "123") {
    username      # From users-service
    email         # From users-service
    orders {      # From orders-service
      product
      amount
    }
  }
}
```

### Configuring Federated Services

In `.env`:
```bash
SERVICE_ENDPOINTS=[
  {"name":"users","url":"http://users-service:4001/graphql"},
  {"name":"orders","url":"http://orders-service:4002/graphql"}
]
```

### Benefits of Federation

- **Team Independence**: Teams own and deploy their services
- **Schema Evolution**: Services evolve independently
- **Performance**: Efficient query planning and execution
- **Type Safety**: Full TypeScript support across services

## Gateway Components

### Modules

Modules organize the application into cohesive blocks of functionality.

**Core Modules:**

1. **AuthModule**: Authentication and authorization
2. **UsersModule**: User management
3. **CredentialsModule**: API key and credential management
4. **HealthModule**: Health check endpoints
5. **PoliciesModule**: Policy system configuration

### Guards

Guards implement authentication and authorization logic.

```typescript
@UseGuards(JwtAuthGuard)
@Query(() => [UserEntity])
async users() {
  return this.usersService.findAll();
}
```

**Available Guards:**
- `JwtAuthGuard`: JWT token authentication
- `ApiKeyGuard`: API key authentication
- `RolesGuard`: Role-based authorization

### Interceptors

Interceptors handle cross-cutting concerns.

```typescript
@UseInterceptors(LoggingInterceptor)
@Get()
async getData() {
  return this.service.findAll();
}
```

**Available Interceptors:**
- `LoggingInterceptor`: Request/response logging
- `TransformInterceptor`: Response transformation
- `TimeoutInterceptor`: Request timeout handling
- `CacheInterceptor`: Response caching

### Decorators

Decorators provide metadata for configuration.

```typescript
@Public()  // Skip authentication
@Roles(UserRole.ADMIN)  // Require admin role
@CacheTTL(60000)  // Cache for 60 seconds
@Throttle(100, 60)  // 100 requests per minute
```

## Policies

Policies are reusable configurations that modify request/response behavior.

### Policy Types

1. **Authentication Policies**: JWT, API Key, OAuth
2. **Authorization Policies**: RBAC, scope-based
3. **Rate Limiting Policies**: Request throttling
4. **Transformation Policies**: Request/response modification
5. **Validation Policies**: Input validation
6. **Caching Policies**: Response caching

### Policy Application

Policies can be applied at multiple levels:

```typescript
// Global level (in main.ts)
app.useGlobalGuards(new JwtAuthGuard());

// Controller level
@UseGuards(ApiKeyGuard)
@Controller('api')
export class ApiController {}

// Route level
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Get('admin')
async adminOnly() {}
```

### Policy Composition

Policies can be composed for complex scenarios:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@UseInterceptors(LoggingInterceptor, CacheInterceptor)
@CacheTTL(60000)
@Get('data')
async getProtectedData() {}
```

## Authentication & Authorization

### Authentication Flow

1. **User sends credentials** (username/password or API key)
2. **Gateway validates** credentials against database
3. **Gateway generates** JWT token
4. **User stores** token (localStorage, cookie, etc.)
5. **User sends** token with subsequent requests
6. **Gateway validates** token and extracts user info

```
┌────────┐                           ┌─────────┐
│ Client │                           │ Gateway │
└───┬────┘                           └────┬────┘
    │                                     │
    │  POST /login (credentials)          │
    │────────────────────────────────────>│
    │                                     │
    │                                     │ Validate
    │                                     │ credentials
    │                                     │
    │  Response: { accessToken: "..." }   │
    │<────────────────────────────────────│
    │                                     │
    │  Query with Authorization header    │
    │────────────────────────────────────>│
    │                                     │
    │                                     │ Validate
    │                                     │ token
    │                                     │
    │  Response: { data: { ... } }        │
    │<────────────────────────────────────│
```

### Authorization Models

**Role-Based Access Control (RBAC):**

```typescript
enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Mutation(() => Boolean)
async deleteUser(@Args('id') id: string) {
  return this.usersService.remove(id);
}
```

**Public vs Protected Routes:**

```typescript
// Protected by default
@Query(() => [UserEntity])
async users() {}

// Explicitly public
@Public()
@Query(() => String)
async publicData() {}
```

## Consumers & Credentials

### Consumers

A consumer represents an entity (user, application, service) that accesses the gateway.

**Consumer Properties:**
- Unique identifier (username or ID)
- Credentials (API keys, tokens)
- Metadata (role, permissions, etc.)

### Credentials

Credentials authenticate consumers and come in various types:

**Credential Types:**

1. **KEY_AUTH**: API key authentication
   ```typescript
   {
     type: 'KEY_AUTH',
     keyId: 'api-key-123',
     keySecret: 'hashed-secret'
   }
   ```

2. **JWT**: JSON Web Token
   ```typescript
   {
     type: 'JWT',
     token: 'eyJhbGciOiJIUzI1NiIs...'
   }
   ```

3. **OAUTH2**: OAuth 2.0
   ```typescript
   {
     type: 'OAUTH2',
     clientId: 'client-123',
     clientSecret: 'hashed-secret'
   }
   ```

4. **BASIC_AUTH**: Basic authentication
   ```typescript
   {
     type: 'BASIC_AUTH',
     username: 'user',
     password: 'hashed-password'
   }
   ```

### Credential Management

```graphql
# Create API key credential
mutation {
  createCredential(
    createCredentialInput: {
      consumerId: "user-123"
      type: KEY_AUTH
      keyId: "my-api-key"
      keySecret: "secret"
    }
  ) {
    id
    keyId
    type
  }
}

# Use API key
curl -H "X-API-Key: my-api-key" http://localhost:3000/graphql
```

## Request Pipeline

Every request flows through a standardized pipeline:

```
1. Middleware Layer
   ├── CORS
   ├── Helmet (Security Headers)
   ├── Body Parser
   └── Compression
        │
2. Guard Layer
   ├── Rate Limiting (ThrottlerGuard)
   ├── Authentication (JwtAuthGuard)
   └── Authorization (RolesGuard)
        │
3. Interceptor Layer (Before)
   ├── Logging (Request)
   ├── Timeout Check
   └── Cache Check
        │
4. Handler Layer
   ├── Route Handler
   ├── Service Logic
   └── Database Operations
        │
5. Interceptor Layer (After)
   ├── Response Transformation
   ├── Cache Storage
   └── Logging (Response)
        │
6. Exception Filter Layer
   ├── Error Handling
   ├── Error Formatting
   └── Error Logging
        │
7. Response
```

### Pipeline Example

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)      // Step 2
@Roles(UserRole.ADMIN)                     // Step 2
@UseInterceptors(                          // Step 3 & 5
  LoggingInterceptor,
  CacheInterceptor
)
@CacheTTL(60000)                           // Step 3 & 5
@Query(() => [UserEntity])                 // Step 4
async users() {
  return this.usersService.findAll();      // Step 4
}
```

## Configuration Model

Nest GatewayQL uses environment variables for configuration, organized into logical groups.

### Configuration Structure

```
Configuration
├── Application Config
│   ├── NODE_ENV
│   ├── PORT
│   └── LOG_LEVEL
├── Database Config
│   ├── DB_TYPE
│   ├── DB_HOST
│   ├── DB_PORT
│   ├── DB_USERNAME
│   ├── DB_PASSWORD
│   └── DB_DATABASE
├── Security Config
│   ├── JWT_SECRET
│   ├── CIPHER_KEY
│   └── SALT_ROUNDS
├── GraphQL Config
│   ├── GRAPHQL_PLAYGROUND
│   ├── MAX_QUERY_COMPLEXITY
│   └── SERVICE_ENDPOINTS
└── Feature Config
    ├── CORS_ORIGIN
    ├── THROTTLE_TTL
    └── CACHE_TTL
```

### Configuration Loading

Configuration is loaded and validated on application startup:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        gatewayConfiguration,
        systemConfiguration,
        databaseConfiguration,
      ],
      validate: validateConfiguration,
    }),
  ],
})
export class AppModule {}
```

### Type-Safe Configuration

```typescript
// Access configuration
constructor(private configService: ConfigService) {}

const jwtSecret = this.configService.get<string>('JWT_SECRET');
const dbHost = this.configService.get<string>('database.host');
```

## Next Steps

Now that you understand the core concepts:

1. [Configuration Guide](../configuration/) - Configure your gateway
2. [CLI Guide](../cli/) - Learn CLI commands
3. [Policies](../policies/) - Configure policies in detail
4. [Consumer Management](../consumer-management/) - Manage consumers
5. [Credential Management](../credential-management/) - Manage credentials

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Apollo Federation Guide](https://www.apollographql.com/docs/federation/)
- [GraphQL Specification](https://graphql.org/learn/)
- [TypeORM Documentation](https://typeorm.io/)
