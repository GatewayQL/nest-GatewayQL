import { CallHandler, ExecutionContext, RequestTimeoutException } from '@nestjs/common';
import { of, throwError, timer, Subject } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';
import { TimeoutInterceptor } from './timeout.interceptor';

describe('TimeoutInterceptor', () => {
  let interceptor: TimeoutInterceptor;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockExecutionContext: ExecutionContext;

  beforeEach(async () => {
    // Don't create via DI since TimeoutInterceptor takes a primitive parameter
    mockCallHandler = {
      handle: jest.fn(),
    } as jest.Mocked<CallHandler>;

    mockExecutionContext = {} as ExecutionContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default timeout of 5000ms when not specified', () => {
      interceptor = new TimeoutInterceptor();
      expect(interceptor['timeoutMs']).toBe(5000);
    });

    it('should use custom timeout when specified', () => {
      const customTimeout = 3000;
      interceptor = new TimeoutInterceptor(customTimeout);
      expect(interceptor['timeoutMs']).toBe(customTimeout);
    });
  });

  describe('intercept', () => {
    beforeEach(() => {
      interceptor = new TimeoutInterceptor(1000); // 1 second timeout for tests
    });

    it('should allow request to complete within timeout', (done) => {
      const testData = { message: 'success' };
      mockCallHandler.handle.mockReturnValue(of(testData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (data) => {
          expect(data).toEqual(testData);
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should allow fast request to complete successfully', (done) => {
      const testData = { message: 'fast response' };
      mockCallHandler.handle.mockReturnValue(
        of(testData).pipe(delay(100)) // 100ms delay, well within 1s timeout
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (data) => {
          expect(data).toEqual(testData);
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should throw RequestTimeoutException when request exceeds timeout', (done) => {
      // Mock a slow request that takes longer than timeout
      mockCallHandler.handle.mockReturnValue(
        of({ message: 'slow response' }).pipe(delay(1500)) // 1.5s delay, exceeds 1s timeout
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach here'));
        },
        error: (error) => {
          expect(error).toBeInstanceOf(RequestTimeoutException);
          expect(error.message).toBe('Request timeout');
          done();
        },
      });
    });

    it('should preserve original errors that are not timeout errors', (done) => {
      const originalError = new Error('Original error');
      mockCallHandler.handle.mockReturnValue(
        throwError(() => originalError)
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach here'));
        },
        error: (error) => {
          expect(error).toBe(originalError);
          expect(error.message).toBe('Original error');
          done();
        },
      });
    });

    it('should handle immediate errors correctly', (done) => {
      const immediateError = new Error('Immediate failure');
      mockCallHandler.handle.mockReturnValue(
        throwError(() => immediateError)
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach here'));
        },
        error: (error) => {
          expect(error).toBe(immediateError);
          done();
        },
      });
    });

    it('should handle observable that completes without emitting', (done) => {
      const emptyObservable = new Subject();
      mockCallHandler.handle.mockReturnValue(emptyObservable);

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Complete the observable immediately
      setTimeout(() => {
        emptyObservable.complete();
      }, 100);

      result.subscribe({
        next: () => {
          // Should not receive any values
        },
        error: (error) => {
          done(error);
        },
        complete: () => {
          done();
        },
      });
    });

    it('should handle multiple emissions within timeout', (done) => {
      const values = ['first', 'second', 'third'];
      const emittedValues: string[] = [];

      mockCallHandler.handle.mockReturnValue(
        timer(0, 200).pipe(
          mergeMap((i) => i < values.length ? of(values[i]) : throwError(() => new Error('complete')))
        )
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          emittedValues.push(value);
        },
        error: (error) => {
          if (error.message === 'complete') {
            expect(emittedValues).toEqual(['first', 'second', 'third']);
            done();
          } else {
            done(error);
          }
        },
      });
    });

    it('should work with different timeout values', (done) => {
      const shortTimeoutInterceptor = new TimeoutInterceptor(500); // 500ms timeout
      const testData = { message: 'response' };

      mockCallHandler.handle.mockReturnValue(
        of(testData).pipe(delay(300)) // 300ms delay, within 500ms timeout
      );

      const result = shortTimeoutInterceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (data) => {
          expect(data).toEqual(testData);
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should timeout with shorter timeout value', (done) => {
      const shortTimeoutInterceptor = new TimeoutInterceptor(200); // 200ms timeout

      mockCallHandler.handle.mockReturnValue(
        of({ message: 'response' }).pipe(delay(300)) // 300ms delay, exceeds 200ms timeout
      );

      const result = shortTimeoutInterceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach here'));
        },
        error: (error) => {
          expect(error).toBeInstanceOf(RequestTimeoutException);
          expect(error.message).toBe('Request timeout');
          done();
        },
      });
    });

    it('should handle very small timeout correctly', (done) => {
      const smallTimeoutInterceptor = new TimeoutInterceptor(1); // 1ms timeout

      // Use an observable with a delay longer than the timeout
      mockCallHandler.handle.mockReturnValue(
        of({ message: 'delayed response' }).pipe(delay(10)) // 10ms delay, longer than 1ms timeout
      );

      const result = smallTimeoutInterceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should timeout due to small timeout value'));
        },
        error: (error) => {
          expect(error).toBeInstanceOf(RequestTimeoutException);
          expect(error.message).toBe('Request timeout');
          done();
        },
      });
    });

    it('should handle very large timeout values', (done) => {
      const largeTimeoutInterceptor = new TimeoutInterceptor(999999); // Very large timeout
      const testData = { message: 'response' };

      mockCallHandler.handle.mockReturnValue(of(testData));

      const result = largeTimeoutInterceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (data) => {
          expect(data).toEqual(testData);
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should properly clean up resources on timeout', (done) => {
      const longRunningSubject = new Subject();
      mockCallHandler.handle.mockReturnValue(longRunningSubject);

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach here'));
        },
        error: (error) => {
          expect(error).toBeInstanceOf(RequestTimeoutException);
          // Verify the subject is still active (not completed by the interceptor)
          expect(longRunningSubject.closed).toBe(false);
          done();
        },
      });

      // Emit after timeout should occur
      setTimeout(() => {
        longRunningSubject.next('late emission');
      }, 1500);
    });
  });
});