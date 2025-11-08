# Nest GatewayQL

<p align="center">
  <a href="https://github.com/GatewayQL/nest-GatewayQL">
    <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs" alt="NestJS 11">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License">
  </a>
</p>

## Description

**Nest GatewayQL** is a production-ready **GraphQL API Gateway** built with **NestJS 11** and **Apollo Federation**. It provides a unified entry point for microservices with enterprise-grade features including authentication, rate limiting, caching, health checks, and comprehensive logging.

### Key Features

- ✅ **GraphQL Federation** - Aggregate multiple GraphQL microservices
- ✅ **NestJS 11** - Latest framework with modern TypeScript support
- ✅ **Authentication & Authorization** - JWT, API Key, Role-based access control
- ✅ **Rate Limiting** - Protect APIs with configurable throttling
- ✅ **Request Caching** - Improve performance with cache-manager
- ✅ **Health Checks** - Kubernetes-ready liveness/readiness probes
- ✅ **Security** - Helmet, CORS, input validation, query complexity protection
- ✅ **Logging** - Structured logging with Winston
- ✅ **Policy System** - Reusable guards, interceptors, and decorators
- ✅ **Environment Configuration** - Secure configuration management
- ✅ **Comprehensive Testing** - Unit, integration, and e2e tests

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Nest GatewayQL                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Security Layer                                      │   │
│  │  - Helmet (Security Headers)                         │   │
│  │  - CORS                                              │   │
│  │  - Rate Limiting                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  GraphQL Gateway (Apollo Federation)                │   │
│  │  - Query Complexity Protection                       │   │
│  │  - Request Validation                                │   │
│  │  - Response Caching                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Business Logic                                      │   │
│  │  - Users Module                                      │   │
│  │  - Credentials Module                                │   │
│  │  - Auth Module                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Infrastructure                                      │   │
│  │  - Logging (Winston)                                 │   │
│  │  - Health Checks                                     │   │
│  │  - Database (TypeORM + PostgreSQL)                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
   Service A      Service B      Service C
   (GraphQL)      (GraphQL)      (GraphQL)
```

## Quick Start

### Prerequisites

- Node.js 18+ or 20+
- PostgreSQL 12+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/GatewayQL/nest-GatewayQL.git
cd nest-GatewayQL

# Install dependencies
npm install
```

### Configuration

```bash
# Copy environment example
cp .env.example .env

# Edit .env with your configuration
# Important: Change JWT_SECRET and CIPHER_KEY in production!
```

### Database Setup

```bash
# Using Docker Compose (recommended)
docker-compose -f docker-compose-postgres.yml up -d

# Or configure your own PostgreSQL instance in .env
```

### Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The application will be available at:

- 🔍 **GraphQL Gateway**: http://localhost:3000/graphql
- ⚙️ **Admin GraphQL**: http://localhost:3000/admin
- ❤️ **Health Check**: http://localhost:3000/health

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=gatewayql
DB_SYNCHRONIZE=true  # Set to false in production!
DB_SSL=false

# Security (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this
CIPHER_KEY=your-32-character-cipher-key!!
SALT_ROUNDS=10

# GraphQL
GRAPHQL_PLAYGROUND=true
MAX_QUERY_COMPLEXITY=100

# Rate Limiting
THROTTLE_TTL=60      # seconds
THROTTLE_LIMIT=10    # requests per TTL

# Service Endpoints (JSON array)
SERVICE_ENDPOINTS=[{"name":"countries","url":"https://countries.trevorblades.com/"}]

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

## Features Deep Dive

### 1. GraphQL Federation

Aggregate multiple GraphQL microservices into a single unified API:

```typescript
// Configure service endpoints in .env
SERVICE_ENDPOINTS = [
  { name: 'users', url: 'http://users-service:4001/graphql' },
  { name: 'orders', url: 'http://orders-service:4002/graphql' },
];
```

### 2. Authentication & Authorization

Multiple authentication strategies:

```typescript
// API Key Authentication
@UseGuards(ApiKeyGuard)
@Controller('api')
export class ApiController {}

// Role-based Access Control
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@Mutation(() => UserEntity)
async updateUser() {}

// Public Routes
@Public()
@Get('public')
getPublicData() {}
```

### 3. Rate Limiting

Protect your API from abuse:

```typescript
// Global rate limiting (configured in app.module.ts)
// Override for specific routes
@SkipThrottle()
@Get('unlimited')
getUnlimitedData() {}
```

### 4. Caching

Improve performance with response caching:

```typescript
@CacheTTL(60000) // Cache for 60 seconds
@Get('data')
getCachedData() {}
```

### 5. Health Checks

Kubernetes-ready health endpoints:

```bash
# Comprehensive health check
GET /health

# Readiness probe (critical dependencies)
GET /health/ready

# Liveness probe (process health)
GET /health/live
```

### 6. Security Features

- **Helmet** - Security headers (XSS, CSP, etc.)
- **CORS** - Configurable cross-origin resource sharing
- **Input Validation** - Class-validator with strict validation
- **Query Complexity** - Prevent DoS attacks with complex queries
- **Rate Limiting** - Throttle requests per IP
- **Encryption** - Secure credential storage

### 7. Logging

Structured logging with Winston:

