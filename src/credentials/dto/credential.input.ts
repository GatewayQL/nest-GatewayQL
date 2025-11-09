import { InputType, Field } from '@nestjs/graphql';
import { CredentialType, ConsumerType } from '../models/credential.interface';

@InputType()
export class CredentialInput {
  @Field()
  id?: string;

  @Field({ nullable: true })
  consumerId?: string;

  @Field({ nullable: true })
  appId?: string;

  @Field(() => String, { nullable: true })
  consumerType?: ConsumerType;

  @Field()
  scope?: string;

  @Field()
  isActive?: boolean;

  @Field()
  keyId?: string;

  @Field()
  keySecret?: string;

  @Field()
  password?: string;

  @Field()
  passwordHash?: string;

  @Field()
  secret?: string;

  @Field()
  type?: CredentialType;

  @Field()
  createdAt?: number;

  @Field()
  updatedAt?: number;

  @Field()
  updatedBy?: string;
}
