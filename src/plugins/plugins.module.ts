import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../common/logger/logger.module';
import { PluginManager } from './plugin.manager';
import { PolicyRegistry } from './registries/policy.registry';
import { ConditionRegistry } from './registries/condition.registry';
import { RouteRegistry } from './registries/route.registry';
import { GraphQLHookRegistry } from './registries/graphql-hook.registry';
import { PolicyExecutor } from './executors/policy.executor';
import { ConditionEvaluator } from './executors/condition.evaluator';
import { PluginController } from './plugin.controller';

// Import built-in conditions
import {
  pathMatchCondition,
  methodCondition,
  headerCondition,
  queryParamCondition,
  graphqlOperationCondition,
} from './built-in/conditions';

/**
 * Plugins Module - manages the plugin system
 */
@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [
    PluginManager,
    PolicyRegistry,
    ConditionRegistry,
    RouteRegistry,
    GraphQLHookRegistry,
    PolicyExecutor,
    ConditionEvaluator,
  ],
  controllers: [PluginController],
  exports: [
    PluginManager,
    PolicyRegistry,
    ConditionRegistry,
    RouteRegistry,
    GraphQLHookRegistry,
    PolicyExecutor,
    ConditionEvaluator,
  ],
})
export class PluginsModule implements OnModuleInit {
  constructor(
    private readonly conditionRegistry: ConditionRegistry,
  ) {}

  /**
   * Register built-in conditions on module initialization
   */
  onModuleInit() {
    // Register built-in conditions
    this.conditionRegistry.register(pathMatchCondition);
    this.conditionRegistry.register(methodCondition);
    this.conditionRegistry.register(headerCondition);
    this.conditionRegistry.register(queryParamCondition);
    this.conditionRegistry.register(graphqlOperationCondition);
  }
}
