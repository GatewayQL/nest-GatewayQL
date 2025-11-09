import { ConditionDefinition, ConditionContext } from '../../interfaces/plugin.interface';

/**
 * Header configuration
 */
interface HeaderConfig {
  /**
   * Header name
   */
  name: string;

  /**
   * Expected header value (supports regex)
   */
  value?: string | RegExp;

  /**
   * Whether header must exist
   */
  exists?: boolean;
}

/**
 * Header Condition - matches request headers
 */
export const headerCondition: ConditionDefinition = {
  name: 'header',
  handler: (config: HeaderConfig, context: ConditionContext): boolean => {
    const { req } = context;
    const headerValue = req.headers[config.name.toLowerCase()];

    if (config.exists !== undefined) {
      return config.exists ? headerValue !== undefined : headerValue === undefined;
    }

    if (config.value !== undefined && headerValue) {
      if (config.value instanceof RegExp) {
        return config.value.test(String(headerValue));
      }
      return String(headerValue) === String(config.value);
    }

    return false;
  },
  schema: {
    $id: 'http://express-gateway.io/schemas/conditions/header.json',
    type: 'object',
    properties: {
      name: { type: 'string' },
      value: { type: ['string', 'object'] },
      exists: { type: 'boolean' },
    },
    required: ['name'],
  },
};
