# GatewayQL CLI Documentation

The GatewayQL CLI provides a powerful command-line interface for managing your GraphQL gateway, similar to Express Gateway's CLI.

## Installation

After building the project, you can use the CLI in two ways:

1. **Via npm script:**
   ```bash
   npm run cli -- [command]
   ```

2. **Directly (after npm link):**
   ```bash
   npm link
   gql [command]
   ```

## Base Command

```bash
gql <command>
```

The base command for the GatewayQL CLI.

## Available Commands

### Users Management

Manage users in the GatewayQL system.

#### `gql users create`
Create a new user.

**Options:**
- `-u, --username <username>` - Username
- `-e, --email <email>` - Email address
- `-p, --password <password>` - Password
- `-f, --firstname <firstname>` - First name
- `-l, --lastname <lastname>` - Last name
- `-r, --role <role>` - User role (admin or user) [default: user]
- `--redirect-uri <uri>` - Redirect URI

**Examples:**
```bash
# Interactive mode
gql users create

# With options
gql users create -u john -e john@example.com -p secret123 -f John -l Doe

# Create admin user
gql users create -u admin -e admin@example.com -p admin123 -r admin
```

#### `gql users list`
List all users.

**Options:**
- `--role <role>` - Filter by role (admin or user)

**Examples:**
```bash
# List all users
gql users list

# List only admin users
gql users list --role admin
```

#### `gql users info <username>`
Get detailed information about a user.

**Examples:**
```bash
gql users info john
```

#### `gql users update <username>`
Update a user's information.

**Options:**
- `-f, --firstname <firstname>` - First name
- `-l, --lastname <lastname>` - Last name
- `-p, --password <password>` - New password
- `--redirect-uri <uri>` - Redirect URI

**Examples:**
```bash
# Update user's name
gql users update john -f Jonathan -l Smith

# Change password
gql users update john -p newpassword123
```

#### `gql users remove <username>`
Remove a user.

**Options:**
- `-f, --force` - Skip confirmation

**Examples:**
```bash
# Remove with confirmation
gql users remove john

# Remove without confirmation
gql users remove john --force
```

---

### Credentials Management

Manage API credentials for users.

#### `gql credentials create`
Create a new credential for a user.

**Options:**
- `-c, --consumer-id <consumerId>` - Consumer ID (username)
- `-t, --type <type>` - Credential type: basic-auth, key-auth, oauth2, jwt [default: basic-auth]
- `-s, --secret <secret>` - Secret/password
- `--scope <scope>` - Scope (comma-separated) [default: admin]

**Examples:**
```bash
# Interactive mode
gql credentials create

# Create basic-auth credential
gql credentials create -c john -t basic-auth -s mysecret123

# Create key-auth credential
gql credentials create -c john -t key-auth -s mysecret123 --scope "read,write"

# Create OAuth2 credential
gql credentials create -c john -t oauth2 -s oauth_secret --scope admin
```

#### `gql credentials list`
List all credentials.

**Options:**
- `-c, --consumer-id <consumerId>` - Filter by consumer ID
- `--active-only` - Show only active credentials

**Examples:**
```bash
# List all credentials
gql credentials list

# List credentials for a specific user
gql credentials list -c john

# List only active credentials
gql credentials list --active-only
```

#### `gql credentials info <id>`
Get detailed information about a credential.

**Examples:**
```bash
gql credentials info 550e8400-e29b-41d4-a716-446655440000
```

#### `gql credentials update <id>`
Update a credential.

**Options:**
- `-s, --secret <secret>` - New secret
- `--scope <scope>` - New scope
- `--activate` - Activate the credential
- `--deactivate` - Deactivate the credential

**Examples:**
```bash
# Update secret
gql credentials update 550e8400-e29b-41d4-a716-446655440000 -s newsecret

# Update scope
gql credentials update 550e8400-e29b-41d4-a716-446655440000 --scope "read,write,admin"

# Deactivate credential
gql credentials update 550e8400-e29b-41d4-a716-446655440000 --deactivate
```

#### `gql credentials activate <id>`
Activate a credential.

**Examples:**
```bash
gql credentials activate 550e8400-e29b-41d4-a716-446655440000
```

#### `gql credentials deactivate <id>`
Deactivate a credential.

