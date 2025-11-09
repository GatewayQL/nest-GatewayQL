import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLoggerService } from '../common/logger/logger.service';
import {
  PluginManifest,
  PluginContext,
  PluginConfig,
  PolicyDefinition,
  ConditionDefinition,
  RouteDefinition,
  GraphQLHookDefinition,
  GraphQLHookType,
} from './interfaces/plugin.interface';
import { PolicyRegistry } from './registries/policy.registry';
import { ConditionRegistry } from './registries/condition.registry';
import { RouteRegistry } from './registries/route.registry';
import { GraphQLHookRegistry } from './registries/graphql-hook.registry';

/**
 * Plugin Manager - responsible for loading and managing plugins
 * Similar to Express Gateway's plugin system
 */
@Injectable()
export class PluginManager implements OnModuleInit {
  private loadedPlugins: Map<string, PluginManifest> = new Map();
  private pluginConfigs: PluginConfig[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService,
    private readonly policyRegistry: PolicyRegistry,
    private readonly conditionRegistry: ConditionRegistry,
    private readonly routeRegistry: RouteRegistry,
    private readonly graphqlHookRegistry: GraphQLHookRegistry,
  ) {
    this.logger.setContext('PluginManager');
  }

  /**
   * Initialize and load all plugins
   */
  async onModuleInit() {
    this.logger.log('Initializing plugin system...');

    // Load plugin configurations
    this.pluginConfigs =
      this.configService.get<PluginConfig[]>('plugins') || [];

    // Load each plugin
    for (const config of this.pluginConfigs) {
      if (config.enabled !== false) {
        await this.loadPlugin(config);
      }
    }

    this.logger.log(
      `Plugin system initialized with ${this.loadedPlugins.size} plugin(s)`,
    );
  }

  /**
   * Load a single plugin
   */
  private async loadPlugin(config: PluginConfig): Promise<void> {
    try {
      this.logger.log(`Loading plugin: ${config.package}`);

      // Import the plugin module
      const pluginModule = await this.importPlugin(config.package);

      if (!pluginModule || typeof pluginModule.init !== 'function') {
        throw new Error(
          `Plugin ${config.package} does not export a valid manifest with init function`,
        );
      }

      const manifest: PluginManifest = pluginModule;

      // Check dependencies
      if (manifest.dependencies) {
        for (const dep of manifest.dependencies) {
          if (!this.loadedPlugins.has(dep)) {
            throw new Error(
              `Plugin ${manifest.name} depends on ${dep} which is not loaded`,
            );
          }
        }
      }

      // Create plugin context
      const context = this.createPluginContext(manifest, config);

      // Initialize plugin
      await manifest.init(context);

      // Store loaded plugin
      this.loadedPlugins.set(manifest.name, manifest);

      this.logger.log(
        `Plugin loaded: ${manifest.name} v${manifest.version}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to load plugin ${config.package}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Import plugin module dynamically
   */
  private async importPlugin(packageName: string): Promise<PluginManifest> {
    try {
      // Try to import as npm package first
      const module = await import(packageName);
      return module.default || module;
    } catch (error) {
      // Try to import as local file
      try {
        const localPath = require.resolve(packageName, {
          paths: [process.cwd()],
        });
        const module = await import(localPath);
        return module.default || module;
      } catch (localError) {
        throw new Error(
          `Cannot find plugin ${packageName}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Create plugin context for initialization
   */
  private createPluginContext(
    manifest: PluginManifest,
    config: PluginConfig,
  ): PluginContext {
    return {
      registerPolicy: (policy: PolicyDefinition) => {
        this.logger.debug(
          `Plugin ${manifest.name} registering policy: ${policy.name}`,
        );
        this.policyRegistry.register(policy);
      },

      registerCondition: (condition: ConditionDefinition) => {
        this.logger.debug(
          `Plugin ${manifest.name} registering condition: ${condition.name}`,
        );
        this.conditionRegistry.register(condition);
      },

      registerRoutes: (routes: RouteDefinition[]) => {
        this.logger.debug(
          `Plugin ${manifest.name} registering ${routes.length} route(s)`,
        );
        routes.forEach((route) => this.routeRegistry.register(route));
      },

      registerGraphQLHook: (hook: GraphQLHookDefinition) => {
        this.logger.debug(
          `Plugin ${manifest.name} registering GraphQL hook: ${hook.type}`,
        );
        this.graphqlHookRegistry.register(hook);
      },

      registerProvider: (provider: Type<any>) => {
        this.logger.debug(
          `Plugin ${manifest.name} registering provider: ${provider.name}`,
        );
        // Providers are registered at module level
      },

      getConfig: <T = any>(path?: string): T => {
        if (path) {
          return this.configService.get<T>(path);
        }
        return (config.settings || {}) as T;
      },

      logger: {
        log: (message: string, ...args: any[]) =>
          this.logger.log(`[${manifest.name}] ${message}`, ...args),
        error: (message: string, trace?: string, ...args: any[]) =>
          this.logger.error(`[${manifest.name}] ${message}`, trace, ...args),
        warn: (message: string, ...args: any[]) =>
          this.logger.warn(`[${manifest.name}] ${message}`, ...args),
        debug: (message: string, ...args: any[]) =>
          this.logger.debug(`[${manifest.name}] ${message}`, ...args),
        verbose: (message: string, ...args: any[]) =>
          this.logger.verbose(`[${manifest.name}] ${message}`, ...args),
      },

      settings: config.settings || {},
    };
  }

  /**
   * Get loaded plugin by name
   */
  getPlugin(name: string): PluginManifest | undefined {
    return this.loadedPlugins.get(name);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): PluginManifest[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Check if plugin is loaded
   */
  isPluginLoaded(name: string): boolean {
    return this.loadedPlugins.has(name);
  }
}
