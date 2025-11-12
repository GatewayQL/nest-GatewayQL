import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose } from '@apollo/gateway';
import request from 'supertest';

// Test database configuration
export const getTestDbConfig = (database: string) => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5433,
  username: 'postgres',
  password: 'postgres',
  database,
  synchronize: true, // Only for tests
  dropSchema: true, // Clean slate for each test
  logging: false,
});

// GraphQL request helper
export const gqlRequest = (app: INestApplication) => {
  return (query: string, variables?: any) => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query,
        variables,
      })
      .expect('Content-Type', /json/);
  };
};

// Wait for service to be ready
export const waitForService = async (url: string, timeout = 30000): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Service at ${url} not ready after ${timeout}ms`);
};

// Create federation subgraph service
export const createSubgraphService = async (
  moduleClass: any,
  entities: any[],
  database: string,
  port?: number
): Promise<INestApplication> => {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        ...getTestDbConfig(database),
        entities,
      }),
      GraphQLModule.forRoot<ApolloFederationDriverConfig>({
        driver: ApolloFederationDriver,
        autoSchemaFile: {
          federation: 2,
        },
      }),
      moduleClass,
    ],
  });

  const module: TestingModule = await moduleBuilder.compile();
  const app = module.createNestApplication();

  if (port) {
    await app.listen(port);
  }

  return app;
};

// Create gateway service
export const createGatewayService = async (
  subgraphs: { name: string; url: string }[]
): Promise<INestApplication> => {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
        driver: ApolloGatewayDriver,
        gateway: {
          supergraphSdl: new IntrospectAndCompose({
            subgraphs,
          }),
        },
      }),
    ],
  });

  const module: TestingModule = await moduleBuilder.compile();
  const app = module.createNestApplication();

  return app;
};

// Sample test data
export const sampleProducts = [
  {
    name: 'Test Laptop',
    price: 999.99,
    category: 'Electronics',
  },
  {
    name: 'Test Coffee Maker',
    price: 79.99,
    category: 'Home',
  },
  {
    name: 'Test Chair',
    price: 199.99,
    category: 'Furniture',
  },
];

export const sampleReviews = [
  {
    rating: 5,
    comment: 'Excellent product!',
    reviewerName: 'John Doe',
  },
  {
    rating: 4,
    comment: 'Good value for money',
    reviewerName: 'Jane Smith',
  },
  {
    rating: 3,
    comment: 'Average quality',
    reviewerName: 'Bob Wilson',
  },
];

// Clean database helper
export const cleanDatabase = async (app: INestApplication, entities: any[]) => {
  try {
    // Try to get DataSource (TypeORM 0.3+)
    const dataSource = app.get('DataSource');

    for (const entity of entities.reverse()) {
      const repository = dataSource.getRepository(entity);
      await repository.clear();
    }
  } catch (error) {
    try {
      // Fallback: Try to get Connection (TypeORM 0.2)
      const connection = app.get('Connection');

      for (const entity of entities.reverse()) {
        const repository = connection.getRepository(entity);
        await repository.clear();
      }
    } catch (secondError) {
      // Alternative approach: use getRepository directly
      const { DataSource } = await import('typeorm');
      const dataSource = app.get(DataSource);

      for (const entity of entities.reverse()) {
        const repository = dataSource.getRepository(entity);
        await repository.clear();
      }
    }
  }
};

// Assert GraphQL response structure
export const expectGraphQLSuccess = (response: any) => {
  expect(response.body).toHaveProperty('data');
  expect(response.body).not.toHaveProperty('errors');
  return response.body.data;
};

export const expectGraphQLError = (response: any) => {
  expect(response.body).toHaveProperty('errors');
  expect(response.body.errors).toBeInstanceOf(Array);
  expect(response.body.errors.length).toBeGreaterThan(0);
  return response.body.errors;
};

// Federation-specific helpers
export const waitForFederation = async (gatewayUrl: string, timeout = 30000) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __schema { types { name } } }' }),
      });

      if (response.ok) {
        const result = await response.json();
        if (!result.errors) {
          return true;
        }
      }
    } catch (error) {
      // Gateway not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error(`Federation gateway not ready after ${timeout}ms`);
};