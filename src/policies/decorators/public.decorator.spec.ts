import { Reflector } from '@nestjs/core';
import { Public, IS_PUBLIC_KEY } from './public.decorator';

describe('Public Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('@Public()', () => {
    it('should set metadata with correct key and value', () => {
      // Create a test class with the decorator
      @Public()
      class TestController {
        @Public()
        testMethod() {
          return 'test';
        }
      }

      const controller = new TestController();

      // Check class-level metadata
      const classMetadata = reflector.get(IS_PUBLIC_KEY, TestController);
      expect(classMetadata).toBe(true);

      // Check method-level metadata
      const methodMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.testMethod,
      );
      expect(methodMetadata).toBe(true);
    });

    it('should work when applied to class only', () => {
      @Public()
      class PublicController {
        regularMethod() {
          return 'regular';
        }
      }

      const controller = new PublicController();

      // Class should have public metadata
      const classMetadata = reflector.get(IS_PUBLIC_KEY, PublicController);
      expect(classMetadata).toBe(true);

      // Method should not have its own metadata
      const methodMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.regularMethod,
      );
      expect(methodMetadata).toBeUndefined();
    });

    it('should work when applied to method only', () => {
      class PrivateController {
        @Public()
        publicMethod() {
          return 'public';
        }

        privateMethod() {
          return 'private';
        }
      }

      const controller = new PrivateController();

      // Class should not have public metadata
      const classMetadata = reflector.get(IS_PUBLIC_KEY, PrivateController);
      expect(classMetadata).toBeUndefined();

      // Public method should have metadata
      const publicMethodMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.publicMethod,
      );
      expect(publicMethodMetadata).toBe(true);

      // Private method should not have metadata
      const privateMethodMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.privateMethod,
      );
      expect(privateMethodMetadata).toBeUndefined();
    });

    it('should work with multiple methods decorated', () => {
      class MixedController {
        @Public()
        firstPublicMethod() {
          return 'first public';
        }

        privateMethod() {
          return 'private';
        }

        @Public()
        secondPublicMethod() {
          return 'second public';
        }
      }

      const controller = new MixedController();

      // First public method should have metadata
      const firstMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.firstPublicMethod,
      );
      expect(firstMetadata).toBe(true);

      // Private method should not have metadata
      const privateMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.privateMethod,
      );
      expect(privateMetadata).toBeUndefined();

      // Second public method should have metadata
      const secondMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.secondPublicMethod,
      );
      expect(secondMetadata).toBe(true);
    });

    it('should work with method override when both class and method are decorated', () => {
      @Public()
      class PublicController {
        @Public()
        explicitPublicMethod() {
          return 'explicit public';
        }

        inheritedPublicMethod() {
          return 'inherited public';
        }
      }

      const controller = new PublicController();

      // Class metadata
      const classMetadata = reflector.get(IS_PUBLIC_KEY, PublicController);
      expect(classMetadata).toBe(true);

      // Explicit method metadata
      const explicitMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.explicitPublicMethod,
      );
      expect(explicitMetadata).toBe(true);

      // Inherited method should not have its own metadata
      const inheritedMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.inheritedPublicMethod,
      );
      expect(inheritedMetadata).toBeUndefined();
    });

    it('should work with reflector.getAllAndOverride method', () => {
      @Public()
      class BaseController {
        @Public()
        overriddenMethod() {
          return 'base';
        }

        baseMethod() {
          return 'base only';
        }
      }

      class DerivedController extends BaseController {
        @Public()
        overriddenMethod() {
          return 'derived';
        }

        derivedMethod() {
          return 'derived only';
        }
      }

      const derivedController = new DerivedController();

      // Test getAllAndOverride for class hierarchy
      const classMetadata = reflector.getAllAndOverride(IS_PUBLIC_KEY, [
        DerivedController,
        BaseController,
      ]);
      expect(classMetadata).toBe(true);

      // Test getAllAndOverride for method hierarchy
      const methodMetadata = reflector.getAllAndOverride(IS_PUBLIC_KEY, [
        derivedController.overriddenMethod,
        BaseController.prototype.overriddenMethod,
      ]);
      expect(methodMetadata).toBe(true);
    });

    it('should work with async methods', () => {
      class AsyncController {
        @Public()
        async asyncPublicMethod() {
          return Promise.resolve('async public');
        }

        async asyncPrivateMethod() {
          return Promise.resolve('async private');
        }
      }

      const controller = new AsyncController();

      // Async public method should have metadata
      const publicMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.asyncPublicMethod,
      );
      expect(publicMetadata).toBe(true);

      // Async private method should not have metadata
      const privateMetadata = reflector.get(
        IS_PUBLIC_KEY,
        controller.asyncPrivateMethod,
      );
      expect(privateMetadata).toBeUndefined();
    });

    it('should work with static methods', () => {
      class StaticController {
        @Public()
        static staticPublicMethod() {
          return 'static public';
        }

        static staticPrivateMethod() {
          return 'static private';
        }
      }

      // Static public method should have metadata
      const publicMetadata = reflector.get(
        IS_PUBLIC_KEY,
        StaticController.staticPublicMethod,
      );
      expect(publicMetadata).toBe(true);

      // Static private method should not have metadata
      const privateMetadata = reflector.get(
        IS_PUBLIC_KEY,
        StaticController.staticPrivateMethod,
      );
      expect(privateMetadata).toBeUndefined();
    });

    it('should work with property accessor methods', () => {
      class PropertyController {
        private _value: string = '';

        @Public()
        getValue(): string {
          return this._value;
        }

        @Public()
        setValue(value: string) {
          this._value = value;
        }

        getPrivateValue(): string {
          return this._value;
        }

        setPrivateValue(_value: string) {
          this._value = _value;
        }
      }

      const controller = new PropertyController();

      // Public getter method should have metadata
      const getterMetadata = reflector.get(IS_PUBLIC_KEY, controller.getValue);
      expect(getterMetadata).toBe(true);

      // Public setter method should have metadata
      const setterMetadata = reflector.get(IS_PUBLIC_KEY, controller.setValue);
      expect(setterMetadata).toBe(true);

      // Private getter method should not have metadata
      const privateGetterMetadata = reflector.get(IS_PUBLIC_KEY, controller.getPrivateValue);
      expect(privateGetterMetadata).toBeUndefined();

      // Private setter method should not have metadata
      const privateSetterMetadata = reflector.get(IS_PUBLIC_KEY, controller.setPrivateValue);
      expect(privateSetterMetadata).toBeUndefined();
    });

    it('should work with inheritance hierarchies', () => {
      class BaseController {
        @Public()
        basePublicMethod() {
          return 'base public';
        }

        basePrivateMethod() {
          return 'base private';
        }
      }

      class MiddleController extends BaseController {
        @Public()
        middlePublicMethod() {
          return 'middle public';
        }

        middlePrivateMethod() {
          return 'middle private';
        }
      }

      @Public()
      class DerivedController extends MiddleController {
        derivedMethod() {
          return 'derived';
        }
      }

      const derivedController = new DerivedController();

      // Check base class method metadata
      const baseMetadata = reflector.get(
        IS_PUBLIC_KEY,
        derivedController.basePublicMethod,
      );
      expect(baseMetadata).toBe(true);

      // Check middle class method metadata
      const middleMetadata = reflector.get(
        IS_PUBLIC_KEY,
        derivedController.middlePublicMethod,
      );
      expect(middleMetadata).toBe(true);

      // Check derived class metadata
      const derivedClassMetadata = reflector.get(IS_PUBLIC_KEY, DerivedController);
      expect(derivedClassMetadata).toBe(true);
    });

    it('should export correct constant values', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
    });

    it('should be a function that can be called', () => {
      expect(typeof Public).toBe('function');
      expect(typeof Public()).toBe('function');
    });
  });
});