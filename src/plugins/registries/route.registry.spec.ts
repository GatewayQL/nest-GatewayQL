import { Test, TestingModule } from '@nestjs/testing';
import { RouteRegistry } from './route.registry';
import { RouteDefinition } from '../interfaces/plugin.interface';

describe('RouteRegistry', () => {
  let registry: RouteRegistry;

  const mockRouteDefinition: RouteDefinition = {
    method: 'GET',
    path: '/api/test',
    handler: jest.fn(),
    middleware: [jest.fn()],
  };

  const anotherRouteDefinition: RouteDefinition = {
    method: 'POST',
    path: '/api/users',
    handler: jest.fn(),
  };

  const duplicatePathRoute: RouteDefinition = {
    method: 'PUT',
    path: '/api/test',
    handler: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RouteRegistry],
    }).compile();

    registry = module.get<RouteRegistry>(RouteRegistry);
  });

  afterEach(() => {
    registry.clear();
  });

  describe('register', () => {
    it('should register a new route', () => {
      registry.register(mockRouteDefinition);

      const routes = registry.getAll();
      expect(routes).toHaveLength(1);
      expect(routes[0]).toBe(mockRouteDefinition);
    });

    it('should register multiple different routes', () => {
      registry.register(mockRouteDefinition);
      registry.register(anotherRouteDefinition);

      const routes = registry.getAll();
      expect(routes).toHaveLength(2);
      expect(routes).toContain(mockRouteDefinition);
      expect(routes).toContain(anotherRouteDefinition);
    });

    it('should allow different methods on same path', () => {
      registry.register(mockRouteDefinition);
      registry.register(duplicatePathRoute);

      const routes = registry.getAll();
      expect(routes).toHaveLength(2);
    });

    it('should throw error when registering duplicate route (same method and path)', () => {
      registry.register(mockRouteDefinition);

      expect(() => registry.register(mockRouteDefinition)).toThrow(
        'Route GET /api/test is already registered',
      );
    });

    it('should throw error for exact duplicate regardless of object reference', () => {
      const duplicateRoute: RouteDefinition = {
        method: 'GET',
        path: '/api/test',
        handler: jest.fn(), // Different function but same route
      };

      registry.register(mockRouteDefinition);

      expect(() => registry.register(duplicateRoute)).toThrow(
        'Route GET /api/test is already registered',
      );
    });
  });

  describe('getAll', () => {
    it('should return all registered routes', () => {
      registry.register(mockRouteDefinition);
      registry.register(anotherRouteDefinition);

      const routes = registry.getAll();

      expect(routes).toHaveLength(2);
      expect(routes).toContain(mockRouteDefinition);
      expect(routes).toContain(anotherRouteDefinition);
    });

    it('should return empty array when no routes registered', () => {
      const routes = registry.getAll();

      expect(routes).toEqual([]);
    });

    it('should return a copy of routes array', () => {
      registry.register(mockRouteDefinition);

      const routes1 = registry.getAll();
      const routes2 = registry.getAll();

      expect(routes1).not.toBe(routes2); // Different array instances
      expect(routes1).toEqual(routes2); // Same content
    });
  });

  describe('getByMethod', () => {
    beforeEach(() => {
      registry.register(mockRouteDefinition); // GET
      registry.register(anotherRouteDefinition); // POST
      registry.register(duplicatePathRoute); // PUT
    });

    it('should return routes matching the specified method', () => {
      const getRoutes = registry.getByMethod('GET');

      expect(getRoutes).toHaveLength(1);
      expect(getRoutes[0]).toBe(mockRouteDefinition);
    });

    it('should handle case-insensitive method matching', () => {
      const getRoutesLower = registry.getByMethod('get');
      const getRoutesUpper = registry.getByMethod('GET');

      expect(getRoutesLower).toEqual(getRoutesUpper);
      expect(getRoutesLower).toHaveLength(1);
    });

    it('should return empty array for non-existent method', () => {
      const routes = registry.getByMethod('DELETE');

      expect(routes).toEqual([]);
    });

    it('should return multiple routes for same method', () => {
      const anotherGetRoute: RouteDefinition = {
        method: 'GET',
        path: '/api/other',
        handler: jest.fn(),
      };
      registry.register(anotherGetRoute);

      const getRoutes = registry.getByMethod('GET');

      expect(getRoutes).toHaveLength(2);
      expect(getRoutes).toContain(mockRouteDefinition);
      expect(getRoutes).toContain(anotherGetRoute);
    });
  });

  describe('getByPath', () => {
    beforeEach(() => {
      registry.register(mockRouteDefinition); // /api/test
      registry.register(anotherRouteDefinition); // /api/users
      registry.register(duplicatePathRoute); // /api/test
    });

    it('should return routes matching the specified path', () => {
      const testRoutes = registry.getByPath('/api/test');

      expect(testRoutes).toHaveLength(2);
      expect(testRoutes).toContain(mockRouteDefinition);
      expect(testRoutes).toContain(duplicatePathRoute);
    });

    it('should return empty array for non-existent path', () => {
      const routes = registry.getByPath('/api/nonexistent');

      expect(routes).toEqual([]);
    });

    it('should match exact path only', () => {
      const routes = registry.getByPath('/api/tes'); // Partial match

      expect(routes).toEqual([]);
    });

    it('should be case-sensitive for paths', () => {
      const routes = registry.getByPath('/API/TEST'); // Different case

      expect(routes).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all registered routes', () => {
      registry.register(mockRouteDefinition);
      registry.register(anotherRouteDefinition);
      expect(registry.getAll()).toHaveLength(2);

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
    });

    it('should work on empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle route with minimal properties', () => {
      const minimalRoute: RouteDefinition = {
        method: 'GET',
        path: '/minimal',
        handler: () => ({ message: 'minimal' }),
      };

      registry.register(minimalRoute);

      expect(registry.getAll()).toContain(minimalRoute);
    });

    it('should handle route without middleware', () => {
      const routeWithoutMiddleware: RouteDefinition = {
        method: 'POST',
        path: '/no-middleware',
        handler: jest.fn(),
      };

      registry.register(routeWithoutMiddleware);

      expect(registry.getAll()).toContain(routeWithoutMiddleware);
      expect(routeWithoutMiddleware.middleware).toBeUndefined();
    });

    it('should handle route with empty middleware array', () => {
      const routeWithEmptyMiddleware: RouteDefinition = {
        method: 'POST',
        path: '/empty-middleware',
        handler: jest.fn(),
        middleware: [],
      };

      registry.register(routeWithEmptyMiddleware);

      expect(registry.getAll()).toContain(routeWithEmptyMiddleware);
    });

    it('should handle all HTTP methods', () => {
      const methods: Array<RouteDefinition['method']> = [
        'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'
      ];

      methods.forEach((method, index) => {
        const route: RouteDefinition = {
          method,
          path: `/test/${index}`,
          handler: jest.fn(),
        };
        registry.register(route);
      });

      expect(registry.getAll()).toHaveLength(methods.length);

      methods.forEach(method => {
        expect(registry.getByMethod(method)).toHaveLength(1);
      });
    });

    it('should preserve registration order', () => {
      const route1: RouteDefinition = {
        method: 'GET',
        path: '/first',
        handler: jest.fn(),
      };
      const route2: RouteDefinition = {
        method: 'GET',
        path: '/second',
        handler: jest.fn(),
      };
      const route3: RouteDefinition = {
        method: 'GET',
        path: '/third',
        handler: jest.fn(),
      };

      registry.register(route1);
      registry.register(route2);
      registry.register(route3);

      const routes = registry.getAll();
      expect(routes[0]).toBe(route1);
      expect(routes[1]).toBe(route2);
      expect(routes[2]).toBe(route3);
    });

    it('should handle complex paths with parameters', () => {
      const parameterizedRoute: RouteDefinition = {
        method: 'GET',
        path: '/users/:id/posts/:postId',
        handler: jest.fn(),
      };

      registry.register(parameterizedRoute);

      const routes = registry.getByPath('/users/:id/posts/:postId');
      expect(routes).toContain(parameterizedRoute);
    });

    it('should handle async route handlers', () => {
      const asyncRoute: RouteDefinition = {
        method: 'GET',
        path: '/async',
        handler: async (req, res) => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return { async: true };
        },
      };

      registry.register(asyncRoute);

      expect(registry.getAll()).toContain(asyncRoute);
    });
  });
});