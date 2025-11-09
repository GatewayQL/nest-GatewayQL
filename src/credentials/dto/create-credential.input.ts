import { InputType, Field } from '@nestjs/graphql';
import { CredentialType, ConsumerType } from '../models/credential.interface';

@InputType()
export class CreateCredentialInput {
  @Field()
  scope?: string;

  @Field({ nullable: true })
  consumerId?: string;

  @Field({ nullable: true })
  appId?: string;

  @Field(() => String, { defaultValue: ConsumerType.USER })
  consumerType?: ConsumerType;

  @Field()
  type: CredentialType;

  @Field()
  secret: string;
}
