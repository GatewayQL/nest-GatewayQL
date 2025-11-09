import { ObjectType, Field } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/models/user.entity';

@ObjectType()
@Entity('apps')
export class AppEntity extends BaseEntity {
  constructor(name?: string, description?: string, redirectUri?: string) {
    super();
    this.name = name || '';
    this.description = description || '';
    this.redirectUri = redirectUri || '';
  }

  @PrimaryGeneratedColumn('uuid')
  @Field()
  id?: string;

  @Column({ nullable: false })
  @Field()
  name: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  description?: string;

  @Column({ name: 'redirect_uri', nullable: true })
  @Field({ nullable: true })
  redirectUri?: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  @Field()
  isActive?: boolean;

  @Column({ name: 'user_id' })
  @Field()
  userId: string;

  @ManyToOne(() => UserEntity, { eager: true })
  @JoinColumn({ name: 'user_id' })
  @Field(() => UserEntity)
  user: UserEntity;

  @CreateDateColumn({ type: 'timestamp' })
  @Field()
  createdAt?: number;

  @UpdateDateColumn({ type: 'timestamp' })
  @Field()
  updatedAt?: number;
}
