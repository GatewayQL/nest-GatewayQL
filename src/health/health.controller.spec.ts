import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let db: TypeOrmHealthIndicator;
  let memory: MemoryHealthIndicator;
  let disk: DiskHealthIndicator;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockDb = {
    pingCheck: jest.fn(),
  };

  const mockMemory = {
    checkHeap: jest.fn(),
    checkRSS: jest.fn(),
  };

  const mockDisk = {
    checkStorage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockDb,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemory,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDisk,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    db = module.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
    memory = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
    disk = module.get<DiskHealthIndicator>(DiskHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should perform comprehensive health check', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: {},
        error: {},
        details: {},
      });

      const result = await controller.check();

      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'ok',
        info: {},
        error: {},
        details: {},
      });
    });
  });

  describe('ready', () => {
    it('should check readiness (database only)', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: {},
      });

      const result = await controller.ready();

      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });
  });

  describe('live', () => {
    it('should check liveness (memory only)', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: { memory_heap: { status: 'up' } },
        error: {},
        details: {},
      });

      const result = await controller.live();

      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });
  });
});
