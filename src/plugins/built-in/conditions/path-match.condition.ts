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
      try {
        // Support wildcard patterns
        const matchFn = match(pattern, { decode: decodeURIComponent });
        const matchResult = matchFn(req.path || req.url);
        if (matchResult) {
          return true;
        }
      } catch (error) {
        // If this is a single string pattern, re-throw the error
        if (!Array.isArray(config)) {
          throw error;
        }
        // For arrays, continue to next pattern if this one fails
        continue;
      }
    }

    return false;
  },
  schema: {
    $id: 'http://express-gateway.io/schemas/conditions/path-match.json',
    type: 'string',
  },
};
