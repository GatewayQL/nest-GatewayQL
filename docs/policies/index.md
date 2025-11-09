---
layout: default
title: Policies
---

# Policies

Policies in Nest GatewayQL are reusable components that modify request and response behavior. They provide a declarative way to implement cross-cutting concerns.

## Table of Contents

- [Overview](#overview)
- [Available Policies](#available-policies)
- [Policy Configuration](#policy-configuration)
- [Creating Custom Policies](#creating-custom-policies)

## Overview

Policies are implemented using NestJS Guards, Interceptors, and Decorators. They can be applied globally, at the controller level, or at the route level.

## Available Policies

### Authentication Policies

#### JWT Authentication
Validates JWT tokens in the Authorization header.

```typescript
@UseGuards(JwtAuthGuard)
@Query(() => [UserEntity])
async users() {
  return this.usersService.findAll();
}
```

#### API Key Authentication
Validates API keys in the X-API-Key header.

```typescript
@UseGuards(ApiKeyGuard)
@Get('protected')
async protectedRoute() {
  return { message: 'Protected data' };
}
```

### Authorization Policies

#### Role-Based Access Control (RBAC)
Restricts access based on user roles.

```typescript
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Mutation(() => Boolean)
async deleteUser(@Args('id') id: string) {
  return this.usersService.remove(id);
}
```

### Rate Limiting

#### Throttle Policy
Limits the number of requests per time window.

**Global Configuration (.env):**
```bash
THROTTLE_TTL=60      # 60 seconds
THROTTLE_LIMIT=10    # 10 requests per window
```

**Route-Level Override:**
```typescript
@Throttle(100, 60)  // 100 requests per 60 seconds
@Get('data')
async getData() {
  return this.dataService.findAll();
}
```

**Skip Throttling:**
```typescript
@SkipThrottle()
@Get('unlimited')
async unlimitedRoute() {
  return { message: 'No rate limit' };
}
```

### Caching

#### Cache Policy
Caches responses to improve performance.

```typescript
@CacheTTL(60000)  // Cache for 60 seconds
@Query(() => [ProductEntity])
async products() {
  return this.productsService.findAll();
}
```

**Clear Cache:**
```typescript
@Mutation(() => ProductEntity)
async createProduct(@Args('input') input: CreateProductInput) {
  await this.cacheManager.del('products');
  return this.productsService.create(input);
}
```

### Transformation

#### Transform Interceptor
Transforms responses into a standard format.

```typescript
@UseInterceptors(TransformInterceptor)
@Get('data')
async getData() {
  return { data: [1, 2, 3] };
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [1, 2, 3]
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

### Timeout

#### Timeout Interceptor
Prevents long-running requests.

```typescript
@UseInterceptors(new TimeoutInterceptor(3000))  // 3 second timeout
@Get('slow')
async slowRoute() {
  return this.service.slowOperation();
}
```

### Logging

#### Logging Interceptor
Logs all requests and responses.

```typescript
@UseInterceptors(LoggingInterceptor)
@Get('data')
async getData() {
  return this.dataService.findAll();
}
```

**Log Output:**
```
[2025-01-15 10:30:45] INFO [LoggingInterceptor] GET /data - Request received
[2025-01-15 10:30:45] INFO [LoggingInterceptor] GET /data - Response sent (25ms)
```

### CORS

#### CORS Configuration
Configure cross-origin resource sharing.

**Global Configuration (.env):**
```bash
CORS_ORIGIN=https://app.example.com,https://admin.example.com
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
```

**Manual Configuration (main.ts):**
```typescript
app.enableCors({
  origin: ['https://app.example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});
```

### Security Headers

#### Helmet Policy
Adds security headers to responses.

**Automatically enabled** via Helmet:
- XSS Protection
- Content Security Policy
- HSTS
- Frame Options
- DNS Prefetch Control

### Validation

#### Input Validation
Validates input using class-validator.

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

#### Complexity Limit
Prevents expensive GraphQL queries.

**Configuration (.env):**
```bash
MAX_QUERY_COMPLEXITY=100
```

**How it works:**
```graphql
# Simple query (complexity: 2)
query {
  users {
    id
    username
  }
}

# Complex query (complexity: 50+)
query {
  users {
    id
    username
    credentials {
      keyId
      type
    }
    # ... more nested fields
  }
}
```

## Policy Configuration

### Global Policies

Applied to all routes (main.ts):

```typescript
app.useGlobalGuards(new JwtAuthGuard());
app.useGlobalInterceptors(new LoggingInterceptor());
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  })
);
```

### Controller-Level Policies

Applied to all routes in a controller:

```typescript
@UseGuards(ApiKeyGuard)
@UseInterceptors(LoggingInterceptor)
@Controller('api')
export class ApiController {
  // All routes inherit these policies
}
```

### Route-Level Policies

Applied to specific routes:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@CacheTTL(60000)
@Throttle(100, 60)
@Get('admin')
async adminRoute() {
  return { message: 'Admin only' };
}
```

### Policy Composition

Combine multiple policies:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@UseInterceptors(LoggingInterceptor, CacheInterceptor, TransformInterceptor)
@CacheTTL(60000)
@Throttle(100, 60)
@Query(() => [DataEntity])
async complexRoute() {
  return this.service.getData();
}
```

## Creating Custom Policies

### Custom Guard

```typescript
@Injectable()
export class CustomGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Custom logic here
    return true;
  }
}
```

### Custom Interceptor

```typescript
@Injectable()
export class CustomInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before...');
    return next.handle().pipe(
      tap(() => console.log('After...'))
    );
  }
}
```

### Custom Decorator

```typescript
export const CustomDecorator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**Usage:**
```typescript
@Get('me')
async getMe(@CustomDecorator() user: UserEntity) {
  return user;
}
```

## Best Practices

1. **Apply authentication globally**, skip for public routes
2. **Use specific policies** at route level for fine-grained control
3. **Cache expensive operations** with appropriate TTLs
4. **Rate limit** all public endpoints
5. **Validate all inputs** using DTOs and class-validator
6. **Log important operations** for audit trails
7. **Set timeouts** for external service calls
8. **Use RBAC** for authorization instead of custom logic

## Next Steps

- [Consumer Management](../consumer-management/) - Manage API consumers
- [Credential Management](../credential-management/) - Manage credentials
- [Configuration](../configuration/) - Configure policies
- [CLI](../cli/) - Manage policies via CLI

## Additional Resources

- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- [GraphQL Query Complexity](https://github.com/slicknode/graphql-query-complexity)
