---
layout: default
title: CLI Reference
---

# CLI Reference

Nest GatewayQL provides a comprehensive command-line interface for managing your API gateway. This guide covers all available CLI commands.

## Table of Contents

- [Overview](#overview)
- [Application Commands](#application-commands)
- [Database Commands](#database-commands)
- [Migration Commands](#migration-commands)
- [Development Commands](#development-commands)
- [Testing Commands](#testing-commands)
- [Utility Commands](#utility-commands)

## Overview

The CLI is built using npm scripts defined in `package.json` and uses various tools including NestJS CLI, TypeORM, and Jest.

### Prerequisites

Ensure you have:
- Node.js 18+ or 20+
- npm or yarn installed
- Project dependencies installed (`npm install`)

## Application Commands

### Start Development Server

Start the application in development mode with hot reload:

```bash
npm run start:dev
```

**Features:**
- Hot module replacement
- Auto-restart on file changes
- Source map support
- Debug mode enabled

**Output:**
```
[Nest] 12345  - 01/15/2025, 10:30:45 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 01/15/2025, 10:30:45 AM     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - 01/15/2025, 10:30:46 AM     LOG [NestApplication] Nest application successfully started
```

**Access Points:**
- GraphQL: http://localhost:3000/graphql
- Admin: http://localhost:3000/admin
- Health: http://localhost:3000/health

### Start Production Server

Build and start the application in production mode:

```bash
# Build
npm run build

# Start
npm run start:prod
```

**Features:**
- Optimized build
- No hot reload
- Production logging
- Performance optimizations

### Start Debug Mode

Start with Node.js debugger attached:

```bash
npm run start:debug
```

**Debug Connection:**
- Default port: 9229
- Chrome DevTools: `chrome://inspect`
- VS Code: Use debug configuration

## Database Commands

### TypeORM CLI

Access TypeORM CLI directly:

```bash
npm run typeorm -- <command> [options]
```

**Examples:**

```bash
# Show all commands
npm run typeorm -- --help

# Query database
npm run typeorm -- query "SELECT * FROM users LIMIT 10"

# Show migrations status
npm run typeorm -- migration:show -d src/data-source.ts
```

### Database Synchronization

**⚠️ Warning:** Only use in development!

```bash
# Set in .env
DB_SYNCHRONIZE=true

# Or manually sync
npm run typeorm -- schema:sync -d src/data-source.ts
```

### Database Schema Drop

**⚠️ Danger:** This will drop all tables!

```bash
npm run typeorm -- schema:drop -d src/data-source.ts
```

## Migration Commands

Migrations manage database schema changes in a controlled, versioned manner.

### Generate Migration

Generate a migration based on entity changes:

```bash
npm run migration:generate -- src/migrations/MigrationName
```

**Example:**
```bash
npm run migration:generate -- src/migrations/AddUserRoles
```

**Output:**
```
Migration /path/to/project/src/migrations/1705315200000-AddUserRoles.ts has been generated successfully.
```

**Generated File:**
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoles1705315200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD "role" varchar NOT NULL DEFAULT 'user'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "role"
    `);
  }
}
```

### Create Empty Migration

Create an empty migration template:

```bash
npm run migration:create -- src/migrations/CustomMigration
```

**Use Case:** For complex migrations not auto-generated from entities.

### Run Migrations

Execute all pending migrations:

```bash
npm run migration:run
```

**Output:**
```
query: SELECT * FROM "migrations" "migrations"
query: START TRANSACTION
query: ALTER TABLE "users" ADD "role" varchar NOT NULL DEFAULT 'user'
query: INSERT INTO "migrations"("timestamp", "name") VALUES ($1, $2)
query: COMMIT
Migration AddUserRoles1705315200000 has been executed successfully.
```

**Production:**
```bash
# In CI/CD pipeline
npm run build
npm run migration:run
npm run start:prod
```

### Revert Migration

Revert the most recently executed migration:

```bash
npm run migration:revert
```

**Output:**
```
query: SELECT * FROM "migrations" "migrations" ORDER BY "id" DESC
query: START TRANSACTION
query: ALTER TABLE "users" DROP COLUMN "role"
query: DELETE FROM "migrations" WHERE "timestamp" = $1 AND "name" = $2
query: COMMIT
Migration AddUserRoles1705315200000 has been reverted successfully.
```

**Revert Multiple:**
```bash
# Revert last 3 migrations
npm run migration:revert
npm run migration:revert
npm run migration:revert
```

### Show Migrations

Display all migrations and their status:

```bash
npm run migration:show
```

**Output:**
```
[X] InitialSchema1700000000000
[X] AddUserRoles1705315200000
[ ] AddCredentialsTable1705315300000
```

Legend:
- `[X]` - Executed
- `[ ]` - Pending

## Development Commands

### Build Project

Build the TypeScript project:

```bash
npm run build
```

**Output:**
```
tsc -p tsconfig.build.json
```

**Build Directory:** `dist/`

### Clean Build

Remove build artifacts and rebuild:

```bash
npm run prebuild
npm run build
```

**prebuild script:**
```bash
rimraf dist
```

### Format Code

Format code with Prettier:

```bash
npm run format
```

**Formats:**
- TypeScript files (`src/**/*.ts`)
- Test files (`test/**/*.ts`)
- Configuration files

**Config:** `.prettierrc`

### Lint Code

Lint code with ESLint:

```bash
npm run lint
```

**Auto-fix:**
```bash
npm run lint -- --fix
```

**Config:** `eslint.config.mjs`

### Pre-commit Hooks

Automatic checks before commit (via Husky):

```bash
# Automatically runs on git commit
- npm run lint
- npm run format
- npm run test
```

**Setup:**
```bash
npm run prepare
```

## Testing Commands

### Run Unit Tests

Execute all unit tests:

```bash
npm test
```

**Options:**

```bash
# Watch mode (re-run on changes)
npm run test:watch

# Coverage report
npm run test:cov

# Debug tests
npm run test:debug

# Specific file
npm test -- users.service.spec.ts

# Pattern matching
npm test -- --testNamePattern="should create user"
```

**Coverage Report:**
```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   85.23 |    78.45 |   82.11 |   85.67 |
 users                |   92.45 |    85.32 |   90.23 |   93.12 |
  users.service.ts    |   94.23 |    87.45 |   92.34 |   95.23 |
  users.resolver.ts   |   90.12 |    82.34 |   88.56 |   90.87 |
----------------------|---------|----------|---------|---------|
```

### Run E2E Tests

Execute end-to-end tests:

```bash
npm run test:e2e
```

**Pre-requisites:**
```bash
# Build test configuration
npm run pretest:e2e
```

**Test Setup:**
- Uses separate test database
- Starts test server
- Executes GraphQL queries
- Cleans up after tests

**Example E2E Test:**
```typescript
describe('GraphQL Gateway (e2e)', () => {
  it('should create a user', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            createUser(createUserInput: {
              username: "test"
              email: "test@example.com"
              password: "password123"
            }) {
              id
              username
            }
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.createUser).toBeDefined();
        expect(res.body.data.createUser.username).toBe('test');
      });
  });
});
```

### Test Configuration

**jest.config.js (Unit Tests):**
```json
{
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "testEnvironment": "node"
}
```

**jest-e2e.json (E2E Tests):**
```json
{
  "rootDir": ".",
  "testRegex": ".e2e-spec.ts$",
  "testEnvironment": "node"
}
```

## Utility Commands

### Check Dependencies

Check for outdated dependencies:

```bash
npm outdated
```

**Update:**
```bash
npm update
```

**Update to latest (careful!):**
```bash
npx npm-check-updates -u
npm install
```

### Security Audit

Check for security vulnerabilities:

```bash
npm audit
```

**Fix automatically:**
```bash
npm audit fix
```

**Force fix (may cause breaking changes):**
```bash
npm audit fix --force
```

### Generate NestJS Resources

Generate boilerplate code using NestJS CLI:

```bash
# Generate module
nest generate module products

# Generate controller
nest generate controller products

# Generate service
nest generate service products

# Generate complete resource (REST)
nest generate resource products

# Generate GraphQL resolver
nest generate resolver products
```

**Options:**
```bash
--no-spec              # Skip test file generation
--dry-run              # Preview without creating files
--flat                 # Don't create directory
```

### TypeScript Compilation

Check TypeScript errors without building:

```bash
npx tsc --noEmit
```

### Generate GraphQL Schema

Generate schema.json from code:

```bash
npm run build
# Schema is automatically generated during build
```

**Output:** `schema.json`

## Environment-Specific Commands

### Development

```bash
# Start dev server
npm run start:dev

# Run tests in watch mode
npm run test:watch

# Enable all debugging
NODE_ENV=development GRAPHQL_PLAYGROUND=true npm run start:dev
```

### Production

```bash
# Build
npm run build

# Run migrations
npm run migration:run

# Start production server
NODE_ENV=production npm run start:prod
```

### Testing

```bash
# Set test environment
NODE_ENV=test npm test

# E2E tests
NODE_ENV=test npm run test:e2e

# Coverage
NODE_ENV=test npm run test:cov
```

## Docker Commands

### Build Image

```bash
docker build -t nest-gatewayql:latest .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=host.docker.internal \
  nest-gatewayql:latest
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f gateway

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

## Troubleshooting

### Command Not Found

```bash
# Ensure dependencies are installed
npm install

# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Permission Errors

```bash
# Fix permissions (Unix)
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER node_modules

# Use nvm (recommended)
# Avoids permission issues
```

### Port Already in Use

```bash
# Find and kill process (Unix)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Migration Errors

```bash
# Reset migrations (development only!)
npm run typeorm -- schema:drop -d src/data-source.ts
npm run migration:run

# Check migration status
npm run migration:show

# Revert and re-run
npm run migration:revert
npm run migration:run
```

## Best Practices

1. **Always run migrations** before starting production
2. **Use npm scripts** instead of direct commands
3. **Test before deploying** with `npm run test && npm run test:e2e`
4. **Keep migrations small** and focused
5. **Never skip tests** in CI/CD
6. **Use environment variables** for configuration
7. **Run security audits** regularly
8. **Keep dependencies updated** but test changes

## Next Steps

- [Configuration](../configuration/) - Configure CLI behavior
- [Policies](../policies/) - Manage policies via code
- [Consumer Management](../consumer-management/) - Manage users
- [Deployment](../deployment/) - Deploy to production

## Additional Resources

- [NestJS CLI Documentation](https://docs.nestjs.com/cli/overview)
- [TypeORM CLI Documentation](https://typeorm.io/migrations)
- [Jest CLI Documentation](https://jestjs.io/docs/cli)
- [npm Scripts Documentation](https://docs.npmjs.com/cli/v9/using-npm/scripts)
