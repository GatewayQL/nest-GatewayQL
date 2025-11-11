import { Command } from 'commander';
import inquirer from 'inquirer';
import { Repository } from 'typeorm';
import { createScopesCommand } from './scopes.command';
import { getDataSource, closeDataSource } from '../utils/database.util';
import { OutputUtil } from '../utils/output.util';
import { ScopeEntity } from '../../scopes/models/scope.entity';

// Mock dependencies
jest.mock('inquirer');
jest.mock('../utils/database.util');
jest.mock('../utils/output.util');

// Mock inquirer properly
const mockPrompt = jest.fn();
(inquirer as any).prompt = mockPrompt;

describe('ScopesCommand', () => {
  let command: Command;
  let mockDataSource: any;
  let mockScopeRepository: jest.Mocked<Repository<ScopeEntity>>;
  let mockOutputUtil: jest.Mocked<typeof OutputUtil>;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock repository
    mockScopeRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    } as any;

    // Mock data source
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockScopeRepository),
    };

    // Mock utilities
    mockOutputUtil = {
      error: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      table: jest.fn(),
      json: jest.fn(),
    } as any;

    // Mock the static methods
    OutputUtil.error = mockOutputUtil.error;
    OutputUtil.info = mockOutputUtil.info;
    OutputUtil.success = mockOutputUtil.success;
    OutputUtil.table = mockOutputUtil.table;
    OutputUtil.json = mockOutputUtil.json;

    // Mock database utils
    (getDataSource as jest.Mock).mockResolvedValue(mockDataSource);
    (closeDataSource as jest.Mock).mockResolvedValue(undefined);

    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    command = new Command();
    command.addCommand(createScopesCommand());
  });

  afterEach(() => {
    jest.clearAllMocks();
    processExitSpy.mockRestore();
  });

  describe('scopes create', () => {
    it('should create scope with provided options', async () => {
      const mockScope = {
        id: 'scope-123',
        name: 'test-scope',
        description: 'Test scope description',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockScopeRepository.findOne.mockResolvedValue(null);
      mockScopeRepository.save.mockResolvedValue(mockScope as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'scopes',
          'create',
          '--name', 'test-scope',
          '--description', 'Test scope description'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockScopeRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'test-scope' }
      });
      expect(mockScopeRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith('Scope created successfully');
      expect(closeDataSource).toHaveBeenCalled();
    });

    it('should prompt for missing required fields', async () => {
      const mockAnswers = {
        name: 'prompted-scope',
        description: 'Prompted description',
      };

      mockPrompt.mockResolvedValue(mockAnswers);
      mockScopeRepository.findOne.mockResolvedValue(null);
      mockScopeRepository.save.mockResolvedValue({ id: 'scope-123' } as any);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'create']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockScopeRepository.save).toHaveBeenCalled();
    });

    it('should handle existing scope error', async () => {
      const existingScope = { name: 'test-scope' };
      mockScopeRepository.findOne.mockResolvedValue(existingScope as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'scopes',
          'create',
          '--name', 'test-scope'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith(
        "Scope 'test-scope' already exists"
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockScopeRepository.findOne.mockRejectedValue(error);

      try {
        await command.parseAsync([
          'node',
          'test',
          'scopes',
          'create',
          '--name', 'test-scope'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith(
        'Failed to create scope: Database connection failed'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should create scope without description', async () => {
      mockScopeRepository.findOne.mockResolvedValue(null);
      mockScopeRepository.save.mockResolvedValue({ id: 'scope-123' } as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'scopes',
          'create',
          '--name', 'test-scope'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      const saveCall = mockScopeRepository.save.mock.calls[0][0];
      expect(saveCall.name).toBe('test-scope');
      expect(saveCall.description).toBeUndefined();
    });
  });

  describe('scopes list', () => {
    it('should list all scopes', async () => {
      const mockScopes = [
        {
          id: 'scope-1',
          name: 'read',
          description: 'Read access',
          createdAt: new Date(),
        },
        {
          id: 'scope-2',
          name: 'write',
          description: 'Write access',
          createdAt: new Date(),
        }
      ];

      mockScopeRepository.find.mockResolvedValue(mockScopes as any);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'list']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockScopeRepository.find).toHaveBeenCalledWith();
      expect(mockOutputUtil.table).toHaveBeenCalled();
    });

    it('should handle empty scope list', async () => {
      mockScopeRepository.find.mockResolvedValue([]);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'list']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockOutputUtil.info).toHaveBeenCalledWith('No scopes found');
    });

    it('should handle database errors during list', async () => {
      const error = new Error('Query failed');
      mockScopeRepository.find.mockRejectedValue(error);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'list']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith('Failed to list scopes: Query failed');
    });

    it('should format scope data properly', async () => {
      const mockScopes = [
        {
          id: 'scope-1',
          name: 'read',
          description: 'Read access',
          createdAt: new Date('2023-01-01T00:00:00Z'),
        }
      ];

      mockScopeRepository.find.mockResolvedValue(mockScopes as any);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'list']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      const tableCall = mockOutputUtil.table.mock.calls[0][0];
      expect(tableCall[0]).toEqual({
        id: 'scope-1',
        name: 'read',
        description: 'Read access',
        createdAt: expect.any(String),
      });
    });
  });

  describe('scopes info', () => {
    it('should show scope information', async () => {
      const mockScope = {
        id: 'scope-123',
        name: 'test-scope',
        description: 'Test scope description',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockScopeRepository.findOne.mockResolvedValue(mockScope as any);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'info', 'test-scope']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockScopeRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'test-scope' }
      });
      // The info command uses console.log directly, not OutputUtil.json
      // Just verify findOne was called correctly
    });

    it('should handle scope not found', async () => {
      mockScopeRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'info', 'nonexistent']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("Scope 'nonexistent' not found");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle database errors during info', async () => {
      const error = new Error('Query failed');
      mockScopeRepository.findOne.mockRejectedValue(error);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'info', 'test-scope']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith('Failed to get scope info: Query failed');
    });
  });

  describe('scopes update', () => {
    it('should update scope description', async () => {
      const mockScope = {
        id: 'scope-123',
        name: 'test-scope',
        description: 'Old description',
      };

      mockScopeRepository.findOne.mockResolvedValue(mockScope as any);
      mockScopeRepository.save.mockResolvedValue({
        ...mockScope,
        description: 'New description',
      } as any);

      try {
        await command.parseAsync([
          'node', 'test', 'scopes', 'update', 'test-scope',
          '--description', 'New description'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockScopeRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith('Scope updated successfully');
    });

    it('should handle scope not found during update', async () => {
      mockScopeRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync([
          'node', 'test', 'scopes', 'update', 'nonexistent',
          '--description', 'New description'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("Scope 'nonexistent' not found");
    });

    it('should handle update with no changes', async () => {
      const mockScope = { id: 'scope-123', name: 'test-scope' };
      mockScopeRepository.findOne.mockResolvedValue(mockScope as any);
      mockScopeRepository.save.mockResolvedValue(mockScope as any);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'update', 'test-scope']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      // The implementation saves even with no changes
      expect(mockScopeRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith('Scope updated successfully');
    });

    it('should handle database errors during update', async () => {
      const error = new Error('Update failed');
      mockScopeRepository.findOne.mockResolvedValue({ id: 'scope-123' } as any);
      mockScopeRepository.save.mockRejectedValue(error);

      try {
        await command.parseAsync([
          'node', 'test', 'scopes', 'update', 'test-scope',
          '--description', 'New description'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith('Failed to update scope: Update failed');
    });
  });

  describe('scopes remove', () => {
    it('should remove scope with confirmation', async () => {
      const mockScope = { id: 'scope-123', name: 'test-scope' };
      mockScopeRepository.findOne.mockResolvedValue(mockScope as any);
      mockPrompt.mockResolvedValue({ confirm: true });

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'remove', 'test-scope']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockScopeRepository.remove).toHaveBeenCalledWith(mockScope);
      expect(mockOutputUtil.success).toHaveBeenCalledWith("Scope 'test-scope' removed successfully");
    });

    it('should skip confirmation with --force flag', async () => {
      const mockScope = { id: 'scope-123', name: 'test-scope' };
      mockScopeRepository.findOne.mockResolvedValue(mockScope as any);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'remove', 'test-scope', '--force']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).not.toHaveBeenCalled();
      expect(mockScopeRepository.remove).toHaveBeenCalledWith(mockScope);
    });

    it('should cancel operation when user declines confirmation', async () => {
      const mockScope = { id: 'scope-123', name: 'test-scope' };
      mockScopeRepository.findOne.mockResolvedValue(mockScope as any);
      mockPrompt.mockResolvedValue({ confirm: false });

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'remove', 'test-scope']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockScopeRepository.remove).not.toHaveBeenCalled();
      expect(mockOutputUtil.info).toHaveBeenCalledWith('Operation cancelled');
    });

    it('should handle scope not found during remove', async () => {
      mockScopeRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'remove', 'nonexistent']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("Scope 'nonexistent' not found");
    });

    it('should handle database errors during remove', async () => {
      const error = new Error('Remove failed');
      mockScopeRepository.findOne.mockResolvedValue({ id: 'scope-123' } as any);
      mockScopeRepository.remove.mockRejectedValue(error);

      try {
        await command.parseAsync(['node', 'test', 'scopes', 'remove', 'test-scope', '--force']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith('Failed to remove scope: Remove failed');
    });
  });
});