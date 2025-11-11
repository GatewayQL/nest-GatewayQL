import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { CacheTTL, CACHE_TTL_KEY } from './cache-ttl.decorator';

describe('CacheTTL Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('@CacheTTL()', () => {
    it('should set metadata with correct key and value', () => {
      const ttlValue = 3600000; // 1 hour in milliseconds

      // Create a test class with the decorator
      @CacheTTL(ttlValue)
      class TestController {
        @CacheTTL(ttlValue)
        testMethod() {
          return 'test';
        }
      }

      const controller = new TestController();

      // Check class-level metadata
      const classMetadata = reflector.get(CACHE_TTL_KEY, TestController);
      expect(classMetadata).toBe(ttlValue);

      // Check method-level metadata
      const methodMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.testMethod,
      );
      expect(methodMetadata).toBe(ttlValue);
    });

    it('should work with different TTL values', () => {
      const shortTTL = 60000; // 1 minute
      const mediumTTL = 1800000; // 30 minutes
      const longTTL = 86400000; // 24 hours

      class VariableTTLController {
        @CacheTTL(shortTTL)
        shortCacheMethod() {
          return 'short cache';
        }

        @CacheTTL(mediumTTL)
        mediumCacheMethod() {
          return 'medium cache';
        }

        @CacheTTL(longTTL)
        longCacheMethod() {
          return 'long cache';
        }
      }

      const controller = new VariableTTLController();

      // Check different TTL values
      const shortMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.shortCacheMethod,
      );
      expect(shortMetadata).toBe(shortTTL);

      const mediumMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.mediumCacheMethod,
      );
      expect(mediumMetadata).toBe(mediumTTL);

      const longMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.longCacheMethod,
      );
      expect(longMetadata).toBe(longTTL);
    });

    it('should work when applied to class only', () => {
      const classTTL = 5000; // 5 seconds

      @CacheTTL(classTTL)
      class CachedController {
        regularMethod() {
          return 'regular';
        }
      }

      const controller = new CachedController();

      // Class should have cache TTL metadata
      const classMetadata = reflector.get(CACHE_TTL_KEY, CachedController);
      expect(classMetadata).toBe(classTTL);

      // Method should not have its own metadata
      const methodMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.regularMethod,
      );
      expect(methodMetadata).toBeUndefined();
    });

    it('should work when applied to method only', () => {
      const methodTTL = 10000; // 10 seconds

      class UncachedController {
        @CacheTTL(methodTTL)
        cachedMethod() {
          return 'cached';
        }

        uncachedMethod() {
          return 'uncached';
        }
      }

      const controller = new UncachedController();

      // Class should not have cache TTL metadata
      const classMetadata = reflector.get(CACHE_TTL_KEY, UncachedController);
      expect(classMetadata).toBeUndefined();

      // Cached method should have metadata
      const cachedMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.cachedMethod,
      );
      expect(cachedMetadata).toBe(methodTTL);

      // Uncached method should not have metadata
      const uncachedMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.uncachedMethod,
      );
      expect(uncachedMetadata).toBeUndefined();
    });

    it('should handle zero TTL value', () => {
      const zeroTTL = 0;

      class ZeroTTLController {
        @CacheTTL(zeroTTL)
        noCacheMethod() {
          return 'no cache';
        }
      }

      const controller = new ZeroTTLController();

      const metadata = reflector.get(
        CACHE_TTL_KEY,
        controller.noCacheMethod,
      );
      expect(metadata).toBe(0);
    });

    it('should handle negative TTL value', () => {
      const negativeTTL = -1;

      class NegativeTTLController {
        @CacheTTL(negativeTTL)
        negativeCacheMethod() {
          return 'negative cache';
        }
      }

      const controller = new NegativeTTLController();

      const metadata = reflector.get(
        CACHE_TTL_KEY,
        controller.negativeCacheMethod,
      );
      expect(metadata).toBe(-1);
    });

    it('should handle very large TTL values', () => {
      const largeTTL = Number.MAX_SAFE_INTEGER;

      class LargeTTLController {
        @CacheTTL(largeTTL)
        longTermCacheMethod() {
          return 'long term cache';
        }
      }

      const controller = new LargeTTLController();

      const metadata = reflector.get(
        CACHE_TTL_KEY,
        controller.longTermCacheMethod,
      );
      expect(metadata).toBe(largeTTL);
    });

    it('should work with method override when both class and method are decorated', () => {
      const classTTL = 7200000; // 2 hours
      const methodTTL = 300000; // 5 minutes

      @CacheTTL(classTTL)
      class OverrideCacheController {
        @CacheTTL(methodTTL)
        overriddenMethod() {
          return 'overridden cache';
        }

        inheritedMethod() {
          return 'inherited cache';
        }
      }

      const controller = new OverrideCacheController();

      // Class metadata
      const classMetadata = reflector.get(CACHE_TTL_KEY, OverrideCacheController);
      expect(classMetadata).toBe(classTTL);

      // Overridden method metadata should be different from class
      const overriddenMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.overriddenMethod,
      );
      expect(overriddenMetadata).toBe(methodTTL);

      // Inherited method should not have its own metadata
      const inheritedMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.inheritedMethod,
      );
      expect(inheritedMetadata).toBeUndefined();
    });

    it('should work with reflector.getAllAndOverride method', () => {
      const baseTTL = 1800000; // 30 minutes
      const derivedTTL = 900000; // 15 minutes

      @CacheTTL(baseTTL)
      class BaseController {
        @CacheTTL(baseTTL)
        overriddenMethod() {
          return 'base';
        }

        baseMethod() {
          return 'base only';
        }
      }

      @CacheTTL(derivedTTL)
      class DerivedController extends BaseController {
        @CacheTTL(derivedTTL)
        overriddenMethod() {
          return 'derived';
        }

        derivedMethod() {
          return 'derived only';
        }
      }

      const derivedController = new DerivedController();

      // Test getAllAndOverride for class hierarchy (should get derived class value)
      const classMetadata = reflector.getAllAndOverride(CACHE_TTL_KEY, [
        DerivedController,
        BaseController,
      ]);
      expect(classMetadata).toBe(derivedTTL);

      // Test getAllAndOverride for method hierarchy (should get derived method value)
      const methodMetadata = reflector.getAllAndOverride(CACHE_TTL_KEY, [
        derivedController.overriddenMethod,
        BaseController.prototype.overriddenMethod,
      ]);
      expect(methodMetadata).toBe(derivedTTL);
    });

    it('should work with async methods', () => {
      const asyncTTL = 120000; // 2 minutes

      class AsyncController {
        @CacheTTL(asyncTTL)
        async asyncCachedMethod() {
          return Promise.resolve('async cached');
        }

        async asyncUncachedMethod() {
          return Promise.resolve('async uncached');
        }
      }

      const controller = new AsyncController();

      // Async cached method should have metadata
      const cachedMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.asyncCachedMethod,
      );
      expect(cachedMetadata).toBe(asyncTTL);

      // Async uncached method should not have metadata
      const uncachedMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.asyncUncachedMethod,
      );
      expect(uncachedMetadata).toBeUndefined();
    });

    it('should work with static methods', () => {
      const staticTTL = 600000; // 10 minutes

      class StaticController {
        @CacheTTL(staticTTL)
        static staticCachedMethod() {
          return 'static cached';
        }

        static staticUncachedMethod() {
          return 'static uncached';
        }
      }

      // Static cached method should have metadata
      const cachedMetadata = reflector.get(
        CACHE_TTL_KEY,
        StaticController.staticCachedMethod,
      );
      expect(cachedMetadata).toBe(staticTTL);

      // Static uncached method should not have metadata
      const uncachedMetadata = reflector.get(
        CACHE_TTL_KEY,
        StaticController.staticUncachedMethod,
      );
      expect(uncachedMetadata).toBeUndefined();
    });

    it.skip('should work with getter and setter methods', () => {
      // Note: @CacheTTL decorator doesn't support getters/setters as it uses SetMetadata
      // which is designed for methods and classes, not property descriptors.
      // This test is skipped as the functionality is not supported by NestJS decorators.
    });

    it('should work with inheritance hierarchies', () => {
      const baseTTL = 3600000; // 1 hour
      const middleTTL = 1800000; // 30 minutes
      const derivedTTL = 900000; // 15 minutes

      class BaseController {
        @CacheTTL(baseTTL)
        baseCachedMethod() {
          return 'base cached';
        }

        baseUncachedMethod() {
          return 'base uncached';
        }
      }

      class MiddleController extends BaseController {
        @CacheTTL(middleTTL)
        middleCachedMethod() {
          return 'middle cached';
        }

        middleUncachedMethod() {
          return 'middle uncached';
        }
      }

      @CacheTTL(derivedTTL)
      class DerivedController extends MiddleController {
        derivedMethod() {
          return 'derived';
        }
      }

      const derivedController = new DerivedController();

      // Check base class method metadata
      const baseMetadata = reflector.get(
        CACHE_TTL_KEY,
        derivedController.baseCachedMethod,
      );
      expect(baseMetadata).toBe(baseTTL);

      // Check middle class method metadata
      const middleMetadata = reflector.get(
        CACHE_TTL_KEY,
        derivedController.middleCachedMethod,
      );
      expect(middleMetadata).toBe(middleTTL);

      // Check derived class metadata
      const derivedClassMetadata = reflector.get(CACHE_TTL_KEY, DerivedController);
      expect(derivedClassMetadata).toBe(derivedTTL);
    });

    it('should handle common time intervals correctly', () => {
      const timeIntervals = {
        oneSecond: 1000,
        oneMinute: 60 * 1000,
        oneHour: 60 * 60 * 1000,
        oneDay: 24 * 60 * 60 * 1000,
        oneWeek: 7 * 24 * 60 * 60 * 1000,
      };

      class TimeIntervalsController {
        @CacheTTL(timeIntervals.oneSecond)
        oneSecondCache() {
          return '1s cache';
        }

        @CacheTTL(timeIntervals.oneMinute)
        oneMinuteCache() {
          return '1m cache';
        }

        @CacheTTL(timeIntervals.oneHour)
        oneHourCache() {
          return '1h cache';
        }

        @CacheTTL(timeIntervals.oneDay)
        oneDayCache() {
          return '1d cache';
        }

        @CacheTTL(timeIntervals.oneWeek)
        oneWeekCache() {
          return '1w cache';
        }
      }

      const controller = new TimeIntervalsController();

      // Test each time interval
      expect(reflector.get(CACHE_TTL_KEY, controller.oneSecondCache)).toBe(timeIntervals.oneSecond);
      expect(reflector.get(CACHE_TTL_KEY, controller.oneMinuteCache)).toBe(timeIntervals.oneMinute);
      expect(reflector.get(CACHE_TTL_KEY, controller.oneHourCache)).toBe(timeIntervals.oneHour);
      expect(reflector.get(CACHE_TTL_KEY, controller.oneDayCache)).toBe(timeIntervals.oneDay);
      expect(reflector.get(CACHE_TTL_KEY, controller.oneWeekCache)).toBe(timeIntervals.oneWeek);
    });

    it('should work in combination with other decorators', () => {
      const ttlValue = 300000; // 5 minutes

      // Mock another decorator for testing
      const MOCK_DECORATOR_KEY = 'mockDecorator';
      const MockDecorator = (value: string) => SetMetadata(MOCK_DECORATOR_KEY, value);

      class CombinedController {
        @CacheTTL(ttlValue)
        @MockDecorator('test-value')
        combinedMethod() {
          return 'combined';
        }
      }


      // Both decorators should set their metadata
      const cacheTTLMetadata = reflector.get(
        CACHE_TTL_KEY,
        CombinedController.prototype.combinedMethod,
      );
      expect(cacheTTLMetadata).toBe(ttlValue);

      const mockMetadata = reflector.get(
        MOCK_DECORATOR_KEY,
        CombinedController.prototype.combinedMethod,
      );
      expect(mockMetadata).toBe('test-value');
    });

    it('should work with regular methods (arrow functions not supported)', () => {
      const methodTTL = 180000; // 3 minutes

      class MethodController {
        @CacheTTL(methodTTL)
        cachedMethod() {
          return 'cached';
        }

        uncachedMethod() {
          return 'uncached';
        }
      }

      const controller = new MethodController();

      // Cached method should have metadata
      const cachedMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.cachedMethod,
      );
      expect(cachedMetadata).toBe(methodTTL);

      // Uncached method should not have metadata
      const uncachedMetadata = reflector.get(
        CACHE_TTL_KEY,
        controller.uncachedMethod,
      );
      expect(uncachedMetadata).toBeUndefined();
    });

    it('should export correct constant values', () => {
      expect(CACHE_TTL_KEY).toBe('cache_ttl');
    });

    it('should be a function that can be called with TTL parameter', () => {
      expect(typeof CacheTTL).toBe('function');
      expect(typeof CacheTTL(1000)).toBe('function');
    });

    it('should handle decimal TTL values', () => {
      const decimalTTL = 1500.5; // 1.5005 seconds

      class DecimalController {
        @CacheTTL(decimalTTL)
        decimalCacheMethod() {
          return 'decimal cache';
        }
      }

      const controller = new DecimalController();

      const metadata = reflector.get(
        CACHE_TTL_KEY,
        controller.decimalCacheMethod,
      );
      expect(metadata).toBe(decimalTTL);
    });

    it('should handle edge case where decorator is applied multiple times with different values', () => {
      const firstTTL = 1000;
      const secondTTL = 2000;

      class MultipleDecorator {
        @CacheTTL(firstTTL)
        @CacheTTL(secondTTL) // Applied twice with different values
        multipleCacheMethod() {
          return 'multiple cache';
        }
      }


      // Should use the first applied decorator value (decorators are applied in reverse order)
      const metadata = reflector.get(
        CACHE_TTL_KEY,
        MultipleDecorator.prototype.multipleCacheMethod,
      );
      expect(metadata).toBe(firstTTL);
    });
  });
});