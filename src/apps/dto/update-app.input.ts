import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateAppInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  redirectUri?: string;

  @Field({ nullable: true })
  isActive?: boolean;
}
