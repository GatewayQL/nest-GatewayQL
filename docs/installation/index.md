---
layout: default
title: Installation
---

# Installation

This guide provides detailed instructions for installing Nest GatewayQL in various environments.

## Table of Contents

- [System Requirements](#system-requirements)
- [Quick Installation](#quick-installation)
- [NPM Installation](#npm-installation)
- [Docker Installation](#docker-installation)
- [Kubernetes Installation](#kubernetes-installation)
- [Building from Source](#building-from-source)
- [Verification](#verification)
- [Next Steps](#next-steps)

## System Requirements

### Minimum Requirements

- **Node.js**: 18.x or 20.x (LTS recommended)
- **npm**: 9.x or higher (comes with Node.js)
- **PostgreSQL**: 12.x or higher
- **Memory**: 512 MB RAM minimum
- **Disk Space**: 500 MB free space

### Recommended Requirements

- **Node.js**: 20.x LTS
- **npm**: 10.x
- **PostgreSQL**: 15.x or higher
- **Memory**: 2 GB RAM
- **Disk Space**: 2 GB free space
- **CPU**: 2 cores or more

### Operating Systems

Nest GatewayQL works on:

- **Linux**: Ubuntu 20.04+, Debian 11+, CentOS 8+, RHEL 8+
- **macOS**: 11 (Big Sur) or higher
- **Windows**: Windows 10/11, Windows Server 2019+

## Quick Installation

The fastest way to get started:

```bash
# Clone the repository
git clone https://github.com/GatewayQL/nest-GatewayQL.git
cd nest-GatewayQL

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL (Docker)
docker-compose -f docker-compose-postgres.yml up -d

# Run the gateway
npm run start:dev
```

Your gateway will be available at http://localhost:3000

## NPM Installation

### Step 1: Install Node.js

#### Using Node Version Manager (nvm) - Recommended

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20
```

#### Using Package Managers

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS:**
```bash
brew install node@20
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/)

### Step 2: Verify Installation

```bash
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 3: Clone Repository

```bash
git clone https://github.com/GatewayQL/nest-GatewayQL.git
cd nest-GatewayQL
```

### Step 4: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- NestJS framework
- GraphQL and Apollo Server
- TypeORM and database drivers
- Security packages
- Development tools

### Step 5: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env  # or use your preferred editor
```

See [Configuration Guide](../configuration/) for detailed configuration options.

## Docker Installation

### Prerequisites

- Docker 20.10 or higher
- Docker Compose 2.0 or higher

### Step 1: Pull Docker Image

```bash
docker pull ghcr.io/gatewayql/nest-gatewayql:latest
```

### Step 2: Run with Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  gateway:
    image: ghcr.io/gatewayql/nest-gatewayql:latest
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: postgres
      DB_PASSWORD: postgres
      DB_DATABASE: gatewayql
      JWT_SECRET: your-secret-change-this
      CIPHER_KEY: your-32-character-key-change!!
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: gatewayql
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Start the services:

```bash
docker-compose up -d
```

### Step 3: Verify Container

```bash
# Check running containers
docker ps

# View logs
docker-compose logs -f gateway

# Check health
curl http://localhost:3000/health
```

### Building Docker Image Locally

```bash
# Clone repository
git clone https://github.com/GatewayQL/nest-GatewayQL.git
cd nest-GatewayQL

# Build image
docker build -t nest-gatewayql:local .

# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=development \
  -e DB_HOST=host.docker.internal \
  nest-gatewayql:local
```

## Kubernetes Installation

### Prerequisites

- Kubernetes 1.24+
- kubectl configured
- Helm 3.0+ (optional)

### Step 1: Create Namespace

```bash
kubectl create namespace gatewayql
```

### Step 2: Create Secrets

```bash
kubectl create secret generic gatewayql-secrets \
  --from-literal=jwt-secret='your-jwt-secret' \
  --from-literal=cipher-key='your-32-character-cipher-key' \
  --from-literal=db-password='your-db-password' \
  -n gatewayql
```

### Step 3: Deploy PostgreSQL

```yaml
# postgres.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: gatewayql
spec:
  ports:
    - port: 5432
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: gatewayql
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: gatewayql
            - name: POSTGRES_USER
              value: postgres
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: gatewayql-secrets
                  key: db-password
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

Deploy:

```bash
kubectl apply -f postgres.yaml
```

### Step 4: Deploy Gateway

```yaml
# gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nest-gatewayql
  namespace: gatewayql
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
          image: ghcr.io/gatewayql/nest-gatewayql:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: DB_HOST
              value: postgres
            - name: DB_USERNAME
              value: postgres
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: gatewayql-secrets
                  key: db-password
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
---
apiVersion: v1
kind: Service
metadata:
  name: gatewayql-service
  namespace: gatewayql
spec:
  type: LoadBalancer
  selector:
    app: gatewayql
  ports:
    - port: 80
      targetPort: 3000
```

Deploy:

```bash
kubectl apply -f gateway.yaml
```

### Step 5: Verify Deployment

```bash
# Check pods
kubectl get pods -n gatewayql

# Check service
kubectl get svc -n gatewayql

# View logs
kubectl logs -f deployment/nest-gatewayql -n gatewayql
```

## Building from Source

### Step 1: Clone Repository

```bash
git clone https://github.com/GatewayQL/nest-GatewayQL.git
cd nest-GatewayQL
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build Project

```bash
npm run build
```

This creates a production build in the `dist/` directory.

### Step 4: Run Production Build

```bash
npm run start:prod
```

### Development Build

For development with hot reload:

```bash
npm run start:dev
```

## Database Setup

### PostgreSQL Installation

#### Using Docker (Recommended)

```bash
docker-compose -f docker-compose-postgres.yml up -d
```

#### Native Installation

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE gatewayql;

# Create user (optional)
CREATE USER gatewayql_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE gatewayql TO gatewayql_user;

# Exit
\q
```

### Run Migrations

```bash
npm run migration:run
```

## Verification

### Check Installation

```bash
# Check if gateway is running
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","info":{"database":{"status":"up"},...}}
```

### Access GraphQL Playground

Open your browser and navigate to:
- http://localhost:3000/graphql

### Test GraphQL Query

```graphql
query {
  users {
    id
    username
    email
  }
}
```

### Check Logs

```bash
# Docker
docker-compose logs -f gateway

# Native
# Logs appear in console or logs/ directory
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or change port in .env
PORT=3001
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres  # Docker
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Verify connection settings in .env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=gatewayql
```

### Permission Denied

```bash
# Fix npm permissions (Linux/macOS)
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER node_modules

# Or use nvm instead of system-wide Node.js
```

### Module Not Found

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Uninstallation

### Remove Files

```bash
# Stop services
docker-compose down  # if using Docker

# Remove directory
cd ..
rm -rf nest-GatewayQL
```

### Remove Docker Resources

```bash
# Remove containers and volumes
docker-compose down -v

# Remove images
docker rmi nest-gatewayql
```

### Remove Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Drop database
DROP DATABASE gatewayql;
```

## Next Steps

Now that you have Nest GatewayQL installed:

1. [Core Concepts](../core-concepts/) - Understand the architecture
2. [Configuration](../configuration/) - Configure your gateway
3. [CLI Guide](../cli/) - Learn CLI commands
4. [Policies](../policies/) - Configure policies
5. [Deployment](../deployment/) - Deploy to production

## Additional Resources

- [GitHub Repository](https://github.com/GatewayQL/nest-GatewayQL)
- [Issue Tracker](https://github.com/GatewayQL/nest-GatewayQL/issues)
- [Discussions](https://github.com/GatewayQL/nest-GatewayQL/discussions)
- [Contributing Guide](https://github.com/GatewayQL/nest-GatewayQL/blob/main/CONTRIBUTING.md)
