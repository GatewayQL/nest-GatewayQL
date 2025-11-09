import { ConditionDefinition, ConditionContext } from '../../interfaces/plugin.interface';

/**
 * GraphQL Operation Type
 */
type GraphQLOperationType = 'query' | 'mutation' | 'subscription';

/**
 * GraphQL Operation Condition - matches GraphQL operation type
 * This is specific to GraphQL gateways
 */
export const graphqlOperationCondition: ConditionDefinition = {
  name: 'graphqlOperation',
  handler: (
    config: GraphQLOperationType | GraphQLOperationType[],
    context: ConditionContext,
  ): boolean => {
    const { req } = context;
    const operations = Array.isArray(config) ? config : [config];

    // Check if this is a GraphQL request
    if (!req.body?.query) {
      return false;
    }

    const query = req.body.query as string;

    // Simple operation type detection
    for (const operation of operations) {
      const regex = new RegExp(`^\\s*${operation}\\s`, 'i');
      if (regex.test(query)) {
        return true;
      }
    }

    return false;
  },
  schema: {
    $id: 'http://gateway-ql.io/schemas/conditions/graphql-operation.json',
    type: 'string',
    enum: ['query', 'mutation', 'subscription'],
  },
};
