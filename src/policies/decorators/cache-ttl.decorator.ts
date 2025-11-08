import { SetMetadata } from '@nestjs/common';

export const CACHE_TTL_KEY = 'cache_ttl';

/**
 * Set custom cache TTL for a route
 * @param ttl - Time to live in milliseconds
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_KEY, ttl);
