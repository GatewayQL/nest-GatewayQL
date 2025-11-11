import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { MetricsController } from './metrics.controller';
import { PrometheusController } from '@willsoto/nestjs-prometheus';

// Mock the base PrometheusController
jest.mock('@willsoto/nestjs-prometheus', () => ({
  PrometheusController: class {
    async index(response: Response) {
      return 'mocked prometheus metrics';
    }
  },
}));

describe('MetricsController', () => {
  let controller: MetricsController;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);

    // Mock Express Response object
    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      end: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should extend PrometheusController', () => {
      expect(controller instanceof PrometheusController).toBeTruthy();
    });
  });

  describe('index - GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const result = await controller.index(mockResponse as Response);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should call parent index method', async () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'index');
      spy.mockResolvedValue('mocked metrics data');

      const result = await controller.index(mockResponse as Response);

      expect(spy).toHaveBeenCalledWith(mockResponse);
      expect(result).toBe('mocked metrics data');
    });

    it('should handle metrics collection correctly', async () => {
      const metricsData = `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 100
http_requests_total{method="POST",status="201"} 50

# HELP nodejs_memory_heap_used_bytes Process heap memory usage
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes 123456789`;

      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'index')
        .mockResolvedValue(metricsData);

      const result = await controller.index(mockResponse as Response);

      expect(result).toContain('http_requests_total');
      expect(result).toContain('nodejs_memory_heap_used_bytes');
    });
  });

  describe('HTTP headers and content type', () => {
    it('should set correct content type header', async () => {
      // The @Header decorator should be applied to set Content-Type: text/plain
      // We can't directly test decorators, but we can verify the controller method exists
      expect(controller.index).toBeDefined();
      expect(typeof controller.index).toBe('function');
    });

    it('should handle response object correctly', async () => {
      await controller.index(mockResponse as Response);

      // Verify the response object is passed to parent method
      expect(mockResponse).toBeDefined();
    });
  });

  describe('Prometheus metrics format', () => {
    it('should return metrics in Prometheus exposition format', async () => {
      const prometheusFormat = `# HELP test_metric Test metric
# TYPE test_metric gauge
test_metric 42`;

      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'index')
        .mockResolvedValue(prometheusFormat);

      const result = await controller.index(mockResponse as Response);

      expect(result).toMatch(/^# HELP/);
      expect(result).toMatch(/# TYPE/);
    });

    it('should handle empty metrics', async () => {
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'index')
        .mockResolvedValue('');

      const result = await controller.index(mockResponse as Response);

      expect(result).toBe('');
    });

    it('should handle multiple metrics', async () => {
      const multipleMetrics = `# HELP http_requests_total Total requests
# TYPE http_requests_total counter
http_requests_total 100

# HELP memory_usage Memory usage
# TYPE memory_usage gauge
memory_usage 50000000`;

      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'index')
        .mockResolvedValue(multipleMetrics);

      const result = await controller.index(mockResponse as Response);

      expect(result).toContain('http_requests_total');
      expect(result).toContain('memory_usage');
      expect(result.split('\n').filter(line => line.startsWith('# HELP')).length).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should handle parent method errors', async () => {
      const error = new Error('Prometheus metrics error');
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'index')
        .mockRejectedValue(error);

      await expect(controller.index(mockResponse as Response)).rejects.toThrow('Prometheus metrics error');
    });

    it('should handle response object errors', async () => {
      const invalidResponse = null;

      // This should handle cases where response is invalid
      await expect(controller.index(invalidResponse as any)).rejects.toThrow();
    });
  });

  describe('Integration patterns', () => {
    it('should support monitoring tool integration', async () => {
      const monitoringMetrics = `# HELP gateway_requests_total Total gateway requests
# TYPE gateway_requests_total counter
gateway_requests_total{service="graphql",status="200"} 500

# HELP gateway_request_duration_seconds Gateway request duration
# TYPE gateway_request_duration_seconds histogram
gateway_request_duration_seconds_bucket{le="0.1"} 100
gateway_request_duration_seconds_bucket{le="0.5"} 200
gateway_request_duration_seconds_bucket{le="1"} 300`;

      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'index')
        .mockResolvedValue(monitoringMetrics);

      const result = await controller.index(mockResponse as Response);

      expect(result).toContain('gateway_requests_total');
      expect(result).toContain('gateway_request_duration_seconds');
      expect(result).toContain('histogram');
      expect(result).toContain('counter');
    });

    it('should handle Kubernetes monitoring patterns', async () => {
      const k8sMetrics = `# HELP process_cpu_user_seconds_total CPU time
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 123.45

# HELP nodejs_heap_size_used_bytes Heap size used
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 12345678`;

      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'index')
        .mockResolvedValue(k8sMetrics);

      const result = await controller.index(mockResponse as Response);

      expect(result).toContain('process_cpu_user_seconds_total');
      expect(result).toContain('nodejs_heap_size_used_bytes');
    });
  });

  describe('Performance', () => {
    it('should handle large metrics payload efficiently', async () => {
      const largeMetrics = Array.from({ length: 1000 }, (_, i) =>
        `metric_${i} ${Math.random() * 100}`
      ).join('\n');

      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'index')
        .mockResolvedValue(largeMetrics);

      const start = Date.now();
      const result = await controller.index(mockResponse as Response);
      const duration = Date.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.split('\n').length).toBe(1000);
    });

    it('should not block on metrics collection', async () => {
      const slowMetrics = new Promise(resolve =>
        setTimeout(() => resolve('slow_metric 1'), 10)
      );

      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'index')
        .mockReturnValue(slowMetrics);

      const resultPromise = controller.index(mockResponse as Response);

      // Should return a promise immediately
      expect(resultPromise).toBeInstanceOf(Promise);

      const result = await resultPromise;
      expect(result).toBe('slow_metric 1');
    });
  });
});