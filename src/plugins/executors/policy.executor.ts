import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PolicyRegistry } from '../registries/policy.registry';
import { ConditionEvaluator } from './condition.evaluator';
import { CustomLoggerService } from '../../common/logger/logger.service';
import {
  PolicyContext,
  PolicyHandler,
  PolicyDefinition,
} from '../interfaces/plugin.interface';

/**
 * Policy configuration for execution
 */
export interface PolicyExecutionConfig {
  /**
   * Policy name to execute
   */
  name: string;

  /**
   * Policy parameters
   */
  params?: any;

  /**
   * Conditions that must be met for policy to execute
   */
  condition?: any;
}

/**
 * Policy Executor - executes policies with conditions
 */
@Injectable()
export class PolicyExecutor implements NestMiddleware {
  constructor(
    private readonly policyRegistry: PolicyRegistry,
    private readonly conditionEvaluator: ConditionEvaluator,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('PolicyExecutor');
  }

  /**
   * Execute middleware
   */
  async use(req: Request, res: Response, next: NextFunction) {
    // Policies are typically configured per route
    // This is a placeholder for global policy execution
    next();
  }

  /**
   * Execute a single policy
   */
  async executePolicy(
    config: PolicyExecutionConfig,
    req: Request,
    res: Response,
  ): Promise<boolean> {
    try {
      const policy = this.policyRegistry.get(config.name);

      if (!policy) {
        this.logger.warn(`Policy '${config.name}' not found`);
        return false;
      }

      // Evaluate conditions if present
      if (config.condition) {
        const conditionMet = await this.conditionEvaluator.evaluate(
          config.condition,
          { req, res },
        );
        if (!conditionMet) {
          this.logger.debug(
            `Policy '${config.name}' skipped - condition not met`,
          );
          return true; // Continue execution
        }
      }

      // Execute policy
      const context: PolicyContext = {
        req,
        res,
        next: () => {
          // No-op for now
        },
      };

      const result = await this.executePolicyHandler(
        policy,
        config.params || {},
        context,
      );

      return result !== false; // Continue unless explicitly false
    } catch (error) {
      this.logger.error(
        `Error executing policy '${config.name}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Execute multiple policies in sequence
   */
  async executePolicies(
    configs: PolicyExecutionConfig[],
    req: Request,
    res: Response,
  ): Promise<boolean> {
    for (const config of configs) {
      const result = await this.executePolicy(config, req, res);
      if (!result) {
        return false; // Stop execution if policy returns false
      }
    }
    return true;
  }

  /**
   * Execute policy handler (function or class)
   */
  private async executePolicyHandler(
    policy: PolicyDefinition,
    params: any,
    context: PolicyContext,
  ): Promise<void | boolean> {
    if (typeof policy.policy === 'function') {
      // Function-based policy
      return (policy.policy as PolicyHandler)(params, context);
    } else {
      // Class-based policy (NestJS guard/interceptor)
      // These are handled by the framework
      return true;
    }
  }
}
