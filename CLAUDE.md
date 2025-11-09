# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Run

- `npm run build` - Build the application
- `npm run start` - Start in production mode
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode

### Testing

- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:debug` - Run tests in debug mode

### Code Quality

- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier

### Database Operations

- `npm run migration:generate` - Generate new migration
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert last migration

### CLI Management

- `npm run build && npm run cli -- <command>` - Use the GQL CLI after building
- `npm link && gql <command>` - Use CLI globally after linking

## High-Level Architecture

### Technology Stack

- **Framework**: NestJS 11 with TypeScript
- **GraphQL**: Apollo Federation v2 for microservices aggregation
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT tokens, API keys, role-based access control
- **Caching**: Redis or in-memory cache via cache-manager
- **Rate Limiting**: Built-in NestJS throttling
- **Logging**: Winston with structured logging
- **Monitoring**: Prometheus metrics, health checks
- **Security**: Helmet, CORS, input validation, query complexity protection

### Core Modules

- **app.module.ts**: Main application module with GraphQL gateway configuration
- **auth/**: JWT authentication, role-based guards, login/logout
- **users/**: User management with GraphQL resolvers and subscriptions
- **credentials/**: API key/credential management for consumers
- **policies/**: Reusable guards, interceptors, decorators (similar to Express Gateway policies)
- **health/**: Kubernetes-ready health endpoints (/health, /health/ready, /health/live)
- **cli/**: Command-line interface for managing users, credentials, and gateway

### GraphQL Architecture

- **Main Gateway** (port 3000/graphql): Apollo Federation gateway aggregating external services
- **Admin API** (port 3000/admin): Internal GraphQL API for user/credential management
- **Service Endpoints**: Configured via SERVICE_ENDPOINTS environment variable as JSON array
- **Query Complexity**: Protection against complex queries with configurable limits
- **Subscriptions**: Real-time updates via WebSocket (graphql-ws protocol)

### Database Design

- **Users**: Core user entities with roles (admin/user)
- **Credentials**: API keys and authentication credentials linked to users
- **Scopes**: Permission scopes for fine-grained access control
- **TypeORM**: Entity-based ORM with automatic migrations in development

### Configuration System

- **Environment Variables**: Loaded from .env files with validation
- **gateway.configuration.ts**: Service endpoints and proxy configuration
- **system.configuration.ts**: Database, JWT, caching, and security settings
- **Multiple Configs**: Supports .env, .env.development, .env.production

### Security Layer

- **Authentication**: Multiple strategies (JWT, API key, basic auth, OAuth2)
- **Authorization**: Role-based access control with @Roles decorator
- **Rate Limiting**: Global and route-specific throttling
- **Input Validation**: Class-validator with strict whitelist/transform
- **Security Headers**: Helmet middleware with CSP and CORS
- **Query Protection**: Complexity analysis and timeout interceptors

### Policy System (Similar to Express Gateway)

- **Decorators**: @Public(), @SkipThrottle(), @CacheTTL(), @Roles()
- **Guards**: ApiKeyGuard, RolesGuard for authentication/authorization
- **Interceptors**: TransformInterceptor, TimeoutInterceptor, LoggingInterceptor
- **Filters**: Global exception handling with structured error responses

### Observability

- **Logging**: Winston with context-aware structured logging
- **Metrics**: Prometheus metrics for HTTP requests, response times
- **Health Checks**: Database, memory, storage health indicators
- **Tracing**: OpenTelemetry support (optional, enabled via ENABLE_TRACING=true)

## Important Implementation Notes

### Authentication Flow

1. Users authenticate via GraphQL mutations (login/register)
2. JWT tokens issued for session management
3. API keys created for programmatic access
4. Role-based guards protect admin operations
5. Public routes use @Public() decorator to bypass auth

### Database Connections

- Development: Uses DB_SYNCHRONIZE=true for automatic schema sync
- Production: Requires manual migrations via npm run migration:run
- Connection pooling enabled by default
- SSL support via DB_SSL environment variable

### GraphQL Federation

- External services defined in SERVICE_ENDPOINTS as JSON array
- Gateway automatically discovers and composes schemas
- Service health checked via introspection
- Supports both federated and non-federated services

### CLI Commands Structure

- `gql users create/list/info/update/remove` - User management
- `gql credentials create/list/info/activate/deactivate/remove` - API key management
- `gql scopes create/list/info/update/remove` - Permission scope management
- `gql gateway start/stop/status/config` - Gateway lifecycle management

### Testing Strategy

- **Unit Tests**: Service and resolver testing with mocked dependencies
- **Integration Tests**: Module testing with in-memory database
- **E2E Tests**: Full application testing including GraphQL federation
- **Database**: Uses separate test database with NODE_ENV=test

### Environment Configuration

- Copy `example.env` to `.env` for local development
- Critical settings: JWT_SECRET, CIPHER_KEY, DATABASE_URL
- Service endpoints configured via SERVICE_ENDPOINTS JSON array
- Development vs production toggles for GraphQL playground, logging

### Key Files to Reference

- `src/main.ts` - Application bootstrap and middleware setup
- `src/app.module.ts` - Module imports and global providers
- `src/config/` - All configuration and environment handling
- `src/policies/` - Reusable guards, interceptors, and decorators
- `CLI.md` - Complete CLI documentation and examples
