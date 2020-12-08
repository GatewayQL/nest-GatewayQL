import { InputType, Field } from '@nestjs/graphql';
import { CredentialType } from '../models/credential.interface';

@InputType()
export class CredentialInput {
  @Field()
  id?: string;

  @Field()
  consumerId: string;

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
