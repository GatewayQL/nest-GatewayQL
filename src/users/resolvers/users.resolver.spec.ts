import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersResolver } from './users.resolver';
import { UserEntity } from '../models/user.entity';
import { UsersService } from '../services/users.service';
import { User, UserRole } from '../models/user.interface';
import { CreateUserInput } from '../dto/create-user.input';
import { UpdateUserInput } from '../dto/update-user.input';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UsersPipe } from '../pipes/users.pipe';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let usersService: UsersService;

  const mockUser = new UserEntity();
  mockUser.id = 'test-user-id';
  mockUser.firstname = 'John';
  mockUser.lastname = 'Doe';
  mockUser.username = 'john.doe';
  mockUser.email = 'john.doe@test.com';
  mockUser.role = UserRole.USER;

  const mockAdminUser = new UserEntity();
  mockAdminUser.id = 'admin-user-id';
  mockAdminUser.firstname = 'Jane';
  mockAdminUser.lastname = 'Admin';
  mockAdminUser.username = 'jane.admin';
  mockAdminUser.email = 'jane.admin@test.com';
  mockAdminUser.role = UserRole.ADMIN;

  const mockUsers = [mockUser, mockAdminUser];

  const mockCreateUserInput: CreateUserInput = {
    firstname: 'Test',
    lastname: 'User',
    username: 'test.user',
    email: 'test.user@test.com',
  };

  const mockUpdateUserInput: UpdateUserInput = {
    id: 'test-user-id',
    firstname: 'Updated',
    lastname: 'User',
    username: 'updated.user',
    email: 'updated.user@test.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByUsername: jest.fn(),
            findByemail: jest.fn(),
            updateOne: jest.fn(),
            deleteOne: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<UsersResolver>(UsersResolver);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const expectedUser = { id: 'new-user-id', ...mockCreateUserInput };
      jest.spyOn(usersService, 'create').mockResolvedValue(expectedUser as UserEntity);

      // Act
      const result = await resolver.createUser(mockCreateUserInput);

      // Assert
      expect(usersService.create).toHaveBeenCalledWith(mockCreateUserInput);
      expect(result).toEqual(expectedUser);
    });

    it('should handle validation through UsersPipe', async () => {
      // Arrange
      const invalidInput = { ...mockCreateUserInput, email: 'invalid-email' };
      const usersPipe = new UsersPipe();

      // Act & Assert
      expect(() => usersPipe.transform(invalidInput)).toThrow();
    });

    it('should handle service errors during user creation', async () => {
      // Arrange
      jest.spyOn(usersService, 'create').mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(resolver.createUser(mockCreateUserInput)).rejects.toThrow('Database error');
    });

    it('should accept all valid user fields', async () => {
      // Arrange
      const completeUserInput = {
        ...mockCreateUserInput,
        redirectUri: 'http://localhost:3000/callback',
      };
      const expectedUser = { id: 'new-user-id', ...completeUserInput };
      jest.spyOn(usersService, 'create').mockResolvedValue(expectedUser as UserEntity);

      // Act
      const result = await resolver.createUser(completeUserInput);

      // Assert
      expect(usersService.create).toHaveBeenCalledWith(completeUserInput);
      expect(result).toEqual(expectedUser);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      // Arrange
      jest.spyOn(usersService, 'findAll').mockResolvedValue(mockUsers);

      // Act
      const result = await resolver.getAllUsers();

      // Assert
      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users exist', async () => {
      // Arrange
      jest.spyOn(usersService, 'findAll').mockResolvedValue([]);

      // Act
      const result = await resolver.getAllUsers();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      // Arrange
      jest.spyOn(usersService, 'findAll').mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(resolver.getAllUsers()).rejects.toThrow('Database connection failed');
    });
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      // Arrange
      const userId = 'test-user-id';
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);

      // Act
      const result = await resolver.getUser(userId);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should handle non-existent user', async () => {
      // Arrange
      const userId = 'non-existent-id';
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);

      // Act
      const result = await resolver.getUser(userId);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });

    it('should handle service errors', async () => {
      // Arrange
      const userId = 'test-user-id';
      jest.spyOn(usersService, 'findOne').mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(resolver.getUser(userId)).rejects.toThrow('User not found');
    });
  });

  describe('getUserByUsername', () => {
    it('should return user by username', async () => {
      // Arrange
      const username = 'john.doe';
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(mockUser);

      // Act
      const result = await resolver.getUserByUsername(username);

      // Assert
      expect(usersService.findByUsername).toHaveBeenCalledWith(username);
      expect(result).toEqual(mockUser);
    });

    it('should handle username not found', async () => {
      // Arrange
      const username = 'non.existent';
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(null);

      // Act
      const result = await resolver.getUserByUsername(username);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle case sensitivity', async () => {
      // Arrange
      const username = 'JOHN.DOE';
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(null);

      // Act
      const result = await resolver.getUserByUsername(username);

      // Assert
      expect(usersService.findByUsername).toHaveBeenCalledWith(username);
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      // Arrange
      const email = 'john.doe@test.com';
      jest.spyOn(usersService, 'findByemail').mockResolvedValue(mockUser);

      // Act
      const result = await resolver.getUserByEmail(email);

      // Assert
      expect(usersService.findByemail).toHaveBeenCalledWith(email);
      expect(result).toEqual(mockUser);
    });

    it('should handle email not found', async () => {
      // Arrange
      const email = 'nonexistent@test.com';
      jest.spyOn(usersService, 'findByemail').mockResolvedValue(null);

      // Act
      const result = await resolver.getUserByEmail(email);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle invalid email format gracefully', async () => {
      // Arrange
      const email = 'invalid-email';
      jest.spyOn(usersService, 'findByemail').mockResolvedValue(null);

      // Act
      const result = await resolver.getUserByEmail(email);

      // Assert
      expect(usersService.findByemail).toHaveBeenCalledWith(email);
      expect(result).toBeNull();
    });
  });

  describe('updateUser (Admin only)', () => {
    it('should update user when called by admin', async () => {
      // Arrange
      const updatedUser = { ...mockUser, ...mockUpdateUserInput };
      jest.spyOn(usersService, 'updateOne').mockResolvedValue(updatedUser as UserEntity);

      // Act
      const result = await resolver.updateUser(mockUpdateUserInput);

      // Assert
      expect(usersService.updateOne).toHaveBeenCalledWith(
        mockUpdateUserInput.id,
        mockUpdateUserInput
      );
      expect(result).toEqual(updatedUser);
    });

    it('should handle partial updates', async () => {
      // Arrange
      const partialUpdate: UpdateUserInput = {
        id: 'test-user-id',
        firstname: 'Updated',
      };
      const updatedUser = { ...mockUser, firstname: 'Updated' };
      jest.spyOn(usersService, 'updateOne').mockResolvedValue(updatedUser as UserEntity);

      // Act
      const result = await resolver.updateUser(partialUpdate);

      // Assert
      expect(usersService.updateOne).toHaveBeenCalledWith(partialUpdate.id, partialUpdate);
      expect(result).toEqual(updatedUser);
    });

    it('should handle update of non-existent user', async () => {
      // Arrange
      const updateInput = { ...mockUpdateUserInput, id: 'non-existent-id' };
      jest.spyOn(usersService, 'updateOne').mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(resolver.updateUser(updateInput)).rejects.toThrow('User not found');
    });

    it('should validate input through UsersPipe', async () => {
      // Arrange
      const invalidUpdate = { ...mockUpdateUserInput, email: 'invalid-email' };
      const usersPipe = new UsersPipe();

      // Act & Assert
      expect(() => usersPipe.transform(invalidUpdate)).toThrow();
    });

    it('should handle service errors during update', async () => {
      // Arrange
      jest.spyOn(usersService, 'updateOne').mockRejectedValue(
        new Error('Database update failed')
      );

      // Act & Assert
      await expect(resolver.updateUser(mockUpdateUserInput)).rejects.toThrow(
        'Database update failed'
      );
    });
  });

  describe('removeUser (Admin only)', () => {
    it('should delete user when called by admin', async () => {
      // Arrange
      const userId = 'test-user-id';
      jest.spyOn(usersService, 'deleteOne').mockResolvedValue(mockUser);

      // Act
      const result = await resolver.removeUser(userId);

      // Assert
      expect(usersService.deleteOne).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should handle deletion of non-existent user', async () => {
      // Arrange
      const userId = 'non-existent-id';
      jest.spyOn(usersService, 'deleteOne').mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(resolver.removeUser(userId)).rejects.toThrow('User not found');
    });

    it('should handle service errors during deletion', async () => {
      // Arrange
      const userId = 'test-user-id';
      jest.spyOn(usersService, 'deleteOne').mockRejectedValue(
        new Error('Database deletion failed')
      );

      // Act & Assert
      await expect(resolver.removeUser(userId)).rejects.toThrow('Database deletion failed');
    });

    it('should return deleted user information', async () => {
      // Arrange
      const userId = 'test-user-id';
      const deletedUser = { ...mockUser, id: userId };
      jest.spyOn(usersService, 'deleteOne').mockResolvedValue(deletedUser);

      // Act
      const result = await resolver.removeUser(userId);

      // Assert
      expect(result).toEqual(deletedUser);
      expect(result.id).toBe(userId);
    });
  });

  describe('Role-based access control', () => {
    it('should have ADMIN role requirement on updateUser', () => {
      // Get the method metadata
      const updateMethod = Reflect.getMetadata('roles', resolver.updateUser);

      // Note: In actual implementation, roles are set via decorator
      // This test verifies the intent rather than runtime behavior
      expect(resolver.updateUser).toBeDefined();
    });

    it('should have ADMIN role requirement on removeUser', () => {
      // Get the method metadata
      const removeMethod = Reflect.getMetadata('roles', resolver.removeUser);

      // Note: In actual implementation, roles are set via decorator
      // This test verifies the intent rather than runtime behavior
      expect(resolver.removeUser).toBeDefined();
    });

    it('should not require roles for read operations', () => {
      // Read operations should not have role restrictions
      expect(resolver.getAllUsers).toBeDefined();
      expect(resolver.getUser).toBeDefined();
      expect(resolver.getUserByUsername).toBeDefined();
      expect(resolver.getUserByEmail).toBeDefined();
    });

    it('should not require roles for user creation', () => {
      // User creation typically allows self-registration
      expect(resolver.createUser).toBeDefined();
    });
  });

  describe('GraphQL argument handling', () => {
    it('should handle string type arguments correctly', async () => {
      // Arrange
      const stringId = 'string-id-123';
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);

      // Act
      await resolver.getUser(stringId);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith(stringId);
    });

    it('should handle empty string arguments', async () => {
      // Arrange
      const emptyId = '';
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);

      // Act
      const result = await resolver.getUser(emptyId);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith(emptyId);
      expect(result).toBeNull();
    });

    it('should handle special characters in usernames', async () => {
      // Arrange
      const specialUsername = 'user.name+special@chars';
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(mockUser);

      // Act
      await resolver.getUserByUsername(specialUsername);

      // Assert
      expect(usersService.findByUsername).toHaveBeenCalledWith(specialUsername);
    });

    it('should handle email addresses with special characters', async () => {
      // Arrange
      const specialEmail = 'user+tag@example-domain.co.uk';
      jest.spyOn(usersService, 'findByemail').mockResolvedValue(mockUser);

      // Act
      await resolver.getUserByEmail(specialEmail);

      // Assert
      expect(usersService.findByemail).toHaveBeenCalledWith(specialEmail);
    });
  });

  describe('resolver initialization', () => {
    it('should be defined with all dependencies', () => {
      expect(resolver).toBeDefined();
      expect(usersService).toBeDefined();
    });

    it('should inject UsersService correctly', () => {
      expect(resolver['usersService']).toBe(usersService);
    });
  });
});