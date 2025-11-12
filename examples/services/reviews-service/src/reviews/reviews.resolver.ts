import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveReference,
  ResolveField,
  Parent
} from '@nestjs/graphql';
import { ReviewsService } from './reviews.service';
import { Review, Product } from './entities/review.entity';
import { CreateReviewInput } from './dto/create-review.input';

@Resolver(() => Review)
export class ReviewsResolver {
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
    return this.reviewsService.findOne(id);
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

  // Federation: Entity reference resolver
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    return this.reviewsService.findOne(reference.id);
  }
}

@Resolver(() => Product)
export class ProductResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ResolveField(() => [Review])
  reviews(@Parent() product: Product): Promise<Review[]> {
    return this.reviewsService.findByProductId(product.id);
  }

  // Federation: Entity reference resolver for Product
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    // This method is called when the gateway needs to resolve a Product reference
    // We don't actually store Product data, we just return the reference
    return { id: reference.id };
  }
}