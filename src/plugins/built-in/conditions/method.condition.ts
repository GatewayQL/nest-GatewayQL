import { ConditionDefinition, ConditionContext } from '../../interfaces/plugin.interface';

/**
 * Method Condition - matches HTTP method
 */
export const methodCondition: ConditionDefinition = {
  name: 'method',
  handler: (config: string | string[], context: ConditionContext): boolean => {
    const { req } = context;
    const methods = Array.isArray(config) ? config : [config];

    return methods.some((method) => {
      // Convert both to strings and then to uppercase for comparison
      const methodStr = String(method).toUpperCase();
      const reqMethodStr = String(req.method || '').toUpperCase();
      return methodStr === reqMethodStr;
    });
  },
  schema: {
    $id: 'http://express-gateway.io/schemas/conditions/method.json',
    type: 'string',
  },
};
