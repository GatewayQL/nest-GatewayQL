# Production Deployment Guide

This guide provides comprehensive instructions for deploying Nest GatewayQL to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [AWS Deployment](#aws-deployment)
- [Security Checklist](#security-checklist)
- [Monitoring & Observability](#monitoring--observability)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Node.js 20.x LTS** (minimum)
- **PostgreSQL 15+**
- **Redis 7.x** (optional, for caching)
- **Docker 24.x** (for containerized deployment)
- **kubectl 1.28+** (for Kubernetes deployment)

### System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 2GB
- Disk: 10GB
- Network: 1Gbps

**Recommended:**
- CPU: 4 cores
- RAM: 4GB
- Disk: 50GB (with logs)
- Network: 10Gbps

## Environment Configuration

### 1. Create Production Environment File

```bash
cp .env.example .env.production
```

### 2. Configure Critical Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Security - CHANGE THESE!
JWT_SECRET=$(openssl rand -base64 32)
CIPHER_KEY=$(openssl rand -base64 32)
SALT_ROUNDS=12

# Database
DB_TYPE=postgres
DB_HOST=your-db-host.amazonaws.com
DB_PORT=5432
DB_USERNAME=gatewayql_prod
DB_PASSWORD=$(openssl rand -base64 32)
DB_DATABASE=gatewayql_prod
DB_SYNCHRONIZE=false  # MUST be false in production
DB_SSL=true

# Redis Cache
REDIS_ENABLED=true
REDIS_HOST=your-redis-host.amazonaws.com
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=$(openssl rand -base64 32)
CACHE_TTL=300000

# GraphQL
GRAPHQL_PLAYGROUND=false
GRAPHQL_DEBUG=false
GRAPHQL_INTROSPECTION=false
MAX_QUERY_COMPLEXITY=100

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# CORS
CORS_ORIGIN=https://your-domain.com,https://admin.your-domain.com

# Tracing
ENABLE_TRACING=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-jaeger:4318

# Logging
LOG_LEVEL=info
```

### 3. Validate Configuration

```bash
# Check required variables
node -e "
const required = ['JWT_SECRET', 'CIPHER_KEY', 'DB_PASSWORD', 'DB_HOST'];
const missing = required.filter(v => !process.env[v]);
if (missing.length) {
  console.error('Missing required env vars:', missing);
  process.exit(1);
}
console.log('✓ Configuration valid');
"
```

## Database Setup

### 1. Create Production Database

```sql
-- Connect to PostgreSQL
psql -h your-db-host -U postgres

-- Create database and user
CREATE DATABASE gatewayql_prod;
CREATE USER gatewayql_prod WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE gatewayql_prod TO gatewayql_prod;

-- Enable required extensions
\c gatewayql_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Run Database Migrations

```bash
# Set environment
export NODE_ENV=production

# Run migrations
npm run migration:run

# Verify migrations
npm run migration:show
```

### 3. Create Initial Admin User

```bash
# Using the GraphQL admin API
curl -X POST http://localhost:3000/admin \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createUser(createUserInput: { username: \"admin\", email: \"admin@your-domain.com\", password: \"change-this-password\", role: ADMIN }) { id username email role } }"
  }'
```

## Docker Deployment

### 1. Build Production Image

```bash
# Build image
docker build -t gatewayql:latest .

# Tag for registry
docker tag gatewayql:latest ghcr.io/your-org/gatewayql:v1.0.0
```

### 2. Run with Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    image: gatewayql:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: gatewayql_prod
      POSTGRES_USER: gatewayql_prod
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gatewayql_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

Start services:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Kubernetes Deployment

### 1. Create Kubernetes Secrets

```bash
kubectl create secret generic gatewayql-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=cipher-key=$(openssl rand -base64 32) \
  --from-literal=db-password=$(openssl rand -base64 32) \
  --from-literal=redis-password=$(openssl rand -base64 32)
```

### 2. Deploy Application

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gatewayql
  labels:
    app: gatewayql
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gatewayql
  template:
    metadata:
      labels:
        app: gatewayql
    spec:
      containers:
      - name: gatewayql
        image: ghcr.io/your-org/gatewayql:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: gatewayql-secrets
              key: jwt-secret
        - name: CIPHER_KEY
          valueFrom:
            secretKeyRef:
              name: gatewayql-secrets
              key: cipher-key
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: gatewayql-secrets
              key: db-password
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: gatewayql
spec:
  selector:
    app: gatewayql
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

Apply configuration:

```bash
kubectl apply -f k8s/
```

## AWS Deployment

### Using AWS ECS (Elastic Container Service)

1. **Push Image to ECR:**

```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com

# Push image
docker tag gatewayql:latest your-account.dkr.ecr.us-east-1.amazonaws.com/gatewayql:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/gatewayql:latest
```

2. **Create ECS Task Definition:**

```json
{
  "family": "gatewayql",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "gatewayql",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/gatewayql:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:account:secret:jwt-secret"},
        {"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:us-east-1:account:secret:db-password"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/gatewayql",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -q --spider http://localhost:3000/health/live || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

3. **Create ECS Service:**

```bash
aws ecs create-service \
  --cluster production \
  --service-name gatewayql \
  --task-definition gatewayql:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Security Checklist

### Before Deployment

- [ ] All environment variables set from secrets manager
- [ ] JWT_SECRET is cryptographically secure (32+ bytes)
- [ ] CIPHER_KEY is cryptographically secure (32 bytes for AES-256)
- [ ] Database passwords are strong and unique
- [ ] DB_SYNCHRONIZE=false in production
- [ ] GRAPHQL_PLAYGROUND=false
- [ ] GRAPHQL_INTROSPECTION=false
- [ ] CORS origins properly configured
- [ ] SSL/TLS enabled for database connections
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] Query complexity limits set
- [ ] Security headers configured (Helmet)
- [ ] Redis password set
- [ ] API keys secured in database
- [ ] Admin user password changed from default

### Network Security

- [ ] Application behind load balancer
- [ ] HTTPS/TLS configured
- [ ] Firewall rules configured
- [ ] VPC/network isolation
- [ ] Security groups configured
- [ ] DDoS protection enabled
- [ ] WAF rules configured

### Monitoring

- [ ] Health check endpoints configured
- [ ] Prometheus metrics collection enabled
- [ ] OpenTelemetry tracing configured
- [ ] Log aggregation configured
- [ ] Alerting rules set up
- [ ] Uptime monitoring enabled

## Monitoring & Observability

### Prometheus Metrics

Access metrics at: `http://your-domain.com/metrics`

Key metrics to monitor:
- `http_requests_total`: Total HTTP requests
- `http_request_duration_seconds`: Request latency
- `process_cpu_user_seconds_total`: CPU usage
- `process_resident_memory_bytes`: Memory usage

### Grafana Dashboard

Import pre-built dashboard:

```bash
# Download dashboard JSON
curl -O https://grafana.com/api/dashboards/xxxx/revisions/1/download

# Import to Grafana
curl -X POST -H "Content-Type: application/json" \
  -d @dashboard.json \
  http://grafana:3000/api/dashboards/db
```

### Log Aggregation

Configure log shipping to ELK/Splunk/CloudWatch:

```bash
# Example: Configure Filebeat for ELK
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/gatewayql/*.log
  fields:
    app: gatewayql
    env: production
```

### Alerts

Configure critical alerts:

```yaml
groups:
- name: gatewayql
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"

  - alert: HighMemoryUsage
    expr: process_resident_memory_bytes > 1.5e9
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Memory usage above 1.5GB"
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failures

```bash
# Check database connectivity
psql -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE

# Verify SSL settings
openssl s_client -connect $DB_HOST:$DB_PORT -starttls postgres

# Check logs
docker logs gatewayql-app | grep -i "database"
```

#### 2. Redis Connection Issues

```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# Check Redis logs
docker logs gatewayql-redis

# Fallback to in-memory cache
export REDIS_ENABLED=false
```

#### 3. High Memory Usage

```bash
# Check Node.js heap usage
curl http://localhost:3000/metrics | grep heap

# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor garbage collection
node --expose-gc --trace-gc dist/main.js
```

#### 4. Slow GraphQL Queries

```bash
# Check query complexity
curl -X POST http://localhost:3000/admin \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { queryType { name } } }"}'

# Enable query logging
export GRAPHQL_DEBUG=true

# Check database query performance
# Execute EXPLAIN ANALYZE on slow queries
```

### Health Check Endpoints

- `/health` - Comprehensive health check
- `/health/ready` - Readiness probe (for Kubernetes)
- `/health/live` - Liveness probe (for Kubernetes)

### Support Contacts

- Technical Issues: tech@your-domain.com
- Security Issues: security@your-domain.com
- Emergency Hotline: +1-xxx-xxx-xxxx

## Rollback Procedure

### Docker

```bash
# List previous images
docker images gatewayql

# Rollback to previous version
docker-compose -f docker-compose.prod.yml down
docker tag gatewayql:v1.0.0-rollback gatewayql:latest
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes

```bash
# Rollback to previous revision
kubectl rollout undo deployment/gatewayql

# Rollback to specific revision
kubectl rollout undo deployment/gatewayql --to-revision=2

# Check rollout status
kubectl rollout status deployment/gatewayql
```

### Database Migrations

```bash
# Revert last migration
npm run migration:revert

# Check migration status
npm run migration:show
```

## Performance Tuning

### Node.js Optimization

```bash
# Production mode
NODE_ENV=production

# Increase heap size
NODE_OPTIONS="--max-old-space-size=4096"

# Enable clustering (for multi-core)
PM2_INSTANCES=4
```

### Database Optimization

```sql
-- Create indexes for frequent queries
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_credentials_consumer_id ON credentials(consumer_id);
CREATE INDEX idx_credentials_key_id ON credentials(key_id);

-- Analyze and vacuum
ANALYZE;
VACUUM ANALYZE;
```

### Redis Optimization

```bash
# Configure maxmemory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 2gb

# Enable persistence
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

## Scaling

### Horizontal Scaling

```bash
# Docker Compose
docker-compose -f docker-compose.prod.yml up -d --scale app=5

# Kubernetes
kubectl scale deployment gatewayql --replicas=10

# AWS ECS
aws ecs update-service --cluster production --service gatewayql --desired-count 10
```

### Load Balancer Configuration

- Use round-robin or least connections algorithm
- Enable sticky sessions for WebSocket connections
- Configure health checks
- Set connection timeouts appropriately
- Enable HTTP/2 and compression

## Backup Strategy

### Database Backups

```bash
# Automated daily backups
0 2 * * * pg_dump -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE | gzip > /backups/gatewayql_$(date +\%Y\%m\%d).sql.gz

# Retention: 7 daily, 4 weekly, 12 monthly
```

### Redis Persistence

```bash
# RDB snapshots
save 900 1
save 300 10
save 60 10000

# AOF persistence
appendonly yes
appendfsync everysec
```

## Maintenance

### Regular Tasks

**Daily:**
- Review error logs
- Check metrics dashboards
- Verify backup completion

**Weekly:**
- Review security alerts
- Update dependencies (minor versions)
- Performance analysis

**Monthly:**
- Security audit
- Capacity planning review
- Disaster recovery drill

**Quarterly:**
- Major version updates
- Infrastructure review
- Security penetration testing

## Additional Resources

- [README.md](./README.md) - General documentation
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
- [API Documentation](./docs/api.md) - API reference

---

**Last Updated:** 2025-11-07
**Version:** 1.0.0
