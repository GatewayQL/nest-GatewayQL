import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { ApiKeyGuard, IS_PUBLIC_KEY } from './api-key.guard';
import { CredentialsService } from '../../credentials/services/credentials.service';
import { AuthService } from '../../auth/services/auth.service';
import { Credential, CredentialType } from '../../credentials/models/credential.interface';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let reflector: Reflector;
  let configService: ConfigService;
  let credentialsService: CredentialsService;
  let authService: AuthService;

  const mockCredentialsService = {
    findAll: jest.fn(),
    findByCosumerId: jest.fn(),
  };

  const mockAuthService = {
    compareSaltAndHashed: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(),
  };

  const mockRequest = {
    headers: {},
    apiKey: null,
  };

  const mockHttpContext = {
    getRequest: jest.fn(() => mockRequest),
    getResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CredentialsService,
          useValue: mockCredentialsService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    reflector = module.get<Reflector>(Reflector);
    configService = module.get<ConfigService>(ConfigService);
    credentialsService = module.get<CredentialsService>(CredentialsService);
    authService = module.get<AuthService>(AuthService);

    // Setup default mocks
    mockExecutionContext.switchToHttp.mockReturnValue(mockHttpContext);
    mockReflector.getAllAndOverride.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRequest.headers = {};
    mockRequest.apiKey = null;
  });

  describe('canActivate', () => {
    it('should return true for public routes', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(mockExecutionContext as any);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should throw UnauthorizedException when no API key is provided', async () => {
      mockRequest.headers = {};

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('API key is required'));
    });

    it('should validate API key from x-api-key header', async () => {
      const keyId = 'test-key-id';
      const keySecret = 'test-key-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };

      const mockCredential: Credential = {
        keyId,
        consumerId: 'test-consumer',
        type: 'key-auth' as any,
        isActive: true,
        scope: 'read',
      };

      const mockFullCredential: Credential = {
        ...mockCredential,
        keySecret: 'hashed-secret',
      };

      mockCredentialsService.findAll.mockReturnValue(of([mockCredential]));
      mockCredentialsService.findByCosumerId.mockResolvedValue(mockFullCredential);
      mockAuthService.compareSaltAndHashed.mockReturnValue(of(true));

      const result = await guard.canActivate(mockExecutionContext as any);

      expect(result).toBe(true);
      expect(mockRequest.apiKey).toEqual({
        keyId: mockCredential.keyId,
        consumerId: mockCredential.consumerId,
        scope: mockCredential.scope,
      });
    });

    it('should validate API key from authorization header', async () => {
      const keyId = 'test-key-id';
      const keySecret = 'test-key-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'authorization': `Bearer ${apiKey}` };

      const mockCredential: Credential = {
        keyId,
        consumerId: 'test-consumer',
        type: 'key-auth' as any,
        isActive: true,
        scope: 'read',
      };

      const mockFullCredential: Credential = {
        ...mockCredential,
        keySecret: 'hashed-secret',
      };

      mockCredentialsService.findAll.mockReturnValue(of([mockCredential]));
      mockCredentialsService.findByCosumerId.mockResolvedValue(mockFullCredential);
      mockAuthService.compareSaltAndHashed.mockReturnValue(of(true));

      const result = await guard.canActivate(mockExecutionContext as any);

      expect(result).toBe(true);
    });

    it('should fallback to environment API key for backwards compatibility', async () => {
      const envApiKey = 'legacy-api-key';
      mockRequest.headers = { 'x-api-key': envApiKey };
      mockConfigService.get.mockReturnValue(envApiKey);

      const result = await guard.canActivate(mockExecutionContext as any);

      expect(result).toBe(true);
      expect(mockConfigService.get).toHaveBeenCalledWith('API_KEY');
    });

    it('should throw UnauthorizedException for invalid API key format', async () => {
      mockRequest.headers = { 'x-api-key': 'invalid-format' };
      mockConfigService.get.mockReturnValue(null);

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key format. Expected format: keyId:keySecret'));
    });

    it('should throw UnauthorizedException for non-existent credential', async () => {
      const keyId = 'non-existent-key';
      const keySecret = 'test-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };
      mockCredentialsService.findAll.mockReturnValue(of([]));

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key'));
    });

    it('should throw UnauthorizedException for inactive credential', async () => {
      const keyId = 'inactive-key';
      const keySecret = 'test-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };

      const mockCredential: Credential = {
        keyId,
        consumerId: 'test-consumer',
        type: 'key-auth' as any,
        isActive: false, // Inactive credential
        scope: 'read',
      };

      mockCredentialsService.findAll.mockReturnValue(of([mockCredential]));

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key'));
    });

    it('should throw UnauthorizedException for wrong credential type', async () => {
      const keyId = 'oauth-key';
      const keySecret = 'test-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };

      const mockCredential: Credential = {
        keyId,
        consumerId: 'test-consumer',
        type: 'oauth2' as any, // Wrong type
        isActive: true,
        scope: 'read',
      };

      mockCredentialsService.findAll.mockReturnValue(of([mockCredential]));

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key'));
    });

    it('should throw UnauthorizedException when full credential not found', async () => {
      const keyId = 'test-key';
      const keySecret = 'test-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };

      const mockCredential: Credential = {
        keyId,
        consumerId: 'test-consumer',
        type: 'key-auth' as any,
        isActive: true,
        scope: 'read',
      };

      mockCredentialsService.findAll.mockReturnValue(of([mockCredential]));
      mockCredentialsService.findByCosumerId.mockResolvedValue(null);

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key'));
    });

    it('should throw UnauthorizedException when keySecret is missing', async () => {
      const keyId = 'test-key';
      const keySecret = 'test-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };

      const mockCredential: Credential = {
        keyId,
        consumerId: 'test-consumer',
        type: 'key-auth' as any,
        isActive: true,
        scope: 'read',
      };

      const mockFullCredential: Credential = {
        ...mockCredential,
        keySecret: null, // Missing keySecret
      };

      mockCredentialsService.findAll.mockReturnValue(of([mockCredential]));
      mockCredentialsService.findByCosumerId.mockResolvedValue(mockFullCredential);

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key'));
    });

    it('should throw UnauthorizedException for invalid key secret', async () => {
      const keyId = 'test-key';
      const keySecret = 'wrong-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };

      const mockCredential: Credential = {
        keyId,
        consumerId: 'test-consumer',
        type: 'key-auth' as any,
        isActive: true,
        scope: 'read',
      };

      const mockFullCredential: Credential = {
        ...mockCredential,
        keySecret: 'hashed-secret',
      };

      mockCredentialsService.findAll.mockReturnValue(of([mockCredential]));
      mockCredentialsService.findByCosumerId.mockResolvedValue(mockFullCredential);
      mockAuthService.compareSaltAndHashed.mockReturnValue(of(false)); // Invalid secret

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key'));
    });

    it('should handle service errors gracefully', async () => {
      const keyId = 'test-key';
      const keySecret = 'test-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };
      mockCredentialsService.findAll.mockReturnValue(throwError(() => new Error('Service error')));

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key'));
    });

    it('should handle auth service errors gracefully', async () => {
      const keyId = 'test-key';
      const keySecret = 'test-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };

      const mockCredential: Credential = {
        keyId,
        consumerId: 'test-consumer',
        type: 'key-auth' as any,
        isActive: true,
        scope: 'read',
      };

      const mockFullCredential: Credential = {
        ...mockCredential,
        keySecret: 'hashed-secret',
      };

      mockCredentialsService.findAll.mockReturnValue(of([mockCredential]));
      mockCredentialsService.findByCosumerId.mockResolvedValue(mockFullCredential);
      mockAuthService.compareSaltAndHashed.mockReturnValue(throwError(() => new Error('Auth error')));

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key'));
    });

    it('should rethrow UnauthorizedException without modification', async () => {
      const keyId = 'test-key';
      const keySecret = 'test-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };

      const unauthorizedException = new UnauthorizedException('Custom error message');
      mockCredentialsService.findAll.mockReturnValue(throwError(() => unauthorizedException));

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(unauthorizedException);
    });

    it('should handle multiple credentials with same keyId correctly', async () => {
      const keyId = 'test-key';
      const keySecret = 'test-secret';
      const apiKey = `${keyId}:${keySecret}`;

      mockRequest.headers = { 'x-api-key': apiKey };

      const mockCredentials: Credential[] = [
        {
          keyId,
          consumerId: 'inactive-consumer',
          type: 'key-auth' as any,
          isActive: false, // Inactive
          scope: 'read',
        },
        {
          keyId,
          consumerId: 'active-consumer',
          type: 'key-auth' as any,
          isActive: true, // Active - should be selected
          scope: 'read',
        },
      ];

      const mockFullCredential: Credential = {
        ...mockCredentials[1],
        keySecret: 'hashed-secret',
      };

      mockCredentialsService.findAll.mockReturnValue(of(mockCredentials));
      mockCredentialsService.findByCosumerId.mockResolvedValue(mockFullCredential);
      mockAuthService.compareSaltAndHashed.mockReturnValue(of(true));

      const result = await guard.canActivate(mockExecutionContext as any);

      expect(result).toBe(true);
      expect(mockCredentialsService.findByCosumerId).toHaveBeenCalledWith('active-consumer');
      expect(mockRequest.apiKey).toEqual({
        keyId: 'test-key',
        consumerId: 'active-consumer',
        scope: 'read',
      });
    });

    it('should handle missing keyId in split operation', async () => {
      mockRequest.headers = { 'x-api-key': ':secret-only' };
      mockConfigService.get.mockReturnValue(null);

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key format. Expected format: keyId:keySecret'));
    });

    it('should handle missing keySecret in split operation', async () => {
      mockRequest.headers = { 'x-api-key': 'keyId:' };
      mockConfigService.get.mockReturnValue(null);

      await expect(guard.canActivate(mockExecutionContext as any))
        .rejects
        .toThrow(new UnauthorizedException('Invalid API key format. Expected format: keyId:keySecret'));
    });
  });
});