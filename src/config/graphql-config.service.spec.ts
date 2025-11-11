import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GraphQLConfigService } from './graphql-config.service';
import { IntrospectAndCompose } from '@apollo/gateway';

// Mock Apollo Gateway
jest.mock('@apollo/gateway', () => ({
  IntrospectAndCompose: jest.fn().mockImplementation((config) => ({
    supergraphSdl: `mock-supergraph-sdl-${JSON.stringify(config)}`,
  })),
}));

describe('GraphQLConfigService', () => {
  let service: GraphQLConfigService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphQLConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GraphQLConfigService>(GraphQLConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(configService).toBeDefined();
    });
  });

  describe('createGatewayOptions', () => {
    it('should create gateway options with IntrospectAndCompose', () => {
      const mockServiceEndpoints = [
        { name: 'service1', url: 'http://localhost:3001/graphql' },
        { name: 'service2', url: 'http://localhost:3002/graphql' },
      ];

      mockConfigService.get.mockReturnValue(mockServiceEndpoints);

      const options = service.createGatewayOptions();

      expect(options).toHaveProperty('gateway');
      expect(options.gateway).toHaveProperty('supergraphSdl');
      expect(IntrospectAndCompose).toHaveBeenCalledWith({
        subgraphs: mockServiceEndpoints,
      });
    });

    it('should use default service when no config provided', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const options = service.createGatewayOptions();

      expect(options.gateway.supergraphSdl).toBeDefined();
      expect(IntrospectAndCompose).toHaveBeenCalledWith({
        subgraphs: [{ name: 'default', url: 'http://localhost:3001/graphql' }],
      });
    });

    it('should handle empty service endpoints array', () => {
      mockConfigService.get.mockReturnValue([]);

      const options = service.createGatewayOptions();

      expect(IntrospectAndCompose).toHaveBeenCalledWith({
        subgraphs: [],
      });
    });
  });

  describe('serviceList', () => {
    it('should return configured service endpoints', () => {
      const expectedServices = [
        { name: 'users', url: 'http://users-service:3001/graphql' },
        { name: 'products', url: 'http://products-service:3002/graphql' },
        { name: 'orders', url: 'http://orders-service:3003/graphql' },
      ];

      mockConfigService.get.mockReturnValue(expectedServices);

      const services = service.serviceList();

      expect(configService.get).toHaveBeenCalledWith('serviceEndpoints');
      expect(services).toEqual(expectedServices);
    });

    it('should return default service when config is undefined', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const services = service.serviceList();

      expect(services).toEqual([
        { name: 'default', url: 'http://localhost:3001/graphql' },
      ]);
    });

    it('should return default service when config is not an array', () => {
      const invalidConfig = { name: 'invalid', url: 'invalid' };
      mockConfigService.get.mockReturnValue(invalidConfig);

      const services = service.serviceList();

      expect(services).toEqual([
        { name: 'default', url: 'http://localhost:3001/graphql' },
      ]);
    });

    it('should handle null config gracefully', () => {
      mockConfigService.get.mockReturnValue(null);

      const services = service.serviceList();

      expect(services).toEqual([
        { name: 'default', url: 'http://localhost:3001/graphql' },
      ]);
    });

    it('should handle string config gracefully', () => {
      mockConfigService.get.mockReturnValue('invalid-config-string');

      const services = service.serviceList();

      expect(services).toEqual([
        { name: 'default', url: 'http://localhost:3001/graphql' },
      ]);
    });
  });

  describe('GraphQL Federation patterns', () => {
    it('should support microservices federation', () => {
      const microservices = [
        { name: 'user-service', url: 'http://user-service:4001/graphql' },
        { name: 'product-service', url: 'http://product-service:4002/graphql' },
        { name: 'order-service', url: 'http://order-service:4003/graphql' },
        { name: 'notification-service', url: 'http://notification-service:4004/graphql' },
      ];

      mockConfigService.get.mockReturnValue(microservices);

      const options = service.createGatewayOptions();
      const services = service.serviceList();

      expect(services).toHaveLength(4);
      expect(services).toEqual(microservices);
      expect(IntrospectAndCompose).toHaveBeenCalledWith({
        subgraphs: microservices,
      });
    });

    it('should handle service discovery patterns', () => {
      const discoveredServices = [
        { name: 'auth', url: 'https://auth-service.example.com/graphql' },
        { name: 'inventory', url: 'https://inventory-service.example.com/graphql' },
      ];

      mockConfigService.get.mockReturnValue(discoveredServices);

      const services = service.serviceList();

      expect(services).toEqual(discoveredServices);
      expect(services.every(service => service.url.startsWith('https://'))).toBeTruthy();
    });

    it('should support development vs production URLs', () => {
      const devServices = [
        { name: 'service1', url: 'http://localhost:3001/graphql' },
        { name: 'service2', url: 'http://localhost:3002/graphql' },
      ];

      const prodServices = [
        { name: 'service1', url: 'https://service1.prod.example.com/graphql' },
        { name: 'service2', url: 'https://service2.prod.example.com/graphql' },
      ];

      // Test development configuration
      mockConfigService.get.mockReturnValue(devServices);
      let services = service.serviceList();
      expect(services).toEqual(devServices);
      expect(services.every(s => s.url.includes('localhost'))).toBeTruthy();

      // Test production configuration
      mockConfigService.get.mockReturnValue(prodServices);
      services = service.serviceList();
      expect(services).toEqual(prodServices);
      expect(services.every(s => s.url.includes('prod.example.com'))).toBeTruthy();
    });
  });

  describe('Error handling and validation', () => {
    it('should handle ConfigService errors gracefully', () => {
      mockConfigService.get.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      expect(() => service.serviceList()).toThrow('Configuration error');
    });

    it('should validate service endpoint structure', () => {
      const invalidServices = [
        { name: 'service1' }, // Missing URL
        { url: 'http://localhost:3001/graphql' }, // Missing name
        { name: '', url: 'http://localhost:3002/graphql' }, // Empty name
        { name: 'service2', url: '' }, // Empty URL
      ];

      mockConfigService.get.mockReturnValue(invalidServices);

      const services = service.serviceList();

      // Should fall back to default since array contains invalid entries
      // This tests the robustness of the service configuration
      expect(services).toEqual([
        { name: 'default', url: 'http://localhost:3001/graphql' },
      ]);
    });

    it('should handle malformed service objects', () => {
      const malformedServices = [
        null,
        undefined,
        { invalidProperty: 'value' },
        'string-instead-of-object',
        123,
      ];

      mockConfigService.get.mockReturnValue(malformedServices);

      const services = service.serviceList();

      expect(services).toEqual([
        { name: 'default', url: 'http://localhost:3001/graphql' },
      ]);
    });
  });

  describe('Configuration integration', () => {
    it('should use correct configuration key', () => {
      mockConfigService.get.mockReturnValue([]);

      service.serviceList();

      expect(configService.get).toHaveBeenCalledWith('serviceEndpoints');
      expect(configService.get).toHaveBeenCalledTimes(1);
    });

    it('should handle environment-specific configurations', () => {
      const envConfigs = {
        development: [
          { name: 'dev-service', url: 'http://dev-service:3001/graphql' },
        ],
        production: [
          { name: 'prod-service', url: 'https://prod-service.com/graphql' },
        ],
        test: [
          { name: 'test-service', url: 'http://test-service:3001/graphql' },
        ],
      };

      Object.entries(envConfigs).forEach(([env, services]) => {
        mockConfigService.get.mockReturnValue(services);

        const result = service.serviceList();

        expect(result).toEqual(services);
        expect(result[0].name).toContain(env.substring(0, 3)); // Use first 3 chars (dev, pro, tes)
      });
    });

    it('should support dynamic service configuration', () => {
      const dynamicServices = [
        { name: 'dynamic-service-1', url: 'http://dynamic1.local:3001/graphql' },
        { name: 'dynamic-service-2', url: 'http://dynamic2.local:3002/graphql' },
      ];

      mockConfigService.get.mockReturnValue(dynamicServices);

      const options = service.createGatewayOptions();
      const services = service.serviceList();

      expect(services).toEqual(dynamicServices);
      expect(IntrospectAndCompose).toHaveBeenCalledWith({
        subgraphs: dynamicServices,
      });
    });
  });

  describe('Performance and caching', () => {
    it('should not cache service list between calls', () => {
      const firstCall = [
        { name: 'service1', url: 'http://localhost:3001/graphql' },
      ];
      const secondCall = [
        { name: 'service2', url: 'http://localhost:3002/graphql' },
      ];

      mockConfigService.get.mockReturnValueOnce(firstCall);
      mockConfigService.get.mockReturnValueOnce(secondCall);

      const firstResult = service.serviceList();
      const secondResult = service.serviceList();

      expect(firstResult).toEqual(firstCall);
      expect(secondResult).toEqual(secondCall);
      expect(configService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid successive calls', () => {
      const services = [
        { name: 'rapid-service', url: 'http://localhost:3001/graphql' },
      ];
      mockConfigService.get.mockReturnValue(services);

      const promises = Array.from({ length: 10 }, () => service.serviceList());
      const results = Promise.all(promises);

      expect(results).resolves.toBeDefined();
    });
  });
});