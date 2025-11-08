import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        crypto: {
          algorithm: 'aes-256-cbc',
          cipherKey: '12345678901234567890123456789012', // Exactly 32 bytes for aes-256-cbc
          saltRounds: 10,
        },
        'crypto.algorithm': 'aes-256-cbc',
        'crypto.cipherKey': '12345678901234567890123456789012',
        'crypto.saltRounds': 10,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateJWT', () => {
    it('should generate a JWT token', async () => {
      const mockCredential = { id: '123', username: 'test' };
      const mockToken = 'mock.jwt.token';

      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service
        .generateJWT(mockCredential as any)
        .toPromise();

      expect(result).toBe(mockToken);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        credential: mockCredential,
      });
    });
  });

  describe('saltAndHash', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';

      const result = await service.saltAndHash(password).toPromise();

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).not.toBe(password);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error for undefined password', (done) => {
      service.saltAndHash(undefined).subscribe({
        next: () => {
          done.fail('Should have thrown an error');
        },
        error: (error) => {
          expect(error).toBe('invalid arguments');
          done();
        },
      });
    });

    it('should throw error for empty password', (done) => {
      service.saltAndHash('').subscribe({
        next: () => {
          done.fail('Should have thrown an error');
        },
        error: (error) => {
          expect(error).toBe('invalid arguments');
          done();
        },
      });
    });
  });

  describe('compareSaltAndHashed', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'testPassword123';
      const hash = await service.saltAndHash(password).toPromise();

      const result = await service
        .compareSaltAndHashed(password, hash)
        .toPromise();

      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hash = await service.saltAndHash(password).toPromise();

      const result = await service
        .compareSaltAndHashed(wrongPassword, hash)
        .toPromise();

      expect(result).toBe(false);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plainText = 'secret-text-to-encrypt';

      const encrypted = service.encrypt(plainText);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainText);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plainText);
    });
  });
});
