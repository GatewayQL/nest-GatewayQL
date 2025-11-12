import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose } from '@apollo/gateway';
import { ProductsModule } from '../../services/products-service/src/products/products.module';
import { ReviewsModule } from '../../services/reviews-service/src/reviews/reviews.module';
import { Product } from '../../services/products-service/src/products/entities/product.entity';
import { Review } from '../../services/reviews-service/src/reviews/entities/review.entity';
import { getTestDbConfig, gqlRequest } from './test-helpers';

// Integration test scenario builder
export class FederationTestScenario {
  private products: any[] = [];
  private reviews: any[] = [];
  private productsGql: ReturnType<typeof gqlRequest>;
  private reviewsGql: ReturnType<typeof gqlRequest>;
  private gatewayGql: ReturnType<typeof gqlRequest>;

  constructor(
    private productsApp: INestApplication,
    private reviewsApp: INestApplication,
    private gatewayApp: INestApplication
  ) {
    this.productsGql = gqlRequest(productsApp);
    this.reviewsGql = gqlRequest(reviewsApp);
    this.gatewayGql = gqlRequest(gatewayApp);
  }

  // Scenario builders
  async withProducts(productData: Array<{ name: string; price: number; category: string }>): Promise<this> {
    for (const data of productData) {
      const response = await this.productsGql(`
        mutation CreateProduct($input: CreateProductInput!) {
          createProduct(createProductInput: $input) {
            id
            name
            price
            category
          }
        }
      `, { input: data });

      if (response.body.data) {
        this.products.push(response.body.data.createProduct);
      } else {
        throw new Error(`Failed to create product: ${JSON.stringify(response.body.errors)}`);
      }
    }

    return this;
  }

  async withReviews(
    reviewData: Array<{
      productIndex?: number;
      productId?: string;
      rating: number;
      comment: string;
      reviewerName?: string;
    }>
  ): Promise<this> {
    for (const data of reviewData) {
      const productId = data.productId || this.products[data.productIndex || 0]?.id;
      if (!productId) {
        throw new Error('No product ID available for review');
      }

      const input = {
        productId,
        rating: data.rating,
        comment: data.comment,
        ...(data.reviewerName && { reviewerName: data.reviewerName }),
      };

      const response = await this.reviewsGql(`
        mutation CreateReview($input: CreateReviewInput!) {
          createReview(createReviewInput: $input) {
            id
            productId
            rating
            comment
            reviewerName
          }
        }
      `, { input });

      if (response.body.data) {
        this.reviews.push(response.body.data.createReview);
      } else {
        throw new Error(`Failed to create review: ${JSON.stringify(response.body.errors)}`);
      }
    }

    return this;
  }

  // Query methods
  async queryProductsWithReviews(productIndex?: number) {
    if (productIndex !== undefined) {
      const product = this.products[productIndex];
      if (!product) {
        throw new Error(`Product at index ${productIndex} not found`);
      }

      return await this.gatewayGql(`
        query GetProductWithReviews($id: ID!) {
          product(id: $id) {
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
      `, { id: product.id });
    }

    return await this.gatewayGql(`
      query GetAllProductsWithReviews {
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
  }

  async queryReviewsByProduct(productIndex: number) {
    const product = this.products[productIndex];
    if (!product) {
      throw new Error(`Product at index ${productIndex} not found`);
    }

    return await this.gatewayGql(`
      query GetReviewsByProduct($productId: String!) {
        reviewsByProduct(productId: $productId) {
          id
          rating
          comment
          reviewerName
        }
      }
    `, { productId: product.id });
  }

  async queryCrossServiceData() {
    return await this.gatewayGql(`
      query GetCrossServiceData {
        products {
          id
          name
          price
        }
        reviews {
          id
          rating
          comment
        }
      }
    `);
  }

  // Getters for test data
  getProducts() {
    return [...this.products];
  }

  getReviews() {
    return [...this.reviews];
  }

  getProduct(index: number) {
    return this.products[index];
  }

  getReview(index: number) {
    return this.reviews[index];
  }
}

// Federation test suite factory
export class FederationTestSuite {
  private productsApp: INestApplication;
  private reviewsApp: INestApplication;
  private gatewayApp: INestApplication;

  async setup(): Promise<void> {
    // Create Products service
    const productsModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...getTestDbConfig('products_integration_test'),
          entities: [Product],
        }),
        GraphQLModule.forRoot<ApolloFederationDriverConfig>({
          driver: ApolloFederationDriver,
          autoSchemaFile: { federation: 2 },
        }),
        ProductsModule,
      ],
    }).compile();

    this.productsApp = productsModule.createNestApplication();
    await this.productsApp.listen(4101); // Different port for integration tests

    // Create Reviews service
    const reviewsModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...getTestDbConfig('reviews_integration_test'),
          entities: [Review],
        }),
        GraphQLModule.forRoot<ApolloFederationDriverConfig>({
          driver: ApolloFederationDriver,
          autoSchemaFile: { federation: 2 },
        }),
        ReviewsModule,
      ],
    }).compile();

    this.reviewsApp = reviewsModule.createNestApplication();
    await this.reviewsApp.listen(4102);

    // Wait for services to be ready
    await this.waitForService('http://localhost:4101/graphql');
    await this.waitForService('http://localhost:4102/graphql');

    // Create Gateway service
    const gatewayModule = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
          driver: ApolloGatewayDriver,
          gateway: {
            supergraphSdl: new IntrospectAndCompose({
              subgraphs: [
                { name: 'products', url: 'http://localhost:4101/graphql' },
                { name: 'reviews', url: 'http://localhost:4102/graphql' },
              ],
            }),
          },
        }),
      ],
    }).compile();

    this.gatewayApp = gatewayModule.createNestApplication();
    await this.gatewayApp.init();

    // Allow some time for federation to compose
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async teardown(): Promise<void> {
    await this.gatewayApp?.close();
    await this.reviewsApp?.close();
    await this.productsApp?.close();
  }

  createScenario(): FederationTestScenario {
    return new FederationTestScenario(
      this.productsApp,
      this.reviewsApp,
      this.gatewayApp
    );
  }

  private async waitForService(url: string, maxRetries = 15): Promise<void> {
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
            return;
          }
        }
      } catch (error) {
        // Service not ready
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Service at ${url} not ready after ${maxRetries} attempts`);
  }
}

