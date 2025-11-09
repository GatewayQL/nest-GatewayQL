---
layout: default
title: Condition Development
---

# Condition Development

Learn how to create custom conditions for Nest GatewayQL, inspired by [Express Gateway condition development](https://www.express-gateway.io/docs/plugins/condition-development/).

## Overview

Conditions determine when policies should be executed. They are boolean functions that evaluate request properties and return `true` or `false`.

## Condition Structure

```typescript
import { ConditionHandler, ConditionContext } from '@nest-gatewayql/plugins';

const myCondition: ConditionHandler = (config, context) => {
  const { req, res } = context;

  // Evaluation logic
  return true; // or false
};
```

## Condition Context

The `ConditionContext` provides access to:

```typescript
interface ConditionContext {
  // HTTP request object
  req: Request;

  // HTTP response object
  res: Response;

  // GraphQL context (if applicable)
  graphql?: {
    info: any;
    args: any;
    context: any;
  };
}
```

## Creating Conditions

### Simple Condition

```typescript
import { ConditionHandler } from '@nest-gatewayql/plugins';

const isPostRequest: ConditionHandler = (config, context) => {
  return context.req.method === 'POST';
};
```

### Condition with Configuration

```typescript
interface HeaderConditionConfig {
  name: string;
  value?: string;
  exists?: boolean;
}

const headerCondition: ConditionHandler = (
  config: HeaderConditionConfig,
  context,
) => {
  const { req } = context;
  const headerValue = req.headers[config.name.toLowerCase()];

  if (config.exists !== undefined) {
    return config.exists ? headerValue !== undefined : headerValue === undefined;
  }

  if (config.value !== undefined) {
    return String(headerValue) === config.value;
  }

  return false;
};
```

### Async Condition

```typescript
const hasValidSession: ConditionHandler = async (config, context) => {
  const { req } = context;
  const sessionId = req.headers['x-session-id'];

  if (!sessionId) {
    return false;
  }

  // Check session validity in database/cache
  const isValid = await checkSessionValidity(sessionId);

  return isValid;
};
```

## Registering Conditions

### In Plugin Initialization

```typescript
init: async (context: PluginContext) => {
  context.registerCondition({
    name: 'header-check',
    handler: headerCondition,
    schema: {
      $id: 'header-check-schema',
      type: 'object',
      properties: {
        name: { type: 'string' },
        value: { type: 'string' },
        exists: { type: 'boolean' },
      },
      required: ['name'],
    },
  });
}
```

## Condition Examples

### Path Match Condition

```typescript
import { pathToRegexp } from 'path-to-regexp';

const pathMatchCondition: ConditionHandler = (config: string | string[], context) => {
  const { req } = context;
  const patterns = Array.isArray(config) ? config : [config];

  for (const pattern of patterns) {
    const regex = pathToRegexp(pattern);
    if (regex.test(req.path || req.url)) {
      return true;
    }
  }

  return false;
};

// Usage
{
  pathMatch: '/api/*'
}
```

### Method Condition

```typescript
const methodCondition: ConditionHandler = (config: string | string[], context) => {
  const { req } = context;
  const methods = Array.isArray(config) ? config : [config];

  return methods.some(
    (method) => method.toUpperCase() === req.method?.toUpperCase()
  );
};

// Usage
{
  method: ['POST', 'PUT']
}
```

### Query Parameter Condition

```typescript
interface QueryParamConfig {
  name: string;
  value?: string;
  exists?: boolean;
}

const queryParamCondition: ConditionHandler = (
  config: QueryParamConfig,
  context,
) => {
  const { req } = context;
  const paramValue = req.query?.[config.name];

  if (config.exists !== undefined) {
    return config.exists ? paramValue !== undefined : paramValue === undefined;
  }

  if (config.value !== undefined) {
    return String(paramValue) === config.value;
  }

  return false;
};

// Usage
{
  queryParam: {
    name: 'api_key',
    exists: true
  }
}
```

### IP Address Condition

```typescript
const ipRangeCondition: ConditionHandler = (config: string | string[], context) => {
  const { req } = context;
  const allowedIPs = Array.isArray(config) ? config : [config];

  const clientIP = req.ip || req.connection.remoteAddress;

  return allowedIPs.includes(clientIP);
};

// Usage
{
  ipRange: ['192.168.1.1', '10.0.0.1']
}
```

### Time-Based Condition

```typescript
interface TimeRangeConfig {
  start: string; // HH:MM
  end: string; // HH:MM
  timezone?: string;
}

const timeRangeCondition: ConditionHandler = (
  config: TimeRangeConfig,
  context,
) => {
  const now = new Date();
  const [startHour, startMin] = config.start.split(':').map(Number);
  const [endHour, endMin] = config.end.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

// Usage
{
  timeRange: {
    start: '09:00',
    end: '17:00'
  }
}
```

### User Agent Condition

```typescript
const userAgentCondition: ConditionHandler = (config: string | RegExp, context) => {
  const { req } = context;
  const userAgent = req.headers['user-agent'];

  if (!userAgent) {
    return false;
  }

  if (config instanceof RegExp) {
    return config.test(userAgent);
  }

  return userAgent.includes(config);
};

// Usage
{
  userAgent: /mobile/i
}
```

### GraphQL Operation Condition

```typescript
type GraphQLOperationType = 'query' | 'mutation' | 'subscription';

const graphqlOperationCondition: ConditionHandler = (
  config: GraphQLOperationType | GraphQLOperationType[],
  context,
) => {
  const { req } = context;
  const operations = Array.isArray(config) ? config : [config];

  if (!req.body?.query) {
    return false;
  }

  const query = req.body.query as string;

  for (const operation of operations) {
    const regex = new RegExp(`^\\s*${operation}\\s`, 'i');
    if (regex.test(query)) {
      return true;
    }
  }

  return false;
};

// Usage
{
  graphqlOperation: 'mutation'
}
```

### Custom JWT Claim Condition

```typescript
interface JWTClaimConfig {
  claim: string;
  value: any;
}

const jwtClaimCondition: ConditionHandler = (
  config: JWTClaimConfig,
  context,
) => {
  const { req } = context;

  // Assume JWT is already verified and decoded
  const user = (req as any).user;

  if (!user) {
    return false;
  }

  return user[config.claim] === config.value;
};

// Usage
{
  jwtClaim: {
    claim: 'role',
    value: 'admin'
  }
}
```

## Combining Conditions

Conditions can be combined using logical operators:

### AND Conditions

```typescript
{
  and: [
    { method: 'POST' },
    { pathMatch: '/api/*' },
    { header: { name: 'content-type', value: 'application/json' } }
  ]
}
```

### OR Conditions

```typescript
{
  or: [
    { method: 'GET' },
    { method: 'HEAD' }
  ]
}
```

### NOT Condition

```typescript
{
  not: {
    pathMatch: '/public/*'
  }
}
```

### Complex Combination

```typescript
{
  and: [
    {
      or: [
        { method: 'POST' },
        { method: 'PUT' }
      ]
    },
    {
      not: {
        pathMatch: '/public/*'
      }
    },
    {
      header: {
        name: 'authorization',
        exists: true
      }
    }
  ]
}
```

## Testing Conditions

### Unit Tests

```typescript
import { pathMatchCondition } from './path-match-condition';
import { ConditionContext } from '@nest-gatewayql/plugins';

describe('Path Match Condition', () => {
  let mockContext: ConditionContext;

  beforeEach(() => {
    mockContext = {
      req: {
        path: '/api/users',
      } as any,
      res: {} as any,
    };
  });

  it('should match wildcard pattern', () => {
    const result = pathMatchCondition('/api/*', mockContext);
    expect(result).toBe(true);
  });

  it('should not match non-matching pattern', () => {
    const result = pathMatchCondition('/admin/*', mockContext);
    expect(result).toBe(false);
  });

  it('should match array of patterns', () => {
    const result = pathMatchCondition(
      ['/api/*', '/v1/*'],
      mockContext
    );
    expect(result).toBe(true);
  });
});
```

### Integration Tests

```typescript
import { ConditionEvaluator } from '../executors/condition.evaluator';
import { ConditionRegistry } from '../registries/condition.registry';

describe('Condition Evaluator', () => {
  let evaluator: ConditionEvaluator;
  let registry: ConditionRegistry;

  beforeEach(() => {
    registry = new ConditionRegistry();
    evaluator = new ConditionEvaluator(registry, logger);

    // Register conditions
    registry.register({
      name: 'pathMatch',
      handler: pathMatchCondition,
    });
    registry.register({
      name: 'method',
      handler: methodCondition,
    });
  });

  it('should evaluate AND conditions', async () => {
    const context = {
      req: { method: 'POST', path: '/api/users' } as any,
      res: {} as any,
    };

    const result = await evaluator.evaluate(
      {
        and: [
          { method: 'POST' },
          { pathMatch: '/api/*' }
        ]
      },
      context
    );

    expect(result).toBe(true);
  });
});
```

## Best Practices

1. **Keep It Simple**: Conditions should be fast and simple
2. **Avoid Side Effects**: Don't modify request or response
3. **Return Boolean**: Always return true or false
4. **Handle Edge Cases**: Check for undefined/null values
5. **Use Type Safety**: Define TypeScript interfaces for configs
6. **Performance**: Optimize for speed (conditions run frequently)
7. **Documentation**: Document what the condition checks
8. **Testing**: Test all edge cases
9. **Async Carefully**: Only use async when necessary
10. **Configuration Schema**: Provide JSON schemas for validation

## Advanced Patterns

### Condition Factory

```typescript
function createRegexCondition(field: 'path' | 'userAgent') {
  return (config: RegExp, context: ConditionContext) => {
    const value = field === 'path'
      ? context.req.path
      : context.req.headers['user-agent'];

    return config.test(value || '');
  };
}

const pathRegexCondition = createRegexCondition('path');
const userAgentRegexCondition = createRegexCondition('userAgent');
```

### Cached Condition Results

```typescript
const cache = new Map<string, boolean>();

const cachedCondition: ConditionHandler = (config, context) => {
  const cacheKey = `${context.req.method}:${context.req.path}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const result = expensiveCheck(context);
  cache.set(cacheKey, result);

  return result;
};
```

## Next Steps

- [Policy Development](./policy-development/) - Create policies that use conditions
- [Plugin Development](./plugin-development/) - Create complete plugins
- [Examples](../../src/plugins/examples/) - See example conditions
