import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UsersService } from '../../users/services/users.service';
import { User, UserRole } from '../../users/models/user.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let usersService: UsersService;

  const mockUser: User = {
    id: 'user-id-123',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const mockAdminUser: User = {
    id: 'admin-id-123',
    username: 'adminuser',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const createMockExecutionContext = (user: User | null): ExecutionContext => {
    const mockHandler = jest.fn();
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: () => mockHandler,
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', async () => {
      // Arrange
      const context = createMockExecutionContext(mockUser);
      jest.spyOn(reflector, 'get').mockReturnValue(null);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(reflector.get).toHaveBeenCalledWith('roles', context.getHandler());
      expect(usersService.findOne).not.toHaveBeenCalled();
    });

    it('should deny access when roles array is empty', async () => {
      // Arrange
      // Based on the implementation, empty array will proceed with the guard logic
      // and since no roles match, it should return false
      const context = createMockExecutionContext(mockUser);
      jest.spyOn(reflector, 'get').mockReturnValue([]);
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false); // No roles means no permission
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should allow access when user has required role', async () => {
      // Arrange
      const context = createMockExecutionContext(mockAdminUser);
      const requiredRoles = [UserRole.ADMIN];

      jest.spyOn(reflector, 'get').mockReturnValue(requiredRoles);
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockAdminUser);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(reflector.get).toHaveBeenCalledWith('roles', context.getHandler());
      expect(usersService.findOne).toHaveBeenCalledWith(mockAdminUser.id);
    });

    it('should deny access when user does not have required role', async () => {
      // Arrange
      const context = createMockExecutionContext(mockUser);
      const requiredRoles = [UserRole.ADMIN];

      jest.spyOn(reflector, 'get').mockReturnValue(requiredRoles);
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should allow access when user has one of multiple required roles', async () => {
      // Arrange
      const context = createMockExecutionContext(mockUser);
      const requiredRoles = [UserRole.ADMIN, UserRole.USER];

      jest.spyOn(reflector, 'get').mockReturnValue(requiredRoles);
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw error when user from request is null', async () => {
      // Arrange
      const context = createMockExecutionContext(null);
      const requiredRoles = [UserRole.USER];

      jest.spyOn(reflector, 'get').mockReturnValue(requiredRoles);

      // Act & Assert
      try {
        await guard.canActivate(context);
        fail('Expected TypeError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toContain('Cannot read properties of null');
      }
    });

    it('should handle null user from usersService', async () => {
      // Arrange
      const context = createMockExecutionContext(mockUser);
      const requiredRoles = [UserRole.USER];

      jest.spyOn(reflector, 'get').mockReturnValue(requiredRoles);
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(TypeError);
    });

    it('should handle case where user from request has no role', async () => {
      // Arrange
      const userWithoutRole = { ...mockUser };
      delete userWithoutRole.role;

      const context = createMockExecutionContext(userWithoutRole);
      const requiredRoles = [UserRole.USER];

      jest.spyOn(reflector, 'get').mockReturnValue(requiredRoles);
      jest.spyOn(usersService, 'findOne').mockResolvedValue(userWithoutRole);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle errors from usersService gracefully', async () => {
      // Arrange
      const context = createMockExecutionContext(mockUser);
      const requiredRoles = [UserRole.USER];

      jest.spyOn(reflector, 'get').mockReturnValue(requiredRoles);
      jest.spyOn(usersService, 'findOne').mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Database error');
    });
  });

  describe('guard initialization', () => {
    it('should be defined with all dependencies', () => {
      expect(guard).toBeDefined();
      expect(reflector).toBeDefined();
      expect(usersService).toBeDefined();
    });

    it('should inject required dependencies', () => {
      expect(guard['reflector']).toBe(reflector);
      expect(guard['usersService']).toBe(usersService);
    });
  });
});