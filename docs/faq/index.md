---
layout: default
title: FAQ
---

# Frequently Asked Questions

Common questions and answers about Nest GatewayQL.

## General

### What is Nest GatewayQL?

Nest GatewayQL is a production-ready GraphQL API Gateway built with NestJS 11 and Apollo Federation. It provides a unified entry point for microservices with enterprise-grade features including authentication, rate limiting, caching, and comprehensive logging.

### How is it different from Express Gateway?

| Feature | Express Gateway | Nest GatewayQL |
|---------|----------------|----------------|
| Protocol | REST/HTTP | GraphQL |
| Framework | Express.js | NestJS 11 |
| TypeScript | ❌ | ✅ Full support |
| GraphQL Federation | ❌ | ✅ Apollo Federation |
| Management CLI | `eg` commands | ✅ `gql` commands |
| Modern Architecture | Outdated | ✅ Latest patterns |

### Is it production-ready?

Yes! Nest GatewayQL includes:
- Comprehensive testing (unit + e2e)
- Security features (Helmet, CORS, rate limiting)
- Health checks for Kubernetes
- Structured logging
- Error handling
- Performance optimizations

### What is the license?

Nest GatewayQL is released under the [MIT License](https://github.com/GatewayQL/nest-GatewayQL/blob/main/LICENSE).

## Installation & Setup

### What are the system requirements?

- Node.js 18+ or 20+ (LTS recommended)
- PostgreSQL 12+ (or MySQL, SQLite)
- 512 MB RAM minimum (2 GB recommended)
- 500 MB disk space

### Can I use a different database?

Yes! TypeORM supports multiple databases:
- PostgreSQL (recommended)
- MySQL/MariaDB
- SQLite
- MongoDB
- SQL Server
- Oracle

Change `DB_TYPE` in `.env`:
```bash
DB_TYPE=mysql  # or sqlite, mongodb, etc.
```

### Do I need Docker?

No, Docker is optional. You can run Nest GatewayQL with:
- Native Node.js installation
- Docker (recommended for development)
- Kubernetes (production)

### How do I upgrade from an older version?

```bash
# 1. Backup database
pg_dump gatewayql > backup.sql

# 2. Pull latest code
git pull origin main

# 3. Update dependencies
npm install

# 4. Run migrations
npm run migration:run

# 5. Restart application
npm run start:prod
```

## Configuration

### Where are configuration files?

Configuration is stored in `.env` file. See [Configuration Guide](../configuration/) for details.

### How do I change the port?

In `.env`:
```bash
PORT=3001
```

### How do I disable GraphQL Playground?

In `.env`:
```bash
GRAPHQL_PLAYGROUND=false
```

**Note:** Always disable in production!

### How do I configure CORS?

In `.env`:
```bash
CORS_ORIGIN=https://app.example.com,https://admin.example.com
CORS_CREDENTIALS=true
```

See [Configuration Guide](../configuration/#cors-configuration) for more options.

## Authentication & Security

### How does authentication work?

Nest GatewayQL supports multiple authentication methods:
1. **JWT**: Token-based authentication for users
2. **API Key**: Key-based authentication for services
3. **OAuth2**: For third-party integrations
4. **Basic Auth**: For legacy systems

See [Authentication Guide](../core-concepts/#authentication--authorization).

### How do I create an API key?

```graphql
mutation {
  createCredential(
    createCredentialInput: {
      consumerId: "user-id"
      type: KEY_AUTH
      keyId: "my-api-key"
      keySecret: "secret"
    }
  ) {
    id
    keyId
  }
}
```

See [Credential Management](../credential-management/).

### Are passwords securely stored?

Yes! All passwords are hashed using bcrypt with configurable salt rounds (default: 10).

### How do I implement SSO?

SSO can be implemented using OAuth2 or SAML. This requires custom integration. See [Contributing Guide](https://github.com/GatewayQL/nest-GatewayQL/blob/main/CONTRIBUTING.md) to add this feature.

### How do I rotate JWT secrets?

```bash
# 1. Generate new secret
openssl rand -base64 32

# 2. Update .env
JWT_SECRET=new-secret-here

# 3. Restart application
# (Existing tokens will be invalid)
```

## GraphQL

### How do I add a federated service?

In `.env`:
```bash
SERVICE_ENDPOINTS=[
  {"name":"users","url":"http://users-service:4001/graphql"},
  {"name":"orders","url":"http://orders-service:4002/graphql"}
]
```

See [GraphQL Federation](../core-concepts/#graphql-federation).

### How do I prevent expensive queries?

Configure query complexity limit in `.env`:
```bash
MAX_QUERY_COMPLEXITY=100
```

See [Features - Query Complexity](../features/#query-complexity).

### Can I use subscriptions?

GraphQL subscriptions are supported via WebSocket. Configure in your subgraph services.

### How do I cache GraphQL queries?

Use the `@CacheTTL()` decorator:
```typescript
@CacheTTL(60000)  // Cache for 60 seconds
@Query(() => [ProductEntity])
async products() {
  return this.productsService.findAll();
}
```

## Performance

### How do I improve performance?

1. **Enable caching**: Use Redis for distributed caching
2. **Database optimization**: Add indexes, use connection pooling
3. **Query optimization**: Limit query complexity
4. **CDN**: Use CDN for static assets
5. **Horizontal scaling**: Run multiple instances

### Should I use Redis?

Redis is recommended for production:
- Distributed caching
- Rate limiting across instances
- Session storage
- Better performance

Configure in `.env`:
```bash
CACHE_STORE=redis
REDIS_URL=redis://localhost:6379
```

### How many requests can it handle?

Performance depends on:
- Server resources (CPU, RAM)
- Database performance
- Query complexity
- Caching strategy

Typical benchmarks:
- **Single instance**: 1,000-5,000 req/s
- **With caching**: 10,000+ req/s
- **Clustered**: 50,000+ req/s

## Deployment

### How do I deploy to production?

See [Deployment Guide](../deployment/) for detailed instructions on:
- Docker
- Kubernetes
- AWS, GCP, Azure
- Heroku

### Do you provide Docker images?

Docker images are available at:
```bash
docker pull ghcr.io/gatewayql/nest-gatewayql:latest
```

### How do I set up health checks?

Health check endpoints:
- `GET /health` - Comprehensive check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

Kubernetes example:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
```

### How do I run migrations in production?

```bash
# Before deployment
npm run migration:run
```

In CI/CD:
```yaml
- name: Run migrations
  run: npm run migration:run
- name: Start application
  run: npm run start:prod
```

## Troubleshooting

### Database connection failed

**Solutions:**
1. Check PostgreSQL is running
2. Verify connection settings in `.env`
3. Check firewall rules
4. Test connection: `psql -h localhost -U postgres`

### Port already in use

**Solutions:**
```bash
# Find process
lsof -ti:3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### GraphQL Playground not loading

**Causes:**
- `GRAPHQL_PLAYGROUND=false` in `.env`
- Running in production mode
- Browser cache issues

**Solutions:**
1. Set `GRAPHQL_PLAYGROUND=true`
2. Use development mode
3. Clear browser cache

### Migration errors

**Common issues:**
```bash
# Schema out of sync
npm run migration:generate -- src/migrations/FixSchema
npm run migration:run

# Conflicting migrations
npm run migration:revert
npm run migration:run
```

### High memory usage

**Solutions:**
1. Check for memory leaks
2. Optimize database queries
3. Implement pagination
4. Reduce cache size
5. Increase server resources

## Development

### How do I run tests?

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

### How do I debug?

```bash
# Start in debug mode
npm run start:debug
```

Then attach debugger:
- Chrome DevTools: `chrome://inspect`
- VS Code: Use debug configuration

### How do I contribute?

See [Contributing Guide](https://github.com/GatewayQL/nest-GatewayQL/blob/main/CONTRIBUTING.md).

### How do I report bugs?

[Create an issue](https://github.com/GatewayQL/nest-GatewayQL/issues/new?template=bug_report.md) on GitHub.

## Advanced

### Can I customize the gateway?

Yes! Fork the repository and:
1. Add custom modules
2. Create custom policies
3. Extend entities
4. Add new features

See [Contributing Guide](https://github.com/GatewayQL/nest-GatewayQL/blob/main/CONTRIBUTING.md).

### How do I implement custom authentication?

Create a custom guard:
```typescript
@Injectable()
export class CustomAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Your custom logic
    return true;
  }
}
```

### Can I use with microservices?

Yes! Nest GatewayQL is designed for microservices:
- GraphQL Federation for multiple services
- Service discovery
- Health checks
- Distributed tracing (via OpenTelemetry)

### How do I add observability?

Nest GatewayQL supports:
- **Logging**: Winston (built-in)
- **Metrics**: Prometheus (via @willsoto/nestjs-prometheus)
- **Tracing**: OpenTelemetry (configured in code)

### Can I run multiple instances?

Yes! Nest GatewayQL is stateless and can be horizontally scaled:
- Use Redis for distributed caching
- Use external database
- Use load balancer
- Use Kubernetes HPA

## Support

### Where can I get help?

- [Documentation](https://gatewayql.github.io/nest-GatewayQL)
- [GitHub Discussions](https://github.com/GatewayQL/nest-GatewayQL/discussions)
- [Issue Tracker](https://github.com/GatewayQL/nest-GatewayQL/issues)
- [Discord Community](https://discord.gg/gatewayql)

### Is commercial support available?

Not currently, but the project is open source and community-supported.

### How do I stay updated?

- Star the [GitHub repository](https://github.com/GatewayQL/nest-GatewayQL)
- Watch for releases
- Follow on Twitter: [@gatewayql](https://twitter.com/gatewayql)
- Join Discord community

## Still have questions?

- [Ask in Discussions](https://github.com/GatewayQL/nest-GatewayQL/discussions)
- [Read the docs](https://gatewayql.github.io/nest-GatewayQL)
- [Check existing issues](https://github.com/GatewayQL/nest-GatewayQL/issues)
