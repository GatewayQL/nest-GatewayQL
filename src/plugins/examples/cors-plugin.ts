import {
  PluginManifest,
  PluginContext,
  PolicyHandler,
} from '../interfaces/plugin.interface';

/**
 * Example CORS Plugin
 * Demonstrates advanced CORS policy with conditions
 */

/**
 * CORS policy handler
 */
const corsPolicy: PolicyHandler = async (params, context) => {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = false,
    maxAge = 86400,
  } = params;

  const { req, res } = context;

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', String(maxAge));

    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.status(204).end();
    return false; // Stop execution for OPTIONS
  }

  // Set CORS headers for regular requests
  res.setHeader('Access-Control-Allow-Origin', origin);

  if (credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  return true; // Continue execution
};

/**
 * Plugin manifest
 */
export const corsPlugin: PluginManifest = {
  name: 'cors',
  version: '1.0.0',
  description: 'Advanced CORS policy plugin',
  author: 'GatewayQL Team',

  init: async (context: PluginContext) => {
    context.logger.log('Initializing CORS plugin');

    // Register CORS policy
    context.registerPolicy({
      name: 'cors',
      policy: corsPolicy,
      schema: {
        $id: 'http://gateway-ql.io/schemas/policies/cors.json',
        type: 'object',
        properties: {
          origin: {
            type: 'string',
            description: 'Allowed origin',
            default: '*',
          },
          methods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Allowed HTTP methods',
          },
          allowedHeaders: {
            type: 'array',
            items: { type: 'string' },
            description: 'Allowed headers',
          },
          credentials: {
            type: 'boolean',
            description: 'Allow credentials',
            default: false,
          },
          maxAge: {
            type: 'number',
            description: 'Preflight cache duration in seconds',
            default: 86400,
          },
        },
      },
    });

    context.logger.log('CORS plugin initialized successfully');
  },

  schema: {
    $id: 'http://gateway-ql.io/schemas/plugins/cors.json',
    type: 'object',
  },
};

export default corsPlugin;
