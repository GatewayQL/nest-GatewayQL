import { ConditionDefinition, ConditionContext } from '../../interfaces/plugin.interface';

/**
 * Method Condition - matches HTTP method
 */
export const methodCondition: ConditionDefinition = {
  name: 'method',
  handler: (config: string | string[], context: ConditionContext): boolean => {
    const { req } = context;
    const methods = Array.isArray(config) ? config : [config];

    return methods.some(
      (method) => method.toUpperCase() === req.method?.toUpperCase(),
    );
  },
  schema: {
    $id: 'http://express-gateway.io/schemas/conditions/method.json',
    type: 'string',
  },
};
