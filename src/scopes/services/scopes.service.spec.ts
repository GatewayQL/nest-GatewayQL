import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScopeEntity } from '../models/scope.entity';
import { ScopesService } from './scopes.service';
import { CreateScopeInput } from '../dto/create-scope.input';
import { UpdateScopeInput } from '../dto/update-scope.input';

describe('ScopesService', () => {
  let service: ScopesService;
  let repository: Repository<ScopeEntity>;

  const createMockScope = () => {
    const mockScope = new ScopeEntity();
    mockScope.id = 'scope-uuid-1';
    mockScope.name = 'read:users';
    mockScope.description = 'Read access to user data';
    mockScope.createdAt = 1234567890;
    mockScope.updatedAt = 1234567890;
    return mockScope;
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopesService,
        {
          provide: getRepositoryToken(ScopeEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ScopesService>(ScopesService);
    repository = module.get<Repository<ScopeEntity>>(getRepositoryToken(ScopeEntity));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createScopeInput: CreateScopeInput = {
      name: 'read:users',
      description: 'Read access to user data',
    };

    it('should successfully create a scope', async () => {
      const mockScope = createMockScope();
      mockRepository.create.mockReturnValue(mockScope);
      mockRepository.save.mockResolvedValue(mockScope);

      const result = await service.create(createScopeInput);

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: createScopeInput.name,
        description: createScopeInput.description,
      }));
      expect(mockRepository.save).toHaveBeenCalledWith(mockScope);
      expect(result).toEqual(mockScope);
    });

    it('should create scope without description', async () => {
      const inputWithoutDescription = { name: 'write:users' };
      const scopeWithoutDescription = { ...createMockScope(), name: 'write:users', description: undefined };

      mockRepository.create.mockReturnValue(scopeWithoutDescription);
      mockRepository.save.mockResolvedValue(scopeWithoutDescription);

      const result = await service.create(inputWithoutDescription);

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'write:users',
        description: undefined,
      }));
      expect(result).toEqual(scopeWithoutDescription);
    });

    it('should throw BadRequestException when save fails', async () => {
      const error = new Error('Database error');
      const mockScope = createMockScope();
      mockRepository.create.mockReturnValue(mockScope);
      mockRepository.save.mockRejectedValue(error);

      await expect(service.create(createScopeInput)).rejects.toThrow(
        new BadRequestException('Cannot create scope in database. Error: Database error'),
      );
    });

    it('should handle unique constraint violation', async () => {
      const uniqueError = new Error('duplicate key value violates unique constraint');
      const mockScope = createMockScope();
      mockRepository.create.mockReturnValue(mockScope);
      mockRepository.save.mockRejectedValue(uniqueError);

      await expect(service.create(createScopeInput)).rejects.toThrow(
        new BadRequestException('Cannot create scope in database. Error: duplicate key value violates unique constraint'),
      );
    });
  });

  describe('findAll', () => {
    it('should return array of scopes', async () => {
      const mockScopeArray = [createMockScope()];
      mockRepository.find.mockResolvedValue(mockScopeArray);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith();
      expect(result).toEqual(mockScopeArray);
    });

    it('should return empty array when no scopes exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database connection error');
      mockRepository.find.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('should return scope when found', async () => {
      const mockScope = createMockScope();
      mockRepository.findOne.mockResolvedValue(mockScope);

      const result = await service.findOne('scope-uuid-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'scope-uuid-1' },
      });
      expect(result).toEqual(mockScope);
    });

    it('should throw NotFoundException when scope not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Scope with ID non-existent-id not found'),
      );
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database connection error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findOne('scope-uuid-1')).rejects.toThrow(error);
    });
  });

  describe('findByName', () => {
    it('should return scope when found by name', async () => {
      const mockScope = createMockScope();
      mockRepository.findOne.mockResolvedValue(mockScope);

      const result = await service.findByName('read:users');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'read:users' },
      });
      expect(result).toEqual(mockScope);
    });

    it('should throw NotFoundException when scope not found by name', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findByName('non-existent-scope')).rejects.toThrow(
        new NotFoundException('Scope with name non-existent-scope not found'),
      );
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database connection error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findByName('read:users')).rejects.toThrow(error);
    });

    it('should be case sensitive for scope names', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findByName('READ:USERS')).rejects.toThrow(
        new NotFoundException('Scope with name READ:USERS not found'),
      );
    });
  });

  describe('update', () => {
    const updateScopeInput: UpdateScopeInput = {
      id: 'scope-uuid-1',
      name: 'read:admin',
      description: 'Read access to admin data',
    };

    it('should successfully update a scope', async () => {
      const mockScope = createMockScope();
      const updatedScope = { ...mockScope, ...updateScopeInput };
      mockRepository.findOne.mockResolvedValue(mockScope);
      mockRepository.save.mockResolvedValue(updatedScope);

      const result = await service.update('scope-uuid-1', updateScopeInput);

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        name: updateScopeInput.name,
        description: updateScopeInput.description,
      }));
      expect(result).toEqual(updatedScope);
    });

    it('should update only provided fields', async () => {
      const mockScope = createMockScope();
      const partialUpdate: UpdateScopeInput = {
        id: 'scope-uuid-1',
        name: 'updated-name-only',
      };

      mockRepository.findOne.mockResolvedValue(mockScope);
      mockRepository.save.mockResolvedValue({ ...mockScope, name: 'updated-name-only' });

      await service.update('scope-uuid-1', partialUpdate);

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        name: 'updated-name-only',
        description: mockScope.description, // Should remain unchanged
      }));
    });

    it('should update only description', async () => {
      const mockScope = createMockScope();
      const partialUpdate: UpdateScopeInput = {
        id: 'scope-uuid-1',
        description: 'Updated description only',
      };

      mockRepository.findOne.mockResolvedValue(mockScope);
      mockRepository.save.mockResolvedValue({ ...mockScope, description: 'Updated description only' });

      await service.update('scope-uuid-1', partialUpdate);

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        name: mockScope.name, // Should remain unchanged
        description: 'Updated description only',
      }));
    });

    it('should handle undefined fields correctly', async () => {
      const mockScope = createMockScope();
      const updateWithUndefined: UpdateScopeInput = {
        id: 'scope-uuid-1',
        name: undefined,
        description: 'Only description updated',
      };

      mockRepository.findOne.mockResolvedValue(mockScope);
      mockRepository.save.mockResolvedValue({ ...mockScope, description: 'Only description updated' });

      await service.update('scope-uuid-1', updateWithUndefined);

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        name: mockScope.name, // Should remain unchanged when undefined
        description: 'Only description updated',
      }));
    });

    it('should throw NotFoundException when scope not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateScopeInput)).rejects.toThrow(
        new NotFoundException('Scope with ID non-existent-id not found'),
      );
    });

    it('should throw BadRequestException when save fails', async () => {
      const error = new Error('Database error');
      const mockScope = createMockScope();
      mockRepository.findOne.mockResolvedValue(mockScope);
      mockRepository.save.mockRejectedValue(error);

      await expect(service.update('scope-uuid-1', updateScopeInput)).rejects.toThrow(
        new BadRequestException('Cannot update scope in database. Error: Database error'),
      );
    });

    it('should handle unique constraint violation on update', async () => {
      const uniqueError = new Error('duplicate key value violates unique constraint');
      const mockScope = createMockScope();
      mockRepository.findOne.mockResolvedValue(mockScope);
      mockRepository.save.mockRejectedValue(uniqueError);

      await expect(service.update('scope-uuid-1', updateScopeInput)).rejects.toThrow(
        new BadRequestException('Cannot update scope in database. Error: duplicate key value violates unique constraint'),
      );
    });
  });

  describe('remove', () => {
    it('should successfully delete a scope', async () => {
      const mockScope = createMockScope();
      mockRepository.findOne.mockResolvedValue(mockScope);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove('scope-uuid-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('scope-uuid-1');
      expect(result).toEqual(mockScope);
    });

    it('should throw NotFoundException when scope not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException('Scope with ID non-existent-id not found'),
      );
    });

    it('should throw BadRequestException when delete fails', async () => {
      const error = new Error('Database error');
      const mockScope = createMockScope();
      mockRepository.findOne.mockResolvedValue(mockScope);
      mockRepository.delete.mockRejectedValue(error);

      await expect(service.remove('scope-uuid-1')).rejects.toThrow(
        new BadRequestException('Cannot delete scope from database. Error: Database error'),
      );
    });

    it('should handle foreign key constraint violations', async () => {
      const foreignKeyError = new Error('violates foreign key constraint');
      const mockScope = createMockScope();
      mockRepository.findOne.mockResolvedValue(mockScope);
      mockRepository.delete.mockRejectedValue(foreignKeyError);

      await expect(service.remove('scope-uuid-1')).rejects.toThrow(
        new BadRequestException('Cannot delete scope from database. Error: violates foreign key constraint'),
      );
    });

    it('should return the deleted scope entity', async () => {
      const mockScope = createMockScope();
      mockRepository.findOne.mockResolvedValue(mockScope);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove('scope-uuid-1');

      expect(result).toEqual(mockScope);
      expect(result.id).toBe('scope-uuid-1');
      expect(result.name).toBe('read:users');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty string inputs', async () => {
      const emptyInput: CreateScopeInput = {
        name: '',
        description: '',
      };

      const mockScope = { ...createMockScope(), name: '', description: '' };
      mockRepository.create.mockReturnValue(mockScope);
      mockRepository.save.mockResolvedValue(mockScope);

      const result = await service.create(emptyInput);

      expect(result.name).toBe('');
      expect(result.description).toBe('');
    });

    it('should handle very long scope names', async () => {
      const longName = 'a'.repeat(1000);
      const longNameInput: CreateScopeInput = {
        name: longName,
        description: 'Test description',
      };

      const mockScope = { ...createMockScope(), name: longName };
      mockRepository.create.mockReturnValue(mockScope);
      mockRepository.save.mockResolvedValue(mockScope);

      const result = await service.create(longNameInput);

      expect(result.name).toBe(longName);
    });

    it('should handle null description gracefully', async () => {
      const inputWithNullDescription = {
        name: 'test:scope',
        description: null,
      } as any;

      const mockScope = { ...createMockScope(), description: null };
      mockRepository.create.mockReturnValue(mockScope);
      mockRepository.save.mockResolvedValue(mockScope);

      const result = await service.create(inputWithNullDescription);

      expect(result.description).toBeNull();
    });

    it('should handle database timeout errors', async () => {
      const timeoutError = new Error('connection timeout');
      mockRepository.find.mockRejectedValue(timeoutError);

      await expect(service.findAll()).rejects.toThrow(timeoutError);
    });
  });

  describe('Scope naming conventions', () => {
    it('should accept standard OAuth scope patterns', async () => {
      const standardScopes = [
        'read',
        'write',
        'admin',
        'read:users',
        'write:users',
        'admin:users',
        'openid',
        'profile',
        'email',
      ];

      for (const scopeName of standardScopes) {
        const input: CreateScopeInput = { name: scopeName };
        const scopeEntity = { ...createMockScope(), name: scopeName };

        mockRepository.create.mockReturnValue(scopeEntity);
        mockRepository.save.mockResolvedValue(scopeEntity);

        const result = await service.create(input);
        expect(result.name).toBe(scopeName);

        jest.clearAllMocks();
      }
    });

    it('should accept custom application scope patterns', async () => {
      const customScopes = [
        'gateway:read',
        'gateway:write',
        'gateway:admin',
        'api:v1:read',
        'api:v1:write',
        'resource.read',
        'resource.write',
      ];

      for (const scopeName of customScopes) {
        const input: CreateScopeInput = { name: scopeName };
        const scopeEntity = { ...createMockScope(), name: scopeName };

        mockRepository.create.mockReturnValue(scopeEntity);
        mockRepository.save.mockResolvedValue(scopeEntity);

        const result = await service.create(input);
        expect(result.name).toBe(scopeName);

        jest.clearAllMocks();
      }
    });
  });
});