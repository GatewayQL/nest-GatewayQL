import { CacheModuleOptions, CacheOptionsFactory } from '@nestjs/cache-manager';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Injectable()
export class CacheConfigService implements CacheOptionsFactory {
  constructor(private configService: ConfigService) {}

  async createCacheOptions(): Promise<CacheModuleOptions> {
    const useRedis = this.configService.get('REDIS_ENABLED', 'false') === 'true';

    if (useRedis) {
      const store = await redisStore({
        socket: {
          host: this.configService.get('REDIS_HOST', 'localhost'),
          port: this.configService.get('REDIS_PORT', 6379),
        },
        password: this.configService.get('REDIS_PASSWORD'),
        ttl: this.configService.get('CACHE_TTL', 60000),
      });

      return {
        store: store as any,
        ttl: this.configService.get('CACHE_TTL', 60000),
      };
    }

    // Fallback to in-memory cache
    return {
      ttl: this.configService.get('CACHE_TTL', 60000),
      max: 100,
    };
  }
}
