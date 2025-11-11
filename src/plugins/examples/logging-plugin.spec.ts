import { loggingPlugin } from './logging-plugin';
import { PluginContext, GraphQLHookType, PolicyHandler } from '../interfaces/plugin.interface';

// Mock console.log to capture output
const originalConsoleLog = console.log;

describe('loggingPlugin', () => {
  let mockContext: jest.Mocked<PluginContext>;
  let mockRequest: any;
  let mockResponse: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    mockRequest = {
      method: 'GET',
      url: '/api/users',
      ip: '192.168.1.100',
      headers: {
        'user-agent': 'Mozilla/5.0',
        'authorization': 'Bearer token123',
        'content-type': 'application/json',
      },
      body: {
        query: 'query { user { id } }',
        variables: { id: 123 },
      },
    };

    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockContext = {
      registerPolicy: jest.fn(),
      registerCondition: jest.fn(),
      registerRoutes: jest.fn(),
      registerGraphQLHook: jest.fn(),
      registerProvider: jest.fn(),
      getConfig: jest.fn(),
      logger: {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      },
      settings: {},
    };
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('plugin manifest', () => {
    it('should have correct plugin metadata', () => {
      expect(loggingPlugin.name).toBe('logging');
      expect(loggingPlugin.version).toBe('1.0.0');
      expect(loggingPlugin.description).toBe('Advanced logging plugin for requests and GraphQL operations');
      expect(loggingPlugin.author).toBe('GatewayQL Team');
    });

    it('should have init function', () => {
      expect(typeof loggingPlugin.init).toBe('function');
    });

    it('should have schema', () => {
      expect(loggingPlugin.schema).toBeDefined();
      expect(loggingPlugin.schema?.$id).toBe(
        'http://gateway-ql.io/schemas/plugins/logging.json',
      );
      expect(loggingPlugin.schema?.type).toBe('object');
      expect(loggingPlugin.schema?.properties.level.enum).toEqual([
        'debug', 'info', 'warn', 'error'
      ]);
      expect(loggingPlugin.schema?.properties.level.default).toBe('info');
    });
  });

  describe('plugin initialization', () => {
    it('should register request logging policy during initialization', async () => {
      await loggingPlugin.init(mockContext);

      expect(mockContext.logger.log).toHaveBeenCalledWith('Initializing logging plugin');
      expect(mockContext.registerPolicy).toHaveBeenCalledWith({
        name: 'request-logging',
        policy: expect.any(Function),
        schema: expect.objectContaining({
          $id: 'http://gateway-ql.io/schemas/policies/request-logging.json',
          type: 'object',
          properties: expect.objectContaining({
            includeBody: expect.any(Object),
            includeHeaders: expect.any(Object),
          }),
        }),
      });
      expect(mockContext.logger.log).toHaveBeenCalledWith('Logging plugin initialized successfully');
    });

    it('should register GraphQL resolver middleware hook', async () => {
      await loggingPlugin.init(mockContext);

      const resolverHookCall = mockContext.registerGraphQLHook.mock.calls.find(
        call => call[0].type === GraphQLHookType.RESOLVER_MIDDLEWARE
      );

      expect(resolverHookCall).toBeTruthy();
      expect(resolverHookCall[0].type).toBe(GraphQLHookType.RESOLVER_MIDDLEWARE);
      expect(resolverHookCall[0].priority).toBe(10);
      expect(typeof resolverHookCall[0].handler).toBe('function');
    });

    it('should register subgraph request hook', async () => {
      await loggingPlugin.init(mockContext);

      const subgraphHookCall = mockContext.registerGraphQLHook.mock.calls.find(
        call => call[0].type === GraphQLHookType.SUBGRAPH_REQUEST
      );

      expect(subgraphHookCall).toBeTruthy();
      expect(subgraphHookCall[0].type).toBe(GraphQLHookType.SUBGRAPH_REQUEST);
      expect(subgraphHookCall[0].priority).toBe(10);
      expect(typeof subgraphHookCall[0].handler).toBe('function');
    });

    it('should register both GraphQL hooks with correct priority', async () => {
      await loggingPlugin.init(mockContext);

      expect(mockContext.registerGraphQLHook).toHaveBeenCalledTimes(2);
      mockContext.registerGraphQLHook.mock.calls.forEach(call => {
        expect(call[0].priority).toBe(10);
      });
    });
  });

  describe('request logging policy', () => {
    let requestLoggingPolicy: PolicyHandler;

    beforeEach(async () => {
      await loggingPlugin.init(mockContext);
      requestLoggingPolicy = mockContext.registerPolicy.mock.calls[0][0].policy as PolicyHandler;
    });

    describe('basic logging functionality', () => {
      it('should log basic request information with default settings', async () => {
        const result = await requestLoggingPolicy({}, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(consoleSpy).toHaveBeenCalledWith('[Request Log]', expect.stringContaining('timestamp'));
        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.method).toBe('GET');
        expect(logData.url).toBe('/api/users');
        expect(logData.ip).toBe('192.168.1.100');
        expect(logData.timestamp).toBeDefined();
        expect(logData.headers).toBeUndefined(); // Should not include headers by default
        expect(logData.body).toBeUndefined(); // Should not include body by default
        expect(result).toBe(true); // Should continue execution
      });

      it('should include current timestamp in ISO format', async () => {
        const beforeTime = Date.now();
        await requestLoggingPolicy({}, { req: mockRequest, res: mockResponse, next: jest.fn() });
        const afterTime = Date.now();

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        const timestampMs = new Date(logData.timestamp).getTime();
        expect(timestampMs).toBeGreaterThanOrEqual(beforeTime);
        expect(timestampMs).toBeLessThanOrEqual(afterTime);
      });

      it('should handle missing request properties gracefully', async () => {
        const partialRequest = { method: 'POST' };
        await requestLoggingPolicy({}, { req: partialRequest, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.method).toBe('POST');
        expect(logData.url).toBeUndefined();
        expect(logData.ip).toBeUndefined();
      });
    });

    describe('headers logging', () => {
      it('should include headers when includeHeaders is true', async () => {
        const params = { includeHeaders: true };
        await requestLoggingPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.headers).toEqual(mockRequest.headers);
        expect(logData.headers['user-agent']).toBe('Mozilla/5.0');
        expect(logData.headers['authorization']).toBe('Bearer token123');
      });

      it('should not include headers when includeHeaders is false', async () => {
        const params = { includeHeaders: false };
        await requestLoggingPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.headers).toBeUndefined();
      });

      it('should not include headers when includeHeaders is undefined', async () => {
        const params = {};
        await requestLoggingPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.headers).toBeUndefined();
      });

      it('should handle empty headers object', async () => {
        const requestWithEmptyHeaders = { ...mockRequest, headers: {} };
        const params = { includeHeaders: true };
        await requestLoggingPolicy(params, { req: requestWithEmptyHeaders, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.headers).toEqual({});
      });

      it('should handle undefined headers', async () => {
        const requestWithoutHeaders = { ...mockRequest };
        delete requestWithoutHeaders.headers;
        const params = { includeHeaders: true };
        await requestLoggingPolicy(params, { req: requestWithoutHeaders, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.headers).toBeUndefined();
      });
    });

    describe('body logging', () => {
      it('should include body when includeBody is true', async () => {
        const params = { includeBody: true };
        await requestLoggingPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.body).toEqual(mockRequest.body);
        expect(logData.body.query).toBe('query { user { id } }');
        expect(logData.body.variables).toEqual({ id: 123 });
      });

      it('should not include body when includeBody is false', async () => {
        const params = { includeBody: false };
        await requestLoggingPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.body).toBeUndefined();
      });

      it('should not include body when includeBody is undefined', async () => {
        const params = {};
        await requestLoggingPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.body).toBeUndefined();
      });

      it('should handle empty body object', async () => {
        const requestWithEmptyBody = { ...mockRequest, body: {} };
        const params = { includeBody: true };
        await requestLoggingPolicy(params, { req: requestWithEmptyBody, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.body).toEqual({});
      });

      it('should handle undefined body', async () => {
        const requestWithoutBody = { ...mockRequest };
        delete requestWithoutBody.body;
        const params = { includeBody: true };
        await requestLoggingPolicy(params, { req: requestWithoutBody, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.body).toBeUndefined();
      });

      it('should handle string body', async () => {
        const requestWithStringBody = { ...mockRequest, body: 'raw string data' };
        const params = { includeBody: true };
        await requestLoggingPolicy(params, { req: requestWithStringBody, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.body).toBe('raw string data');
      });
    });

    describe('combined logging options', () => {
      it('should include both headers and body when both options are enabled', async () => {
        const params = { includeHeaders: true, includeBody: true };
        await requestLoggingPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.headers).toEqual(mockRequest.headers);
        expect(logData.body).toEqual(mockRequest.body);
        expect(logData.method).toBe('GET');
        expect(logData.url).toBe('/api/users');
        expect(logData.ip).toBe('192.168.1.100');
        expect(logData.timestamp).toBeDefined();
      });

      it('should handle mixed boolean and undefined options', async () => {
        const params = { includeHeaders: true };
        await requestLoggingPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        const logCall = consoleSpy.mock.calls[0][1];
        const logData = JSON.parse(logCall);

        expect(logData.headers).toEqual(mockRequest.headers);
        expect(logData.body).toBeUndefined();
      });
    });

    describe('different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

      methods.forEach(method => {
        it(`should log ${method} requests correctly`, async () => {
          const methodRequest = { ...mockRequest, method };
          await requestLoggingPolicy({}, { req: methodRequest, res: mockResponse, next: jest.fn() });

          const logCall = consoleSpy.mock.calls[0][1];
          const logData = JSON.parse(logCall);

          expect(logData.method).toBe(method);
        });
      });
    });

    describe('error handling', () => {
      it('should handle policy execution errors gracefully', async () => {
        const errorRequest = {
          get method() {
            throw new Error('Request property access error');
          }
        };

        // This should not throw, but might log incorrectly
        await expect(
          requestLoggingPolicy({}, { req: errorRequest, res: mockResponse, next: jest.fn() })
        ).rejects.toThrow('Request property access error');
      });

      it('should handle JSON serialization errors', async () => {
        // Create circular reference
        const circularRequest = { ...mockRequest };
        circularRequest.body = { circular: circularRequest };

        await expect(
          requestLoggingPolicy({ includeBody: true }, { req: circularRequest, res: mockResponse, next: jest.fn() })
        ).rejects.toThrow();
      });
    });
  });

  describe('GraphQL hooks', () => {
    let resolverMiddlewareHook: any;
    let subgraphRequestHook: any;

    beforeEach(async () => {
      await loggingPlugin.init(mockContext);

      const resolverHookCall = mockContext.registerGraphQLHook.mock.calls.find(
        call => call[0].type === GraphQLHookType.RESOLVER_MIDDLEWARE
      );
      const subgraphHookCall = mockContext.registerGraphQLHook.mock.calls.find(
        call => call[0].type === GraphQLHookType.SUBGRAPH_REQUEST
      );

      resolverMiddlewareHook = resolverHookCall[0].handler;
      subgraphRequestHook = subgraphHookCall[0].handler;
    });

    describe('resolver middleware hook', () => {
      it('should log resolver execution', () => {
        const hookContext = {
          info: { fieldName: 'getUser' },
          args: { id: '123' },
          context: { user: { id: 'user1' } },
        };

        const result = resolverMiddlewareHook(hookContext);

        expect(mockContext.logger.log).toHaveBeenCalledWith('GraphQL Resolver: getUser');
        expect(result).toBe(hookContext); // Should return the context
      });

      it('should handle missing info object', () => {
        const hookContext = {
          args: { id: '123' },
          context: { user: { id: 'user1' } },
        };

        const result = resolverMiddlewareHook(hookContext);

        expect(mockContext.logger.log).toHaveBeenCalledWith('GraphQL Resolver: undefined');
        expect(result).toBe(hookContext);
      });

      it('should handle missing fieldName', () => {
        const hookContext = {
          info: {},
          args: { id: '123' },
        };

        const result = resolverMiddlewareHook(hookContext);

        expect(mockContext.logger.log).toHaveBeenCalledWith('GraphQL Resolver: undefined');
        expect(result).toBe(hookContext);
      });

      it('should handle various field names', () => {
        const fieldNames = ['user', 'createPost', 'updateUser', 'deleteComment'];

        fieldNames.forEach(fieldName => {
          const hookContext = { info: { fieldName } };
          resolverMiddlewareHook(hookContext);

          expect(mockContext.logger.log).toHaveBeenCalledWith(`GraphQL Resolver: ${fieldName}`);
        });
      });
    });

    describe('subgraph request hook', () => {
      it('should log subgraph requests', () => {
        const hookContext = {
          subgraphName: 'user-service',
          request: { query: 'query { user { id } }' },
        };

        const result = subgraphRequestHook(hookContext);

        expect(mockContext.logger.log).toHaveBeenCalledWith('Subgraph Request: user-service');
        expect(result).toBe(hookContext); // Should return the context
      });

      it('should handle missing subgraphName', () => {
        const hookContext = {
          request: { query: 'query { user { id } }' },
        };

        const result = subgraphRequestHook(hookContext);

        expect(mockContext.logger.log).toHaveBeenCalledWith('Subgraph Request: undefined');
        expect(result).toBe(hookContext);
      });

      it('should handle various subgraph names', () => {
        const subgraphNames = ['user-service', 'post-service', 'auth-service', 'payment-gateway'];

        subgraphNames.forEach(subgraphName => {
          const hookContext = { subgraphName };
          subgraphRequestHook(hookContext);

          expect(mockContext.logger.log).toHaveBeenCalledWith(`Subgraph Request: ${subgraphName}`);
        });
      });

      it('should handle empty subgraph name', () => {
        const hookContext = { subgraphName: '' };
        const result = subgraphRequestHook(hookContext);

        expect(mockContext.logger.log).toHaveBeenCalledWith('Subgraph Request: ');
        expect(result).toBe(hookContext);
      });
    });

    describe('hook context preservation', () => {
      it('should preserve all properties in resolver hook context', () => {
        const originalContext = {
          info: { fieldName: 'test', fieldNodes: [] },
          args: { id: '123', name: 'test' },
          context: { user: { id: 'user1' }, request: mockRequest },
          source: { id: 'parent123' },
        };

        const result = resolverMiddlewareHook(originalContext);

        expect(result).toEqual(originalContext);
        expect(result).toBe(originalContext); // Should be the same object reference
      });

      it('should preserve all properties in subgraph hook context', () => {
        const originalContext = {
          subgraphName: 'test-service',
          request: {
            query: 'query { user { id } }',
            variables: { id: '123' },
            headers: { authorization: 'Bearer token' }
          },
          schema: {},
          context: { user: { id: 'user1' } },
        };

        const result = subgraphRequestHook(originalContext);

        expect(result).toEqual(originalContext);
        expect(result).toBe(originalContext); // Should be the same object reference
      });
    });
  });

  describe('policy schema validation', () => {
    it('should have comprehensive schema for request logging policy', async () => {
      await loggingPlugin.init(mockContext);
      const policyDefinition = mockContext.registerPolicy.mock.calls[0][0];

      expect(policyDefinition.schema.properties).toHaveProperty('includeBody');
      expect(policyDefinition.schema.properties).toHaveProperty('includeHeaders');

      // Check property configurations
      expect(policyDefinition.schema.properties.includeBody.type).toBe('boolean');
      expect(policyDefinition.schema.properties.includeBody.default).toBe(false);
      expect(policyDefinition.schema.properties.includeHeaders.type).toBe('boolean');
      expect(policyDefinition.schema.properties.includeHeaders.default).toBe(false);
    });

    it('should have valid schema structure', async () => {
      await loggingPlugin.init(mockContext);
      const policyDefinition = mockContext.registerPolicy.mock.calls[0][0];

      expect(policyDefinition.schema.$id).toBe('http://gateway-ql.io/schemas/policies/request-logging.json');
      expect(policyDefinition.schema.type).toBe('object');
      expect(typeof policyDefinition.schema.properties).toBe('object');
    });
  });

  describe('real-world integration scenarios', () => {
    it('should work with Express.js request objects', async () => {
      const expressRequest = {
        method: 'POST',
        url: '/graphql',
        ip: '::1',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'GraphQL Playground',
        },
        body: {
          query: 'mutation { createUser(input: { name: "John" }) { id name } }',
          variables: {},
        },
      };

      await loggingPlugin.init(mockContext);
      const policy = mockContext.registerPolicy.mock.calls[0][0].policy as PolicyHandler;
      const params = { includeHeaders: true, includeBody: true };

      const result = await policy(params, { req: expressRequest, res: mockResponse, next: jest.fn() });

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('[Request Log]', expect.stringContaining('mutation'));
    });

    it('should work in high-frequency logging scenarios', async () => {
      await loggingPlugin.init(mockContext);
      const policy = mockContext.registerPolicy.mock.calls[0][0].policy as PolicyHandler;

      // Simulate multiple concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) => {
        const request = { ...mockRequest, url: `/api/request-${i}` };
        return policy({}, { req: request, res: mockResponse, next: jest.fn() });
      });

      const results = await Promise.all(promises);

      expect(results.every(result => result === true)).toBe(true);
      expect(consoleSpy).toHaveBeenCalledTimes(10);
    });

    it('should handle GraphQL-specific request patterns', async () => {
      const graphqlRequest = {
        method: 'POST',
        url: '/graphql',
        ip: '127.0.0.1',
        headers: {
          'content-type': 'application/json',
          'apollo-require-preflight': 'true',
        },
        body: {
          query: `
            query GetUserProfile($userId: ID!) {
              user(id: $userId) {
                id
                name
                email
                posts {
                  id
                  title
                }
              }
            }
          `,
          variables: { userId: 'user-123' },
          operationName: 'GetUserProfile',
        },
      };

      await loggingPlugin.init(mockContext);
      const policy = mockContext.registerPolicy.mock.calls[0][0].policy as PolicyHandler;
      const params = { includeBody: true };

      const result = await policy(params, { req: graphqlRequest, res: mockResponse, next: jest.fn() });

      expect(result).toBe(true);
      const logCall = consoleSpy.mock.calls[0][1];
      const logData = JSON.parse(logCall);

      expect(logData.body.operationName).toBe('GetUserProfile');
      expect(logData.body.variables.userId).toBe('user-123');
    });
  });
});