import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { ConditionEvaluator } from './condition.evaluator';
import { ConditionRegistry } from '../registries/condition.registry';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { ConditionDefinition } from '../interfaces/plugin.interface';

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator;
  let conditionRegistry: jest.Mocked<ConditionRegistry>;
  let logger: jest.Mocked<CustomLoggerService>;

  const mockRequest = {
    method: 'GET',
    url: '/api/test',
    headers: {
      'authorization': 'Bearer token123',
      'content-type': 'application/json',
      'x-custom': 'value',
    },
    query: { param1: 'value1', param2: 'value2' },
  } as unknown as Request;

  const mockResponse = {
    locals: {},
  } as Response;

  const mockHeaderCondition: ConditionDefinition = {
    name: 'header',
    handler: jest.fn().mockReturnValue(true),
    schema: {
      $id: 'header-condition',
      type: 'object',
      properties: {
        name: { type: 'string' },
        value: { type: 'string' },
      },
      required: ['name'],
    },
  };

  const mockMethodCondition: ConditionDefinition = {
    name: 'method',
    handler: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConditionEvaluator,
        {
          provide: ConditionRegistry,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    evaluator = module.get<ConditionEvaluator>(ConditionEvaluator);
    conditionRegistry = module.get(ConditionRegistry);
    logger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set logger context', () => {
      expect(logger.setContext).toHaveBeenCalledWith('ConditionEvaluator');
    });
  });

  describe('evaluate', () => {
    describe('string conditions', () => {
      it('should evaluate simple string condition', async () => {
        conditionRegistry.get.mockReturnValue(mockHeaderCondition);

        const result = await evaluator.evaluate(
          'header',
          { req: mockRequest, res: mockResponse },
        );

        expect(conditionRegistry.get).toHaveBeenCalledWith('header');
        expect(mockHeaderCondition.handler).toHaveBeenCalledWith(
          {},
          {
            req: mockRequest,
            res: mockResponse,
          },
        );
        expect(result).toBe(true);
      });

      it('should return false for unknown condition', async () => {
        conditionRegistry.get.mockReturnValue(undefined);

        const result = await evaluator.evaluate(
          'unknown',
          { req: mockRequest, res: mockResponse },
        );

        expect(logger.warn).toHaveBeenCalledWith("Condition 'unknown' not found");
        expect(result).toBe(false);
      });
    });

    describe('object conditions with parameters', () => {
      it('should evaluate condition with parameters', async () => {
        conditionRegistry.get.mockReturnValue(mockHeaderCondition);

        const result = await evaluator.evaluate(
          {
            header: { name: 'authorization', value: 'Bearer token123' },
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(mockHeaderCondition.handler).toHaveBeenCalledWith(
          { name: 'authorization', value: 'Bearer token123' },
          {
            req: mockRequest,
            res: mockResponse,
          },
        );
        expect(result).toBe(true);
      });

      it('should handle multiple condition properties (use first)', async () => {
        conditionRegistry.get.mockImplementation((name) => {
          if (name === 'header') return mockHeaderCondition;
          if (name === 'method') return mockMethodCondition;
          return undefined;
        });

        const result = await evaluator.evaluate(
          {
            header: { name: 'authorization' },
            method: 'POST', // This should be ignored
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(conditionRegistry.get).toHaveBeenCalledWith('header');
        expect(mockHeaderCondition.handler).toHaveBeenCalled();
        expect(mockMethodCondition.handler).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });

    describe('AND conditions', () => {
      beforeEach(() => {
        conditionRegistry.get.mockImplementation((name) => {
          if (name === 'header') return mockHeaderCondition;
          if (name === 'method') return mockMethodCondition;
          return undefined;
        });
      });

      it('should evaluate AND conditions (all true)', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(true);
        mockMethodCondition.handler = jest.fn().mockReturnValue(true);

        const result = await evaluator.evaluate(
          {
            and: [
              { header: { name: 'authorization' } },
              { method: 'GET' },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(true);
      });

      it('should evaluate AND conditions (one false)', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(true);
        mockMethodCondition.handler = jest.fn().mockReturnValue(false);

        const result = await evaluator.evaluate(
          {
            and: [
              { header: { name: 'authorization' } },
              { method: 'POST' },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(false);
      });

      it('should short-circuit AND conditions on first false', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(false);
        mockMethodCondition.handler = jest.fn().mockReturnValue(true);

        const result = await evaluator.evaluate(
          {
            and: [
              { header: { name: 'missing' } },
              { method: 'GET' },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(mockHeaderCondition.handler).toHaveBeenCalled();
        expect(mockMethodCondition.handler).not.toHaveBeenCalled();
        expect(result).toBe(false);
      });

      it('should handle empty AND array', async () => {
        const result = await evaluator.evaluate(
          { and: [] },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(true); // Empty AND should be true
      });

      it('should handle nested AND conditions', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(true);
        mockMethodCondition.handler = jest.fn().mockReturnValue(true);

        const result = await evaluator.evaluate(
          {
            and: [
              {
                and: [
                  { header: { name: 'authorization' } },
                  { method: 'GET' },
                ],
              },
              { header: { name: 'content-type' } },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(true);
      });
    });

    describe('OR conditions', () => {
      beforeEach(() => {
        conditionRegistry.get.mockImplementation((name) => {
          if (name === 'header') return mockHeaderCondition;
          if (name === 'method') return mockMethodCondition;
          return undefined;
        });
      });

      it('should evaluate OR conditions (all false)', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(false);
        mockMethodCondition.handler = jest.fn().mockReturnValue(false);

        const result = await evaluator.evaluate(
          {
            or: [
              { header: { name: 'missing' } },
              { method: 'POST' },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(false);
      });

      it('should evaluate OR conditions (one true)', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(true);
        mockMethodCondition.handler = jest.fn().mockReturnValue(false);

        const result = await evaluator.evaluate(
          {
            or: [
              { header: { name: 'authorization' } },
              { method: 'POST' },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(true);
      });

      it('should short-circuit OR conditions on first true', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(true);
        mockMethodCondition.handler = jest.fn().mockReturnValue(false);

        const result = await evaluator.evaluate(
          {
            or: [
              { header: { name: 'authorization' } },
              { method: 'POST' },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(mockHeaderCondition.handler).toHaveBeenCalled();
        expect(mockMethodCondition.handler).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle empty OR array', async () => {
        const result = await evaluator.evaluate(
          { or: [] },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(false); // Empty OR should be false
      });

      it('should handle nested OR conditions', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(false);
        mockMethodCondition.handler = jest.fn().mockReturnValue(true);

        const result = await evaluator.evaluate(
          {
            or: [
              {
                or: [
                  { header: { name: 'missing' } },
                  { method: 'GET' },
                ],
              },
              { header: { name: 'also-missing' } },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(true);
      });
    });

    describe('NOT conditions', () => {
      beforeEach(() => {
        conditionRegistry.get.mockReturnValue(mockHeaderCondition);
      });

      it('should negate true condition', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(true);

        const result = await evaluator.evaluate(
          {
            not: { header: { name: 'authorization' } },
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(false);
      });

      it('should negate false condition', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(false);

        const result = await evaluator.evaluate(
          {
            not: { header: { name: 'missing' } },
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(true);
      });

      it('should handle nested NOT conditions', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(true);

        const result = await evaluator.evaluate(
          {
            not: {
              not: { header: { name: 'authorization' } },
            },
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(true); // Double negation
      });

      it('should handle NOT with complex conditions', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(true);
        mockMethodCondition.handler = jest.fn().mockReturnValue(false);

        conditionRegistry.get.mockImplementation((name) => {
          if (name === 'header') return mockHeaderCondition;
          if (name === 'method') return mockMethodCondition;
          return undefined;
        });

        const result = await evaluator.evaluate(
          {
            not: {
              and: [
                { header: { name: 'authorization' } },
                { method: 'POST' },
              ],
            },
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(true); // NOT (true AND false) = NOT false = true
      });
    });

    describe('complex nested conditions', () => {
      beforeEach(() => {
        conditionRegistry.get.mockImplementation((name) => {
          if (name === 'header') return mockHeaderCondition;
          if (name === 'method') return mockMethodCondition;
          return undefined;
        });
      });

      it('should handle deeply nested conditions', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(true);
        mockMethodCondition.handler = jest.fn().mockReturnValue(true);

        const result = await evaluator.evaluate(
          {
            or: [
              {
                and: [
                  {
                    not: { header: { name: 'x-blocked' } },
                  },
                  { method: 'GET' },
                ],
              },
              {
                header: { name: 'x-admin' },
              },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        // Should evaluate: (NOT false AND true) OR true = (true AND true) OR true = true OR true = true
        expect(result).toBe(true);
      });

      it('should handle mixed condition types', async () => {
        mockHeaderCondition.handler = jest.fn().mockReturnValue(true);
        mockMethodCondition.handler = jest.fn().mockReturnValue(false);

        const result = await evaluator.evaluate(
          {
            and: [
              'header', // String condition
              { method: 'POST' }, // Object condition
              {
                or: [
                  { header: { name: 'fallback' } },
                  { not: { method: 'DELETE' } },
                ],
              },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        // Should evaluate: true AND false AND (true OR true) = true AND false AND true = false
        expect(result).toBe(false);
      });
    });

    describe('async condition handlers', () => {
      it('should handle async condition handlers', async () => {
        const asyncCondition: ConditionDefinition = {
          name: 'async-condition',
          handler: jest.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
            return true;
          }),
        };

        conditionRegistry.get.mockReturnValue(asyncCondition);

        const result = await evaluator.evaluate(
          'async-condition',
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(true);
      });

      it('should handle async conditions in complex expressions', async () => {
        const asyncCondition: ConditionDefinition = {
          name: 'async-condition',
          handler: jest.fn().mockResolvedValue(true),
        };

        conditionRegistry.get.mockImplementation((name) => {
          if (name === 'async-condition') return asyncCondition;
          if (name === 'method') return mockMethodCondition;
          return undefined;
        });

        mockMethodCondition.handler = jest.fn().mockReturnValue(false);

        const result = await evaluator.evaluate(
          {
            or: [
              { 'async-condition': {} },
              { method: 'POST' },
            ],
          },
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle condition handler errors', async () => {
        const errorCondition: ConditionDefinition = {
          name: 'error-condition',
          handler: jest.fn().mockImplementation(() => {
            throw new Error('Condition handler error');
          }),
        };

        conditionRegistry.get.mockReturnValue(errorCondition);

        const result = await evaluator.evaluate(
          'error-condition',
          { req: mockRequest, res: mockResponse },
        );

        expect(logger.error).toHaveBeenCalledWith(
          'Error evaluating condition: Condition handler error',
          expect.any(String),
        );
        expect(result).toBe(false);
      });

      it('should handle async condition handler errors', async () => {
        const asyncErrorCondition: ConditionDefinition = {
          name: 'async-error-condition',
          handler: jest.fn().mockRejectedValue(new Error('Async error')),
        };

        conditionRegistry.get.mockReturnValue(asyncErrorCondition);

        const result = await evaluator.evaluate(
          'async-error-condition',
          { req: mockRequest, res: mockResponse },
        );

        expect(logger.error).toHaveBeenCalledWith(
          'Error evaluating condition: Async error',
          expect.any(String),
        );
        expect(result).toBe(false);
      });

      it('should handle malformed condition objects', async () => {
        const result = await evaluator.evaluate(
          { invalid: { nested: { deeply: 'wrong' } } },
          { req: mockRequest, res: mockResponse },
        );

        expect(conditionRegistry.get).toHaveBeenCalledWith('invalid');
        expect(logger.warn).toHaveBeenCalledWith("Condition 'invalid' not found");
        expect(result).toBe(false);
      });

      it('should handle non-string, non-object conditions', async () => {
        const result = await evaluator.evaluate(
          123 as any,
          { req: mockRequest, res: mockResponse },
        );

        expect(result).toBe(false);
      });

      it('should handle null/undefined conditions', async () => {
        const nullResult = await evaluator.evaluate(
          null as any,
          { req: mockRequest, res: mockResponse },
        );

        const undefinedResult = await evaluator.evaluate(
          undefined as any,
          { req: mockRequest, res: mockResponse },
        );

        expect(nullResult).toBe(false);
        expect(undefinedResult).toBe(false);
      });
    });

    describe('evaluateSingleCondition', () => {
      it('should create proper condition context', async () => {
        let capturedContext: any;
        const contextCapturingCondition: ConditionDefinition = {
          name: 'context-condition',
          handler: jest.fn().mockImplementation((params, context) => {
            capturedContext = context;
            return true;
          }),
        };

        conditionRegistry.get.mockReturnValue(contextCapturingCondition);

        await evaluator['evaluateSingleCondition'](
          'context-condition',
          { param: 'value' },
          { req: mockRequest, res: mockResponse },
        );

        expect(capturedContext).toBeDefined();
        expect(capturedContext.req).toBe(mockRequest);
        expect(capturedContext.res).toBe(mockResponse);
        expect(capturedContext.graphql).toBeUndefined();
      });
    });
  });
});