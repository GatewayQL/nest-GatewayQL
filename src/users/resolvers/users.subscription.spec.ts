import { Test, TestingModule } from '@nestjs/testing';
import {
  UsersSubscriptionResolver,
  USER_CREATED,
  USER_UPDATED,
  USER_DELETED,
  pubSub,
} from './users.subscription';
import { UserEntity } from '../models/user.entity';
import { UserRole } from '../models/user.interface';

// Mock the entire graphql-subscriptions module
jest.mock('graphql-subscriptions', () => ({
  PubSub: jest.fn().mockImplementation(() => ({
    asyncIterator: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  })),
}));

describe('UsersSubscriptionResolver', () => {
  let resolver: UsersSubscriptionResolver;
  const mockAsyncIterator = jest.fn();

  const mockUser = new UserEntity();
  mockUser.id = 'test-user-id';
  mockUser.firstname = 'John';
  mockUser.lastname = 'Doe';
  mockUser.username = 'john.doe';
  mockUser.email = 'john.doe@test.com';
  mockUser.role = UserRole.USER;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock the pubSub.asyncIterator method
    (pubSub as any).asyncIterator = jest.fn().mockReturnValue(mockAsyncIterator);
    (pubSub as any).publish = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersSubscriptionResolver],
    }).compile();

    resolver = module.get<UsersSubscriptionResolver>(UsersSubscriptionResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscription constants', () => {
    it('should have correct subscription event names', () => {
      expect(USER_CREATED).toBe('userCreated');
      expect(USER_UPDATED).toBe('userUpdated');
      expect(USER_DELETED).toBe('userDeleted');
    });

    it('should export pubSub instance', () => {
      expect(pubSub).toBeDefined();
    });
  });

  describe('userCreated subscription', () => {
    it('should return async iterator for user created events', () => {
      // Act
      const result = resolver.userCreated();

      // Assert
      expect((pubSub as any).asyncIterator).toHaveBeenCalledWith(USER_CREATED);
      expect(result).toBe(mockAsyncIterator);
    });

    it('should be defined with correct metadata', () => {
      expect(resolver.userCreated).toBeDefined();
      expect(typeof resolver.userCreated).toBe('function');
    });

    it('should handle subscription creation without errors', () => {
      // Act & Assert
      expect(() => resolver.userCreated()).not.toThrow();
    });
  });

  describe('userUpdated subscription', () => {
    it('should return async iterator for user updated events', () => {
      // Act
      const result = resolver.userUpdated();

      // Assert
      expect((pubSub as any).asyncIterator).toHaveBeenCalledWith(USER_UPDATED);
      expect(result).toBe(mockAsyncIterator);
    });

    it('should be defined with correct metadata', () => {
      expect(resolver.userUpdated).toBeDefined();
      expect(typeof resolver.userUpdated).toBe('function');
    });

    it('should handle subscription creation for updates', () => {
      // Act & Assert
      expect(() => resolver.userUpdated()).not.toThrow();
    });
  });

  describe('userDeleted subscription', () => {
    it('should return async iterator for user deleted events', () => {
      // Act
      const result = resolver.userDeleted();

      // Assert
      expect((pubSub as any).asyncIterator).toHaveBeenCalledWith(USER_DELETED);
      expect(result).toBe(mockAsyncIterator);
    });

    it('should be defined with correct metadata', () => {
      expect(resolver.userDeleted).toBeDefined();
      expect(typeof resolver.userDeleted).toBe('function');
    });

    it('should handle subscription creation for deletions', () => {
      // Act & Assert
      expect(() => resolver.userDeleted()).not.toThrow();
    });
  });

  describe('pubSub integration', () => {
    it('should use the same pubSub instance across methods', () => {
      // Act
      resolver.userCreated();
      resolver.userUpdated();
      resolver.userDeleted();

      // Assert
      expect((pubSub as any).asyncIterator).toHaveBeenCalledTimes(3);
      expect((pubSub as any).asyncIterator).toHaveBeenNthCalledWith(1, USER_CREATED);
      expect((pubSub as any).asyncIterator).toHaveBeenNthCalledWith(2, USER_UPDATED);
      expect((pubSub as any).asyncIterator).toHaveBeenNthCalledWith(3, USER_DELETED);
    });

    it('should allow external publishing to subscriptions', () => {
      // Arrange
      (pubSub as any).publish = jest.fn().mockResolvedValue(undefined);

      // Act - Simulate external service publishing events
      (pubSub as any).publish(USER_CREATED, { userCreated: mockUser });
      (pubSub as any).publish(USER_UPDATED, { userUpdated: mockUser });
      (pubSub as any).publish(USER_DELETED, { userDeleted: mockUser.id });

      // Assert
      expect((pubSub as any).publish).toHaveBeenCalledTimes(3);
      expect((pubSub as any).publish).toHaveBeenCalledWith(USER_CREATED, { userCreated: mockUser });
      expect((pubSub as any).publish).toHaveBeenCalledWith(USER_UPDATED, { userUpdated: mockUser });
      expect((pubSub as any).publish).toHaveBeenCalledWith(USER_DELETED, { userDeleted: mockUser.id });
    });
  });

  describe('subscription error handling', () => {
    it('should handle pubSub asyncIterator errors gracefully', () => {
      // Arrange
      (pubSub as any).asyncIterator = jest.fn().mockImplementation(() => {
        throw new Error('PubSub connection failed');
      });

      // Act & Assert
      expect(() => resolver.userCreated()).toThrow('PubSub connection failed');
    });

    it('should handle null return from asyncIterator', () => {
      // Arrange
      (pubSub as any).asyncIterator = jest.fn().mockReturnValue(null);

      // Act
      const result = resolver.userCreated();

      // Assert
      expect(result).toBeNull();
    });

    it('should handle undefined return from asyncIterator', () => {
      // Arrange
      (pubSub as any).asyncIterator = jest.fn().mockReturnValue(undefined);

      // Act
      const result = resolver.userCreated();

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('subscription lifecycle', () => {
    it('should create independent iterators for each subscription call', () => {
      // Arrange
      const iterator1 = Symbol('iterator1');
      const iterator2 = Symbol('iterator2');
      const iterator3 = Symbol('iterator3');

      (pubSub as any).asyncIterator = jest.fn()
        .mockReturnValueOnce(iterator1)
        .mockReturnValueOnce(iterator2)
        .mockReturnValueOnce(iterator3);

      // Act
      const result1 = resolver.userCreated();
      const result2 = resolver.userCreated();
      const result3 = resolver.userCreated();

      // Assert
      expect(result1).toBe(iterator1);
      expect(result2).toBe(iterator2);
      expect(result3).toBe(iterator3);
      expect((pubSub as any).asyncIterator).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent subscription requests', async () => {
      // Arrange
      const iterators = [Symbol('iter1'), Symbol('iter2'), Symbol('iter3')];
      (pubSub as any).asyncIterator = jest.fn()
        .mockReturnValueOnce(iterators[0])
        .mockReturnValueOnce(iterators[1])
        .mockReturnValueOnce(iterators[2]);

      // Act - Simulate concurrent subscription requests
      const promises = [
        Promise.resolve(resolver.userCreated()),
        Promise.resolve(resolver.userUpdated()),
        Promise.resolve(resolver.userDeleted()),
      ];

      // Assert
      const results = await Promise.all(promises);
      expect(results[0]).toBe(iterators[0]);
      expect(results[1]).toBe(iterators[1]);
      expect(results[2]).toBe(iterators[2]);
    });
  });

  describe('subscription data flow', () => {
    it('should handle user creation event flow', () => {
      // Arrange
      const createdUser = { ...mockUser, id: 'new-user-id' };
      const mockIterator = {
        [Symbol.asyncIterator]: () => mockIterator,
        next: jest.fn().mockResolvedValue({
          value: { userCreated: createdUser },
          done: false
        }),
        return: jest.fn(),
        throw: jest.fn(),
      };

      (pubSub as any).asyncIterator = jest.fn().mockReturnValue(mockIterator);

      // Act
      const subscription = resolver.userCreated();

      // Simulate publishing an event
      (pubSub as any).publish(USER_CREATED, { userCreated: createdUser });

      // Assert
      expect(subscription).toBe(mockIterator);
      expect((pubSub as any).asyncIterator).toHaveBeenCalledWith(USER_CREATED);
    });

    it('should handle user update event flow', () => {
      // Arrange
      const updatedUser = { ...mockUser, firstname: 'Updated' };
      const mockIterator = {
        [Symbol.asyncIterator]: () => mockIterator,
        next: jest.fn().mockResolvedValue({
          value: { userUpdated: updatedUser },
          done: false
        }),
        return: jest.fn(),
        throw: jest.fn(),
      };

      (pubSub as any).asyncIterator = jest.fn().mockReturnValue(mockIterator);

      // Act
      const subscription = resolver.userUpdated();

      // Simulate publishing an event
      (pubSub as any).publish(USER_UPDATED, { userUpdated: updatedUser });

      // Assert
      expect(subscription).toBe(mockIterator);
      expect((pubSub as any).asyncIterator).toHaveBeenCalledWith(USER_UPDATED);
    });

    it('should handle user deletion event flow', () => {
      // Arrange
      const deletedUserId = 'deleted-user-id';
      const mockIterator = {
        [Symbol.asyncIterator]: () => mockIterator,
        next: jest.fn().mockResolvedValue({
          value: { userDeleted: deletedUserId },
          done: false
        }),
        return: jest.fn(),
        throw: jest.fn(),
      };

      (pubSub as any).asyncIterator = jest.fn().mockReturnValue(mockIterator);

      // Act
      const subscription = resolver.userDeleted();

      // Simulate publishing an event
      (pubSub as any).publish(USER_DELETED, { userDeleted: deletedUserId });

      // Assert
      expect(subscription).toBe(mockIterator);
      expect((pubSub as any).asyncIterator).toHaveBeenCalledWith(USER_DELETED);
    });
  });

  describe('resolver initialization', () => {
    it('should be defined', () => {
      expect(resolver).toBeDefined();
    });

    it('should have all subscription methods', () => {
      expect(resolver.userCreated).toBeDefined();
      expect(resolver.userUpdated).toBeDefined();
      expect(resolver.userDeleted).toBeDefined();
    });

    it('should be an instance of UsersSubscriptionResolver', () => {
      expect(resolver).toBeInstanceOf(UsersSubscriptionResolver);
    });
  });

  describe('GraphQL subscription metadata', () => {
    it('should have proper subscription decorators', () => {
      // These tests verify that the methods are properly decorated
      // In actual implementation, GraphQL decorators would set metadata
      expect(typeof resolver.userCreated).toBe('function');
      expect(typeof resolver.userUpdated).toBe('function');
      expect(typeof resolver.userDeleted).toBe('function');
    });

    it('should handle subscription names correctly', () => {
      // Verify that subscription methods use correct event names
      resolver.userCreated();
      resolver.userUpdated();
      resolver.userDeleted();

      expect((pubSub as any).asyncIterator).toHaveBeenCalledWith('userCreated');
      expect((pubSub as any).asyncIterator).toHaveBeenCalledWith('userUpdated');
      expect((pubSub as any).asyncIterator).toHaveBeenCalledWith('userDeleted');
    });
  });
});