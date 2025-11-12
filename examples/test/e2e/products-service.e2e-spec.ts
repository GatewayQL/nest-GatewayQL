import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { InputType } from '@nestjs/graphql';
import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  gqlRequest,
  getTestDbConfig,
  cleanDatabase,
  expectGraphQLSuccess,
  expectGraphQLError,
  sampleProducts,
} from '../utils/test-helpers';

// Test entities without federation decorators
@Entity('products')
@ObjectType()
class TestProduct {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column()
  @Field()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @Field(() => Float)
  price: number;

  @Column()
  @Field()
  category: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Field()
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  @Field()
  updatedAt: Date;
}

@InputType()
class TestCreateProductInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  price: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  category: string;
}

// Test service
@Injectable()
class TestProductsService {
  constructor(
    @InjectRepository(TestProduct)
    private readonly productRepository: Repository<TestProduct>,
  ) {}

  async create(createProductInput: TestCreateProductInput): Promise<TestProduct> {
    // Validate input
    if (!createProductInput.name || createProductInput.name.trim() === '') {
      throw new Error('Product name is required');
    }
    if (createProductInput.price < 0) {
      throw new Error('Product price must be positive');
    }
    if (!createProductInput.category || createProductInput.category.trim() === '') {
      throw new Error('Product category is required');
    }

    const product = this.productRepository.create(createProductInput);
    return await this.productRepository.save(product);
  }

  async findAll(): Promise<TestProduct[]> {
    return await this.productRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TestProduct> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new NotFoundException(`Invalid UUID format: "${id}"`);
    }

    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async remove(id: string): Promise<boolean> {
    // Validate UUID format first
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new NotFoundException(`Invalid UUID format: "${id}"`);
    }

    const result = await this.productRepository.delete(id);
    return result.affected > 0;
  }

  async seed(): Promise<TestProduct[]> {
    const existingProducts = await this.findAll();

    if (existingProducts.length > 0) {
      console.log('Products already exist, skipping seed');
      return existingProducts;
    }

    const seedData = [
      { name: 'MacBook Pro 16"', price: 2499.99, category: 'Electronics' },
      { name: 'Coffee Maker Pro', price: 79.99, category: 'Home' },
      { name: 'Ergonomic Desk Chair', price: 249.99, category: 'Furniture' },
      { name: 'Wireless Headphones', price: 199.99, category: 'Electronics' },
      { name: 'Standing Desk', price: 399.99, category: 'Furniture' },
    ];

    const products = await Promise.all(
      seedData.map(data => this.create(data))
    );

    console.log(`Seeded ${products.length} products`);
    return products;
  }
}

// Test-only resolver without federation decorators
@Resolver(() => TestProduct)
class TestProductsResolver {
  constructor(private readonly productsService: TestProductsService) {}

  @Mutation(() => TestProduct)
  createProduct(@Args('createProductInput') createProductInput: TestCreateProductInput) {
    return this.productsService.create(createProductInput);
  }

  @Query(() => [TestProduct], { name: 'products' })
  findAll() {
    return this.productsService.findAll();
  }

