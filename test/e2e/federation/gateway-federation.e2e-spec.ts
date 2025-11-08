import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloGatewayDriver,
  ApolloGatewayDriverConfig,
  ApolloFederationDriver,
} from '@nestjs/apollo';
import { IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServerPluginInlineTraceDisabled } from '@apollo/server/plugin/disabled';

/**
 * E2E Test: NestJS GraphQL Federation with GatewayQL
 *
 * This test demonstrates:
 * 1. Two separate GraphQL subgraph services (Products and Reviews)
 * 2. Apollo Gateway merging schemas from both services
 * 3. Querying individual services
 * 4. Querying merged/federated data across services
 */
describe('GraphQL Federation Gateway (e2e)', () => {
  let gatewayApp: INestApplication;
  let productsApp: INestApplication;
  let reviewsApp: INestApplication;

  const PRODUCTS_PORT = 4001;
  const REVIEWS_PORT = 4002;

  // Mock data for Products service
  const products = [
    { id: '1', name: 'Laptop', price: 999.99, category: 'Electronics' },
    { id: '2', name: 'Coffee Maker', price: 79.99, category: 'Home' },
    { id: '3', name: 'Desk Chair', price: 249.99, category: 'Furniture' },
  ];

  // Mock data for Reviews service (linked to products by productId)
  const reviews = [
    { id: '1', productId: '1', rating: 5, comment: 'Excellent laptop!' },
    { id: '2', productId: '1', rating: 4, comment: 'Good value for money' },
    { id: '3', productId: '2', rating: 5, comment: 'Makes great coffee' },
    { id: '4', productId: '3', rating: 3, comment: 'Decent chair' },
  ];

  beforeAll(async () => {
    // Create Products Subgraph Service
    productsApp = await createProductsService();
    await productsApp.listen(PRODUCTS_PORT);

    // Create Reviews Subgraph Service
    reviewsApp = await createReviewsService();
    await reviewsApp.listen(REVIEWS_PORT);

    // Wait for services to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create Gateway Application
    gatewayApp = await createGatewayService();
    await gatewayApp.init();
  });

  afterAll(async () => {
    await gatewayApp?.close();
    await productsApp?.close();
    await reviewsApp?.close();
  });

  describe('Individual Service Queries', () => {
    it('should query products from Products service directly', async () => {
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

    it('should query a single product by ID from Products service', async () => {
      const query = `
        query {
          product(id: "1") {
            id
            name
            price
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
      });
    });

    it('should query reviews from Reviews service directly', async () => {
      const query = `
        query {
          reviews {
            id
            productId
            rating
            comment
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
      });
    });

    it('should query reviews by product ID from Reviews service', async () => {
      const query = `
        query {
          reviewsByProduct(productId: "1") {
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

      expect(response.body.data.reviewsByProduct).toHaveLength(2);
      expect(response.body.data.reviewsByProduct[0].rating).toBe(5);
    });
  });

  describe('Federated Gateway Queries', () => {
    it('should query products through the gateway', async () => {
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

      const response = await request(gatewayApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.products).toHaveLength(3);
      expect(response.body.data.products[0].name).toBe('Laptop');
    });

    it('should query reviews through the gateway', async () => {
      const query = `
        query {
          reviews {
            id
            productId
            rating
            comment
          }
        }
      `;

      const response = await request(gatewayApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.reviews).toHaveLength(4);
    });

    it('should merge queries from both services in a single request', async () => {
      const query = `
        query {
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
      `;

      const response = await request(gatewayApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.products).toBeDefined();
      expect(response.body.data.reviews).toBeDefined();
      expect(response.body.data.products).toHaveLength(3);
      expect(response.body.data.reviews).toHaveLength(4);
    });

    it('should execute federated query with product and its reviews', async () => {
      const query = `
        query {
          product(id: "1") {
            id
            name
            price
            reviews {
              rating
              comment
            }
          }
        }
      `;

      const response = await request(gatewayApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      const product = response.body.data.product;
      expect(product.id).toBe('1');
      expect(product.name).toBe('Laptop');
      expect(product.reviews).toHaveLength(2);
      expect(product.reviews[0].rating).toBe(5);
    });

    it('should handle complex federated query with filtering', async () => {
      const query = `
        query {
          products {
            id
            name
            category
            reviews {
              id
              rating
            }
          }
        }
      `;

      const response = await request(gatewayApp.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      const products = response.body.data.products;
      expect(products).toHaveLength(3);

      // Verify that each product has reviews
      const laptop = products.find((p) => p.id === '1');
      expect(laptop.reviews).toHaveLength(2);

      const coffeeMaker = products.find((p) => p.id === '2');
      expect(coffeeMaker.reviews).toHaveLength(1);
    });
  });

  describe('Mutations through Gateway', () => {
    it('should create a product through the gateway', async () => {
      const mutation = `
        mutation {
          createProduct(name: "Wireless Mouse", price: 29.99, category: "Electronics") {
            id
            name
            price
            category
          }
        }
      `;

      const response = await request(gatewayApp.getHttpServer())
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

    it('should create a review through the gateway', async () => {
      const mutation = `
        mutation {
          createReview(productId: "1", rating: 5, comment: "Amazing product!") {
            id
            productId
            rating
            comment
          }
        }
      `;

      const response = await request(gatewayApp.getHttpServer())
        .post('/graphql')
        .send({ query: mutation })
        .expect(200);

      expect(response.body.data.createReview).toMatchObject({
        productId: '1',
        rating: 5,
        comment: 'Amazing product!',
      });
    });
  });

  // Helper function to create Products subgraph service
  async function createProductsService(): Promise<INestApplication> {
    const { Module } = await import('@nestjs/common');
    const {
      Resolver,
      Query,
      Args,
      Mutation,
      Directive,
      ObjectType,
      Field,
      ID,
      Float,
    } = await import('@nestjs/graphql');

    @ObjectType()
    @Directive('@key(fields: "id")')
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

      @Mutation(() => Product)
      createProduct(
        @Args('name') name: string,
        @Args('price') price: number,
        @Args('category') category: string,
      ): Product {
        const newProduct = {
          id: String(products.length + 1),
          name,
          price,
          category,
        };
        products.push(newProduct);
        return newProduct;
      }
    }

    @Module({
      imports: [
        GraphQLModule.forRoot({
          driver: ApolloFederationDriver,
          autoSchemaFile: true,
          plugins: [ApolloServerPluginInlineTraceDisabled()],
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

  // Helper function to create Reviews subgraph service
  async function createReviewsService(): Promise<INestApplication> {
    const { Module } = await import('@nestjs/common');
    const {
      Resolver,
      Query,
      Args,
      Mutation,
      ResolveField,
      Parent,
      Directive,
      ObjectType,
      Field,
      ID,
      Int,
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
    }

    @ObjectType()
    @Directive('@extends')
    @Directive('@key(fields: "id")')
    class Product {
      @Field(() => ID)
      @Directive('@external')
      id: string;

      @Field(() => [Review])
      reviews?: Review[];
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

      @Mutation(() => Review)
      createReview(
        @Args('productId') productId: string,
        @Args('rating', { type: () => Int }) rating: number,
        @Args('comment') comment: string,
      ): Review {
        const newReview = {
          id: String(reviews.length + 1),
          productId,
          rating,
          comment,
        };
        reviews.push(newReview);
        return newReview;
      }
    }

    @Resolver(() => Product)
    class ProductResolver {
      @ResolveField(() => [Review])
      reviews(@Parent() product: Product): Review[] {
        return reviews.filter((r) => r.productId === product.id);
      }
    }

    @Module({
      imports: [
        GraphQLModule.forRoot({
          driver: ApolloFederationDriver,
          autoSchemaFile: true,
          plugins: [ApolloServerPluginInlineTraceDisabled()],
        }),
      ],
      providers: [ReviewsResolver, ProductResolver],
    })
    class ReviewsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [ReviewsModule],
    }).compile();

    return moduleRef.createNestApplication();
  }

  // Helper function to create Gateway service
  async function createGatewayService(): Promise<INestApplication> {
    const { Module } = await import('@nestjs/common');

    @Module({
      imports: [
        GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
          driver: ApolloGatewayDriver,
          gateway: {
            supergraphSdl: new IntrospectAndCompose({
              subgraphs: [
                {
                  name: 'products',
                  url: `http://localhost:${PRODUCTS_PORT}/graphql`,
                },
                {
                  name: 'reviews',
                  url: `http://localhost:${REVIEWS_PORT}/graphql`,
                },
              ],
            }),
          },
        }),
      ],
    })
    class GatewayModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [GatewayModule],
    }).compile();

    return moduleRef.createNestApplication();
  }
});
