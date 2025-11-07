# Policies

This directory contains reusable policies (similar to Express Gateway's policy system) that can be applied to routes and controllers.

## Available Policies

### Guards

- **ApiKeyGuard** - API key authentication
- **RolesGuard** - Role-based access control

### Interceptors

- **LoggingInterceptor** - Request/response logging
- **TransformInterceptor** - Standardize API responses
- **TimeoutInterceptor** - Request timeout protection

### Decorators

- **@Public()** - Skip authentication
- **@SkipThrottle()** - Skip rate limiting
- **@CacheTTL(ms)** - Set custom cache TTL
- **@Roles(...roles)** - Require specific roles

## Usage Examples

### API Key Authentication

```typescript
@Controller('api')
@UseGuards(ApiKeyGuard)
export class ApiController {
  // All routes require API key

  @Get('public')
  @Public() // This route is public
  getPublicData() {
    return { message: 'Public data' };
  }
}
```

### Rate Limiting

```typescript
@Controller('data')
export class DataController {
  @Get('limited')
  // Uses global rate limiting

  @Get('unlimited')
  @SkipThrottle() // Skip rate limiting
  getUnlimitedData() {
    return { data: 'unlimited' };
  }
}
```

### Response Caching

```typescript
@Controller('cache')
export class CacheController {
  @Get('short')
  @CacheTTL(10000) // Cache for 10 seconds
  getShortCached() {
    return { data: 'cached for 10s' };
  }

  @Get('long')
  @CacheTTL(60000) // Cache for 60 seconds
  getLongCached() {
    return { data: 'cached for 60s' };
  }
}
```

### Request Transformation

```typescript
@Controller('api')
@UseInterceptors(TransformInterceptor)
export class ApiController {
  @Get('data')
  getData() {
    return { name: 'John' };
  }
  // Returns: { data: { name: 'John' }, statusCode: 200, message: 'Success', timestamp: '...' }
}
```

### Timeout Protection

```typescript
@Controller('api')
@UseInterceptors(new TimeoutInterceptor(3000)) // 3 second timeout
export class ApiController {
  @Get('slow')
  async getSlowData() {
    // Will throw timeout error if takes > 3 seconds
  }
}
```

## Creating Custom Policies

To create a custom policy, follow the NestJS patterns:

1. **Guard** - For authentication/authorization
2. **Interceptor** - For request/response transformation
3. **Pipe** - For validation/transformation
4. **Middleware** - For request preprocessing

Example custom policy:

```typescript
@Injectable()
export class CustomPolicy implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Your policy logic here
    return next.handle();
  }
}
```
