---
layout: default
title: API Reference
---

# API Reference

Complete API documentation for Nest GatewayQL.

## GraphQL API

### Endpoints

- **Gateway GraphQL**: `http://localhost:3000/graphql`
- **Admin GraphQL**: `http://localhost:3000/admin`

### Authentication

Include JWT token in headers:

```
Authorization: Bearer <your-jwt-token>
```

Or use API key:

```
X-API-Key: <your-api-key>
```

## Users API

### Queries

#### users

Get all users (requires authentication).

```graphql
query {
  users {
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

#### user

Get a single user by ID.

```graphql
query {
  user(id: "user-id") {
    id
    username
    email
    role
  }
}
```

### Mutations

#### createUser

Create a new user.

```graphql
mutation {
  createUser(
    createUserInput: {
      username: "john"
      email: "john@example.com"
      password: "secret123"
      firstName: "John"
      lastName: "Doe"
    }
  ) {
    id
    username
    email
  }
}
```

**Input Fields**:
- `username` (String, required): Unique username
- `email` (String, required): Valid email address
- `password` (String, required): Minimum 8 characters
- `firstName` (String, optional): First name
- `lastName` (String, optional): Last name

#### updateUser

Update an existing user (requires ADMIN role).

```graphql
mutation {
  updateUser(
    id: "user-id"
    updateUserInput: { firstName: "Jane", isActive: false }
  ) {
    id
    firstName
    isActive
  }
}
```

#### deleteUser

Delete a user (requires ADMIN role).

```graphql
mutation {
  deleteUser(id: "user-id") {
    id
  }
}
```

## Authentication API

### Mutations

#### login

Authenticate and receive JWT token.

```graphql
mutation {
  login(loginInput: { email: "john@example.com", password: "secret123" }) {
    accessToken
    user {
      id
      username
      email
    }
  }
}
```

**Returns**:
- `accessToken`: JWT token for authentication
- `user`: User information

#### register

Register a new user account.

```graphql
mutation {
  register(
    registerInput: {
      username: "john"
      email: "john@example.com"
      password: "secret123"
    }
  ) {
    accessToken
    user {
      id
      username
      email
    }
  }
}
```

## Credentials API

### Queries

#### credentials

Get all credentials (requires authentication).

```graphql
query {
  credentials {
    id
    consumerId
    type
    keyId
    createdAt
  }
}
```

#### credential

Get a single credential by ID.

```graphql
query {
  credential(id: "credential-id") {
    id
    consumerId
    type
    keyId
  }
}
```

### Mutations

#### createCredential

Create a new API credential.

```graphql
mutation {
  createCredential(
    createCredentialInput: {
      consumerId: "user-123"
      type: KEY_AUTH
      keyId: "api-key-123"
      keySecret: "secret"
    }
  ) {
    id
    keyId
    type
  }
}
```

**Input Fields**:
- `consumerId` (String, required): User or service ID
- `type` (CredentialType, required): `KEY_AUTH`, `OAUTH2`, `BASIC_AUTH`
- `keyId` (String, required): API key identifier
- `keySecret` (String, required): Secret key

#### deleteCredential

Delete a credential.

```graphql
mutation {
  deleteCredential(id: "credential-id") {
    id
  }
}
```

## REST API

### Health Check

#### GET /health

Comprehensive health check.

```bash
curl http://localhost:3000/health
```

**Response**:

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" },
    "storage": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" },
    "storage": { "status": "up" }
  }
}
```

#### GET /health/ready

Readiness probe for Kubernetes.

```bash
curl http://localhost:3000/health/ready
```

#### GET /health/live

Liveness probe for Kubernetes.

```bash
curl http://localhost:3000/health/live
```

## Types

### UserEntity

```graphql
type UserEntity {
  id: ID!
  username: String!
  email: String!
  firstName: String
  lastName: String
  role: UserRole!
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### UserRole

```graphql
enum UserRole {
  USER
  ADMIN
  MODERATOR
}
```

### CredentialType

```graphql
enum CredentialType {
  KEY_AUTH
  OAUTH2
  BASIC_AUTH
  JWT
}
```

### CreateUserInput

```graphql
input CreateUserInput {
  username: String!
  email: String!
  password: String!
  firstName: String
  lastName: String
}
```

### UpdateUserInput

```graphql
input UpdateUserInput {
  username: String
  email: String
  firstName: String
  lastName: String
  isActive: Boolean
}
```

### LoginInput

```graphql
input LoginInput {
  email: String!
  password: String!
}
```

## Error Handling

### Error Response Format

```json
{
  "errors": [
    {
      "message": "User not found",
      "extensions": {
        "code": "NOT_FOUND",
        "statusCode": 404
      }
    }
  ]
}
```

### Error Codes

- `UNAUTHENTICATED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `BAD_REQUEST`: Invalid input
- `INTERNAL_SERVER_ERROR`: Server error
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Rate Limiting

When rate limited, you'll receive:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Headers**:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: When the limit resets

## Pagination

For queries that return lists, use pagination:

```graphql
query {
  users(page: 1, limit: 10) {
    id
    username
  }
}
```

**Parameters**:
- `page` (Int): Page number (default: 1)
- `limit` (Int): Items per page (default: 10, max: 100)

## Filtering

Filter results with where clause:

```graphql
query {
  users(where: { role: ADMIN, isActive: true }) {
    id
    username
  }
}
```

## Sorting

Sort results:

```graphql
query {
  users(orderBy: { createdAt: DESC }) {
    id
    username
  }
}
```

## Next Steps

- [Features](../features/) - Learn about available features
- [Configuration](../configuration/) - Configure the gateway
- [Guides](../guides/) - Step-by-step tutorials
