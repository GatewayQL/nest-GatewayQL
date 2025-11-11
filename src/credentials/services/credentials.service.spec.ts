import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import { CredentialsService } from './credentials.service';
import { CredentialEntity } from '../models/credential.entity';
import {
  CredentialType,
  ConsumerType,
  Credential
} from '../models/credential.interface';
import { CreateCredentialInput } from '../dto/create-credential.input';
import { UpdateCredentialInput } from '../dto/update-credential.input';
import { AuthService } from '../../auth/services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { AppsService } from '../../apps/services/apps.service';
import { UserEntity } from '../../users/models/user.entity';
import { AppEntity } from '../../apps/models/app.entity';

describe('CredentialsService', () => {
  let service: CredentialsService;
  let repository: Repository<CredentialEntity>;
  let authService: AuthService;
  let usersService: UsersService;
  let appsService: AppsService;

  // Mock data
  const mockUser = {
    id: 'user-1',
    username: 'john.doe',
    email: 'john.doe@test.com',
    firstname: 'John',
    lastname: 'Doe',
  };

  const mockApp = {
    id: 'app-1',
    name: 'test-app',
    description: 'Test Application',
    isActive: true,
    user: mockUser,
  };

  const createBasicCredentialMock = (overrides = {}): CredentialEntity => {
    const credential = new CredentialEntity();
    credential.id = 'cred-1';
    credential.consumerId = 'john.doe';
    credential.consumerType = ConsumerType.USER;
    credential.type = CredentialType.BASIC;
    credential.scope = 'admin';
    credential.isActive = true;
    credential.password = 'plaintext';
    credential.passwordHash = 'hashed-password';
    credential.createdAt = Date.now();
    credential.updatedAt = Date.now();
    return Object.assign(credential, overrides);
  };

  const createKeyCredentialMock = (overrides = {}): CredentialEntity => {
    const credential = new CredentialEntity();
    credential.id = 'cred-2';
    credential.consumerId = 'john.doe';
    credential.consumerType = ConsumerType.USER;
    credential.type = CredentialType.KEY;
    credential.scope = 'admin';
    credential.isActive = true;
    credential.keyId = 'key-123';
    credential.keySecret = 'hashed-key-secret';
    credential.createdAt = Date.now();
    credential.updatedAt = Date.now();
    return Object.assign(credential, overrides);
  };

  const createOAuth2CredentialMock = (overrides = {}): CredentialEntity => {
    const credential = new CredentialEntity();
    credential.id = 'cred-3';
    credential.consumerId = 'john.doe';
    credential.consumerType = ConsumerType.USER;
    credential.type = CredentialType.OAUTH2;
    credential.scope = 'admin';
    credential.isActive = true;
    credential.secret = 'hashed-oauth-secret';
    credential.createdAt = Date.now();
    credential.updatedAt = Date.now();
    return Object.assign(credential, overrides);
  };

  const createJWTCredentialMock = (overrides = {}): CredentialEntity => {
    const credential = new CredentialEntity();
    credential.id = 'cred-4';
    credential.consumerId = 'john.doe';
    credential.consumerType = ConsumerType.USER;
    credential.type = CredentialType.JWT;
    credential.scope = 'admin';
    credential.isActive = true;
    credential.secret = 'hashed-jwt-secret';
    credential.createdAt = Date.now();
    credential.updatedAt = Date.now();
    return Object.assign(credential, overrides);
  };

  const createAppCredentialMock = (overrides = {}): CredentialEntity => {
    const credential = new CredentialEntity();
    credential.id = 'cred-5';
    credential.consumerId = 'test-app';
    credential.consumerType = ConsumerType.APP;
    credential.app = mockApp as AppEntity;
    credential.type = CredentialType.KEY;
    credential.scope = 'api:read';
    credential.isActive = true;
    credential.keyId = 'app-key-123';
    credential.keySecret = 'hashed-app-key-secret';
    credential.createdAt = Date.now();
    credential.updatedAt = Date.now();
    return Object.assign(credential, overrides);
  };

  // Mock repository
  const mockRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  // Mock auth service
  const mockAuthService = {
    saltAndHash: jest.fn(),
    compareSaltAndHashed: jest.fn(),
    generateJWT: jest.fn(),
  };

  // Mock users service
  const mockUsersService = {
    findByUsername: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  // Mock apps service
  const mockAppsService = {
    findOne: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        {
          provide: getRepositoryToken(CredentialEntity),
          useValue: mockRepository,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AppsService,
          useValue: mockAppsService,
        },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
    repository = module.get<Repository<CredentialEntity>>(
      getRepositoryToken(CredentialEntity),
    );
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    appsService = module.get<AppsService>(AppsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject all dependencies', () => {
      expect(repository).toBeDefined();
      expect(authService).toBeDefined();
      expect(usersService).toBeDefined();
      expect(appsService).toBeDefined();
    });
  });

  describe('create', () => {
    describe('BASIC Authentication', () => {
      it('should create basic auth credential for user', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'john.doe',
          consumerType: ConsumerType.USER,
          type: CredentialType.BASIC,
          secret: 'password123',
          scope: 'admin',
        };

        const hashedPassword = 'hashed-password';
        const savedCredential = createBasicCredentialMock();

        mockUsersService.findByUsername.mockResolvedValue(mockUser);
        mockRepository.findOneBy.mockResolvedValue(null); // No existing credential
        mockAuthService.saltAndHash.mockReturnValue(of(hashedPassword));
        mockRepository.save.mockResolvedValue(savedCredential);

        service.create(input).subscribe({
          next: (result) => {
            expect(result).toBeDefined();
            expect(result.consumerId).toBe(input.consumerId);
            expect(result.type).toBe(CredentialType.BASIC);
            expect(result.isActive).toBe(true);
            expect(result.password).toBeUndefined(); // Should be stripped
            expect(result.passwordHash).toBeUndefined(); // Should be stripped
            expect(mockAuthService.saltAndHash).toHaveBeenCalledWith(input.secret);
            done();
          },
          error: done,
        });
      });

      it('should fail when user does not exist', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'nonexistent.user',
          consumerType: ConsumerType.USER,
          type: CredentialType.BASIC,
          secret: 'password123',
          scope: 'admin',
        };

        mockUsersService.findByUsername.mockResolvedValue(null);

        service.create(input).subscribe({
          next: () => done(new Error('Should not succeed')),
          error: (error) => {
            expect(error.message).toContain('does not exists');
            done();
          },
        });
      });

      it('should fail when credential already exists and is active', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'john.doe',
          consumerType: ConsumerType.USER,
          type: CredentialType.BASIC,
          secret: 'password123',
          scope: 'admin',
        };

        const existingCredential = createBasicCredentialMock();

        mockUsersService.findByUsername.mockResolvedValue(mockUser);
        mockRepository.findOneBy.mockResolvedValue(existingCredential);

        service.create(input).subscribe({
          next: () => done(new Error('Should not succeed')),
          error: (error) => {
            expect(error.message).toContain('already exists and is active');
            done();
          },
        });
      });
    });

    describe('KEY Authentication', () => {
      it('should create key auth credential for user', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'john.doe',
          consumerType: ConsumerType.USER,
          type: CredentialType.KEY,
          secret: 'api-key-secret',
          scope: 'api:read',
        };

        const hashedSecret = 'hashed-key-secret';
        const savedCredential = createKeyCredentialMock();

        mockUsersService.findByUsername.mockResolvedValue(mockUser);
        mockRepository.findOneBy.mockResolvedValue(null);
        mockAuthService.saltAndHash.mockReturnValue(of(hashedSecret));
        mockRepository.save.mockResolvedValue(savedCredential);

        service.create(input).subscribe({
          next: (result) => {
            expect(result).toBeDefined();
            expect(result.type).toBe(CredentialType.KEY);
            expect(result.keyId).toBeDefined();
            expect(result.keySecret).toBeUndefined(); // Should be stripped
            done();
          },
          error: done,
        });
      });

      it('should create key auth credential for app (note: current service only checks user)', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'test-app',
          consumerType: ConsumerType.APP,
          appId: 'app-1',
          type: CredentialType.KEY,
          secret: 'app-api-key',
          scope: 'api:read',
        };

        // For now, the service still checks user existence for app consumers
        // This is a limitation that needs to be addressed in the service
        mockUsersService.findByUsername.mockResolvedValue(null);

        service.create(input).subscribe({
          next: () => done(new Error('Should not succeed')),
          error: (error) => {
            expect(error.message).toContain('does not exists');
            done();
          },
        });
      });
    });

    describe('OAUTH2 Authentication', () => {
      it('should create oauth2 credential', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'john.doe',
          consumerType: ConsumerType.USER,
          type: CredentialType.OAUTH2,
          secret: 'oauth2-client-secret',
          scope: 'api:write',
        };

        const hashedSecret = 'hashed-oauth-secret';
        const savedCredential = createOAuth2CredentialMock();

        mockUsersService.findByUsername.mockResolvedValue(mockUser);
        mockRepository.findOneBy.mockResolvedValue(null);
        mockAuthService.saltAndHash.mockReturnValue(of(hashedSecret));
        mockRepository.save.mockResolvedValue(savedCredential);

        service.create(input).subscribe({
          next: (result) => {
            expect(result).toBeDefined();
            expect(result.type).toBe(CredentialType.OAUTH2);
            expect(result.secret).toBeUndefined(); // Should be stripped
            done();
          },
          error: done,
        });
      });
    });

    describe('JWT Authentication', () => {
      it('should create jwt credential', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'john.doe',
          consumerType: ConsumerType.USER,
          type: CredentialType.JWT,
          secret: 'jwt-secret-key',
          scope: 'api:admin',
        };

        const hashedSecret = 'hashed-jwt-secret';
        const savedCredential = createJWTCredentialMock();

        mockUsersService.findByUsername.mockResolvedValue(mockUser);
        mockRepository.findOneBy.mockResolvedValue(null);
        mockAuthService.saltAndHash.mockReturnValue(of(hashedSecret));
        mockRepository.save.mockResolvedValue(savedCredential);

        service.create(input).subscribe({
          next: (result) => {
            expect(result).toBeDefined();
            expect(result.type).toBe(CredentialType.JWT);
            expect(result.secret).toBeUndefined(); // Should be stripped
            done();
          },
          error: done,
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle auth service errors', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'john.doe',
          consumerType: ConsumerType.USER,
          type: CredentialType.BASIC,
          secret: 'password123',
          scope: 'admin',
        };

        mockUsersService.findByUsername.mockResolvedValue(mockUser);
        mockRepository.findOneBy.mockResolvedValue(null);
        mockAuthService.saltAndHash.mockReturnValue(throwError(() => new Error('Hash error')));

        service.create(input).subscribe({
          next: () => done(new Error('Should not succeed')),
          error: (error) => {
            expect(error.message).toBe('Hash error');
            done();
          },
        });
      });

      it('should handle repository save errors', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'john.doe',
          consumerType: ConsumerType.USER,
          type: CredentialType.BASIC,
          secret: 'password123',
          scope: 'admin',
        };

        mockUsersService.findByUsername.mockResolvedValue(mockUser);
        mockRepository.findOneBy.mockResolvedValue(null);
        mockAuthService.saltAndHash.mockReturnValue(of('hashed'));
        mockRepository.save.mockRejectedValue(new Error('DB Error'));

        service.create(input).subscribe({
          next: () => done(new Error('Should not succeed')),
          error: (error) => {
            expect(error.message).toBe('DB Error');
            done();
          },
        });
      });
    });
  });

  describe('findAll', () => {
    it('should return all credentials without sensitive data', (done) => {
      const credentials = [
        createBasicCredentialMock(),
        createKeyCredentialMock(),
        createOAuth2CredentialMock(),
      ];

      mockRepository.find.mockResolvedValue(credentials);

      service.findAll().subscribe({
        next: (result) => {
          expect(result).toHaveLength(3);
          result.forEach((credential) => {
            expect(credential.password).toBeUndefined();
            expect(credential.keySecret).toBeUndefined();
            expect(credential.secret).toBeUndefined();
            expect(credential.passwordHash).toBeUndefined();
          });
          done();
        },
        error: done,
      });
    });

    it('should handle empty results', (done) => {
      mockRepository.find.mockResolvedValue([]);

      service.findAll().subscribe({
        next: (result) => {
          expect(result).toEqual([]);
          done();
        },
        error: done,
      });
    });
  });

  describe('findOne', () => {
    it('should return single credential without sensitive data', (done) => {
      const credential = createBasicCredentialMock();
      mockRepository.findOneBy.mockResolvedValue(credential);

      service.findOne('cred-1').subscribe({
        next: (result) => {
          expect(result).toBeDefined();
          expect(result.id).toBe('cred-1');
          expect(result.password).toBeUndefined();
          expect(result.keySecret).toBeUndefined();
          expect(result.secret).toBeUndefined();
          expect(result.passwordHash).toBeUndefined();
          done();
        },
        error: done,
      });
    });

    it('should handle null results safely', (done) => {
      mockRepository.findOneBy.mockResolvedValue(null);

      service.findOne('nonexistent').subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        },
        error: done,
      });
    });
  });

  describe('findByCosumerId', () => {
    it('should find credential by consumer id', async () => {
      const credential = createBasicCredentialMock();
      mockRepository.findOneBy.mockResolvedValue(credential);

      const result = await service.findByCosumerId('john.doe');
      expect(result).toEqual(credential);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        consumerId: 'john.doe',
      });
    });
  });

  describe('update', () => {
    it('should update credential scope', (done) => {
      const updateInput: UpdateCredentialInput = {
        id: 'cred-1',
        scope: 'api:read',
        updatedBy: 'admin',
      };

      const existingCredential = createBasicCredentialMock();
      const updatedCredential = { ...existingCredential, scope: 'api:read' };

      mockRepository.findOne.mockResolvedValue(existingCredential);
      mockRepository.save.mockResolvedValue(updatedCredential);

      service.update('cred-1', updateInput).subscribe({
        next: (result) => {
          expect(result.scope).toBe('api:read');
          expect(result.password).toBeUndefined();
          expect(result.passwordHash).toBeUndefined();
          done();
        },
        error: done,
      });
    });

    it('should update credential status', (done) => {
      const updateInput: UpdateCredentialInput = {
        id: 'cred-1',
        isActive: false,
        updatedBy: 'admin',
      };

      const existingCredential = createBasicCredentialMock();
      const updatedCredential = { ...existingCredential, isActive: false };

      mockRepository.findOne.mockResolvedValue(existingCredential);
      mockRepository.save.mockResolvedValue(updatedCredential);

      service.update('cred-1', updateInput).subscribe({
        next: (result) => {
          expect(result.isActive).toBe(false);
          expect(result.passwordHash).toBeUndefined();
          done();
        },
        error: done,
      });
    });

    it('should update credential secret for basic auth', (done) => {
      const updateInput: UpdateCredentialInput = {
        id: 'cred-1',
        secret: 'new-password',
        updatedBy: 'admin',
      };

      const existingCredential = createBasicCredentialMock();
      const hashedSecret = 'new-hashed-password';
      const updatedCredential = {
        ...existingCredential,
        passwordHash: hashedSecret,
        password: 'new-password',
      };

      mockRepository.findOne.mockResolvedValue(existingCredential);
      mockAuthService.saltAndHash.mockReturnValue(of(hashedSecret));
      mockRepository.save.mockResolvedValue(updatedCredential);

      service.update('cred-1', updateInput).subscribe({
        next: (result) => {
          expect(result).toBeDefined();
          expect(result.password).toBeUndefined(); // Should be stripped
          expect(result.passwordHash).toBeUndefined(); // Should be stripped
          expect(mockAuthService.saltAndHash).toHaveBeenCalledWith('new-password');
          done();
        },
        error: done,
      });
    });

    it('should update credential secret for key auth', (done) => {
      const updateInput: UpdateCredentialInput = {
        id: 'cred-2',
        secret: 'new-api-key',
        updatedBy: 'admin',
      };

      const existingCredential = createKeyCredentialMock();
      const hashedSecret = 'new-hashed-key';
      const updatedCredential = {
        ...existingCredential,
        keySecret: hashedSecret,
      };

      mockRepository.findOne.mockResolvedValue(existingCredential);
      mockAuthService.saltAndHash.mockReturnValue(of(hashedSecret));
      mockRepository.save.mockResolvedValue(updatedCredential);

      service.update('cred-2', updateInput).subscribe({
        next: (result) => {
          expect(result).toBeDefined();
          expect(result.keySecret).toBeUndefined(); // Should be stripped
          done();
        },
        error: done,
      });
    });

    it('should fail when credential not found', (done) => {
      const updateInput: UpdateCredentialInput = {
        id: 'nonexistent',
        scope: 'api:read',
      };

      mockRepository.findOne.mockResolvedValue(null);

      service.update('nonexistent', updateInput).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          expect(error.message).toContain('not found');
          done();
        },
      });
    });
  });

  describe('remove', () => {
    it('should soft delete credential', (done) => {
      const existingCredential = createBasicCredentialMock();
      const deactivatedCredential = {
        ...existingCredential,
        isActive: false,
        updatedBy: 'system'
      };

      mockRepository.findOne.mockResolvedValue(existingCredential);
      mockRepository.save.mockResolvedValue(deactivatedCredential);

      service.remove('cred-1').subscribe({
        next: (result) => {
          expect(result.isActive).toBe(false);
          expect(result.updatedBy).toBe('system');
          expect(result.password).toBeUndefined();
          expect(result.passwordHash).toBeUndefined();
          done();
        },
        error: done,
      });
    });

    it('should fail when credential not found', (done) => {
      mockRepository.findOne.mockResolvedValue(null);

      service.remove('nonexistent').subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          expect(error.message).toContain('not found');
          done();
        },
      });
    });
  });

  describe('Consumer Type Support', () => {
    it('should handle user consumer type', (done) => {
      const input: CreateCredentialInput = {
        consumerId: 'john.doe',
        consumerType: ConsumerType.USER,
        type: CredentialType.BASIC,
        secret: 'password',
        scope: 'admin',
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockRepository.findOneBy.mockResolvedValue(null);
      mockAuthService.saltAndHash.mockReturnValue(of('hashed'));
      mockRepository.save.mockResolvedValue(createBasicCredentialMock());

      service.create(input).subscribe({
        next: (result) => {
          expect(result.consumerType).toBe(ConsumerType.USER);
          done();
        },
        error: done,
      });
    });

    it('should handle app consumer type (note: currently limited by user existence check)', (done) => {
      const input: CreateCredentialInput = {
        consumerId: 'test-app',
        consumerType: ConsumerType.APP,
        appId: 'app-1',
        type: CredentialType.KEY,
        secret: 'api-key',
        scope: 'api:read',
      };

      // The service currently only checks user existence, even for app consumers
      mockUsersService.findByUsername.mockResolvedValue(null);

      service.create(input).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          expect(error.message).toContain('does not exists');
          done();
        },
      });
    });
  });

  describe('Security Validations', () => {
    it('should strip sensitive data from responses', (done) => {
      const credential = createBasicCredentialMock();
      credential.password = 'sensitive';
      credential.keySecret = 'sensitive';
      credential.secret = 'sensitive';
      credential.passwordHash = 'sensitive-hash';

      mockRepository.findOneBy.mockResolvedValue(credential);

      service.findOne('cred-1').subscribe({
        next: (result) => {
          expect(result.password).toBeUndefined();
          expect(result.keySecret).toBeUndefined();
          expect(result.secret).toBeUndefined();
          expect(result.passwordHash).toBeUndefined();
          done();
        },
        error: done,
      });
    });

    it('should validate secret before hashing', (done) => {
      const input: CreateCredentialInput = {
        consumerId: 'john.doe',
        consumerType: ConsumerType.USER,
        type: CredentialType.BASIC,
        secret: '',
        scope: 'admin',
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockRepository.findOneBy.mockResolvedValue(null);
      mockAuthService.saltAndHash.mockReturnValue(throwError(() => new Error('invalid arguments')));

      service.create(input).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          expect(error.message).toBe('invalid arguments');
          done();
        },
      });
    });
  });

  describe('RxJS Observable Patterns', () => {
    it('should properly chain observables with switchMap', (done) => {
      const input: CreateCredentialInput = {
        consumerId: 'john.doe',
        consumerType: ConsumerType.USER,
        type: CredentialType.BASIC,
        secret: 'password',
        scope: 'admin',
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockRepository.findOneBy.mockResolvedValue(null);
      mockAuthService.saltAndHash.mockReturnValue(of('hashed'));
      mockRepository.save.mockResolvedValue(createBasicCredentialMock());

      // Verify the observable pattern works correctly
      const callOrder = [];

      // Override to track call order
      const originalFindByUsername = mockUsersService.findByUsername;
      mockUsersService.findByUsername = jest.fn().mockImplementation((...args) => {
        callOrder.push('user-check');
        return originalFindByUsername(...args);
      });

      const originalFindOneBy = mockRepository.findOneBy;
      mockRepository.findOneBy = jest.fn().mockImplementation((...args) => {
        callOrder.push('credential-check');
        return originalFindOneBy(...args);
      });

      const originalSaltAndHash = mockAuthService.saltAndHash;
      mockAuthService.saltAndHash = jest.fn().mockImplementation((...args) => {
        callOrder.push('hash');
        return originalSaltAndHash(...args);
      });

      service.create(input).subscribe({
        next: () => {
          expect(callOrder).toEqual(['user-check', 'credential-check', 'hash']);
          done();
        },
        error: done,
      });
    });

    it('should handle observable errors properly', (done) => {
      const input: CreateCredentialInput = {
        consumerId: 'john.doe',
        consumerType: ConsumerType.USER,
        type: CredentialType.BASIC,
        secret: 'password',
        scope: 'admin',
      };

      mockUsersService.findByUsername.mockRejectedValue(new Error('Service error'));

      service.create(input).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          expect(error.message).toBe('Service error');
          done();
        },
      });
    });
  });

  describe('Integration with Auth Service', () => {
    it('should properly integrate with auth service for password hashing', (done) => {
      const secret = 'test-password';
      const hashedSecret = 'hashed-test-password';

      const input: CreateCredentialInput = {
        consumerId: 'john.doe',
        consumerType: ConsumerType.USER,
        type: CredentialType.BASIC,
        secret,
        scope: 'admin',
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockRepository.findOneBy.mockResolvedValue(null);
      mockAuthService.saltAndHash.mockReturnValue(of(hashedSecret));
      mockRepository.save.mockResolvedValue(createBasicCredentialMock());

      service.create(input).subscribe({
        next: () => {
          expect(mockAuthService.saltAndHash).toHaveBeenCalledWith(secret);
          done();
        },
        error: done,
      });
    });

    it('should handle auth service failures gracefully', (done) => {
      const input: CreateCredentialInput = {
        consumerId: 'john.doe',
        consumerType: ConsumerType.USER,
        type: CredentialType.KEY,
        secret: 'api-key',
        scope: 'admin',
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockRepository.findOneBy.mockResolvedValue(null);
      mockAuthService.saltAndHash.mockReturnValue(throwError(() => new Error('Hashing failed')));

      service.create(input).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          expect(error.message).toBe('Hashing failed');
          done();
        },
      });
    });
  });
});