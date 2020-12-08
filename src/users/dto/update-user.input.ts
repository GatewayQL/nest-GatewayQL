import { InputType, Field, PartialType } from '@nestjs/graphql';
import { UserInput } from './users.input';

@InputType()
export class UpdateUserInput extends PartialType(UserInput) {
  @Field()
  id?: string;
  
  @Field()
  firstname?: string;

  @Field()
  lastname?: string;

  @Field()
  username?: string;

  @Field()
  email?: string;

  @Field()
  redirectUri?: string;
}
