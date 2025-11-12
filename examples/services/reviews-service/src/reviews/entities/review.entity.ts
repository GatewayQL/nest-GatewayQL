import { ObjectType, Field, ID, Int, Directive } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('reviews')
@ObjectType()
@Directive('@key(fields: "id")')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column('uuid')
  @Field()
  productId: string;

  @Column('int')
  @Field(() => Int)
  rating: number;

  @Column('text')
  @Field()
  comment: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  reviewerName?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Field()
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  @Field()
  updatedAt: Date;
}

// Extended Product entity for federation
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class Product {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  @Field(() => [Review])
  reviews?: Review[];
}