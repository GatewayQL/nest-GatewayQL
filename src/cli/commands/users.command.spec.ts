import { Command } from 'commander';
import inquirer from 'inquirer';
import { Repository } from 'typeorm';
import { createUsersCommand } from './users.command';
import { getDataSource, closeDataSource } from '../utils/database.util';
import { OutputUtil } from '../utils/output.util';
import { PasswordUtil } from '../utils/password.util';
import { UserEntity } from '../../users/models/user.entity';
import { UserRole } from '../../users/models/user.interface';

// Mock dependencies
jest.mock('inquirer');
jest.mock('../utils/database.util');
jest.mock('../utils/output.util');
jest.mock('../utils/password.util');

// Mock inquirer properly
const mockPrompt = jest.fn();
(inquirer as any).prompt = mockPrompt;

describe('UsersCommand', () => {
  let command: Command;
  let mockDataSource: any;
  let mockUserRepository: jest.Mocked<Repository<UserEntity>>;
  let mockOutputUtil: jest.Mocked<typeof OutputUtil>;
  let mockPasswordUtil: jest.Mocked<typeof PasswordUtil>;
  let processExitSpy: jest.SpyInstance;

  let mockQueryBuilder: any;

  beforeEach(() => {
    // Mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    // Mock repository
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    // Mock data source
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockUserRepository),
    };

    // Mock utilities
    mockOutputUtil = {
      error: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      table: jest.fn(),
      printUser: jest.fn(),
    } as any;

    mockPasswordUtil = {
      hash: jest.fn(),
    } as any;

    // Mock the static methods
    OutputUtil.error = mockOutputUtil.error;
    OutputUtil.info = mockOutputUtil.info;
    OutputUtil.success = mockOutputUtil.success;
    OutputUtil.table = mockOutputUtil.table;
    OutputUtil.printUser = mockOutputUtil.printUser;

    PasswordUtil.hash = mockPasswordUtil.hash;

    // Mock database utils
    (getDataSource as jest.Mock).mockResolvedValue(mockDataSource);
    (closeDataSource as jest.Mock).mockResolvedValue(undefined);

    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    command = new Command();
    command.addCommand(createUsersCommand());
  });

  afterEach(() => {
    jest.clearAllMocks();
    processExitSpy.mockRestore();
  });

  describe('users create', () => {
    it('should create user with provided options', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        firstname: 'Test',
        lastname: 'User',
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockPasswordUtil.hash.mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue(mockUser as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'users',
          'create',
          '--username', 'testuser',
          '--email', 'test@example.com',
          '--password', 'testpass',
          '--firstname', 'Test',
          '--lastname', 'User'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: [{ username: 'testuser' }, { email: 'test@example.com' }],
      });
      expect(mockPasswordUtil.hash).toHaveBeenCalledWith('testpass');
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith('User created successfully');
      expect(mockOutputUtil.printUser).toHaveBeenCalled();
      expect(closeDataSource).toHaveBeenCalled();
    });

    it('should prompt for missing required fields', async () => {
      const mockAnswers = {
        username: 'prompteduser',
        email: 'prompted@example.com',
        password: 'promptedpass',
        firstname: 'Prompted',
        lastname: 'User',
      };

      mockPrompt.mockResolvedValue(mockAnswers);
      mockUserRepository.findOne.mockResolvedValue(null);
      mockPasswordUtil.hash.mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue({ id: '123' } as any);

      try {
        await command.parseAsync(['node', 'test', 'users', 'create']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should handle existing user error', async () => {
      const existingUser = { username: 'testuser', email: 'test@example.com' };
      mockUserRepository.findOne.mockResolvedValue(existingUser as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'users',
          'create',
          '--username', 'testuser',
          '--email', 'test@example.com',
          '--password', 'testpass'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith(
        'User with this username or email already exists'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockUserRepository.findOne.mockRejectedValue(error);

      try {
        await command.parseAsync([
          'node',
          'test',
          'users',
          'create',
          '--username', 'testuser',
          '--email', 'test@example.com',
          '--password', 'testpass'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith(
        'Failed to create user: Database connection failed'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should create admin user when role is admin', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockPasswordUtil.hash.mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue({ id: '123' } as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'users',
          'create',
          '--username', 'admin',
          '--email', 'admin@example.com',
          '--password', 'adminpass',
          '--role', 'admin'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      const saveCall = mockUserRepository.save.mock.calls[0][0];
      expect(saveCall.role).toBe(UserRole.ADMIN);
    });
  });

  describe('users list', () => {
    it('should list all users when no filter is provided', async () => {
      const mockQueryBuilder = {
        getMany: jest.fn().mockResolvedValue([
          {
            id: '1',
            username: 'user1',
            email: 'user1@example.com',
            firstname: 'First',
            lastname: 'User',
            role: UserRole.USER,
            createdAt: new Date(),
          }
        ]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      try {
        await command.parseAsync(['node', 'test', 'users', 'list']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockOutputUtil.table).toHaveBeenCalled();
    });

    it('should filter users by role', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      try {
        await command.parseAsync(['node', 'test', 'users', 'list', '--role', 'admin']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.role = :role', { role: 'admin' });
    });

    it('should handle empty user list', async () => {
      const mockQueryBuilder = {
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      try {
        await command.parseAsync(['node', 'test', 'users', 'list']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockOutputUtil.info).toHaveBeenCalledWith('No users found');
    });

    it('should handle database errors during list', async () => {
      const error = new Error('Query failed');
      mockUserRepository.createQueryBuilder.mockImplementation(() => {
        throw error;
      });

      try {
        await command.parseAsync(['node', 'test', 'users', 'list']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith('Failed to list users: Query failed');
    });
  });

  describe('users info', () => {
    it('should show user information', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        firstname: 'Test',
        lastname: 'User',
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser as any);

      try {
        await command.parseAsync(['node', 'test', 'users', 'info', 'testuser']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' }
      });
      expect(mockOutputUtil.printUser).toHaveBeenCalledWith(mockUser);
    });

    it('should handle user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync(['node', 'test', 'users', 'info', 'nonexistent']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("User 'nonexistent' not found");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('users update', () => {
    it('should update user fields', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        firstname: 'Old',
        lastname: 'Name',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        firstname: 'New',
        lastname: 'Name',
      } as any);

      try {
        await command.parseAsync([
          'node', 'test', 'users', 'update', 'testuser',
          '--firstname', 'New'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith('User updated successfully');
    });

    it('should update password when provided', async () => {
      const mockUser = { id: '123', username: 'testuser' };
      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockPasswordUtil.hash.mockResolvedValue('newHashedPassword');
      mockUserRepository.save.mockResolvedValue(mockUser as any);

      try {
        await command.parseAsync([
          'node', 'test', 'users', 'update', 'testuser',
          '--password', 'newpass'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPasswordUtil.hash).toHaveBeenCalledWith('newpass');
    });

    it('should handle user not found during update', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync([
          'node', 'test', 'users', 'update', 'nonexistent',
          '--firstname', 'New'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("User 'nonexistent' not found");
    });
  });

  describe('users remove', () => {
    it('should remove user with confirmation', async () => {
      const mockUser = { id: '123', username: 'testuser' };
      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockPrompt.mockResolvedValue({ confirm: true });

      try {
        await command.parseAsync(['node', 'test', 'users', 'remove', 'testuser']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockUserRepository.remove).toHaveBeenCalledWith(mockUser);
      expect(mockOutputUtil.success).toHaveBeenCalledWith("User 'testuser' removed successfully");
    });

    it('should skip confirmation with --force flag', async () => {
      const mockUser = { id: '123', username: 'testuser' };
      mockUserRepository.findOne.mockResolvedValue(mockUser as any);

      try {
        await command.parseAsync(['node', 'test', 'users', 'remove', 'testuser', '--force']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).not.toHaveBeenCalled();
      expect(mockUserRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should cancel operation when user declines confirmation', async () => {
      const mockUser = { id: '123', username: 'testuser' };
      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockPrompt.mockResolvedValue({ confirm: false });

      try {
        await command.parseAsync(['node', 'test', 'users', 'remove', 'testuser']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockUserRepository.remove).not.toHaveBeenCalled();
      expect(mockOutputUtil.info).toHaveBeenCalledWith('Operation cancelled');
    });

    it('should handle user not found during remove', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync(['node', 'test', 'users', 'remove', 'nonexistent']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("User 'nonexistent' not found");
    });
  });
});