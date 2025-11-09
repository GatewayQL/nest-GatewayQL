import { ObjectType, Field } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('scopes')
export class ScopeEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id?: string;

  @Column({ unique: true })
  @Field()
  name: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamp' })
  @Field()
  createdAt?: number;

  @UpdateDateColumn({ type: 'timestamp' })
  @Field()
  updatedAt?: number;
}
