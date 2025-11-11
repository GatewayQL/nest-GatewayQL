import { methodCondition } from './method.condition';
import { ConditionContext } from '../../interfaces/plugin.interface';

describe('methodCondition', () => {
  const createMockContext = (method: string): ConditionContext => ({
    req: { method } as any,
    res: {} as any,
  });

  describe('definition', () => {
    it('should have correct name', () => {
      expect(methodCondition.name).toBe('method');
    });

    it('should have handler function', () => {
      expect(typeof methodCondition.handler).toBe('function');
    });

    it('should have schema', () => {
      expect(methodCondition.schema).toBeDefined();
      expect(methodCondition.schema?.$id).toBe(
        'http://express-gateway.io/schemas/conditions/method.json',
      );
      expect(methodCondition.schema?.type).toBe('string');
    });
  });

  describe('single method matching', () => {
    it('should match exact method (string config)', () => {
      const context = createMockContext('GET');
      const result = methodCondition.handler('GET', context);
      expect(result).toBe(true);
    });

    it('should not match different method (string config)', () => {
      const context = createMockContext('POST');
      const result = methodCondition.handler('GET', context);
      expect(result).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      const context = createMockContext('GET');
      const testCases = [
        { config: 'get', expected: true },
        { config: 'GET', expected: true },
        { config: 'Get', expected: true },
        { config: 'gEt', expected: true },
      ];

      testCases.forEach(({ config, expected }) => {
        const result = methodCondition.handler(config, context);
        expect(result).toBe(expected);
      });
    });

    it('should handle all standard HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

      methods.forEach(method => {
        const context = createMockContext(method);
        const result = methodCondition.handler(method, context);
        expect(result).toBe(true);
      });
    });
  });

  describe('multiple method matching', () => {
    it('should match any method in array', () => {
      const context = createMockContext('POST');
      const config = ['GET', 'POST', 'PUT'];
      const result = methodCondition.handler(config, context);
      expect(result).toBe(true);
    });

    it('should not match if method not in array', () => {
      const context = createMockContext('DELETE');
      const config = ['GET', 'POST', 'PUT'];
      const result = methodCondition.handler(config, context);
      expect(result).toBe(false);
    });

    it('should handle case-insensitive matching in arrays', () => {
      const context = createMockContext('POST');
      const testCases = [
        { config: ['get', 'post'], expected: true },
        { config: ['GET', 'POST'], expected: true },
        { config: ['Get', 'Post'], expected: true },
        { config: ['GET', 'put'], expected: false },
      ];

      testCases.forEach(({ config, expected }) => {
        const result = methodCondition.handler(config, context);
        expect(result).toBe(expected);
      });
    });

    it('should match first occurrence in array', () => {
      const context = createMockContext('GET');
      const config = ['GET', 'GET', 'POST']; // Duplicate GET
      const result = methodCondition.handler(config, context);
      expect(result).toBe(true);
    });

    it('should handle empty array', () => {
      const context = createMockContext('GET');
      const config: string[] = [];
      const result = methodCondition.handler(config, context);
      expect(result).toBe(false);
    });

    it('should handle single-element array', () => {
      const context = createMockContext('GET');
      const config = ['GET'];
      const result = methodCondition.handler(config, context);
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined method in request', () => {
      const context: ConditionContext = {
        req: { method: undefined } as any,
        res: {} as any,
      };
      const result = methodCondition.handler('GET', context);
      expect(result).toBe(false);
    });

    it('should handle null method in request', () => {
      const context: ConditionContext = {
        req: { method: null } as any,
        res: {} as any,
      };
      const result = methodCondition.handler('GET', context);
      expect(result).toBe(false);
    });

    it('should handle empty string method in request', () => {
      const context = createMockContext('');
      const result = methodCondition.handler('GET', context);
      expect(result).toBe(false);
    });

    it('should handle whitespace in method', () => {
      const context = createMockContext(' GET ');
      const result = methodCondition.handler('GET', context);
      expect(result).toBe(false); // Should not match due to whitespace
    });

    it('should handle non-standard HTTP methods', () => {
      const context = createMockContext('CUSTOM');
      const result = methodCondition.handler('CUSTOM', context);
      expect(result).toBe(true);
    });

    it('should handle numeric method (edge case)', () => {
      const context: ConditionContext = {
        req: { method: 123 as any },
        res: {} as any,
      };
      const result = methodCondition.handler('123', context);
      expect(result).toBe(true); // Both convert to uppercase strings
    });
  });

  describe('common HTTP method combinations', () => {
    it('should match safe methods', () => {
      const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

      safeMethods.forEach(method => {
        const context = createMockContext(method);
        const result = methodCondition.handler(safeMethods, context);
        expect(result).toBe(true);
      });

      // Test non-safe method
      const unsafeContext = createMockContext('POST');
      const result = methodCondition.handler(safeMethods, unsafeContext);
      expect(result).toBe(false);
    });

    it('should match mutation methods', () => {
      const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

      mutationMethods.forEach(method => {
        const context = createMockContext(method);
        const result = methodCondition.handler(mutationMethods, context);
        expect(result).toBe(true);
      });

      // Test safe method
      const safeContext = createMockContext('GET');
      const result = methodCondition.handler(mutationMethods, safeContext);
      expect(result).toBe(false);
    });

    it('should handle CORS preflight OPTIONS', () => {
      const context = createMockContext('OPTIONS');
      const result = methodCondition.handler('OPTIONS', context);
      expect(result).toBe(true);
    });
  });

  describe('performance considerations', () => {
    it('should handle large arrays efficiently', () => {
      const largeMethods = Array.from({ length: 100 }, (_, i) => `METHOD${i}`);
      const context = createMockContext('METHOD50');

      const start = Date.now();
      const result = methodCondition.handler(largeMethods, context);
      const end = Date.now();

      expect(result).toBe(true);
      expect(end - start).toBeLessThan(10); // Should be very fast
    });

    it('should short-circuit on first match', () => {
      let callCount = 0;

      // Mock the some method to count calls
      const originalSome = Array.prototype.some;
      Array.prototype.some = function(callback) {
        return originalSome.call(this, (...args) => {
          callCount++;
          return callback.apply(this, args);
        });
      };

      try {
        const context = createMockContext('GET');
        const config = ['GET', 'POST', 'PUT', 'DELETE']; // GET is first
        methodCondition.handler(config, context);

        expect(callCount).toBe(1); // Should only check first element
      } finally {
        // Restore original method
        Array.prototype.some = originalSome;
      }
    });
  });

  describe('real-world scenarios', () => {
    it('should validate REST API read operations', () => {
      const readOperations = ['GET', 'HEAD', 'OPTIONS'];
      const readContext = createMockContext('GET');
      const writeContext = createMockContext('POST');

      expect(methodCondition.handler(readOperations, readContext)).toBe(true);
      expect(methodCondition.handler(readOperations, writeContext)).toBe(false);
    });

    it('should validate REST API write operations', () => {
      const writeOperations = ['POST', 'PUT', 'PATCH', 'DELETE'];
      const writeContext = createMockContext('POST');
      const readContext = createMockContext('GET');

      expect(methodCondition.handler(writeOperations, writeContext)).toBe(true);
      expect(methodCondition.handler(writeOperations, readContext)).toBe(false);
    });

    it('should handle idempotent operations', () => {
      const idempotentOperations = ['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];

      idempotentOperations.forEach(method => {
        const context = createMockContext(method);
        const result = methodCondition.handler(idempotentOperations, context);
        expect(result).toBe(true);
      });

      // POST is not idempotent
      const postContext = createMockContext('POST');
      const result = methodCondition.handler(idempotentOperations, postContext);
      expect(result).toBe(false);
    });

    it('should handle GraphQL over HTTP methods', () => {
      // GraphQL typically uses POST, but GET for queries is also common
      const graphqlMethods = ['GET', 'POST'];

      const postContext = createMockContext('POST');
      const getContext = createMockContext('GET');
      const putContext = createMockContext('PUT');

      expect(methodCondition.handler(graphqlMethods, postContext)).toBe(true);
      expect(methodCondition.handler(graphqlMethods, getContext)).toBe(true);
      expect(methodCondition.handler(graphqlMethods, putContext)).toBe(false);
    });

    it('should handle webhook endpoints (typically POST only)', () => {
      const webhookMethods = ['POST'];

      const postContext = createMockContext('POST');
      const getContext = createMockContext('GET');

      expect(methodCondition.handler(webhookMethods, postContext)).toBe(true);
      expect(methodCondition.handler(webhookMethods, getContext)).toBe(false);
    });
  });
});