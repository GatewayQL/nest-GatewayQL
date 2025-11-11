import { queryParamCondition } from './query-param.condition';
import { ConditionContext } from '../../interfaces/plugin.interface';

describe('queryParamCondition', () => {
  const createMockContext = (query: Record<string, any>): ConditionContext => ({
    req: { query } as any,
    res: {} as any,
  });

  describe('definition', () => {
    it('should have correct name', () => {
      expect(queryParamCondition.name).toBe('queryParam');
    });

    it('should have handler function', () => {
      expect(typeof queryParamCondition.handler).toBe('function');
    });

    it('should have schema', () => {
      expect(queryParamCondition.schema).toBeDefined();
      expect(queryParamCondition.schema?.$id).toBe(
        'http://express-gateway.io/schemas/conditions/query-param.json',
      );
      expect(queryParamCondition.schema?.type).toBe('object');
      expect(queryParamCondition.schema?.required).toEqual(['name']);
    });
  });

  describe('parameter existence checks', () => {
    it('should return true when parameter exists and exists=true', () => {
      const context = createMockContext({ page: '1', limit: '10' });
      const config = { name: 'page', exists: true };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(true);
    });

    it('should return false when parameter exists and exists=false', () => {
      const context = createMockContext({ page: '1', limit: '10' });
      const config = { name: 'page', exists: false };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(false);
    });

    it('should return false when parameter does not exist and exists=true', () => {
      const context = createMockContext({ page: '1' });
      const config = { name: 'missing', exists: true };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(false);
    });

    it('should return true when parameter does not exist and exists=false', () => {
      const context = createMockContext({ page: '1' });
      const config = { name: 'missing', exists: false };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(true);
    });

    it('should handle empty parameter values with exists check', () => {
      const context = createMockContext({ empty: '', page: '1' });
      const config = { name: 'empty', exists: true };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(true);
    });

    it('should handle null parameter values', () => {
      const context = createMockContext({ nullParam: null, page: '1' });
      const config = { name: 'nullParam', exists: true };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(false); // null is considered non-existent
    });

    it('should handle undefined parameter values', () => {
      const context = createMockContext({ undefinedParam: undefined, page: '1' });
      const config = { name: 'undefinedParam', exists: true };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(false); // undefined is considered non-existent
    });
  });

  describe('parameter value matching', () => {
    describe('string value matching', () => {
      it('should match exact string value', () => {
        const context = createMockContext({ page: '1', status: 'active' });
        const config = { name: 'status', value: 'active' };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(true);
      });

      it('should not match different string value', () => {
        const context = createMockContext({ status: 'inactive' });
        const config = { name: 'status', value: 'active' };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(false);
      });

      it('should handle case-sensitive matching', () => {
        const context = createMockContext({ status: 'Active' });
        const config = { name: 'status', value: 'active' };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(false); // Should be case-sensitive
      });

      it('should convert parameter value to string for comparison', () => {
        const context = createMockContext({ count: 123 });
        const config = { name: 'count', value: '123' };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(true);
      });

      it('should convert config value to string for comparison', () => {
        const context = createMockContext({ count: '123' });
        const config = { name: 'count', value: 123 as any };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(true);
      });
    });

    describe('regex value matching', () => {
      it('should match regex pattern', () => {
        const context = createMockContext({ id: '12345' });
        const config = { name: 'id', value: /^\d+$/ };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(true);
      });

      it('should not match invalid regex pattern', () => {
        const context = createMockContext({ id: 'abc123' });
        const config = { name: 'id', value: /^\d+$/ };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(false);
      });

      it('should handle complex regex patterns', () => {
        const context = createMockContext({ email: 'user@example.com' });
        const config = {
          name: 'email',
          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(true);
      });

      it('should handle case-insensitive regex', () => {
        const context = createMockContext({ status: 'Active' });
        const config = { name: 'status', value: /^active$/i };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(true);
      });

      it('should handle regex with special characters', () => {
        const context = createMockContext({ url: 'https://example.com/path?param=value' });
        const config = {
          name: 'url',
          value: /^https?:\/\/.+/,
        };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(true);
      });
    });

    describe('missing parameter value handling', () => {
      it('should return false when parameter is missing and value is specified', () => {
        const context = createMockContext({ page: '1' });
        const config = { name: 'missing', value: 'any-value' };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(false);
      });

      it('should return false when parameter is missing and regex is specified', () => {
        const context = createMockContext({ page: '1' });
        const config = { name: 'missing', value: /any-pattern/ };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(false);
      });
    });

    describe('empty parameter value handling', () => {
      it('should handle empty parameter value with string comparison', () => {
        const context = createMockContext({ empty: '' });
        const config = { name: 'empty', value: '' };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(true);
      });

      it('should handle empty parameter value with regex', () => {
        const context = createMockContext({ empty: '' });
        const config = { name: 'empty', value: /^$/ };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(true);
      });

      it('should not match non-empty value against empty string', () => {
        const context = createMockContext({ param: 'value' });
        const config = { name: 'param', value: '' };
        const result = queryParamCondition.handler(config, context);
        expect(result).toBe(false);
      });
    });
  });

  describe('configuration combinations', () => {
    it('should prioritize exists check over value check when both are provided', () => {
      const context = createMockContext({ param: 'wrong-value' });
      const config = {
        name: 'param',
        value: 'correct-value',
        exists: true,
      };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(true); // exists=true should take priority
    });

    it('should return false for missing parameter when exists=false and value is provided', () => {
      const context = createMockContext({ page: '1' });
      const config = {
        name: 'missing',
        value: 'any-value',
        exists: false,
      };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(true); // exists=false should take priority
    });
  });

  describe('fallback behavior', () => {
    it('should return false when no exists or value is specified', () => {
      const context = createMockContext({ param: 'value' });
      const config = { name: 'param' };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(false);
    });

    it('should return false when exists is undefined and value is undefined', () => {
      const context = createMockContext({ param: 'value' });
      const config = {
        name: 'param',
        exists: undefined,
        value: undefined,
      };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle missing query object', () => {
      const context: ConditionContext = {
        req: {} as any, // No query object
        res: {} as any,
      };
      const config = { name: 'param', exists: true };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(false);
    });

    it('should handle null query object', () => {
      const context: ConditionContext = {
        req: { query: null } as any,
        res: {} as any,
      };
      const config = { name: 'param', exists: true };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(false);
    });

    it('should handle undefined query object', () => {
      const context: ConditionContext = {
        req: { query: undefined } as any,
        res: {} as any,
      };
      const config = { name: 'param', exists: true };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(false);
    });

    it('should handle array parameter values', () => {
      const context = createMockContext({ tags: ['javascript', 'nodejs'] });
      const config = { name: 'tags', value: 'javascript,nodejs' };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(true); // Array should be stringified
    });

    it('should handle boolean parameter values', () => {
      const context = createMockContext({ active: true });
      const config = { name: 'active', value: 'true' };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(true);
    });

    it('should handle numeric parameter values', () => {
      const context = createMockContext({ count: 42 });
      const config = { name: 'count', value: /^\d+$/ };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(true);
    });

    it('should handle object parameter values', () => {
      const context = createMockContext({
        filter: { status: 'active', type: 'user' },
      });
      const config = { name: 'filter', exists: true };
      const result = queryParamCondition.handler(config, context);
      expect(result).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should validate pagination parameters', () => {
      const context = createMockContext({ page: '1', limit: '10' });

      const pageConfig = { name: 'page', value: /^\d+$/ };
      const limitConfig = { name: 'limit', value: /^(10|25|50|100)$/ };

      expect(queryParamCondition.handler(pageConfig, context)).toBe(true);
      expect(queryParamCondition.handler(limitConfig, context)).toBe(true);
    });

    it('should validate sorting parameters', () => {
      const context = createMockContext({
        sortBy: 'createdAt',
        order: 'desc',
      });

      const sortByConfig = {
        name: 'sortBy',
        value: /^(createdAt|updatedAt|name|id)$/,
      };
      const orderConfig = { name: 'order', value: /^(asc|desc)$/ };

      expect(queryParamCondition.handler(sortByConfig, context)).toBe(true);
      expect(queryParamCondition.handler(orderConfig, context)).toBe(true);
    });

    it('should validate filtering parameters', () => {
      const context = createMockContext({
        status: 'active',
        category: 'blog',
        tags: 'javascript,nodejs',
      });

      const statusConfig = {
        name: 'status',
        value: /^(active|inactive|pending)$/,
      };
      const categoryConfig = { name: 'category', exists: true };
      const tagsConfig = { name: 'tags', value: /^[a-z,]+$/ };

      expect(queryParamCondition.handler(statusConfig, context)).toBe(true);
      expect(queryParamCondition.handler(categoryConfig, context)).toBe(true);
      expect(queryParamCondition.handler(tagsConfig, context)).toBe(true);
    });

    it('should validate search parameters', () => {
      const context = createMockContext({
        q: 'search term',
        type: 'exact',
      });

      const queryConfig = { name: 'q', exists: true };
      const typeConfig = { name: 'type', value: /^(exact|fuzzy|wildcard)$/ };

      expect(queryParamCondition.handler(queryConfig, context)).toBe(true);
      expect(queryParamCondition.handler(typeConfig, context)).toBe(true);
    });

    it('should validate API version parameters', () => {
      const context = createMockContext({ version: 'v2', format: 'json' });

      const versionConfig = { name: 'version', value: /^v[1-9]\d*$/ };
      const formatConfig = { name: 'format', value: /^(json|xml|csv)$/ };

      expect(queryParamCondition.handler(versionConfig, context)).toBe(true);
      expect(queryParamCondition.handler(formatConfig, context)).toBe(true);
    });

    it('should handle optional parameters', () => {
      const context = createMockContext({ required: 'value' });

      const requiredConfig = { name: 'required', exists: true };
      const optionalConfig = { name: 'optional', exists: false };

      expect(queryParamCondition.handler(requiredConfig, context)).toBe(true);
      expect(queryParamCondition.handler(optionalConfig, context)).toBe(true);
    });

    it('should validate ID parameters', () => {
      const context = createMockContext({ id: '12345', userId: 'user_abc123' });

      const numericIdConfig = { name: 'id', value: /^\d+$/ };
      const alphanumericIdConfig = { name: 'userId', value: /^[a-z]+_[a-z0-9]+$/ };

      expect(queryParamCondition.handler(numericIdConfig, context)).toBe(true);
      expect(queryParamCondition.handler(alphanumericIdConfig, context)).toBe(true);
    });

    it('should validate boolean flags', () => {
      const context = createMockContext({
        debug: 'true',
        verbose: '1',
        silent: 'false',
      });

      const debugConfig = { name: 'debug', value: /^(true|false)$/ };
      const verboseConfig = { name: 'verbose', value: /^[01]$/ };
      const silentConfig = { name: 'silent', value: 'false' };

      expect(queryParamCondition.handler(debugConfig, context)).toBe(true);
      expect(queryParamCondition.handler(verboseConfig, context)).toBe(true);
      expect(queryParamCondition.handler(silentConfig, context)).toBe(true);
    });

    it('should handle URL encoded values', () => {
      const context = createMockContext({
        message: 'Hello%20World',
        email: 'user%40example.com',
      });

      const messageConfig = { name: 'message', exists: true };
      const emailConfig = { name: 'email', exists: true };

      expect(queryParamCondition.handler(messageConfig, context)).toBe(true);
      expect(queryParamCondition.handler(emailConfig, context)).toBe(true);
    });
  });
});