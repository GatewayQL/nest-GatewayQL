import { pathMatchCondition } from './path-match.condition';
import { ConditionContext } from '../../interfaces/plugin.interface';

// Mock path-to-regexp
jest.mock('path-to-regexp', () => ({
  match: jest.fn(),
}));

import { match } from 'path-to-regexp';

const mockMatch = match as jest.MockedFunction<typeof match>;

describe('pathMatchCondition', () => {
  const createMockContext = (path: string, url?: string): ConditionContext => ({
    req: { path, url: url || path } as any,
    res: {} as any,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockMatch.mockReset();
  });

  describe('definition', () => {
    it('should have correct name', () => {
      expect(pathMatchCondition.name).toBe('pathMatch');
    });

    it('should have handler function', () => {
      expect(typeof pathMatchCondition.handler).toBe('function');
    });

    it('should have schema', () => {
      expect(pathMatchCondition.schema).toBeDefined();
      expect(pathMatchCondition.schema?.$id).toBe(
        'http://express-gateway.io/schemas/conditions/path-match.json',
      );
      expect(pathMatchCondition.schema?.type).toBe('string');
    });
  });

  describe('single pattern matching', () => {
    it('should match exact path', () => {
      const mockMatchFn = jest.fn().mockReturnValue({ path: '/api/users' });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users');
      const result = pathMatchCondition.handler('/api/users', context);

      expect(mockMatch).toHaveBeenCalledWith('/api/users', { decode: decodeURIComponent });
      expect(mockMatchFn).toHaveBeenCalledWith('/api/users');
      expect(result).toBe(true);
    });

    it('should not match different path', () => {
      const mockMatchFn = jest.fn().mockReturnValue(false);
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/posts');
      const result = pathMatchCondition.handler('/api/users', context);

      expect(mockMatchFn).toHaveBeenCalledWith('/api/posts');
      expect(result).toBe(false);
    });

    it('should use url when path is not available', () => {
      const mockMatchFn = jest.fn().mockReturnValue({ path: '/api/users' });
      mockMatch.mockReturnValue(mockMatchFn);

      const context: ConditionContext = {
        req: { url: '/api/users?param=value' } as any,
        res: {} as any,
      };

      pathMatchCondition.handler('/api/users', context);

      expect(mockMatchFn).toHaveBeenCalledWith('/api/users?param=value');
    });

    it('should prefer path over url when both are available', () => {
      const mockMatchFn = jest.fn().mockReturnValue({ path: '/api/users' });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users', '/api/users?param=value');
      pathMatchCondition.handler('/api/users', context);

      expect(mockMatchFn).toHaveBeenCalledWith('/api/users');
    });
  });

  describe('multiple pattern matching', () => {
    it('should match any pattern in array (first match)', () => {
      const mockMatchFn1 = jest.fn().mockReturnValue({ path: '/api/users' });
      const mockMatchFn2 = jest.fn().mockReturnValue(false);

      mockMatch
        .mockReturnValueOnce(mockMatchFn1)
        .mockReturnValueOnce(mockMatchFn2);

      const context = createMockContext('/api/users');
      const patterns = ['/api/users', '/api/posts'];
      const result = pathMatchCondition.handler(patterns, context);

      expect(mockMatch).toHaveBeenCalledTimes(1); // Should stop at first match
      expect(result).toBe(true);
    });

    it('should match any pattern in array (second match)', () => {
      const mockMatchFn1 = jest.fn().mockReturnValue(false);
      const mockMatchFn2 = jest.fn().mockReturnValue({ path: '/api/posts' });

      mockMatch
        .mockReturnValueOnce(mockMatchFn1)
        .mockReturnValueOnce(mockMatchFn2);

      const context = createMockContext('/api/posts');
      const patterns = ['/api/users', '/api/posts'];
      const result = pathMatchCondition.handler(patterns, context);

      expect(mockMatch).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });

    it('should not match if no patterns match', () => {
      const mockMatchFn1 = jest.fn().mockReturnValue(false);
      const mockMatchFn2 = jest.fn().mockReturnValue(false);

      mockMatch
        .mockReturnValueOnce(mockMatchFn1)
        .mockReturnValueOnce(mockMatchFn2);

      const context = createMockContext('/api/comments');
      const patterns = ['/api/users', '/api/posts'];
      const result = pathMatchCondition.handler(patterns, context);

      expect(mockMatch).toHaveBeenCalledTimes(2);
      expect(result).toBe(false);
    });

    it('should handle empty pattern array', () => {
      const context = createMockContext('/api/users');
      const patterns: string[] = [];
      const result = pathMatchCondition.handler(patterns, context);

      expect(mockMatch).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle single-element array', () => {
      const mockMatchFn = jest.fn().mockReturnValue({ path: '/api/users' });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users');
      const patterns = ['/api/users'];
      const result = pathMatchCondition.handler(patterns, context);

      expect(result).toBe(true);
    });
  });

  describe('path-to-regexp integration', () => {
    it('should call match with decode option', () => {
      const mockMatchFn = jest.fn().mockReturnValue(false);
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users');
      pathMatchCondition.handler('/api/users', context);

      expect(mockMatch).toHaveBeenCalledWith('/api/users', { decode: decodeURIComponent });
    });

    it('should handle URL encoded paths', () => {
      const mockMatchFn = jest.fn().mockReturnValue({ path: '/api/users/john doe' });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users/john%20doe');
      const result = pathMatchCondition.handler('/api/users/:name', context);

      expect(mockMatch).toHaveBeenCalledWith('/api/users/:name', { decode: decodeURIComponent });
      expect(result).toBe(true);
    });

    it('should handle parametrized routes', () => {
      const mockMatchFn = jest.fn().mockReturnValue({
        path: '/api/users/123',
        params: { id: '123' }
      });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users/123');
      const result = pathMatchCondition.handler('/api/users/:id', context);

      expect(result).toBe(true);
    });

    it('should handle wildcard patterns', () => {
      const mockMatchFn = jest.fn().mockReturnValue({
        path: '/api/users/123/posts/456'
      });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users/123/posts/456');
      const result = pathMatchCondition.handler('/api/users/:id/posts/:postId', context);

      expect(result).toBe(true);
    });

    it('should handle optional parameters', () => {
      const mockMatchFn = jest.fn().mockReturnValue({
        path: '/api/users'
      });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users');
      const result = pathMatchCondition.handler('/api/users/:id?', context);

      expect(result).toBe(true);
    });

    it('should handle regex patterns', () => {
      const mockMatchFn = jest.fn().mockReturnValue({
        path: '/api/users/123'
      });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users/123');
      const result = pathMatchCondition.handler('/api/users/:id(\\d+)', context);

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined path and url', () => {
      const mockMatchFn = jest.fn().mockReturnValue(false);
      mockMatch.mockReturnValue(mockMatchFn);

      const context: ConditionContext = {
        req: {} as any,
        res: {} as any,
      };

      const result = pathMatchCondition.handler('/api/users', context);

      expect(mockMatchFn).toHaveBeenCalledWith(undefined);
      expect(result).toBe(false);
    });

    it('should handle empty path', () => {
      const mockMatchFn = jest.fn().mockReturnValue(false);
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('');
      const result = pathMatchCondition.handler('/api/users', context);

      expect(mockMatchFn).toHaveBeenCalledWith('');
      expect(result).toBe(false);
    });

    it('should handle root path', () => {
      const mockMatchFn = jest.fn().mockReturnValue({ path: '/' });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/');
      const result = pathMatchCondition.handler('/', context);

      expect(result).toBe(true);
    });

    it('should handle path with query parameters', () => {
      const mockMatchFn = jest.fn().mockReturnValue(false);
      mockMatch.mockReturnValue(mockMatchFn);

      const context: ConditionContext = {
        req: {
          path: '/api/users',
          url: '/api/users?page=1&limit=10'
        } as any,
        res: {} as any,
      };

      pathMatchCondition.handler('/api/users', context);

      expect(mockMatchFn).toHaveBeenCalledWith('/api/users');
    });

    it('should handle path with fragments', () => {
      const mockMatchFn = jest.fn().mockReturnValue({ path: '/api/users' });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users#section1');
      const result = pathMatchCondition.handler('/api/users', context);

      expect(result).toBe(true);
    });

    it('should handle match function throwing error', () => {
      mockMatch.mockImplementation(() => {
        throw new Error('Invalid pattern');
      });

      const context = createMockContext('/api/users');

      expect(() => {
        pathMatchCondition.handler('invalid[pattern', context);
      }).toThrow('Invalid pattern');
    });

    it('should handle match function returning null', () => {
      const mockMatchFn = jest.fn().mockReturnValue(null);
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users');
      const result = pathMatchCondition.handler('/api/posts', context);

      expect(result).toBe(false);
    });
  });

  describe('real-world scenarios', () => {
    it('should match API versioning patterns', () => {
      const mockMatchFn = jest.fn().mockReturnValue({
        path: '/api/v1/users',
        params: { version: 'v1' }
      });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/v1/users');
      const patterns = ['/api/:version/users', '/api/:version/posts'];
      const result = pathMatchCondition.handler(patterns, context);

      expect(result).toBe(true);
    });

    it('should match REST resource patterns', () => {
      const mockMatchFn = jest.fn().mockReturnValue({
        path: '/api/users/123/posts/456',
        params: { userId: '123', postId: '456' }
      });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/users/123/posts/456');
      const result = pathMatchCondition.handler('/api/users/:userId/posts/:postId', context);

      expect(result).toBe(true);
    });

    it('should match GraphQL endpoint', () => {
      const mockMatchFn = jest.fn().mockReturnValue({ path: '/graphql' });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/graphql');
      const result = pathMatchCondition.handler('/graphql', context);

      expect(result).toBe(true);
    });

    it('should match health check endpoints', () => {
      const mockMatchFn1 = jest.fn().mockReturnValue(false);
      const mockMatchFn2 = jest.fn().mockReturnValue({ path: '/health' });

      mockMatch
        .mockReturnValueOnce(mockMatchFn1)
        .mockReturnValueOnce(mockMatchFn2);

      const context = createMockContext('/health');
      const patterns = ['/health-check', '/health', '/status'];
      const result = pathMatchCondition.handler(patterns, context);

      expect(result).toBe(true);
    });

    it('should match static asset patterns', () => {
      const mockMatchFn = jest.fn().mockReturnValue({
        path: '/static/css/main.css',
        params: { 0: 'css/main.css' }
      });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/static/css/main.css');
      const result = pathMatchCondition.handler('/static/(.*)', context);

      expect(result).toBe(true);
    });

    it('should handle admin routes with role-based paths', () => {
      const mockMatchFn = jest.fn().mockReturnValue({
        path: '/admin/users/manage',
        params: { resource: 'users', action: 'manage' }
      });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/admin/users/manage');
      const result = pathMatchCondition.handler('/admin/:resource/:action', context);

      expect(result).toBe(true);
    });

    it('should match webhook endpoints with dynamic paths', () => {
      const mockMatchFn = jest.fn().mockReturnValue({
        path: '/webhooks/github/push',
        params: { provider: 'github', event: 'push' }
      });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/webhooks/github/push');
      const result = pathMatchCondition.handler('/webhooks/:provider/:event', context);

      expect(result).toBe(true);
    });

    it('should handle complex nested resource patterns', () => {
      const mockMatchFn = jest.fn().mockReturnValue({
        path: '/api/v2/organizations/123/teams/456/members/789',
        params: {
          version: 'v2',
          orgId: '123',
          teamId: '456',
          memberId: '789'
        }
      });
      mockMatch.mockReturnValue(mockMatchFn);

      const context = createMockContext('/api/v2/organizations/123/teams/456/members/789');
      const result = pathMatchCondition.handler(
        '/api/:version/organizations/:orgId/teams/:teamId/members/:memberId',
        context
      );

      expect(result).toBe(true);
    });
  });
});