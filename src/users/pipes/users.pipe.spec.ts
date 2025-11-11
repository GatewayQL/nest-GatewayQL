import { BadRequestException } from '@nestjs/common';
import { UsersPipe } from './users.pipe';
import { User, UserRole } from '../models/user.interface';
import { CreateUserInput } from '../dto/create-user.input';
import { UpdateUserInput } from '../dto/update-user.input';

describe('UsersPipe', () => {
  let pipe: UsersPipe;

  const validUser: User = {
    firstname: 'John',
    lastname: 'Doe',
    username: 'john.doe',
    email: 'john.doe@test.com',
    redirectUri: 'http://localhost:3000/redirect',
    role: UserRole.USER,
  };

  const validCreateUserInput: CreateUserInput = {
    firstname: 'Jane',
    lastname: 'Admin',
    username: 'jane.admin',
    email: 'jane.admin@test.com',
  };

  beforeEach(() => {
    pipe = new UsersPipe();
  });

  describe('pipe initialization', () => {
    it('should be defined', () => {
      expect(pipe).toBeDefined();
      expect(new UsersPipe()).toBeDefined();
    });

    it('should have correct error message prefix', () => {
      expect(pipe['errorString']).toBe('Incoming user is not formatted correctly. ');
    });
  });

  describe('successful transformations', () => {
    it('should transform valid user data without changes', () => {
      const result = pipe.transform(validUser);
      expect(result).toEqual(validUser);
      expect(result.firstname).toBe('John');
      expect(result.lastname).toBe('Doe');
      expect(result.username).toBe('john.doe');
      expect(result.email).toBe('john.doe@test.com');
      expect(result.redirectUri).toBe('http://localhost:3000/redirect');
    });

    it('should transform valid CreateUserInput', () => {
      const result = pipe.transform(validCreateUserInput);
      expect(result).toEqual(validCreateUserInput);
      expect(result.email).toBe('jane.admin@test.com');
    });

    it('should handle user with minimal required fields', () => {
      const minimalUser: User = {
        email: 'minimal@test.com',
      };
      const result = pipe.transform(minimalUser);
      expect(result).toEqual(minimalUser);
    });
  });

  describe('validation tests', () => {
    it('should throw error for non-string firstname', () => {
      const userWithInvalidFirstname = { ...validUser, firstname: 123 };
      expect(() => pipe.transform(userWithInvalidFirstname as any))
        .toThrow(new BadRequestException('Incoming user is not formatted correctly. firstname must be a string.'));
    });

    it('should throw error for non-string lastname', () => {
      const userWithInvalidLastname = { ...validUser, lastname: 456 };
      expect(() => pipe.transform(userWithInvalidLastname as any))
        .toThrow(new BadRequestException('Incoming user is not formatted correctly. lastname must be a string.'));
    });

    it('should allow null lastname', () => {
      const userWithNullLastname = { ...validUser, lastname: null };
      expect(() => pipe.transform(userWithNullLastname as any)).not.toThrow();
    });

    it('should throw error for invalid email format', () => {
      const invalidEmails = ['invalid-email', '', 'no-at-symbol.com'];
      invalidEmails.forEach(email => {
        const user = { ...validUser, email };
        expect(() => pipe.transform(user))
          .toThrow(new BadRequestException('Incoming user is not formatted correctly. email must be an email.'));
      });
    });

    it('should handle various valid email formats', () => {
      const validEmails = [
        'simple@test.com',
        'user.name@example.org',
        'user+tag@domain.co.uk',
        'user_underscore@test.io',
      ];
      validEmails.forEach(email => {
        const user = { ...validUser, email };
        expect(() => pipe.transform(user)).not.toThrow();
      });
    });
  });
});