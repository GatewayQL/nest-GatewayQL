---
layout: default
title: Features
---

# Features

Nest GatewayQL provides enterprise-grade features for building production-ready GraphQL API gateways.

## GraphQL Federation

Aggregate multiple GraphQL microservices into a single unified API.

### How It Works

```typescript
// Configure federated services in .env
SERVICE_ENDPOINTS=[
  {"name":"users","url":"http://users-service:4001/graphql"},
  {"name":"orders","url":"http://orders-service:4002/graphql"}
]
```

### Benefits

- **Service Independence**: Each service owns its domain
- **Schema Composition**: Automatic schema stitching
- **Type Safety**: Full TypeScript support
- **Hot Reload**: Services can be added/removed without downtime

[Learn more about GraphQL Federation →](https://www.apollographql.com/docs/federation/)

## Authentication & Authorization

Multiple authentication strategies with role-based access control.

### JWT Authentication

```typescript
// Protect routes with JWT
@UseGuards(JwtAuthGuard)
@Query(() => [UserEntity])
async users() {
  return this.usersService.findAll();
}
```

### API Key Authentication

```typescript
// Protect with API key
@UseGuards(ApiKeyGuard)
@Query(() => String)
async protectedData() {
  return 'Secret data';
}
```

### Role-Based Access Control

```typescript
// Require specific roles
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Mutation(() => UserEntity)
async deleteUser(@Args('id') id: string) {
  return this.usersService.remove(id);
}
```

### Public Routes

```typescript
// Skip authentication
@Public()
@Query(() => String)
async publicData() {
  return 'Public data';
}
```

## Rate Limiting

Protect your API from abuse with configurable rate limiting.

### Global Rate Limiting

Configure in `.env`:

```bash
THROTTLE_TTL=60      # 60 seconds window
THROTTLE_LIMIT=10    # 10 requests per window
```

### Per-Route Rate Limiting

```typescript
// Custom rate limit for specific routes
@Throttle(100, 60)  // 100 requests per 60 seconds
@Get('data')
async getData() {
  return this.dataService.findAll();
}
```

### Skip Rate Limiting

```typescript
// Skip rate limiting for specific routes
@SkipThrottle()
@Get('unlimited')
async getUnlimitedData() {
  return 'No rate limit';
}
```

## Request Caching

Improve performance with response caching.

### Default Caching

All GraphQL queries are cached with default TTL (60 seconds).

### Custom Cache TTL

```typescript
// Cache for 5 minutes
@CacheTTL(300000)
@Query(() => [ProductEntity])
async products() {
  return this.productsService.findAll();
}
```

### Cache Invalidation

```typescript
// Clear cache after mutations
@Mutation(() => ProductEntity)
async createProduct(@Args('input') input: CreateProductInput) {
  await this.cacheManager.del('products');
  return this.productsService.create(input);
}
```

## Health Checks

Kubernetes-ready health check endpoints.

### Endpoints

- `GET /health` - Comprehensive health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Checked Components

- Database connectivity
- Memory usage
- Disk space
- External services

### Example Response

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" },
    "storage": { "status": "up" }
  }
}
```

## Security Features

### Helmet Security Headers

Automatically configured:
- XSS Protection
- Content Security Policy
- HSTS
- Frame Options
- DNS Prefetch Control

### CORS

Configurable cross-origin resource sharing:

```bash
CORS_ORIGIN=https://app.example.com
CORS_CREDENTIALS=true
```

### Input Validation

Automatic validation with class-validator:

```typescript
export class CreateUserInput {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### Query Complexity

Prevent DoS attacks with query complexity limits:

```bash
MAX_QUERY_COMPLEXITY=100
```

### Password Hashing

Secure password storage with bcrypt:

```typescript
const hashedPassword = await bcrypt.hash(password, 10);
```

### Credential Encryption

Sensitive data encryption:

```typescript
const encrypted = this.encrypt(sensitiveData);
const decrypted = this.decrypt(encrypted);
```

## Logging

Structured logging with Winston.

### Log Levels

- `error`: Error messages
- `warn`: Warning messages
- `info`: Informational messages
- `debug`: Debug messages

### Usage

```typescript
constructor(private logger: CustomLoggerService) {
  this.logger.setContext('UsersService');
}

this.logger.log('User created successfully');
this.logger.error('Failed to create user', error.stack);
this.logger.warn('User not found');
this.logger.debug('Processing user data');
```

### Log Output

**Console** (all environments):
```
[2024-01-15 10:30:45] INFO [UsersService] User created successfully
```

**File** (production only):
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs

## Policy System

Reusable policies for cross-cutting concerns.

### Guards

```typescript
// Authentication
@UseGuards(JwtAuthGuard)

// Authorization
@UseGuards(RolesGuard)

// API Key
@UseGuards(ApiKeyGuard)
```

### Interceptors

```typescript
// Transform response
@UseInterceptors(TransformInterceptor)

// Timeout protection
@UseInterceptors(new TimeoutInterceptor(3000))

// Logging
@UseInterceptors(LoggingInterceptor)
```

### Decorators

```typescript
// Public route
@Public()

// Required roles
@Roles(UserRole.ADMIN)

// Cache TTL
@CacheTTL(60000)

// Rate limit
@Throttle(100, 60)

// Skip throttle
@SkipThrottle()

// Current user
@CurrentUser() user: UserEntity
```

## Database Support

TypeORM integration with multiple database support.

### Supported Databases

- PostgreSQL (recommended)
- MySQL/MariaDB
- SQLite
- MongoDB
- SQL Server

### Migrations

```bash
# Generate migration
npm run migration:generate -- src/migrations/AddUserTable

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### Entities

```typescript
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Testing Support

Comprehensive testing utilities.

### Unit Testing

```typescript
describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should create a user', async () => {
    const result = await service.create(createUserInput);
    expect(result).toBeDefined();
  });
});
```

### E2E Testing

```typescript
describe('GraphQL Gateway (e2e)', () => {
  it('should create a user', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: CREATE_USER_MUTATION,
        variables: { input: createUserInput },
      })
      .expect(200);
  });
});
```

## Next Steps

- [Configuration Guide](../configuration/) - Configure features
- [API Reference](../api/) - Complete API documentation
- [Deployment Guide](../deployment/) - Deploy to production
- [Tutorials](../guides/) - Step-by-step guides
