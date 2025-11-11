import { Roles } from './roles.decorator';
import { Reflector } from '@nestjs/core';

describe('Roles Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('should be defined', () => {
    expect(Roles).toBeDefined();
  });

  it('should set metadata for single role', () => {
    class TestClass {
      @Roles('admin')
      testMethod() {
        return 'test';
      }
    }

    const roles = reflector.get<string[]>('roles', TestClass.prototype.testMethod);
    expect(roles).toEqual(['admin']);
  });

  it('should set metadata for multiple roles', () => {
    class TestClass {
      @Roles('admin', 'user', 'moderator')
      testMethod() {
        return 'test';
      }
    }

    const roles = reflector.get<string[]>('roles', TestClass.prototype.testMethod);
    expect(roles).toEqual(['admin', 'user', 'moderator']);
  });

  it('should work with empty roles array', () => {
    class TestClass {
      @Roles()
      testMethod() {
        return 'test';
      }
    }

    const roles = reflector.get<string[]>('roles', TestClass.prototype.testMethod);
    expect(roles).toEqual([]);
  });

  it('should work on class level', () => {
    @Roles('admin')
    class TestClass {
      testMethod() {
        return 'test';
      }
    }

    const roles = reflector.get<string[]>('roles', TestClass);
    expect(roles).toEqual(['admin']);
  });

  it('should handle duplicate roles', () => {
    class TestClass {
      @Roles('admin', 'admin', 'user')
      testMethod() {
        return 'test';
      }
    }

    const roles = reflector.get<string[]>('roles', TestClass.prototype.testMethod);
    expect(roles).toEqual(['admin', 'admin', 'user']);
  });
});