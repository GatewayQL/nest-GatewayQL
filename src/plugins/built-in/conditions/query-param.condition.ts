import { ConditionDefinition, ConditionContext } from '../../interfaces/plugin.interface';

/**
 * Query Parameter configuration
 */
interface QueryParamConfig {
  /**
   * Parameter name
   */
  name: string;

  /**
   * Expected parameter value (supports regex)
   */
  value?: string | RegExp;

  /**
   * Whether parameter must exist
   */
  exists?: boolean;
}

/**
 * Query Parameter Condition - matches query parameters
 */
export const queryParamCondition: ConditionDefinition = {
  name: 'queryParam',
  handler: (config: QueryParamConfig, context: ConditionContext): boolean => {
    const { req } = context;
    const paramValue = req.query?.[config.name];

    if (config.exists !== undefined) {
      return config.exists ? paramValue !== undefined : paramValue === undefined;
    }

    if (config.value !== undefined && paramValue) {
      if (config.value instanceof RegExp) {
        return config.value.test(String(paramValue));
      }
      return String(paramValue) === String(config.value);
    }

    return false;
  },
  schema: {
    $id: 'http://express-gateway.io/schemas/conditions/query-param.json',
    type: 'object',
    properties: {
      name: { type: 'string' },
      value: { type: ['string', 'object'] },
      exists: { type: 'boolean' },
    },
    required: ['name'],
  },
};
