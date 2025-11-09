import {
  PluginManifest,
  PluginContext,
  PolicyHandler,
  GraphQLHookType,
} from '../interfaces/plugin.interface';

/**
 * Example Logging Plugin
 * Demonstrates logging policies and GraphQL hooks
 */

/**
 * Request logging policy
 */
const requestLoggingPolicy: PolicyHandler = async (params, context) => {
  const { includeBody = false, includeHeaders = false } = params;
  const { req } = context;

  const logData: any = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
  };

  if (includeHeaders) {
    logData.headers = req.headers;
  }

  if (includeBody) {
    logData.body = req.body;
  }

  // Log using plugin logger (would be provided by context)
  console.log('[Request Log]', JSON.stringify(logData, null, 2));

  return true; // Continue execution
};

/**
 * Plugin manifest
 */
export const loggingPlugin: PluginManifest = {
  name: 'logging',
  version: '1.0.0',
  description: 'Advanced logging plugin for requests and GraphQL operations',
  author: 'GatewayQL Team',

  init: async (context: PluginContext) => {
    context.logger.log('Initializing logging plugin');

    // Register request logging policy
    context.registerPolicy({
      name: 'request-logging',
      policy: requestLoggingPolicy,
      schema: {
        $id: 'http://gateway-ql.io/schemas/policies/request-logging.json',
        type: 'object',
        properties: {
          includeBody: {
            type: 'boolean',
            description: 'Include request body in logs',
            default: false,
          },
          includeHeaders: {
            type: 'boolean',
            description: 'Include request headers in logs',
            default: false,
          },
        },
      },
    });

    // Register GraphQL resolver middleware hook
    context.registerGraphQLHook({
      type: GraphQLHookType.RESOLVER_MIDDLEWARE,
      priority: 10,
      handler: (hookContext) => {
        context.logger.log(
          `GraphQL Resolver: ${hookContext.info?.fieldName}`,
        );
        return hookContext;
      },
    });

    // Register subgraph request hook
    context.registerGraphQLHook({
      type: GraphQLHookType.SUBGRAPH_REQUEST,
      priority: 10,
      handler: (hookContext) => {
        context.logger.log(
          `Subgraph Request: ${hookContext.subgraphName}`,
        );
        return hookContext;
      },
    });

    context.logger.log('Logging plugin initialized successfully');
  },

  schema: {
    $id: 'http://gateway-ql.io/schemas/plugins/logging.json',
    type: 'object',
    properties: {
      level: {
        type: 'string',
        enum: ['debug', 'info', 'warn', 'error'],
        default: 'info',
      },
    },
  },
};

export default loggingPlugin;
