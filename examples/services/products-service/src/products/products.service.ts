import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductInput } from './dto/create-product.input';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductInput: CreateProductInput): Promise<Product> {
    const product = this.productRepository.create(createProductInput);
    return await this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    return await this.productRepository.find({
      where: { id: In(ids) },
    });
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.productRepository.delete(id);
    return result.affected > 0;
  }

  async seed(): Promise<Product[]> {
    const existingProducts = await this.findAll();

    if (existingProducts.length > 0) {
      console.log('Products already exist, skipping seed');
      return existingProducts;
    }

    const seedData = [
      {
        name: 'MacBook Pro 16"',
        price: 2499.99,
        category: 'Electronics',
      },
      {
        name: 'Coffee Maker Pro',
        price: 79.99,
        category: 'Home',
      },
      {
        name: 'Ergonomic Desk Chair',
        price: 249.99,
        category: 'Furniture',
      },
      {
        name: 'Wireless Headphones',
        price: 199.99,
        category: 'Electronics',
      },
      {
        name: 'Standing Desk',
        price: 399.99,
        category: 'Furniture',
      },
    ];

    const products = await Promise.all(
      seedData.map(data => this.create(data))
    );

    console.log(`Seeded ${products.length} products`);
    return products;
  }
}