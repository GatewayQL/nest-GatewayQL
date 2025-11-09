---
layout: default
title: Configuration
---

# Configuration

Nest GatewayQL uses environment variables for configuration. This guide covers all available configuration options.

## Environment Variables

All configuration is stored in the `.env` file. Use `.env.example` as a template.

### Application Settings

```bash
# Environment: development, production, test
NODE_ENV=development

# Port the application listens on
PORT=3000
```

### Database Configuration

```bash
# Database type (postgres, mysql, sqlite)
DB_TYPE=postgres

# Database host
DB_HOST=localhost

# Database port
DB_PORT=5432

# Database username
DB_USERNAME=postgres

# Database password
DB_PASSWORD=postgres

# Database name
DB_DATABASE=gatewayql

# Auto-sync schema (NEVER use in production!)
DB_SYNCHRONIZE=false

# Enable SSL for database connection
DB_SSL=false

# SSL certificate (if DB_SSL=true)
# DB_SSL_CA=/path/to/ca-certificate.crt
```

**Important Notes**:
- Set `DB_SYNCHRONIZE=false` in production
- Enable `DB_SSL=true` for production databases
- Use strong passwords in production

### Security Configuration

```bash
# JWT secret key for signing tokens
# MUST be changed in production!
JWT_SECRET=your-super-secret-jwt-key-change-this

# Cipher key for encrypting sensitive data (32 characters)
# MUST be changed in production!
CIPHER_KEY=your-32-character-cipher-key!!

# Bcrypt salt rounds for password hashing
SALT_ROUNDS=10

# JWT token expiration
JWT_EXPIRATION=1d
```

**Security Best Practices**:
- Use strong, random values for `JWT_SECRET` and `CIPHER_KEY`
- Store secrets in a secure vault (e.g., AWS Secrets Manager, HashiCorp Vault)
- Never commit secrets to version control
- Rotate secrets regularly

### GraphQL Configuration

```bash
# Enable GraphQL Playground (disable in production!)
GRAPHQL_PLAYGROUND=true

# Maximum query complexity to prevent DoS attacks
MAX_QUERY_COMPLEXITY=100

# GraphQL introspection (disable in production!)
GRAPHQL_INTROSPECTION=true

# Include stack traces in errors (disable in production!)
GRAPHQL_DEBUG=true
```

**Production Settings**:
```bash
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false
GRAPHQL_DEBUG=false
```

### Rate Limiting

```bash
# Time window in seconds
THROTTLE_TTL=60

# Maximum requests per time window
THROTTLE_LIMIT=10

# Storage for rate limiting (memory, redis)
THROTTLE_STORAGE=memory

# Redis URL (if THROTTLE_STORAGE=redis)
# REDIS_URL=redis://localhost:6379
```

**Rate Limiting Strategies**:
- **Development**: `THROTTLE_LIMIT=1000`
- **Production API**: `THROTTLE_LIMIT=100`
- **Public API**: `THROTTLE_LIMIT=10`

### CORS Configuration

```bash
# Allowed origins (comma-separated)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Allow credentials
CORS_CREDENTIALS=true

# Allowed methods
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS

# Allowed headers
CORS_HEADERS=Content-Type,Authorization
```

**Production Example**:
```bash
CORS_ORIGIN=https://app.example.com,https://admin.example.com
CORS_CREDENTIALS=true
```

### Service Endpoints

Configure federated GraphQL services:

```bash
# JSON array of service endpoints
SERVICE_ENDPOINTS=[
  {"name":"users","url":"http://users-service:4001/graphql"},
  {"name":"orders","url":"http://orders-service:4002/graphql"},
  {"name":"products","url":"http://products-service:4003/graphql"}
]
```

**Service Configuration Options**:
- `name`: Unique service identifier
- `url`: GraphQL endpoint URL

### Logging Configuration

```bash
# Log level: error, warn, info, debug
LOG_LEVEL=info

# Log format: json, simple
LOG_FORMAT=json

# Enable file logging in production
LOG_TO_FILE=true

# Log directory
LOG_DIR=./logs
```

### Cache Configuration

```bash
# Cache TTL in milliseconds
CACHE_TTL=60000

# Cache storage: memory, redis
CACHE_STORE=memory

# Maximum cache items (memory store only)
CACHE_MAX_ITEMS=100

# Redis URL (if CACHE_STORE=redis)
# REDIS_URL=redis://localhost:6379
```

## Configuration Validation

Nest GatewayQL validates all configuration on startup. If required variables are missing or invalid, the application will not start.

### Required Variables

These variables MUST be set:

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `JWT_SECRET`
- `CIPHER_KEY`

### Optional Variables

These variables have default values:

- `NODE_ENV` (default: `development`)
- `PORT` (default: `3000`)
- `DB_TYPE` (default: `postgres`)
- `SALT_ROUNDS` (default: `10`)
- `THROTTLE_TTL` (default: `60`)
- `THROTTLE_LIMIT` (default: `10`)

## Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
GRAPHQL_PLAYGROUND=true
GRAPHQL_INTROSPECTION=true
GRAPHQL_DEBUG=true
DB_SYNCHRONIZE=true
LOG_LEVEL=debug
THROTTLE_LIMIT=1000
```

### Production

```bash
NODE_ENV=production
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false
GRAPHQL_DEBUG=false
DB_SYNCHRONIZE=false
DB_SSL=true
LOG_LEVEL=info
LOG_TO_FILE=true
THROTTLE_LIMIT=100
```

### Testing

```bash
NODE_ENV=test
DB_TYPE=sqlite
DB_DATABASE=:memory:
LOG_LEVEL=error
```

## Docker Configuration

When using Docker, you can pass environment variables in several ways:

### Docker Compose

```yaml
version: '3.8'
services:
  gateway:
    image: nest-gatewayql
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PASSWORD=${DB_PASSWORD}
    env_file:
      - .env.production
```

### Docker Run

```bash
docker run -e NODE_ENV=production -e DB_HOST=postgres nest-gatewayql
```

### Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gatewayql-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded-secret>
  cipher-key: <base64-encoded-key>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gatewayql
spec:
  template:
    spec:
      containers:
        - name: gateway
          image: nest-gatewayql
          env:
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: gatewayql-secrets
                  key: jwt-secret
```

## Configuration Best Practices

1. **Never commit secrets** to version control
2. **Use different secrets** for each environment
3. **Rotate secrets regularly**
4. **Validate configuration** on startup
5. **Use environment-specific** configurations
6. **Document all variables** in `.env.example`
7. **Use secret management** tools in production
8. **Enable SSL/TLS** in production
9. **Disable debugging** features in production
10. **Monitor configuration** changes

## Next Steps

- [Explore Features](../features/) - Learn about available features
- [API Reference](../api/) - Understand the API
- [Deployment Guide](../deployment/) - Deploy to production
