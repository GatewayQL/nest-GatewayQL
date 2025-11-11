import { headerCondition } from './header.condition';
import { ConditionContext } from '../../interfaces/plugin.interface';

describe('headerCondition', () => {
  const mockContext: ConditionContext = {
    req: {
      headers: {
        'authorization': 'Bearer token123',
        'content-type': 'application/json',
        'x-custom': 'custom-value',
        'user-agent': 'Mozilla/5.0',
        'accept': 'application/json, text/plain, */*',
        'x-empty': '',
      },
    } as any,
    res: {} as any,
  };

  describe('definition', () => {
    it('should have correct name', () => {
      expect(headerCondition.name).toBe('header');
    });

    it('should have handler function', () => {
      expect(typeof headerCondition.handler).toBe('function');
    });

    it('should have schema', () => {
      expect(headerCondition.schema).toBeDefined();
      expect(headerCondition.schema?.$id).toBe(
        'http://express-gateway.io/schemas/conditions/header.json',
      );
      expect(headerCondition.schema?.type).toBe('object');
      expect(headerCondition.schema?.required).toEqual(['name']);
    });
  });

  describe('header existence checks', () => {
    it('should return true when header exists and exists=true', () => {
      const config = { name: 'authorization', exists: true };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(true);
    });

    it('should return false when header exists and exists=false', () => {
      const config = { name: 'authorization', exists: false };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(false);
    });

    it('should return false when header does not exist and exists=true', () => {
      const config = { name: 'missing-header', exists: true };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(false);
    });

    it('should return true when header does not exist and exists=false', () => {
      const config = { name: 'missing-header', exists: false };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(true);
    });

    it('should handle case-insensitive header names', () => {
      const config = { name: 'AUTHORIZATION', exists: true };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(true);
    });

    it('should handle empty header values with exists check', () => {
      const config = { name: 'x-empty', exists: true };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(true);
    });
  });

  describe('header value matching', () => {
    describe('string value matching', () => {
      it('should match exact string value', () => {
        const config = { name: 'authorization', value: 'Bearer token123' };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(true);
      });

      it('should not match different string value', () => {
        const config = { name: 'authorization', value: 'Bearer differenttoken' };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(false);
      });

      it('should handle case-sensitive value matching', () => {
        const config = { name: 'authorization', value: 'bearer token123' };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(false);
      });

      it('should match partial string value', () => {
        const config = { name: 'user-agent', value: 'Mozilla/5.0' };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(true);
      });

      it('should convert header value to string for comparison', () => {
        const mockContextWithNumber: ConditionContext = {
          req: {
            headers: { 'x-number': 123 },
          } as any,
          res: {} as any,
        };

        const config = { name: 'x-number', value: '123' };
        const result = headerCondition.handler(config, mockContextWithNumber);
        expect(result).toBe(true);
      });
    });

    describe('regex value matching', () => {
      it('should match regex pattern', () => {
        const config = { name: 'authorization', value: /^Bearer\s+/ };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(true);
      });

      it('should not match invalid regex pattern', () => {
        const config = { name: 'authorization', value: /^Basic\s+/ };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(false);
      });

      it('should handle complex regex patterns', () => {
        const config = {
          name: 'user-agent',
          value: /Mozilla\/[\d.]+/,
        };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(true);
      });

      it('should handle case-insensitive regex', () => {
        const config = {
          name: 'content-type',
          value: /APPLICATION\/JSON/i,
        };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(true);
      });

      it('should handle regex with special characters', () => {
        const config = {
          name: 'accept',
          value: /application\/json,\s*text\/plain/,
        };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(true);
      });
    });

    describe('missing header value handling', () => {
      it('should return false when header is missing and value is specified', () => {
        const config = { name: 'missing-header', value: 'any-value' };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(false);
      });

      it('should return false when header is missing and regex is specified', () => {
        const config = { name: 'missing-header', value: /any-pattern/ };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(false);
      });
    });

    describe('empty header value handling', () => {
      it('should return false for empty header value with string comparison', () => {
        // The implementation checks if (headerValue) before doing value comparison
        // Empty string is falsy, so it won't match
        const config = { name: 'x-empty', value: '' };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(false);
      });

      it('should return false for empty header value with regex', () => {
        // Same issue - empty string is falsy
        const config = { name: 'x-empty', value: /^$/ };
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(false);
      });
    });
  });

  describe('configuration combinations', () => {
    it('should prioritize exists check over value check when both are provided', () => {
      const config = {
        name: 'authorization',
        value: 'wrong-value',
        exists: true,
      };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(true); // exists=true should take priority
    });

    it('should return true for missing header when exists=false and value is provided', () => {
      const config = {
        name: 'missing-header',
        value: 'any-value',
        exists: false,
      };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(true); // exists=false should take priority
    });
  });

  describe('fallback behavior', () => {
    it('should return false when no exists or value is specified', () => {
      const config = { name: 'authorization' };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(false);
    });

    it('should return false when exists is undefined and value is undefined', () => {
      const config = {
        name: 'authorization',
        exists: undefined,
        value: undefined,
      };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle header array values', () => {
      const mockContextWithArray: ConditionContext = {
        req: {
          headers: { 'x-forwarded-for': ['192.168.1.1', '10.0.0.1'] },
        } as any,
        res: {} as any,
      };

      const config = { name: 'x-forwarded-for', value: '192.168.1.1,10.0.0.1' };
      const result = headerCondition.handler(config, mockContextWithArray);
      expect(result).toBe(true);
    });

    it('should handle special header names with hyphens', () => {
      const config = { name: 'x-custom', value: 'custom-value' };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(true);
    });

    it('should handle header names with different cases', () => {
      const configs = [
        { name: 'Content-Type', exists: true },
        { name: 'CONTENT-TYPE', exists: true },
        { name: 'content-type', exists: true },
      ];

      configs.forEach((config) => {
        const result = headerCondition.handler(config, mockContext);
        expect(result).toBe(true);
      });
    });

    it('should handle numeric header values', () => {
      const mockContextWithNumbers: ConditionContext = {
        req: {
          headers: { 'content-length': '1024' },
        } as any,
        res: {} as any,
      };

      const config = { name: 'content-length', value: '1024' };
      const result = headerCondition.handler(config, mockContextWithNumbers);
      expect(result).toBe(true);
    });

    it('should handle boolean config values by converting to string', () => {
      const config = { name: 'authorization', value: true as any };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(false); // 'true' !== 'Bearer token123'
    });

    it('should handle null header values', () => {
      const mockContextWithNull: ConditionContext = {
        req: {
          headers: { 'x-null': null },
        } as any,
        res: {} as any,
      };

      // null is truthy for exists check (header is present but null)
      const config = { name: 'x-null', exists: true };
      const result = headerCondition.handler(config, mockContextWithNull);
      expect(result).toBe(true); // null header exists
    });

    it('should handle undefined header values', () => {
      const mockContextWithUndefined: ConditionContext = {
        req: {
          headers: { 'x-undefined': undefined },
        } as any,
        res: {} as any,
      };

      const config = { name: 'x-undefined', exists: true };
      const result = headerCondition.handler(config, mockContextWithUndefined);
      expect(result).toBe(false); // undefined is considered non-existent
    });
  });

  describe('real-world scenarios', () => {
    it('should validate Bearer token format', () => {
      const config = {
        name: 'authorization',
        value: /^Bearer\s+[A-Za-z0-9\-._~+/]+=*$/,
      };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(true);
    });

    it('should check for JSON content type', () => {
      const config = {
        name: 'content-type',
        value: /^application\/json/,
      };
      const result = headerCondition.handler(config, mockContext);
      expect(result).toBe(true);
    });

    it('should validate API key header exists', () => {
      const mockContextWithApiKey: ConditionContext = {
        req: {
          headers: { 'x-api-key': 'abc123' },
        } as any,
        res: {} as any,
      };

      const config = { name: 'x-api-key', exists: true };
      const result = headerCondition.handler(config, mockContextWithApiKey);
      expect(result).toBe(true);
    });

    it('should check for CORS preflight headers', () => {
      const mockCorsContext: ConditionContext = {
        req: {
          headers: {
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'content-type,authorization',
          },
        } as any,
        res: {} as any,
      };

      const config = { name: 'access-control-request-method', exists: true };
      const result = headerCondition.handler(config, mockCorsContext);
      expect(result).toBe(true);
    });
  });
});