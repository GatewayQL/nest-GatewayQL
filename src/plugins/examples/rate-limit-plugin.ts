import {
  PluginManifest,
  PluginContext,
  PolicyHandler,
} from '../interfaces/plugin.interface';

/**
 * Example Rate Limit Plugin
 * Demonstrates how to create a custom plugin with policies
 */

// In-memory store for rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Export function to reset state for testing
export const resetRateLimitState = () => {
  requestCounts.clear();
};

/**
 * Rate limit policy handler
 */
const rateLimitPolicy: PolicyHandler = async (params, context) => {
  const { windowMs = 60000, max = 100 } = params || {};
  const { req, res } = context;

  const key = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();

  let record = requestCounts.get(key);

  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    };
    requestCounts.set(key, record);
  }

  // Increment count for this request
  record.count++;

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
  res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

  if (record.count > max) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again after ${new Date(record.resetTime).toISOString()}`,
    });
    return false; // Stop execution
  }

  return true; // Continue execution
};

/**
 * Plugin manifest
 */
export const rateLimitPlugin: PluginManifest = {
  name: 'rate-limit',
  version: '1.0.0',
  description: 'Advanced rate limiting plugin with custom policies',
  author: 'GatewayQL Team',

  init: async (context: PluginContext) => {
    context.logger.log('Initializing rate-limit plugin');

    // Register the rate limit policy
    context.registerPolicy({
      name: 'rate-limit',
      policy: rateLimitPolicy,
      schema: {
        $id: 'http://gateway-ql.io/schemas/policies/rate-limit.json',
        type: 'object',
        properties: {
          windowMs: {
            type: 'number',
            description: 'Time window in milliseconds',
            default: 60000,
          },
          max: {
            type: 'number',
            description: 'Maximum number of requests per window',
            default: 100,
          },
        },
      },
    });

    context.logger.log('Rate-limit plugin initialized successfully');
  },

  schema: {
    $id: 'http://gateway-ql.io/schemas/plugins/rate-limit.json',
    type: 'object',
    properties: {
      windowMs: { type: 'number' },
      max: { type: 'number' },
    },
  },
};

export default rateLimitPlugin;
