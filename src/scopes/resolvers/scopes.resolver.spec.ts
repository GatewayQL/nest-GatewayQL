import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { ScopesResolver } from './scopes.resolver';
import { ScopesService } from '../services/scopes.service';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ScopeEntity } from '../models/scope.entity';
import { CreateScopeInput } from '../dto/create-scope.input';
import { UpdateScopeInput } from '../dto/update-scope.input';
import { UserRole } from '../../users/models/user.interface';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ScopesResolver', () => {
  let resolver: ScopesResolver;
  let scopesService: ScopesService;

  const createMockScope = () => {
    const mockScope = new ScopeEntity();
    mockScope.id = 'scope-uuid-1';
    mockScope.name = 'read:users';
    mockScope.description = 'Read access to user data';
    mockScope.createdAt = 1234567890;
    mockScope.updatedAt = 1234567890;
    return mockScope;
  };

  const mockScopesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByName: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRolesGuard = {
    canActivate: jest.fn((context: ExecutionContext) => {
      return true; // Allow all requests for testing
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopesResolver,
        {
          provide: ScopesService,
          useValue: mockScopesService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    resolver = module.get<ScopesResolver>(ScopesResolver);
    scopesService = module.get<ScopesService>(ScopesService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createScope', () => {
    const createScopeInput: CreateScopeInput = {
      name: 'read:users',
      description: 'Read access to user data',
    };

    it('should create a scope successfully', async () => {
      const mockScope = createMockScope();
      mockScopesService.create.mockResolvedValue(mockScope);

      const result = await resolver.createScope(createScopeInput);

      expect(mockScopesService.create).toHaveBeenCalledWith(createScopeInput);
      expect(result).toEqual(mockScope);
    });

    it('should create scope without description', async () => {
      const inputWithoutDescription: CreateScopeInput = {
        name: 'write:users',
      };
      const scopeWithoutDescription = { ...createMockScope(), name: 'write:users', description: undefined };

      mockScopesService.create.mockResolvedValue(scopeWithoutDescription);

      const result = await resolver.createScope(inputWithoutDescription);

      expect(mockScopesService.create).toHaveBeenCalledWith(inputWithoutDescription);
      expect(result).toEqual(scopeWithoutDescription);
    });

    it('should handle service errors', async () => {
      const error = new BadRequestException('Cannot create scope in database. Error: duplicate key');
      mockScopesService.create.mockRejectedValue(error);

      await expect(resolver.createScope(createScopeInput)).rejects.toThrow(error);
    });

    it('should handle unique constraint violations', async () => {
      const error = new BadRequestException('Scope name already exists');
      mockScopesService.create.mockRejectedValue(error);

      await expect(resolver.createScope(createScopeInput)).rejects.toThrow(error);
    });

    it('should require authentication via RolesGuard', () => {
      const createMethod = Reflect.getMetadata('__guards__', resolver.createScope);
      expect(createMethod).toBeDefined();
    });
  });

  describe('getAllScopes', () => {
    it('should return all scopes', async () => {
      const mockScopesArray = [createMockScope()];
      mockScopesService.findAll.mockResolvedValue(mockScopesArray);

      const result = await resolver.getAllScopes();

      expect(mockScopesService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockScopesArray);
    });

    it('should return empty array when no scopes exist', async () => {
      mockScopesService.findAll.mockResolvedValue([]);

      const result = await resolver.getAllScopes();

      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection error');
      mockScopesService.findAll.mockRejectedValue(error);

      await expect(resolver.getAllScopes()).rejects.toThrow(error);
    });

    it('should return multiple scopes with different patterns', async () => {
      const mockScope = createMockScope();
      const multipleScopes = [
        { ...mockScope, id: '1', name: 'read:users' },
        { ...mockScope, id: '2', name: 'write:users' },
        { ...mockScope, id: '3', name: 'admin:users' },
        { ...mockScope, id: '4', name: 'openid' },
        { ...mockScope, id: '5', name: 'profile' },
      ];

      mockScopesService.findAll.mockResolvedValue(multipleScopes);

      const result = await resolver.getAllScopes();

      expect(result).toEqual(multipleScopes);
      expect(result).toHaveLength(5);
    });
  });

  describe('getScope', () => {
    it('should return scope by ID', async () => {
      const mockScope = createMockScope();
      mockScopesService.findOne.mockResolvedValue(mockScope);

      const result = await resolver.getScope('scope-uuid-1');

      expect(mockScopesService.findOne).toHaveBeenCalledWith('scope-uuid-1');
      expect(result).toEqual(mockScope);
    });

    it('should handle not found error', async () => {
      const error = new NotFoundException('Scope with ID non-existent-id not found');
      mockScopesService.findOne.mockRejectedValue(error);

      await expect(resolver.getScope('non-existent-id')).rejects.toThrow(error);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection error');
      mockScopesService.findOne.mockRejectedValue(error);

      await expect(resolver.getScope('scope-uuid-1')).rejects.toThrow(error);
    });

    it('should handle malformed UUID', async () => {
      const error = new Error('Invalid UUID format');
      mockScopesService.findOne.mockRejectedValue(error);

      await expect(resolver.getScope('invalid-uuid')).rejects.toThrow(error);
    });
  });

  describe('getScopeByName', () => {
    it('should return scope by name', async () => {
      const mockScope = createMockScope();
      mockScopesService.findByName.mockResolvedValue(mockScope);

      const result = await resolver.getScopeByName('read:users');

      expect(mockScopesService.findByName).toHaveBeenCalledWith('read:users');
      expect(result).toEqual(mockScope);
    });

    it('should handle not found error', async () => {
      const error = new NotFoundException('Scope with name non-existent-scope not found');
      mockScopesService.findByName.mockRejectedValue(error);

      await expect(resolver.getScopeByName('non-existent-scope')).rejects.toThrow(error);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection error');
      mockScopesService.findByName.mockRejectedValue(error);

      await expect(resolver.getScopeByName('read:users')).rejects.toThrow(error);
    });

    it('should be case sensitive', async () => {
      const error = new NotFoundException('Scope with name READ:USERS not found');
      mockScopesService.findByName.mockRejectedValue(error);

      await expect(resolver.getScopeByName('READ:USERS')).rejects.toThrow(error);
    });

    it('should handle special characters in scope names', async () => {
      const specialScope = { ...createMockScope(), name: 'api:v1.0:read-write' };
      mockScopesService.findByName.mockResolvedValue(specialScope);

      const result = await resolver.getScopeByName('api:v1.0:read-write');

      expect(result).toEqual(specialScope);
    });
  });

  describe('updateScope', () => {
    const updateScopeInput: UpdateScopeInput = {
      id: 'scope-uuid-1',
      name: 'read:admin',
      description: 'Read access to admin data',
    };

    it('should update a scope successfully', async () => {
      const mockScope = createMockScope();
      const updatedScope = { ...mockScope, ...updateScopeInput };
      mockScopesService.update.mockResolvedValue(updatedScope);

      const result = await resolver.updateScope(updateScopeInput);

      expect(mockScopesService.update).toHaveBeenCalledWith(updateScopeInput.id, updateScopeInput);
      expect(result).toEqual(updatedScope);
    });

    it('should handle partial updates', async () => {
      const mockScope = createMockScope();
      const partialUpdate: UpdateScopeInput = {
        id: 'scope-uuid-1',
        name: 'updated-name-only',
      };
      const partiallyUpdatedScope = { ...mockScope, name: 'updated-name-only' };

      mockScopesService.update.mockResolvedValue(partiallyUpdatedScope);

      const result = await resolver.updateScope(partialUpdate);

      expect(mockScopesService.update).toHaveBeenCalledWith(partialUpdate.id, partialUpdate);
      expect(result).toEqual(partiallyUpdatedScope);
    });

    it('should handle not found error', async () => {
      const error = new NotFoundException('Scope with ID non-existent-id not found');
      mockScopesService.update.mockRejectedValue(error);

      await expect(resolver.updateScope({ ...updateScopeInput, id: 'non-existent-id' })).rejects.toThrow(error);
    });

    it('should handle unique constraint violations', async () => {
      const error = new BadRequestException('Scope name already exists');
      mockScopesService.update.mockRejectedValue(error);

      await expect(resolver.updateScope(updateScopeInput)).rejects.toThrow(error);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection error');
      mockScopesService.update.mockRejectedValue(error);

      await expect(resolver.updateScope(updateScopeInput)).rejects.toThrow(error);
    });

    it('should handle empty string updates', async () => {
      const mockScope = createMockScope();
      const emptyUpdate: UpdateScopeInput = {
        id: 'scope-uuid-1',
        name: '',
        description: '',
      };
      const emptyUpdatedScope = { ...mockScope, name: '', description: '' };

      mockScopesService.update.mockResolvedValue(emptyUpdatedScope);

      const result = await resolver.updateScope(emptyUpdate);

      expect(result.name).toBe('');
      expect(result.description).toBe('');
    });
  });

  describe('removeScope', () => {
    it('should remove a scope successfully', async () => {
      const mockScope = createMockScope();
      mockScopesService.remove.mockResolvedValue(mockScope);

      const result = await resolver.removeScope('scope-uuid-1');

      expect(mockScopesService.remove).toHaveBeenCalledWith('scope-uuid-1');
      expect(result).toEqual(mockScope);
    });

    it('should handle not found error', async () => {
      const error = new NotFoundException('Scope with ID non-existent-id not found');
      mockScopesService.remove.mockRejectedValue(error);

      await expect(resolver.removeScope('non-existent-id')).rejects.toThrow(error);
    });

    it('should handle foreign key constraint violations', async () => {
      const error = new BadRequestException('Cannot delete scope: it is being used by active applications');
      mockScopesService.remove.mockRejectedValue(error);

      await expect(resolver.removeScope('scope-uuid-1')).rejects.toThrow(error);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection error');
      mockScopesService.remove.mockRejectedValue(error);

      await expect(resolver.removeScope('scope-uuid-1')).rejects.toThrow(error);
    });

    it('should return the removed scope data', async () => {
      const mockScope = createMockScope();
      mockScopesService.remove.mockResolvedValue(mockScope);

      const result = await resolver.removeScope('scope-uuid-1');

      expect(result.id).toBe('scope-uuid-1');
      expect(result.name).toBe('read:users');
      expect(result.description).toBe('Read access to user data');
    });
  });

  describe('Role-based access control', () => {
    beforeEach(() => {
      // Reset the mock to check for specific roles
      mockRolesGuard.canActivate.mockClear();
    });

    it('should allow only ADMIN role for createScope', () => {
      const roles = Reflect.getMetadata('roles', resolver.createScope);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should allow ADMIN and USER roles for getAllScopes', () => {
      const roles = Reflect.getMetadata('roles', resolver.getAllScopes);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow ADMIN and USER roles for getScope', () => {
      const roles = Reflect.getMetadata('roles', resolver.getScope);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow ADMIN and USER roles for getScopeByName', () => {
      const roles = Reflect.getMetadata('roles', resolver.getScopeByName);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow only ADMIN role for updateScope', () => {
      const roles = Reflect.getMetadata('roles', resolver.updateScope);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should allow only ADMIN role for removeScope', () => {
      const roles = Reflect.getMetadata('roles', resolver.removeScope);
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });

  describe('Input validation scenarios', () => {
    it('should handle very long scope names', async () => {
      const longName = 'a'.repeat(1000);
      const longNameInput: CreateScopeInput = {
        name: longName,
        description: 'Test description',
      };
      const longNameScope = { ...createMockScope(), name: longName };

      mockScopesService.create.mockResolvedValue(longNameScope);

      const result = await resolver.createScope(longNameInput);

      expect(result.name).toBe(longName);
    });

    it('should handle special characters in scope names', async () => {
      const specialNames = [
        'api:v1.0:read-write',
        'gateway.admin.full-access',
        'oauth2/scopes/user:profile',
        'urn:example:scope:read',
      ];

      for (const name of specialNames) {
        const input: CreateScopeInput = { name };
        const scope = { ...createMockScope(), name };

        mockScopesService.create.mockResolvedValue(scope);

        const result = await resolver.createScope(input);
        expect(result.name).toBe(name);

        jest.clearAllMocks();
      }
    });

    it('should handle empty descriptions gracefully', async () => {
      const input: CreateScopeInput = {
        name: 'test:scope',
        description: '',
      };
      const scope = { ...createMockScope(), name: 'test:scope', description: '' };

      mockScopesService.create.mockResolvedValue(scope);

      const result = await resolver.createScope(input);

      expect(result.description).toBe('');
    });

    it('should handle null descriptions gracefully', async () => {
      const input = {
        name: 'test:scope',
        description: null,
      } as any;
      const scope = { ...createMockScope(), name: 'test:scope', description: null };

      mockScopesService.create.mockResolvedValue(scope);

      const result = await resolver.createScope(input);

      expect(result.description).toBeNull();
    });
  });

  describe('OAuth2 scope patterns', () => {
    it('should handle standard OAuth2 scopes', async () => {
      const standardScopes = [
        'openid',
        'profile',
        'email',
        'address',
        'phone',
        'offline_access',
      ];

      for (const scopeName of standardScopes) {
        const input: CreateScopeInput = { name: scopeName };
        const scope = { ...createMockScope(), name: scopeName };

        mockScopesService.create.mockResolvedValue(scope);

        const result = await resolver.createScope(input);
        expect(result.name).toBe(scopeName);

        jest.clearAllMocks();
      }
    });

    it('should handle resource-based scopes', async () => {
      const resourceScopes = [
        'read:users',
        'write:users',
        'delete:users',
        'admin:users',
        'read:posts',
        'write:posts',
        'admin:posts',
      ];

      for (const scopeName of resourceScopes) {
        const input: CreateScopeInput = { name: scopeName };
        const scope = { ...createMockScope(), name: scopeName };

        mockScopesService.create.mockResolvedValue(scope);

        const result = await resolver.createScope(input);
        expect(result.name).toBe(scopeName);

        jest.clearAllMocks();
      }
    });
  });
});