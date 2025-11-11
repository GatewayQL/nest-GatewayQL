import { graphqlOperationCondition } from './graphql-operation.condition';
import { ConditionContext } from '../../interfaces/plugin.interface';

describe('graphqlOperationCondition', () => {
  const createMockContext = (query?: string, body?: any): ConditionContext => ({
    req: {
      body: body || (query ? { query } : undefined),
    } as any,
    res: {} as any,
  });

  describe('definition', () => {
    it('should have correct name', () => {
      expect(graphqlOperationCondition.name).toBe('graphqlOperation');
    });

    it('should have handler function', () => {
      expect(typeof graphqlOperationCondition.handler).toBe('function');
    });

    it('should have schema', () => {
      expect(graphqlOperationCondition.schema).toBeDefined();
      expect(graphqlOperationCondition.schema?.$id).toBe(
        'http://gateway-ql.io/schemas/conditions/graphql-operation.json',
      );
      expect(graphqlOperationCondition.schema?.type).toBe('string');
      expect(graphqlOperationCondition.schema?.enum).toEqual([
        'query',
        'mutation',
        'subscription',
      ]);
    });
  });

  describe('single operation type matching', () => {
    describe('query operations', () => {
      it('should match simple query', () => {
        const query = 'query { user { id name } }';
        const context = createMockContext(query);
        const result = graphqlOperationCondition.handler('query', context);
        expect(result).toBe(true);
      });

      it('should match query with operation name', () => {
        const query = 'query GetUser { user(id: "123") { id name } }';
        const context = createMockContext(query);
        const result = graphqlOperationCondition.handler('query', context);
        expect(result).toBe(true);
      });

      it('should match query with variables', () => {
        const query = 'query GetUser($id: ID!) { user(id: $id) { id name } }';
        const context = createMockContext(query);
        const result = graphqlOperationCondition.handler('query', context);
        expect(result).toBe(true);
      });

      it('should match query with leading whitespace', () => {
        const query = '   \n  query { user { id } }';
        const context = createMockContext(query);
        const result = graphqlOperationCondition.handler('query', context);
        expect(result).toBe(true);
      });

      it('should handle case-insensitive matching', () => {
        const queries = [
          'QUERY { user { id } }',
          'Query { user { id } }',
          'qUeRy { user { id } }',
        ];

        queries.forEach(query => {
          const context = createMockContext(query);
          const result = graphqlOperationCondition.handler('query', context);
          expect(result).toBe(true);
        });
      });

      it('should not match non-query operations', () => {
        const mutation = 'mutation { createUser(input: {}) { id } }';
        const context = createMockContext(mutation);
        const result = graphqlOperationCondition.handler('query', context);
        expect(result).toBe(false);
      });
    });

    describe('mutation operations', () => {
      it('should match simple mutation', () => {
        const mutation = 'mutation { createUser(input: {}) { id } }';
        const context = createMockContext(mutation);
        const result = graphqlOperationCondition.handler('mutation', context);
        expect(result).toBe(true);
      });

      it('should match mutation with operation name', () => {
        const mutation = 'mutation CreateUser { createUser(input: {}) { id } }';
        const context = createMockContext(mutation);
        const result = graphqlOperationCondition.handler('mutation', context);
        expect(result).toBe(true);
      });

      it('should match mutation with variables', () => {
        const mutation = 'mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id } }';
        const context = createMockContext(mutation);
        const result = graphqlOperationCondition.handler('mutation', context);
        expect(result).toBe(true);
      });

      it('should match mutation with leading whitespace', () => {
        const mutation = '  \t\n mutation { createUser(input: {}) { id } }';
        const context = createMockContext(mutation);
        const result = graphqlOperationCondition.handler('mutation', context);
        expect(result).toBe(true);
      });

      it('should handle case-insensitive matching', () => {
        const mutations = [
          'MUTATION { createUser(input: {}) { id } }',
          'Mutation { createUser(input: {}) { id } }',
          'mUtAtIoN { createUser(input: {}) { id } }',
        ];

        mutations.forEach(mutation => {
          const context = createMockContext(mutation);
          const result = graphqlOperationCondition.handler('mutation', context);
          expect(result).toBe(true);
        });
      });

      it('should not match non-mutation operations', () => {
        const query = 'query { user { id } }';
        const context = createMockContext(query);
        const result = graphqlOperationCondition.handler('mutation', context);
        expect(result).toBe(false);
      });
    });

    describe('subscription operations', () => {
      it('should match simple subscription', () => {
        const subscription = 'subscription { messageAdded { id content } }';
        const context = createMockContext(subscription);
        const result = graphqlOperationCondition.handler('subscription', context);
        expect(result).toBe(true);
      });

      it('should match subscription with operation name', () => {
        const subscription = 'subscription MessageSubscription { messageAdded { id content } }';
        const context = createMockContext(subscription);
        const result = graphqlOperationCondition.handler('subscription', context);
        expect(result).toBe(true);
      });

      it('should match subscription with variables', () => {
        const subscription = 'subscription MessageSubscription($channel: String!) { messageAdded(channel: $channel) { id } }';
        const context = createMockContext(subscription);
        const result = graphqlOperationCondition.handler('subscription', context);
        expect(result).toBe(true);
      });

      it('should match subscription with leading whitespace', () => {
        const subscription = '\n\t  subscription { messageAdded { id } }';
        const context = createMockContext(subscription);
        const result = graphqlOperationCondition.handler('subscription', context);
        expect(result).toBe(true);
      });

      it('should handle case-insensitive matching', () => {
        const subscriptions = [
          'SUBSCRIPTION { messageAdded { id } }',
          'Subscription { messageAdded { id } }',
          'sUbScRiPtIoN { messageAdded { id } }',
        ];

        subscriptions.forEach(subscription => {
          const context = createMockContext(subscription);
          const result = graphqlOperationCondition.handler('subscription', context);
          expect(result).toBe(true);
        });
      });

      it('should not match non-subscription operations', () => {
        const query = 'query { user { id } }';
        const context = createMockContext(query);
        const result = graphqlOperationCondition.handler('subscription', context);
        expect(result).toBe(false);
      });
    });
  });

  describe('multiple operation type matching', () => {
    it('should match any operation in array (query)', () => {
      const query = 'query { user { id } }';
      const context = createMockContext(query);
      const operations = ['query', 'mutation'];
      const result = graphqlOperationCondition.handler(operations, context);
      expect(result).toBe(true);
    });

    it('should match any operation in array (mutation)', () => {
      const mutation = 'mutation { createUser(input: {}) { id } }';
      const context = createMockContext(mutation);
      const operations = ['query', 'mutation'];
      const result = graphqlOperationCondition.handler(operations, context);
      expect(result).toBe(true);
    });

    it('should not match if operation not in array', () => {
      const subscription = 'subscription { messageAdded { id } }';
      const context = createMockContext(subscription);
      const operations = ['query', 'mutation'];
      const result = graphqlOperationCondition.handler(operations, context);
      expect(result).toBe(false);
    });

    it('should handle single-element array', () => {
      const query = 'query { user { id } }';
      const context = createMockContext(query);
      const operations = ['query'];
      const result = graphqlOperationCondition.handler(operations, context);
      expect(result).toBe(true);
    });

    it('should handle all operation types in array', () => {
      const operations = ['query', 'mutation', 'subscription'];

      const testCases = [
        { query: 'query { user { id } }', expected: true },
        { query: 'mutation { createUser(input: {}) { id } }', expected: true },
        { query: 'subscription { messageAdded { id } }', expected: true },
      ];

      testCases.forEach(({ query, expected }) => {
        const context = createMockContext(query);
        const result = graphqlOperationCondition.handler(operations, context);
        expect(result).toBe(expected);
      });
    });

    it('should handle empty operation array', () => {
      const query = 'query { user { id } }';
      const context = createMockContext(query);
      const operations: string[] = [];
      const result = graphqlOperationCondition.handler(operations, context);
      expect(result).toBe(false);
    });
  });

  describe('non-GraphQL requests', () => {
    it('should return false when no body exists', () => {
      const context: ConditionContext = {
        req: {} as any,
        res: {} as any,
      };
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });

    it('should return false when body exists but no query', () => {
      const context = createMockContext(undefined, { data: 'some data' });
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });

    it('should return false when query is null', () => {
      const context = createMockContext(undefined, { query: null });
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });

    it('should return false when query is undefined', () => {
      const context = createMockContext(undefined, { query: undefined });
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });

    it('should return false when query is empty string', () => {
      const context = createMockContext('');
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });

    it('should return false when query is only whitespace', () => {
      const context = createMockContext('   \n\t  ');
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });
  });

  describe('invalid GraphQL operations', () => {
    it('should return false for invalid operation type', () => {
      const invalidQuery = 'invalid { user { id } }';
      const context = createMockContext(invalidQuery);
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });

    it('should return false for malformed GraphQL', () => {
      const malformedQuery = '{ user { id }';
      const context = createMockContext(malformedQuery);
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });

    it('should return false for non-string query', () => {
      const context = createMockContext(undefined, { query: 123 });
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });

    it('should return false for object query', () => {
      const context = createMockContext(undefined, { query: { type: 'query' } });
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });

    it('should return false for array query', () => {
      const context = createMockContext(undefined, { query: ['query', '{', 'user'] });
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle operation keyword in middle of query', () => {
      const query = 'fragment UserFragment on User { query }'; // 'query' as field name
      const context = createMockContext(query);
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false); // Should not match as it's not an operation
    });

    it('should handle comments in GraphQL', () => {
      const query = `
        # This is a query comment
        query {
          user {
            id
            name
          }
        }
      `;
      const context = createMockContext(query);
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false); // Comments should prevent matching (simple regex doesn't handle this)
    });

    it('should handle operation keyword as part of larger word', () => {
      const query = 'queryUser { user { id } }'; // 'query' as part of operation name
      const context = createMockContext(query);
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false); // Should not match as it's not followed by whitespace
    });

    it('should handle mixed case in operation names', () => {
      const query = 'Query GetUser { user { id } }';
      const context = createMockContext(query);
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(true);
    });

    it('should handle tabs and various whitespace', () => {
      const query = '\t\t\nquery\t\t{ user { id } }';
      const context = createMockContext(query);
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(true);
    });

    it('should handle multiple operations in one query string', () => {
      // While not valid GraphQL, test behavior with multiple operations
      const query = 'query { user } mutation { createUser }';
      const context = createMockContext(query);

      const queryResult = graphqlOperationCondition.handler('query', context);
      const mutationResult = graphqlOperationCondition.handler('mutation', context);

      expect(queryResult).toBe(true); // Should match first occurrence
      expect(mutationResult).toBe(true); // Should also match
    });
  });

  describe('real-world scenarios', () => {
    it('should handle introspection queries', () => {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            types {
              name
            }
          }
        }
      `;
      const context = createMockContext(introspectionQuery);
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(true);
    });

    it('should handle complex nested queries', () => {
      const complexQuery = `
        query GetUserWithPosts($userId: ID!) {
          user(id: $userId) {
            id
            name
            posts {
              id
              title
              comments {
                id
                content
                author {
                  name
                }
              }
            }
          }
        }
      `;
      const context = createMockContext(complexQuery);
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(true);
    });

    it('should handle mutations with multiple fields', () => {
      const complexMutation = `
        mutation CreateUserAndPost($userInput: CreateUserInput!, $postInput: CreatePostInput!) {
          createUser(input: $userInput) {
            id
            name
          }
          createPost(input: $postInput) {
            id
            title
          }
        }
      `;
      const context = createMockContext(complexMutation);
      const result = graphqlOperationCondition.handler('mutation', context);
      expect(result).toBe(true);
    });

    it('should handle real-time subscriptions', () => {
      const subscriptionQuery = `
        subscription OnCommentAdded($postId: ID!) {
          commentAdded(postId: $postId) {
            id
            content
            author {
              name
            }
            createdAt
          }
        }
      `;
      const context = createMockContext(subscriptionQuery);
      const result = graphqlOperationCondition.handler('subscription', context);
      expect(result).toBe(true);
    });

    it('should handle federation queries', () => {
      const federationQuery = `
        query GetUserProfile($id: ID!) {
          user(id: $id) {
            id
            name
            profile {
              bio
              avatar
            }
            posts @include(if: $includePosts) {
              title
              content
            }
          }
        }
      `;
      const context = createMockContext(federationQuery);
      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(true);
    });

    it('should differentiate between query and mutation in gateway', () => {
      const queryContext = createMockContext('query { users { id } }');
      const mutationContext = createMockContext('mutation { deleteUser(id: "123") { id } }');

      // Test that we can differentiate for routing purposes
      const readOnlyOperations = ['query'];
      const writeOperations = ['mutation'];

      expect(graphqlOperationCondition.handler(readOnlyOperations, queryContext)).toBe(true);
      expect(graphqlOperationCondition.handler(readOnlyOperations, mutationContext)).toBe(false);
      expect(graphqlOperationCondition.handler(writeOperations, queryContext)).toBe(false);
      expect(graphqlOperationCondition.handler(writeOperations, mutationContext)).toBe(true);
    });

    it('should handle GraphQL over GET (query in URL)', () => {
      // Note: This condition checks body.query, so GET requests wouldn't work
      // This test documents the current behavior
      const context: ConditionContext = {
        req: {
          method: 'GET',
          query: { query: 'query { user { id } }' },
        } as any,
        res: {} as any,
      };

      const result = graphqlOperationCondition.handler('query', context);
      expect(result).toBe(false); // Current implementation only checks body.query
    });
  });
});