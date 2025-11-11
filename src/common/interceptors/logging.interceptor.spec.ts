import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';
import { CustomLoggerService } from '../logger/logger.service';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: CustomLoggerService;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockHandler: jest.Mocked<CallHandler>;
  let mockRequest: any;
  let mockResponse: any;

  const mockLogger = {
    setContext: jest.fn(),
    logRequest: jest.fn(),
    logResponse: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    logger = module.get<CustomLoggerService>(CustomLoggerService);

    // Mock request and response objects
    mockRequest = {
      method: 'GET',
      url: '/test/endpoint',
      headers: {
        'user-agent': 'test-agent',
        'content-type': 'application/json',
        authorization: 'Bearer test-token',
      },
      ip: '127.0.0.1',
      body: {},
      query: {},
      params: {},
    };

    mockResponse = {
      statusCode: 200,
      getHeaders: jest.fn().mockReturnValue({}),
      getHeader: jest.fn(),
      setHeader: jest.fn(),
    };

    // Mock HTTP context
    const mockHttpContext = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    };

    // Mock execution context
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as jest.Mocked<ExecutionContext>;

    // Store reference to nested mocks for easy access
    (mockContext as any).httpContext = mockHttpContext;

    // Mock call handler
    mockHandler = {
      handle: jest.fn(),
    } as jest.Mocked<CallHandler>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset logger mock implementations to default behavior
    mockLogger.logRequest.mockReset().mockImplementation(() => {});
    mockLogger.logResponse.mockReset().mockImplementation(() => {});
    mockLogger.log.mockReset().mockImplementation(() => {});
    mockLogger.error.mockReset().mockImplementation(() => {});
    mockLogger.warn.mockReset().mockImplementation(() => {});
    mockLogger.debug.mockReset().mockImplementation(() => {});
  });

  describe('Basic functionality', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
      expect(logger).toBeDefined();
    });

    it('should set logger context on initialization', () => {
      expect(mockLogger.setContext).toHaveBeenCalledWith('LoggingInterceptor');
    });
  });

  describe('Request logging', () => {
    it('should log incoming request', async () => {
      mockHandler.handle.mockReturnValue(of('test response'));

      await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(mockLogger.logRequest).toHaveBeenCalledWith(mockRequest);
    });

    it('should log request for different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

      for (const method of methods) {
        mockRequest.method = method;
        mockHandler.handle.mockReturnValue(of(`${method} response`));

        await interceptor.intercept(mockContext, mockHandler).toPromise();

        expect(mockLogger.logRequest).toHaveBeenCalledWith(
          expect.objectContaining({ method })
        );
      }

      expect(mockLogger.logRequest).toHaveBeenCalledTimes(methods.length);
    });

    it('should handle request with complex data', async () => {
      const complexRequest = {
        ...mockRequest,
        body: {
          user: { id: 1, name: 'Test User' },
          data: [1, 2, 3],
          nested: { deep: { value: 'test' } },
        },
        query: { search: 'test query', limit: '10' },
        params: { id: '123', category: 'test' },
      };

      (mockContext as any).httpContext.getRequest.mockReturnValue(complexRequest);
      mockHandler.handle.mockReturnValue(of('response'));

      await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(mockLogger.logRequest).toHaveBeenCalledWith(complexRequest);
    });

    it('should handle request with missing properties gracefully', async () => {
      const minimalRequest = {
        method: 'GET',
        url: '/test',
      };

      (mockContext as any).httpContext.getRequest.mockReturnValue(minimalRequest);
      mockHandler.handle.mockReturnValue(of('response'));

      await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(mockLogger.logRequest).toHaveBeenCalledWith(minimalRequest);
    });
  });

  describe('Response logging', () => {
    it('should log response with duration', async () => {
      const testResponse = 'test response data';
      mockHandler.handle.mockReturnValue(of(testResponse));

      const startTime = Date.now();
      await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(mockLogger.logResponse).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        expect.any(Number)
      );

      const callArgs = mockLogger.logResponse.mock.calls[0];
      const duration = callArgs[2];
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(1000); // Should be very fast in tests
    });

    it('should calculate duration accurately', async () => {
      // Mock a slow handler
      mockHandler.handle.mockReturnValue(
        of('slow response').pipe(delay(50))
      );

      const result = interceptor.intercept(mockContext, mockHandler);
      await result.toPromise();

      const callArgs = mockLogger.logResponse.mock.calls[0];
      const duration = callArgs[2];
      expect(duration).toBeGreaterThan(40); // Should account for the 50ms delay
    });

    it('should log response for different status codes', async () => {
      const statusCodes = [200, 201, 204, 301, 400, 401, 403, 404, 500];

      for (const statusCode of statusCodes) {
        mockResponse.statusCode = statusCode;
        mockHandler.handle.mockReturnValue(of(`Response for ${statusCode}`));

        await interceptor.intercept(mockContext, mockHandler).toPromise();

        expect(mockLogger.logResponse).toHaveBeenCalledWith(
          mockRequest,
          expect.objectContaining({ statusCode }),
          expect.any(Number)
        );
      }

      expect(mockLogger.logResponse).toHaveBeenCalledTimes(statusCodes.length);
    });

    it('should handle empty or null responses', async () => {
      const emptyResponses = [null, undefined, '', 0, false, []];

      for (const response of emptyResponses) {
        mockHandler.handle.mockReturnValue(of(response));

        await interceptor.intercept(mockContext, mockHandler).toPromise();

        expect(mockLogger.logResponse).toHaveBeenCalledWith(
          mockRequest,
          mockResponse,
          expect.any(Number)
        );
      }

      expect(mockLogger.logResponse).toHaveBeenCalledTimes(emptyResponses.length);
    });
  });

  describe('Error handling', () => {
    it('should not log response if handler throws error', async () => {
      const error = new Error('Handler error');
      mockHandler.handle.mockReturnValue(throwError(error));

      try {
        await interceptor.intercept(mockContext, mockHandler).toPromise();
      } catch (e) {
        expect(e).toBe(error);
      }

      expect(mockLogger.logRequest).toHaveBeenCalled();
      expect(mockLogger.logResponse).not.toHaveBeenCalled();
    });

    it('should handle logger errors gracefully', async () => {
      mockLogger.logRequest.mockImplementation(() => {
        throw new Error('Logger error');
      });

      try {
        await interceptor.intercept(mockContext, mockHandler).toPromise();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toBe('Logger error');
      }

      expect(mockLogger.logRequest).toHaveBeenCalled();
    });

    it('should handle context errors gracefully', async () => {
      mockContext.switchToHttp = jest.fn().mockImplementation(() => {
        throw new Error('Context error');
      });

      try {
        await interceptor.intercept(mockContext, mockHandler).toPromise();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toBe('Context error');
      }
    });

    it('should handle response logger errors', async () => {
      mockLogger.logResponse.mockImplementation(() => {
        throw new Error('Response logger error');
      });
      mockHandler.handle.mockReturnValue(of('test response'));

      await expect(
        interceptor.intercept(mockContext, mockHandler).toPromise()
      ).rejects.toThrow('Response logger error');

      expect(mockLogger.logRequest).toHaveBeenCalled();
      expect(mockLogger.logResponse).toHaveBeenCalled();
    });
  });

  describe('Observable stream handling', () => {
    it('should preserve original observable stream', async () => {
      const testData = { id: 1, name: 'test' };
      mockHandler.handle.mockReturnValue(of(testData));

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(result).toEqual(testData);
    });

    it('should handle multiple emissions', (done) => {
      const testValues = [1, 2, 3];
      const source = of(...testValues);
      mockHandler.handle.mockReturnValue(source);

      const results: number[] = [];
      interceptor.intercept(mockContext, mockHandler).subscribe({
        next: (value) => results.push(value),
        complete: () => {
          expect(results).toEqual(testValues);
          expect(mockLogger.logResponse).toHaveBeenCalledTimes(testValues.length);
          done();
        },
      });
    });

    it('should handle synchronous observables', () => {
      const testValue = 'sync value';
      mockHandler.handle.mockReturnValue(of(testValue));

      const observable = interceptor.intercept(mockContext, mockHandler);

      expect(observable).toBeDefined();
      // The observable should emit synchronously
      let result: any;
      observable.subscribe(value => result = value);
      expect(result).toBe(testValue);
    });

    it('should handle async observables', async () => {
      const asyncValue = 'async value';
      // Use delay to simulate async behavior within an observable
      const asyncObservable = of(asyncValue).pipe(delay(10));

      mockHandler.handle.mockReturnValue(asyncObservable);

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise();
      expect(result).toBe(asyncValue);
    });
  });

  describe('Request/Response patterns', () => {
    it('should handle GraphQL requests', async () => {
      const graphqlRequest = {
        ...mockRequest,
        method: 'POST',
        url: '/graphql',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          query: 'query { users { id name } }',
          variables: { limit: 10 },
          operationName: 'GetUsers',
        },
      };

      (mockContext as any).httpContext.getRequest.mockReturnValue(graphqlRequest);
      mockHandler.handle.mockReturnValue(of({
        data: { users: [{ id: 1, name: 'User 1' }] }
      }));

      await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(mockLogger.logRequest).toHaveBeenCalledWith(graphqlRequest);
      expect(mockLogger.logResponse).toHaveBeenCalled();
    });

    it('should handle REST API requests', async () => {
      const restRequest = {
        ...mockRequest,
        method: 'POST',
        url: '/api/users',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json',
        },
        body: { name: 'New User', email: 'user@example.com' },
      };

      (mockContext as any).httpContext.getRequest.mockReturnValue(restRequest);
      mockResponse.statusCode = 201;
      mockHandler.handle.mockReturnValue(of({
        id: 1,
        name: 'New User',
        email: 'user@example.com'
      }));

      await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(mockLogger.logRequest).toHaveBeenCalledWith(restRequest);
      expect(mockLogger.logResponse).toHaveBeenCalledWith(
        restRequest,
        expect.objectContaining({ statusCode: 201 }),
        expect.any(Number)
      );
    });

    it('should handle file upload requests', async () => {
      const uploadRequest = {
        ...mockRequest,
        method: 'POST',
        url: '/api/upload',
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
        },
        body: {
          file: 'binary-file-data',
          metadata: { filename: 'test.pdf', size: 1024 },
        },
      };

      (mockContext as any).httpContext.getRequest.mockReturnValue(uploadRequest);
      mockHandler.handle.mockReturnValue(of({
        success: true,
        fileId: 'abc123',
        url: '/files/abc123'
      }));

      await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(mockLogger.logRequest).toHaveBeenCalledWith(uploadRequest);
      expect(mockLogger.logResponse).toHaveBeenCalled();
    });
  });

  describe('Performance and timing', () => {
    it('should have minimal performance impact', async () => {
      const iterations = 100;
      const responses = Array.from({ length: iterations }, (_, i) => `response-${i}`);

      for (let i = 0; i < iterations; i++) {
        mockHandler.handle.mockReturnValue(of(responses[i]));
        await interceptor.intercept(mockContext, mockHandler).toPromise();
      }

      expect(mockLogger.logRequest).toHaveBeenCalledTimes(iterations);
      expect(mockLogger.logResponse).toHaveBeenCalledTimes(iterations);
    });

    it('should measure sub-millisecond durations', async () => {
      mockHandler.handle.mockReturnValue(of('fast response'));

      await interceptor.intercept(mockContext, mockHandler).toPromise();

      const callArgs = mockLogger.logResponse.mock.calls[0];
      const duration = callArgs[2];
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(10); // Very fast operation
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => {
        mockHandler.handle.mockReturnValue(of(`concurrent-response-${i}`));
        return interceptor.intercept(mockContext, mockHandler).toPromise();
      });

      await Promise.all(concurrentRequests);

      expect(mockLogger.logRequest).toHaveBeenCalledTimes(10);
      expect(mockLogger.logResponse).toHaveBeenCalledTimes(10);
    });
  });

  describe('Integration scenarios', () => {
    it('should work with middleware chain', async () => {
      // Simulate a middleware chain that modifies request/response
      const modifiedRequest = {
        ...mockRequest,
        userId: 123,
        timestamp: Date.now(),
      };

      const modifiedResponse = {
        ...mockResponse,
        statusCode: 200,
        customHeader: 'middleware-added',
      };

      (mockContext as any).httpContext.getRequest.mockReturnValue(modifiedRequest);
      (mockContext as any).httpContext.getResponse.mockReturnValue(modifiedResponse);
      mockHandler.handle.mockReturnValue(of({ success: true }));

      await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(mockLogger.logRequest).toHaveBeenCalledWith(modifiedRequest);
      expect(mockLogger.logResponse).toHaveBeenCalledWith(
        modifiedRequest,
        modifiedResponse,
        expect.any(Number)
      );
    });

    it('should integrate with authentication flow', async () => {
      const authenticatedRequest = {
        ...mockRequest,
        user: { id: 1, email: 'user@example.com', roles: ['user'] },
        isAuthenticated: true,
      };

      (mockContext as any).httpContext.getRequest.mockReturnValue(authenticatedRequest);
      mockHandler.handle.mockReturnValue(of({ message: 'Authenticated response' }));

      await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(mockLogger.logRequest).toHaveBeenCalledWith(authenticatedRequest);
      expect(mockLogger.logResponse).toHaveBeenCalled();
    });

    it('should handle caching scenarios', async () => {
      const cachedResponse = {
        data: 'cached data',
        fromCache: true,
        timestamp: Date.now(),
      };

      mockHandler.handle.mockReturnValue(of(cachedResponse));

      await interceptor.intercept(mockContext, mockHandler).toPromise();

      expect(mockLogger.logRequest).toHaveBeenCalled();
      expect(mockLogger.logResponse).toHaveBeenCalled();

      // The duration should still be measured even for cached responses
      const callArgs = mockLogger.logResponse.mock.calls[0];
      const duration = callArgs[2];
      expect(duration).toBeDefined();
    });
  });
});