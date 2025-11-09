---
layout: default
title: Policy Development
---

# Policy Development

Learn how to create custom policies for Nest GatewayQL, inspired by [Express Gateway policy development](https://www.express-gateway.io/docs/plugins/policy-development/).

## Overview

Policies are the core building blocks of the plugin system. They are middleware-like functions that process requests and responses, implementing cross-cutting concerns like authentication, rate limiting, transformation, and more.

## Policy Structure

A policy is a function that receives parameters and a context:

```typescript
import { PolicyHandler, PolicyContext } from '@nest-gatewayql/plugins';

const myPolicy: PolicyHandler = async (params, context) => {
  const { req, res, next } = context;

  // Policy logic here

  return true; // Continue to next policy
  // or
  return false; // Stop execution
  // or
  next(); // Call next middleware
};
```

## Policy Context

The `PolicyContext` provides access to:

```typescript
interface PolicyContext {
  // HTTP request object
  req: Request;

  // HTTP response object
  res: Response;

  // Continue to next policy
  next: () => void;

  // GraphQL execution context (if applicable)
  graphql?: {
    info: any;
    args: any;
    context: any;
  };
}
```

## Creating Policies

### Basic Policy

```typescript
import { PolicyHandler } from '@nest-gatewayql/plugins';

const logRequestPolicy: PolicyHandler = async (params, context) => {
  const { req } = context;

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  return true; // Continue execution
};
```

### Policy with Parameters

```typescript
interface CustomHeaderParams {
  headerName: string;
  headerValue: string;
}

const addCustomHeaderPolicy: PolicyHandler = async (
  params: CustomHeaderParams,
  context,
) => {
  const { res } = context;

  res.setHeader(params.headerName, params.headerValue);

  return true;
};
```

### Async Policy

```typescript
const fetchUserDataPolicy: PolicyHandler = async (params, context) => {
  const { req } = context;

  const userId = req.headers['x-user-id'];

  if (!userId) {
    context.res.status(400).json({ error: 'User ID required' });
    return false; // Stop execution
  }

  // Fetch user data from external service
  const userData = await fetch(`https://api.example.com/users/${userId}`);

  // Attach to request for downstream use
  (req as any).userData = userData;

  return true;
};
```

### Policy with Error Handling

```typescript
const safetyPolicy: PolicyHandler = async (params, context) => {
  try {
    // Risky operation
    const result = await riskyOperation();

    (context.req as any).result = result;
    return true;
  } catch (error) {
    console.error('Policy error:', error);

    context.res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });

    return false; // Stop execution
  }
};
```

## Registering Policies

### In Plugin Initialization

```typescript
init: async (context: PluginContext) => {
  context.registerPolicy({
    name: 'add-custom-header',
    policy: addCustomHeaderPolicy,
    schema: {
      $id: 'add-custom-header-schema',
      type: 'object',
      properties: {
        headerName: { type: 'string' },
        headerValue: { type: 'string' },
      },
      required: ['headerName', 'headerValue'],
    },
  });
}
```

### With Configuration Schema

```typescript
context.registerPolicy({
  name: 'rate-limit',
  policy: rateLimitPolicy,
  schema: {
    $id: 'rate-limit-schema',
    type: 'object',
    properties: {
      windowMs: {
        type: 'number',
        description: 'Time window in milliseconds',
        default: 60000,
        minimum: 1000,
      },
      max: {
        type: 'number',
        description: 'Maximum requests per window',
        default: 100,
        minimum: 1,
      },
      message: {
        type: 'string',
        description: 'Error message when limit exceeded',
        default: 'Too many requests',
      },
    },
  },
});
```

## Policy Examples

### Authentication Policy

```typescript
const jwtAuthPolicy: PolicyHandler = async (params, context) => {
  const { req, res } = context;
  const { secret } = params;

  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return false;
  }

  try {
    const decoded = verifyJWT(token, secret);
    (req as any).user = decoded;
    return true;
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return false;
  }
};
```

### Rate Limiting Policy

```typescript
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const rateLimitPolicy: PolicyHandler = async (params, context) => {
  const { windowMs = 60000, max = 100 } = params;
  const { req, res } = context;

  const key = req.ip || 'unknown';
  const now = Date.now();

  let record = requestCounts.get(key);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    requestCounts.set(key, record);
  } else {
    record.count++;
  }

  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));

  if (record.count > max) {
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: new Date(record.resetTime).toISOString(),
    });
    return false;
  }

  return true;
};
```

### Request Transformation Policy

```typescript
const transformRequestPolicy: PolicyHandler = async (params, context) => {
  const { req } = context;
  const { addFields, removeFields } = params;

  if (req.body) {
    // Add fields
    if (addFields) {
      Object.assign(req.body, addFields);
    }

    // Remove fields
    if (removeFields) {
      removeFields.forEach((field: string) => {
        delete req.body[field];
      });
    }
  }

  return true;
};
```

### Response Transformation Policy

```typescript
const transformResponsePolicy: PolicyHandler = async (params, context) => {
  const { res } = context;

  // Override res.json to transform responses
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    const transformed = {
      success: true,
      timestamp: new Date().toISOString(),
      data: body,
    };
    return originalJson(transformed);
  };

  return true;
};
```

### CORS Policy

```typescript
const corsPolicy: PolicyHandler = async (params, context) => {
  const { req, res } = context;
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE'],
    credentials = false,
  } = params;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));

  if (credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false; // Stop for preflight
  }

  return true;
};
```

### Caching Policy

```typescript
const cache = new Map<string, { data: any; expires: number }>();

