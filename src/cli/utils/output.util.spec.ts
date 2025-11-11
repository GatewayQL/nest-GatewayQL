import chalk from 'chalk';
import { OutputUtil } from './output.util';

// Mock chalk
jest.mock('chalk', () => ({
  default: {
    green: jest.fn((text) => `green(${text})`),
    red: jest.fn((text) => `red(${text})`),
    blue: jest.fn((text) => `blue(${text})`),
    yellow: jest.fn((text) => `yellow(${text})`),
    bold: jest.fn((text) => `bold(${text})`),
    gray: jest.fn((text) => `gray(${text})`),
  },
  green: jest.fn((text) => `green(${text})`),
  red: jest.fn((text) => `red(${text})`),
  blue: jest.fn((text) => `blue(${text})`),
  yellow: jest.fn((text) => `yellow(${text})`),
  bold: jest.fn((text) => `bold(${text})`),
  gray: jest.fn((text) => `gray(${text})`),
}));

describe('OutputUtil', () => {
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleTableSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleTableSpy.mockRestore();
  });

  describe('success', () => {
    it('should print success message with green checkmark', () => {
      const message = 'Operation completed successfully';

      OutputUtil.success(message);

      expect(consoleSpy).toHaveBeenCalledWith('green(✓)', message);
      expect(chalk.green).toHaveBeenCalledWith('✓');
    });

    it('should handle empty message', () => {
      OutputUtil.success('');

      expect(consoleSpy).toHaveBeenCalledWith('green(✓)', '');
    });
  });

  describe('error', () => {
    it('should print error message with red X mark', () => {
      const message = 'Operation failed';

      OutputUtil.error(message);

      expect(consoleErrorSpy).toHaveBeenCalledWith('red(✗)', message);
      expect(chalk.red).toHaveBeenCalledWith('✗');
    });

    it('should handle empty error message', () => {
      OutputUtil.error('');

      expect(consoleErrorSpy).toHaveBeenCalledWith('red(✗)', '');
    });
  });

  describe('info', () => {
    it('should print info message with blue info symbol', () => {
      const message = 'Information message';

      OutputUtil.info(message);

      expect(consoleSpy).toHaveBeenCalledWith('blue(ℹ)', message);
      expect(chalk.blue).toHaveBeenCalledWith('ℹ');
    });

    it('should handle empty info message', () => {
      OutputUtil.info('');

      expect(consoleSpy).toHaveBeenCalledWith('blue(ℹ)', '');
    });
  });

  describe('warning', () => {
    it('should print warning message with yellow warning symbol', () => {
      const message = 'Warning message';

      OutputUtil.warning(message);

      expect(consoleSpy).toHaveBeenCalledWith('yellow(⚠)', message);
      expect(chalk.yellow).toHaveBeenCalledWith('⚠');
    });

    it('should handle empty warning message', () => {
      OutputUtil.warning('');

      expect(consoleSpy).toHaveBeenCalledWith('yellow(⚠)', '');
    });
  });

  describe('table', () => {
    it('should print table data using console.table', () => {
      const data = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ];

      OutputUtil.table(data);

      expect(consoleTableSpy).toHaveBeenCalledWith(data);
    });

    it('should print info message when data is empty', () => {
      OutputUtil.table([]);

      expect(consoleSpy).toHaveBeenCalledWith('blue(ℹ)', 'No data found');
      expect(consoleTableSpy).not.toHaveBeenCalled();
    });

    it('should handle null data', () => {
      OutputUtil.table(null as any);

      expect(consoleSpy).toHaveBeenCalledWith('blue(ℹ)', 'No data found');
      expect(consoleTableSpy).not.toHaveBeenCalled();
    });
  });

  describe('json', () => {
    it('should print formatted JSON data', () => {
      const data = { id: 1, name: 'John', active: true };

      OutputUtil.json(data);

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('should handle complex nested objects', () => {
      const data = {
        user: { id: 1, profile: { name: 'John', settings: { theme: 'dark' } } },
        array: [1, 2, 3]
      };

      OutputUtil.json(data);

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('should handle null data', () => {
      OutputUtil.json(null);

      expect(consoleSpy).toHaveBeenCalledWith('null');
    });
  });

  describe('printUser', () => {
    it('should print formatted user details', () => {
      const user = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        firstname: 'John',
        lastname: 'Doe',
        role: 'admin',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      OutputUtil.printUser(user);

      expect(consoleSpy).toHaveBeenCalledWith('bold(\nUser Details:)');
      expect(consoleSpy).toHaveBeenCalledWith('gray(──────────────────────────────────────────────────)');
      expect(consoleSpy).toHaveBeenCalledWith('bold(ID:)         123');
      expect(consoleSpy).toHaveBeenCalledWith('bold(Username:)   johndoe');
      expect(consoleSpy).toHaveBeenCalledWith('bold(Email:)      john@example.com');
      expect(consoleSpy).toHaveBeenCalledWith('bold(Name:)       John Doe');
      expect(consoleSpy).toHaveBeenCalledWith('bold(Role:)       admin');
    });

    it('should handle user with missing optional fields', () => {
      const user = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        firstname: null,
        lastname: null,
        role: 'user',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      OutputUtil.printUser(user);

      expect(consoleSpy).toHaveBeenCalledWith('bold(Name:)        ');
    });

    it('should handle user with empty name fields', () => {
      const user = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        firstname: '',
        lastname: '',
        role: 'user',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      OutputUtil.printUser(user);

      expect(consoleSpy).toHaveBeenCalledWith('bold(Name:)        ');
    });
  });

  describe('printCredential', () => {
    it('should print formatted credential details', () => {
      const credential = {
        id: 'cred-123',
        consumerId: 'user-456',
        type: 'basic-auth',
        scope: 'read,write',
        isActive: true,
        keyId: 'key-789',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      OutputUtil.printCredential(credential);

      expect(consoleSpy).toHaveBeenCalledWith('bold(\nCredential Details:)');
      expect(consoleSpy).toHaveBeenCalledWith('gray(──────────────────────────────────────────────────)');
      expect(consoleSpy).toHaveBeenCalledWith('bold(ID:)          cred-123');
      expect(consoleSpy).toHaveBeenCalledWith('bold(Consumer ID:) user-456');
      expect(consoleSpy).toHaveBeenCalledWith('bold(Type:)        basic-auth');
      expect(consoleSpy).toHaveBeenCalledWith('bold(Scope:)       read,write');
      expect(consoleSpy).toHaveBeenCalledWith('bold(Is Active:)   green(Yes)');
      expect(consoleSpy).toHaveBeenCalledWith('bold(Key ID:)      key-789');
    });

    it('should handle inactive credential', () => {
      const credential = {
        id: 'cred-123',
        consumerId: 'user-456',
        type: 'basic-auth',
        scope: null,
        isActive: false,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      OutputUtil.printCredential(credential);

      expect(consoleSpy).toHaveBeenCalledWith('bold(Scope:)       N/A');
      expect(consoleSpy).toHaveBeenCalledWith('bold(Is Active:)   red(No)');
    });

    it('should handle credential without keyId', () => {
      const credential = {
        id: 'cred-123',
        consumerId: 'user-456',
        type: 'basic-auth',
        scope: 'read',
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      OutputUtil.printCredential(credential);

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Key ID:'));
    });

    it('should handle credential with empty scope', () => {
      const credential = {
        id: 'cred-123',
        consumerId: 'user-456',
        type: 'oauth2',
        scope: '',
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      OutputUtil.printCredential(credential);

      expect(consoleSpy).toHaveBeenCalledWith('bold(Scope:)       N/A');
    });
  });
});