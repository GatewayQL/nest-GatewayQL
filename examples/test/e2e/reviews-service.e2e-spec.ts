import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ReviewsService } from '../../services/reviews-service/src/reviews/reviews.service';
import { Review } from '../../services/reviews-service/src/reviews/entities/review.entity';
import { CreateReviewInput } from '../../services/reviews-service/src/reviews/dto/create-review.input';
import {
  gqlRequest,
  getTestDbConfig,
  cleanDatabase,
  expectGraphQLSuccess,
  expectGraphQLError,
  sampleReviews,
} from '../utils/test-helpers';

// Test-only resolver without federation decorators
@Resolver(() => Review)
class TestReviewsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Mutation(() => Review)
  createReview(@Args('createReviewInput') createReviewInput: CreateReviewInput) {
    return this.reviewsService.create(createReviewInput);
  }

  @Query(() => [Review], { name: 'reviews' })
  findAll() {
    return this.reviewsService.findAll();
  }

  @Query(() => Review, { name: 'review', nullable: true })
  findOne(@Args('id', { type: () => ID }) id: string) {
    try {
      return this.reviewsService.findOne(id);
    } catch {
      return null;
    }
  }

  @Query(() => [Review], { name: 'reviewsByProduct' })
  findByProduct(@Args('productId') productId: string) {
    return this.reviewsService.findByProductId(productId);
  }

  @Mutation(() => Boolean)
  removeReview(@Args('id', { type: () => ID }) id: string) {
    return this.reviewsService.remove(id);
  }

  @Mutation(() => [Review])
  seedReviews() {
    return this.reviewsService.seed();
  }
}

