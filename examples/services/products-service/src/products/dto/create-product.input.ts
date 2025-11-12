import { InputType, Field, Float } from '@nestjs/graphql';
import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';

@InputType()
export class CreateProductInput {
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