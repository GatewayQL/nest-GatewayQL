import { Test, TestingModule } from '@nestjs/testing';
import { CustomLoggerService } from './logger.service';

describe('CustomLoggerService', () => {
  let service: CustomLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomLoggerService],
    }).compile();

    service = await module.resolve<CustomLoggerService>(CustomLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setContext', () => {
    it('should set the context', () => {
      service.setContext('TestContext');
      // Context is private, but we can test that it doesn't throw
      expect(() => service.setContext('TestContext')).not.toThrow();
    });
  });

  describe('log', () => {
    it('should log a message', () => {
      const spy = jest.spyOn(service['logger'], 'info');
      service.log('Test message', 'TestContext');
      expect(spy).toHaveBeenCalledWith('Test message', { context: 'TestContext' });
    });

    it('should use the set context if no context provided', () => {
      service.setContext('DefaultContext');
      const spy = jest.spyOn(service['logger'], 'info');
      service.log('Test message');
      expect(spy).toHaveBeenCalledWith('Test message', { context: 'DefaultContext' });
    });
  });

  describe('error', () => {
    it('should log an error with trace', () => {
      const spy = jest.spyOn(service['logger'], 'error');
      service.error('Error message', 'Stack trace', 'ErrorContext');
      expect(spy).toHaveBeenCalledWith('Error message', {
        context: 'ErrorContext',
        trace: 'Stack trace',
      });
    });
  });

  describe('warn', () => {
    it('should log a warning', () => {
      const spy = jest.spyOn(service['logger'], 'warn');
      service.warn('Warning message', 'WarnContext');
      expect(spy).toHaveBeenCalledWith('Warning message', { context: 'WarnContext' });
    });
  });

  describe('debug', () => {
    it('should log a debug message', () => {
      const spy = jest.spyOn(service['logger'], 'debug');
      service.debug('Debug message', 'DebugContext');
      expect(spy).toHaveBeenCalledWith('Debug message', { context: 'DebugContext' });
    });
  });

  describe('verbose', () => {
    it('should log a verbose message', () => {
      const spy = jest.spyOn(service['logger'], 'verbose');
      service.verbose('Verbose message', 'VerboseContext');
      expect(spy).toHaveBeenCalledWith('Verbose message', { context: 'VerboseContext' });
    });
  });

  describe('logRequest', () => {
    it('should log request details', () => {
      const spy = jest.spyOn(service['logger'], 'info');
      const mockReq = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        get: jest.fn(() => 'Mozilla'),
      };
      service.logRequest(mockReq as any);
      expect(spy).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
        context: 'HTTP',
        method: 'GET',
        url: '/test',
      }));
    });
  });

  describe('logResponse', () => {
    it('should log response details with duration', () => {
      const spy = jest.spyOn(service['logger'], 'info');
      const mockReq = { method: 'GET', url: '/test' };
      const mockRes = { statusCode: 200 };
      service.logResponse(mockReq as any, mockRes as any, 150);
      expect(spy).toHaveBeenCalledWith('Outgoing response', expect.objectContaining({
        context: 'HTTP',
        statusCode: 200,
        duration: '150ms',
      }));
    });
  });
});
