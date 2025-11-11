import { Test, TestingModule } from '@nestjs/testing';
import { ConditionRegistry } from './condition.registry';
import { ConditionDefinition } from '../interfaces/plugin.interface';

describe('ConditionRegistry', () => {
  let registry: ConditionRegistry;

  const mockConditionDefinition: ConditionDefinition = {
    name: 'test-condition',
    handler: jest.fn().mockReturnValue(true),
    schema: {
      $id: 'test-condition-schema',
      type: 'object',
      properties: {
        value: { type: 'string' },
        enabled: { type: 'boolean' },
      },
      required: ['value'],
    },
  };

  const anotherConditionDefinition: ConditionDefinition = {
    name: 'another-condition',
    handler: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConditionRegistry],
    }).compile();

    registry = module.get<ConditionRegistry>(ConditionRegistry);
  });

  afterEach(() => {
    registry.clear();
  });

  describe('register', () => {
    it('should register a new condition', () => {
      registry.register(mockConditionDefinition);

      expect(registry.has('test-condition')).toBe(true);
      expect(registry.get('test-condition')).toBe(mockConditionDefinition);
    });

    it('should throw error when registering duplicate condition', () => {
      registry.register(mockConditionDefinition);

      expect(() => registry.register(mockConditionDefinition)).toThrow(
        "Condition 'test-condition' is already registered",
      );
    });

    it('should register multiple different conditions', () => {
      registry.register(mockConditionDefinition);
      registry.register(anotherConditionDefinition);

      expect(registry.has('test-condition')).toBe(true);
      expect(registry.has('another-condition')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return condition definition when it exists', () => {
      registry.register(mockConditionDefinition);

      const result = registry.get('test-condition');

      expect(result).toBe(mockConditionDefinition);
    });

    it('should return undefined when condition does not exist', () => {
      const result = registry.get('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true when condition exists', () => {
      registry.register(mockConditionDefinition);

      expect(registry.has('test-condition')).toBe(true);
    });

    it('should return false when condition does not exist', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered conditions', () => {
      registry.register(mockConditionDefinition);
      registry.register(anotherConditionDefinition);

      const result = registry.getAll();

      expect(result).toHaveLength(2);
      expect(result).toContain(mockConditionDefinition);
      expect(result).toContain(anotherConditionDefinition);
    });

    it('should return empty array when no conditions registered', () => {
      const result = registry.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getAllNames', () => {
    it('should return all condition names', () => {
      registry.register(mockConditionDefinition);
      registry.register(anotherConditionDefinition);

      const result = registry.getAllNames();

      expect(result).toHaveLength(2);
      expect(result).toContain('test-condition');
      expect(result).toContain('another-condition');
    });

    it('should return empty array when no conditions registered', () => {
      const result = registry.getAllNames();

      expect(result).toEqual([]);
    });
  });

  describe('unregister', () => {
    it('should unregister existing condition', () => {
      registry.register(mockConditionDefinition);
      expect(registry.has('test-condition')).toBe(true);

      const result = registry.unregister('test-condition');

      expect(result).toBe(true);
      expect(registry.has('test-condition')).toBe(false);
    });

    it('should return false when trying to unregister non-existent condition', () => {
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });

    it('should not affect other conditions when unregistering one', () => {
      registry.register(mockConditionDefinition);
      registry.register(anotherConditionDefinition);

      registry.unregister('test-condition');

      expect(registry.has('test-condition')).toBe(false);
      expect(registry.has('another-condition')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all registered conditions', () => {
      registry.register(mockConditionDefinition);
      registry.register(anotherConditionDefinition);
      expect(registry.getAll()).toHaveLength(2);

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
      expect(registry.has('test-condition')).toBe(false);
      expect(registry.has('another-condition')).toBe(false);
    });

    it('should work on empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle condition with minimal properties', () => {
      const minimalCondition: ConditionDefinition = {
        name: 'minimal',
        handler: () => true,
      };

      registry.register(minimalCondition);

      expect(registry.get('minimal')).toBe(minimalCondition);
    });

    it('should handle async condition handler', () => {
      const asyncCondition: ConditionDefinition = {
        name: 'async',
        handler: async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return true;
        },
      };

      registry.register(asyncCondition);

      expect(registry.get('async')).toBe(asyncCondition);
    });

    it('should handle condition with complex schema including enum', () => {
      const complexCondition: ConditionDefinition = {
        name: 'complex',
        handler: jest.fn(),
        schema: {
          $id: 'complex-condition-schema',
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['equals', 'contains', 'regex'],
            },
            value: { type: 'string' },
            caseSensitive: { type: 'boolean', default: true },
            options: {
              type: 'object',
              properties: {
                timeout: { type: 'number', minimum: 0 },
                retries: { type: 'integer', minimum: 0 },
              },
            },
          },
          required: ['operation', 'value'],
        },
      };

      registry.register(complexCondition);

      expect(registry.get('complex')).toBe(complexCondition);
    });

    it('should preserve insertion order in getAll', () => {
      const condition1: ConditionDefinition = {
        name: 'first',
        handler: jest.fn()
      };
      const condition2: ConditionDefinition = {
        name: 'second',
        handler: jest.fn()
      };
      const condition3: ConditionDefinition = {
        name: 'third',
        handler: jest.fn()
      };

      registry.register(condition1);
      registry.register(condition2);
      registry.register(condition3);

      const result = registry.getAll();

      expect(result[0].name).toBe('first');
      expect(result[1].name).toBe('second');
      expect(result[2].name).toBe('third');
    });

    it('should handle condition handler that throws', () => {
      const throwingCondition: ConditionDefinition = {
        name: 'throwing',
        handler: () => {
          throw new Error('Handler error');
        },
      };

      registry.register(throwingCondition);

      expect(registry.get('throwing')).toBe(throwingCondition);
      // The registry doesn't execute handlers, so no error should occur here
    });

    it('should handle condition with no schema', () => {
      const noSchemaCondition: ConditionDefinition = {
        name: 'no-schema',
        handler: (config, context) => {
          return context.req.url === '/test';
        },
      };

      registry.register(noSchemaCondition);

      expect(registry.get('no-schema')).toBe(noSchemaCondition);
      expect(registry.get('no-schema')?.schema).toBeUndefined();
    });
  });
});