import { ObjectType, Field } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CredentialType, ConsumerType } from './credential.interface';
import { AppEntity } from '../../apps/models/app.entity';

@ObjectType()
@Entity('credentials')
export class CredentialEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id?: string;

  @Column({ name: 'consumer_id', nullable: true })
  @Field({ nullable: true })
  consumerId?: string;

  @Column({
    name: 'consumer_type',
    type: 'enum',
    enum: ConsumerType,
    default: ConsumerType.USER,
  })
  @Field(() => String)
  consumerType?: ConsumerType;

  @ManyToOne(() => AppEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'app_id' })
  @Field(() => AppEntity, { nullable: true })
  app?: AppEntity;

  @Column({ default: 'admin' })
  @Field()
  scope?: string;

  @Column({ type: 'boolean', default: false })
  @Field()
  isActive?: boolean;

  @Column({ name: 'key_id', default: true })
  @Field()
  keyId?: string;

  @Column({ select: false, name: 'key_secret', nullable: true })
  @Field()
  keySecret?: string;

  @Column({ select: false, nullable: true })
  @Field()
  password?: string;

  @Column({ select: false, nullable: true })
  @Field()
  passwordHash?: string;

  @Column({ select: false, nullable: true })
  @Field()
  secret?: string;

  @Column({ type: 'enum', enum: CredentialType, default: CredentialType.BASIC })
  @Field()
  type?: CredentialType;

  @CreateDateColumn({ type: 'timestamp' })
  @Field()
  createdAt?: number;

  @UpdateDateColumn({ type: 'timestamp' })
  @Field()
  updatedAt?: number;

  @Column({ nullable: true })
  @Field()
  updatedBy?: string;
}
