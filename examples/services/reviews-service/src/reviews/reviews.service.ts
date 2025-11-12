import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewInput } from './dto/create-review.input';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async create(createReviewInput: CreateReviewInput): Promise<Review> {
    const review = this.reviewRepository.create(createReviewInput);
    return await this.reviewRepository.save(review);
  }

  async findAll(): Promise<Review[]> {
    return await this.reviewRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({ where: { id } });

    if (!review) {
      throw new NotFoundException(`Review with ID "${id}" not found`);
    }

    return review;
  }

  async findByProductId(productId: string): Promise<Review[]> {
    return await this.reviewRepository.find({
      where: { productId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByIds(ids: string[]): Promise<Review[]> {
    return await this.reviewRepository.find({
      where: { id: In(ids) },
    });
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.reviewRepository.delete(id);
    return result.affected > 0;
  }

  async getAverageRating(productId: string): Promise<number> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .where('review.productId = :productId', { productId })
      .getRawOne();

    return parseFloat(result.average) || 0;
  }

  async seed(): Promise<Review[]> {
    const existingReviews = await this.findAll();

    if (existingReviews.length > 0) {
      console.log('Reviews already exist, skipping seed');
      return existingReviews;
    }

    // Note: These are example UUIDs - in a real scenario, these would come from the Products service
    const seedData = [
      {
        productId: '550e8400-e29b-41d4-a716-446655440001', // Example product ID
        rating: 5,
        comment: 'Excellent laptop! Great performance and battery life.',
        reviewerName: 'John Doe',
      },
      {
        productId: '550e8400-e29b-41d4-a716-446655440001',
        rating: 4,
        comment: 'Good value for money, fast delivery.',
        reviewerName: 'Jane Smith',
      },
      {
        productId: '550e8400-e29b-41d4-a716-446655440002', // Another example product ID
        rating: 5,
        comment: 'Perfect coffee maker, brews excellent coffee every time.',
        reviewerName: 'Mike Johnson',
      },
      {
        productId: '550e8400-e29b-41d4-a716-446655440003',
        rating: 3,
        comment: 'Chair is decent but could be more comfortable.',
        reviewerName: 'Sarah Wilson',
      },
      {
        productId: '550e8400-e29b-41d4-a716-446655440003',
        rating: 4,
        comment: 'Good ergonomics, suitable for long working hours.',
        reviewerName: 'David Brown',
      },
    ];

    const reviews = await Promise.all(
      seedData.map(data => this.create(data))
    );

    console.log(`Seeded ${reviews.length} reviews`);
    return reviews;
  }
}