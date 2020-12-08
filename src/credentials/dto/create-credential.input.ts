import { InputType, Field } from '@nestjs/graphql';
import { CredentialType } from '../models/credential.interface';

@InputType()
export class CreateCredentialInput {
  @Field()
  scope?: string;

  @Field()
  consumerId: string;

  @Field()
  type: CredentialType;

  @Field()
  secret: string;
}
