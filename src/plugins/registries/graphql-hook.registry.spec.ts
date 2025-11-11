import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLHookRegistry } from './graphql-hook.registry';
import { GraphQLHookDefinition, GraphQLHookType } from '../interfaces/plugin.interface';

describe('GraphQLHookRegistry', () => {
  let registry: GraphQLHookRegistry;

  const mockSchemaTransformHook: GraphQLHookDefinition = {
    type: GraphQLHookType.SCHEMA_TRANSFORM,
    handler: jest.fn(),
    priority: 10,
  };

  const mockResolverMiddlewareHook: GraphQLHookDefinition = {
    type: GraphQLHookType.RESOLVER_MIDDLEWARE,
    handler: jest.fn(),
    priority: 5,
  };

  const anotherSchemaTransformHook: GraphQLHookDefinition = {
    type: GraphQLHookType.SCHEMA_TRANSFORM,
    handler: jest.fn(),
    priority: 20,
  };

  const hookWithoutPriority: GraphQLHookDefinition = {
    type: GraphQLHookType.SUBGRAPH_REQUEST,
    handler: jest.fn(),
    // No priority - should default to 100
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphQLHookRegistry],
    }).compile();

    registry = module.get<GraphQLHookRegistry>(GraphQLHookRegistry);
  });

  afterEach(() => {
    registry.clear();
  });

  describe('register', () => {
    it('should register a new hook', () => {
      registry.register(mockSchemaTransformHook);

      const hooks = registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM);
      expect(hooks).toHaveLength(1);
      expect(hooks[0]).toBe(mockSchemaTransformHook);
    });

    it('should register multiple hooks of different types', () => {
      registry.register(mockSchemaTransformHook);
      registry.register(mockResolverMiddlewareHook);

      expect(registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM)).toHaveLength(1);
      expect(registry.getByType(GraphQLHookType.RESOLVER_MIDDLEWARE)).toHaveLength(1);
    });

    it('should register multiple hooks of the same type', () => {
      registry.register(mockSchemaTransformHook);
      registry.register(anotherSchemaTransformHook);

      const hooks = registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM);
      expect(hooks).toHaveLength(2);
      expect(hooks).toContain(mockSchemaTransformHook);
      expect(hooks).toContain(anotherSchemaTransformHook);
    });

    it('should sort hooks by priority (lower priority executes first)', () => {
      registry.register(anotherSchemaTransformHook); // priority: 20
      registry.register(mockSchemaTransformHook); // priority: 10

      const hooks = registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM);
      expect(hooks[0]).toBe(mockSchemaTransformHook); // priority 10 should be first
      expect(hooks[1]).toBe(anotherSchemaTransformHook); // priority 20 should be second
    });

    it('should use default priority of 100 for hooks without priority', () => {
      registry.register(hookWithoutPriority); // no priority (default: 100)
      registry.register({
        type: GraphQLHookType.SUBGRAPH_REQUEST,
        handler: jest.fn(),
        priority: 50,
      });

      const hooks = registry.getByType(GraphQLHookType.SUBGRAPH_REQUEST);
      expect(hooks[0].priority).toBe(50); // Should be first
      expect(hooks[1]).toBe(hookWithoutPriority); // Should be second with default priority
    });
  });

  describe('getByType', () => {
    beforeEach(() => {
      registry.register(mockSchemaTransformHook);
      registry.register(mockResolverMiddlewareHook);
      registry.register(anotherSchemaTransformHook);
    });

    it('should return hooks of the specified type', () => {
      const schemaHooks = registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM);

      expect(schemaHooks).toHaveLength(2);
      expect(schemaHooks).toContain(mockSchemaTransformHook);
      expect(schemaHooks).toContain(anotherSchemaTransformHook);
    });

    it('should return hooks in priority order', () => {
      const schemaHooks = registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM);

      expect(schemaHooks[0]).toBe(mockSchemaTransformHook); // priority 10
      expect(schemaHooks[1]).toBe(anotherSchemaTransformHook); // priority 20
    });

    it('should return empty array for non-existent hook type', () => {
      const entityHooks = registry.getByType(GraphQLHookType.ENTITY_REFERENCE);

      expect(entityHooks).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should return all registered hooks from all types', () => {
      registry.register(mockSchemaTransformHook);
      registry.register(mockResolverMiddlewareHook);
      registry.register(anotherSchemaTransformHook);

      const allHooks = registry.getAll();

      expect(allHooks).toHaveLength(3);
      expect(allHooks).toContain(mockSchemaTransformHook);
      expect(allHooks).toContain(mockResolverMiddlewareHook);
      expect(allHooks).toContain(anotherSchemaTransformHook);
    });

    it('should return empty array when no hooks are registered', () => {
      const allHooks = registry.getAll();

      expect(allHooks).toEqual([]);
    });

    it('should maintain priority order within each type', () => {
      registry.register(anotherSchemaTransformHook); // priority 20
      registry.register(mockSchemaTransformHook); // priority 10
      registry.register(mockResolverMiddlewareHook); // priority 5

      const allHooks = registry.getAll();
      const schemaHooks = allHooks.filter(h => h.type === GraphQLHookType.SCHEMA_TRANSFORM);
      const middlewareHooks = allHooks.filter(h => h.type === GraphQLHookType.RESOLVER_MIDDLEWARE);

      expect(schemaHooks[0]).toBe(mockSchemaTransformHook); // Lower priority first
      expect(schemaHooks[1]).toBe(anotherSchemaTransformHook);
      expect(middlewareHooks[0]).toBe(mockResolverMiddlewareHook);
    });
  });

  describe('clear', () => {
    it('should remove all hooks from all types', () => {
      registry.register(mockSchemaTransformHook);
      registry.register(mockResolverMiddlewareHook);
      registry.register(anotherSchemaTransformHook);

      expect(registry.getAll()).toHaveLength(3);

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
      expect(registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM)).toEqual([]);
      expect(registry.getByType(GraphQLHookType.RESOLVER_MIDDLEWARE)).toEqual([]);
    });

    it('should work on empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('clearByType', () => {
    beforeEach(() => {
      registry.register(mockSchemaTransformHook);
      registry.register(mockResolverMiddlewareHook);
      registry.register(anotherSchemaTransformHook);
    });

    it('should remove all hooks of the specified type', () => {
      registry.clearByType(GraphQLHookType.SCHEMA_TRANSFORM);

      expect(registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM)).toEqual([]);
      expect(registry.getByType(GraphQLHookType.RESOLVER_MIDDLEWARE)).toHaveLength(1);
    });

    it('should not affect other hook types', () => {
      registry.clearByType(GraphQLHookType.SCHEMA_TRANSFORM);

      const middlewareHooks = registry.getByType(GraphQLHookType.RESOLVER_MIDDLEWARE);
      expect(middlewareHooks).toContain(mockResolverMiddlewareHook);
    });

    it('should work for non-existent hook type', () => {
      expect(() => registry.clearByType(GraphQLHookType.ENTITY_REFERENCE)).not.toThrow();
      expect(registry.getAll()).toHaveLength(3); // No hooks removed
    });
  });

  describe('priority handling edge cases', () => {
    it('should handle hooks with same priority', () => {
      const hook1: GraphQLHookDefinition = {
        type: GraphQLHookType.SCHEMA_TRANSFORM,
        handler: jest.fn(),
        priority: 10,
      };
      const hook2: GraphQLHookDefinition = {
        type: GraphQLHookType.SCHEMA_TRANSFORM,
        handler: jest.fn(),
        priority: 10,
      };

      registry.register(hook1);
      registry.register(hook2);

      const hooks = registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM);
      expect(hooks).toHaveLength(2);
      // Order should be maintained even with same priority
    });

    it('should handle negative priorities', () => {
      const negativePriorityHook: GraphQLHookDefinition = {
        type: GraphQLHookType.SCHEMA_TRANSFORM,
        handler: jest.fn(),
        priority: -10,
      };

      registry.register(mockSchemaTransformHook); // priority 10
      registry.register(negativePriorityHook); // priority -10

      const hooks = registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM);
      expect(hooks[0]).toBe(negativePriorityHook); // Negative priority should be first
      expect(hooks[1]).toBe(mockSchemaTransformHook);
    });

    it('should handle zero priority', () => {
      const zeroPriorityHook: GraphQLHookDefinition = {
        type: GraphQLHookType.SCHEMA_TRANSFORM,
        handler: jest.fn(),
        priority: 0,
      };

      registry.register(mockSchemaTransformHook); // priority 10
      registry.register(zeroPriorityHook); // priority 0

      const hooks = registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM);
      expect(hooks[0]).toBe(zeroPriorityHook); // Zero priority should be first
      expect(hooks[1]).toBe(mockSchemaTransformHook);
    });
  });

  describe('all GraphQL hook types', () => {
    it('should handle all hook types', () => {
      const hooks = [
        {
          type: GraphQLHookType.SCHEMA_TRANSFORM,
          handler: jest.fn(),
        },
        {
          type: GraphQLHookType.RESOLVER_MIDDLEWARE,
          handler: jest.fn(),
        },
        {
          type: GraphQLHookType.SUBGRAPH_REQUEST,
          handler: jest.fn(),
        },
        {
          type: GraphQLHookType.ENTITY_REFERENCE,
          handler: jest.fn(),
        },
      ];

      hooks.forEach(hook => registry.register(hook));

      expect(registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM)).toHaveLength(1);
      expect(registry.getByType(GraphQLHookType.RESOLVER_MIDDLEWARE)).toHaveLength(1);
      expect(registry.getByType(GraphQLHookType.SUBGRAPH_REQUEST)).toHaveLength(1);
      expect(registry.getByType(GraphQLHookType.ENTITY_REFERENCE)).toHaveLength(1);
      expect(registry.getAll()).toHaveLength(4);
    });
  });

  describe('hook handler types', () => {
    it('should handle async hook handlers', () => {
      const asyncHook: GraphQLHookDefinition = {
        type: GraphQLHookType.SCHEMA_TRANSFORM,
        handler: async (context) => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return context.schema;
        },
      };

      registry.register(asyncHook);

      expect(registry.getByType(GraphQLHookType.SCHEMA_TRANSFORM)).toContain(asyncHook);
    });

    it('should handle function hook handlers', () => {
      const functionHook: GraphQLHookDefinition = {
        type: GraphQLHookType.RESOLVER_MIDDLEWARE,
        handler: (context) => {
          return context;
        },
      };

      registry.register(functionHook);

      expect(registry.getByType(GraphQLHookType.RESOLVER_MIDDLEWARE)).toContain(functionHook);
    });
  });
});