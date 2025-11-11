import { Test, TestingModule } from '@nestjs/testing';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TransformInterceptor, Response } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;
  let mockResponse: any;
  let mockHttpContext: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformInterceptor],
    }).compile();

    interceptor = module.get<TransformInterceptor<any>>(TransformInterceptor);

    mockResponse = {
      statusCode: 200,
    };

    mockRequest = {};

    mockHttpContext = {
      getRequest: jest.fn(() => mockRequest),
      getResponse: jest.fn(() => mockResponse),
    };

    mockExecutionContext = {
      switchToHttp: jest.fn(() => mockHttpContext),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
    } as any;

    mockCallHandler = {
      handle: jest.fn(),
    } as jest.Mocked<CallHandler>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset Date.prototype.toISOString if it was mocked
    if (jest.isMockFunction(Date.prototype.toISOString)) {
      jest.restoreAllMocks();
    }
  });

  describe('intercept', () => {
    it('should transform response with default status code 200', (done) => {
      const testData = { id: 1, name: 'test' };
      const mockTimestamp = '2023-01-01T00:00:00.000Z';

      // Mock Date.prototype.toISOString to return predictable timestamp
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(testData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: testData,
            statusCode: 200,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should transform response with custom status code', (done) => {
      const testData = { id: 1, name: 'created' };
      const customStatusCode = 201;
      const mockTimestamp = '2023-01-01T00:00:00.000Z';

      mockResponse.statusCode = customStatusCode;
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(testData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: testData,
            statusCode: customStatusCode,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should handle null data correctly', (done) => {
      const mockTimestamp = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(null));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: null,
            statusCode: 200,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should handle undefined data correctly', (done) => {
      const mockTimestamp = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(undefined));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: undefined,
            statusCode: 200,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should handle empty object data correctly', (done) => {
      const emptyObject = {};
      const mockTimestamp = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(emptyObject));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: emptyObject,
            statusCode: 200,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should handle array data correctly', (done) => {
      const arrayData = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const mockTimestamp = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(arrayData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: arrayData,
            statusCode: 200,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should handle string data correctly', (done) => {
      const stringData = 'Simple string response';
      const mockTimestamp = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(stringData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: stringData,
            statusCode: 200,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should handle number data correctly', (done) => {
      const numberData = 42;
      const mockTimestamp = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(numberData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: numberData,
            statusCode: 200,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should handle boolean data correctly', (done) => {
      const booleanData = true;
      const mockTimestamp = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(booleanData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: booleanData,
            statusCode: 200,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should not transform errors - let them pass through', (done) => {
      const errorMessage = 'Something went wrong';
      const error = new Error(errorMessage);

      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach here'));
        },
        error: (thrownError) => {
          expect(thrownError).toBe(error);
          expect(thrownError.message).toBe(errorMessage);
          done();
        },
      });
    });

    it('should use actual timestamp for each response', (done) => {
      const testData = { test: 'data' };
      let firstTimestamp: string;

      mockCallHandler.handle.mockReturnValue(of(testData));

      const result1 = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result1.subscribe({
        next: (transformedData: Response<any>) => {
          firstTimestamp = transformedData.timestamp;
          expect(typeof firstTimestamp).toBe('string');
          expect(new Date(firstTimestamp).getTime()).not.toBeNaN();

          // Test second call after a small delay
          setTimeout(() => {
            const result2 = interceptor.intercept(mockExecutionContext, mockCallHandler);

            result2.subscribe({
              next: (transformedData2: Response<any>) => {
                const secondTimestamp = transformedData2.timestamp;
                // Timestamps should be different (or very close if execution is fast)
                expect(secondTimestamp).toBeDefined();
                expect(typeof secondTimestamp).toBe('string');
                done();
              },
              error: (error) => {
                done(error);
              },
            });
          }, 1);
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should handle nested object data correctly', (done) => {
      const nestedData = {
        user: {
          id: 1,
          name: 'John Doe',
          profile: {
            email: 'john@example.com',
            preferences: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        metadata: {
          version: '1.0.0',
          timestamp: 1234567890,
        },
      };

      const mockTimestamp = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(nestedData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: nestedData,
            statusCode: 200,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          expect(transformedData.data.user.profile.email).toBe('john@example.com');
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should handle different HTTP status codes correctly', (done) => {
      const testCases = [
        { statusCode: 200, data: { message: 'OK' } },
        { statusCode: 201, data: { id: 1, created: true } },
        { statusCode: 204, data: null },
        { statusCode: 400, data: { error: 'Bad Request' } },
        { statusCode: 404, data: { error: 'Not Found' } },
        { statusCode: 500, data: { error: 'Internal Server Error' } },
      ];

      let completedTests = 0;
      const mockTimestamp = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      testCases.forEach((testCase, index) => {
        mockResponse.statusCode = testCase.statusCode;
        mockCallHandler.handle.mockReturnValue(of(testCase.data));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          next: (transformedData: Response<any>) => {
            expect(transformedData).toEqual({
              data: testCase.data,
              statusCode: testCase.statusCode,
              message: 'Success',
              timestamp: mockTimestamp,
            });

            completedTests++;
            if (completedTests === testCases.length) {
              done();
            }
          },
          error: (error) => {
            done(error);
          },
        });
      });
    });

    it('should maintain response structure for complex pagination data', (done) => {
      const paginationData = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        links: {
          self: '/api/items?page=1&limit=10',
          first: '/api/items?page=1&limit=10',
          last: '/api/items?page=1&limit=10',
        },
      };

      const mockTimestamp = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      mockCallHandler.handle.mockReturnValue(of(paginationData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedData: Response<any>) => {
          expect(transformedData).toEqual({
            data: paginationData,
            statusCode: 200,
            message: 'Success',
            timestamp: mockTimestamp,
          });
          expect(transformedData.data.items).toHaveLength(2);
          expect(transformedData.data.pagination.total).toBe(2);
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });
  });
});