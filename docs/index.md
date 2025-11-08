---
layout: default
title: Home
---

# Nest GatewayQL Documentation

Welcome to the Nest GatewayQL documentation! Nest GatewayQL is a production-ready **GraphQL API Gateway** built with **NestJS 11** and **Apollo Federation**.

## Quick Links

- [Getting Started](getting-started/) - Install and run Nest GatewayQL
- [Configuration](configuration/) - Configure your gateway
- [Features](features/) - Explore all features
- [API Reference](api/) - Complete API documentation
- [Deployment](deployment/) - Deploy to production
- [Guides](guides/) - Tutorials and how-to guides

## What is Nest GatewayQL?

Nest GatewayQL provides a unified entry point for your microservices with enterprise-grade features including:

- ✅ **GraphQL Federation** - Aggregate multiple GraphQL microservices
- ✅ **NestJS 11** - Latest framework with modern TypeScript support
- ✅ **Authentication & Authorization** - JWT, API Key, Role-based access control
- ✅ **Rate Limiting** - Protect APIs with configurable throttling
- ✅ **Request Caching** - Improve performance with cache-manager
- ✅ **Health Checks** - Kubernetes-ready liveness/readiness probes
- ✅ **Security** - Helmet, CORS, input validation, query complexity protection
- ✅ **Logging** - Structured logging with Winston
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

## Key Concepts

### GraphQL Federation

GraphQL Federation allows you to compose multiple GraphQL services into a single unified API. Each service owns its domain data and schema, while the gateway handles routing and composition.

### Policy-Based Architecture

Similar to Express Gateway, Nest GatewayQL uses a policy-based architecture with:
- **Guards** for authentication and authorization
- **Interceptors** for request/response transformation
- **Middleware** for cross-cutting concerns

### Microservices Ready

Designed to work seamlessly with microservices:
- Service discovery
- Health checks
- Distributed tracing
- Centralized logging

## Get Started

Ready to get started? Head over to the [Getting Started](getting-started/) guide to install and run Nest GatewayQL in minutes.

## Community

- **GitHub**: [github.com/GatewayQL/nest-GatewayQL](https://github.com/GatewayQL/nest-GatewayQL)
- **Issues**: [Report bugs or request features](https://github.com/GatewayQL/nest-GatewayQL/issues)
- **Discussions**: [Join the conversation](https://github.com/GatewayQL/nest-GatewayQL/discussions)
- **Discord**: [Join our community](https://discord.gg/gatewayql)

## License

Nest GatewayQL is [MIT licensed](https://github.com/GatewayQL/nest-GatewayQL/blob/main/LICENSE).
