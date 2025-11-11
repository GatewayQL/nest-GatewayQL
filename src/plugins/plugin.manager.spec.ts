import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PluginManager } from './plugin.manager';
import { CustomLoggerService } from '../common/logger/logger.service';
import { PolicyRegistry } from './registries/policy.registry';
import { ConditionRegistry } from './registries/condition.registry';
import { RouteRegistry } from './registries/route.registry';
import { GraphQLHookRegistry } from './registries/graphql-hook.registry';
import {
  PluginManifest,
  PluginConfig,
  PluginContext,
  GraphQLHookType,
} from './interfaces/plugin.interface';

// Mock plugin manifest
const mockPlugin: PluginManifest = {
  name: 'test-plugin',
  version: '1.0.0',
  description: 'Test plugin',
  author: 'Test Author',
  init: jest.fn(),
  dependencies: [],
};

const mockPluginWithDependencies: PluginManifest = {
  name: 'dependent-plugin',
  version: '1.0.0',
  init: jest.fn(),
  dependencies: ['test-plugin'],
};

describe('PluginManager', () => {
  let manager: PluginManager;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<CustomLoggerService>;
  let policyRegistry: jest.Mocked<PolicyRegistry>;
  let conditionRegistry: jest.Mocked<ConditionRegistry>;
  let routeRegistry: jest.Mocked<RouteRegistry>;
  let graphqlHookRegistry: jest.Mocked<GraphQLHookRegistry>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginManager,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
        {
          provide: PolicyRegistry,
          useValue: {
            register: jest.fn(),
          },
        },
        {
          provide: ConditionRegistry,
          useValue: {
            register: jest.fn(),
          },
        },
        {
          provide: RouteRegistry,
          useValue: {
            register: jest.fn(),
          },
        },
        {
          provide: GraphQLHookRegistry,
          useValue: {
            register: jest.fn(),
          },
        },
      ],
    }).compile();

    manager = module.get<PluginManager>(PluginManager);
    configService = module.get(ConfigService);
    logger = module.get(CustomLoggerService);
    policyRegistry = module.get(PolicyRegistry);
    conditionRegistry = module.get(ConditionRegistry);
    routeRegistry = module.get(RouteRegistry);
    graphqlHookRegistry = module.get(GraphQLHookRegistry);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set logger context', () => {
      expect(logger.setContext).toHaveBeenCalledWith('PluginManager');
    });
  });

  describe('onModuleInit', () => {
    it('should initialize with no plugins when config is empty', async () => {
      configService.get.mockReturnValue([]);

      await manager.onModuleInit();

      expect(logger.log).toHaveBeenCalledWith('Initializing plugin system...');
      expect(logger.log).toHaveBeenCalledWith(
        'Plugin system initialized with 0 plugin(s)',
      );
    });

    it('should load enabled plugins', async () => {
      const pluginConfig: PluginConfig = {
        package: 'test-plugin',
        enabled: true,
        settings: { key: 'value' },
      };

      configService.get.mockReturnValue([pluginConfig]);

      // Mock dynamic import
      const originalImport = manager['importPlugin'];
      manager['importPlugin'] = jest.fn().mockResolvedValue(mockPlugin);

      await manager.onModuleInit();

      expect(mockPlugin.init).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        'Plugin system initialized with 1 plugin(s)',
      );

      // Restore
      manager['importPlugin'] = originalImport;
    });

    it('should skip disabled plugins', async () => {
      const pluginConfig: PluginConfig = {
        package: 'test-plugin',
        enabled: false,
      };

      configService.get.mockReturnValue([pluginConfig]);

      await manager.onModuleInit();

      expect(logger.log).toHaveBeenCalledWith(
        'Plugin system initialized with 0 plugin(s)',
      );
    });

    it('should handle plugin loading errors', async () => {
      const pluginConfig: PluginConfig = {
        package: 'invalid-plugin',
        enabled: true,
      };

      configService.get.mockReturnValue([pluginConfig]);

      const originalImport = manager['importPlugin'];
      manager['importPlugin'] = jest
        .fn()
        .mockRejectedValue(new Error('Plugin not found'));

      await expect(manager.onModuleInit()).rejects.toThrow('Plugin not found');
      expect(logger.error).toHaveBeenCalled();

      // Restore
      manager['importPlugin'] = originalImport;
    });
  });

  describe('loadPlugin', () => {
    it('should validate plugin manifest', async () => {
      const invalidPlugin = { name: 'invalid' }; // missing init function
      const config: PluginConfig = { package: 'invalid-plugin' };

      const originalImport = manager['importPlugin'];
      manager['importPlugin'] = jest.fn().mockResolvedValue(invalidPlugin);

      await expect(manager['loadPlugin'](config)).rejects.toThrow(
        'Plugin invalid-plugin does not export a valid manifest with init function',
      );

      // Restore
      manager['importPlugin'] = originalImport;
    });

    it('should check plugin dependencies', async () => {
      const config: PluginConfig = { package: 'dependent-plugin' };

      const originalImport = manager['importPlugin'];
      manager['importPlugin'] = jest
        .fn()
        .mockResolvedValue(mockPluginWithDependencies);

      await expect(manager['loadPlugin'](config)).rejects.toThrow(
        'Plugin dependent-plugin depends on test-plugin which is not loaded',
      );

      // Restore
      manager['importPlugin'] = originalImport;
    });

    it('should load plugin with satisfied dependencies', async () => {
      // First load the dependency
      const depConfig: PluginConfig = { package: 'test-plugin' };
      const originalImport = manager['importPlugin'];
      manager['importPlugin'] = jest.fn().mockResolvedValue(mockPlugin);

      await manager['loadPlugin'](depConfig);

      // Now load dependent plugin
      const config: PluginConfig = { package: 'dependent-plugin' };
      manager['importPlugin'] = jest
        .fn()
        .mockResolvedValue(mockPluginWithDependencies);

      await manager['loadPlugin'](config);

      expect(mockPluginWithDependencies.init).toHaveBeenCalled();

      // Restore
      manager['importPlugin'] = originalImport;
    });
  });

  describe('importPlugin', () => {
    it('should handle npm package import', async () => {
      const packageName = '@test/plugin';

      // Spy on the importPlugin method and mock its implementation
      const importPluginSpy = jest.spyOn(manager as any, 'importPlugin')
        .mockResolvedValue(mockPlugin);

      const result = await manager['importPlugin'](packageName);

      expect(result).toBe(mockPlugin);
      expect(importPluginSpy).toHaveBeenCalledWith(packageName);

      importPluginSpy.mockRestore();
    });

    it('should handle default export', async () => {
      const packageName = 'test-plugin';

      // Spy on the importPlugin method and mock its implementation
      const importPluginSpy = jest.spyOn(manager as any, 'importPlugin')
        .mockResolvedValue(mockPlugin);

      const result = await manager['importPlugin'](packageName);

      expect(result).toBe(mockPlugin);
      expect(importPluginSpy).toHaveBeenCalledWith(packageName);

      importPluginSpy.mockRestore();
    });

    it('should throw error for missing plugin', async () => {
      const packageName = 'missing-plugin';

      // Spy on the importPlugin method and mock it to throw an error
      const importPluginSpy = jest.spyOn(manager as any, 'importPlugin')
        .mockRejectedValue(new Error(`Cannot find plugin ${packageName}: Not found`));

      await expect(manager['importPlugin'](packageName)).rejects.toThrow(
        'Cannot find plugin missing-plugin',
      );

      importPluginSpy.mockRestore();
    });
  });

  describe('createPluginContext', () => {
    it('should create plugin context with all required methods', () => {
      const config: PluginConfig = {
        package: 'test-plugin',
        settings: { key: 'value' },
      };

      const context = manager['createPluginContext'](mockPlugin, config);

      expect(context).toBeDefined();
      expect(typeof context.registerPolicy).toBe('function');
      expect(typeof context.registerCondition).toBe('function');
      expect(typeof context.registerRoutes).toBe('function');
      expect(typeof context.registerGraphQLHook).toBe('function');
      expect(typeof context.registerProvider).toBe('function');
      expect(typeof context.getConfig).toBe('function');
      expect(context.logger).toBeDefined();
      expect(context.settings).toEqual({ key: 'value' });
    });

    it('should register policy when called', () => {
      const config: PluginConfig = { package: 'test-plugin' };
      const context = manager['createPluginContext'](mockPlugin, config);

      const mockPolicy = {
        name: 'test-policy',
        policy: jest.fn(),
      };

      context.registerPolicy(mockPolicy);

      expect(policyRegistry.register).toHaveBeenCalledWith(mockPolicy);
      expect(logger.debug).toHaveBeenCalledWith(
        'Plugin test-plugin registering policy: test-policy',
      );
    });

    it('should register condition when called', () => {
      const config: PluginConfig = { package: 'test-plugin' };
      const context = manager['createPluginContext'](mockPlugin, config);

      const mockCondition = {
        name: 'test-condition',
        handler: jest.fn(),
      };

      context.registerCondition(mockCondition);

      expect(conditionRegistry.register).toHaveBeenCalledWith(mockCondition);
      expect(logger.debug).toHaveBeenCalledWith(
        'Plugin test-plugin registering condition: test-condition',
      );
    });

    it('should register routes when called', () => {
      const config: PluginConfig = { package: 'test-plugin' };
      const context = manager['createPluginContext'](mockPlugin, config);

      const mockRoutes = [
        {
          method: 'GET' as const,
          path: '/test',
          handler: jest.fn(),
        },
      ];

      context.registerRoutes(mockRoutes);

      expect(routeRegistry.register).toHaveBeenCalledWith(mockRoutes[0]);
      expect(logger.debug).toHaveBeenCalledWith(
        'Plugin test-plugin registering 1 route(s)',
      );
    });

    it('should register GraphQL hook when called', () => {
      const config: PluginConfig = { package: 'test-plugin' };
      const context = manager['createPluginContext'](mockPlugin, config);

      const mockHook = {
        type: GraphQLHookType.SCHEMA_TRANSFORM,
        handler: jest.fn(),
      };

      context.registerGraphQLHook(mockHook);

      expect(graphqlHookRegistry.register).toHaveBeenCalledWith(mockHook);
      expect(logger.debug).toHaveBeenCalledWith(
        'Plugin test-plugin registering GraphQL hook: schema_transform',
      );
    });

    it('should get config from ConfigService when path provided', () => {
      const config: PluginConfig = { package: 'test-plugin' };
      const context = manager['createPluginContext'](mockPlugin, config);

      configService.get.mockReturnValue('global-value');

      const result = context.getConfig('global.setting');

      expect(configService.get).toHaveBeenCalledWith('global.setting');
      expect(result).toBe('global-value');
    });

    it('should return plugin settings when no path provided', () => {
      const config: PluginConfig = {
        package: 'test-plugin',
        settings: { key: 'value' },
      };
      const context = manager['createPluginContext'](mockPlugin, config);

      const result = context.getConfig();

      expect(result).toEqual({ key: 'value' });
    });

    it('should provide logger with plugin name prefix', () => {
      const config: PluginConfig = { package: 'test-plugin' };
      const context = manager['createPluginContext'](mockPlugin, config);

      context.logger.log('test message');
      context.logger.error('error message', 'stack');
      context.logger.warn('warning');
      context.logger.debug('debug info');
      context.logger.verbose('verbose info');

      expect(logger.log).toHaveBeenCalledWith('[test-plugin] test message');
      expect(logger.error).toHaveBeenCalledWith('[test-plugin] error message', 'stack');
      expect(logger.warn).toHaveBeenCalledWith('[test-plugin] warning');
      expect(logger.debug).toHaveBeenCalledWith('[test-plugin] debug info');
      expect(logger.verbose).toHaveBeenCalledWith('[test-plugin] verbose info');
    });
  });

  describe('getPlugin', () => {
    it('should return plugin if loaded', async () => {
      const config: PluginConfig = { package: 'test-plugin' };
      const originalImport = manager['importPlugin'];
      manager['importPlugin'] = jest.fn().mockResolvedValue(mockPlugin);

      await manager['loadPlugin'](config);
      const result = manager.getPlugin('test-plugin');

      expect(result).toBe(mockPlugin);

      // Restore
      manager['importPlugin'] = originalImport;
    });

    it('should return undefined if plugin not loaded', () => {
      const result = manager.getPlugin('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getAllPlugins', () => {
    it('should return all loaded plugins', async () => {
      const config: PluginConfig = { package: 'test-plugin' };
      const originalImport = manager['importPlugin'];
      manager['importPlugin'] = jest.fn().mockResolvedValue(mockPlugin);

      await manager['loadPlugin'](config);
      const result = manager.getAllPlugins();

      expect(result).toEqual([mockPlugin]);

      // Restore
      manager['importPlugin'] = originalImport;
    });

    it('should return empty array if no plugins loaded', () => {
      const result = manager.getAllPlugins();

      expect(result).toEqual([]);
    });
  });

  describe('isPluginLoaded', () => {
    it('should return true if plugin is loaded', async () => {
      const config: PluginConfig = { package: 'test-plugin' };
      const originalImport = manager['importPlugin'];
      manager['importPlugin'] = jest.fn().mockResolvedValue(mockPlugin);

      await manager['loadPlugin'](config);
      const result = manager.isPluginLoaded('test-plugin');

      expect(result).toBe(true);

      // Restore
      manager['importPlugin'] = originalImport;
    });

    it('should return false if plugin is not loaded', () => {
      const result = manager.isPluginLoaded('non-existent');

      expect(result).toBe(false);
    });
  });
});