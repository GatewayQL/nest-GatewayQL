import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { AppsResolver } from './apps.resolver';
import { AppsService } from '../services/apps.service';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AppEntity } from '../models/app.entity';
import { CreateAppInput } from '../dto/create-app.input';
import { UpdateAppInput } from '../dto/update-app.input';
import { UserEntity } from '../../users/models/user.entity';
import { UserRole } from '../../users/models/user.interface';
import { NotFoundException } from '@nestjs/common';

describe('AppsResolver', () => {
  let resolver: AppsResolver;
  let appsService: AppsService;

  const mockUser = new UserEntity();
  mockUser.id = 'user-uuid-1';
  mockUser.username = 'testuser';
  mockUser.email = 'test@example.com';
  mockUser.role = UserRole.USER;

  const createMockApp = () => {
    const mockApp = new AppEntity();
    mockApp.id = 'app-uuid-1';
    mockApp.name = 'Test App';
    mockApp.description = 'Test description';
    mockApp.redirectUri = 'https://example.com/callback';
    mockApp.isActive = true;
    mockApp.userId = 'user-uuid-1';
    mockApp.user = mockUser;
    mockApp.createdAt = 1234567890;
    mockApp.updatedAt = 1234567890;
    return mockApp;
  };

  const mockAppsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByUserId: jest.fn(),
    findByName: jest.fn(),
    findByNameAndUserId: jest.fn(),
    findActiveApps: jest.fn(),
    findInactiveApps: jest.fn(),
    update: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
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
        AppsResolver,
        {
          provide: AppsService,
          useValue: mockAppsService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    resolver = module.get<AppsResolver>(AppsResolver);
    appsService = module.get<AppsService>(AppsService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createApp', () => {
    const createAppInput: CreateAppInput = {
      name: 'Test App',
      description: 'Test description',
      redirectUri: 'https://example.com/callback',
      userId: 'user-uuid-1',
      isActive: true,
    };

    it('should create an app successfully', async () => {
      const mockApp = createMockApp();
      mockAppsService.create.mockResolvedValue(mockApp);

      const result = await resolver.createApp(createAppInput);

      expect(mockAppsService.create).toHaveBeenCalledWith(createAppInput);
      expect(result).toEqual(mockApp);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.create.mockRejectedValue(error);

      await expect(resolver.createApp(createAppInput)).rejects.toThrow(error);
    });

    it('should require authentication via RolesGuard', () => {
      const createMethod = Reflect.getMetadata('__guards__', resolver.createApp);
      expect(createMethod).toBeDefined();
    });
  });

  describe('getAllApps', () => {
    it('should return all apps', async () => {
      const mockAppsArray = [createMockApp()];
      mockAppsService.findAll.mockResolvedValue(mockAppsArray);

      const result = await resolver.getAllApps();

      expect(mockAppsService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockAppsArray);
    });

    it('should return empty array when no apps exist', async () => {
      mockAppsService.findAll.mockResolvedValue([]);

      const result = await resolver.getAllApps();

      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.findAll.mockRejectedValue(error);

      await expect(resolver.getAllApps()).rejects.toThrow(error);
    });
  });

  describe('getApp', () => {
    it('should return app by ID', async () => {
      const mockApp = createMockApp();
      mockAppsService.findOne.mockResolvedValue(mockApp);

      const result = await resolver.getApp('app-uuid-1');

      expect(mockAppsService.findOne).toHaveBeenCalledWith('app-uuid-1');
      expect(result).toEqual(mockApp);
    });

    it('should handle not found error', async () => {
      const error = new NotFoundException('App with ID non-existent-id not found');
      mockAppsService.findOne.mockRejectedValue(error);

      await expect(resolver.getApp('non-existent-id')).rejects.toThrow(error);
    });
  });

  describe('getAppsByUserId', () => {
    it('should return apps for specific user', async () => {
      const mockAppsArray = [createMockApp()];
      mockAppsService.findByUserId.mockResolvedValue(mockAppsArray);

      const result = await resolver.getAppsByUserId('user-uuid-1');

      expect(mockAppsService.findByUserId).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toEqual(mockAppsArray);
    });

    it('should return empty array when user has no apps', async () => {
      mockAppsService.findByUserId.mockResolvedValue([]);

      const result = await resolver.getAppsByUserId('user-uuid-1');

      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.findByUserId.mockRejectedValue(error);

      await expect(resolver.getAppsByUserId('user-uuid-1')).rejects.toThrow(error);
    });
  });

  describe('getAppByName', () => {
    it('should return app by name', async () => {
      const mockApp = createMockApp();
      mockAppsService.findByName.mockResolvedValue(mockApp);

      const result = await resolver.getAppByName('Test App');

      expect(mockAppsService.findByName).toHaveBeenCalledWith('Test App');
      expect(result).toEqual(mockApp);
    });

    it('should return null when app not found', async () => {
      mockAppsService.findByName.mockResolvedValue(null);

      const result = await resolver.getAppByName('Non-existent App');

      expect(result).toBeNull();
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.findByName.mockRejectedValue(error);

      await expect(resolver.getAppByName('Test App')).rejects.toThrow(error);
    });
  });

  describe('getAppByNameAndUserId', () => {
    it('should return app by name and user ID', async () => {
      const mockApp = createMockApp();
      mockAppsService.findByNameAndUserId.mockResolvedValue(mockApp);

      const result = await resolver.getAppByNameAndUserId('Test App', 'user-uuid-1');

      expect(mockAppsService.findByNameAndUserId).toHaveBeenCalledWith('Test App', 'user-uuid-1');
      expect(result).toEqual(mockApp);
    });

    it('should return null when app not found', async () => {
      mockAppsService.findByNameAndUserId.mockResolvedValue(null);

      const result = await resolver.getAppByNameAndUserId('Test App', 'other-user-id');

      expect(result).toBeNull();
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.findByNameAndUserId.mockRejectedValue(error);

      await expect(resolver.getAppByNameAndUserId('Test App', 'user-uuid-1')).rejects.toThrow(error);
    });
  });

  describe('getActiveApps', () => {
    it('should return only active apps', async () => {
      const activeApp = { ...createMockApp(), isActive: true };
      mockAppsService.findActiveApps.mockResolvedValue([activeApp]);

      const result = await resolver.getActiveApps();

      expect(mockAppsService.findActiveApps).toHaveBeenCalled();
      expect(result).toEqual([activeApp]);
    });

    it('should return empty array when no active apps exist', async () => {
      mockAppsService.findActiveApps.mockResolvedValue([]);

      const result = await resolver.getActiveApps();

      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.findActiveApps.mockRejectedValue(error);

      await expect(resolver.getActiveApps()).rejects.toThrow(error);
    });
  });

  describe('getInactiveApps', () => {
    it('should return only inactive apps', async () => {
      const inactiveApp = { ...createMockApp(), isActive: false };
      mockAppsService.findInactiveApps.mockResolvedValue([inactiveApp]);

      const result = await resolver.getInactiveApps();

      expect(mockAppsService.findInactiveApps).toHaveBeenCalled();
      expect(result).toEqual([inactiveApp]);
    });

    it('should return empty array when no inactive apps exist', async () => {
      mockAppsService.findInactiveApps.mockResolvedValue([]);

      const result = await resolver.getInactiveApps();

      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.findInactiveApps.mockRejectedValue(error);

      await expect(resolver.getInactiveApps()).rejects.toThrow(error);
    });
  });

  describe('updateApp', () => {
    const updateAppInput: UpdateAppInput = {
      id: 'app-uuid-1',
      name: 'Updated App',
      description: 'Updated description',
      redirectUri: 'https://updated.com/callback',
      isActive: false,
    };

    it('should update an app successfully', async () => {
      const mockApp = createMockApp();
      const updatedApp = { ...mockApp, ...updateAppInput };
      mockAppsService.update.mockResolvedValue(updatedApp);

      const result = await resolver.updateApp(updateAppInput);

      expect(mockAppsService.update).toHaveBeenCalledWith(updateAppInput.id, updateAppInput);
      expect(result).toEqual(updatedApp);
    });

    it('should handle not found error', async () => {
      const error = new NotFoundException('App with ID non-existent-id not found');
      mockAppsService.update.mockRejectedValue(error);

      await expect(resolver.updateApp({ ...updateAppInput, id: 'non-existent-id' })).rejects.toThrow(error);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.update.mockRejectedValue(error);

      await expect(resolver.updateApp(updateAppInput)).rejects.toThrow(error);
    });
  });

  describe('activateApp', () => {
    it('should activate an app successfully', async () => {
      const mockApp = createMockApp();
      const activatedApp = { ...mockApp, isActive: true };
      mockAppsService.activate.mockResolvedValue(activatedApp);

      const result = await resolver.activateApp('app-uuid-1');

      expect(mockAppsService.activate).toHaveBeenCalledWith('app-uuid-1');
      expect(result).toEqual(activatedApp);
    });

    it('should handle not found error', async () => {
      const error = new NotFoundException('App with ID non-existent-id not found');
      mockAppsService.activate.mockRejectedValue(error);

      await expect(resolver.activateApp('non-existent-id')).rejects.toThrow(error);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.activate.mockRejectedValue(error);

      await expect(resolver.activateApp('app-uuid-1')).rejects.toThrow(error);
    });
  });

  describe('deactivateApp', () => {
    it('should deactivate an app successfully', async () => {
      const mockApp = createMockApp();
      const deactivatedApp = { ...mockApp, isActive: false };
      mockAppsService.deactivate.mockResolvedValue(deactivatedApp);

      const result = await resolver.deactivateApp('app-uuid-1');

      expect(mockAppsService.deactivate).toHaveBeenCalledWith('app-uuid-1');
      expect(result).toEqual(deactivatedApp);
    });

    it('should handle not found error', async () => {
      const error = new NotFoundException('App with ID non-existent-id not found');
      mockAppsService.deactivate.mockRejectedValue(error);

      await expect(resolver.deactivateApp('non-existent-id')).rejects.toThrow(error);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.deactivate.mockRejectedValue(error);

      await expect(resolver.deactivateApp('app-uuid-1')).rejects.toThrow(error);
    });
  });

  describe('removeApp', () => {
    it('should remove an app successfully', async () => {
      const mockApp = createMockApp();
      mockAppsService.remove.mockResolvedValue(mockApp);

      const result = await resolver.removeApp('app-uuid-1');

      expect(mockAppsService.remove).toHaveBeenCalledWith('app-uuid-1');
      expect(result).toEqual(mockApp);
    });

    it('should handle not found error', async () => {
      const error = new NotFoundException('App with ID non-existent-id not found');
      mockAppsService.remove.mockRejectedValue(error);

      await expect(resolver.removeApp('non-existent-id')).rejects.toThrow(error);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAppsService.remove.mockRejectedValue(error);

      await expect(resolver.removeApp('app-uuid-1')).rejects.toThrow(error);
    });
  });

  describe('Role-based access control', () => {
    beforeEach(() => {
      // Reset the mock to check for specific roles
      mockRolesGuard.canActivate.mockClear();
    });

    it('should allow ADMIN and USER roles for createApp', () => {
      const roles = Reflect.getMetadata('roles', resolver.createApp);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow only ADMIN role for getAllApps', () => {
      const roles = Reflect.getMetadata('roles', resolver.getAllApps);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should allow ADMIN and USER roles for getApp', () => {
      const roles = Reflect.getMetadata('roles', resolver.getApp);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow ADMIN and USER roles for getAppsByUserId', () => {
      const roles = Reflect.getMetadata('roles', resolver.getAppsByUserId);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow ADMIN and USER roles for getAppByName', () => {
      const roles = Reflect.getMetadata('roles', resolver.getAppByName);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow ADMIN and USER roles for getAppByNameAndUserId', () => {
      const roles = Reflect.getMetadata('roles', resolver.getAppByNameAndUserId);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow only ADMIN role for getActiveApps', () => {
      const roles = Reflect.getMetadata('roles', resolver.getActiveApps);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should allow only ADMIN role for getInactiveApps', () => {
      const roles = Reflect.getMetadata('roles', resolver.getInactiveApps);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should allow ADMIN and USER roles for updateApp', () => {
      const roles = Reflect.getMetadata('roles', resolver.updateApp);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow ADMIN and USER roles for activateApp', () => {
      const roles = Reflect.getMetadata('roles', resolver.activateApp);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow ADMIN and USER roles for deactivateApp', () => {
      const roles = Reflect.getMetadata('roles', resolver.deactivateApp);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow only ADMIN role for removeApp', () => {
      const roles = Reflect.getMetadata('roles', resolver.removeApp);
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });

  describe('Express Gateway style consumer management', () => {
    it('should support creating apps for human consumers (Users)', async () => {
      const userAppInput: CreateAppInput = {
        name: 'User Mobile App',
        description: 'Mobile app for regular users',
        redirectUri: 'myapp://callback',
        userId: 'user-uuid-1',
        isActive: true,
      };

      const userApp = { ...createMockApp(), ...userAppInput };
      mockAppsService.create.mockResolvedValue(userApp);

      const result = await resolver.createApp(userAppInput);

      expect(result.name).toBe('User Mobile App');
      expect(result.user).toEqual(mockUser);
      expect(result.isActive).toBe(true);
    });

    it('should support creating apps for non-human consumers (Service Apps)', async () => {
      const serviceAppInput: CreateAppInput = {
        name: 'Payment Service',
        description: 'Backend service for payment processing',
        redirectUri: 'https://payment-service.com/oauth/callback',
        userId: 'service-user-uuid',
        isActive: true,
      };

      const serviceApp = { ...createMockApp(), ...serviceAppInput };
      mockAppsService.create.mockResolvedValue(serviceApp);

      const result = await resolver.createApp(serviceAppInput);

      expect(result.name).toBe('Payment Service');
      expect(result.description).toBe('Backend service for payment processing');
    });

    it('should support app lifecycle management (activate/deactivate)', async () => {
      const mockApp = createMockApp();

      // Test activation
      mockAppsService.activate.mockResolvedValue({ ...mockApp, isActive: true });
      const activatedResult = await resolver.activateApp('app-uuid-1');
      expect(activatedResult.isActive).toBe(true);

      // Test deactivation
      mockAppsService.deactivate.mockResolvedValue({ ...mockApp, isActive: false });
      const deactivatedResult = await resolver.deactivateApp('app-uuid-1');
      expect(deactivatedResult.isActive).toBe(false);
    });

    it('should support filtering apps by status', async () => {
      const activeApp = { ...createMockApp(), isActive: true };
      const inactiveApp = { ...createMockApp(), isActive: false, id: 'app-uuid-2' };

      // Test active apps filtering
      mockAppsService.findActiveApps.mockResolvedValue([activeApp]);
      const activeApps = await resolver.getActiveApps();
      expect(activeApps).toHaveLength(1);
      expect(activeApps[0].isActive).toBe(true);

      // Test inactive apps filtering
      mockAppsService.findInactiveApps.mockResolvedValue([inactiveApp]);
      const inactiveApps = await resolver.getInactiveApps();
      expect(inactiveApps).toHaveLength(1);
      expect(inactiveApps[0].isActive).toBe(false);
    });

    it('should support user-scoped app queries', async () => {
      const userApps = [createMockApp()];
      mockAppsService.findByUserId.mockResolvedValue(userApps);

      const result = await resolver.getAppsByUserId('user-uuid-1');

      expect(result).toEqual(userApps);
      expect(mockAppsService.findByUserId).toHaveBeenCalledWith('user-uuid-1');
    });
  });
});