import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { CredentialsResolver } from './credentials.resolver';
import { CredentialsService } from '../services/credentials.service';
import { CredentialEntity } from '../models/credential.entity';
import {
  CredentialType,
  ConsumerType,
  Credential,
} from '../models/credential.interface';
import { CreateCredentialInput } from '../dto/create-credential.input';
import { UpdateCredentialInput } from '../dto/update-credential.input';

describe('CredentialsResolver', () => {
  let resolver: CredentialsResolver;
  let service: CredentialsService;

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
    credential.createdAt = Date.now();
    credential.updatedAt = Date.now();
    credential.updatedBy = 'system';
    return Object.assign(credential, overrides);
  };

  const createKeyCredentialMock = (overrides = {}): CredentialEntity => {
    const credential = new CredentialEntity();
    credential.id = 'cred-2';
    credential.consumerId = 'john.doe';
    credential.consumerType = ConsumerType.USER;
    credential.type = CredentialType.KEY;
    credential.scope = 'api:read';
    credential.isActive = true;
    credential.keyId = 'key-123';
    credential.createdAt = Date.now();
    credential.updatedAt = Date.now();
    credential.updatedBy = 'system';
    return Object.assign(credential, overrides);
  };

  const createOAuth2CredentialMock = (overrides = {}): CredentialEntity => {
    const credential = new CredentialEntity();
    credential.id = 'cred-3';
    credential.consumerId = 'john.doe';
    credential.consumerType = ConsumerType.USER;
    credential.type = CredentialType.OAUTH2;
    credential.scope = 'api:write';
    credential.isActive = true;
    credential.createdAt = Date.now();
    credential.updatedAt = Date.now();
    credential.updatedBy = 'system';
    return Object.assign(credential, overrides);
  };

  const createJWTCredentialMock = (overrides = {}): CredentialEntity => {
    const credential = new CredentialEntity();
    credential.id = 'cred-4';
    credential.consumerId = 'john.doe';
    credential.consumerType = ConsumerType.USER;
    credential.type = CredentialType.JWT;
    credential.scope = 'api:admin';
    credential.isActive = true;
    credential.createdAt = Date.now();
    credential.updatedAt = Date.now();
    credential.updatedBy = 'system';
    return Object.assign(credential, overrides);
  };

  const createAppCredentialMock = (overrides = {}): CredentialEntity => {
    const credential = new CredentialEntity();
    credential.id = 'cred-5';
    credential.consumerId = 'test-app';
    credential.consumerType = ConsumerType.APP;
    credential.app = mockApp as any;
    credential.type = CredentialType.KEY;
    credential.scope = 'api:read';
    credential.isActive = true;
    credential.keyId = 'app-key-123';
    credential.createdAt = Date.now();
    credential.updatedAt = Date.now();
    credential.updatedBy = 'system';
    return Object.assign(credential, overrides);
  };

  // Mock service
  const mockCredentialsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCosumerId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsResolver,
        {
          provide: CredentialsService,
          useValue: mockCredentialsService,
        },
      ],
    }).compile();

    resolver = module.get<CredentialsResolver>(CredentialsResolver);
    service = module.get<CredentialsService>(CredentialsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Resolver Initialization', () => {
    it('should be defined', () => {
      expect(resolver).toBeDefined();
    });

    it('should inject credentials service', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createCredential', () => {
    describe('BASIC Authentication', () => {
      it('should create basic auth credential for user', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'john.doe',
          consumerType: ConsumerType.USER,
          type: CredentialType.BASIC,
          secret: 'password123',
          scope: 'admin',
        };

        const mockCredential = createBasicCredentialMock();
        mockCredentialsService.create.mockReturnValue(of(mockCredential));

        const result = resolver.createCredential(input);

        result.subscribe({
          next: (credential) => {
            expect(credential).toEqual(mockCredential);
            expect(service.create).toHaveBeenCalledWith(input);
            done();
          },
          error: done,
        });
      });

      it('should handle basic auth credential creation errors', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'nonexistent.user',
          consumerType: ConsumerType.USER,
          type: CredentialType.BASIC,
          secret: 'password123',
          scope: 'admin',
        };

        const error = 'User does not exist';
        mockCredentialsService.create.mockReturnValue(throwError(error));

        const result = resolver.createCredential(input);

        result.subscribe({
          next: () => done(new Error('Should not succeed')),
          error: (err) => {
            expect(err).toBe(error);
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

        const mockCredential = createKeyCredentialMock();
        mockCredentialsService.create.mockReturnValue(of(mockCredential));

        const result = resolver.createCredential(input);

        result.subscribe({
          next: (credential) => {
            expect(credential).toEqual(mockCredential);
            expect(credential.type).toBe(CredentialType.KEY);
            expect(credential.keyId).toBeDefined();
            expect(service.create).toHaveBeenCalledWith(input);
            done();
          },
          error: done,
        });
      });

      it('should create key auth credential for app', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'test-app',
          consumerType: ConsumerType.APP,
          appId: 'app-1',
          type: CredentialType.KEY,
          secret: 'app-api-key',
          scope: 'api:read',
        };

        const mockCredential = createAppCredentialMock();
        mockCredentialsService.create.mockReturnValue(of(mockCredential));

        const result = resolver.createCredential(input);

        result.subscribe({
          next: (credential) => {
            expect(credential).toEqual(mockCredential);
            expect(credential.consumerType).toBe(ConsumerType.APP);
            expect(credential.app).toBeDefined();
            expect(service.create).toHaveBeenCalledWith(input);
            done();
          },
          error: done,
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

        const mockCredential = createOAuth2CredentialMock();
        mockCredentialsService.create.mockReturnValue(of(mockCredential));

        const result = resolver.createCredential(input);

        result.subscribe({
          next: (credential) => {
            expect(credential).toEqual(mockCredential);
            expect(credential.type).toBe(CredentialType.OAUTH2);
            expect(service.create).toHaveBeenCalledWith(input);
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

        const mockCredential = createJWTCredentialMock();
        mockCredentialsService.create.mockReturnValue(of(mockCredential));

        const result = resolver.createCredential(input);

        result.subscribe({
          next: (credential) => {
            expect(credential).toEqual(mockCredential);
            expect(credential.type).toBe(CredentialType.JWT);
            expect(service.create).toHaveBeenCalledWith(input);
            done();
          },
          error: done,
        });
      });
    });

    describe('Consumer Type Validation', () => {
      it('should accept user consumer type', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'john.doe',
          consumerType: ConsumerType.USER,
          type: CredentialType.BASIC,
          secret: 'password',
          scope: 'admin',
        };

        const mockCredential = createBasicCredentialMock();
        mockCredentialsService.create.mockReturnValue(of(mockCredential));

        const result = resolver.createCredential(input);

        result.subscribe({
          next: () => {
            expect(service.create).toHaveBeenCalledWith(
              expect.objectContaining({
                consumerType: ConsumerType.USER,
              }),
            );
            done();
          },
          error: done,
        });
      });

      it('should accept app consumer type', (done) => {
        const input: CreateCredentialInput = {
          consumerId: 'test-app',
          consumerType: ConsumerType.APP,
          appId: 'app-1',
          type: CredentialType.KEY,
          secret: 'api-key',
          scope: 'api:read',
        };

        const mockCredential = createAppCredentialMock();
        mockCredentialsService.create.mockReturnValue(of(mockCredential));

        const result = resolver.createCredential(input);

        result.subscribe({
          next: () => {
            expect(service.create).toHaveBeenCalledWith(
              expect.objectContaining({
                consumerType: ConsumerType.APP,
                appId: 'app-1',
              }),
            );
            done();
          },
          error: done,
        });
      });
    });
  });

  describe('findAll (credentials query)', () => {
    it('should return all credentials', (done) => {
      const mockCredentials = [
        createBasicCredentialMock(),
        createKeyCredentialMock(),
        createOAuth2CredentialMock(),
        createJWTCredentialMock(),
        createAppCredentialMock(),
      ];

      mockCredentialsService.findAll.mockReturnValue(of(mockCredentials));

      const result = resolver.findAll();

      result.subscribe({
        next: (credentials) => {
          expect(credentials).toEqual(mockCredentials);
          expect(service.findAll).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should return empty array when no credentials exist', (done) => {
      mockCredentialsService.findAll.mockReturnValue(of([]));

      const result = resolver.findAll();

      result.subscribe({
        next: (credentials) => {
          expect(credentials).toEqual([]);
          expect(service.findAll).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should handle service errors', (done) => {
      const error = 'Database connection failed';
      mockCredentialsService.findAll.mockReturnValue(throwError(error));

      const result = resolver.findAll();

      result.subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });

    it('should handle different credential types correctly', (done) => {
      const mockCredentials = [
        createBasicCredentialMock(),
        createKeyCredentialMock(),
        createOAuth2CredentialMock(),
        createJWTCredentialMock(),
        createAppCredentialMock(),
      ];

      mockCredentialsService.findAll.mockReturnValue(of(mockCredentials));

      const result = resolver.findAll();

      result.subscribe({
        next: (credentials) => {
          expect(credentials).toHaveLength(5);
          expect(credentials[0].type).toBe(CredentialType.BASIC);
          expect(credentials[1].type).toBe(CredentialType.KEY);
          expect(credentials[2].type).toBe(CredentialType.OAUTH2);
          expect(credentials[3].type).toBe(CredentialType.JWT);
          expect(credentials[4].type).toBe(CredentialType.KEY);
          expect(credentials[4].consumerType).toBe(ConsumerType.APP);
          done();
        },
        error: done,
      });
    });
  });

  describe('findOne (credential query)', () => {
    it('should return single credential by id', (done) => {
      const mockCredential = createBasicCredentialMock();
      mockCredentialsService.findOne.mockReturnValue(of(mockCredential));

      const result = resolver.findOne('cred-1');

      result.subscribe({
        next: (credential) => {
          expect(credential).toEqual(mockCredential);
          expect(service.findOne).toHaveBeenCalledWith('cred-1');
          done();
        },
        error: done,
      });
    });

    it('should handle credential not found', (done) => {
      mockCredentialsService.findOne.mockReturnValue(of(null));

      const result = resolver.findOne('nonexistent');

      result.subscribe({
        next: (credential) => {
          expect(credential).toBeNull();
          expect(service.findOne).toHaveBeenCalledWith('nonexistent');
          done();
        },
        error: done,
      });
    });

    it('should handle service errors', (done) => {
      const error = 'Database error';
      mockCredentialsService.findOne.mockReturnValue(throwError(error));

      const result = resolver.findOne('cred-1');

      result.subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });

    it('should handle different credential types', (done) => {
      const keyCredential = createKeyCredentialMock();
      mockCredentialsService.findOne.mockReturnValue(of(keyCredential));

      const result = resolver.findOne('cred-2');

      result.subscribe({
        next: (credential) => {
          expect(credential.type).toBe(CredentialType.KEY);
          expect(credential.keyId).toBeDefined();
          done();
        },
        error: done,
      });
    });

    it('should handle app credentials', (done) => {
      const appCredential = createAppCredentialMock();
      mockCredentialsService.findOne.mockReturnValue(of(appCredential));

      const result = resolver.findOne('cred-5');

      result.subscribe({
        next: (credential) => {
          expect(credential.consumerType).toBe(ConsumerType.APP);
          expect(credential.app).toBeDefined();
          expect(credential.app.name).toBe('test-app');
          done();
        },
        error: done,
      });
    });
  });

  describe('updateCredential', () => {
    it('should update credential scope', (done) => {
      const updateInput: UpdateCredentialInput = {
        id: 'cred-1',
        scope: 'api:read',
        updatedBy: 'admin',
      };

      const updatedCredential = createBasicCredentialMock({
        scope: 'api:read',
        updatedBy: 'admin',
      });

      mockCredentialsService.update.mockReturnValue(of(updatedCredential));

      const result = resolver.updateCredential(updateInput);

      result.subscribe({
        next: (credential) => {
          expect(credential).toEqual(updatedCredential);
          expect(credential.scope).toBe('api:read');
          expect(service.update).toHaveBeenCalledWith('cred-1', updateInput);
          done();
        },
        error: done,
      });
    });

    it('should update credential activation status', (done) => {
      const updateInput: UpdateCredentialInput = {
        id: 'cred-1',
        isActive: false,
        updatedBy: 'admin',
      };

      const deactivatedCredential = createBasicCredentialMock({
        isActive: false,
        updatedBy: 'admin',
      });

      mockCredentialsService.update.mockReturnValue(of(deactivatedCredential));

      const result = resolver.updateCredential(updateInput);

      result.subscribe({
        next: (credential) => {
          expect(credential.isActive).toBe(false);
          expect(credential.updatedBy).toBe('admin');
          expect(service.update).toHaveBeenCalledWith('cred-1', updateInput);
          done();
        },
        error: done,
      });
    });

    it('should handle credential not found', (done) => {
      const updateInput: UpdateCredentialInput = {
        id: 'nonexistent',
        scope: 'api:read',
      };

      const error = new Error('Credential not found');
      mockCredentialsService.update.mockReturnValue(throwError(error));

      const result = resolver.updateCredential(updateInput);

      result.subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (err) => {
          expect(err.message).toBe('Credential not found');
          done();
        },
      });
    });
  });

  describe('removeCredential', () => {
    it('should soft delete credential', (done) => {
      const deactivatedCredential = createBasicCredentialMock({
        isActive: false,
        updatedBy: 'system',
      });

      mockCredentialsService.remove.mockReturnValue(of(deactivatedCredential));

      const result = resolver.removeCredential('cred-1');

      result.subscribe({
        next: (credential) => {
          expect(credential.isActive).toBe(false);
          expect(credential.updatedBy).toBe('system');
          expect(service.remove).toHaveBeenCalledWith('cred-1');
          done();
        },
        error: done,
      });
    });

    it('should handle credential not found', (done) => {
      const error = new Error('Credential not found');
      mockCredentialsService.remove.mockReturnValue(throwError(error));

      const result = resolver.removeCredential('nonexistent');

      result.subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (err) => {
          expect(err.message).toBe('Credential not found');
          done();
        },
      });
    });

    it('should handle removal of different credential types', (done) => {
      const deactivatedCredential = createKeyCredentialMock({
        isActive: false,
        updatedBy: 'system',
      });

      mockCredentialsService.remove.mockReturnValue(of(deactivatedCredential));

      const result = resolver.removeCredential('cred-2');

      result.subscribe({
        next: (credential) => {
          expect(credential.type).toBe(CredentialType.KEY);
          expect(credential.isActive).toBe(false);
          expect(credential.keyId).toBeDefined();
          done();
        },
        error: done,
      });
    });
  });

  describe('Observable Integration', () => {
    it('should return observables from service calls', () => {
      const mockCredential = createBasicCredentialMock();
      const observable = of(mockCredential);
      mockCredentialsService.create.mockReturnValue(observable);

      const input: CreateCredentialInput = {
        consumerId: 'john.doe',
        consumerType: ConsumerType.USER,
        type: CredentialType.BASIC,
        secret: 'password',
        scope: 'admin',
      };

      const result = resolver.createCredential(input);

      expect(result).toBe(observable);
      expect(service.create).toHaveBeenCalledWith(input);
    });

    it('should propagate observable errors', (done) => {
      const error = 'Service error';
      const errorObservable = throwError(error);
      mockCredentialsService.findOne.mockReturnValue(errorObservable);

      const result = resolver.findOne('cred-1');

      result.subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('GraphQL Schema Compatibility', () => {
    it('should return correct types for GraphQL', (done) => {
      const mockCredential = createBasicCredentialMock();
      mockCredentialsService.create.mockReturnValue(of(mockCredential));

      const input: CreateCredentialInput = {
        consumerId: 'john.doe',
        consumerType: ConsumerType.USER,
        type: CredentialType.BASIC,
        secret: 'password',
        scope: 'admin',
      };

      const result = resolver.createCredential(input);

      result.subscribe({
        next: (credential) => {
          expect(credential).toBeInstanceOf(CredentialEntity);
          expect(credential.id).toBeDefined();
          expect(credential.type).toBeDefined();
          expect(credential.consumerType).toBeDefined();
          done();
        },
        error: done,
      });
    });

    it('should handle array returns for findAll', (done) => {
      const mockCredentials = [
        createBasicCredentialMock(),
        createKeyCredentialMock()
      ];
      mockCredentialsService.findAll.mockReturnValue(of(mockCredentials));

      const result = resolver.findAll();

      result.subscribe({
        next: (credentials) => {
          expect(Array.isArray(credentials)).toBe(true);
          credentials.forEach(credential => {
            expect(credential).toBeInstanceOf(CredentialEntity);
          });
          done();
        },
        error: done,
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate service creation errors', (done) => {
      const input: CreateCredentialInput = {
        consumerId: 'john.doe',
        consumerType: ConsumerType.USER,
        type: CredentialType.BASIC,
        secret: 'password',
        scope: 'admin',
      };

      const serviceError = 'Database constraint violation';
      mockCredentialsService.create.mockReturnValue(throwError(serviceError));

      const result = resolver.createCredential(input);

      result.subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (err) => {
          expect(err).toBe(serviceError);
          done();
        },
      });
    });
  });

  describe('Integration with Apps and Users', () => {
    it('should handle user credentials properly', (done) => {
      const input: CreateCredentialInput = {
        consumerId: 'john.doe',
        consumerType: ConsumerType.USER,
        type: CredentialType.BASIC,
        secret: 'password',
        scope: 'admin',
      };

      const userCredential = createBasicCredentialMock();
      mockCredentialsService.create.mockReturnValue(of(userCredential));

      const result = resolver.createCredential(input);

      result.subscribe({
        next: (credential) => {
          expect(credential.consumerType).toBe(ConsumerType.USER);
          expect(credential.consumerId).toBe('john.doe');
          done();
        },
        error: done,
      });
    });

    it('should handle app credentials properly', (done) => {
      const input: CreateCredentialInput = {
        consumerId: 'test-app',
        consumerType: ConsumerType.APP,
        appId: 'app-1',
        type: CredentialType.KEY,
        secret: 'api-key',
        scope: 'api:read',
      };

      const appCredential = createAppCredentialMock();
      mockCredentialsService.create.mockReturnValue(of(appCredential));

      const result = resolver.createCredential(input);

      result.subscribe({
        next: (credential) => {
          expect(credential.consumerType).toBe(ConsumerType.APP);
          expect(credential.consumerId).toBe('test-app');
          expect(credential.app).toBeDefined();
          done();
        },
        error: done,
      });
    });
  });
});