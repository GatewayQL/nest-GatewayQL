# Contributing to Nest GatewayQL

First off, thank you for considering contributing to Nest GatewayQL! It's people like you that make Nest GatewayQL such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Style Guides](#style-guides)
  - [Git Commit Messages](#git-commit-messages)
  - [TypeScript Style Guide](#typescript-style-guide)
  - [Documentation Style Guide](#documentation-style-guide)
- [Development Setup](#development-setup)
- [Testing Guidelines](#testing-guidelines)

## Code of Conduct

This project and everyone participating in it is governed by the [Nest GatewayQL Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@gatewayql.com](mailto:conduct@gatewayql.com).

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for Nest GatewayQL. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

**Before Submitting A Bug Report:**

- Check the [documentation](https://gatewayql.github.io/nest-GatewayQL) for tips
- Check if the issue has already been reported in [Issues](https://github.com/GatewayQL/nest-GatewayQL/issues)
- Update to the latest version and see if the problem persists
- Collect debugging information (logs, environment details, etc.)

**How Do I Submit A Good Bug Report?**

Bugs are tracked as [GitHub issues](https://github.com/GatewayQL/nest-GatewayQL/issues). Create an issue using the bug report template and provide the following information:

- **Use a clear and descriptive title** for the issue
- **Describe the exact steps to reproduce the problem** in as many details as possible
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** after following the steps
- **Explain which behavior you expected to see instead** and why
- **Include screenshots and logs** if relevant
- **Include your environment details**: Node.js version, OS, database version, etc.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Nest GatewayQL, including completely new features and minor improvements to existing functionality.

**Before Submitting An Enhancement Suggestion:**

- Check if the enhancement has already been suggested in [Issues](https://github.com/GatewayQL/nest-GatewayQL/issues)
- Check if the enhancement might already be available in the latest version
- Review the [roadmap](https://github.com/GatewayQL/nest-GatewayQL/projects) to see if it's already planned

**How Do I Submit A Good Enhancement Suggestion?**

Enhancement suggestions are tracked as [GitHub issues](https://github.com/GatewayQL/nest-GatewayQL/issues). Create an issue using the feature request template and provide the following information:

- **Use a clear and descriptive title** for the issue
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most Nest GatewayQL users
- **List some examples** of how the enhancement would be used
- **Specify the current behavior** and explain how the enhancement would change it

### Your First Code Contribution

Unsure where to begin contributing to Nest GatewayQL? You can start by looking through these `good-first-issue` and `help-wanted` issues:

- [Good first issues](https://github.com/GatewayQL/nest-GatewayQL/labels/good%20first%20issue) - issues which should only require a few lines of code
- [Help wanted issues](https://github.com/GatewayQL/nest-GatewayQL/labels/help%20wanted) - issues which may be more involved

### Pull Requests

The process described here has several goals:

- Maintain Nest GatewayQL's quality
- Fix problems that are important to users
- Engage the community in working toward the best possible Nest GatewayQL
- Enable a sustainable system for maintainers to review contributions

Please follow these steps:

1. **Fork the repository** and create your branch from `main`
2. **Follow the development setup** instructions below
3. **Make your changes** following our style guides
4. **Add tests** for your changes
5. **Ensure all tests pass** (`npm test`)
6. **Update documentation** if needed
7. **Commit your changes** using a descriptive commit message
8. **Push to your fork** and submit a pull request
9. **Wait for review** and address any feedback

**Pull Request Checklist:**

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code commented where necessary
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added that prove the fix/feature works
- [ ] All tests pass locally
- [ ] Changes generate no new errors

## Style Guides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider starting the commit message with an applicable emoji:
  - :sparkles: `:sparkles:` when adding a new feature
  - :bug: `:bug:` when fixing a bug
  - :memo: `:memo:` when writing docs
  - :art: `:art:` when improving the format/structure of the code
  - :fire: `:fire:` when removing code or files
  - :racehorse: `:racehorse:` when improving performance
  - :white_check_mark: `:white_check_mark:` when adding tests
  - :lock: `:lock:` when dealing with security
  - :arrow_up: `:arrow_up:` when upgrading dependencies
  - :arrow_down: `:arrow_down:` when downgrading dependencies
  - :shirt: `:shirt:` when removing linter warnings

### TypeScript Style Guide

All TypeScript code must adhere to the project's ESLint configuration:

- Use TypeScript for all new code
- Follow functional programming principles where possible
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Use strong typing, avoid `any` when possible
- Use modern ES6+ features
- Keep functions small and focused
- Use async/await over promises chains
- Handle errors properly with try/catch
- Follow NestJS best practices for decorators and modules

**Example:**

```typescript
/**
 * Creates a new user in the system
 * @param createUserInput - The user data to create
 * @returns The created user entity
 * @throws {BadRequestException} If the user already exists
 */
async createUser(createUserInput: CreateUserInput): Promise<UserEntity> {
  const existingUser = await this.findByEmail(createUserInput.email);

  if (existingUser) {
    throw new BadRequestException('User already exists');
  }

  const hashedPassword = await this.hashPassword(createUserInput.password);
  return this.userRepository.save({
    ...createUserInput,
    password: hashedPassword,
  });
}
```

### Documentation Style Guide

- Use [Markdown](https://guides.github.com/features/mastering-markdown/)
- Reference functions and classes with backticks: \`functionName()\`
- Use code blocks with language specification
- Keep line length to 80-100 characters when possible
- Use proper headings hierarchy
- Include examples where appropriate

## Development Setup

1. **Fork and clone the repository:**

```bash
git clone https://github.com/YOUR_USERNAME/nest-GatewayQL.git
cd nest-GatewayQL
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start PostgreSQL (using Docker):**

```bash
docker-compose -f docker-compose-postgres.yml up -d
```

5. **Run the application:**

```bash
npm run start:dev
```

6. **Verify the setup:**

- GraphQL Playground: http://localhost:3000/graphql
- Health Check: http://localhost:3000/health

## Testing Guidelines

We use Jest for testing. All code contributions should include appropriate tests.

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

### Writing Tests

- Write tests for all new features and bug fixes
- Follow the Arrange-Act-Assert (AAA) pattern
- Use descriptive test names
- Mock external dependencies
- Aim for high test coverage (>80%)
- Test both success and failure scenarios

**Example:**

```typescript
describe('UsersService', () => {
  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const createUserInput: CreateUserInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      // Act
      const result = await service.createUser(createUserInput);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(createUserInput.email);
      expect(result.password).not.toBe(createUserInput.password); // Should be hashed
    });

    it('should throw BadRequestException when user already exists', async () => {
      // Arrange
      const createUserInput: CreateUserInput = {
        email: 'existing@example.com',
        username: 'existinguser',
        password: 'password123',
      };

      jest.spyOn(service, 'findByEmail').mockResolvedValue({} as UserEntity);

      // Act & Assert
      await expect(service.createUser(createUserInput)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
```

## Additional Notes

### Issue and Pull Request Labels

This section lists the labels we use to help us track and manage issues and pull requests.

- `bug` - Confirmed bugs or reports likely to be bugs
- `enhancement` - Feature requests
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested
- `wontfix` - This will not be worked on
- `duplicate` - This issue or pull request already exists
- `invalid` - This doesn't seem right

## Getting Help

If you need help, you can:

- Check the [documentation](https://gatewayql.github.io/nest-GatewayQL)
- Ask a question in [Discussions](https://github.com/GatewayQL/nest-GatewayQL/discussions)
- Join our [Discord community](https://discord.gg/gatewayql)
- Contact the maintainers directly

## Recognition

Contributors will be recognized in our [CHANGELOG.md](CHANGELOG.md) and on our [Contributors page](https://github.com/GatewayQL/nest-GatewayQL/graphs/contributors).

Thank you for contributing to Nest GatewayQL! 🎉
