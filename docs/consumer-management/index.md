---
layout: default
title: Consumer Management
---

# Consumer Management

Consumers are entities (users, applications, or services) that access your API gateway. This guide explains how to manage consumers effectively.

## Table of Contents

- [What is a Consumer?](#what-is-a-consumer)
- [Creating Consumers](#creating-consumers)
- [Managing Consumers](#managing-consumers)
- [Consumer Properties](#consumer-properties)
- [Best Practices](#best-practices)

## What is a Consumer?

A consumer in Nest GatewayQL represents any entity that makes requests to your API. Consumers can be:

- **End Users**: Individual users accessing your API
- **Applications**: Frontend apps, mobile apps
- **Services**: Backend microservices, third-party integrations
- **Partners**: External organizations using your API

Each consumer can have:
- Unique credentials (API keys, tokens)
- Specific roles and permissions
- Usage quotas and rate limits
- Audit logs of their activities

## Creating Consumers

### Via GraphQL API

#### Register a New User

```graphql
mutation {
  register(
    registerInput: {
      username: "johndoe"
      email: "john@example.com"
      password: "SecurePass123!"
    }
  ) {
    accessToken
    user {
      id
      username
      email
      role
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "register": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "uuid-123",
        "username": "johndoe",
        "email": "john@example.com",
        "role": "USER"
      }
    }
  }
}
```

#### Create User (Admin Only)

```graphql
mutation {
  createUser(
    createUserInput: {
      username: "janedoe"
      email: "jane@example.com"
      password: "SecurePass123!"
      firstName: "Jane"
      lastName: "Doe"
    }
  ) {
    id
    username
    email
    role
    isActive
  }
}
```

## Managing Consumers

### List All Consumers

```graphql
query {
  users {
    id
    username
    email
    role
    isActive
    createdAt
    updatedAt
  }
}
```

**With Filtering:**
```graphql
query {
  users(where: { role: ADMIN, isActive: true }) {
    id
    username
    email
  }
}
```

### Get Single Consumer

```graphql
query {
  user(id: "uuid-123") {
    id
    username
    email
    firstName
    lastName
    role
    isActive
    createdAt
    updatedAt
  }
}
```

### Update Consumer

```graphql
mutation {
  updateUser(
    id: "uuid-123"
    updateUserInput: {
      firstName: "John"
      lastName: "Smith"
      isActive: true
    }
  ) {
    id
    firstName
    lastName
    isActive
  }
}
```

**Update Role (Admin Only):**
```graphql
mutation {
  updateUser(
    id: "uuid-123"
    updateUserInput: {
      role: MODERATOR
    }
  ) {
    id
    role
  }
}
```

### Deactivate Consumer

```graphql
mutation {
  updateUser(
    id: "uuid-123"
    updateUserInput: {
      isActive: false
    }
  ) {
    id
    isActive
  }
}
```

### Delete Consumer

**Permanent deletion** (Admin only):

```graphql
mutation {
  deleteUser(id: "uuid-123") {
    id
  }
}
```

## Consumer Properties

### User Entity Structure

```typescript
{
  id: string;              // Unique identifier (UUID)
  username: string;        // Unique username
  email: string;           // Unique email address
  password: string;        // Hashed password (bcrypt)
  firstName?: string;      // Optional first name
  lastName?: string;       // Optional last name
  role: UserRole;          // USER, ADMIN, MODERATOR
  isActive: boolean;       // Account status
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last update timestamp
}
```

### User Roles

```typescript
enum UserRole {
  USER = 'user',           // Regular user
  MODERATOR = 'moderator', // Elevated permissions
  ADMIN = 'admin',         // Full access
}
```

**Role Permissions:**

| Action | USER | MODERATOR | ADMIN |
|--------|------|-----------|-------|
| Read own data | ✅ | ✅ | ✅ |
| Update own data | ✅ | ✅ | ✅ |
| Read all users | ❌ | ✅ | ✅ |
| Update other users | ❌ | ⚠️ | ✅ |
| Delete users | ❌ | ❌ | ✅ |
| Manage credentials | ❌ | ⚠️ | ✅ |
| System configuration | ❌ | ❌ | ✅ |

⚠️ = Limited access

## Authentication

### Login

```graphql
mutation {
  login(
    loginInput: {
      email: "john@example.com"
      password: "SecurePass123!"
    }
  ) {
    accessToken
    user {
      id
      username
      email
      role
    }
  }
}
```

**Using the Token:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"query":"{ users { id username } }"}'
```

### Token Management

**Token Properties:**
- **Expiration**: Configurable (default: 1 day)
- **Secret**: Configured in JWT_SECRET
- **Algorithm**: HS256

**Refresh Token** (if implemented):
```graphql
mutation {
  refreshToken(refreshToken: "...") {
    accessToken
  }
}
```

## Consumer Groups

While not explicitly implemented, you can organize consumers using:

### By Role

```graphql
query {
  admins: users(where: { role: ADMIN }) {
    id
    username
  }
  moderators: users(where: { role: MODERATOR }) {
    id
    username
  }
}
```

### By Status

```graphql
query {
  activeUsers: users(where: { isActive: true }) {
    id
    username
  }
  inactiveUsers: users(where: { isActive: false }) {
    id
    username
  }
}
```

## Consumer Auditing

Track consumer activities for security and compliance.

### Activity Logging

```typescript
// Automatic logging via LoggingInterceptor
[2025-01-15 10:30:45] INFO [AuthService] User login: john@example.com
[2025-01-15 10:30:46] INFO [UsersService] User created: uuid-123
[2025-01-15 10:30:47] INFO [UsersService] User updated: uuid-123
```

### Access Logs

Monitor API access:
```typescript
{
  timestamp: "2025-01-15T10:30:45.123Z",
  userId: "uuid-123",
  method: "POST",
  endpoint: "/graphql",
  query: "users",
  statusCode: 200,
  responseTime: 25
}
```

## Rate Limiting per Consumer

### Default Rate Limits

Global limits apply to all consumers:
```bash
THROTTLE_TTL=60      # 60 seconds
THROTTLE_LIMIT=10    # 10 requests per window
```

### Custom Limits (Future Enhancement)

```typescript
// Potential implementation
@Throttle({
  [UserRole.USER]: { ttl: 60, limit: 10 },
  [UserRole.MODERATOR]: { ttl: 60, limit: 100 },
  [UserRole.ADMIN]: { ttl: 60, limit: 1000 },
})
```

## Security Best Practices

1. **Password Policy**
   - Minimum 8 characters
   - Require complexity
   - Hash with bcrypt (salt rounds: 10)

2. **Account Security**
   - Enable account lockout after failed attempts
   - Require email verification
   - Implement 2FA for sensitive accounts

3. **Token Security**
   - Use short expiration times (1 hour)
   - Implement refresh tokens
   - Rotate secrets regularly

4. **Access Control**
   - Implement principle of least privilege
   - Use RBAC consistently
   - Audit permission changes

5. **Monitoring**
   - Track failed login attempts
   - Monitor unusual activity
   - Alert on privilege escalation

## Best Practices

1. **Unique Identifiers**: Use UUIDs for consumer IDs
2. **Email Verification**: Verify email addresses before activation
3. **Password Hashing**: Always use bcrypt with appropriate salt rounds
4. **Deactivate, Don't Delete**: Deactivate accounts instead of deleting
5. **Audit Logs**: Maintain comprehensive audit logs
6. **Regular Cleanup**: Remove inactive accounts after X days
7. **Role Assignment**: Be conservative with elevated roles
8. **Credential Rotation**: Encourage regular password changes

## Examples

### Complete Consumer Lifecycle

```graphql
# 1. Register new consumer
mutation {
  register(registerInput: {
    username: "newuser"
    email: "new@example.com"
    password: "SecurePass123!"
  }) {
    accessToken
    user { id username }
  }
}

# 2. Login
mutation {
  login(loginInput: {
    email: "new@example.com"
    password: "SecurePass123!"
  }) {
    accessToken
    user { id }
  }
}

# 3. Update profile
mutation {
  updateUser(id: "uuid-123", updateUserInput: {
    firstName: "New"
    lastName: "User"
  }) {
    id
    firstName
    lastName
  }
}

# 4. Create API credential
mutation {
  createCredential(createCredentialInput: {
    consumerId: "uuid-123"
    type: KEY_AUTH
    keyId: "api-key-123"
    keySecret: "secret"
  }) {
    id
    keyId
  }
}

# 5. Deactivate account
mutation {
  updateUser(id: "uuid-123", updateUserInput: {
    isActive: false
  }) {
    id
    isActive
  }
}
```

## Next Steps

- [Credential Management](../credential-management/) - Manage consumer credentials
- [Policies](../policies/) - Apply policies to consumers
- [API Reference](../api/) - Complete API documentation
- [Admin Guide](../admin/) - Administrative operations

## Additional Resources

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