**Examples:**
```bash
gql credentials deactivate 550e8400-e29b-41d4-a716-446655440000
```

#### `gql credentials remove <id>`
Remove a credential.

**Options:**
- `-f, --force` - Skip confirmation

**Examples:**
```bash
# Remove with confirmation
gql credentials remove 550e8400-e29b-41d4-a716-446655440000

# Remove without confirmation
gql credentials remove 550e8400-e29b-41d4-a716-446655440000 --force
```

---

### Scopes Management

Manage API scopes.

#### `gql scopes create`
Create a new scope.

**Options:**
- `-n, --name <name>` - Scope name
- `-d, --description <description>` - Scope description

**Examples:**
```bash
# Interactive mode
gql scopes create

# With options
gql scopes create -n admin -d "Administrator access"
gql scopes create -n read -d "Read-only access"
```

#### `gql scopes list`
List all scopes.

**Examples:**
```bash
gql scopes list
```

#### `gql scopes info <name>`
Get detailed information about a scope.

**Examples:**
```bash
gql scopes info admin
```

#### `gql scopes update <name>`
Update a scope.

**Options:**
- `-d, --description <description>` - New description

**Examples:**
```bash
gql scopes update admin -d "Full administrator access with all permissions"
```

#### `gql scopes remove <name>`
Remove a scope.

**Options:**
- `-f, --force` - Skip confirmation

**Examples:**
```bash
# Remove with confirmation
gql scopes remove read

# Remove without confirmation
gql scopes remove read --force
```

---

### Gateway Management

Manage the GatewayQL server.

#### `gql gateway start`
Start the GatewayQL server.

**Options:**
- `-p, --port <port>` - Port to run on [default: 3000]
- `--dev` - Run in development mode
- `--debug` - Run in debug mode

**Examples:**
```bash
# Start in production mode
gql gateway start

# Start in development mode
gql gateway start --dev

# Start on custom port
gql gateway start -p 4000

# Start in debug mode
gql gateway start --debug
```

#### `gql gateway status`
Check the status of the GatewayQL server.

**Options:**
- `-p, --port <port>` - Port to check [default: 3000]

**Examples:**
```bash
# Check status on default port
gql gateway status

# Check status on custom port
gql gateway status -p 4000
```

#### `gql gateway stop`
Stop the GatewayQL server.

**Options:**
- `-p, --port <port>` - Port the server is running on [default: 3000]

**Examples:**
```bash
# Stop server on default port
gql gateway stop

# Stop server on custom port
gql gateway stop -p 4000
```

#### `gql gateway config`
Display gateway configuration.

**Examples:**
```bash
gql gateway config
```

---

## Environment Variables

The CLI uses the following environment variables:

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_USERNAME` - Database username (default: postgres)
- `DB_PASSWORD` - Database password (default: postgres)
- `DB_DATABASE` - Database name (default: gatewayql)
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `JWT_SECRET` - JWT secret for authentication
- `NODE_ENV` - Node environment (development, production, test)

You can set these in a `.env` file in the project root.

---

## Command Aliases

For convenience, the following aliases are available:

- `gql user` → `gql users`
- `gql credential` → `gql credentials`
- `gql scope` → `gql scopes`

**Examples:**
```bash
gql user list
gql credential create
gql scope info admin
```

---

## Getting Help

To get help for any command, use the `--help` flag:

```bash
gql --help
gql users --help
gql credentials create --help
```

---

## Examples Workflow

Here's a typical workflow for setting up users and credentials:

```bash
# 1. Create a scope
gql scopes create -n "api:read" -d "API read access"

# 2. Create a user
gql users create -u john -e john@example.com -p secret123 -r user

# 3. Create a credential for the user
gql credentials create -c john -t key-auth -s mysecret123 --scope "api:read"

# 4. List all users
gql users list

# 5. List all credentials
gql credentials list

# 6. Check gateway status
gql gateway status

# 7. Start the gateway
gql gateway start --dev
```

---

## Notes

- All commands that modify data (create, update, remove) will show a confirmation prompt unless the `--force` flag is used.
- Sensitive information (passwords, secrets) is never displayed in list or info commands.
- When creating credentials, the secret is shown only once. Make sure to save it securely.
- The CLI requires a running PostgreSQL database connection.
