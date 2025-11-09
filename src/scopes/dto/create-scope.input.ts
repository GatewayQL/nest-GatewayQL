import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateScopeInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;
}
