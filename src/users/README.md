# Users Module - GraphQL Subscriptions

This module includes GraphQL subscriptions for real-time updates on user operations.

## Available Subscriptions

### 1. userCreated

Subscribe to user creation events.

```graphql
subscription {
  userCreated {
    id
    username
    email
    role
    createdAt
  }
}
```

### 2. userUpdated

Subscribe to user update events.

```graphql
subscription {
  userUpdated {
    id
    username
    email
    role
    updatedAt
  }
}
```

### 3. userDeleted

Subscribe to user deletion events.

```graphql
subscription {
  userDeleted
}
```

## Usage in Client

### Using Apollo Client

```typescript
import { gql, useSubscription } from '@apollo/client';

const USER_CREATED_SUBSCRIPTION = gql`
  subscription OnUserCreated {
    userCreated {
      id
      username
      email
      role
    }
  }
`;

function UserNotifications() {
  const { data, loading } = useSubscription(USER_CREATED_SUBSCRIPTION);

  if (loading) return <p>Waiting for new users...</p>;
  if (data) return <p>New user: {data.userCreated.username}</p>;
}
```

### WebSocket Connection

The subscription endpoint uses the `graphql-ws` protocol and is available at:

```
ws://localhost:3000/admin/graphql
```

For production:

```
wss://your-domain.com/admin/graphql
```

## Publishing Events from Services

To publish events from your services, import and use the `pubSub` instance:

```typescript
import { pubSub, USER_CREATED } from './resolvers/users.subscription';

// In your service method
async create(createUserInput: CreateUserInput): Promise<User> {
  const user = await this.userRepository.save(newUser);

  // Publish the event
  await pubSub.publish(USER_CREATED, { userCreated: user });

  return user;
}
```

## Testing Subscriptions

### Using GraphQL Playground

1. Navigate to `http://localhost:3000/admin` in your browser
2. Click the "Subscriptions" tab
3. Enter your subscription query
4. Click the play button

The subscription will stay open and receive real-time updates.

### Using curl/websocat

```bash
# Install websocat
websocat ws://localhost:3000/admin/graphql
```

Then send the subscription protocol messages according to the graphql-ws spec.

## Production Considerations

1. **Scalability**: For multi-instance deployments, replace the in-memory `PubSub` with Redis PubSub:

   ```typescript
   import { RedisPubSub } from 'graphql-redis-subscriptions';

   const pubSub = new RedisPubSub({
     connection: {
       host: process.env.REDIS_HOST,
       port: process.env.REDIS_PORT,
     },
   });
   ```

2. **Authentication**: Add authentication to subscription context:

   ```typescript
   subscriptions: {
     'graphql-ws': {
       onConnect: (context) => {
         // Verify JWT token
         const token = context.connectionParams?.authorization;
         // Return context with user info
       },
     },
   }
   ```

3. **Rate Limiting**: Implement subscription rate limiting to prevent abuse.

4. **Connection Management**: Monitor and limit concurrent subscription connections.
