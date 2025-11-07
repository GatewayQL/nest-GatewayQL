import { ObjectType, Field } from '@nestjs/graphql';
import { UserEntity } from '../../users/models/user.entity';

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;

  @Field()
  expiresIn: string;

  @Field(() => UserEntity)
  user: UserEntity;
}
