import { Reflector } from '@nestjs/core';
import { SkipThrottle, SKIP_THROTTLE_KEY } from './skip-throttle.decorator';

describe('SkipThrottle Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('@SkipThrottle()', () => {
    it('should set metadata with correct key and value', () => {
      // Create a test class with the decorator
      @SkipThrottle()
      class TestController {
        @SkipThrottle()
        testMethod() {
          return 'test';
        }
      }

      const controller = new TestController();

      // Check class-level metadata
      const classMetadata = reflector.get(SKIP_THROTTLE_KEY, TestController);
      expect(classMetadata).toBe(true);

      // Check method-level metadata
      const methodMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.testMethod,
      );
      expect(methodMetadata).toBe(true);
    });

    it('should work when applied to class only', () => {
      @SkipThrottle()
      class SkipThrottleController {
        regularMethod() {
          return 'regular';
        }
      }

      const controller = new SkipThrottleController();

      // Class should have skip throttle metadata
      const classMetadata = reflector.get(SKIP_THROTTLE_KEY, SkipThrottleController);
      expect(classMetadata).toBe(true);

      // Method should not have its own metadata
      const methodMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.regularMethod,
      );
      expect(methodMetadata).toBeUndefined();
    });

    it('should work when applied to method only', () => {
      class ThrottledController {
        @SkipThrottle()
        skipThrottleMethod() {
          return 'skip throttle';
        }

        throttledMethod() {
          return 'throttled';
        }
      }

      const controller = new ThrottledController();

      // Class should not have skip throttle metadata
      const classMetadata = reflector.get(SKIP_THROTTLE_KEY, ThrottledController);
      expect(classMetadata).toBeUndefined();

      // Skip throttle method should have metadata
      const skipMethodMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.skipThrottleMethod,
      );
      expect(skipMethodMetadata).toBe(true);

      // Throttled method should not have metadata
      const throttledMethodMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.throttledMethod,
      );
      expect(throttledMethodMetadata).toBeUndefined();
    });

    it('should work with multiple methods decorated', () => {
      class MixedThrottleController {
        @SkipThrottle()
        firstSkipMethod() {
          return 'first skip';
        }

        throttledMethod() {
          return 'throttled';
        }

        @SkipThrottle()
        secondSkipMethod() {
          return 'second skip';
        }
      }

      const controller = new MixedThrottleController();

      // First skip method should have metadata
      const firstMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.firstSkipMethod,
      );
      expect(firstMetadata).toBe(true);

      // Throttled method should not have metadata
      const throttledMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.throttledMethod,
      );
      expect(throttledMetadata).toBeUndefined();

      // Second skip method should have metadata
      const secondMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.secondSkipMethod,
      );
      expect(secondMetadata).toBe(true);
    });

    it('should work with method override when both class and method are decorated', () => {
      @SkipThrottle()
      class SkipThrottleController {
        @SkipThrottle()
        explicitSkipMethod() {
          return 'explicit skip';
        }

        inheritedSkipMethod() {
          return 'inherited skip';
        }
      }

      const controller = new SkipThrottleController();

      // Class metadata
      const classMetadata = reflector.get(SKIP_THROTTLE_KEY, SkipThrottleController);
      expect(classMetadata).toBe(true);

      // Explicit method metadata
      const explicitMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.explicitSkipMethod,
      );
      expect(explicitMetadata).toBe(true);

      // Inherited method should not have its own metadata
      const inheritedMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.inheritedSkipMethod,
      );
      expect(inheritedMetadata).toBeUndefined();
    });

    it('should work with reflector.getAllAndOverride method', () => {
      @SkipThrottle()
      class BaseController {
        @SkipThrottle()
        overriddenMethod() {
          return 'base';
        }

        baseMethod() {
          return 'base only';
        }
      }

      class DerivedController extends BaseController {
        @SkipThrottle()
        overriddenMethod() {
          return 'derived';
        }

        derivedMethod() {
          return 'derived only';
        }
      }

      const derivedController = new DerivedController();

      // Test getAllAndOverride for class hierarchy
      const classMetadata = reflector.getAllAndOverride(SKIP_THROTTLE_KEY, [
        DerivedController,
        BaseController,
      ]);
      expect(classMetadata).toBe(true);

      // Test getAllAndOverride for method hierarchy
      const methodMetadata = reflector.getAllAndOverride(SKIP_THROTTLE_KEY, [
        derivedController.overriddenMethod,
        BaseController.prototype.overriddenMethod,
      ]);
      expect(methodMetadata).toBe(true);
    });

    it('should work with async methods', () => {
      class AsyncController {
        @SkipThrottle()
        async asyncSkipMethod() {
          return Promise.resolve('async skip');
        }

        async asyncThrottledMethod() {
          return Promise.resolve('async throttled');
        }
      }

      const controller = new AsyncController();

      // Async skip method should have metadata
      const skipMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.asyncSkipMethod,
      );
      expect(skipMetadata).toBe(true);

      // Async throttled method should not have metadata
      const throttledMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.asyncThrottledMethod,
      );
      expect(throttledMetadata).toBeUndefined();
    });

    it('should work with static methods', () => {
      class StaticController {
        @SkipThrottle()
        static staticSkipMethod() {
          return 'static skip';
        }

        static staticThrottledMethod() {
          return 'static throttled';
        }
      }

      // Static skip method should have metadata
      const skipMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        StaticController.staticSkipMethod,
      );
      expect(skipMetadata).toBe(true);

      // Static throttled method should not have metadata
      const throttledMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        StaticController.staticThrottledMethod,
      );
      expect(throttledMetadata).toBeUndefined();
    });

    it('should work with property decorators', () => {
      // Test that the decorator can be used with property-like methods
      class PropertyController {
        @SkipThrottle()
        getValue() {
          return 'value';
        }

        setValue(_value: string) {
          // setter logic
        }

        getThrottledValue() {
          return 'throttled value';
        }
      }

      const controller = new PropertyController();

      // Skip throttle method should have metadata
      const skipMetadata = reflector.get(SKIP_THROTTLE_KEY, controller.getValue);
      expect(skipMetadata).toBe(true);

      // Non-decorated methods should not have metadata
      const setMetadata = reflector.get(SKIP_THROTTLE_KEY, controller.setValue);
      expect(setMetadata).toBeUndefined();

      const throttledMetadata = reflector.get(SKIP_THROTTLE_KEY, controller.getThrottledValue);
      expect(throttledMetadata).toBeUndefined();
    });

    it('should work with inheritance hierarchies', () => {
      class BaseController {
        @SkipThrottle()
        baseSkipMethod() {
          return 'base skip';
        }

        baseThrottledMethod() {
          return 'base throttled';
        }
      }

      class MiddleController extends BaseController {
        @SkipThrottle()
        middleSkipMethod() {
          return 'middle skip';
        }

        middleThrottledMethod() {
          return 'middle throttled';
        }
      }

      @SkipThrottle()
      class DerivedController extends MiddleController {
        derivedMethod() {
          return 'derived';
        }
      }

      const derivedController = new DerivedController();

      // Check base class method metadata
      const baseMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        derivedController.baseSkipMethod,
      );
      expect(baseMetadata).toBe(true);

      // Check middle class method metadata
      const middleMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        derivedController.middleSkipMethod,
      );
      expect(middleMetadata).toBe(true);

      // Check derived class metadata
      const derivedClassMetadata = reflector.get(SKIP_THROTTLE_KEY, DerivedController);
      expect(derivedClassMetadata).toBe(true);
    });

    it('should work in combination with other decorators', () => {
      // Mock another decorator for testing
      const MOCK_DECORATOR_KEY = 'mockDecorator';
      const MockDecorator = () => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
        if (propertyKey && descriptor) {
          Reflect.defineMetadata(MOCK_DECORATOR_KEY, true, descriptor.value);
        } else if (propertyKey) {
          Reflect.defineMetadata(MOCK_DECORATOR_KEY, true, target[propertyKey]);
        } else {
          Reflect.defineMetadata(MOCK_DECORATOR_KEY, true, target);
        }
      };

      class CombinedController {
        @SkipThrottle()
        @MockDecorator()
        combinedMethod() {
          return 'combined';
        }
      }

      const controller = new CombinedController();

      // Both decorators should set their metadata
      const skipThrottleMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.combinedMethod,
      );
      expect(skipThrottleMetadata).toBe(true);

      const mockMetadata = reflector.get(
        MOCK_DECORATOR_KEY,
        controller.combinedMethod,
      );
      expect(mockMetadata).toBe(true);
    });

    it('should work with regular methods (arrow functions not supported)', () => {
      class RegularController {
        @SkipThrottle()
        skipMethod() {
          return 'skip';
        }

        throttledMethod() {
          return 'throttled';
        }
      }

      const controller = new RegularController();

      // Skip method should have metadata
      const skipMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.skipMethod,
      );
      expect(skipMetadata).toBe(true);

      // Throttled method should not have metadata
      const throttledMetadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.throttledMethod,
      );
      expect(throttledMetadata).toBeUndefined();
    });

    it('should export correct constant values', () => {
      expect(SKIP_THROTTLE_KEY).toBe('skipThrottle');
    });

    it('should be a function that can be called', () => {
      expect(typeof SkipThrottle).toBe('function');
      expect(typeof SkipThrottle()).toBe('function');
    });

    it('should handle edge case where decorator is applied multiple times', () => {
      class MultipleDecorator {
        @SkipThrottle()
        @SkipThrottle() // Applied twice
        multipleSkipMethod() {
          return 'multiple skip';
        }
      }

      const controller = new MultipleDecorator();

      // Should still work correctly even with multiple applications
      const metadata = reflector.get(
        SKIP_THROTTLE_KEY,
        controller.multipleSkipMethod,
      );
      expect(metadata).toBe(true);
    });
  });
});