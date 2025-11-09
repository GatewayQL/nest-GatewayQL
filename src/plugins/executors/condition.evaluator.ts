import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConditionRegistry } from '../registries/condition.registry';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { ConditionContext } from '../interfaces/plugin.interface';

/**
 * Condition Evaluator - evaluates conditions for policy execution
 */
@Injectable()
export class ConditionEvaluator {
  constructor(
    private readonly conditionRegistry: ConditionRegistry,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('ConditionEvaluator');
  }

  /**
   * Evaluate a condition configuration
   */
  async evaluate(
    conditionConfig: any,
    context: { req: Request; res: Response },
  ): Promise<boolean> {
    try {
      // Handle simple condition name
      if (typeof conditionConfig === 'string') {
        return this.evaluateSingleCondition(conditionConfig, {}, context);
      }

      // Handle condition with parameters
      if (typeof conditionConfig === 'object') {
        // Handle AND conditions
        if (conditionConfig.and) {
          return this.evaluateAndConditions(conditionConfig.and, context);
        }

        // Handle OR conditions
        if (conditionConfig.or) {
          return this.evaluateOrConditions(conditionConfig.or, context);
        }

        // Handle NOT condition
        if (conditionConfig.not) {
          const result = await this.evaluate(conditionConfig.not, context);
          return !result;
        }

        // Handle single condition with config
        const conditionName = Object.keys(conditionConfig)[0];
        const conditionParams = conditionConfig[conditionName];
        return this.evaluateSingleCondition(
          conditionName,
          conditionParams,
          context,
        );
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Error evaluating condition: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateSingleCondition(
    name: string,
    params: any,
    context: { req: Request; res: Response },
  ): Promise<boolean> {
    const condition = this.conditionRegistry.get(name);

    if (!condition) {
      this.logger.warn(`Condition '${name}' not found`);
      return false;
    }

    const conditionContext: ConditionContext = {
      req: context.req,
      res: context.res,
    };

    return condition.handler(params, conditionContext);
  }

  /**
   * Evaluate AND conditions (all must be true)
   */
  private async evaluateAndConditions(
    conditions: any[],
    context: { req: Request; res: Response },
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluate(condition, context);
      if (!result) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate OR conditions (at least one must be true)
   */
  private async evaluateOrConditions(
    conditions: any[],
    context: { req: Request; res: Response },
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluate(condition, context);
      if (result) {
        return true;
      }
    }
    return false;
  }
}
