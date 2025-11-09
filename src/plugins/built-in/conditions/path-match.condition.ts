import { ConditionDefinition, ConditionContext } from '../../interfaces/plugin.interface';
import { match } from 'path-to-regexp';

/**
 * Path Match Condition - matches request path against patterns
 */
export const pathMatchCondition: ConditionDefinition = {
  name: 'pathMatch',
  handler: (config: string | string[], context: ConditionContext): boolean => {
    const { req } = context;
    const patterns = Array.isArray(config) ? config : [config];

    for (const pattern of patterns) {
      // Support wildcard patterns
      const matchFn = match(pattern, { decode: decodeURIComponent });
      if (matchFn(req.path || req.url)) {
        return true;
      }
    }

    return false;
  },
  schema: {
    $id: 'http://express-gateway.io/schemas/conditions/path-match.json',
    type: 'string',
  },
};
