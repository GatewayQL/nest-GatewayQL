import { Command } from 'commander';
import inquirer from 'inquirer';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createCredentialsCommand } from './credentials.command';
import { getDataSource, closeDataSource } from '../utils/database.util';
import { OutputUtil } from '../utils/output.util';
import { PasswordUtil } from '../utils/password.util';
import { CredentialEntity } from '../../credentials/models/credential.entity';
import { CredentialType } from '../../credentials/models/credential.interface';
import { UserEntity } from '../../users/models/user.entity';

// Mock dependencies
jest.mock('inquirer');
jest.mock('../utils/database.util');
jest.mock('../utils/output.util');
jest.mock('../utils/password.util');
jest.mock('uuid');

// Mock inquirer properly
const mockPrompt = jest.fn();
(inquirer as any).prompt = mockPrompt;

describe('CredentialsCommand', () => {
  let command: Command;
  let mockDataSource: any;
  let mockCredentialRepository: jest.Mocked<Repository<CredentialEntity>>;
  let mockUserRepository: jest.Mocked<Repository<UserEntity>>;
  let mockOutputUtil: jest.Mocked<typeof OutputUtil>;
  let mockPasswordUtil: jest.Mocked<typeof PasswordUtil>;
  let mockUuidv4: jest.MockedFunction<typeof uuidv4>;
  let processExitSpy: jest.SpyInstance;
  let mockQueryBuilder: any;

  beforeEach(() => {
    // Mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    // Mock repositories
    mockCredentialRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockUserRepository = {
      findOne: jest.fn(),
    } as any;

    // Mock data source
    mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === CredentialEntity) return mockCredentialRepository;
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
      printCredential: jest.fn(),
    } as any;

    mockPasswordUtil = {
      hash: jest.fn(),
    } as any;

    mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

    // Mock the static methods
    OutputUtil.error = mockOutputUtil.error;
    OutputUtil.info = mockOutputUtil.info;
    OutputUtil.success = mockOutputUtil.success;
    OutputUtil.table = mockOutputUtil.table;
    OutputUtil.printCredential = mockOutputUtil.printCredential;

    PasswordUtil.hash = mockPasswordUtil.hash;

    // Mock database utils
    (getDataSource as jest.Mock).mockResolvedValue(mockDataSource);
    (closeDataSource as jest.Mock).mockResolvedValue(undefined);

    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    command = new Command();
    command.addCommand(createCredentialsCommand());
  });

  afterEach(() => {
    jest.clearAllMocks();
    processExitSpy.mockRestore();
  });

  describe('credentials create', () => {
    it('should create basic-auth credential with provided options', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
      };

      const mockCredential = {
        id: 'cred-123',
        consumerId: 'testuser',
        type: CredentialType.BASIC,
        scope: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockPasswordUtil.hash.mockResolvedValue('hashedSecret');
      mockCredentialRepository.save.mockResolvedValue(mockCredential as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'credentials',
          'create',
          '--consumer-id', 'testuser',
          '--type', 'basic-auth',
          '--secret', 'testsecret',
          '--scope', 'admin'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' }
      });
      expect(mockPasswordUtil.hash).toHaveBeenCalledWith('testsecret');
      expect(mockCredentialRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith('Credential created successfully');
      expect(mockOutputUtil.printCredential).toHaveBeenCalled();
      expect(closeDataSource).toHaveBeenCalled();
    });

    it('should create key-auth credential with generated key', async () => {
      const mockUser = { id: 'user-123', username: 'testuser' };
      const mockKeyId = 'generated-key-id';

      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockUuidv4.mockReturnValue(mockKeyId as any);
      mockPasswordUtil.hash.mockResolvedValue('hashedSecret');
      mockCredentialRepository.save.mockResolvedValue({ id: 'cred-123' } as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'credentials',
          'create',
          '--consumer-id', 'testuser',
          '--type', 'key-auth',
          '--secret', 'testsecret'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      const saveCall = mockCredentialRepository.save.mock.calls[0][0];
      expect(saveCall.keyId).toBe(mockKeyId);
      expect(mockUuidv4).toHaveBeenCalled();
    });

    it('should prompt for missing required fields', async () => {
      const mockAnswers = {
        consumerId: 'prompteduser',
        type: 'oauth2',
        secret: 'promptedsecret',
      };

      const mockUser = { id: 'user-123', username: 'prompteduser' };

      mockPrompt.mockResolvedValue(mockAnswers);
      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockPasswordUtil.hash.mockResolvedValue('hashedSecret');
      mockCredentialRepository.save.mockResolvedValue({ id: 'cred-123' } as any);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'create']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockCredentialRepository.save).toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync([
          'node',
          'test',
          'credentials',
          'create',
          '--consumer-id', 'nonexistent',
          '--secret', 'testsecret'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith(
        "User 'nonexistent' not found"
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
          'credentials',
          'create',
          '--consumer-id', 'testuser',
          '--secret', 'testsecret'
        ]);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith(
        'Failed to create credential: Database connection failed'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should validate credential type', async () => {
      const mockUser = { id: 'user-123', username: 'testuser' };
      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockPasswordUtil.hash.mockResolvedValue('hashedSecret');
      mockCredentialRepository.save.mockResolvedValue({ id: 'cred-123' } as any);

      try {
        await command.parseAsync([
          'node',
          'test',
          'credentials',
          'create',
          '--consumer-id', 'testuser',
          '--type', 'jwt',
          '--secret', 'testsecret'
        ]);
      } catch (error) {
        // Expected due to process.exit mock
      }

      const saveCall = mockCredentialRepository.save.mock.calls[0][0];
      expect(saveCall.type).toBe(CredentialType.JWT);
    });
  });

  describe('credentials list', () => {
    it('should list all credentials when no filter is provided', async () => {
      const mockQueryBuilder = {
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'cred-1',
            consumerId: 'user1',
            type: CredentialType.BASIC,
            scope: 'admin',
            isActive: true,
            createdAt: new Date(),
          }
        ]),
      };

      mockCredentialRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'list']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockCredentialRepository.createQueryBuilder).toHaveBeenCalledWith('credential');
      expect(mockOutputUtil.table).toHaveBeenCalled();
    });

    it('should filter credentials by consumer', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockCredentialRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'list', '--consumer-id', 'testuser']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('credential.consumerId = :consumerId', { consumerId: 'testuser' });
    });

    it('should filter credentials by active status', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'list', '--active-only']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('credential.isActive = :isActive', { isActive: true });
    });

    it('should handle empty credential list', async () => {
      const mockQueryBuilder = {
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockCredentialRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'list']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockOutputUtil.info).toHaveBeenCalledWith('No credentials found');
    });

    it('should handle database errors during list', async () => {
      const error = new Error('Query failed');
      mockCredentialRepository.createQueryBuilder.mockImplementation(() => {
        throw error;
      });

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'list']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith('Failed to list credentials: Query failed');
    });
  });

  describe('credentials info', () => {
    it('should show credential information', async () => {
      const mockCredential = {
        id: 'cred-123',
        consumerId: 'testuser',
        type: CredentialType.BASIC,
        scope: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCredentialRepository.findOne.mockResolvedValue(mockCredential as any);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'info', 'cred-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockCredentialRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'cred-123' }
      });
      expect(mockOutputUtil.printCredential).toHaveBeenCalledWith(mockCredential);
    });

    it('should handle credential not found', async () => {
      mockCredentialRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'info', 'nonexistent']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("Credential 'nonexistent' not found");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('credentials activate', () => {
    it('should activate credential', async () => {
      const mockCredential = { id: 'cred-123', isActive: false };
      mockCredentialRepository.findOne.mockResolvedValue(mockCredential as any);
      mockCredentialRepository.save.mockResolvedValue({ ...mockCredential, isActive: true } as any);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'activate', 'cred-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockCredentialRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith("Credential 'cred-123' activated successfully");
    });

    it('should handle already active credential', async () => {
      const mockCredential = { id: 'cred-123', isActive: true };
      mockCredentialRepository.findOne.mockResolvedValue(mockCredential as any);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'activate', 'cred-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockCredentialRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith("Credential 'cred-123' activated successfully");
    });
  });

  describe('credentials deactivate', () => {
    it('should deactivate credential', async () => {
      const mockCredential = { id: 'cred-123', isActive: true };
      mockCredentialRepository.findOne.mockResolvedValue(mockCredential as any);
      mockCredentialRepository.save.mockResolvedValue({ ...mockCredential, isActive: false } as any);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'deactivate', 'cred-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockCredentialRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith("Credential 'cred-123' deactivated successfully");
    });

    it('should handle already inactive credential', async () => {
      const mockCredential = { id: 'cred-123', isActive: false };
      mockCredentialRepository.findOne.mockResolvedValue(mockCredential as any);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'deactivate', 'cred-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockCredentialRepository.save).toHaveBeenCalled();
      expect(mockOutputUtil.success).toHaveBeenCalledWith("Credential 'cred-123' deactivated successfully");
    });
  });

  describe('credentials remove', () => {
    it('should remove credential with confirmation', async () => {
      const mockCredential = { id: 'cred-123', consumerId: 'testuser' };
      mockCredentialRepository.findOne.mockResolvedValue(mockCredential as any);
      mockPrompt.mockResolvedValue({ confirm: true });

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'remove', 'cred-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockCredentialRepository.remove).toHaveBeenCalledWith(mockCredential);
      expect(mockOutputUtil.success).toHaveBeenCalledWith("Credential 'cred-123' removed successfully");
    });

    it('should skip confirmation with --force flag', async () => {
      const mockCredential = { id: 'cred-123', consumerId: 'testuser' };
      mockCredentialRepository.findOne.mockResolvedValue(mockCredential as any);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'remove', 'cred-123', '--force']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockPrompt).not.toHaveBeenCalled();
      expect(mockCredentialRepository.remove).toHaveBeenCalledWith(mockCredential);
    });

    it('should cancel operation when user declines confirmation', async () => {
      const mockCredential = { id: 'cred-123', consumerId: 'testuser' };
      mockCredentialRepository.findOne.mockResolvedValue(mockCredential as any);
      mockPrompt.mockResolvedValue({ confirm: false });

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'remove', 'cred-123']);
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(mockCredentialRepository.remove).not.toHaveBeenCalled();
      expect(mockOutputUtil.info).toHaveBeenCalledWith('Operation cancelled');
    });

    it('should handle credential not found during remove', async () => {
      mockCredentialRepository.findOne.mockResolvedValue(null);

      try {
        await command.parseAsync(['node', 'test', 'credentials', 'remove', 'nonexistent']);
      } catch (error) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockOutputUtil.error).toHaveBeenCalledWith("Credential 'nonexistent' not found");
    });
  });
});