```typescript
// Automatic request/response logging
// Custom logging
constructor(private logger: CustomLoggerService) {
  this.logger.setContext('MyService');
}

this.logger.log('Info message');
this.logger.error('Error message', stack);
this.logger.warn('Warning message');
```

### 8. Policy System

Reusable policies similar to Express Gateway:

```typescript
// Transform responses
@UseInterceptors(TransformInterceptor)

// Timeout protection
@UseInterceptors(new TimeoutInterceptor(3000))

// Custom cache TTL
@CacheTTL(30000)

// Skip authentication
@Public()
```

## Testing

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Test watch mode
npm run test:watch
```

## Docker Support

### Using Docker Compose

```bash
# Run application with PostgreSQL
docker-compose up -d

# Run only PostgreSQL
docker-compose -f docker-compose-postgres.yml up -d

# Stop services
docker-compose down
```

### Using Docker

```bash
# Build image
docker build -t nest-gatewayql .

# Run container
docker run -p 3000:3000 nest-gatewayql
```

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── decorators/          # Custom decorators (Roles, etc.)
│   ├── guards/              # Auth guards
│   └── services/            # Auth service (JWT, bcrypt)
├── common/                  # Shared resources
│   ├── filters/             # Exception filters
│   ├── interceptors/        # Logging interceptor
│   └── logger/              # Winston logger service
├── config/                  # Configuration
│   ├── databases/           # Database config
│   ├── gateway.configuration.ts
│   └── system.configuration.ts
├── credentials/             # Credentials management
├── health/                  # Health check endpoints
├── policies/                # Policy system
│   ├── decorators/          # Policy decorators
│   ├── guards/              # API key guard
│   └── interceptors/        # Transform, timeout
├── users/                   # Users module
└── main.ts                  # Application entry point
```

## API Documentation

### GraphQL Playground

When running in development mode, access the GraphQL Playground:

- **Gateway**: http://localhost:3000/graphql
- **Admin API**: http://localhost:3000/admin

### Example Queries

```graphql
# Create User
mutation {
  createUser(
    createUserInput: {
      username: "john"
      email: "john@example.com"
      password: "secret123"
      firstName: "John"
      lastName: "Doe"
    }
  ) {
    id
    username
    email
  }
}

# Query Users
query {
  users {
    id
    username
    email
    role
    isActive
  }
}

# Create Credential
mutation {
  createCredential(
    createCredentialInput: {
      consumerId: "user-123"
      type: KEY_AUTH
      keyId: "api-key-123"
      keySecret: "secret"
    }
  ) {
    id
    keyId
    type
  }
}
```

## Comparison with Express Gateway

| Feature            | Express Gateway | Nest GatewayQL        |
| ------------------ | --------------- | --------------------- |
| Protocol           | REST/HTTP       | **GraphQL**           |
| Framework          | Express.js      | **NestJS 11**         |
| TypeScript         | ❌              | ✅                    |
| GraphQL Federation | ❌              | ✅                    |
| Rate Limiting      | ✅              | ✅                    |
| Authentication     | ✅              | ✅                    |
| Caching            | ✅              | ✅                    |
| Health Checks      | Basic           | **Advanced**          |
| Structured Logging | ❌              | ✅                    |
| Modern Security    | Basic           | **Helmet + Advanced** |
| Testing            | Limited         | **Comprehensive**     |
| Query Complexity   | N/A             | ✅                    |

## Performance Considerations

- **Caching**: Responses are cached by default (60s TTL)
- **Connection Pooling**: PostgreSQL connection pooling enabled
- **Compression**: Enable gzip compression in production
- **Query Complexity**: Limits prevent expensive queries
- **Rate Limiting**: Protects against abuse

## Security Best Practices

1. **Change default secrets** in production
2. **Use HTTPS** in production
3. **Enable SSL** for database connections
4. **Set NODE_ENV=production**
5. **Disable GraphQL Playground** in production
6. **Use strong passwords** for database
7. **Regularly update dependencies**
8. **Enable audit logging**
9. **Use API keys** for service-to-service communication
10. **Implement proper RBAC**

## Monitoring & Observability

### Health Endpoints

```bash
# Full health check
curl http://localhost:3000/health

# Response:
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

### Logs

Logs are written to:

- **Console**: All environments
- **logs/error.log**: Production errors only
- **logs/combined.log**: Production all logs

## Troubleshooting

### Common Issues

**Database Connection Failed**

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection settings in .env
DB_HOST=localhost
DB_PORT=5432
```

**Port Already in Use**

```bash
# Change port in .env
PORT=3001
```

**GraphQL Playground Not Loading**

```bash
# Ensure GRAPHQL_PLAYGROUND=true in .env
# Only available in development mode
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Nest GatewayQL is [MIT licensed](LICENSE).

## Support

- **Documentation**: https://gatewayql.com
- **Issues**: https://github.com/GatewayQL/nest-GatewayQL/issues
- **Discord**: [Join our community](https://discord.gg/gatewayql)

## Acknowledgments

Built with:

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Apollo Federation](https://www.apollographql.com/docs/federation/) - GraphQL gateway
- [TypeORM](https://typeorm.io/) - ORM for TypeScript
- [Winston](https://github.com/winstonjs/winston) - Logging library

---

Made with ❤️ by the GatewayQL Team
