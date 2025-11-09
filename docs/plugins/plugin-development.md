---
layout: default
title: Plugin Development
---

# Plugin Development

Learn how to create custom plugins for Nest GatewayQL inspired by [Express Gateway plugin development](https://www.express-gateway.io/docs/plugins/plugin-development/).

## Overview

A plugin is a JavaScript/TypeScript module that extends the gateway functionality by registering policies, conditions, routes, and GraphQL hooks.

## Plugin Structure

```typescript
import { PluginManifest, PluginContext } from '@nest-gatewayql/plugins';

export const pluginManifest: PluginManifest = {
  // Required: Unique plugin name
  name: 'my-plugin',

  // Required: Plugin version (semver)
  version: '1.0.0',

  // Optional: Description
  description: 'Description of what this plugin does',

  // Optional: Author information
  author: 'Your Name <your.email@example.com>',

  // Required: Initialization function
  init: async (context: PluginContext) => {
    // Plugin initialization logic
  },

  // Optional: Configuration schema for validation
  schema: {
    $id: 'http://example.com/schemas/my-plugin.json',
    type: 'object',
    properties: {
      // Plugin configuration properties
    },
  },

  // Optional: Plugin dependencies
  dependencies: ['other-plugin'],
};

export default pluginManifest;
```

## Initialization Function

The `init` function is called when the plugin is loaded and receives a `PluginContext`:

```typescript
init: async (context: PluginContext) => {
  // Access plugin logger
  context.logger.log('Initializing my plugin');

  // Get plugin configuration
  const config = context.getConfig();
  const specificValue = context.getConfig('specific.path');

  // Register components
  context.registerPolicy({ /* ... */ });
  context.registerCondition({ /* ... */ });
  context.registerRoutes([/* ... */]);
  context.registerGraphQLHook({ /* ... */ });

  // Access plugin settings
  const settings = context.settings;

  context.logger.log('Plugin initialized successfully');
}
```

## Plugin Context API

### registerPolicy

Register a policy that can be used in the gateway:

```typescript
context.registerPolicy({
  name: 'my-policy',
  policy: myPolicyHandler,
  schema: {
    $id: 'my-policy-schema',
    type: 'object',
    properties: {
      param1: { type: 'string' },
      param2: { type: 'number' },
    },
  },
});
```

### registerCondition

Register a condition for conditional policy execution:

```typescript
context.registerCondition({
  name: 'my-condition',
  handler: myConditionHandler,
  schema: {
    $id: 'my-condition-schema',
    type: 'object',
    properties: {
      value: { type: 'string' },
    },
  },
});
```

### registerRoutes

Register custom HTTP endpoints:

```typescript
context.registerRoutes([
  {
    method: 'GET',
    path: '/custom-endpoint',
    handler: async (req, res) => {
      return { message: 'Hello from plugin' };
    },
    middleware: [/* optional middleware */],
  },
]);
```

### registerGraphQLHook

Register GraphQL execution hooks:

```typescript
import { GraphQLHookType } from '@nest-gatewayql/plugins';

context.registerGraphQLHook({
  type: GraphQLHookType.RESOLVER_MIDDLEWARE,
  priority: 10, // Lower = earlier execution
  handler: (hookContext) => {
    // Hook logic
    return hookContext;
  },
});
```

### getConfig

Get configuration values:

```typescript
// Get all plugin settings
const allSettings = context.getConfig();

// Get specific configuration path from gateway config
const apiKey = context.getConfig<string>('api.key');
```

### logger

Plugin logger with context:

```typescript
context.logger.log('Info message');
context.logger.error('Error message', error.stack);
context.logger.warn('Warning message');
context.logger.debug('Debug message');
context.logger.verbose('Verbose message');
```

## Plugin Configuration Schema

Define a JSON schema to validate plugin configuration:

```typescript
schema: {
  $id: 'http://example.com/schemas/my-plugin.json',
  type: 'object',
  properties: {
    enabled: {
      type: 'boolean',
      description: 'Enable or disable the plugin',
      default: true,
    },
    apiKey: {
      type: 'string',
      description: 'API key for external service',
    },
    timeout: {
      type: 'number',
      description: 'Request timeout in milliseconds',
      default: 5000,
      minimum: 100,
      maximum: 30000,
    },
    endpoints: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'List of endpoint URLs',
    },
  },
  required: ['apiKey'],
}
```

## Plugin Dependencies

Specify other plugins that must be loaded first:

```typescript
dependencies: ['logging-plugin', 'auth-plugin']
```

The plugin manager ensures dependencies are loaded in the correct order.

## Complete Example

```typescript
import {
  PluginManifest,
  PluginContext,
  PolicyHandler,
} from '@nest-gatewayql/plugins';

// Policy implementation
const customAuthPolicy: PolicyHandler = async (params, context) => {
  const { apiKey } = params;
  const { req, res } = context;

  const providedKey = req.headers['x-api-key'];

  if (providedKey !== apiKey) {
    res.status(401).json({ error: 'Invalid API key' });
    return false; // Stop execution
  }

  return true; // Continue
};

// Plugin manifest
export const customAuthPlugin: PluginManifest = {
  name: 'custom-auth',
  version: '1.0.0',
  description: 'Custom API key authentication plugin',
  author: 'Your Name',

  init: async (context: PluginContext) => {
    context.logger.log('Initializing custom-auth plugin');

    const settings = context.getConfig();

    // Register policy
    context.registerPolicy({
      name: 'custom-api-key',
      policy: customAuthPolicy,
      schema: {
        $id: 'custom-api-key-schema',
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'Expected API key',
          },
        },
        required: ['apiKey'],
      },
    });

    // Register health check endpoint
    context.registerRoutes([
      {
        method: 'GET',
        path: '/auth-status',
        handler: async (req, res) => {
          return {
            plugin: 'custom-auth',
            version: '1.0.0',
            status: 'active',
          };
        },
      },
    ]);

    context.logger.log('Custom-auth plugin initialized');
  },

  schema: {
    $id: 'custom-auth-plugin-schema',
    type: 'object',
    properties: {
      defaultApiKey: {
        type: 'string',
        description: 'Default API key if not specified in policy',
      },
    },
  },
};

export default customAuthPlugin;
```

## Publishing Plugins

### As NPM Package

1. Create `package.json`:

```json
{
  "name": "my-gatewayql-plugin",
  "version": "1.0.0",
  "description": "Custom plugin for Nest GatewayQL",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "peerDependencies": {
    "@nestjs/common": "^11.0.0"
  },
  "keywords": ["nest-gatewayql", "plugin", "gateway"]
}
```

2. Build and publish:

```bash
npm run build
npm publish
```

3. Install in gateway:

```bash
npm install my-gatewayql-plugin
```

### As Local Module

Place plugin in a local directory and reference it:

```typescript
// config/gateway.configuration.ts
plugins: [
  {
    package: './plugins/my-local-plugin',
    enabled: true,
  },
];
```

## Testing Plugins

### Unit Tests

```typescript
import { customAuthPlugin } from './custom-auth-plugin';
import { PluginContext } from '@nest-gatewayql/plugins';

describe('CustomAuthPlugin', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = {
      registerPolicy: jest.fn(),
      registerCondition: jest.fn(),
      registerRoutes: jest.fn(),
      registerGraphQLHook: jest.fn(),
      registerProvider: jest.fn(),
      getConfig: jest.fn(),
      logger: {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      },
      settings: {},
    };
  });

  it('should register policy on initialization', async () => {
    await customAuthPlugin.init(mockContext);
    expect(mockContext.registerPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'custom-api-key',
      }),
    );
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';

describe('Custom Auth Plugin (e2e)', () => {
  let app;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('should reject requests without API key', () => {
    return request(app.getHttpServer())
      .get('/protected-endpoint')
      .expect(401);
  });

  it('should accept requests with valid API key', () => {
    return request(app.getHttpServer())
      .get('/protected-endpoint')
      .set('x-api-key', 'valid-key')
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Best Practices

1. **Version Management**: Use semantic versioning
2. **Error Handling**: Handle errors gracefully
3. **Logging**: Use the provided logger, not console.log
4. **Configuration**: Validate all configuration with schemas
5. **Documentation**: Provide clear documentation and examples
6. **Testing**: Write comprehensive tests
7. **TypeScript**: Use TypeScript for type safety
8. **Dependencies**: Minimize external dependencies
9. **Naming**: Use descriptive, kebab-case names
10. **Performance**: Optimize for low latency

## Next Steps

- [Policy Development](./policy-development/) - Create custom policies
- [Condition Development](./condition-development/) - Create custom conditions
- [Route Development](./route-development/) - Create custom routes
- [Examples](../../src/plugins/examples/) - Example plugins
