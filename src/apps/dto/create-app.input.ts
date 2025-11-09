import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateAppInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  redirectUri?: string;

  @Field()
  userId: string;

  @Field({ nullable: true })
  isActive?: boolean;
}
