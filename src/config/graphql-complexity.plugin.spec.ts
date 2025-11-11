import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { GraphQLError, GraphQLSchema, buildSchema, parse } from 'graphql';
import { ComplexityPlugin } from './graphql-complexity.plugin';
import { CustomLoggerService } from '../common/logger/logger.service';

describe('ComplexityPlugin', () => {
  let plugin: ComplexityPlugin;
  let logger: jest.Mocked<CustomLoggerService>;
  let mockSchema: GraphQLSchema;

  beforeEach(async () => {
    // Create a simple test schema
    mockSchema = buildSchema(`
      type Query {
        user(id: ID!): User
        users: [User!]!
      }

      type User {
        id: ID!
        name: String!
        posts: [Post!]!
      }

      type Post {
        id: ID!
        title: String!
        content: String!
      }
    `);

    const mockSchemaHost = {
      schema: mockSchema,
    };

    const mockLogger = {
      setContext: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplexityPlugin,
        {
          provide: GraphQLSchemaHost,
          useValue: mockSchemaHost,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    plugin = module.get<ComplexityPlugin>(ComplexityPlugin);
    logger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    // Reset environment variable
    delete process.env.MAX_QUERY_COMPLEXITY;
  });

  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });

  it('should set logger context on initialization', () => {
    expect(logger.setContext).toHaveBeenCalledWith('ComplexityPlugin');
  });

  describe('requestDidStart', () => {
    it('should return a request listener', async () => {
      const listener = await plugin.requestDidStart();
      expect(listener).toBeDefined();
      expect(listener.didResolveOperation).toBeDefined();
    });

    it('should use default max complexity when env var not set', async () => {
      const listener = await plugin.requestDidStart();
      const simpleQuery = parse('query { users { id name } }');

      const mockRequest = {
        operationName: undefined,
        variables: {},
      };

      // This should not throw as it's a simple query
      await expect(
        listener.didResolveOperation!({
          request: mockRequest,
          document: simpleQuery,
        } as any),
      ).resolves.not.toThrow();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Query complexity: \d+/),
      );
    });

    it('should use custom max complexity from env var', async () => {
      process.env.MAX_QUERY_COMPLEXITY = '50';

      const listener = await plugin.requestDidStart();
      const simpleQuery = parse('query { users { id } }');

      const mockRequest = {
        operationName: undefined,
        variables: {},
      };

      await expect(
        listener.didResolveOperation!({
          request: mockRequest,
          document: simpleQuery,
        } as any),
      ).resolves.not.toThrow();
    });

    it('should allow simple queries within complexity limit', async () => {
      process.env.MAX_QUERY_COMPLEXITY = '100';

      const listener = await plugin.requestDidStart();
      const simpleQuery = parse('query { user(id: "1") { id name } }');

      const mockRequest = {
        operationName: undefined,
        variables: {},
      };

      await expect(
        listener.didResolveOperation!({
          request: mockRequest,
          document: simpleQuery,
        } as any),
      ).resolves.not.toThrow();

      expect(logger.debug).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should reject queries exceeding complexity limit', async () => {
      process.env.MAX_QUERY_COMPLEXITY = '1';

      const listener = await plugin.requestDidStart();

      // This query will likely exceed complexity of 1
      const complexQuery = parse(`
        query {
          users {
            id
            name
            posts {
              id
              title
              content
            }
          }
        }
      `);

      const mockRequest = {
        operationName: undefined,
        variables: {},
      };

      await expect(
        listener.didResolveOperation!({
          request: mockRequest,
          document: complexQuery,
        } as any),
      ).rejects.toThrow(GraphQLError);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Query complexity \d+ exceeds maximum 1/),
      );
    });

    it('should throw GraphQLError with correct format when complexity exceeded', async () => {
      process.env.MAX_QUERY_COMPLEXITY = '1';

      const listener = await plugin.requestDidStart();
      const complexQuery = parse('query { users { id name } }');

      const mockRequest = {
        operationName: undefined,
        variables: {},
      };

      try {
        await listener.didResolveOperation!({
          request: mockRequest,
          document: complexQuery,
        } as any);
        fail('Expected GraphQLError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error.message).toContain('Query is too complex');
        expect(error.message).toContain('Maximum allowed complexity: 1');
        expect(error.extensions).toEqual({
          code: 'QUERY_TOO_COMPLEX',
          complexity: expect.any(Number),
          maxComplexity: 1,
        });
      }
    });

    it('should handle queries with operation names', async () => {
      process.env.MAX_QUERY_COMPLEXITY = '100';

      const listener = await plugin.requestDidStart();
      const namedQuery = parse('query GetUser($id: ID!) { user(id: $id) { id name } }');

      const mockRequest = {
        operationName: 'GetUser',
        variables: { id: '1' },
      };

      await expect(
        listener.didResolveOperation!({
          request: mockRequest,
          document: namedQuery,
        } as any),
      ).resolves.not.toThrow();

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle queries with variables', async () => {
      process.env.MAX_QUERY_COMPLEXITY = '100';

      const listener = await plugin.requestDidStart();
      const queryWithVars = parse('query GetUser($userId: ID!) { user(id: $userId) { id name } }');

      const mockRequest = {
        operationName: 'GetUser',
        variables: { userId: '123' },
      };

      await expect(
        listener.didResolveOperation!({
          request: mockRequest,
          document: queryWithVars,
        } as any),
      ).resolves.not.toThrow();
    });

    it('should handle invalid MAX_QUERY_COMPLEXITY env var', async () => {
      process.env.MAX_QUERY_COMPLEXITY = 'invalid';

      const listener = await plugin.requestDidStart();

      // Should fall back to default (100)
      expect(listener).toBeDefined();
    });

    it('should log complexity for debugging', async () => {
      const listener = await plugin.requestDidStart();
      const query = parse('query { users { id } }');

      const mockRequest = {
        operationName: undefined,
        variables: {},
      };

      await listener.didResolveOperation!({
        request: mockRequest,
        document: query,
      } as any);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Query complexity: \d+/),
      );
    });
  });
});