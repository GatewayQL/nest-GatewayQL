import { execSync } from 'child_process';
import { join } from 'path';

// Global test configuration
jest.setTimeout(120000); // 2 minutes for E2E tests

// Test environment setup
beforeAll(async () => {
  console.log('🚀 Setting up E2E test environment...');

  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5433'; // Use federation postgres port

  // Ensure test databases exist
  console.log('📊 Preparing test databases...');

  try {
    // Check if federation postgres is running
    execSync('docker ps | grep federation_postgres', { stdio: 'pipe' });
    console.log('✅ Federation PostgreSQL is running');
  } catch (error) {
    console.log('⚠️  Federation PostgreSQL not running, starting minimal setup...');

    // Start only postgres for testing
    const examplesDir = join(__dirname, '../..');
    execSync('docker-compose -f docker-compose.federation.yml up -d federation_postgres', {
      cwd: examplesDir,
      stdio: 'inherit'
    });

    // Wait for postgres to be ready
    console.log('⏳ Waiting for PostgreSQL to be ready...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');

  // Optional: Stop test services if they were started by tests
  // Uncomment if you want automatic cleanup
  // const examplesDir = join(__dirname, '../..');
  // execSync('docker-compose -f docker-compose.federation.yml down', {
  //   cwd: examplesDir,
  //   stdio: 'inherit'
  // });
});