import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheConfigService } from './cache.config';

describe('CacheConfigService', () => {
  let service: CacheConfigService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheConfigService>(CacheConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCacheOptions', () => {
    it('should return in-memory cache config when Redis is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        const values = {
          REDIS_ENABLED: 'false',
          CACHE_TTL: 60000,
        };
        return values[key] !== undefined ? values[key] : defaultValue;
      });

      const result = await service.createCacheOptions();

      expect(result).toEqual({
        ttl: 60000,
        max: 100,
      });
    });

    it('should use default TTL when not configured', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        return defaultValue;
      });

      const result = await service.createCacheOptions();

      expect(result.ttl).toBe(60000);
    });
  });
});
