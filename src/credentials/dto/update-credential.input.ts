import { InputType, Field, PartialType } from '@nestjs/graphql';
import { CredentialInput } from './credential.input';

@InputType()
export class UpdateCredentialInput extends PartialType(CredentialInput) {
  @Field()
  id: string;

  @Field({ nullable: true })
  scope?: string;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field({ nullable: true })
  secret?: string;

  @Field({ nullable: true })
  updatedBy?: string;
}
