import { Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { UserEntity } from '../models/user.entity';

const pubSub = new PubSub() as any;

export const USER_CREATED = 'userCreated';
export const USER_UPDATED = 'userUpdated';
export const USER_DELETED = 'userDeleted';

@Resolver(() => UserEntity)
export class UsersSubscriptionResolver {
  @Subscription(() => UserEntity, {
    name: USER_CREATED,
    description: 'Subscribe to user creation events',
  })
  userCreated() {
    return pubSub.asyncIterator(USER_CREATED);
  }

  @Subscription(() => UserEntity, {
    name: USER_UPDATED,
    description: 'Subscribe to user update events',
  })
  userUpdated() {
    return pubSub.asyncIterator(USER_UPDATED);
  }

  @Subscription(() => String, {
    name: USER_DELETED,
    description: 'Subscribe to user deletion events',
  })
  userDeleted() {
    return pubSub.asyncIterator(USER_DELETED);
  }
}

// Export pubSub for publishing events from services
export { pubSub };
