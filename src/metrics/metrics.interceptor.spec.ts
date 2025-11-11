import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;

  beforeEach(async () => {
    // Create simple mock metrics objects
    const mockCounter = {
      inc: jest.fn(),
    };

    const mockHistogram = {
      observe: jest.fn(),
    };

    // Mock the interceptor directly since dependency injection is complex
    interceptor = new MetricsInterceptor(mockCounter as any, mockHistogram as any);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should increment counter and record duration on successful request', (done) => {
    const mockRequest = {
      method: 'GET',
      url: '/api/test',
      route: { path: '/api/test' },
    };

    const mockResponse = {
      statusCode: 200,
    };

    const mockHttpContext = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getNext: jest.fn(),
    };

    const mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
    } as any;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    };

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      next: (value) => {
        expect(value).toEqual({ data: 'test' });
      },
      complete: () => {
        expect((interceptor as any).httpRequestsCounter.inc).toHaveBeenCalledWith({
          method: 'GET',
          route: '/api/test',
          status_code: '200',
        });
        expect((interceptor as any).httpRequestDuration.observe).toHaveBeenCalledWith(
          {
            method: 'GET',
            route: '/api/test',
            status_code: '200',
          },
          expect.any(Number),
        );
        done();
      },
    });
  });

  it('should use URL when route path is not available', (done) => {
    const mockRequest = {
      method: 'POST',
      url: '/api/custom',
      route: undefined,
    };

    const mockResponse = {
      statusCode: 201,
    };

    const mockHttpContext = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getNext: jest.fn(),
    };

    const mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
    } as any;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ created: true })),
    };

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      complete: () => {
        expect((interceptor as any).httpRequestsCounter.inc).toHaveBeenCalledWith({
          method: 'POST',
          route: '/api/custom',
          status_code: '201',
        });
        expect((interceptor as any).httpRequestDuration.observe).toHaveBeenCalledWith(
          {
            method: 'POST',
            route: '/api/custom',
            status_code: '201',
          },
          expect.any(Number),
        );
        done();
      },
    });
  });

  it('should handle errors properly', (done) => {
    const mockRequest = {
      method: 'GET',
      url: '/api/test',
      route: { path: '/api/test' },
    };

    const mockResponse = {
      statusCode: 500,
    };

    const mockHttpContext = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getNext: jest.fn(),
    };

    const mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
    } as any;

    const error = new Error('Test error');
    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(throwError(() => error)),
    };

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      error: (err) => {
        expect(err).toBe(error);
        // On error, the interceptor still sets up the tap operator
        // but it won't execute due to the immediate error
        done();
      },
    });
  });

  it('should handle different HTTP methods and status codes', (done) => {
    const mockRequest = {
      method: 'PUT',
      url: '/api/update',
      route: { path: '/api/update/:id' },
    };

    const mockResponse = {
      statusCode: 404,
    };

    const mockHttpContext = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getNext: jest.fn(),
    };

    const mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
    } as any;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ notFound: true })),
    };

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      complete: () => {
        expect((interceptor as any).httpRequestsCounter.inc).toHaveBeenCalledWith({
          method: 'PUT',
          route: '/api/update/:id',
          status_code: '404',
        });
        expect((interceptor as any).httpRequestDuration.observe).toHaveBeenCalledWith(
          {
            method: 'PUT',
            route: '/api/update/:id',
            status_code: '404',
          },
          expect.any(Number),
        );
        done();
      },
    });
  });

  it('should handle requests with no route info', (done) => {
    const mockRequest = {
      method: 'DELETE',
      url: '/api/delete/123',
      route: null,
    };

    const mockResponse = {
      statusCode: 500,
    };

    const mockHttpContext = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getNext: jest.fn(),
    };

    const mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
    } as any;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ error: 'Server error' })),
    };

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      complete: () => {
        expect((interceptor as any).httpRequestsCounter.inc).toHaveBeenCalledWith({
          method: 'DELETE',
          route: '/api/delete/123',
          status_code: '500',
        });
        done();
      },
    });
  });
});