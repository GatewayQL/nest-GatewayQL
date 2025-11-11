import { Test, TestingModule } from '@nestjs/testing';
import { PolicyRegistry } from './policy.registry';
import { PolicyDefinition } from '../interfaces/plugin.interface';

describe('PolicyRegistry', () => {
  let registry: PolicyRegistry;

  const mockPolicyDefinition: PolicyDefinition = {
    name: 'test-policy',
    policy: jest.fn(),
    schema: {
      $id: 'test-schema',
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
      },
    },
  };

  const anotherPolicyDefinition: PolicyDefinition = {
    name: 'another-policy',
    policy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PolicyRegistry],
    }).compile();

    registry = module.get<PolicyRegistry>(PolicyRegistry);
  });

  afterEach(() => {
    registry.clear();
  });

  describe('register', () => {
    it('should register a new policy', () => {
      registry.register(mockPolicyDefinition);

      expect(registry.has('test-policy')).toBe(true);
      expect(registry.get('test-policy')).toBe(mockPolicyDefinition);
    });

    it('should throw error when registering duplicate policy', () => {
      registry.register(mockPolicyDefinition);

      expect(() => registry.register(mockPolicyDefinition)).toThrow(
        "Policy 'test-policy' is already registered",
      );
    });

    it('should register multiple different policies', () => {
      registry.register(mockPolicyDefinition);
      registry.register(anotherPolicyDefinition);

      expect(registry.has('test-policy')).toBe(true);
      expect(registry.has('another-policy')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return policy definition when it exists', () => {
      registry.register(mockPolicyDefinition);

      const result = registry.get('test-policy');

      expect(result).toBe(mockPolicyDefinition);
    });

    it('should return undefined when policy does not exist', () => {
      const result = registry.get('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true when policy exists', () => {
      registry.register(mockPolicyDefinition);

      expect(registry.has('test-policy')).toBe(true);
    });

    it('should return false when policy does not exist', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered policies', () => {
      registry.register(mockPolicyDefinition);
      registry.register(anotherPolicyDefinition);

      const result = registry.getAll();

      expect(result).toHaveLength(2);
      expect(result).toContain(mockPolicyDefinition);
      expect(result).toContain(anotherPolicyDefinition);
    });

    it('should return empty array when no policies registered', () => {
      const result = registry.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getAllNames', () => {
    it('should return all policy names', () => {
      registry.register(mockPolicyDefinition);
      registry.register(anotherPolicyDefinition);

      const result = registry.getAllNames();

      expect(result).toHaveLength(2);
      expect(result).toContain('test-policy');
      expect(result).toContain('another-policy');
    });

    it('should return empty array when no policies registered', () => {
      const result = registry.getAllNames();

      expect(result).toEqual([]);
    });
  });

  describe('unregister', () => {
    it('should unregister existing policy', () => {
      registry.register(mockPolicyDefinition);
      expect(registry.has('test-policy')).toBe(true);

      const result = registry.unregister('test-policy');

      expect(result).toBe(true);
      expect(registry.has('test-policy')).toBe(false);
    });

    it('should return false when trying to unregister non-existent policy', () => {
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });

    it('should not affect other policies when unregistering one', () => {
      registry.register(mockPolicyDefinition);
      registry.register(anotherPolicyDefinition);

      registry.unregister('test-policy');

      expect(registry.has('test-policy')).toBe(false);
      expect(registry.has('another-policy')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all registered policies', () => {
      registry.register(mockPolicyDefinition);
      registry.register(anotherPolicyDefinition);
      expect(registry.getAll()).toHaveLength(2);

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
      expect(registry.has('test-policy')).toBe(false);
      expect(registry.has('another-policy')).toBe(false);
    });

    it('should work on empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle policy with minimal properties', () => {
      const minimalPolicy: PolicyDefinition = {
        name: 'minimal',
        policy: () => true,
      };

      registry.register(minimalPolicy);

      expect(registry.get('minimal')).toBe(minimalPolicy);
    });

    it('should handle policy with complex schema', () => {
      const complexPolicy: PolicyDefinition = {
        name: 'complex',
        policy: jest.fn(),
        schema: {
          $id: 'complex-schema',
          type: 'object',
          properties: {
            options: {
              type: 'object',
              properties: {
                nested: { type: 'string' },
                array: {
                  type: 'array',
                  items: { type: 'number' },
                },
              },
              required: ['nested'],
            },
          },
          required: ['options'],
        },
      };

      registry.register(complexPolicy);

      expect(registry.get('complex')).toBe(complexPolicy);
    });

    it('should preserve insertion order in getAll', () => {
      const policy1: PolicyDefinition = { name: 'first', policy: jest.fn() };
      const policy2: PolicyDefinition = { name: 'second', policy: jest.fn() };
      const policy3: PolicyDefinition = { name: 'third', policy: jest.fn() };

      registry.register(policy1);
      registry.register(policy2);
      registry.register(policy3);

      const result = registry.getAll();

      expect(result[0].name).toBe('first');
      expect(result[1].name).toBe('second');
      expect(result[2].name).toBe('third');
    });
  });
});