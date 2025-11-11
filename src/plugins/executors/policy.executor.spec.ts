import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { PolicyExecutor, PolicyExecutionConfig } from './policy.executor';
import { PolicyRegistry } from '../registries/policy.registry';
import { ConditionEvaluator } from './condition.evaluator';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { PolicyDefinition, PolicyHandler } from '../interfaces/plugin.interface';

describe('PolicyExecutor', () => {
  let executor: PolicyExecutor;
  let policyRegistry: jest.Mocked<PolicyRegistry>;
  let conditionEvaluator: jest.Mocked<ConditionEvaluator>;
  let logger: jest.Mocked<CustomLoggerService>;

  const mockRequest = {
    method: 'GET',
    url: '/test',
    headers: { 'content-type': 'application/json' },
  } as Request;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as Response;

  const mockNext: NextFunction = jest.fn();

  const mockPolicyHandler: PolicyHandler = jest.fn().mockResolvedValue(true);

  const mockPolicyDefinition: PolicyDefinition = {
    name: 'test-policy',
    policy: mockPolicyHandler,
    schema: {
      $id: 'test-policy-schema',
      type: 'object',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyExecutor,
        {
          provide: PolicyRegistry,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConditionEvaluator,
          useValue: {
            evaluate: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    executor = module.get<PolicyExecutor>(PolicyExecutor);
    policyRegistry = module.get(PolicyRegistry);
    conditionEvaluator = module.get(ConditionEvaluator);
    logger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set logger context', () => {
      expect(logger.setContext).toHaveBeenCalledWith('PolicyExecutor');
    });
  });

  describe('use (middleware)', () => {
    it('should call next() when used as middleware', async () => {
      await executor.use(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('executePolicy', () => {
    const executionConfig: PolicyExecutionConfig = {
      name: 'test-policy',
      params: { enabled: true },
    };

    beforeEach(() => {
      policyRegistry.get.mockReturnValue(mockPolicyDefinition);
    });

    it('should execute policy successfully', async () => {
      const result = await executor.executePolicy(
        executionConfig,
        mockRequest,
        mockResponse,
      );

      expect(policyRegistry.get).toHaveBeenCalledWith('test-policy');
      expect(mockPolicyHandler).toHaveBeenCalledWith(
        { enabled: true },
        expect.objectContaining({
          req: mockRequest,
          res: mockResponse,
          next: expect.any(Function),
        }),
      );
      expect(result).toBe(true);
    });

    it('should execute policy with empty params when not provided', async () => {
      const configWithoutParams: PolicyExecutionConfig = {
        name: 'test-policy',
      };

      await executor.executePolicy(
        configWithoutParams,
        mockRequest,
        mockResponse,
      );

      expect(mockPolicyHandler).toHaveBeenCalledWith(
        {},
        expect.any(Object),
      );
    });

    it('should return false when policy not found', async () => {
      policyRegistry.get.mockReturnValue(undefined);

      const result = await executor.executePolicy(
        executionConfig,
        mockRequest,
        mockResponse,
      );

      expect(logger.warn).toHaveBeenCalledWith("Policy 'test-policy' not found");
      expect(result).toBe(false);
    });

    it('should evaluate conditions before executing policy', async () => {
      const configWithCondition: PolicyExecutionConfig = {
        name: 'test-policy',
        condition: { header: { name: 'authorization' } },
      };

      conditionEvaluator.evaluate.mockResolvedValue(true);

      await executor.executePolicy(
        configWithCondition,
        mockRequest,
        mockResponse,
      );

      expect(conditionEvaluator.evaluate).toHaveBeenCalledWith(
        { header: { name: 'authorization' } },
        { req: mockRequest, res: mockResponse },
      );
      expect(mockPolicyHandler).toHaveBeenCalled();
    });

    it('should skip policy when condition is not met', async () => {
      const configWithCondition: PolicyExecutionConfig = {
        name: 'test-policy',
        condition: { header: { name: 'authorization' } },
      };

      conditionEvaluator.evaluate.mockResolvedValue(false);

      const result = await executor.executePolicy(
        configWithCondition,
        mockRequest,
        mockResponse,
      );

      expect(conditionEvaluator.evaluate).toHaveBeenCalled();
      expect(mockPolicyHandler).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        "Policy 'test-policy' skipped - condition not met",
      );
      expect(result).toBe(true); // Continue execution even when skipped
    });

    it('should handle policy that returns false', async () => {
      const falsePolicy: PolicyHandler = jest.fn().mockResolvedValue(false);
      const falsePolicyDefinition: PolicyDefinition = {
        name: 'false-policy',
        policy: falsePolicy,
      };

      policyRegistry.get.mockReturnValue(falsePolicyDefinition);

      const result = await executor.executePolicy(
        { name: 'false-policy' },
        mockRequest,
        mockResponse,
      );

      expect(result).toBe(false);
    });

    it('should handle policy that returns void/undefined', async () => {
      const voidPolicy: PolicyHandler = jest.fn().mockResolvedValue(undefined);
      const voidPolicyDefinition: PolicyDefinition = {
        name: 'void-policy',
        policy: voidPolicy,
      };

      policyRegistry.get.mockReturnValue(voidPolicyDefinition);

      const result = await executor.executePolicy(
        { name: 'void-policy' },
        mockRequest,
        mockResponse,
      );

      expect(result).toBe(true); // undefined should be treated as continue
    });

    it('should handle synchronous policy handlers', async () => {
      const syncPolicy: PolicyHandler = jest.fn().mockReturnValue(true);
      const syncPolicyDefinition: PolicyDefinition = {
        name: 'sync-policy',
        policy: syncPolicy,
      };

      policyRegistry.get.mockReturnValue(syncPolicyDefinition);

      const result = await executor.executePolicy(
        { name: 'sync-policy' },
        mockRequest,
        mockResponse,
      );

      expect(result).toBe(true);
    });

    it('should throw error when policy execution fails', async () => {
      const errorPolicy: PolicyHandler = jest.fn().mockRejectedValue(
        new Error('Policy execution error'),
      );
      const errorPolicyDefinition: PolicyDefinition = {
        name: 'error-policy',
        policy: errorPolicy,
      };

      policyRegistry.get.mockReturnValue(errorPolicyDefinition);

      await expect(
        executor.executePolicy(
          { name: 'error-policy' },
          mockRequest,
          mockResponse,
        ),
      ).rejects.toThrow('Policy execution error');

      expect(logger.error).toHaveBeenCalledWith(
        "Error executing policy 'error-policy': Policy execution error",
        expect.any(String),
      );
    });
  });

  describe('executePolicies', () => {
    const policy1Config: PolicyExecutionConfig = {
      name: 'policy1',
      params: { order: 1 },
    };

    const policy2Config: PolicyExecutionConfig = {
      name: 'policy2',
      params: { order: 2 },
    };

    const policy1: PolicyDefinition = {
      name: 'policy1',
      policy: jest.fn().mockResolvedValue(true),
    };

    const policy2: PolicyDefinition = {
      name: 'policy2',
      policy: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      policyRegistry.get.mockImplementation((name) => {
        if (name === 'policy1') return policy1;
        if (name === 'policy2') return policy2;
        return undefined;
      });
    });

    it('should execute multiple policies in sequence', async () => {
      const result = await executor.executePolicies(
        [policy1Config, policy2Config],
        mockRequest,
        mockResponse,
      );

      expect(policy1.policy).toHaveBeenCalledWith(
        { order: 1 },
        expect.any(Object),
      );
      expect(policy2.policy).toHaveBeenCalledWith(
        { order: 2 },
        expect.any(Object),
      );
      expect(result).toBe(true);
    });

    it('should stop execution when a policy returns false', async () => {
      const stoppingPolicy: PolicyDefinition = {
        name: 'policy1',
        policy: jest.fn().mockResolvedValue(false), // This should stop execution
      };

      policyRegistry.get.mockImplementation((name) => {
        if (name === 'policy1') return stoppingPolicy;
        if (name === 'policy2') return policy2;
        return undefined;
      });

      const result = await executor.executePolicies(
        [policy1Config, policy2Config],
        mockRequest,
        mockResponse,
      );

      expect(stoppingPolicy.policy).toHaveBeenCalled();
      expect(policy2.policy).not.toHaveBeenCalled(); // Should not be called
      expect(result).toBe(false);
    });

    it('should execute empty policy array successfully', async () => {
      const result = await executor.executePolicies(
        [],
        mockRequest,
        mockResponse,
      );

      expect(result).toBe(true);
    });

    it('should propagate errors from individual policy execution', async () => {
      const errorPolicy: PolicyDefinition = {
        name: 'policy1',
        policy: jest.fn().mockRejectedValue(new Error('Policy error')),
      };

      policyRegistry.get.mockImplementation((name) => {
        if (name === 'policy1') return errorPolicy;
        return undefined;
      });

      await expect(
        executor.executePolicies(
          [policy1Config, policy2Config],
          mockRequest,
          mockResponse,
        ),
      ).rejects.toThrow('Policy error');

      expect(policy2.policy).not.toHaveBeenCalled(); // Should not reach second policy
    });
  });

  describe('executePolicyHandler', () => {
    it('should handle function-based policy', async () => {
      const functionPolicy: PolicyHandler = jest.fn().mockResolvedValue(true);
      const policyDef: PolicyDefinition = {
        name: 'function-policy',
        policy: functionPolicy,
      };

      const result = await executor['executePolicyHandler'](
        policyDef,
        { param: 'value' },
        {
          req: mockRequest,
          res: mockResponse,
          next: jest.fn(),
        },
      );

      expect(functionPolicy).toHaveBeenCalledWith(
        { param: 'value' },
        expect.objectContaining({
          req: mockRequest,
          res: mockResponse,
          next: expect.any(Function),
        }),
      );
      expect(result).toBe(true);
    });

    it('should handle class-based policy', async () => {
      class TestPolicy {
        execute() {
          return true;
        }
      }

      const classPolicyDef: PolicyDefinition = {
        name: 'class-policy',
        policy: TestPolicy as any, // Class reference
      };

      const result = await executor['executePolicyHandler'](
        classPolicyDef,
        {},
        {
          req: mockRequest,
          res: mockResponse,
          next: jest.fn(),
        },
      );

      expect(result).toBe(true); // Class-based policies return true by default
    });
  });

  describe('policy context', () => {
    it('should provide complete policy context', async () => {
      let capturedContext: any;
      const contextCapturingPolicy: PolicyHandler = jest.fn().mockImplementation(
        (params, context) => {
          capturedContext = context;
          return true;
        },
      );

      const policyDef: PolicyDefinition = {
        name: 'context-policy',
        policy: contextCapturingPolicy,
      };

      policyRegistry.get.mockReturnValue(policyDef);

      await executor.executePolicy(
        { name: 'context-policy' },
        mockRequest,
        mockResponse,
      );

      expect(capturedContext).toBeDefined();
      expect(capturedContext.req).toBe(mockRequest);
      expect(capturedContext.res).toBe(mockResponse);
      expect(typeof capturedContext.next).toBe('function');
      expect(capturedContext.graphql).toBeUndefined(); // Not set in this test
    });

    it('should handle GraphQL context in policy', async () => {
      const graphqlPolicy: PolicyHandler = jest.fn().mockResolvedValue(true);
      const graphqlPolicyDef: PolicyDefinition = {
        name: 'graphql-policy',
        policy: graphqlPolicy,
      };

      policyRegistry.get.mockReturnValue(graphqlPolicyDef);

      // Mock GraphQL context by extending the executor
      const originalMethod = executor['executePolicyHandler'];
      executor['executePolicyHandler'] = jest.fn().mockImplementation(
        (policy, params, context) => {
          context.graphql = {
            info: { fieldName: 'test' },
            args: { id: 1 },
            context: { user: { id: 'user1' } },
          };
          return originalMethod.call(executor, policy, params, context);
        },
      );

      await executor.executePolicy(
        { name: 'graphql-policy' },
        mockRequest,
        mockResponse,
      );

      expect(graphqlPolicy).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          req: mockRequest,
          res: mockResponse,
          graphql: expect.objectContaining({
            info: { fieldName: 'test' },
            args: { id: 1 },
            context: { user: { id: 'user1' } },
          }),
        }),
      );
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      policyRegistry.get.mockReturnValue(mockPolicyDefinition);
    });

    it('should handle condition evaluation errors gracefully', async () => {
      conditionEvaluator.evaluate.mockRejectedValue(
        new Error('Condition evaluation failed'),
      );

      await expect(
        executor.executePolicy(
          {
            name: 'test-policy',
            condition: { invalid: 'condition' },
          },
          mockRequest,
          mockResponse,
        ),
      ).rejects.toThrow('Condition evaluation failed');
    });

    it('should handle complex nested conditions', async () => {
      const complexCondition = {
        and: [
          { header: { name: 'authorization' } },
          { or: [{ method: 'GET' }, { method: 'POST' }] },
        ],
      };

      conditionEvaluator.evaluate.mockResolvedValue(true);

      await executor.executePolicy(
        {
          name: 'test-policy',
          condition: complexCondition,
        },
        mockRequest,
        mockResponse,
      );

      expect(conditionEvaluator.evaluate).toHaveBeenCalledWith(
        complexCondition,
        { req: mockRequest, res: mockResponse },
      );
    });

    it('should handle policy with complex parameters', async () => {
      const complexParams = {
        rules: [
          { type: 'rate-limit', limit: 100, window: '1h' },
          { type: 'whitelist', ips: ['192.168.1.1', '10.0.0.1'] },
        ],
        options: {
          strict: true,
          fallback: 'deny',
        },
      };

      await executor.executePolicy(
        {
          name: 'test-policy',
          params: complexParams,
        },
        mockRequest,
        mockResponse,
      );

      expect(mockPolicyHandler).toHaveBeenCalledWith(
        complexParams,
        expect.any(Object),
      );
    });
  });
});