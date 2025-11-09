---
layout: default
title: Credential Management
---

# Credential Management

Credentials allow consumers to authenticate with your API gateway. This guide covers creating, managing, and securing credentials.

## Table of Contents

- [What are Credentials?](#what-are-credentials)
- [Credential Types](#credential-types)
- [Creating Credentials](#creating-credentials)
- [Managing Credentials](#managing-credentials)
- [Using Credentials](#using-credentials)
- [Security Best Practices](#security-best-practices)

## What are Credentials?

Credentials are authentication tokens that identify and authenticate API consumers. Each credential:

- Is associated with a specific consumer
- Has a specific type (API Key, JWT, OAuth, etc.)
- Contains encrypted secrets
- Can be revoked independently
- Has audit trail of usage

## Credential Types

### KEY_AUTH (API Key)

API keys for simple authentication.

**Use Cases:**
- Server-to-server communication
- Service accounts
- Third-party integrations

**Properties:**
- `keyId`: Public identifier
- `keySecret`: Secret key (hashed)

### JWT (JSON Web Token)

Token-based authentication for users.

**Use Cases:**
- User authentication
- Mobile applications
- Web applications

**Properties:**
- `token`: JWT token
- `expiresAt`: Expiration time

### OAUTH2

OAuth 2.0 client credentials.

**Use Cases:**
- Third-party applications
- Partner integrations

**Properties:**
- `clientId`: OAuth client ID
- `clientSecret`: OAuth client secret (hashed)

### BASIC_AUTH

Basic HTTP authentication.

**Use Cases:**
- Legacy systems
- Simple integrations

**Properties:**
- `username`: Auth username
- `password`: Auth password (hashed)

## Creating Credentials

### Create API Key

```graphql
mutation {
  createCredential(
    createCredentialInput: {
      consumerId: "user-uuid-123"
      type: KEY_AUTH
      keyId: "my-api-key"
      keySecret: "my-secret-key"
    }
  ) {
    id
    consumerId
    type
    keyId
    createdAt
  }
}
```

**Response:**
```json
{
  "data": {
    "createCredential": {
      "id": "cred-uuid-456",
      "consumerId": "user-uuid-123",
      "type": "KEY_AUTH",
      "keyId": "my-api-key",
      "createdAt": "2025-01-15T10:30:45.123Z"
    }
  }
}
```

**Important:** The `keySecret` is hashed before storage and cannot be retrieved later.

### Create OAuth2 Credentials

```graphql
mutation {
  createCredential(
    createCredentialInput: {
      consumerId: "user-uuid-123"
      type: OAUTH2
      keyId: "oauth-client-123"
      keySecret: "oauth-secret-key"
    }
  ) {
    id
    type
    keyId
  }
}
```

## Managing Credentials

### List Consumer Credentials

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

**Filter by Consumer:**
```graphql
query {
  credentials(where: { consumerId: "user-uuid-123" }) {
    id
    type
    keyId
  }
}
```

**Filter by Type:**
```graphql
query {
  credentials(where: { type: KEY_AUTH }) {
    id
    consumerId
    keyId
  }
}
```

### Get Single Credential

```graphql
query {
  credential(id: "cred-uuid-456") {
    id
    consumerId
    type
    keyId
    createdAt
    updatedAt
  }
}
```

### Delete Credential

```graphql
mutation {
  deleteCredential(id: "cred-uuid-456") {
    id
  }
}
```

**Note:** This permanently deletes the credential and revokes access immediately.

## Using Credentials

### API Key Authentication

**HTTP Header:**
```bash
curl -H "X-API-Key: my-api-key" \
  http://localhost:3000/graphql \
  -d '{"query":"{ users { id username } }"}'
```

**GraphQL Playground:**
```json
{
  "X-API-Key": "my-api-key"
}
```

### JWT Authentication

**HTTP Header:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:3000/graphql \
  -d '{"query":"{ users { id username } }"}'
```

**GraphQL Playground:**
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Basic Authentication

**HTTP Header:**
```bash
curl -u username:password \
  http://localhost:3000/graphql \
  -d '{"query":"{ users { id username } }"}'
```

## Credential Rotation

### Why Rotate Credentials?

- Security best practice
- Compliance requirements
- Suspected compromise
- Regular maintenance

### Rotation Process

```graphql
# 1. Create new credential
mutation {
  createCredential(
    createCredentialInput: {
      consumerId: "user-uuid-123"
      type: KEY_AUTH
      keyId: "my-api-key-v2"
      keySecret: "new-secret-key"
    }
  ) {
    id
    keyId
  }
}

# 2. Update applications to use new credential
# (Allow time for propagation)

# 3. Delete old credential
mutation {
  deleteCredential(id: "old-cred-uuid") {
    id
  }
}
```

### Automated Rotation

```typescript
// Example implementation
async rotateCredential(credentialId: string) {
  const oldCred = await this.findOne(credentialId);

  // Create new credential
  const newCred = await this.create({
    consumerId: oldCred.consumerId,
    type: oldCred.type,
    keyId: `${oldCred.keyId}-new`,
    keySecret: generateSecureSecret(),
  });

  // Schedule old credential deletion (e.g., 30 days)
  await this.scheduleDelete(oldCred.id, 30);

  return newCred;
}
```

## Credential Storage

### Encryption

All credential secrets are encrypted before storage:

```typescript
// Hashing with bcrypt
const hashedSecret = await bcrypt.hash(secret, SALT_ROUNDS);

// Storage
{
  keyId: "my-api-key",
  keySecret: "$2b$10$...", // Hashed
}
```

### Verification

```typescript
// Verify API key
const isValid = await bcrypt.compare(providedSecret, storedHash);
```

## Scopes and Permissions

### Future Enhancement: Scoped Credentials

```graphql
mutation {
  createCredential(
    createCredentialInput: {
      consumerId: "user-uuid-123"
      type: KEY_AUTH
      keyId: "read-only-key"
      keySecret: "secret"
      scopes: ["users:read", "products:read"]
    }
  ) {
    id
    scopes
  }
}
```

**Scope Format:**
- `resource:action`
- Example: `users:read`, `users:write`, `users:delete`

## Monitoring Credentials

### Usage Tracking

Track credential usage:
```typescript
{
  credentialId: "cred-uuid-456",
  timestamp: "2025-01-15T10:30:45.123Z",
  endpoint: "/graphql",
  query: "users",
  statusCode: 200,
  ipAddress: "192.168.1.1"
}
```

### Anomaly Detection

Monitor for:
- Unusual access patterns
- Multiple locations
- Failed authentication attempts
- Excessive rate limit violations

### Alerts

```typescript
// Alert on suspicious activity
if (failedAttempts > 5) {
  await this.alertService.notify({
    type: 'CREDENTIAL_ABUSE',
    credentialId: cred.id,
    details: 'Multiple failed authentication attempts',
  });
}
```

## Security Best Practices

### 1. Never Expose Secrets

```typescript
// ❌ Bad
return { keyId: 'key', keySecret: 'secret' };

// ✅ Good
return { keyId: 'key' }; // Secret never returned
```

### 2. Use Strong Secrets

```typescript
// Generate cryptographically secure secrets
import { randomBytes } from 'crypto';

const secret = randomBytes(32).toString('base64');
```

### 3. Hash All Secrets

```typescript
// Always hash before storage
const hashedSecret = await bcrypt.hash(secret, 10);
```

### 4. Implement Rate Limiting

```typescript
@UseGuards(ApiKeyGuard)
@Throttle(100, 60) // 100 requests per minute
async protectedRoute() {}
```

### 5. Regular Audits

- Review active credentials quarterly
- Remove unused credentials
- Rotate high-privilege credentials
- Check for compromised credentials

### 6. Principle of Least Privilege

- Grant minimum necessary permissions
- Use scoped credentials
- Separate read and write credentials

### 7. Secure Transmission

- Always use HTTPS
- Never log secrets
- Use secure headers
- Encrypt data in transit

## Best Practices

1. **One Credential Per Service**: Don't share credentials
2. **Rotate Regularly**: Rotate every 90 days
3. **Monitor Usage**: Track and alert on anomalies
4. **Revoke Immediately**: Remove compromised credentials
5. **Document Purpose**: Label credentials with their purpose
6. **Audit Regularly**: Review and clean up unused credentials
7. **Use Strong Secrets**: Generate cryptographically secure secrets
8. **Implement Expiration**: Set expiration dates for credentials

## Examples

### Complete Credential Workflow

```graphql
# 1. Create consumer
mutation {
  createUser(createUserInput: {
    username: "service-account"
    email: "service@example.com"
    password: "temp-password"
  }) {
    id
  }
}

# 2. Create API key for consumer
mutation {
  createCredential(createCredentialInput: {
    consumerId: "user-uuid-123"
    type: KEY_AUTH
    keyId: "service-api-key"
    keySecret: "secure-random-secret"
  }) {
    id
    keyId
  }
}

# 3. Use the credential
# In your application:
# headers: { "X-API-Key": "service-api-key" }

# 4. Monitor usage
query {
  credential(id: "cred-uuid-456") {
    id
    keyId
    createdAt
    # lastUsedAt (if implemented)
  }
}

# 5. Rotate credential (after 90 days)
mutation {
  createCredential(createCredentialInput: {
    consumerId: "user-uuid-123"
    type: KEY_AUTH
    keyId: "service-api-key-v2"
    keySecret: "new-secure-random-secret"
  }) {
    id
  }
}

# 6. Delete old credential
mutation {
  deleteCredential(id: "old-cred-uuid") {
    id
  }
}
```

## Troubleshooting

### Invalid Credentials

```json
{
  "errors": [{
    "message": "Unauthorized",
    "extensions": {
      "code": "UNAUTHENTICATED"
    }
  }]
}
```

**Solutions:**
- Verify credential exists and is active
- Check credential type matches authentication method
- Ensure secret is correct (case-sensitive)
- Verify consumer account is active

### Rate Limited

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Solutions:**
- Reduce request frequency
- Implement exponential backoff
- Request higher rate limits
- Use caching to reduce requests

## Next Steps

- [Consumer Management](../consumer-management/) - Manage consumers
- [Policies](../policies/) - Configure authentication policies
- [Security Best Practices](../guides/security) - Secure your gateway
- [API Reference](../api/) - Complete API documentation

## Additional Resources

- [OAuth 2.0 Specification](https://oauth.net/2/)
- [JWT Handbook](https://auth0.com/resources/ebooks/jwt-handbook)
- [API Key Best Practices](https://cloud.google.com/endpoints/docs/openapi/when-why-api-key)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
