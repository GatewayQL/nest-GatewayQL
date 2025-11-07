import { Plugin } from '@nestjs/apollo';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from '@apollo/server';
import { GraphQLError } from 'graphql';
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';
import { CustomLoggerService } from '../common/logger/logger.service';

/**
 * GraphQL Query Complexity Plugin
 * Prevents overly complex queries that could cause DoS
 */
@Plugin()
export class ComplexityPlugin implements ApolloServerPlugin {
  constructor(
    private gqlSchemaHost: GraphQLSchemaHost,
    private logger: CustomLoggerService,
  ) {
    this.logger.setContext('ComplexityPlugin');
  }

  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    const maxComplexity = parseInt(process.env.MAX_QUERY_COMPLEXITY, 10) || 100;
    const { schema } = this.gqlSchemaHost;

    return {
      didResolveOperation: async ({ request, document }) => {
        const complexity = getComplexity({
          schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [
            fieldExtensionsEstimator(),
            simpleEstimator({ defaultComplexity: 1 }),
          ],
        });

        if (complexity > maxComplexity) {
          this.logger.warn(
            `Query complexity ${complexity} exceeds maximum ${maxComplexity}`,
          );
          throw new GraphQLError(
            `Query is too complex: ${complexity}. Maximum allowed complexity: ${maxComplexity}`,
            {
              extensions: {
                code: 'QUERY_TOO_COMPLEX',
                complexity,
                maxComplexity,
              },
            },
          );
        }

        this.logger.debug(`Query complexity: ${complexity}`);
      },
    };
  }
}
