import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthIndicatorResult,
  HealthCheckResult,
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

  const createHealthResult = (status: 'ok' | 'error', details: any = {}): HealthCheckResult => ({
    status,
    info: status === 'ok' ? details : {},
    error: status === 'error' ? details : {},
    details,
  });

  const createHealthIndicatorResult = (
    key: string,
    status: 'up' | 'down',
    message?: string,
  ): HealthIndicatorResult => ({
    [key]: {
      status: status as any,
      ...(message && { message }),
    },
  });

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

  describe('Basic functionality', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(healthCheckService).toBeDefined();
      expect(db).toBeDefined();
      expect(memory).toBeDefined();
      expect(disk).toBeDefined();
    });
  });

  describe('check - comprehensive health check', () => {
    it('should perform comprehensive health check with all indicators', async () => {
      const healthResult = createHealthResult('ok', {
        database: createHealthIndicatorResult('database', 'up'),
        memory_heap: createHealthIndicatorResult('memory_heap', 'up'),
        memory_rss: createHealthIndicatorResult('memory_rss', 'up'),
        storage: createHealthIndicatorResult('storage', 'up'),
      });

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.check();

      expect(mockHealthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function), // Database check
        expect.any(Function), // Memory heap check
        expect.any(Function), // Memory RSS check
        expect.any(Function), // Storage check
      ]);
      expect(result).toEqual(healthResult);
      expect(result.status).toBe('ok');
    });

    it('should handle health check failure', async () => {
      const healthResult = createHealthResult('error', {
        database: createHealthIndicatorResult('database', 'down', 'Connection failed'),
      });

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.check();

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should call correct memory thresholds', async () => {
      const healthResult = createHealthResult('ok');
      mockHealthCheckService.check.mockImplementation(async (indicators) => {
        // Execute the indicator functions to verify they're configured correctly
        for (const indicator of indicators) {
          await indicator();
        }
        return healthResult;
      });

      mockMemory.checkHeap.mockResolvedValue(createHealthIndicatorResult('memory_heap', 'up'));
      mockMemory.checkRSS.mockResolvedValue(createHealthIndicatorResult('memory_rss', 'up'));

      await controller.check();

      expect(mockMemory.checkHeap).toHaveBeenCalledWith('memory_heap', 150 * 1024 * 1024);
      expect(mockMemory.checkRSS).toHaveBeenCalledWith('memory_rss', 300 * 1024 * 1024);
    });

    it('should call correct storage threshold', async () => {
      const healthResult = createHealthResult('ok');
      mockHealthCheckService.check.mockImplementation(async (indicators) => {
        for (const indicator of indicators) {
          await indicator();
        }
        return healthResult;
      });

      mockDisk.checkStorage.mockResolvedValue(createHealthIndicatorResult('storage', 'up'));

      await controller.check();

      expect(mockDisk.checkStorage).toHaveBeenCalledWith('storage', {
        path: '/',
        thresholdPercent: 0.5,
      });
    });
  });

  describe('ready - readiness probe', () => {
    it('should check readiness (database only)', async () => {
      const healthResult = createHealthResult('ok', {
        database: createHealthIndicatorResult('database', 'up'),
      });

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.ready();

      expect(mockHealthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function), // Database check only
      ]);
      expect(result.status).toBe('ok');
    });

    it('should fail readiness when database is down', async () => {
      const healthResult = createHealthResult('error', {
        database: createHealthIndicatorResult('database', 'down', 'Database unreachable'),
      });

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.ready();

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should execute database ping check', async () => {
      const healthResult = createHealthResult('ok');
      mockHealthCheckService.check.mockImplementation(async (indicators) => {
        for (const indicator of indicators) {
          await indicator();
        }
        return healthResult;
      });

      mockDb.pingCheck.mockResolvedValue(createHealthIndicatorResult('database', 'up'));

      await controller.ready();

      expect(mockDb.pingCheck).toHaveBeenCalledWith('database');
    });
  });

  describe('live - liveness probe', () => {
    it('should check liveness (memory only)', async () => {
      const healthResult = createHealthResult('ok', {
        memory_heap: createHealthIndicatorResult('memory_heap', 'up'),
      });

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.live();

      expect(mockHealthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function), // Memory check only
      ]);
      expect(result.status).toBe('ok');
    });

    it('should fail liveness when memory exceeds threshold', async () => {
      const healthResult = createHealthResult('error', {
        memory_heap: createHealthIndicatorResult('memory_heap', 'down', 'Memory usage too high'),
      });

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.live();

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should use higher memory threshold for liveness', async () => {
      const healthResult = createHealthResult('ok');
      mockHealthCheckService.check.mockImplementation(async (indicators) => {
        for (const indicator of indicators) {
          await indicator();
        }
        return healthResult;
      });

      mockMemory.checkHeap.mockResolvedValue(createHealthIndicatorResult('memory_heap', 'up'));

      await controller.live();

      expect(mockMemory.checkHeap).toHaveBeenCalledWith('memory_heap', 500 * 1024 * 1024);
    });
  });

  describe('Error handling', () => {
    it('should handle health check service errors', async () => {
      const error = new Error('Health check service error');
      mockHealthCheckService.check.mockRejectedValue(error);

      await expect(controller.check()).rejects.toThrow('Health check service error');
    });

    it('should handle individual indicator errors', async () => {
      mockHealthCheckService.check.mockImplementation(async (indicators) => {
        // Simulate indicator throwing error
        throw new Error('Indicator error');
      });

      await expect(controller.ready()).rejects.toThrow('Indicator error');
    });
  });

  describe('Integration patterns', () => {
    it('should handle Kubernetes health check patterns', async () => {
      // Simulate Kubernetes readiness probe
      const readyResult = createHealthResult('ok', {
        database: createHealthIndicatorResult('database', 'up'),
      });
      mockHealthCheckService.check.mockResolvedValue(readyResult);

      const readiness = await controller.ready();
      expect(readiness.status).toBe('ok');

      // Simulate Kubernetes liveness probe
      const liveResult = createHealthResult('ok', {
        memory_heap: createHealthIndicatorResult('memory_heap', 'up'),
      });
      mockHealthCheckService.check.mockResolvedValue(liveResult);

      const liveness = await controller.live();
      expect(liveness.status).toBe('ok');
    });

    it('should provide detailed health information for monitoring', async () => {
      const detailedResult = createHealthResult('ok', {
        database: { status: 'up', responseTime: 50 },
        memory_heap: { status: 'up', used: 100 * 1024 * 1024 },
        memory_rss: { status: 'up', used: 200 * 1024 * 1024 },
        storage: { status: 'up', free: 1000000000 },
      });

      mockHealthCheckService.check.mockResolvedValue(detailedResult);

      const result = await controller.check();

      expect(result.details).toBeDefined();
      expect(Object.keys(result.details)).toContain('database');
      expect(Object.keys(result.details)).toContain('memory_heap');
    });
  });
});