---
layout: default
title: Getting Started
---

# Getting Started

This guide will help you install and run Nest GatewayQL in minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ or 20+ ([Download](https://nodejs.org/))
- **PostgreSQL** 12+ ([Download](https://www.postgresql.org/download/))
- **npm** or **yarn** (comes with Node.js)
- **Git** (optional, for cloning)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/GatewayQL/nest-GatewayQL.git
cd nest-GatewayQL
```

### 2. Install Dependencies

```bash
npm install
```

Or using yarn:

```bash
yarn install
```

## Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your settings:

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

> **Important**: Change `JWT_SECRET` and `CIPHER_KEY` in production!

## Database Setup

### Option 1: Using Docker (Recommended)

Start PostgreSQL using Docker Compose:

```bash
docker-compose -f docker-compose-postgres.yml up -d
```

This will start PostgreSQL on port 5432 with the default credentials.

### Option 2: Using Existing PostgreSQL

If you have PostgreSQL installed, create a database:

```sql
CREATE DATABASE gatewayql;
```

Update the `.env` file with your PostgreSQL credentials.

## Running the Application

### Development Mode

Run with hot reload:

```bash
npm run start:dev
```

### Production Mode

Build and run:

```bash
npm run build
npm run start:prod
```

## Verify Installation

Once running, the application will be available at:

- 🔍 **GraphQL Gateway**: [http://localhost:3000/graphql](http://localhost:3000/graphql)
- ⚙️ **Admin GraphQL**: [http://localhost:3000/admin](http://localhost:3000/admin)
- ❤️ **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:

```json
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

### Test GraphQL Endpoint

Visit [http://localhost:3000/graphql](http://localhost:3000/graphql) in your browser to access the GraphQL Playground.

Try this query:

```graphql
query {
  users {
    id
    username
    email
  }
}
```

## Next Steps

Now that you have Nest GatewayQL running:

1. [Configure your gateway](../configuration/) - Learn about configuration options
2. [Explore features](../features/) - Discover what Nest GatewayQL can do
3. [Read the API reference](../api/) - Understand the API
4. [Follow deployment guide](../deployment/) - Deploy to production

## Troubleshooting

### Database Connection Failed

**Problem**: Can't connect to PostgreSQL

**Solution**:

1. Check if PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```

2. Verify connection settings in `.env`:
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   ```

### Port Already in Use

**Problem**: Port 3000 is already in use

**Solution**:

Change the port in `.env`:

```bash
PORT=3001
```

### GraphQL Playground Not Loading

**Problem**: GraphQL Playground shows blank page

**Solution**:

1. Ensure `GRAPHQL_PLAYGROUND=true` in `.env`
2. GraphQL Playground is only available in development mode
3. Check browser console for errors

### Module Not Found Errors

**Problem**: Import errors after installation

**Solution**:

1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear TypeScript cache:
   ```bash
   npm run prebuild
   ```

## Getting Help

Need help? Here are your options:

- 📖 [Read the documentation](../)
- 💬 [Ask in Discussions](https://github.com/GatewayQL/nest-GatewayQL/discussions)
- 🐛 [Report a bug](https://github.com/GatewayQL/nest-GatewayQL/issues)
- 💡 [Request a feature](https://github.com/GatewayQL/nest-GatewayQL/issues/new?template=feature_request.md)
- 💬 [Join Discord](https://discord.gg/gatewayql)