describe('Reviews Service E2E', () => {
  let app: INestApplication;
  let gql: ReturnType<typeof gqlRequest>;
  let testProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...getTestDbConfig('reviews_service_test'),
          entities: [Review],
        }),
        TypeOrmModule.forFeature([Review]),
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
        }),
      ],
      providers: [TestReviewsResolver, ReviewsService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    gql = gqlRequest(app);

    // Generate a test product ID (in real scenario this would come from Products service)
    testProductId = '550e8400-e29b-41d4-a716-446655440001';
  });

  beforeEach(async () => {
    await cleanDatabase(app, [Review]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Review Queries', () => {
    it('should return empty array when no reviews exist', async () => {
      const response = await gql(`
        query {
          reviews {
            id
            productId
            rating
            comment
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.reviews).toEqual([]);
    });

    it('should return all reviews', async () => {
      // Create test reviews
      const createdReviews = [];
      for (const review of sampleReviews) {
        const response = await gql(`
          mutation CreateReview($input: CreateReviewInput!) {
            createReview(createReviewInput: $input) {
              id
              productId
              rating
              comment
              reviewerName
              createdAt
              updatedAt
            }
          }
        `, {
          input: {
            productId: testProductId,
            ...review,
          },
        });

        const data = expectGraphQLSuccess(response);
        createdReviews.push(data.createReview);
      }

      // Query all reviews
      const response = await gql(`
        query {
          reviews {
            id
            productId
            rating
            comment
            reviewerName
            createdAt
            updatedAt
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.reviews).toHaveLength(3);
      expect(data.reviews[0]).toMatchObject({
        productId: testProductId,
        rating: expect.any(Number),
        comment: expect.any(String),
      });
    });

    it('should return a specific review by ID', async () => {
      // Create a test review
      const createResponse = await gql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${testProductId}"
            rating: 5
            comment: "Test Review"
            reviewerName: "Test User"
          }) {
            id
            productId
            rating
            comment
            reviewerName
          }
        }
      `);

      const createdReview = expectGraphQLSuccess(createResponse).createReview;

      // Query the specific review
      const response = await gql(`
        query GetReview($id: ID!) {
          review(id: $id) {
            id
            productId
            rating
            comment
            reviewerName
          }
        }
      `, { id: createdReview.id });

      const data = expectGraphQLSuccess(response);
      expect(data.review).toMatchObject({
        id: createdReview.id,
        productId: testProductId,
        rating: 5,
        comment: 'Test Review',
        reviewerName: 'Test User',
      });
    });

    it('should return reviews by product ID', async () => {
      const anotherProductId = '550e8400-e29b-41d4-a716-446655440002';

      // Create reviews for different products
      await gql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${testProductId}"
            rating: 5
            comment: "Review for product 1"
          }) {
            id
          }
        }
      `);

      await gql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${testProductId}"
            rating: 4
            comment: "Another review for product 1"
          }) {
            id
          }
        }
      `);

      await gql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${anotherProductId}"
            rating: 3
            comment: "Review for product 2"
          }) {
            id
          }
        }
      `);

      // Query reviews for specific product
      const response = await gql(`
        query ReviewsByProduct($productId: String!) {
          reviewsByProduct(productId: $productId) {
            id
            productId
            rating
            comment
          }
        }
      `, { productId: testProductId });

      const data = expectGraphQLSuccess(response);
      expect(data.reviewsByProduct).toHaveLength(2);
      data.reviewsByProduct.forEach((review: any) => {
        expect(review.productId).toBe(testProductId);
      });
    });
  });

  describe('Review Mutations', () => {
    it('should create a new review', async () => {
      const reviewInput = {
        productId: testProductId,
        rating: 4,
        comment: 'Great product, would recommend!',
        reviewerName: 'Jane Doe',
      };

      const response = await gql(`
        mutation CreateReview($input: CreateReviewInput!) {
          createReview(createReviewInput: $input) {
            id
            productId
            rating
            comment
            reviewerName
            createdAt
            updatedAt
          }
        }
      `, { input: reviewInput });

      const data = expectGraphQLSuccess(response);
      expect(data.createReview).toMatchObject({
        id: expect.any(String),
        productId: reviewInput.productId,
        rating: reviewInput.rating,
        comment: reviewInput.comment,
        reviewerName: reviewInput.reviewerName,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should validate review input', async () => {
      const invalidInputs = [
        {
          productId: '', // Empty product ID
          rating: 5,
          comment: 'Test',
        },
        {
          productId: testProductId,
          rating: 6, // Invalid rating (should be 1-5)
          comment: 'Test',
        },
        {
          productId: testProductId,
          rating: 0, // Invalid rating (should be 1-5)
          comment: 'Test',
        },
        {
          productId: testProductId,
          rating: 5,
          comment: '', // Empty comment
        },
      ];

      for (const input of invalidInputs) {
        const response = await gql(`
          mutation CreateReview($input: CreateReviewInput!) {
            createReview(createReviewInput: $input) {
              id
            }
          }
        `, { input });

        expectGraphQLError(response);
      }
    });

    it('should remove a review', async () => {
      // Create a review first
      const createResponse = await gql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${testProductId}"
            rating: 3
            comment: "Review to delete"
          }) {
            id
          }
        }
      `);

      const reviewId = expectGraphQLSuccess(createResponse).createReview.id;

      // Remove the review
      const removeResponse = await gql(`
        mutation RemoveReview($id: ID!) {
          removeReview(id: $id)
        }
      `, { id: reviewId });

      const data = expectGraphQLSuccess(removeResponse);
      expect(data.removeReview).toBe(true);

      // Verify review is gone
      const queryResponse = await gql(`
        query GetReview($id: ID!) {
          review(id: $id) {
            id
          }
        }
      `, { id: reviewId });

      const queryData = expectGraphQLSuccess(queryResponse);
      expect(queryData.review).toBeNull();
    });

    it('should seed sample reviews', async () => {
      const response = await gql(`
        mutation {
          seedReviews {
            id
            productId
            rating
            comment
            reviewerName
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.seedReviews).toHaveLength(5); // Based on seed data
      expect(data.seedReviews[0]).toMatchObject({
        id: expect.any(String),
        productId: expect.any(String),
        rating: expect.any(Number),
        comment: expect.any(String),
      });
    });
  });

  describe('Federation Features', () => {
    it('should support entity references for reviews', async () => {
      // Create a review
      const createResponse = await gql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${testProductId}"
            rating: 5
            comment: "Federation test review"
            reviewerName: "Federation Tester"
          }) {
            id
          }
        }
      `);

      const reviewId = expectGraphQLSuccess(createResponse).createReview.id;

      // Test federation query for review entity
      const response = await gql(`
        query {
          _entities(representations: [{ __typename: "Review", id: "${reviewId}" }]) {
            ... on Review {
              id
              productId
              rating
              comment
              reviewerName
            }
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data._entities).toHaveLength(1);
      expect(data._entities[0]).toMatchObject({
        id: reviewId,
        productId: testProductId,
        rating: 5,
        comment: 'Federation test review',
        reviewerName: 'Federation Tester',
      });
    });

    it('should support Product entity extension', async () => {
      // Create reviews for a product
      await gql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${testProductId}"
            rating: 5
            comment: "First review"
          }) {
            id
          }
        }
      `);

      await gql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${testProductId}"
            rating: 4
            comment: "Second review"
          }) {
            id
          }
        }
      `);

      // Test federation query for Product with reviews
      const response = await gql(`
        query {
          _entities(representations: [{ __typename: "Product", id: "${testProductId}" }]) {
            ... on Product {
              id
              reviews {
                id
                rating
                comment
              }
            }
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data._entities).toHaveLength(1);
      expect(data._entities[0].id).toBe(testProductId);
      expect(data._entities[0].reviews).toHaveLength(2);
      expect(data._entities[0].reviews[0]).toMatchObject({
        id: expect.any(String),
        rating: expect.any(Number),
        comment: expect.any(String),
      });
    });

    it('should provide federation service info', async () => {
      const response = await gql(`
        query {
          _service {
            sdl
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data._service.sdl).toContain('type Review');
      expect(data._service.sdl).toContain('extend type Product');
      expect(data._service.sdl).toContain('@key(fields: "id")');
      expect(data._service.sdl).toContain('@extends');
      expect(data._service.sdl).toContain('@external');
    });
  });

  describe('Business Logic', () => {
    it('should handle multiple reviews for same product', async () => {
      const reviews = [
        { rating: 5, comment: 'Excellent!' },
        { rating: 4, comment: 'Very good' },
        { rating: 3, comment: 'Average' },
        { rating: 2, comment: 'Below expectations' },
        { rating: 1, comment: 'Poor quality' },
      ];

      // Create reviews
      for (const review of reviews) {
        await gql(`
          mutation CreateReview($input: CreateReviewInput!) {
            createReview(createReviewInput: $input) {
              id
            }
          }
        `, {
          input: {
            productId: testProductId,
            ...review,
          },
        });
      }

      // Query all reviews for the product
      const response = await gql(`
        query {
          reviewsByProduct(productId: "${testProductId}") {
            rating
            comment
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.reviewsByProduct).toHaveLength(5);

      // Verify all ratings are present
      const ratings = data.reviewsByProduct.map((r: any) => r.rating);
      expect(ratings.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle reviews without reviewer name', async () => {
      const response = await gql(`
        mutation {
          createReview(createReviewInput: {
            productId: "${testProductId}"
            rating: 4
            comment: "Anonymous review"
          }) {
            id
            reviewerName
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.createReview.reviewerName).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid UUID format', async () => {
      const response = await gql(`
        query {
          review(id: "invalid-uuid") {
            id
          }
        }
      `);

      expectGraphQLError(response);
    });

    it('should handle non-existent review', async () => {
      const response = await gql(`
        query {
          review(id: "550e8400-e29b-41d4-a716-446655440000") {
            id
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.review).toBeNull();
    });

    it('should handle removal of non-existent review', async () => {
      const response = await gql(`
        mutation {
          removeReview(id: "550e8400-e29b-41d4-a716-446655440000")
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.removeReview).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle bulk review queries efficiently', async () => {
      // Create reviews for multiple products
      const productIds = Array.from({ length: 5 }, (_, i) =>
        `550e8400-e29b-41d4-a716-44665544000${i}`
      );

      // Create 2 reviews per product
      const promises = [];
      for (const productId of productIds) {
        for (let i = 0; i < 2; i++) {
          promises.push(
            gql(`
              mutation CreateReview($input: CreateReviewInput!) {
                createReview(createReviewInput: $input) {
                  id
                }
              }
            `, {
              input: {
                productId,
                rating: 4 + (i % 2),
                comment: `Review ${i + 1} for product ${productId}`,
              },
            })
          );
        }
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds

      // Verify all reviews exist
      const response = await gql(`
        query {
          reviews {
            id
            productId
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.reviews).toHaveLength(10);
    });
  });
});