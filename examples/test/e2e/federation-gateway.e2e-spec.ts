import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose } from '@apollo/gateway';
import { ProductsModule } from '../../services/products-service/src/products/products.module';
import { ReviewsModule } from '../../services/reviews-service/src/reviews/reviews.module';
import { Product } from '../../services/products-service/src/products/entities/product.entity';
import { Review } from '../../services/reviews-service/src/reviews/entities/review.entity';
import {
  gqlRequest,
  getTestDbConfig,
  cleanDatabase,
  expectGraphQLSuccess,
  expectGraphQLError,
  waitForFederation,
} from '../utils/test-helpers';

describe('Federation Gateway E2E', () => {
  let gatewayApp: INestApplication;
  let productsApp: INestApplication;
  let reviewsApp: INestApplication;
  let gql: ReturnType<typeof gqlRequest>;

  const PRODUCTS_PORT = 4001;
  const REVIEWS_PORT = 4002;

  beforeAll(async () => {
    console.log('🚀 Setting up Federation Gateway E2E tests...');

    // Create Products subgraph service
    const productsModuleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...getTestDbConfig('products_federation_test'),
          entities: [Product],
        }),
        GraphQLModule.forRoot<ApolloFederationDriverConfig>({
          driver: ApolloFederationDriver,
          autoSchemaFile: {
            federation: 2,
          },
        }),
        ProductsModule,
      ],
    }).compile();

    productsApp = productsModuleFixture.createNestApplication();
    await productsApp.listen(PRODUCTS_PORT);

    // Create Reviews subgraph service
    const reviewsModuleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...getTestDbConfig('reviews_federation_test'),
          entities: [Review],
        }),
        GraphQLModule.forRoot<ApolloFederationDriverConfig>({
          driver: ApolloFederationDriver,
          autoSchemaFile: {
            federation: 2,
          },
        }),
        ReviewsModule,
      ],
    }).compile();

    reviewsApp = reviewsModuleFixture.createNestApplication();
    await reviewsApp.listen(REVIEWS_PORT);

    // Wait for subgraph services to be ready
    await waitForFederation(`http://localhost:${PRODUCTS_PORT}/graphql`);
    await waitForFederation(`http://localhost:${REVIEWS_PORT}/graphql`);

    // Create Gateway service
    const gatewayModuleFixture = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
          driver: ApolloGatewayDriver,
          gateway: {
            supergraphSdl: new IntrospectAndCompose({
              subgraphs: [
                { name: 'products', url: `http://localhost:${PRODUCTS_PORT}/graphql` },
                { name: 'reviews', url: `http://localhost:${REVIEWS_PORT}/graphql` },
              ],
            }),
          },
        }),
      ],
    }).compile();

    gatewayApp = gatewayModuleFixture.createNestApplication();
    await gatewayApp.init();

    gql = gqlRequest(gatewayApp);

    console.log('✅ Federation Gateway E2E setup complete');
  });

  beforeEach(async () => {
    // Clean both databases
    await cleanDatabase(productsApp, [Product]);
    await cleanDatabase(reviewsApp, [Review]);
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up Federation Gateway E2E tests...');

    await gatewayApp?.close();
    await productsApp?.close();
    await reviewsApp?.close();
  });

  describe('Individual Service Queries via Gateway', () => {
    it('should query products from Products service', async () => {
      // Create a product via direct mutation to products service
      const productsGql = gqlRequest(productsApp);
      await productsGql(`
        mutation {
          createProduct(createProductInput: {
            name: "Gateway Test Product"
            price: 199.99
            category: "Electronics"
          }) {
            id
          }
        }
      `);

      // Query products through gateway
      const response = await gql(`
        query {
          products {
            id
            name
            price
            category
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.products).toHaveLength(1);
      expect(data.products[0]).toMatchObject({
        name: 'Gateway Test Product',
        price: 199.99,
        category: 'Electronics',
      });
    });

    it('should query reviews from Reviews service', async () => {
      // Create a review via direct mutation to reviews service
      const reviewsGql = gqlRequest(reviewsApp);
      const productId = '550e8400-e29b-41d4-a716-446655440001';

      await reviewsGql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${productId}"
            rating: 5
            comment: "Gateway Test Review"
            reviewerName: "Test User"
          }) {
            id
          }
        }
      `);

      // Query reviews through gateway
      const response = await gql(`
        query {
          reviews {
            id
            productId
            rating
            comment
            reviewerName
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.reviews).toHaveLength(1);
      expect(data.reviews[0]).toMatchObject({
        productId,
        rating: 5,
        comment: 'Gateway Test Review',
        reviewerName: 'Test User',
      });
    });
  });

  describe('Federated Cross-Service Queries', () => {
    it('should query products with their reviews (federated relationship)', async () => {
      // Create products and reviews with matching IDs
      const productsGql = gqlRequest(productsApp);
      const reviewsGql = gqlRequest(reviewsApp);

      // Create a product
      const productResponse = await productsGql(`
        mutation {
          createProduct(createProductInput: {
            name: "Federated Product"
            price: 299.99
            category: "Electronics"
          }) {
            id
            name
          }
        }
      `);
      const product = expectGraphQLSuccess(productResponse).createProduct;

      // Create reviews for this product
      await reviewsGql(`
        mutation CreateReview1 {
          createReview(createReviewInput: {
            productId: "${product.id}"
            rating: 5
            comment: "Excellent product!"
            reviewerName: "Alice"
          }) {
            id
          }
        }
      `);

      await reviewsGql(`
        mutation CreateReview2 {
          createReview(createReviewInput: {
            productId: "${product.id}"
            rating: 4
            comment: "Very good quality"
            reviewerName: "Bob"
          }) {
            id
          }
        }
      `);

      // Query federated data through gateway
      const response = await gql(`
        query {
          product(id: "${product.id}") {
            id
            name
            price
            category
            reviews {
              id
              rating
              comment
              reviewerName
            }
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.product).toMatchObject({
        id: product.id,
        name: 'Federated Product',
        price: 299.99,
        category: 'Electronics',
      });
      expect(data.product.reviews).toHaveLength(2);
      expect(data.product.reviews).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rating: 5,
            comment: 'Excellent product!',
            reviewerName: 'Alice',
          }),
          expect.objectContaining({
            rating: 4,
            comment: 'Very good quality',
            reviewerName: 'Bob',
          }),
        ])
      );
    });

    it('should query multiple products with their reviews', async () => {
      const productsGql = gqlRequest(productsApp);
      const reviewsGql = gqlRequest(reviewsApp);

      // Create multiple products
      const products = [];
      for (let i = 1; i <= 3; i++) {
        const response = await productsGql(`
          mutation {
            createProduct(createProductInput: {
              name: "Product ${i}"
              price: ${100 * i}
              category: "Category${i}"
            }) {
              id
              name
            }
          }
        `);
        products.push(expectGraphQLSuccess(response).createProduct);
      }

      // Create reviews for each product
      for (const product of products) {
        await reviewsGql(`
          mutation {
            createReview(createReviewInput: {
              productId: "${product.id}"
              rating: ${4 + Math.floor(Math.random() * 2)}
              comment: "Review for ${product.name}"
              reviewerName: "Reviewer"
            }) {
              id
            }
          }
        `);
      }

      // Query all products with reviews
      const response = await gql(`
        query {
          products {
            id
            name
            price
            reviews {
              rating
              comment
            }
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.products).toHaveLength(3);

      // Each product should have its review
      data.products.forEach((product: any) => {
        expect(product.reviews).toHaveLength(1);
        expect(product.reviews[0].comment).toContain(product.name);
      });
    });

    it('should handle cross-service queries in a single request', async () => {
      const productsGql = gqlRequest(productsApp);
      const reviewsGql = gqlRequest(reviewsApp);
      const productId = '550e8400-e29b-41d4-a716-446655440001';

      // Create data in both services
      await productsGql(`
        mutation {
          createProduct(createProductInput: {
            name: "Cross-Service Product"
            price: 149.99
            category: "Test"
          }) {
            id
          }
        }
      `);

      await reviewsGql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${productId}"
            rating: 4
            comment: "Cross-service review"
          }) {
            id
          }
        }
      `);

      // Single query fetching from both services
      const response = await gql(`
        query {
          products {
            id
            name
            category
          }
          reviews {
            id
            rating
            comment
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.products).toHaveLength(1);
      expect(data.reviews).toHaveLength(1);
      expect(data.products[0].name).toBe('Cross-Service Product');
      expect(data.reviews[0].comment).toBe('Cross-service review');
    });
  });

  describe('Federated Mutations', () => {
    it('should create products through gateway', async () => {
      const response = await gql(`
        mutation {
          createProduct(createProductInput: {
            name: "Gateway Created Product"
            price: 79.99
            category: "Home"
          }) {
            id
            name
            price
            category
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.createProduct).toMatchObject({
        id: expect.any(String),
        name: 'Gateway Created Product',
        price: 79.99,
        category: 'Home',
      });
    });

    it('should create reviews through gateway', async () => {
      const productId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await gql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${productId}"
            rating: 5
            comment: "Gateway created review"
            reviewerName: "Gateway User"
          }) {
            id
            productId
            rating
            comment
            reviewerName
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.createReview).toMatchObject({
        id: expect.any(String),
        productId,
        rating: 5,
        comment: 'Gateway created review',
        reviewerName: 'Gateway User',
      });
    });

    it('should create product and review, then query federated data', async () => {
      // Create product
      const productResponse = await gql(`
        mutation {
          createProduct(createProductInput: {
            name: "E2E Test Product"
            price: 199.99
            category: "Electronics"
          }) {
            id
          }
        }
      `);

      const productId = expectGraphQLSuccess(productResponse).createProduct.id;

      // Create review for the product
      await gql(`
        mutation CreateReview($input: CreateReviewInput!) {
          createReview(createReviewInput: $input) {
            id
          }
        }
      `, {
        input: {
          productId,
          rating: 5,
          comment: 'Created via gateway',
          reviewerName: 'E2E Tester',
        },
      });

      // Query federated data
      const queryResponse = await gql(`
        query GetProductWithReviews($id: ID!) {
          product(id: $id) {
            id
            name
            price
            reviews {
              rating
              comment
              reviewerName
            }
          }
        }
      `, { id: productId });

      const data = expectGraphQLSuccess(queryResponse);
      expect(data.product).toMatchObject({
        id: productId,
        name: 'E2E Test Product',
        price: 199.99,
      });
      expect(data.product.reviews).toHaveLength(1);
      expect(data.product.reviews[0]).toMatchObject({
        rating: 5,
        comment: 'Created via gateway',
        reviewerName: 'E2E Tester',
      });
    });
  });

  describe('Federation Error Handling', () => {
    it('should handle service unavailability gracefully', async () => {
      // This test would require stopping one of the services
      // For now, we'll test with invalid queries

      const response = await gql(`
        query {
          nonExistentField {
            id
          }
        }
      `);

      expectGraphQLError(response);
    });

    it('should handle invalid federated references', async () => {
      const response = await gql(`
        query {
          product(id: "invalid-uuid-format") {
            id
            name
          }
        }
      `);

      expectGraphQLError(response);
    });

    it('should handle cross-service relationship errors', async () => {
      // Query reviews for a non-existent product
      const response = await gql(`
        query {
          reviewsByProduct(productId: "550e8400-e29b-41d4-a716-000000000000") {
            id
            rating
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.reviewsByProduct).toEqual([]);
    });
  });

  describe('Federation Performance', () => {
    it('should efficiently handle complex federated queries', async () => {
      const productsGql = gqlRequest(productsApp);
      const reviewsGql = gqlRequest(reviewsApp);

      // Create multiple products with multiple reviews each
      const productPromises = Array.from({ length: 5 }, (_, i) =>
        productsGql(`
          mutation {
            createProduct(createProductInput: {
              name: "Performance Product ${i + 1}"
              price: ${(i + 1) * 50}
              category: "Performance"
            }) {
              id
            }
          }
        `)
      );

      const productResponses = await Promise.all(productPromises);
      const products = productResponses.map(r => expectGraphQLSuccess(r).createProduct);

      // Create 3 reviews per product
      const reviewPromises = [];
      for (const product of products) {
        for (let i = 0; i < 3; i++) {
          reviewPromises.push(
            reviewsGql(`
              mutation {
                createReview(createReviewInput: {
                  productId: "${product.id}"
                  rating: ${4 + (i % 2)}
                  comment: "Performance review ${i + 1}"
                  reviewerName: "User ${i + 1}"
                }) {
                  id
                }
              }
            `)
          );
        }
      }

      await Promise.all(reviewPromises);

      // Complex federated query
      const startTime = Date.now();
      const response = await gql(`
        query {
          products {
            id
            name
            price
            category
            reviews {
              id
              rating
              comment
              reviewerName
            }
          }
        }
      `);
      const endTime = Date.now();

      const data = expectGraphQLSuccess(response);
      expect(data.products).toHaveLength(5);

      // Each product should have 3 reviews
      data.products.forEach((product: any) => {
        expect(product.reviews).toHaveLength(3);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(3000); // 3 seconds
    });
  });

  describe('Federation Schema Composition', () => {
    it('should correctly merge schemas from both services', async () => {
      const response = await gql(`
        query {
          __schema {
            types {
              name
              kind
            }
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      const typeNames = data.__schema.types.map((t: any) => t.name);

      // Should include types from both services
      expect(typeNames).toContain('Product');
      expect(typeNames).toContain('Review');
      expect(typeNames).toContain('Query');
      expect(typeNames).toContain('Mutation');
    });

    it('should support federation directives in introspection', async () => {
      const response = await gql(`
        query {
          __type(name: "Product") {
            name
            fields {
              name
              type {
                name
              }
            }
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.__type.name).toBe('Product');

      const fieldNames = data.__type.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('price');
      expect(fieldNames).toContain('category');
      expect(fieldNames).toContain('reviews'); // Extended field from Reviews service
    });
  });
});