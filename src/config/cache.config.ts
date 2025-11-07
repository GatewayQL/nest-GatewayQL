import { CacheModuleOptions, CacheOptionsFactory } from '@nestjs/cache-manager';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Injectable()
export class CacheConfigService implements CacheOptionsFactory {
  private readonly logger = new Logger(CacheConfigService.name);

  constructor(private configService: ConfigService) {}

  async createCacheOptions(): Promise<CacheModuleOptions> {
    const useRedis =
      this.configService.get('REDIS_ENABLED', 'false') === 'true';

    if (useRedis) {
      try {
        this.logger.log('Initializing Redis cache with connection pooling...');

        const store = await redisStore({
          socket: {
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: parseInt(this.configService.get('REDIS_PORT', '6379'), 10),
            reconnectStrategy: (retries) => {
              // Exponential backoff: 2^retries * 100ms, max 3 seconds
              const delay = Math.min(Math.pow(2, retries) * 100, 3000);
              this.logger.warn(
                `Redis connection lost. Reconnecting in ${delay}ms (attempt ${retries + 1})`,
              );
              return delay;
            },
            connectTimeout: 10000, // 10 seconds
            keepAlive: 5000, // 5 seconds
          },
          password: this.configService.get('REDIS_PASSWORD'),
          ttl: parseInt(this.configService.get('CACHE_TTL', '60000'), 10),
          // Connection pool settings
          database: parseInt(this.configService.get('REDIS_DB', '0'), 10),
          lazyConnect: false, // Connect immediately to detect issues early

          // Error handling
          commandsQueueMaxLength: 1000, // Prevent memory issues with queued commands
        });

        // Add error listeners
        const client = store.client;

        client.on('error', (error) => {
          this.logger.error(
            `Redis client error: ${error.message}`,
            error.stack,
          );
        });

        client.on('connect', () => {
          this.logger.log('Redis client connected successfully');
        });

        client.on('ready', () => {
          this.logger.log('Redis client ready to accept commands');
        });

        client.on('reconnecting', () => {
          this.logger.warn('Redis client reconnecting...');
        });

        client.on('end', () => {
          this.logger.warn('Redis client connection ended');
        });

        this.logger.log('Redis cache initialized successfully');

        return {
          store: store as any,
          ttl: parseInt(this.configService.get('CACHE_TTL', '60000'), 10),
        };
      } catch (error) {
        this.logger.error(
          `Failed to connect to Redis: ${error.message}`,
          error.stack,
        );
        this.logger.warn('Falling back to in-memory cache');

        // Fallback to in-memory cache on Redis connection failure
        return this.createInMemoryCacheOptions();
      }
    }

    // Use in-memory cache when Redis is disabled
    this.logger.log('Using in-memory cache (Redis disabled)');
    return this.createInMemoryCacheOptions();
  }

  private createInMemoryCacheOptions(): CacheModuleOptions {
    return {
      ttl: parseInt(this.configService.get('CACHE_TTL', '60000'), 10),
      max: 100, // Maximum number of items in cache
    };
  }
}