// Common test scenarios
export const TEST_SCENARIOS = {
  // E-commerce store scenario
  ecommerce: {
    products: [
      { name: 'Gaming Laptop', price: 1299.99, category: 'Electronics' },
      { name: 'Wireless Mouse', price: 29.99, category: 'Electronics' },
      { name: 'Standing Desk', price: 299.99, category: 'Furniture' },
    ],
    reviews: [
      { productIndex: 0, rating: 5, comment: 'Amazing performance!', reviewerName: 'GamePro' },
      { productIndex: 0, rating: 4, comment: 'Good value', reviewerName: 'TechUser' },
      { productIndex: 1, rating: 5, comment: 'Perfect for gaming', reviewerName: 'Gamer123' },
      { productIndex: 2, rating: 3, comment: 'Assembly was difficult', reviewerName: 'OfficeWorker' },
    ],
  },

  // Multi-category scenario
  diverse: {
    products: [
      { name: 'Coffee Machine', price: 199.99, category: 'Kitchen' },
      { name: 'Running Shoes', price: 89.99, category: 'Sports' },
      { name: 'Smartphone', price: 699.99, category: 'Electronics' },
      { name: 'Yoga Mat', price: 25.99, category: 'Sports' },
    ],
    reviews: [
      { productIndex: 0, rating: 4, comment: 'Great coffee!', reviewerName: 'CoffeeAddict' },
      { productIndex: 1, rating: 5, comment: 'Very comfortable' },
      { productIndex: 2, rating: 4, comment: 'Fast and reliable', reviewerName: 'TechEnthusiast' },
      { productIndex: 3, rating: 5, comment: 'Perfect for workouts' },
      { productIndex: 0, rating: 3, comment: 'Bit noisy' },
    ],
  },

  // Performance testing scenario
  performance: {
    products: Array.from({ length: 20 }, (_, i) => ({
      name: `Performance Product ${i + 1}`,
      price: Math.round((Math.random() * 500 + 50) * 100) / 100,
      category: ['Electronics', 'Home', 'Sports', 'Books'][i % 4],
    })),
    reviews: Array.from({ length: 50 }, (_, i) => ({
      productIndex: i % 20,
      rating: Math.floor(Math.random() * 5) + 1,
      comment: `Performance review ${i + 1} - ${['Excellent', 'Good', 'Average', 'Poor'][Math.floor(Math.random() * 4)]}`,
      reviewerName: `Reviewer${i + 1}`,
    })),
  },
};

// Test assertions
export const FEDERATION_ASSERTIONS = {
  expectProductWithReviews: (product: any, expectedReviewCount: number) => {
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('category');
    expect(product).toHaveProperty('reviews');
    expect(product.reviews).toHaveLength(expectedReviewCount);

    product.reviews.forEach((review: any) => {
      expect(review).toHaveProperty('id');
      expect(review).toHaveProperty('rating');
      expect(review).toHaveProperty('comment');
      expect(review.rating).toBeGreaterThanOrEqual(1);
      expect(review.rating).toBeLessThanOrEqual(5);
    });
  },

  expectFederatedQuery: (data: any) => {
    expect(data).not.toHaveProperty('errors');
    expect(data).toHaveProperty('data');
    return data.data;
  },

  expectCrossServiceData: (data: any) => {
    expect(data.products).toBeDefined();
    expect(data.reviews).toBeDefined();
    expect(Array.isArray(data.products)).toBe(true);
    expect(Array.isArray(data.reviews)).toBe(true);
  },
};