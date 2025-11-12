import { execSync, spawn, ChildProcess } from 'child_process';
import { join } from 'path';

export interface DockerService {
  name: string;
  port: number;
  healthCheck?: string;
}

export interface DockerTestEnvironment {
  services: DockerService[];
  composeFile: string;
  projectName: string;
}

// Docker management for E2E tests
export class DockerTestManager {
  private environment: DockerTestEnvironment;
  private isRunning = false;
  private processes: ChildProcess[] = [];

  constructor(environment: DockerTestEnvironment) {
    this.environment = environment;
  }

  async startServices(): Promise<void> {
    if (this.isRunning) {
      console.log('Services already running');
      return;
    }

    console.log('🚀 Starting Docker services for E2E tests...');

    try {
      // Stop any existing services
      await this.stopServices();

      // Start services in detached mode
      const examplesDir = join(__dirname, '../..');
      execSync(
        `docker-compose -p ${this.environment.projectName} -f ${this.environment.composeFile} up -d`,
        {
          cwd: examplesDir,
          stdio: 'inherit',
        }
      );

      // Wait for services to be healthy
      await this.waitForServices();

      this.isRunning = true;
      console.log('✅ All services are running and healthy');
    } catch (error) {
      console.error('Failed to start services:', error);
      throw error;
    }
  }

  async stopServices(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Docker services...');

    try {
      const examplesDir = join(__dirname, '../..');
      execSync(
        `docker-compose -p ${this.environment.projectName} -f ${this.environment.composeFile} down`,
        {
          cwd: examplesDir,
          stdio: 'pipe', // Suppress output
        }
      );

      this.isRunning = false;
      console.log('✅ Services stopped');
    } catch (error) {
      console.error('Failed to stop services:', error);
      // Don't throw - cleanup should be forgiving
    }
  }

  async cleanupServices(): Promise<void> {
    console.log('🧹 Cleaning up Docker services and volumes...');

    try {
      const examplesDir = join(__dirname, '../..');
      execSync(
        `docker-compose -p ${this.environment.projectName} -f ${this.environment.composeFile} down -v`,
        {
          cwd: examplesDir,
          stdio: 'pipe',
        }
      );

      console.log('✅ Services and volumes cleaned up');
    } catch (error) {
      console.error('Failed to cleanup services:', error);
    }
  }

  private async waitForServices(): Promise<void> {
    console.log('⏳ Waiting for services to be ready...');

    const maxRetries = 60; // 2 minutes
    const retryInterval = 2000; // 2 seconds

    for (const service of this.environment.services) {
      console.log(`Checking ${service.name} on port ${service.port}...`);

      let retries = 0;
      let isReady = false;

      while (retries < maxRetries && !isReady) {
        try {
          if (service.healthCheck) {
            // Custom health check
            const response = await fetch(service.healthCheck);
            isReady = response.ok;
          } else {
            // Default port check
            const response = await fetch(`http://localhost:${service.port}`);
            isReady = response.status < 500; // Accept any response that's not a server error
          }
        } catch (error) {
          // Service not ready yet
        }

        if (!isReady) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, retryInterval));
        }
      }

      if (!isReady) {
        throw new Error(`Service ${service.name} failed to become ready after ${maxRetries * retryInterval / 1000} seconds`);
      }

      console.log(`✅ ${service.name} is ready`);
    }
  }

  async getLogs(serviceName: string): Promise<string> {
    try {
      const examplesDir = join(__dirname, '../..');
      const logs = execSync(
        `docker-compose -p ${this.environment.projectName} -f ${this.environment.composeFile} logs ${serviceName}`,
        {
          cwd: examplesDir,
          encoding: 'utf8',
        }
      );
      return logs;
    } catch (error) {
      console.error(`Failed to get logs for ${serviceName}:`, error);
      return '';
    }
  }

  async isServiceHealthy(serviceName: string): Promise<boolean> {
    try {
      const result = execSync(
        `docker inspect --format='{{.State.Health.Status}}' ${this.environment.projectName}_${serviceName}_1`,
        { encoding: 'utf8' }
      );
      return result.trim() === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

// Pre-configured environments
export const FEDERATION_TEST_ENVIRONMENT: DockerTestEnvironment = {
  projectName: 'federation-e2e',
  composeFile: 'docker-compose.federation.yml',
  services: [
    {
      name: 'federation_postgres',
      port: 5433,
      healthCheck: undefined, // Will use port check
    },
    {
      name: 'products_service',
      port: 4001,
      healthCheck: 'http://localhost:4001/graphql',
    },
    {
      name: 'reviews_service',
      port: 4002,
      healthCheck: 'http://localhost:4002/graphql',
    },
    {
      name: 'gateway_service',
      port: 3000,
      healthCheck: 'http://localhost:3000/health',
    },
  ],
};

// Database utilities
export async function waitForDatabase(
  host = 'localhost',
  port = 5433,
  database = 'postgres',
  username = 'postgres',
  password = 'postgres',
  maxRetries = 30
): Promise<void> {
  console.log(`Waiting for PostgreSQL at ${host}:${port}...`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try to connect using pg_isready
      execSync(
        `docker exec federation-e2e_federation_postgres_1 pg_isready -h ${host} -p 5432 -U ${username}`,
        { stdio: 'pipe' }
      );
      console.log('✅ PostgreSQL is ready');
      return;
    } catch (error) {
      console.log(`PostgreSQL not ready, retrying... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error(`PostgreSQL failed to become ready after ${maxRetries} attempts`);
}

// Service discovery utilities
export function getServiceUrl(serviceName: string, port: number, path = ''): string {
  return `http://localhost:${port}${path}`;
}

export async function waitForGraphQLService(url: string, maxRetries = 30): Promise<void> {
  console.log(`Waiting for GraphQL service at ${url}...`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __schema { queryType { name } } }' }),
      });

      if (response.ok) {
        const result = await response.json();
        if (!result.errors) {
          console.log(`✅ GraphQL service at ${url} is ready`);
          return;
        }
      }
    } catch (error) {
      // Service not ready
    }

    console.log(`GraphQL service not ready, retrying... (${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error(`GraphQL service at ${url} failed to become ready`);
}

// Test data management
export async function seedTestData(serviceUrl: string): Promise<void> {
  console.log(`Seeding test data for ${serviceUrl}...`);

  try {
    // Try to seed products
    if (serviceUrl.includes('4001')) {
      const response = await fetch(`${serviceUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mutation { seedProducts { id name } }',
        }),
      });

      if (response.ok) {
        console.log('✅ Products seeded');
      }
    }

    // Try to seed reviews
    if (serviceUrl.includes('4002')) {
      const response = await fetch(`${serviceUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mutation { seedReviews { id productId } }',
        }),
      });

      if (response.ok) {
        console.log('✅ Reviews seeded');
      }
    }
  } catch (error) {
    console.warn(`Failed to seed data for ${serviceUrl}:`, error);
  }
}

// Global setup helpers for Jest
export async function globalSetup(): Promise<void> {
  console.log('🚀 Setting up global E2E test environment...');

  const manager = new DockerTestManager(FEDERATION_TEST_ENVIRONMENT);
  await manager.startServices();

  // Store manager instance for global teardown
  (global as any).dockerManager = manager;
}

export async function globalTeardown(): Promise<void> {
  console.log('🧹 Tearing down global E2E test environment...');

  const manager = (global as any).dockerManager as DockerTestManager;
  if (manager) {
    await manager.stopServices();
  }
}