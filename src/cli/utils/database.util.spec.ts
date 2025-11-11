import { DataSource } from 'typeorm';
import { getDataSource, closeDataSource, resetDataSource } from './database.util';

// Mock the config function from dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock TypeORM DataSource
jest.mock('typeorm', () => {
  const originalModule = jest.requireActual('typeorm');
  return {
    ...originalModule,
    DataSource: jest.fn(),
  };
});

describe('DatabaseUtil', () => {
  let mockDataSource: jest.Mocked<DataSource>;
  let DataSourceConstructor: jest.MockedClass<typeof DataSource>;

  beforeEach(() => {
    // Reset the module-level dataSource variable
    resetDataSource();

    // Reset environment variables
    process.env = {
      DB_HOST: undefined,
      DB_PORT: undefined,
      DB_USERNAME: undefined,
      DB_PASSWORD: undefined,
      DB_DATABASE: undefined,
    };

    mockDataSource = {
      initialize: jest.fn(),
      destroy: jest.fn(),
      isInitialized: false,
    } as any;

    DataSourceConstructor = DataSource as jest.MockedClass<typeof DataSource>;
    DataSourceConstructor.mockImplementation(() => mockDataSource);

    jest.clearAllMocks();
  });

  describe('getDataSource', () => {
    it('should create and initialize DataSource with default configuration', async () => {
      mockDataSource.initialize.mockResolvedValue(undefined);

      const result = await getDataSource();

      expect(DataSourceConstructor).toHaveBeenCalledWith({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'gatewayql',
        entities: expect.any(Array),
        synchronize: false,
        logging: false,
      });

      expect(mockDataSource.initialize).toHaveBeenCalled();
      expect(result).toBe(mockDataSource);
    });

    it('should create DataSource with environment variables', async () => {
      process.env.DB_HOST = 'testhost';
      process.env.DB_PORT = '5433';
      process.env.DB_USERNAME = 'testuser';
      process.env.DB_PASSWORD = 'testpass';
      process.env.DB_DATABASE = 'testdb';

      mockDataSource.initialize.mockResolvedValue(undefined);

      await getDataSource();

      expect(DataSourceConstructor).toHaveBeenCalledWith({
        type: 'postgres',
        host: 'testhost',
        port: 5433,
        username: 'testuser',
        password: 'testpass',
        database: 'testdb',
        entities: expect.any(Array),
        synchronize: false,
        logging: false,
      });
    });

    it('should handle invalid port in environment variable', async () => {
      process.env.DB_PORT = 'invalid';
      mockDataSource.initialize.mockResolvedValue(undefined);

      await getDataSource();

      expect(DataSourceConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          port: NaN, // parseInt('invalid', 10) returns NaN
        })
      );
    });

    it('should not initialize if already initialized', async () => {
      Object.defineProperty(mockDataSource, 'isInitialized', {
        value: true,
        writable: true,
        configurable: true
      });
      mockDataSource.initialize.mockResolvedValue(undefined);

      const result = await getDataSource();

      expect(mockDataSource.initialize).not.toHaveBeenCalled();
      expect(result).toBe(mockDataSource);
    });

    it('should return existing DataSource on subsequent calls', async () => {
      mockDataSource.initialize.mockResolvedValue(undefined);

      const result1 = await getDataSource();
      const result2 = await getDataSource();

      expect(DataSourceConstructor).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
      expect(result1).toBe(mockDataSource);
    });

    it('should throw error if initialization fails', async () => {
      const error = new Error('Database connection failed');
      mockDataSource.initialize.mockRejectedValue(error);

      await expect(getDataSource()).rejects.toThrow('Database connection failed');
      expect(mockDataSource.initialize).toHaveBeenCalled();
    });

    it('should create DataSource with correct entities', async () => {
      mockDataSource.initialize.mockResolvedValue(undefined);

      await getDataSource();

      const callArgs = DataSourceConstructor.mock.calls[0][0];
      expect(callArgs.entities).toHaveLength(3); // UserEntity, CredentialEntity, ScopeEntity
      expect(Array.isArray(callArgs.entities)).toBe(true);
    });

    it('should set synchronize to false for safety', async () => {
      mockDataSource.initialize.mockResolvedValue(undefined);

      await getDataSource();

      const callArgs = DataSourceConstructor.mock.calls[0][0];
      expect(callArgs.synchronize).toBe(false);
    });

    it('should set logging to false', async () => {
      mockDataSource.initialize.mockResolvedValue(undefined);

      await getDataSource();

      const callArgs = DataSourceConstructor.mock.calls[0][0];
      expect(callArgs.logging).toBe(false);
    });
  });

  describe('closeDataSource', () => {
    it('should destroy initialized DataSource', async () => {
      Object.defineProperty(mockDataSource, 'isInitialized', {
        value: true,
        writable: true,
        configurable: true
      });
      mockDataSource.destroy.mockResolvedValue();

      // First get the data source to initialize the module-level variable
      await getDataSource();

      await closeDataSource();

      expect(mockDataSource.destroy).toHaveBeenCalled();
    });

    it('should not destroy uninitialized DataSource', async () => {
      Object.defineProperty(mockDataSource, 'isInitialized', {
        value: false,
        writable: true,
        configurable: true
      });
      mockDataSource.destroy.mockResolvedValue();

      // First get the data source to initialize the module-level variable
      await getDataSource();

      await closeDataSource();

      expect(mockDataSource.destroy).not.toHaveBeenCalled();
    });

    it('should handle case when no DataSource exists', async () => {
      // Don't call getDataSource first, so no DataSource is created

      await expect(closeDataSource()).resolves.toBeUndefined();
    });

    it('should handle destroy errors', async () => {
      const error = new Error('Failed to destroy connection');
      Object.defineProperty(mockDataSource, 'isInitialized', {
        value: true,
        writable: true,
        configurable: true
      });
      mockDataSource.destroy.mockRejectedValue(error);

      // First get the data source
      await getDataSource();

      await expect(closeDataSource()).rejects.toThrow('Failed to destroy connection');
    });
  });

  describe('environment variable parsing', () => {
    it('should handle empty string port', async () => {
      process.env.DB_PORT = '';
      mockDataSource.initialize.mockResolvedValue(undefined);

      await getDataSource();

      const callArgs = DataSourceConstructor.mock.calls[0][0] as any;
      expect(callArgs.port).toBe(5432); // Should fall back to default
    });

    it('should handle zero port', async () => {
      process.env.DB_PORT = '0';
      mockDataSource.initialize.mockResolvedValue(undefined);

      await getDataSource();

      const callArgs = DataSourceConstructor.mock.calls[0][0] as any;
      expect(callArgs.port).toBe(0);
    });

    it('should handle negative port', async () => {
      process.env.DB_PORT = '-1';
      mockDataSource.initialize.mockResolvedValue(undefined);

      await getDataSource();

      const callArgs = DataSourceConstructor.mock.calls[0][0] as any;
      expect(callArgs.port).toBe(-1);
    });
  });
});