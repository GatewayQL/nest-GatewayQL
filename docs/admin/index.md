---
layout: default
title: Admin Guide
---

# Admin Guide

Administrative operations and management guide for Nest GatewayQL.

## Table of Contents

- [Admin GraphQL Endpoint](#admin-graphql-endpoint)
- [User Management](#user-management)
- [System Operations](#system-operations)
- [Monitoring](#monitoring)
- [Maintenance](#maintenance)
- [Security](#security)

## Admin GraphQL Endpoint

Nest GatewayQL provides a separate GraphQL endpoint for administrative operations:

**Endpoint**: `http://localhost:3000/admin`

**Access Requirements**:
- JWT authentication
- ADMIN role

### Accessing Admin API

```bash
# 1. Login as admin
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { login(loginInput: {email: \"admin@example.com\", password: \"admin-password\"}) { accessToken } }"}'

# 2. Use admin endpoint with token
curl -X POST http://localhost:3000/admin \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ users { id username role } }"}'
```

## User Management

### List All Users

```graphql
query {
  users {
    id
    username
    email
    role
    isActive
    createdAt
    updatedAt
  }
}
```

### Create Administrator

```graphql
mutation {
  createUser(
    createUserInput: {
      username: "admin"
      email: "admin@example.com"
      password: "SecureAdminPass123!"
      firstName: "System"
      lastName: "Administrator"
    }
  ) {
    id
    username
    email
  }
}

# Then promote to admin
mutation {
  updateUser(
    id: "user-id"
    updateUserInput: {
      role: ADMIN
    }
  ) {
    id
    role
  }
}
```

### Manage User Roles

```graphql
# Promote to moderator
mutation {
  updateUser(id: "user-id", updateUserInput: { role: MODERATOR }) {
    id
    role
  }
}

# Promote to admin
mutation {
  updateUser(id: "user-id", updateUserInput: { role: ADMIN }) {
    id
    role
  }
}

# Demote to user
mutation {
  updateUser(id: "user-id", updateUserInput: { role: USER }) {
    id
    role
  }
}
```

### Deactivate/Activate Users

```graphql
# Deactivate user
mutation {
  updateUser(id: "user-id", updateUserInput: { isActive: false }) {
    id
    isActive
  }
}

# Reactivate user
mutation {
  updateUser(id: "user-id", updateUserInput: { isActive: true }) {
    id
    isActive
  }
}
```

### Delete Users

```graphql
mutation {
  deleteUser(id: "user-id") {
    id
  }
}
```

**Warning**: This permanently deletes the user and all associated data.

## System Operations

### Health Monitoring

```bash
# Comprehensive health check
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/health/ready

# Liveness check
curl http://localhost:3000/health/live
```

### Database Operations

```bash
# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Check migration status
npm run migration:show
```

### Cache Management

```typescript
// Clear all cache
await this.cacheManager.reset();

// Clear specific key
await this.cacheManager.del('users');

// Get cache statistics (if using Redis)
await this.redisClient.info('stats');
```

## Monitoring

### Application Logs

```bash
# View logs (Docker)
docker-compose logs -f gateway

# View logs (Kubernetes)
kubectl logs -f deployment/nest-gatewayql -n gatewayql

# View log files (production)
tail -f logs/combined.log
tail -f logs/error.log
```

### Metrics

Access Prometheus metrics (if configured):

```bash
curl http://localhost:3000/metrics
```

### Performance Monitoring

Monitor key metrics:
- Request rate
- Response time
- Error rate
- Database connections
- Cache hit ratio
- Memory usage
- CPU usage

### Alerts

Set up alerts for:
- High error rate (>5%)
- Slow response time (>1s)
- High memory usage (>80%)
- Database connection failures
- Rate limit violations
- Security events

## Maintenance

### Backup

#### Database Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U postgres gatewayql > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres gatewayql < backup_20250115.sql
```

#### Automated Backups

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
pg_dump -h localhost -U postgres gatewayql | gzip > $BACKUP_DIR/gatewayql_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "gatewayql_*.sql.gz" -mtime +7 -delete
```

### Updates

```bash
# 1. Backup database
./backup.sh

# 2. Pull latest code
git pull origin main

# 3. Update dependencies
npm install

# 4. Run migrations
npm run migration:run

# 5. Build
npm run build

# 6. Restart (Docker)
docker-compose restart gateway

# 7. Verify health
curl http://localhost:3000/health
```

### Cleanup Tasks

```bash
# Clean old logs (older than 30 days)
find logs/ -name "*.log" -mtime +30 -delete

# Clean inactive users (no activity in 365 days)
# Implement custom query

# Clean expired tokens
# Implement custom cleanup service
```

## Security

### Security Audit

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (may cause breaking changes)
npm audit fix --force
```

### Access Control

Ensure proper role assignments:

```graphql
query {
  adminUsers: users(where: { role: ADMIN }) {
    id
    username
    email
    createdAt
  }
}
```

### Credential Rotation

```bash
# 1. Generate new secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # CIPHER_KEY

# 2. Update .env
JWT_SECRET=new-secret
CIPHER_KEY=new-key

# 3. Restart application
# (Users will need to re-authenticate)
```

### Security Monitoring

Monitor for:
- Failed login attempts
- Unauthorized access attempts
- Privilege escalation attempts
- Unusual API usage patterns
- Credential compromise

### Incident Response

```bash
# 1. Identify compromised accounts
query {
  users(where: { lastLoginFrom: "suspicious-ip" }) {
    id
    username
  }
}

# 2. Deactivate accounts
mutation {
  updateUser(id: "user-id", updateUserInput: { isActive: false }) {
    id
  }
}

# 3. Revoke credentials
mutation {
  deleteCredential(id: "cred-id") {
    id
  }
}

# 4. Rotate secrets
# Update JWT_SECRET and CIPHER_KEY

# 5. Notify affected users
# Send email notifications
```

## Best Practices

1. **Regular Backups**: Daily automated backups
2. **Monitor Logs**: Review logs daily for anomalies
3. **Security Audits**: Monthly vulnerability scans
4. **Update Dependencies**: Weekly dependency updates
5. **Capacity Planning**: Monitor resource usage trends
6. **Disaster Recovery**: Test recovery procedures quarterly
7. **Documentation**: Keep runbooks up to date
8. **Access Control**: Review admin access quarterly
9. **Compliance**: Maintain audit logs for compliance
10. **Incident Response**: Have a documented incident response plan

## Administrative Tools

### Database Administration

**pgAdmin** (PostgreSQL):
```bash
# Access pgAdmin
docker run -p 5050:80 -e 'PGADMIN_DEFAULT_EMAIL=admin@example.com' -e 'PGADMIN_DEFAULT_PASSWORD=admin' dpage/pgadmin4
```

### Monitoring Tools

**Grafana Dashboard**:
```yaml
# docker-compose.yml
services:
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Troubleshooting

### High Load

1. Check slow queries
2. Review cache hit ratio
3. Analyze request patterns
4. Scale horizontally if needed

### Database Issues

1. Check connection pool
2. Analyze slow queries
3. Review indexes
4. Optimize queries

### Memory Leaks

1. Monitor heap usage
2. Profile application
3. Review event listeners
4. Check for circular references

## Next Steps

- [Deployment Guide](../deployment/) - Production deployment
- [Monitoring Guide](../guides/monitoring) - Set up monitoring
- [Security Guide](../guides/security) - Security best practices

## Additional Resources

- [PostgreSQL Administration](https://www.postgresql.org/docs/current/admin.html)
- [Kubernetes Administration](https://kubernetes.io/docs/tasks/administer-cluster/)
- [NestJS Best Practices](https://docs.nestjs.com/techniques/performance)