const cachePolicy: PolicyHandler = async (params, context) => {
  const { req, res } = context;
  const { ttl = 60000, keyPrefix = 'cache:' } = params;

  const cacheKey = keyPrefix + req.url;
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    res.json(cached.data);
    return false; // Stop execution, serve from cache
  }

  // Override res.json to cache response
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    cache.set(cacheKey, {
      data: body,
      expires: Date.now() + ttl,
    });
    return originalJson(body);
  };

  return true;
};
```

## GraphQL-Specific Policies

### Query Complexity Policy

```typescript
const queryComplexityPolicy: PolicyHandler = async (params, context) => {
  const { maxComplexity = 100 } = params;
  const { graphql, res } = context;

  if (!graphql) {
    return true; // Not a GraphQL request
  }

  // Calculate query complexity (simplified)
  const complexity = calculateComplexity(graphql.info);

  if (complexity > maxComplexity) {
    res.status(400).json({
      error: 'Query too complex',
      complexity,
      maxComplexity,
    });
    return false;
  }

  return true;
};
```

### Field-Level Authorization Policy

```typescript
const fieldAuthPolicy: PolicyHandler = async (params, context) => {
  const { requiredRole } = params;
  const { graphql, res } = context;

  if (!graphql) {
    return true;
  }

  const user = (graphql.context as any).user;

  if (!user || user.role !== requiredRole) {
    res.status(403).json({
      error: 'Forbidden',
      message: `Role '${requiredRole}' required`,
    });
    return false;
  }

  return true;
};
```

## Testing Policies

### Unit Tests

```typescript
import { rateLimitPolicy } from './rate-limit-policy';
import { PolicyContext } from '@nest-gatewayql/plugins';

describe('Rate Limit Policy', () => {
  let mockContext: PolicyContext;

  beforeEach(() => {
    mockContext = {
      req: {
        ip: '127.0.0.1',
        headers: {},
      } as any,
      res: {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any,
      next: jest.fn(),
    };
  });

  it('should allow requests under limit', async () => {
    const result = await rateLimitPolicy(
      { windowMs: 60000, max: 10 },
      mockContext,
    );

    expect(result).toBe(true);
    expect(mockContext.res.setHeader).toHaveBeenCalled();
  });

  it('should reject requests over limit', async () => {
    const params = { windowMs: 60000, max: 2 };

    await rateLimitPolicy(params, mockContext);
    await rateLimitPolicy(params, mockContext);
    const result = await rateLimitPolicy(params, mockContext);

    expect(result).toBe(false);
    expect(mockContext.res.status).toHaveBeenCalledWith(429);
  });
});
```

## Best Practices

1. **Return Values**: Return `true` to continue, `false` to stop
2. **Error Handling**: Always handle errors gracefully
3. **Async Operations**: Use async/await for asynchronous operations
4. **Performance**: Keep policies lightweight and fast
5. **Side Effects**: Be careful with modifying req/res objects
6. **Testing**: Write comprehensive unit tests
7. **Documentation**: Document parameters and behavior
8. **Configuration**: Use schemas for parameter validation
9. **Logging**: Log important events and errors
10. **Reusability**: Make policies configurable and reusable

## Next Steps

- [Condition Development](./condition-development/) - Create conditions for policies
- [Plugin Development](./plugin-development/) - Create complete plugins
- [Examples](../../src/plugins/examples/) - See example policies
