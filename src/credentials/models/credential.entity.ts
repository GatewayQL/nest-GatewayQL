import { ObjectType, Field } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CredentialType } from './credential.interface';

@ObjectType()
@Entity('credentials')
export class CredentialEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id?: string;

  @Column({ name: 'consumer_id' })
  @Field()
  consumerId: string;

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

  @Column({ select: false, nullable: true  })
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
