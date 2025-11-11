import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppEntity } from '../models/app.entity';
import { AppsService } from './apps.service';
import { CreateAppInput } from '../dto/create-app.input';
import { UpdateAppInput } from '../dto/update-app.input';
import { UserEntity } from '../../users/models/user.entity';
import { UserRole } from '../../users/models/user.interface';

describe('AppsService', () => {
  let service: AppsService;
  let repository: Repository<AppEntity>;

  const mockUser = new UserEntity();
  mockUser.id = 'user-uuid-1';
  mockUser.username = 'testuser';
  mockUser.email = 'test@example.com';
  mockUser.role = UserRole.USER;

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

  const mockAppArray = [mockApp];

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
        AppsService,
        {
          provide: getRepositoryToken(AppEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AppsService>(AppsService);
    repository = module.get<Repository<AppEntity>>(getRepositoryToken(AppEntity));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createAppInput: CreateAppInput = {
      name: 'Test App',
      description: 'Test description',
      redirectUri: 'https://example.com/callback',
      userId: 'user-uuid-1',
      isActive: true,
    };

    it('should successfully create an app', async () => {
      mockRepository.create.mockReturnValue(mockApp);
      mockRepository.save.mockResolvedValue(mockApp);

      const result = await service.create(createAppInput);

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: createAppInput.name,
        description: createAppInput.description,
        redirectUri: createAppInput.redirectUri,
        isActive: createAppInput.isActive,
        user: { id: createAppInput.userId },
      }));
      expect(mockRepository.save).toHaveBeenCalledWith(mockApp);
      expect(result).toEqual(mockApp);
    });

    it('should create app with default isActive true when not provided', async () => {
      const inputWithoutIsActive = { ...createAppInput };
      delete inputWithoutIsActive.isActive;

      mockRepository.create.mockReturnValue(mockApp);
      mockRepository.save.mockResolvedValue(mockApp);

      await service.create(inputWithoutIsActive);

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        isActive: true,
      }));
    });

    it('should throw BadRequestException when save fails', async () => {
      const error = new Error('Database error');
      mockRepository.create.mockReturnValue(mockApp);
      mockRepository.save.mockRejectedValue(error);

      await expect(service.create(createAppInput)).rejects.toThrow(
        new BadRequestException('Cannot create app in database. Error: Database error'),
      );
    });
  });

  describe('findAll', () => {
    it('should return array of apps with user relations', async () => {
      mockRepository.find.mockResolvedValue(mockAppArray);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ['user'],
      });
      expect(result).toEqual(mockAppArray);
    });

    it('should return empty array when no apps exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return app when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockApp);

      const result = await service.findOne('app-uuid-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-uuid-1' },
        relations: ['user'],
      });
      expect(result).toEqual(mockApp);
    });

    it('should throw NotFoundException when app not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('App with ID non-existent-id not found'),
      );
    });
  });

  describe('findByUserId', () => {
    it('should return apps for specific user', async () => {
      mockRepository.find.mockResolvedValue(mockAppArray);

      const result = await service.findByUserId('user-uuid-1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-uuid-1' } },
        relations: ['user'],
      });
      expect(result).toEqual(mockAppArray);
    });

    it('should return empty array when user has no apps', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByUserId('user-uuid-1');

      expect(result).toEqual([]);
    });
  });

  describe('findByName', () => {
    it('should return app when found by name', async () => {
      mockRepository.findOne.mockResolvedValue(mockApp);

      const result = await service.findByName('Test App');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Test App' },
        relations: ['user'],
      });
      expect(result).toEqual(mockApp);
    });

    it('should return null when app not found by name', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByName('Non-existent App');

      expect(result).toBeNull();
    });
  });

  describe('findByNameAndUserId', () => {
    it('should return app when found by name and user ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockApp);

      const result = await service.findByNameAndUserId('Test App', 'user-uuid-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Test App', user: { id: 'user-uuid-1' } },
        relations: ['user'],
      });
      expect(result).toEqual(mockApp);
    });

    it('should return null when app not found by name and user ID', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByNameAndUserId('Test App', 'other-user-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateAppInput: UpdateAppInput = {
      id: 'app-uuid-1',
      name: 'Updated App',
      description: 'Updated description',
      redirectUri: 'https://updated.com/callback',
      isActive: false,
    };

    it('should successfully update an app', async () => {
      const updatedApp = { ...mockApp, ...updateAppInput };
      mockRepository.findOne.mockResolvedValue(mockApp);
      mockRepository.save.mockResolvedValue(updatedApp);

      const result = await service.update('app-uuid-1', updateAppInput);

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        name: updateAppInput.name,
        description: updateAppInput.description,
        redirectUri: updateAppInput.redirectUri,
        isActive: updateAppInput.isActive,
      }));
      expect(result).toEqual(updatedApp);
    });

    it('should update only provided fields', async () => {
      const partialUpdate: UpdateAppInput = {
        id: 'app-uuid-1',
        name: 'Updated Name Only',
      };

      mockRepository.findOne.mockResolvedValue(mockApp);
      mockRepository.save.mockResolvedValue({ ...mockApp, name: 'Updated Name Only' });

      await service.update('app-uuid-1', partialUpdate);

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name Only',
        description: mockApp.description, // Should remain unchanged
        redirectUri: mockApp.redirectUri, // Should remain unchanged
      }));
    });

    it('should throw NotFoundException when app not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateAppInput)).rejects.toThrow(
        new NotFoundException('App with ID non-existent-id not found'),
      );
    });

    it('should throw BadRequestException when save fails', async () => {
      const error = new Error('Database error');
      mockRepository.findOne.mockResolvedValue(mockApp);
      mockRepository.save.mockRejectedValue(error);

      await expect(service.update('app-uuid-1', updateAppInput)).rejects.toThrow(
        new BadRequestException('Cannot update app in database. Error: Database error'),
      );
    });
  });

  describe('activate', () => {
    it('should activate an app', async () => {
      const activatedApp = { ...mockApp, isActive: true };
      mockRepository.findOne.mockResolvedValue(mockApp);
      mockRepository.save.mockResolvedValue(activatedApp);

      const result = await service.activate('app-uuid-1');

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        isActive: true,
      }));
      expect(result).toEqual(activatedApp);
    });

    it('should throw NotFoundException when app not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.activate('non-existent-id')).rejects.toThrow(
        new NotFoundException('App with ID non-existent-id not found'),
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate an app', async () => {
      const deactivatedApp = { ...mockApp, isActive: false };
      mockRepository.findOne.mockResolvedValue(mockApp);
      mockRepository.save.mockResolvedValue(deactivatedApp);

      const result = await service.deactivate('app-uuid-1');

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        isActive: false,
      }));
      expect(result).toEqual(deactivatedApp);
    });

    it('should throw NotFoundException when app not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivate('non-existent-id')).rejects.toThrow(
        new NotFoundException('App with ID non-existent-id not found'),
      );
    });
  });

  describe('remove', () => {
    it('should successfully delete an app', async () => {
      mockRepository.findOne.mockResolvedValue(mockApp);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove('app-uuid-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('app-uuid-1');
      expect(result).toEqual(mockApp);
    });

    it('should throw NotFoundException when app not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException('App with ID non-existent-id not found'),
      );
    });

    it('should throw BadRequestException when delete fails', async () => {
      const error = new Error('Database error');
      mockRepository.findOne.mockResolvedValue(mockApp);
      mockRepository.delete.mockRejectedValue(error);

      await expect(service.remove('app-uuid-1')).rejects.toThrow(
        new BadRequestException('Cannot delete app from database. Error: Database error'),
      );
    });
  });

  describe('findActiveApps', () => {
    it('should return only active apps', async () => {
      const activeApp = { ...mockApp, isActive: true };
      mockRepository.find.mockResolvedValue([activeApp]);

      const result = await service.findActiveApps();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['user'],
      });
      expect(result).toEqual([activeApp]);
    });

    it('should return empty array when no active apps exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findActiveApps();

      expect(result).toEqual([]);
    });
  });

  describe('findInactiveApps', () => {
    it('should return only inactive apps', async () => {
      const inactiveApp = { ...mockApp, isActive: false };
      mockRepository.find.mockResolvedValue([inactiveApp]);

      const result = await service.findInactiveApps();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isActive: false },
        relations: ['user'],
      });
      expect(result).toEqual([inactiveApp]);
    });

    it('should return empty array when no inactive apps exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findInactiveApps();

      expect(result).toEqual([]);
    });
  });
});