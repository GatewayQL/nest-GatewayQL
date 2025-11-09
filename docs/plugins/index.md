---
layout: default
title: Plugin System
---

# Plugin System

The Nest GatewayQL plugin system is inspired by [Express Gateway](https://www.express-gateway.io/docs/plugins/) and provides a flexible way to extend gateway functionality with custom policies, conditions, routes, and GraphQL-specific hooks.

## Table of Contents

- [Overview](#overview)
- [Plugin Architecture](#plugin-architecture)
- [Creating Plugins](#creating-plugins)
- [Plugin Development](#plugin-development)
- [Policy Development](#policy-development)
- [Condition Development](#condition-development)
- [Route Development](#route-development)
- [GraphQL Hooks](#graphql-hooks)
- [Built-in Conditions](#built-in-conditions)
- [Example Plugins](#example-plugins)
- [Configuration](#configuration)

## Overview

Plugins allow you to:

- **Extend functionality** without modifying core code
- **Create reusable policies** for cross-cutting concerns
- **Define conditions** for conditional policy execution
- **Register custom routes** for additional endpoints
- **Hook into GraphQL** execution for schema transformation and resolver middleware
- **Package and distribute** custom gateway extensions

## Plugin Architecture

A plugin in Nest GatewayQL consists of:

```
plugin/
├── manifest (required)    # Plugin definition with init function
├── policies/              # Custom policies
├── conditions/            # Custom conditions
├── routes/                # Custom routes
└── hooks/                 # GraphQL hooks
```

### Plugin Lifecycle

1. **Load**: Plugin is imported from npm package or local file
2. **Validate**: Dependencies and schema are checked
3. **Initialize**: `init()` function is called with plugin context
4. **Register**: Policies, conditions, routes, and hooks are registered
5. **Execute**: Plugin components are used during request processing

## Creating Plugins

### Basic Plugin Structure

```typescript
import { PluginManifest, PluginContext } from '@nest-gatewayql/plugins';

export const myPlugin: PluginManifest = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  author: 'Your Name',

  // Initialization function
  init: async (context: PluginContext) => {
    context.logger.log('Initializing my-plugin');

    // Register policies, conditions, routes, and hooks here
    context.registerPolicy({
      name: 'my-policy',
      policy: myPolicyHandler,
    });

    context.logger.log('My-plugin initialized');
  },

  // Optional: Plugin configuration schema
  schema: {
    $id: 'http://example.com/schemas/plugins/my-plugin.json',
    type: 'object',
    properties: {
      enabled: { type: 'boolean', default: true },
    },
  },

  // Optional: Dependencies on other plugins
  dependencies: ['required-plugin'],
};

export default myPlugin;
```

### Plugin Context

The `PluginContext` provided during initialization gives access to:

```typescript
interface PluginContext {
  // Register a policy
  registerPolicy: (policy: PolicyDefinition) => void;

  // Register a condition
  registerCondition: (condition: ConditionDefinition) => void;

  // Register routes
  registerRoutes: (routes: RouteDefinition[]) => void;

  // Register GraphQL hooks
  registerGraphQLHook: (hook: GraphQLHookDefinition) => void;

  // Register custom providers
  registerProvider: (provider: Type<any>) => void;

  // Get configuration
  getConfig: <T>(path?: string) => T;

  // Plugin logger
  logger: PluginLogger;

  // Plugin settings
  settings: Record<string, any>;
}
```

## Plugin Development

### Step 1: Create Plugin Manifest

```typescript
// my-plugin.ts
import { PluginManifest } from '@nest-gatewayql/plugins';

export const myPlugin: PluginManifest = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Custom plugin for special requirements',

  init: async (context) => {
    // Plugin initialization logic
  },
};
```

### Step 2: Register Components

```typescript
init: async (context) => {
  // Register policy
  context.registerPolicy({
    name: 'custom-auth',
    policy: customAuthPolicy,
    schema: {
      $id: 'custom-auth-schema',
      type: 'object',
      properties: {
        secret: { type: 'string' },
      },
    },
  });

  // Register condition
  context.registerCondition({
    name: 'custom-check',
    handler: customConditionHandler,
  });

  // Register routes
  context.registerRoutes([
    {
      method: 'GET',
      path: '/custom-endpoint',
      handler: async (req, res) => {
        return { message: 'Custom endpoint' };
      },
    },
  ]);

  // Register GraphQL hook
  context.registerGraphQLHook({
    type: GraphQLHookType.RESOLVER_MIDDLEWARE,
    priority: 10,
    handler: resolverMiddleware,
  });
}
```

### Step 3: Package Plugin

```json
// package.json
{
  "name": "my-gatewayql-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@nestjs/common": "^11.0.0"
  }
}
```

## Policy Development

Policies are functions that modify request/response behavior.

### Function-Based Policy

```typescript
import { PolicyHandler } from '@nest-gatewayql/plugins';

const myPolicy: PolicyHandler = async (params, context) => {
  const { req, res, next } = context;

  // Policy logic
  console.log('Processing request:', req.url);

  // Modify request
  req.headers['x-custom'] = 'value';

  // Continue execution
  return true; // or call next()

  // Stop execution
  // return false;
};
```

### Policy with Configuration

```typescript
const configurablePolicy: PolicyHandler = async (params, context) => {
  const { enabled, timeout } = params;

  if (!enabled) {
    return true; // Skip if disabled
  }

  // Use timeout configuration
  const timeoutMs = timeout || 5000;

  // Policy logic with configuration
  // ...

  return true;
};

// Register with schema
context.registerPolicy({
  name: 'configurable-policy',
  policy: configurablePolicy,
  schema: {
    $id: 'configurable-policy-schema',
    type: 'object',
    properties: {
      enabled: { type: 'boolean', default: true },
      timeout: { type: 'number', default: 5000 },
    },
  },
});
```

### Policy Context

```typescript
interface PolicyContext {
  // HTTP request
  req: Request;

  // HTTP response
  res: Response;

  // Continue to next policy
  next: () => void;

  // GraphQL context (if applicable)
  graphql?: {
    info: any;
    args: any;
    context: any;
  };
}
```

## Condition Development

Conditions determine when policies should execute.

### Basic Condition

```typescript
import { ConditionHandler } from '@nest-gatewayql/plugins';

const myCondition: ConditionHandler = (config, context) => {
  const { req } = context;

  // Return true if condition is met
  return req.headers['x-custom'] === 'expected-value';
};

context.registerCondition({
  name: 'custom-header-check',
  handler: myCondition,
});
```

### Advanced Condition with Configuration

```typescript
interface CustomConditionConfig {
  headerName: string;
  expectedValue: string;
  caseSensitive?: boolean;
}

const advancedCondition: ConditionHandler = (
  config: CustomConditionConfig,
  context,
) => {
  const { req } = context;
  const headerValue = req.headers[config.headerName.toLowerCase()];

  if (!headerValue) return false;

  if (config.caseSensitive) {
    return headerValue === config.expectedValue;
  }

  return headerValue.toLowerCase() === config.expectedValue.toLowerCase();
};

context.registerCondition({
  name: 'flexible-header',
  handler: advancedCondition,
  schema: {
    $id: 'flexible-header-schema',
    type: 'object',
    properties: {
      headerName: { type: 'string' },
      expectedValue: { type: 'string' },
      caseSensitive: { type: 'boolean', default: false },
    },
    required: ['headerName', 'expectedValue'],
  },
});
```

## Route Development

Register custom HTTP endpoints through plugins.

### Basic Route

```typescript
context.registerRoutes([
  {
    method: 'GET',
    path: '/status',
    handler: async (req, res) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    },
  },
]);
```

### Route with Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};

context.registerRoutes([
  {
    method: 'POST',
    path: '/protected',
    middleware: [authMiddleware],
    handler: async (req, res) => {
      return { message: 'Protected data', user: req.user };
    },
  },
]);
```

## GraphQL Hooks

GraphQL hooks allow you to intercept and modify GraphQL execution.

### Hook Types

```typescript
enum GraphQLHookType {
  SCHEMA_TRANSFORM = 'schema_transform',
  RESOLVER_MIDDLEWARE = 'resolver_middleware',
  SUBGRAPH_REQUEST = 'subgraph_request',
  ENTITY_REFERENCE = 'entity_reference',
}
```

### Schema Transform Hook

```typescript
context.registerGraphQLHook({
  type: GraphQLHookType.SCHEMA_TRANSFORM,
  priority: 10,
  handler: (hookContext) => {
    const { schema } = hookContext;

    // Modify schema
    // Example: Add custom directives, transform types, etc.

    return schema;
  },
});
```

### Resolver Middleware Hook

```typescript
context.registerGraphQLHook({
  type: GraphQLHookType.RESOLVER_MIDDLEWARE,
  priority: 10,
  handler: (hookContext) => {
    const { info, args, context } = hookContext;

    // Log resolver execution
    console.log(`Executing resolver: ${info.fieldName}`);

    // Modify args or context
    context.customData = 'added-by-plugin';

    return hookContext;
  },
});
```

### Subgraph Request Hook

```typescript
context.registerGraphQLHook({
  type: GraphQLHookType.SUBGRAPH_REQUEST,
  priority: 10,
  handler: (hookContext) => {
    const { subgraphName, request } = hookContext;

    // Add custom headers to subgraph requests
    request.headers['x-plugin'] = 'my-plugin';

    console.log(`Request to subgraph: ${subgraphName}`);

    return hookContext;
  },
});
```

## Built-in Conditions

Nest GatewayQL provides built-in conditions similar to Express Gateway:

### pathMatch

Match request path against patterns:

```typescript
{
  pathMatch: '/api/*'
}

// Or multiple patterns
{
  pathMatch: ['/api/*', '/v1/*']
}
```

### method

Match HTTP method:

```typescript
{
  method: 'POST'
}

// Or multiple methods
{
  method: ['POST', 'PUT']
}
```

### header

Match request headers:

```typescript
{
  header: {
    name: 'content-type',
    value: 'application/json'
  }
}

// Check if header exists
{
  header: {
    name: 'authorization',
    exists: true
  }
}
```

### queryParam

Match query parameters:

```typescript
{
  queryParam: {
    name: 'api_key',
    exists: true
  }
}

// Match parameter value
{
  queryParam: {
    name: 'version',
    value: 'v2'
  }
}
```

### graphqlOperation

Match GraphQL operation type:

```typescript
{
  graphqlOperation: 'mutation'
}

// Or multiple types
{
  graphqlOperation: ['query', 'subscription']
}
```

### Combining Conditions

```typescript
// AND conditions (all must be true)
{
  and: [
    { method: 'POST' },
    { pathMatch: '/api/*' },
    { header: { name: 'content-type', value: 'application/json' } }
  ]
}

// OR conditions (at least one must be true)
{
  or: [
    { method: 'GET' },
    { method: 'HEAD' }
  ]
}

// NOT condition
{
  not: {
    pathMatch: '/public/*'
  }
}
```

## Example Plugins

### Rate Limit Plugin

See [examples/rate-limit-plugin.ts](../../src/plugins/examples/rate-limit-plugin.ts)

```typescript
import { PluginManifest, PolicyHandler } from '@nest-gatewayql/plugins';

const rateLimitPolicy: PolicyHandler = async (params, context) => {
  const { windowMs = 60000, max = 100 } = params;
  // Rate limiting logic...
};

export const rateLimitPlugin: PluginManifest = {
  name: 'rate-limit',
  version: '1.0.0',
  init: async (context) => {
    context.registerPolicy({
      name: 'rate-limit',
      policy: rateLimitPolicy,
    });
  },
};
```

### Logging Plugin

See [examples/logging-plugin.ts](../../src/plugins/examples/logging-plugin.ts)

### CORS Plugin

See [examples/cors-plugin.ts](../../src/plugins/examples/cors-plugin.ts)

## Configuration

Configure plugins in your gateway configuration file:

### Environment Configuration

```bash
# .env
PLUGINS='[{"package":"./plugins/my-plugin","enabled":true,"settings":{"key":"value"}}]'
```

### Configuration File

```typescript
// config/gateway.configuration.ts
export default registerAs('gateway', () => ({
  plugins: [
    {
      package: 'my-gatewayql-plugin', // npm package
      enabled: true,
      settings: {
        apiKey: process.env.PLUGIN_API_KEY,
        timeout: 5000,
      },
    },
    {
      package: './plugins/local-plugin', // local file
      enabled: true,
      settings: {
        customOption: true,
      },
    },
  ],
}));
```

### Using Plugin Policies

Once a plugin is loaded, its policies can be used in your gateway configuration:

```typescript
// Apply policy to specific routes
const policyConfig = {
  name: 'rate-limit',
  params: {
    windowMs: 60000,
    max: 100,
  },
  condition: {
    pathMatch: '/api/*',
  },
};
```

## Best Practices

1. **Version your plugins** using semantic versioning
2. **Validate configuration** using JSON schemas
3. **Handle errors gracefully** in policies and conditions
4. **Log important events** using the plugin logger
5. **Test thoroughly** with unit and integration tests
6. **Document configuration** options and usage
7. **Keep dependencies minimal** to avoid conflicts
8. **Use TypeScript** for type safety
9. **Follow naming conventions** (kebab-case for names)
10. **Provide examples** for common use cases

## Next Steps

- [Policy Reference](./policies/) - Built-in policies
- [Condition Reference](./conditions/) - Built-in conditions
- [API Reference](../api/) - Complete API documentation
- [Examples](../../src/plugins/examples/) - Example plugins

## Additional Resources

- [Express Gateway Plugins](https://www.express-gateway.io/docs/plugins/)
- [NestJS Modules](https://docs.nestjs.com/modules)
- [Apollo Federation](https://www.apollographql.com/docs/federation/)
