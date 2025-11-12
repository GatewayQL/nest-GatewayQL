import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsNumber, Min, Max, IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class CreateReviewInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  comment: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  reviewerName?: string;
}