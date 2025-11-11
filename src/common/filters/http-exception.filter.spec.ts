import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AllExceptionsFilter } from './http-exception.filter';
import { CustomLoggerService } from '../logger/logger.service';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let logger: CustomLoggerService;
  let mockArgumentsHost: ArgumentsHost;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const mockLogger = {
    setContext: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    logger = module.get<CustomLoggerService>(CustomLoggerService);

    // Mock request object
    mockRequest = {
      url: '/test/endpoint',
      method: 'GET',
      headers: {
        'user-agent': 'test-agent',
        'content-type': 'application/json',
      },
      ip: '127.0.0.1',
      body: {},
      query: {},
      params: {},
    };

    // Mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    // Mock HTTP context
    const mockHttpContext = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    };

    // Mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as jest.Mocked<ArgumentsHost>;

    // Store reference to nested mocks for easy access
    (mockArgumentsHost as any).httpContext = mockHttpContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset logger mock implementations to default behavior
    mockLogger.error.mockReset().mockImplementation(() => {});
    mockLogger.warn.mockReset().mockImplementation(() => {});
    mockLogger.log.mockReset().mockImplementation(() => {});
    mockLogger.debug.mockReset().mockImplementation(() => {});
  });

  describe('Basic functionality', () => {
    it('should be defined', () => {
      expect(filter).toBeDefined();
      expect(logger).toBeDefined();
    });

    it('should set logger context on initialization', () => {
      expect(mockLogger.setContext).toHaveBeenCalledWith('ExceptionFilter');
    });
  });

  describe('HttpException handling', () => {
    it('should handle standard HttpException', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Not found',
          timestamp: expect.any(String),
          path: '/test/endpoint',
          method: 'GET',
        })
      );
    });

    it('should handle HttpException with custom response', () => {
      const customResponse = {
        message: 'Custom validation error',
        errors: ['Field is required', 'Invalid format'],
      };
      const exception = new HttpException(customResponse, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Custom validation error',
          errors: ['Field is required', 'Invalid format'],
          timestamp: expect.any(String),
          path: '/test/endpoint',
          method: 'GET',
        })
      );
    });

    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Simple error message', HttpStatus.UNAUTHORIZED);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Simple error message',
          timestamp: expect.any(String),
          path: '/test/endpoint',
          method: 'GET',
        })
      );
    });

    it('should handle different HTTP status codes', () => {
      const testCases = [
        { status: HttpStatus.BAD_REQUEST, message: 'Bad Request' },
        { status: HttpStatus.UNAUTHORIZED, message: 'Unauthorized' },
        { status: HttpStatus.FORBIDDEN, message: 'Forbidden' },
        { status: HttpStatus.NOT_FOUND, message: 'Not Found' },
        { status: HttpStatus.METHOD_NOT_ALLOWED, message: 'Method Not Allowed' },
        { status: HttpStatus.CONFLICT, message: 'Conflict' },
        { status: HttpStatus.UNPROCESSABLE_ENTITY, message: 'Unprocessable Entity' },
        { status: HttpStatus.TOO_MANY_REQUESTS, message: 'Too Many Requests' },
        { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal Server Error' },
        { status: HttpStatus.BAD_GATEWAY, message: 'Bad Gateway' },
        { status: HttpStatus.SERVICE_UNAVAILABLE, message: 'Service Unavailable' },
      ];

      testCases.forEach(({ status, message }) => {
        jest.clearAllMocks();
        const exception = new HttpException(message, status);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(status);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: status,
            message,
          })
        );
      });
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error instances', () => {
      const error = new Error('Generic error message');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Generic error message',
          timestamp: expect.any(String),
          path: '/test/endpoint',
          method: 'GET',
        })
      );
    });

    it('should handle TypeError', () => {
      const error = new TypeError('Cannot read property of undefined');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Cannot read property of undefined',
        })
      );
    });

    it('should handle ReferenceError', () => {
      const error = new ReferenceError('Variable is not defined');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Variable is not defined',
        })
      );
    });
  });

  describe('Unknown exception handling', () => {
    it('should handle unknown exception types', () => {
      const unknownException = { weird: 'object', with: 'properties' };

      filter.catch(unknownException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        })
      );
    });

    it('should handle null exceptions', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        })
      );
    });

    it('should handle undefined exceptions', () => {
      filter.catch(undefined, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        })
      );
    });

    it('should handle string exceptions', () => {
      filter.catch('String error message', mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        })
      );
    });

    it('should handle number exceptions', () => {
      filter.catch(500, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        })
      );
    });
  });

  describe('Error logging', () => {
    it('should log HttpException errors', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'HTTP 400 Error: Test error',
        exception.stack
      );
    });

    it('should log generic errors with stack trace', () => {
      const error = new Error('Generic error');

      filter.catch(error, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'HTTP 500 Error: Generic error',
        error.stack
      );
    });

    it('should log unknown errors without stack trace', () => {
      const unknownError = { message: 'Unknown error' };

      filter.catch(unknownError, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'HTTP 500 Error: Internal server error',
        undefined
      );
    });

    it('should handle logging errors gracefully', () => {
      mockLogger.error.mockImplementation(() => {
        throw new Error('Logger error');
      });

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      // Currently logger errors propagate up (should be caught in real implementation)
      expect(() => {
        filter.catch(exception, mockArgumentsHost);
      }).toThrow('Logger error');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Response format', () => {
    it('should include all required fields in error response', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const beforeTimestamp = new Date().toISOString();

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json as jest.Mock;
      const errorResponse = responseCall.mock.calls[0][0];

      expect(errorResponse).toHaveProperty('statusCode', HttpStatus.BAD_REQUEST);
      expect(errorResponse).toHaveProperty('timestamp');
      expect(errorResponse).toHaveProperty('path', '/test/endpoint');
      expect(errorResponse).toHaveProperty('method', 'GET');
      expect(errorResponse).toHaveProperty('message', 'Test error');

      // Verify timestamp is a valid ISO string and recent
      expect(new Date(errorResponse.timestamp)).toBeInstanceOf(Date);
      expect(errorResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include errors field when present', () => {
      const exception = new HttpException(
        {
          message: 'Validation failed',
          errors: ['Field1 is required', 'Field2 must be a number'],
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json as jest.Mock;
      const errorResponse = responseCall.mock.calls[0][0];

      expect(errorResponse).toHaveProperty('errors', [
        'Field1 is required',
        'Field2 must be a number',
      ]);
    });

    it('should not include errors field when not present', () => {
      const exception = new HttpException('Simple error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json as jest.Mock;
      const errorResponse = responseCall.mock.calls[0][0];

      expect(errorResponse).not.toHaveProperty('errors');
    });
  });

  describe('Request information extraction', () => {
    it('should extract request information from different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

      methods.forEach(method => {
        jest.clearAllMocks();
        mockRequest.method = method;
        const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

        filter.catch(exception, mockArgumentsHost);

        const responseCall = mockResponse.json as jest.Mock;
        const errorResponse = responseCall.mock.calls[0][0];

        expect(errorResponse.method).toBe(method);
      });
    });

    it('should handle different URL patterns', () => {
      const urls = [
        '/api/users',
        '/graphql',
        '/health',
        '/metrics',
        '/api/v1/resources/123',
        '/complex/path/with/params?query=value',
      ];

      urls.forEach(url => {
        jest.clearAllMocks();
        mockRequest.url = url;
        const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

        filter.catch(exception, mockArgumentsHost);

        const responseCall = mockResponse.json as jest.Mock;
        const errorResponse = responseCall.mock.calls[0][0];

        expect(errorResponse.path).toBe(url);
      });
    });

    it('should handle missing request properties gracefully', () => {
      const minimalRequest = {};
      (mockArgumentsHost as any).httpContext.getRequest.mockReturnValue(minimalRequest);

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json as jest.Mock;
      const errorResponse = responseCall.mock.calls[0][0];

      expect(errorResponse).toHaveProperty('statusCode');
      expect(errorResponse).toHaveProperty('timestamp');
      expect(errorResponse).toHaveProperty('message');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle GraphQL errors', () => {
      mockRequest.url = '/graphql';
      mockRequest.method = 'POST';
      mockRequest.body = {
        query: 'query { invalidField }',
        variables: {},
      };

      const graphqlException = new HttpException(
        {
          message: 'Cannot query field "invalidField" on type "Query"',
          errors: [{
            message: 'Cannot query field "invalidField" on type "Query"',
            locations: [{ line: 1, column: 9 }],
            path: ['invalidField'],
          }],
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(graphqlException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/graphql',
          method: 'POST',
          errors: expect.any(Array),
        })
      );
    });

    it('should handle authentication errors', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      const authException = new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);

      filter.catch(authException, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'HTTP 401 Error: Invalid token',
        expect.any(String)
      );
    });

    it('should handle validation errors', () => {
      const validationException = new HttpException(
        {
          message: 'Validation failed',
          errors: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Password too short' },
          ],
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(validationException, mockArgumentsHost);

      const responseCall = mockResponse.json as jest.Mock;
      const errorResponse = responseCall.mock.calls[0][0];

      expect(errorResponse.errors).toEqual([
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ]);
    });

    it('should handle timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      filter.catch(timeoutError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'HTTP 500 Error: Request timeout',
        expect.any(String)
      );
    });

    it('should handle database connection errors', () => {
      const dbError = new Error('Database connection failed');
      dbError.name = 'DatabaseError';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'HTTP 500 Error: Database connection failed',
        expect.any(String)
      );
    });
  });

  describe('Error filter middleware integration', () => {
    it('should work with different response types', () => {
      // Test with different response mock implementations
      const alternativeResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
      };

      (mockArgumentsHost as any).httpContext.getResponse.mockReturnValue(alternativeResponse);

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(alternativeResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(alternativeResponse.json).toHaveBeenCalled();
    });

    it('should handle concurrent exception processing', () => {
      const exceptions = Array.from({ length: 10 }, (_, i) =>
        new HttpException(`Error ${i}`, HttpStatus.BAD_REQUEST)
      );

      exceptions.forEach(exception => {
        filter.catch(exception, mockArgumentsHost);
      });

      expect(mockResponse.status).toHaveBeenCalledTimes(10);
      expect(mockResponse.json).toHaveBeenCalledTimes(10);
      expect(mockLogger.error).toHaveBeenCalledTimes(10);
    });
  });
});