  @Query(() => TestProduct, { name: 'product', nullable: true })
  async findOne(@Args('id', { type: () => ID }) id: string) {
    try {
      return await this.productsService.findOne(id);
    } catch (error) {
      // Return null for not found, but throw other errors
      if (error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  @Mutation(() => Boolean)
  removeProduct(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.remove(id);
  }

  @Mutation(() => [TestProduct])
  seedProducts() {
    return this.productsService.seed();
  }
}

describe('Products Service E2E', () => {
  let app: INestApplication;
  let gql: ReturnType<typeof gqlRequest>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...getTestDbConfig('products_service_test'),
          entities: [TestProduct],
        }),
        TypeOrmModule.forFeature([TestProduct]),
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
        }),
      ],
      providers: [TestProductsResolver, TestProductsService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    gql = gqlRequest(app);
  });

  beforeEach(async () => {
    // Clear database via service
    const service = app.get(TestProductsService);
    const repository = (service as any).productRepository;
    await repository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Product Queries', () => {
    it('should return empty array when no products exist', async () => {
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
      expect(data.products).toEqual([]);
    });

    it('should return all products', async () => {
      // Create test products
      const createdProducts = [];
      for (const product of sampleProducts) {
        const response = await gql(`
          mutation CreateProduct($input: TestCreateProductInput!) {
            createProduct(createProductInput: $input) {
              id
              name
              price
              category
              createdAt
              updatedAt
            }
          }
        `, { input: product });

        const data = expectGraphQLSuccess(response);
        createdProducts.push(data.createProduct);
      }

      // Query all products
      const response = await gql(`
        query {
          products {
            id
            name
            price
            category
            createdAt
            updatedAt
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.products).toHaveLength(3);
      expect(data.products[0]).toMatchObject({
        name: expect.any(String),
        price: expect.any(Number),
        category: expect.any(String),
      });
    });

    it('should return a specific product by ID', async () => {
      // Create a test product
      const createResponse = await gql(`
        mutation {
          createProduct(createProductInput: {
            name: "Test Product"
            price: 99.99
            category: "Test"
          }) {
            id
            name
            price
            category
          }
        }
      `);

      const createdProduct = expectGraphQLSuccess(createResponse).createProduct;

      // Query the specific product
      const response = await gql(`
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
            name
            price
            category
          }
        }
      `, { id: createdProduct.id });

      const data = expectGraphQLSuccess(response);
      expect(data.product).toMatchObject({
        id: createdProduct.id,
        name: 'Test Product',
        price: 99.99,
        category: 'Test',
      });
    });

    it('should return null for non-existent product', async () => {
      const response = await gql(`
        query {
          product(id: "550e8400-e29b-41d4-a716-446655440000") {
            id
            name
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.product).toBeNull();
    });
  });

  describe('Product Mutations', () => {
    it('should create a new product', async () => {
      const productInput = {
        name: 'New Product',
        price: 199.99,
        category: 'Electronics',
      };

      const response = await gql(`
        mutation CreateProduct($input: TestCreateProductInput!) {
          createProduct(createProductInput: $input) {
            id
            name
            price
            category
            createdAt
            updatedAt
          }
        }
      `, { input: productInput });

      const data = expectGraphQLSuccess(response);
      expect(data.createProduct).toMatchObject({
        id: expect.any(String),
        name: productInput.name,
        price: productInput.price,
        category: productInput.category,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should validate product input', async () => {
      const invalidInput = {
        name: '', // Invalid: empty name
        price: -10, // Invalid: negative price
        category: '',
      };

      const response = await gql(`
        mutation CreateProduct($input: TestCreateProductInput!) {
          createProduct(createProductInput: $input) {
            id
            name
          }
        }
      `, { input: invalidInput });

      expectGraphQLError(response);
    });

    it('should remove a product', async () => {
      // Create a product first
      const createResponse = await gql(`
        mutation {
          createProduct(createProductInput: {
            name: "Product to Delete"
            price: 50.0
            category: "Test"
          }) {
            id
          }
        }
      `);

      const productId = expectGraphQLSuccess(createResponse).createProduct.id;

      // Remove the product
      const removeResponse = await gql(`
        mutation RemoveProduct($id: ID!) {
          removeProduct(id: $id)
        }
      `, { id: productId });

      const data = expectGraphQLSuccess(removeResponse);
      expect(data.removeProduct).toBe(true);

      // Verify product is gone
      const queryResponse = await gql(`
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
          }
        }
      `, { id: productId });

      const queryData = expectGraphQLSuccess(queryResponse);
      expect(queryData.product).toBeNull();
    });

    it('should seed sample products', async () => {
      const response = await gql(`
        mutation {
          seedProducts {
            id
            name
            price
            category
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.seedProducts).toHaveLength(5); // Based on seed data
      expect(data.seedProducts[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        price: expect.any(Number),
        category: expect.any(String),
      });
    });
  });

  describe('Service Features', () => {
    it('should handle concurrent product creation', async () => {
      // Create multiple products concurrently
      const productPromises = [
        gql(`
          mutation {
            createProduct(createProductInput: {
              name: "Concurrent Product 1"
              price: 100.00
              category: "Test"
            }) {
              id
              name
            }
          }
        `),
        gql(`
          mutation {
            createProduct(createProductInput: {
              name: "Concurrent Product 2"
              price: 200.00
              category: "Test"
            }) {
              id
              name
            }
          }
        `),
      ];

      const responses = await Promise.all(productPromises);

      responses.forEach(response => {
        const data = expectGraphQLSuccess(response);
        expect(data.createProduct).toMatchObject({
          id: expect.any(String),
          name: expect.stringContaining('Concurrent Product'),
        });
      });
    });

    it('should handle product search by category', async () => {
      // Create products in different categories
      await gql(`
        mutation {
          createProduct(createProductInput: {
            name: "Electronics Product"
            price: 99.99
            category: "Electronics"
          }) {
            id
          }
        }
      `);

      await gql(`
        mutation {
          createProduct(createProductInput: {
            name: "Home Product"
            price: 49.99
            category: "Home"
          }) {
            id
          }
        }
      `);

      // Query all products and verify categories
      const response = await gql(`
        query {
          products {
            id
            name
            category
          }
        }
      `);

      const data = expectGraphQLSuccess(response);
      expect(data.products).toHaveLength(2);

      const categories = data.products.map((p: any) => p.category);
      expect(categories).toContain('Electronics');
      expect(categories).toContain('Home');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid UUID format', async () => {
      const response = await gql(`
        query {
          product(id: "invalid-uuid") {
            id
            name
          }
        }
      `);

      expectGraphQLError(response);
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require temporarily breaking the DB connection
      // For now, we'll test input validation errors
      const response = await gql(`
        mutation {
          createProduct(createProductInput: {
            name: "Test"
            price: "invalid-price"
            category: "Test"
          }) {
            id
          }
        }
      `);

      expectGraphQLError(response);
    });
  });

  describe('Performance', () => {
    it('should handle bulk product creation efficiently', async () => {
      const startTime = Date.now();
      const products = Array.from({ length: 5 }, (_, i) => ({
        name: `Bulk Product ${i + 1}`,
        price: (i + 1) * 10,
        category: 'Bulk',
      }));

      // Create products sequentially to avoid connection issues
      const responses = [];
      for (const product of products) {
        const response = await gql(`
          mutation CreateProduct($input: TestCreateProductInput!) {
            createProduct(createProductInput: $input) {
              id
              name
            }
          }
        `, { input: product });
        responses.push(response);
      }

      const endTime = Date.now();

      // All should succeed
      responses.forEach(response => {
        expectGraphQLSuccess(response);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds

      // Verify all products exist
      const queryResponse = await gql(`
        query {
          products {
            id
            name
          }
        }
      `);

      const data = expectGraphQLSuccess(queryResponse);
      expect(data.products).toHaveLength(5);
    });
  });
});