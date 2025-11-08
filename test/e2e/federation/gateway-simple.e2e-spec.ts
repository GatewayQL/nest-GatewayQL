import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

/**
 * E2E Test: NestJS GraphQL with Multiple Services
 *
 * This test demonstrates:
 * 1. Two separate GraphQL services (Products and Reviews)
 * 2. Testing queries to individual services
 * 3. Demonstrating how to structure services for gateway integration
 *
 * Note: This uses standalone GraphQL services. For full Apollo Federation
 * with entity resolution across services, see gateway-federation.e2e-spec.ts
 */
describe('GraphQL Multiple Services (e2e)', () => {
  let productsApp: INestApplication;
  let reviewsApp: INestApplication;

  const PRODUCTS_PORT = 5001;
  const REVIEWS_PORT = 5002;

  // Mock data for Products service
  const products = [
    { id: '1', name: 'Laptop', price: 999.99, category: 'Electronics' },
    { id: '2', name: 'Coffee Maker', price: 79.99, category: 'Home' },
    { id: '3', name: 'Desk Chair', price: 249.99, category: 'Furniture' },
  ];

  // Mock data for Reviews service
  const reviews = [
    {
      id: '1',
      productId: '1',
      rating: 5,
      comment: 'Excellent laptop!',
      author: 'John',
    },
    {
      id: '2',
      productId: '1',
      rating: 4,
      comment: 'Good value for money',
      author: 'Jane',
    },
    {
      id: '3',
      productId: '2',
      rating: 5,
      comment: 'Makes great coffee',
      author: 'Bob',
    },
    {
      id: '4',
      productId: '3',
      rating: 3,
      comment: 'Decent chair',
      author: 'Alice',
    },
  ];

  beforeAll(async () => {
    // Create Products Service
    productsApp = await createProductsService();
    await productsApp.listen(PRODUCTS_PORT);

    // Create Reviews Service
    reviewsApp = await createReviewsService();
    await reviewsApp.listen(REVIEWS_PORT);

    // Wait for services to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await productsApp?.close();
    await reviewsApp?.close();
  });

  describe('Products Service', () => {
    it('should query all products', async () => {
      const query = `
        query {
          products {
            id
            name
            price
            category
          }
        }
      `;

      const response = await request(productsApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.products).toHaveLength(3);
      expect(response.body.data.products[0]).toMatchObject({
        id: '1',
        name: 'Laptop',
        price: 999.99,
        category: 'Electronics',
      });
    });

    it('should query a single product by ID', async () => {
      const query = `
        query {
          product(id: "1") {
            id
            name
            price
            category
          }
        }
      `;

      const response = await request(productsApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.product).toMatchObject({
        id: '1',
        name: 'Laptop',
        price: 999.99,
        category: 'Electronics',
      });
    });

    it('should filter products by category', async () => {
      const query = `
        query {
          productsByCategory(category: "Electronics") {
            id
            name
            category
          }
        }
      `;

      const response = await request(productsApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.productsByCategory).toHaveLength(1);
      expect(response.body.data.productsByCategory[0].category).toBe(
        'Electronics',
      );
    });

    it('should create a new product', async () => {
      const mutation = `
        mutation {
          createProduct(input: {
            name: "Wireless Mouse"
            price: 29.99
            category: "Electronics"
          }) {
            id
            name
            price
            category
          }
        }
      `;

      const response = await request(productsApp.getHttpServer())
        .post('/graphql')
        .send({ query: mutation })
        .expect(200);

      expect(response.body.data.createProduct).toMatchObject({
        name: 'Wireless Mouse',
        price: 29.99,
        category: 'Electronics',
      });
      expect(response.body.data.createProduct.id).toBeDefined();
    });
  });

  describe('Reviews Service', () => {
    it('should query all reviews', async () => {
      const query = `
        query {
          reviews {
            id
            productId
            rating
            comment
            author
          }
        }
      `;

      const response = await request(reviewsApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.reviews).toHaveLength(4);
      expect(response.body.data.reviews[0]).toMatchObject({
        id: '1',
        productId: '1',
        rating: 5,
        author: 'John',
      });
    });

    it('should query reviews by product ID', async () => {
      const query = `
        query {
          reviewsByProduct(productId: "1") {
            id
            rating
            comment
            author
          }
        }
      `;

      const response = await request(reviewsApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.reviewsByProduct).toHaveLength(2);
      expect(response.body.data.reviewsByProduct[0].rating).toBe(5);
      expect(response.body.data.reviewsByProduct[1].rating).toBe(4);
    });

    it('should query reviews with minimum rating', async () => {
      const query = `
        query {
          reviewsWithMinRating(minRating: 5) {
            id
            rating
            comment
          }
        }
      `;

      const response = await request(reviewsApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(
        response.body.data.reviewsWithMinRating.length,
      ).toBeGreaterThanOrEqual(2);
      response.body.data.reviewsWithMinRating.forEach((review: any) => {
        expect(review.rating).toBeGreaterThanOrEqual(5);
      });
    });

    it('should create a new review', async () => {
      const mutation = `
        mutation {
          createReview(input: {
            productId: "1"
            rating: 5
            comment: "Amazing product!"
            author: "TestUser"
          }) {
            id
            productId
            rating
            comment
            author
          }
        }
      `;

      const response = await request(reviewsApp.getHttpServer())
        .post('/graphql')
        .send({ query: mutation })
        .expect(200);

      expect(response.body.data.createReview).toMatchObject({
        productId: '1',
        rating: 5,
        comment: 'Amazing product!',
        author: 'TestUser',
      });
    });
  });

  describe('Service Integration Scenarios', () => {
    it('should have consistent product IDs across both services', async () => {
      // Get all products
      const productsQuery = `
        query {
          products { id }
        }
      `;

      const productsResponse = await request(productsApp.getHttpServer())
        .post('/graphql')
        .send({ query: productsQuery });

      const productIds = productsResponse.body.data.products.map(
        (p: any) => p.id,
      );

      // Get all reviews
      const reviewsQuery = `
        query {
          reviews { productId }
        }
      `;

      const reviewsResponse = await request(reviewsApp.getHttpServer())
        .post('/graphql')
        .send({ query: reviewsQuery });

      // Verify that review productIds reference existing products
      reviewsResponse.body.data.reviews.forEach((review: any) => {
        expect(productIds).toContain(review.productId);
      });
    });

    it('should demonstrate data aggregation pattern', async () => {
      // In a gateway setup, you would merge these queries
      // Here we demonstrate the pattern by making sequential calls

      const productId = '1';

      // First, get product details
      const productQuery = `
        query {
          product(id: "${productId}") {
            id
            name
            price
            category
          }
        }
      `;

      const productResponse = await request(productsApp.getHttpServer())
        .post('/graphql')
        .send({ query: productQuery });

      const product = productResponse.body.data.product;

      // Then, get reviews for that product
      const reviewsQuery = `
        query {
          reviewsByProduct(productId: "${productId}") {
            id
            rating
            comment
            author
          }
        }
      `;

      const reviewsResponse = await request(reviewsApp.getHttpServer())
        .post('/graphql')
        .send({ query: reviewsQuery });

      const reviewsForProduct = reviewsResponse.body.data.reviewsByProduct;

      // Combine the data (this would be done automatically by a gateway)
      const combinedData = {
        ...product,
        reviews: reviewsForProduct,
        averageRating:
          reviewsForProduct.reduce((sum: number, r: any) => sum + r.rating, 0) /
          reviewsForProduct.length,
      };

      expect(combinedData.id).toBe('1');
      expect(combinedData.name).toBe('Laptop');
      expect(combinedData.reviews.length).toBeGreaterThanOrEqual(2);
      expect(combinedData.averageRating).toBeGreaterThanOrEqual(4);
    });
  });

  // Helper function to create Products service
  async function createProductsService(): Promise<INestApplication> {
    const { Module } = await import('@nestjs/common');
    const {
      Resolver,
      Query,
      Args,
      Mutation,
      ObjectType,
      Field,
      ID,
      Float,
      InputType,
    } = await import('@nestjs/graphql');

    @ObjectType()
    class Product {
      @Field(() => ID)
      id: string;

      @Field()
      name: string;

      @Field(() => Float)
      price: number;

      @Field()
      category: string;
    }

    @InputType()
    class CreateProductInput {
      @Field()
      name: string;

      @Field(() => Float)
      price: number;

      @Field()
      category: string;
    }

    @Resolver(() => Product)
    class ProductsResolver {
      @Query(() => [Product])
      products(): Product[] {
        return products;
      }

      @Query(() => Product, { nullable: true })
      product(@Args('id') id: string): Product | undefined {
        return products.find((p) => p.id === id);
      }

      @Query(() => [Product])
      productsByCategory(@Args('category') category: string): Product[] {
        return products.filter((p) => p.category === category);
      }

      @Mutation(() => Product)
      createProduct(@Args('input') input: CreateProductInput): Product {
        const newProduct = {
          id: String(products.length + 1),
          ...input,
        };
        products.push(newProduct);
        return newProduct;
      }
    }

    @Module({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
        }),
      ],
      providers: [ProductsResolver],
    })
    class ProductsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [ProductsModule],
    }).compile();

    return moduleRef.createNestApplication();
  }

  // Helper function to create Reviews service
  async function createReviewsService(): Promise<INestApplication> {
    const { Module } = await import('@nestjs/common');
    const {
      Resolver,
      Query,
      Args,
      Mutation,
      ObjectType,
      Field,
      ID,
      Int,
      InputType,
    } = await import('@nestjs/graphql');

    @ObjectType()
    class Review {
      @Field(() => ID)
      id: string;

      @Field()
      productId: string;

      @Field(() => Int)
      rating: number;

      @Field()
      comment: string;

      @Field()
      author: string;
    }

    @InputType()
    class CreateReviewInput {
      @Field()
      productId: string;

      @Field(() => Int)
      rating: number;

      @Field()
      comment: string;

      @Field()
      author: string;
    }

    @Resolver(() => Review)
    class ReviewsResolver {
      @Query(() => [Review])
      reviews(): Review[] {
        return reviews;
      }

      @Query(() => [Review])
      reviewsByProduct(@Args('productId') productId: string): Review[] {
        return reviews.filter((r) => r.productId === productId);
      }

      @Query(() => [Review])
      reviewsWithMinRating(
        @Args('minRating', { type: () => Int }) minRating: number,
      ): Review[] {
        return reviews.filter((r) => r.rating >= minRating);
      }

      @Mutation(() => Review)
      createReview(@Args('input') input: CreateReviewInput): Review {
        const newReview = {
          id: String(reviews.length + 1),
          ...input,
        };
        reviews.push(newReview);
        return newReview;
      }
    }

    @Module({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
        }),
      ],
      providers: [ReviewsResolver],
    })
    class ReviewsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [ReviewsModule],
    }).compile();

    return moduleRef.createNestApplication();
  }
});
