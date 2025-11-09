---
layout: default
title: Route Development
---

# Route Development

Learn how to create custom routes for Nest GatewayQL plugins, similar to [Express Gateway route development](https://www.express-gateway.io/docs/plugins/route-development/).

## Overview

Plugins can register custom HTTP endpoints to extend the gateway with additional functionality like health checks, webhooks, admin endpoints, and more.

## Route Structure

```typescript
import { RouteDefinition } from '@nest-gatewayql/plugins';

const customRoute: RouteDefinition = {
  method: 'GET',
  path: '/custom-endpoint',
  handler: async (req, res) => {
    return { message: 'Hello from plugin' };
  },
  middleware: [], // Optional
};
```

## Route Definition

```typescript
interface RouteDefinition {
  // HTTP method
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

  // Route path
  path: string;

  // Route handler
  handler: (req: Request, res: Response) => any | Promise<any>;

  // Optional middleware
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
}
```

## Creating Routes

### Basic Route

```typescript
const statusRoute: RouteDefinition = {
  method: 'GET',
  path: '/status',
  handler: async (req, res) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  },
};
```

### Route with Path Parameters

```typescript
const userRoute: RouteDefinition = {
  method: 'GET',
  path: '/users/:id',
  handler: async (req, res) => {
    const { id } = req.params;

    const user = await fetchUser(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    return user;
  },
};
```

### Route with Query Parameters

```typescript
const searchRoute: RouteDefinition = {
  method: 'GET',
  path: '/search',
  handler: async (req, res) => {
    const { q, limit = '10', offset = '0' } = req.query;

    const results = await searchDatabase(q, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    return {
      query: q,
      results,
      total: results.length,
    };
  },
};
```

### POST Route with Body

```typescript
const createRoute: RouteDefinition = {
  method: 'POST',
  path: '/items',
  handler: async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const item = await createItem({ name, description });

    res.status(201).json(item);
  },
};
```

## Using Middleware

### Authentication Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};

const protectedRoute: RouteDefinition = {
  method: 'GET',
  path: '/protected',
  middleware: [authMiddleware],
  handler: async (req, res) => {
    return { message: 'Protected data' };
  },
};
```

### Validation Middleware

```typescript
const validateBodyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, email } = req.body;

  const errors: string[] = [];

  if (!name || name.length < 3) {
    errors.push('Name must be at least 3 characters');
  }

  if (!email || !email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  next();
};

const createUserRoute: RouteDefinition = {
  method: 'POST',
  path: '/users',
  middleware: [validateBodyMiddleware],
  handler: async (req, res) => {
    const user = await createUser(req.body);
    res.status(201).json(user);
  },
};
```

### Logging Middleware

```typescript
const loggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
    );
  });

  next();
};
```

### Multiple Middleware

```typescript
const adminRoute: RouteDefinition = {
  method: 'DELETE',
  path: '/users/:id',
  middleware: [
    loggingMiddleware,
    authMiddleware,
    adminCheckMiddleware,
  ],
  handler: async (req, res) => {
    const { id } = req.params;
    await deleteUser(id);
    res.status(204).end();
  },
};
```

## Registering Routes

### In Plugin Initialization

```typescript
init: async (context: PluginContext) => {
  context.registerRoutes([
    {
      method: 'GET',
      path: '/plugin-status',
      handler: async (req, res) => {
        return {
          plugin: 'my-plugin',
          version: '1.0.0',
          status: 'active',
        };
      },
    },
    {
      method: 'POST',
      path: '/webhook',
      handler: async (req, res) => {
        await processWebhook(req.body);
        return { received: true };
      },
    },
  ]);
}
```

## Route Examples

### Health Check Endpoint

```typescript
const healthRoute: RouteDefinition = {
  method: 'GET',
  path: '/plugin-health',
  handler: async (req, res) => {
    const checks = {
      database: await checkDatabase(),
      cache: await checkCache(),
      externalAPI: await checkExternalAPI(),
    };

    const isHealthy = Object.values(checks).every((check) => check.status === 'up');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  },
};
```

### Webhook Endpoint

```typescript
const webhookRoute: RouteDefinition = {
  method: 'POST',
  path: '/webhooks/stripe',
  handler: async (req, res) => {
    const signature = req.headers['stripe-signature'];

    // Verify webhook signature
    if (!verifyStripeSignature(req.body, signature)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Process webhook
    await processStripeWebhook(req.body);

    return { received: true };
  },
};
```

### File Upload Endpoint

```typescript
const uploadRoute: RouteDefinition = {
  method: 'POST',
  path: '/upload',
  middleware: [multerMiddleware], // Assuming multer is configured
  handler: async (req, res) => {
    const file = (req as any).file;

    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const result = await saveFile(file);

    return {
      filename: file.originalname,
      size: file.size,
      url: result.url,
    };
  },
};
```

### Proxy Endpoint

```typescript
const proxyRoute: RouteDefinition = {
  method: 'GET',
  path: '/proxy/*',
  handler: async (req, res) => {
    const targetPath = req.path.replace('/proxy/', '');
    const targetUrl = `https://api.example.com/${targetPath}`;

    try {
      const response = await fetch(targetUrl, {
        headers: {
          authorization: req.headers.authorization,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      res.status(500).json({ error: 'Proxy error' });
    }
  },
};
```

### SSE (Server-Sent Events) Endpoint

```typescript
const eventsRoute: RouteDefinition = {
  method: 'GET',
  path: '/events',
  handler: async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send event every second
    const interval = setInterval(() => {
      const data = {
        timestamp: new Date().toISOString(),
        message: 'Hello from SSE',
      };

      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  },
};
```

### Admin Dashboard Endpoint

```typescript
const dashboardRoute: RouteDefinition = {
  method: 'GET',
  path: '/admin/dashboard',
  middleware: [authMiddleware, adminCheckMiddleware],
  handler: async (req, res) => {
    const stats = await getGatewayStats();
    const plugins = await getLoadedPlugins();
    const metrics = await getMetrics();

    return {
      stats,
      plugins,
      metrics,
      timestamp: new Date().toISOString(),
    };
  },
};
```

## Error Handling

### Try-Catch Pattern

```typescript
const safeRoute: RouteDefinition = {
  method: 'GET',
  path: '/safe',
  handler: async (req, res) => {
    try {
      const data = await riskyOperation();
      return { data };
    } catch (error) {
      console.error('Route error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  },
};
```

### Error Middleware

```typescript
const errorMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error('Route error:', error);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};
```

## Testing Routes

### Unit Tests

```typescript
import request from 'supertest';
import express from 'express';

describe('Status Route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    // Register route
    app.get('/status', statusRoute.handler);
  });

  it('should return status', async () => {
    const response = await request(app).get('/status').expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});
```

### Integration Tests

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';

describe('Plugin Routes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('/plugin/status (GET)', () => {
    return request(app.getHttpServer())
      .get('/plugin/status')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Best Practices

1. **Use Middleware**: Separate concerns with middleware
2. **Error Handling**: Always handle errors gracefully
3. **Validation**: Validate input data
4. **Status Codes**: Use appropriate HTTP status codes
5. **Documentation**: Document route endpoints
6. **Security**: Protect sensitive endpoints
7. **Performance**: Optimize for low latency
8. **Logging**: Log important events
9. **Testing**: Write comprehensive tests
10. **Versioning**: Version your API endpoints

## Next Steps

- [Policy Development](./policy-development/) - Create policies for routes
- [Plugin Development](./plugin-development/) - Create complete plugins
- [Examples](../../src/plugins/examples/) - See example routes
