---
layout: default
title: Deployment
---

# Deployment Guide

This guide covers deploying Nest GatewayQL to production environments.

## Pre-Deployment Checklist

Before deploying, ensure you:

- [ ] Set `NODE_ENV=production`
- [ ] Change `JWT_SECRET` and `CIPHER_KEY`
- [ ] Set `DB_SYNCHRONIZE=false`
- [ ] Enable `DB_SSL=true`
- [ ] Disable `GRAPHQL_PLAYGROUND=false`
- [ ] Disable `GRAPHQL_INTROSPECTION=false`
- [ ] Configure proper CORS origins
- [ ] Set appropriate rate limits
- [ ] Configure logging to files
- [ ] Set up database backups
- [ ] Configure health check endpoints
- [ ] Test in staging environment

## Docker Deployment

### Build Docker Image

```bash
docker build -t nest-gatewayql:latest .
```

### Run Container

```bash
docker run -d \
  --name gatewayql \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=postgres \
  -e JWT_SECRET=your-secret \
  nest-gatewayql:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
    env_file:
      - .env.production
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: gatewayql
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Run with:

```bash
docker-compose up -d
```

## Kubernetes Deployment

### Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nest-gatewayql
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
        - name: gateway
          image: nest-gatewayql:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
            - name: DB_HOST
              value: "postgres-service"
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
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

### Service Manifest

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gatewayql-service
spec:
  selector:
    app: gatewayql
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

### Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gatewayql-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded-secret>
  cipher-key: <base64-encoded-key>
```

Create secrets:

```bash
kubectl create secret generic gatewayql-secrets \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=cipher-key=your-cipher-key
```

Deploy:

```bash
kubectl apply -f k8s/
```

## AWS Deployment

### AWS ECS

1. **Create ECR Repository**:

```bash
aws ecr create-repository --repository-name nest-gatewayql
```

2. **Push Image**:

```bash
aws ecr get-login-password | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag nest-gatewayql:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/nest-gatewayql:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/nest-gatewayql:latest
```

3. **Create Task Definition**:

```json
{
  "family": "nest-gatewayql",
  "containerDefinitions": [
    {
      "name": "gateway",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/nest-gatewayql:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:jwt-secret"
        }
      ]
    }
  ]
}
```

4. **Create Service**:

```bash
aws ecs create-service \
  --cluster production \
  --service-name gatewayql \
  --task-definition nest-gatewayql \
  --desired-count 2 \
  --load-balancers targetGroupArn=<target-group-arn>,containerName=gateway,containerPort=3000
```

### AWS Elastic Beanstalk

1. **Initialize**:

```bash
eb init -p docker nest-gatewayql
```

2. **Create Environment**:

```bash
eb create production --database.engine postgres
```

3. **Deploy**:

```bash
eb deploy
```

## Google Cloud Platform

### Cloud Run

1. **Build and Push**:

```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/nest-gatewayql
```

2. **Deploy**:

```bash
gcloud run deploy nest-gatewayql \
  --image gcr.io/PROJECT-ID/nest-gatewayql \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

### Google Kubernetes Engine

```bash
gcloud container clusters create gatewayql-cluster --num-nodes=3
kubectl apply -f k8s/
```

## Azure Deployment

### Azure Container Instances

```bash
az container create \
  --resource-group gatewayql \
  --name nest-gatewayql \
  --image nest-gatewayql:latest \
  --dns-name-label nest-gatewayql \
  --ports 3000
```

## Heroku Deployment

1. **Create App**:

```bash
heroku create nest-gatewayql
```

2. **Add PostgreSQL**:

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

3. **Set Config**:

```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
```

4. **Deploy**:

```bash
git push heroku main
```

## Environment Variables

Production environment variables:

```bash
NODE_ENV=production
PORT=3000

# Database
DB_TYPE=postgres
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DATABASE=gatewayql
DB_SYNCHRONIZE=false
DB_SSL=true

# Security
JWT_SECRET=your-super-secret-jwt-key
CIPHER_KEY=your-32-character-cipher-key
SALT_ROUNDS=10

# GraphQL
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false
GRAPHQL_DEBUG=false
MAX_QUERY_COMPLEXITY=100

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# CORS
CORS_ORIGIN=https://your-app.com
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_DIR=/var/log/gatewayql
```

## SSL/TLS Configuration

### Using Let's Encrypt

```bash
certbot certonly --standalone -d api.example.com
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### Health Checks

Configure health checks in your load balancer:

- **Liveness**: `/health/live`
- **Readiness**: `/health/ready`

### Logging

Production logs are written to:

- `logs/error.log`
- `logs/combined.log`

Configure log rotation:

```bash
# /etc/logrotate.d/gatewayql
/var/log/gatewayql/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 app app
}
```

## Scaling

### Horizontal Scaling

```bash
# Kubernetes
kubectl scale deployment nest-gatewayql --replicas=5

# Docker Swarm
docker service scale gatewayql=5

# AWS ECS
aws ecs update-service --service gatewayql --desired-count 5
```

### Auto-Scaling

Kubernetes HPA:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gatewayql-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nest-gatewayql
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Database Migrations

Run migrations before deployment:

```bash
npm run migration:run
```

For zero-downtime deployments, use forward-compatible migrations.

## Backup Strategy

### Database Backups

```bash
# PostgreSQL
pg_dump -h localhost -U postgres gatewayql > backup.sql

# Restore
psql -h localhost -U postgres gatewayql < backup.sql
```

### Automated Backups

Configure daily backups in cron:

```bash
0 2 * * * /usr/local/bin/backup-db.sh
```

## Rollback Strategy

### Docker

```bash
docker tag nest-gatewayql:latest nest-gatewayql:backup
docker pull nest-gatewayql:previous
docker tag nest-gatewayql:previous nest-gatewayql:latest
docker-compose up -d
```

### Kubernetes

```bash
kubectl rollout undo deployment/nest-gatewayql
```

## Security Checklist

- [ ] HTTPS/TLS enabled
- [ ] Secrets stored securely
- [ ] Database SSL enabled
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation active
- [ ] GraphQL playground disabled
- [ ] Introspection disabled
- [ ] Error messages sanitized
- [ ] Security headers configured
- [ ] Dependencies updated
- [ ] Audit logging enabled

## Performance Optimization

1. **Enable caching** with Redis
2. **Use connection pooling** for database
3. **Enable compression** (gzip)
4. **Optimize queries** with DataLoader
5. **Use CDN** for static assets
6. **Monitor performance** with APM tools

## Next Steps

- [Configuration](../configuration/) - Production configuration
- [Monitoring Guide](../guides/monitoring) - Set up monitoring
- [Security Best Practices](../guides/security) - Secure your deployment
