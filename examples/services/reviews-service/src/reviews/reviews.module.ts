import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsResolver, ProductResolver } from './reviews.resolver';
import { Review } from './entities/review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  providers: [ReviewsResolver, ProductResolver, ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}