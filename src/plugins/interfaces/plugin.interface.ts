import { Type } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';

/**
 * Plugin manifest interface - defines the structure of a plugin
 * Similar to Express Gateway plugin structure
 */
export interface PluginManifest {
  /**
   * Unique plugin name
   */
  name: string;

  /**
   * Plugin version following semver
   */
  version: string;

  /**
   * Plugin description
   */
  description?: string;

  /**
   * Plugin author
   */
  author?: string;

  /**
   * Plugin initialization function
   */
  init: (context: PluginContext) => void | Promise<void>;

  /**
   * Plugin schema for configuration validation
   */
  schema?: {
    $id: string;
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };

  /**
   * Dependencies on other plugins
   */
  dependencies?: string[];
}

/**
 * Plugin context provided to plugins during initialization
 */
export interface PluginContext {
  /**
   * Register a policy
   */
  registerPolicy: (policy: PolicyDefinition) => void;

  /**
   * Register a condition
   */
  registerCondition: (condition: ConditionDefinition) => void;

  /**
   * Register routes
   */
  registerRoutes: (routes: RouteDefinition[]) => void;

  /**
   * Register GraphQL hooks
   */
  registerGraphQLHook: (hook: GraphQLHookDefinition) => void;

  /**
   * Register a custom provider
   */
  registerProvider: (provider: Type<any>) => void;

  /**
   * Get plugin configuration
   */
  getConfig: <T = any>(path?: string) => T;

  /**
   * Logger instance
   */
  logger: PluginLogger;

  /**
   * Plugin settings from configuration
   */
  settings: Record<string, any>;
}

/**
 * Policy definition interface
 */
export interface PolicyDefinition {
  /**
   * Policy name
   */
  name: string;

  /**
   * Policy implementation
   */
  policy: Type<any> | PolicyHandler;

  /**
   * Policy configuration schema
   */
  schema?: {
    $id: string;
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
}

/**
 * Policy handler function type
 */
export type PolicyHandler = (
  params: any,
  context: PolicyContext,
) => Promise<void | boolean> | void | boolean;

/**
 * Policy execution context
 */
export interface PolicyContext {
  /**
   * HTTP request object
   */
  req: any;

  /**
   * HTTP response object
   */
  res: any;

  /**
   * Continue to next policy
   */
  next: () => void;

  /**
   * GraphQL execution context (if applicable)
   */
  graphql?: {
    info: any;
    args: any;
    context: any;
  };
}

/**
 * Condition definition interface
 */
export interface ConditionDefinition {
  /**
   * Condition name
   */
  name: string;

  /**
   * Condition handler
   */
  handler: ConditionHandler;

  /**
   * Condition configuration schema
   */
  schema?: {
    $id: string;
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    enum?: any[];
    [key: string]: any;
  };
}

/**
 * Condition handler function type
 */
export type ConditionHandler = (
  conditionConfig: any,
  context: ConditionContext,
) => boolean | Promise<boolean>;

/**
 * Condition evaluation context
 */
export interface ConditionContext {
  /**
   * HTTP request object
   */
  req: any;

  /**
   * HTTP response object
   */
  res: any;

  /**
   * GraphQL context (if applicable)
   */
  graphql?: {
    info: any;
    args: any;
    context: any;
  };
}

/**
 * Route definition interface
 */
export interface RouteDefinition {
  /**
   * HTTP method
   */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

  /**
   * Route path
   */
  path: string;

  /**
   * Route handler
   */
  handler: (req: any, res: any) => any | Promise<any>;

  /**
   * Middleware to apply before handler
   */
  middleware?: any[];
}

/**
 * GraphQL hook types
 */
export enum GraphQLHookType {
  /**
   * Called before schema composition
   */
  SCHEMA_TRANSFORM = 'schema_transform',

  /**
   * Called before resolver execution
   */
  RESOLVER_MIDDLEWARE = 'resolver_middleware',

  /**
   * Called during subgraph request
   */
  SUBGRAPH_REQUEST = 'subgraph_request',

  /**
   * Called during entity reference resolution
   */
  ENTITY_REFERENCE = 'entity_reference',
}

/**
 * GraphQL hook definition
 */
export interface GraphQLHookDefinition {
  /**
   * Hook type
   */
  type: GraphQLHookType;

  /**
   * Hook handler
   */
  handler: GraphQLHookHandler;

  /**
   * Hook priority (lower = earlier execution)
   */
  priority?: number;
}

/**
 * GraphQL hook handler type
 */
export type GraphQLHookHandler = (context: GraphQLHookContext) => any;

/**
 * GraphQL hook execution context
 */
export interface GraphQLHookContext {
  /**
   * GraphQL schema (for schema transform hooks)
   */
  schema?: any;

  /**
   * Resolver info
   */
  info?: any;

  /**
   * Resolver arguments
   */
  args?: any;

  /**
   * GraphQL context
   */
  context?: any;

  /**
   * Subgraph name (for subgraph hooks)
   */
  subgraphName?: string;

  /**
   * Request object
   */
  request?: any;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  log(message: string, ...args: any[]): void;
  error(message: string, trace?: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  verbose(message: string, ...args: any[]): void;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  /**
   * Plugin package name or path
   */
  package: string;

  /**
   * Plugin settings
   */
  settings?: Record<string, any>;

  /**
   * Whether plugin is enabled
   */
  enabled?: boolean;
}
