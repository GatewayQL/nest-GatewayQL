import { corsPlugin } from './cors-plugin';
import { PluginContext, PolicyHandler } from '../interfaces/plugin.interface';

describe('corsPlugin', () => {
  let mockContext: jest.Mocked<PluginContext>;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      headers: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
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

  describe('plugin manifest', () => {
    it('should have correct plugin metadata', () => {
      expect(corsPlugin.name).toBe('cors');
      expect(corsPlugin.version).toBe('1.0.0');
      expect(corsPlugin.description).toBe('Advanced CORS policy plugin');
      expect(corsPlugin.author).toBe('GatewayQL Team');
    });

    it('should have init function', () => {
      expect(typeof corsPlugin.init).toBe('function');
    });

    it('should have schema', () => {
      expect(corsPlugin.schema).toBeDefined();
      expect(corsPlugin.schema?.$id).toBe(
        'http://gateway-ql.io/schemas/plugins/cors.json',
      );
      expect(corsPlugin.schema?.type).toBe('object');
    });
  });

  describe('plugin initialization', () => {
    it('should register CORS policy during initialization', async () => {
      await corsPlugin.init(mockContext);

      expect(mockContext.logger.log).toHaveBeenCalledWith('Initializing CORS plugin');
      expect(mockContext.registerPolicy).toHaveBeenCalledWith({
        name: 'cors',
        policy: expect.any(Function),
        schema: expect.objectContaining({
          $id: 'http://gateway-ql.io/schemas/policies/cors.json',
          type: 'object',
          properties: expect.objectContaining({
            origin: expect.any(Object),
            methods: expect.any(Object),
            allowedHeaders: expect.any(Object),
            credentials: expect.any(Object),
            maxAge: expect.any(Object),
          }),
        }),
      });
      expect(mockContext.logger.log).toHaveBeenCalledWith('CORS plugin initialized successfully');
    });

    it('should register policy with correct schema structure', async () => {
      await corsPlugin.init(mockContext);

      const policyCall = mockContext.registerPolicy.mock.calls[0][0];
      expect(policyCall.schema.properties.origin.default).toBe('*');
      expect(policyCall.schema.properties.credentials.default).toBe(false);
      expect(policyCall.schema.properties.maxAge.default).toBe(86400);
    });
  });

  describe('CORS policy handler', () => {
    let corsPolicy: PolicyHandler;

    beforeEach(async () => {
      await corsPlugin.init(mockContext);
      corsPolicy = mockContext.registerPolicy.mock.calls[0][0].policy as PolicyHandler;
    });

    describe('OPTIONS preflight requests', () => {
      beforeEach(() => {
        mockRequest.method = 'OPTIONS';
      });

      it('should handle OPTIONS with default settings', async () => {
        const result = await corsPolicy({}, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE, OPTIONS',
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization',
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
        expect(mockResponse.status).toHaveBeenCalledWith(204);
        expect(mockResponse.end).toHaveBeenCalled();
        expect(result).toBe(false); // Should stop execution for OPTIONS
      });

      it('should handle OPTIONS with custom origin', async () => {
        const params = { origin: 'https://example.com' };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Origin',
          'https://example.com',
        );
      });

      it('should handle OPTIONS with custom methods', async () => {
        const params = { methods: ['GET', 'POST'] };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Methods',
          'GET, POST',
        );
      });

      it('should handle OPTIONS with custom headers', async () => {
        const params = { allowedHeaders: ['X-Custom-Header', 'Authorization'] };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Headers',
          'X-Custom-Header, Authorization',
        );
      });

      it('should handle OPTIONS with credentials enabled', async () => {
        const params = { credentials: true };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      });

      it('should handle OPTIONS with custom maxAge', async () => {
        const params = { maxAge: 3600 };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '3600');
      });

      it('should not set credentials header when disabled', async () => {
        const params = { credentials: false };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', expect.anything());
      });

      it('should handle complex configuration', async () => {
        const params = {
          origin: 'https://my-app.com',
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
          credentials: true,
          maxAge: 7200,
        };

        const result = await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://my-app.com');
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE',
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, X-API-Key',
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '7200');
        expect(mockResponse.status).toHaveBeenCalledWith(204);
        expect(mockResponse.end).toHaveBeenCalled();
        expect(result).toBe(false);
      });
    });

    describe('Regular HTTP requests', () => {
      beforeEach(() => {
        mockRequest.method = 'GET';
      });

      it('should set CORS headers for regular requests', async () => {
        const result = await corsPolicy({}, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.end).not.toHaveBeenCalled();
        expect(result).toBe(true); // Should continue execution
      });

      it('should set custom origin for regular requests', async () => {
        const params = { origin: 'https://trusted-domain.com' };
        const result = await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Origin',
          'https://trusted-domain.com',
        );
        expect(result).toBe(true);
      });

      it('should set credentials header when enabled', async () => {
        const params = { credentials: true };
        const result = await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
        expect(result).toBe(true);
      });

      it('should not set credentials header when disabled', async () => {
        const params = { credentials: false };
        const result = await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(mockResponse.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', expect.anything());
        expect(result).toBe(true);
      });
    });

    describe('different HTTP methods', () => {
      it('should handle POST requests', async () => {
        mockRequest.method = 'POST';
        const result = await corsPolicy({}, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(result).toBe(true);
      });

      it('should handle PUT requests', async () => {
        mockRequest.method = 'PUT';
        const result = await corsPolicy({}, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(result).toBe(true);
      });

      it('should handle DELETE requests', async () => {
        mockRequest.method = 'DELETE';
        const result = await corsPolicy({}, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(result).toBe(true);
      });

      it('should handle PATCH requests', async () => {
        mockRequest.method = 'PATCH';
        const result = await corsPolicy({}, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(result).toBe(true);
      });

      it('should handle HEAD requests', async () => {
        mockRequest.method = 'HEAD';
        const result = await corsPolicy({}, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(result).toBe(true);
      });
    });

    describe('edge cases and error handling', () => {
      it('should handle missing parameters gracefully', async () => {
        const result = await corsPolicy(undefined, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(result).toBe(true);
      });

      it('should handle null parameters', async () => {
        const result = await corsPolicy(null, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(result).toBe(true);
      });

      it('should handle empty methods array', async () => {
        mockRequest.method = 'OPTIONS';
        const params = { methods: [] };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', '');
      });

      it('should handle empty allowedHeaders array', async () => {
        mockRequest.method = 'OPTIONS';
        const params = { allowedHeaders: [] };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', '');
      });

      it('should handle zero maxAge', async () => {
        mockRequest.method = 'OPTIONS';
        const params = { maxAge: 0 };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '0');
      });

      it('should handle negative maxAge', async () => {
        mockRequest.method = 'OPTIONS';
        const params = { maxAge: -1 };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '-1');
      });

      it('should handle non-string origin', async () => {
        const params = { origin: 123 as any };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 123);
      });

      it('should handle mixed types in methods array', async () => {
        mockRequest.method = 'OPTIONS';
        const params = { methods: ['GET', 123, 'POST'] as any };
        await corsPolicy(params, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, 123, POST');
      });
    });

    describe('real-world scenarios', () => {
      it('should handle development CORS configuration', async () => {
        const devParams = {
          origin: 'http://localhost:3000',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
          credentials: true,
          maxAge: 86400,
        };

        mockRequest.method = 'OPTIONS';
        const result = await corsPolicy(devParams, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
        expect(result).toBe(false);
      });

      it('should handle production CORS configuration', async () => {
        const prodParams = {
          origin: 'https://myapp.com',
          methods: ['GET', 'POST'],
          allowedHeaders: ['Content-Type'],
          credentials: false,
          maxAge: 3600,
        };

        mockRequest.method = 'GET';
        const result = await corsPolicy(prodParams, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://myapp.com');
        expect(mockResponse.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', expect.anything());
        expect(result).toBe(true);
      });

      it('should handle API-only CORS configuration', async () => {
        const apiParams = {
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
          credentials: false,
          maxAge: 7200,
        };

        mockRequest.method = 'POST';
        const result = await corsPolicy(apiParams, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(result).toBe(true);
      });

      it('should handle GraphQL endpoint CORS', async () => {
        const graphqlParams = {
          origin: ['https://app.example.com', 'https://admin.example.com'],
          methods: ['POST', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          credentials: true,
          maxAge: 600,
        };

        mockRequest.method = 'OPTIONS';
        await corsPlugin.init(mockContext);
        const policy = mockContext.registerPolicy.mock.calls[0][0].policy as PolicyHandler;

        // Note: The current implementation doesn't handle array origins,
        // it would need enhancement to support this
        const result = await policy(graphqlParams, { req: mockRequest, res: mockResponse, next: jest.fn() });

        expect(result).toBe(false); // OPTIONS should stop execution
      });
    });
  });

  describe('policy schema validation', () => {
    it('should have comprehensive schema for policy configuration', async () => {
      await corsPlugin.init(mockContext);
      const policyDefinition = mockContext.registerPolicy.mock.calls[0][0];

      expect(policyDefinition.schema.properties).toHaveProperty('origin');
      expect(policyDefinition.schema.properties).toHaveProperty('methods');
      expect(policyDefinition.schema.properties).toHaveProperty('allowedHeaders');
      expect(policyDefinition.schema.properties).toHaveProperty('credentials');
      expect(policyDefinition.schema.properties).toHaveProperty('maxAge');

      // Check default values
      expect(policyDefinition.schema.properties.origin.default).toBe('*');
      expect(policyDefinition.schema.properties.credentials.default).toBe(false);
      expect(policyDefinition.schema.properties.maxAge.default).toBe(86400);
    });

    it('should have valid schema structure', async () => {
      await corsPlugin.init(mockContext);
      const policyDefinition = mockContext.registerPolicy.mock.calls[0][0];

      expect(policyDefinition.schema.$id).toBe('http://gateway-ql.io/schemas/policies/cors.json');
      expect(policyDefinition.schema.type).toBe('object');
      expect(typeof policyDefinition.schema.properties).toBe('object');
    });
  });
});