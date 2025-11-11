import { PasswordUtil } from './password.util';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Import bcrypt after mocking
import * as bcrypt from 'bcrypt';

describe('PasswordUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('should hash password with generated salt', async () => {
      const password = 'testPassword123';
      const salt = 'mockSalt';
      const hashedPassword = 'hashedPassword';

      (bcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await PasswordUtil.hash(password);

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, salt);
      expect(result).toBe(hashedPassword);
    });

    it('should handle bcrypt.genSalt error', async () => {
      const password = 'testPassword123';
      const error = new Error('Salt generation failed');

      (bcrypt.genSalt as jest.Mock).mockRejectedValue(error);

      await expect(PasswordUtil.hash(password)).rejects.toThrow('Salt generation failed');
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should handle bcrypt.hash error', async () => {
      const password = 'testPassword123';
      const salt = 'mockSalt';
      const error = new Error('Hashing failed');

      (bcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
      (bcrypt.hash as jest.Mock).mockRejectedValue(error);

      await expect(PasswordUtil.hash(password)).rejects.toThrow('Hashing failed');
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, salt);
    });

    it('should handle empty password', async () => {
      const password = '';
      const salt = 'mockSalt';
      const hashedPassword = 'hashedEmptyPassword';

      (bcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await PasswordUtil.hash(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith('', salt);
    });

    it('should handle null password', async () => {
      const password = null as any;
      const salt = 'mockSalt';

      (bcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Invalid password'));

      await expect(PasswordUtil.hash(password)).rejects.toThrow();
    });
  });

  describe('compare', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'testPassword123';
      const hash = 'hashedPassword';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await PasswordUtil.compare(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123';
      const hash = 'differentHashedPassword';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await PasswordUtil.compare(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(false);
    });

    it('should handle bcrypt.compare error', async () => {
      const password = 'testPassword123';
      const hash = 'hashedPassword';
      const error = new Error('Comparison failed');

      (bcrypt.compare as jest.Mock).mockRejectedValue(error);

      await expect(PasswordUtil.compare(password, hash)).rejects.toThrow('Comparison failed');
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = 'hashedPassword';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await PasswordUtil.compare(password, hash);

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith('', hash);
    });

    it('should handle empty hash', async () => {
      const password = 'testPassword123';
      const hash = '';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await PasswordUtil.compare(password, hash);

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, '');
    });

    it('should handle null values', async () => {
      const password = null as any;
      const hash = null as any;

      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Invalid arguments'));

      await expect(PasswordUtil.compare(password, hash)).rejects.toThrow();
    });
  });
});