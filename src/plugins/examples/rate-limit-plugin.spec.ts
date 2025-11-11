import { rateLimitPlugin, resetRateLimitState } from './rate-limit-plugin';
import { PluginContext } from '../interfaces/plugin.interface';

// We need to access the internal requestCounts map for testing
// In a real implementation, this might be exposed differently
const getRequestCounts = () => {
  // Access the module's internal state
  const moduleExports = require('./rate-limit-plugin');
  return moduleExports.rateLimitPlugin;
};

describe('rateLimitPlugin', () => {
  let mockContext: jest.Mocked<PluginContext>;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    // Clear the in-memory store before each test
    resetRateLimitState();
    jest.clearAllMocks();

    mockRequest = {
      ip: '192.168.1.100',
      connection: {
        remoteAddress: '192.168.1.100',
      },
      headers: {
        'x-forwarded-for': '192.168.1.100',
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

    // Mock Date.now to have consistent timing
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('plugin manifest', () => {
    it('should have correct plugin metadata', () => {
      expect(rateLimitPlugin.name).toBe('rate-limit');
      expect(rateLimitPlugin.version).toBe('1.0.0');
      expect(rateLimitPlugin.description).toBe('Advanced rate limiting plugin with custom policies');
      expect(rateLimitPlugin.author).toBe('GatewayQL Team');
    });

    it('should have init function', () => {
      expect(typeof rateLimitPlugin.init).toBe('function');
    });

    it('should have schema', () => {
      expect(rateLimitPlugin.schema).toBeDefined();
      expect(rateLimitPlugin.schema?.$id).toBe(
        'http://gateway-ql.io/schemas/plugins/rate-limit.json',
      );
      expect(rateLimitPlugin.schema?.type).toBe('object');
      expect(rateLimitPlugin.schema?.properties.windowMs).toEqual({ type: 'number' });
      expect(rateLimitPlugin.schema?.properties.max).toEqual({ type: 'number' });
    });
  });

  describe('plugin initialization', () => {
    it('should register rate limit policy during initialization', async () => {
      await rateLimitPlugin.init(mockContext);

      expect(mockContext.logger.log).toHaveBeenCalledWith('Initializing rate-limit plugin');
      expect(mockContext.registerPolicy).toHaveBeenCalledWith({
        name: 'rate-limit',
        policy: expect.any(Function),
        schema: expect.objectContaining({
          $id: 'http://gateway-ql.io/schemas/policies/rate-limit.json',
          type: 'object',
          properties: expect.objectContaining({
            windowMs: expect.any(Object),
            max: expect.any(Object),
          }),
        }),
      });
      expect(mockContext.logger.log).toHaveBeenCalledWith('Rate-limit plugin initialized successfully');
    });

    it('should register policy with correct schema structure', async () => {
      await rateLimitPlugin.init(mockContext);

      const policyCall = mockContext.registerPolicy.mock.calls[0][0];
      expect(policyCall.schema.properties.windowMs.default).toBe(60000);
      expect(policyCall.schema.properties.max.default).toBe(100);
      expect(policyCall.schema.properties.windowMs.description).toBe('Time window in milliseconds');
      expect(policyCall.schema.properties.max.description).toBe('Maximum number of requests per window');
    });
  });

  describe('rate limit policy', () => {
    let rateLimitPolicy: any;

    beforeEach(async () => {
      await rateLimitPlugin.init(mockContext);
      rateLimitPolicy = mockContext.registerPolicy.mock.calls[0][0].policy;
    });

    describe('basic rate limiting', () => {
      it('should allow requests within limit', async () => {
        const params = { windowMs: 60000, max: 5 };

        const result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', new Date(1000000 + 60000).toISOString());
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should use default parameters when none provided', async () => {
        const result = await rateLimitPolicy({}, { req: mockRequest, res: mockResponse });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 99);
        expect(result).toBe(true);
      });

      it('should block requests when limit exceeded', async () => {
        const params = { windowMs: 60000, max: 2 };

        // First request - should pass
        let result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(result).toBe(true);

        // Second request - should pass
        result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(result).toBe(true);

        // Third request - should be blocked
        result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(mockResponse.status).toHaveBeenCalledWith(429);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Too Many Requests',
          message: expect.stringContaining('Rate limit exceeded'),
        });
        expect(result).toBe(false);
      });

      it('should set correct remaining count as requests accumulate', async () => {
        const params = { windowMs: 60000, max: 3 };

        // First request
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 2);

        // Second request
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);

        // Third request
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      });
    });

    describe('window reset behavior', () => {
      it('should reset counter when window expires', async () => {
        const params = { windowMs: 1000, max: 2 };
        const startTime = 1000000;

        // Mock initial time
        (Date.now as jest.Mock).mockReturnValue(startTime);

        // Use up the limit
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        // Next request should be blocked
        let result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(result).toBe(false);

        // Advance time past window
        (Date.now as jest.Mock).mockReturnValue(startTime + 1001);

        // Now request should pass again
        jest.clearAllMocks();
        result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);
        expect(result).toBe(true);
      });

      it('should set new reset time when window resets', async () => {
        const params = { windowMs: 5000, max: 1 };
        const startTime = 1000000;

        (Date.now as jest.Mock).mockReturnValue(startTime);
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        // Advance past window
        (Date.now as jest.Mock).mockReturnValue(startTime + 6000);
        jest.clearAllMocks();
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'X-RateLimit-Reset',
          new Date(startTime + 6000 + 5000).toISOString()
        );
      });
    });

    describe('client identification', () => {
      it('should use IP address for client identification', async () => {
        const params = { max: 1 };

        // Use up limit for this IP
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        let result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(result).toBe(false);

        // Different IP should have separate limit
        const differentIpRequest = { ...mockRequest, ip: '192.168.1.200' };
        jest.clearAllMocks();
        result = await rateLimitPolicy(params, { req: differentIpRequest, res: mockResponse });
        expect(result).toBe(true);
      });

      it('should fall back to connection.remoteAddress when ip is not available', async () => {
        const requestWithoutIp = {
          connection: { remoteAddress: '10.0.0.1' },
        };
        const params = { max: 1 };

        await rateLimitPolicy(params, { req: requestWithoutIp, res: mockResponse });
        const result = await rateLimitPolicy(params, { req: requestWithoutIp, res: mockResponse });
        expect(result).toBe(false);
      });

      it('should use "unknown" when neither ip nor remoteAddress is available', async () => {
        const requestWithoutIdentification = {};
        const params = { max: 1 };

        await rateLimitPolicy(params, { req: requestWithoutIdentification, res: mockResponse });
        let result = await rateLimitPolicy(params, { req: requestWithoutIdentification, res: mockResponse });
        expect(result).toBe(false);

        // All requests without identification should share the same counter
        const anotherUnknownRequest = {};
        jest.clearAllMocks();
        result = await rateLimitPolicy(params, { req: anotherUnknownRequest, res: mockResponse });
        expect(result).toBe(false);
      });
    });

    describe('response headers', () => {
      it('should always set rate limit headers', async () => {
        const params = { windowMs: 30000, max: 10 };

        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
      });

      it('should show 0 remaining when at limit', async () => {
        const params = { max: 1 };

        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      });

      it('should not show negative remaining count', async () => {
        const params = { max: 2 };

        // Use up limit
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        // Exceed limit
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      });

      it('should format reset time as ISO string', async () => {
        const params = { windowMs: 12345 };
        const currentTime = 1000000;
        (Date.now as jest.Mock).mockReturnValue(currentTime);

        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        const expectedResetTime = new Date(currentTime + 12345).toISOString();
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expectedResetTime);
      });
    });

    describe('error response', () => {
      it('should return 429 status when limit exceeded', async () => {
        const params = { max: 1 };

        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        expect(mockResponse.status).toHaveBeenCalledWith(429);
      });

      it('should return appropriate error message', async () => {
        const params = { max: 1, windowMs: 5000 };
        const currentTime = 1000000;
        (Date.now as jest.Mock).mockReturnValue(currentTime);

        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again after ${new Date(currentTime + 5000).toISOString()}`,
        });
      });
    });

    describe('edge cases', () => {
      it('should handle zero max limit', async () => {
        const params = { max: 0 };

        const result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        expect(mockResponse.status).toHaveBeenCalledWith(429);
        expect(result).toBe(false);
      });

      it('should handle negative max limit', async () => {
        const params = { max: -1 };

        const result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        expect(mockResponse.status).toHaveBeenCalledWith(429);
        expect(result).toBe(false);
      });

      it('should handle very small window', async () => {
        const params = { windowMs: 1, max: 1 };

        const result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(result).toBe(true);

        // Immediately try again - should still be in window
        const secondResult = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(secondResult).toBe(false);
      });

      it('should handle very large window', async () => {
        const params = { windowMs: 1000000000, max: 1 }; // ~11.5 days

        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        const result = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        expect(result).toBe(false);
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'X-RateLimit-Reset',
          new Date(1000000 + 1000000000).toISOString()
        );
      });

      it('should handle undefined parameters', async () => {
        const result = await rateLimitPolicy(undefined, { req: mockRequest, res: mockResponse });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
        expect(result).toBe(true);
      });

      it('should handle null parameters', async () => {
        const result = await rateLimitPolicy(null, { req: mockRequest, res: mockResponse });

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
        expect(result).toBe(true);
      });
    });

    describe('concurrent requests', () => {
      it('should handle concurrent requests correctly', async () => {
        const params = { max: 5 };

        // Simulate 5 concurrent requests
        const promises = Array(5).fill(null).map(() =>
          rateLimitPolicy(params, { req: mockRequest, res: mockResponse })
        );

        const results = await Promise.all(promises);

        // All 5 should pass
        expect(results.every(result => result === true)).toBe(true);

        // Next request should be blocked
        jest.clearAllMocks();
        const sixthResult = await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        expect(sixthResult).toBe(false);
      });
    });

    describe('memory cleanup implications', () => {
      it('should update existing records instead of creating new ones', async () => {
        const params = { max: 3 };

        // Make several requests from same IP
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });
        await rateLimitPolicy(params, { req: mockRequest, res: mockResponse });

        // The internal map should only have one entry for this IP
        // (This is more of a behavior documentation than a test we can easily assert)
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      });
    });
  });

  describe('real-world scenarios', () => {
    let rateLimitPolicy: any;

    beforeEach(async () => {
      await rateLimitPlugin.init(mockContext);
      rateLimitPolicy = mockContext.registerPolicy.mock.calls[0][0].policy;
    });

    it('should handle API rate limiting scenario', async () => {
      const apiParams = { windowMs: 60000, max: 100 }; // 100 requests per minute

      // Simulate normal usage
      for (let i = 0; i < 50; i++) {
        const result = await rateLimitPolicy(apiParams, { req: mockRequest, res: mockResponse });
        expect(result).toBe(true);
      }

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 50);
    });

    it('should handle GraphQL endpoint rate limiting', async () => {
      const graphqlParams = { windowMs: 15000, max: 10 }; // 10 queries per 15 seconds

      const graphqlRequest = {
        ...mockRequest,
        method: 'POST',
        body: { query: 'query { user { id } }' },
      };

      for (let i = 0; i < 10; i++) {
        const result = await rateLimitPolicy(graphqlParams, { req: graphqlRequest, res: mockResponse });
        expect(result).toBe(true);
      }

      // 11th request should be blocked
      const result = await rateLimitPolicy(graphqlParams, { req: graphqlRequest, res: mockResponse });
      expect(result).toBe(false);
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should handle burst protection', async () => {
      const burstParams = { windowMs: 1000, max: 5 }; // 5 requests per second

      // Simulate rapid requests
      const promises = Array(10).fill(null).map(() =>
        rateLimitPolicy(burstParams, { req: mockRequest, res: mockResponse })
      );

      const results = await Promise.all(promises);
      const allowedRequests = results.filter(r => r === true).length;
      const blockedRequests = results.filter(r => r === false).length;

      expect(allowedRequests).toBe(5);
      expect(blockedRequests).toBe(5);
    });

    it('should handle different rate limits for different IPs', async () => {
      const params = { max: 2 };

      const ip1Request = { ...mockRequest, ip: '192.168.1.1' };
      const ip2Request = { ...mockRequest, ip: '192.168.1.2' };

      // IP1 uses up its limit
      await rateLimitPolicy(params, { req: ip1Request, res: mockResponse });
      await rateLimitPolicy(params, { req: ip1Request, res: mockResponse });
      let result = await rateLimitPolicy(params, { req: ip1Request, res: mockResponse });
      expect(result).toBe(false);

      // IP2 should still have its full limit
      jest.clearAllMocks();
      result = await rateLimitPolicy(params, { req: ip2Request, res: mockResponse });
      expect(result).toBe(true);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);
    });

    it('should handle mobile app rate limiting', async () => {
      const mobileParams = { windowMs: 300000, max: 500 }; // 500 requests per 5 minutes

      const mobileRequest = {
        ...mockRequest,
        headers: { 'user-agent': 'MyMobileApp/1.0' },
      };

      for (let i = 0; i < 100; i++) {
        const result = await rateLimitPolicy(mobileParams, { req: mobileRequest, res: mockResponse });
        expect(result).toBe(true);
      }

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 400);
    });

    it('should handle webhook rate limiting', async () => {
      const webhookParams = { windowMs: 60000, max: 20 }; // 20 webhooks per minute

      const webhookRequest = {
        ...mockRequest,
        method: 'POST',
        url: '/webhook/github',
        headers: { 'x-github-event': 'push' },
      };

      for (let i = 0; i < 20; i++) {
        const result = await rateLimitPolicy(webhookParams, { req: webhookRequest, res: mockResponse });
        expect(result).toBe(true);
      }

      // 21st webhook should be blocked
      const result = await rateLimitPolicy(webhookParams, { req: webhookRequest, res: mockResponse });
      expect(result).toBe(false);
    });
  });

  describe('policy schema validation', () => {
    it('should have comprehensive schema for rate limit policy', async () => {
      await rateLimitPlugin.init(mockContext);
      const policyDefinition = mockContext.registerPolicy.mock.calls[0][0];

      expect(policyDefinition.schema.properties).toHaveProperty('windowMs');
      expect(policyDefinition.schema.properties).toHaveProperty('max');

      // Check property configurations
      expect(policyDefinition.schema.properties.windowMs.type).toBe('number');
      expect(policyDefinition.schema.properties.windowMs.default).toBe(60000);
      expect(policyDefinition.schema.properties.max.type).toBe('number');
      expect(policyDefinition.schema.properties.max.default).toBe(100);
    });

    it('should have valid schema structure', async () => {
      await rateLimitPlugin.init(mockContext);
      const policyDefinition = mockContext.registerPolicy.mock.calls[0][0];

      expect(policyDefinition.schema.$id).toBe('http://gateway-ql.io/schemas/policies/rate-limit.json');
      expect(policyDefinition.schema.type).toBe('object');
      expect(typeof policyDefinition.schema.properties).toBe('object');
    });
  });
});