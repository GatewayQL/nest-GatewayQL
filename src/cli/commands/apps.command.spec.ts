import { Command } from 'commander';
import inquirer from 'inquirer';
import { Repository } from 'typeorm';
import { createAppsCommand } from './apps.command';
import { getDataSource, closeDataSource } from '../utils/database.util';
import { OutputUtil } from '../utils/output.util';
import { AppEntity } from '../../apps/models/app.entity';
import { UserEntity } from '../../users/models/user.entity';

// Mock dependencies
jest.mock('inquirer');
jest.mock('../utils/database.util');
jest.mock('../utils/output.util');

// Mock inquirer properly
const mockPrompt = jest.fn();
(inquirer as any).prompt = mockPrompt;

describe('AppsCommand', () => {
  let command: Command;
  let mockDataSource: any;
  let mockAppRepository: jest.Mocked<Repository<AppEntity>>;
  let mockUserRepository: jest.Mocked<Repository<UserEntity>>;
  let mockOutputUtil: jest.Mocked<typeof OutputUtil>;
  let processExitSpy: jest.SpyInstance;
  let mockQueryBuilder: any;

  beforeEach(() => {
    // Mock query builder
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    // Mock repositories
    mockAppRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockUserRepository = {
      findOne: jest.fn(),
    } as any;

    // Mock data source
    mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === AppEntity) return mockAppRepository;
        if (entity === UserEntity) return mockUserRepository;
        return null;
      }),
    };

    // Mock utilities
    mockOutputUtil = {
      error: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      table: jest.fn(),
    } as any;

    // Mock the static methods
    OutputUtil.error = mockOutputUtil.error;
    OutputUtil.info = mockOutputUtil.info;
    OutputUtil.success = mockOutputUtil.success;
    OutputUtil.table = mockOutputUtil.table;

    // Mock database utils
    (getDataSource as jest.Mock).mockResolvedValue(mockDataSource);
    (closeDataSource as jest.Mock).mockResolvedValue(undefined);

    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    command = new Command();
    command.addCommand(createAppsCommand());
  });

  afterEach(() => {
    jest.clearAllMocks();
    processExitSpy.mockRestore();
  });

  describe('apps create', () => {
    it('should create app with provided options using username', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
      };

      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        description: 'Test Description',
        userId: 'user-123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockAppRepository.findOne.mockResolvedValue(null);
      mockAppRepository.save.mockResolvedValue(mockApp as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'apps',
          'create',
          '--name', 'Test App',
          '--description', 'Test Description',
          '--username', 'testuser',
          '--redirect-uri', 'http://localhost:3000/callback'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' }
      });
      expect(mockAppRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith('Application created successfully');
      expect(closeDataSource).toHaveBeenCalled();
    });

    it('should create app with provided user ID', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
      };

      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        userId: 'user-123',
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockAppRepository.findOne.mockResolvedValue(null);
      mockAppRepository.save.mockResolvedValue(mockApp as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'apps',
          'create',
          '--name', 'Test App',
          '--user-id', 'user-123'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-123' } });
      expect(mockAppRepository.save).toHaveBeenCalled();
    });

    it('should prompt for missing required fields', async () => {
      const mockAnswers = {
        name: 'Prompted App',
        username: 'prompteduser',
        description: 'Prompted Description',
      };

      const mockUser = {
        id: 'user-123',
        username: 'prompteduser',
      };

      mockPrompt.mockResolvedValue(mockAnswers);
      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockAppRepository.findOne.mockResolvedValue(null);
      mockAppRepository.save.mockResolvedValue({ id: 'app-123' } as any);

      try {
        await command.parseAsync(['node', 'test', 'apps', 'create']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockAppRepository.save).toHaveBeenCalled();
    });

    it('should create inactive app when --inactive flag is used', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockAppRepository.findOne.mockResolvedValue(null);
      mockAppRepository.save.mockResolvedValue({ id: 'app-123', isActive: false } as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'apps',
          'create',
          '--name', 'Test App',
          '--user-id', 'user-123',
          '--inactive'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      const saveCall = mockAppRepository.save.mock.calls[0][0];
      expect(saveCall.isActive).toBe(false);
    });

    it('should handle user not found error', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync([
          'node',
          'test',
          'apps',
          'create',
          '--name', 'Test App',
          '--username', 'nonexistent'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith(
        "User not found: nonexistent"
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle existing app error', async () => {
      const mockUser = { id: 'user-123', username: 'testuser' };
      const existingApp = { name: 'Test App' };
      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockAppRepository.findOne.mockResolvedValue(existingApp as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'apps',
          'create',
          '--name', 'Test App',
          '--username', 'testuser'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith(
        "Application 'Test App' already exists for user 'testuser'"
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
          'apps',
          'create',
          '--name', 'Test App',
          '--username', 'testuser'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith(
        'Failed to create application: Database connection failed'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('apps list', () => {
    it('should list all apps when no filter is provided', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'app-1',
            name: 'App 1',
            description: 'Description 1',
            isActive: true,
            user: { username: 'user1' },
            createdAt: new Date(),
          }
        ]),
      };

      mockAppRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Mock console.table since the implementation uses it directly
      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation(() => {});

      try {
        await command.parseAsync(['node', 'test', 'apps', 'list']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockAppRepository.createQueryBuilder).toHaveBeenCalledWith('app');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('app.user', 'user');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('app.createdAt', 'DESC');
      expect(consoleTableSpy).toHaveBeenCalled();

      consoleTableSpy.mockRestore();
    });

    it('should filter apps by user', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockAppRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      try {
        await command.parseAsync(['node', 'test', 'apps', 'list', '--username', 'testuser']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.username = :username', { username: 'testuser' });
      expect(mockOutputUtil.info).toHaveBeenCalledWith('No applications found');
    });

    it('should handle empty app list', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockAppRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      try {
        await command.parseAsync(['node', 'test', 'apps', 'list']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockOutputUtil.info).toHaveBeenCalledWith('No applications found');
    });

    it('should handle database errors during list', async () => {
      const error = new Error('Query failed');
      mockAppRepository.createQueryBuilder.mockImplementation(() => {
        throw error;
      });

      try {
        await command.parseAsync(['node', 'test', 'apps', 'list']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith('Failed to list applications: Query failed');
    });
  });

  describe('apps info', () => {
    it('should show app information', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        description: 'Test Description',
        isActive: true,
        user: { username: 'testuser', email: 'test@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAppRepository.findOne.mockResolvedValue(mockApp as any);

      try {
        await command.parseAsync(['node', 'test', 'apps', 'info', 'app-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockAppRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-123' },
        relations: ['user']
      });
      expect(mockOutputUtil.success).toHaveBeenCalledWith('Application Information');
    });

    it('should handle app not found', async () => {
      mockAppRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync(['node', 'test', 'apps', 'info', 'nonexistent-id']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("Application not found: nonexistent-id");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('apps update', () => {
    it('should update app fields', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        description: 'Old Description',
        user: { username: 'testuser', email: 'test@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedApp = {
        ...mockApp,
        description: 'New Description',
      };

      mockAppRepository.findOne.mockResolvedValue(mockApp as any);
      mockAppRepository.save.mockResolvedValue(updatedApp as any);

      try {
        await command.parseAsync([
          'node', 'test', 'apps', 'update', 'app-123',
          '--description', 'New Description'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockAppRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-123' },
        relations: ['user']
      });
      expect(mockAppRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith('Application updated successfully');
    });

    it('should handle app not found during update', async () => {
      mockAppRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync([
          'node', 'test', 'apps', 'update', 'nonexistent-id',
          '--description', 'New Description'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("Application not found: nonexistent-id");
    });
  });

  describe('apps remove', () => {
    it('should remove app with confirmation', async () => {
      const mockApp = { id: 'app-123', name: 'Test App', user: { username: 'testuser' } };
      mockAppRepository.findOne.mockResolvedValue(mockApp as any);
      mockPrompt.mockResolvedValue({ confirm: true });

      try {
        await command.parseAsync(['node', 'test', 'apps', 'remove', 'app-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockAppRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-123' },
        relations: ['user']
      });
      expect(mockPrompt).toHaveBeenCalled();
      expect(mockAppRepository.delete).toHaveBeenCalledWith('app-123');
      expect(mockOutputUtil.success).toHaveBeenCalledWith("Application 'Test App' removed successfully");
    });

    it('should skip confirmation with --force flag', async () => {
      const mockApp = { id: 'app-123', name: 'Test App', user: { username: 'testuser' } };
      mockAppRepository.findOne.mockResolvedValue(mockApp as any);

      try {
        await command.parseAsync(['node', 'test', 'apps', 'remove', 'app-123', '--force']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).not.toHaveBeenCalled();
      expect(mockAppRepository.delete).toHaveBeenCalledWith('app-123');
    });

    it('should cancel operation when user declines confirmation', async () => {
      const mockApp = { id: 'app-123', name: 'Test App', user: { username: 'testuser' } };
      mockAppRepository.findOne.mockResolvedValue(mockApp as any);
      mockPrompt.mockResolvedValue({ confirm: false });

      try {
        await command.parseAsync(['node', 'test', 'apps', 'remove', 'app-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockAppRepository.delete).not.toHaveBeenCalled();
      expect(mockOutputUtil.info).toHaveBeenCalledWith('Operation cancelled');
    });

    it('should handle app not found during remove', async () => {
      mockAppRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync(['node', 'test', 'apps', 'remove', 'nonexistent-id']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("Application not found: nonexistent-id");
    });
  });

  describe('apps activate', () => {
    it('should activate app', async () => {
      const mockApp = { id: 'app-123', name: 'Test App', isActive: false, user: { username: 'testuser' } };
      mockAppRepository.findOne.mockResolvedValue(mockApp as any);
      mockAppRepository.save.mockResolvedValue({ ...mockApp, isActive: true } as any);

      try {
        await command.parseAsync(['node', 'test', 'apps', 'activate', 'app-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockAppRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-123' },
        relations: ['user']
      });
      expect(mockAppRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith("Application 'Test App' activated successfully");
    });
  });

  describe('apps deactivate', () => {
    it('should deactivate app', async () => {
      const mockApp = { id: 'app-123', name: 'Test App', isActive: true, user: { username: 'testuser' } };
      mockAppRepository.findOne.mockResolvedValue(mockApp as any);
      mockAppRepository.save.mockResolvedValue({ ...mockApp, isActive: false } as any);

      try {
        await command.parseAsync(['node', 'test', 'apps', 'deactivate', 'app-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockAppRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-123' },
        relations: ['user']
      });
      expect(mockAppRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith("Application 'Test App' deactivated successfully");
    });
  });
});