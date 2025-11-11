import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { PluginController } from './plugin.controller';
import { RouteRegistry } from './registries/route.registry';
import { CustomLoggerService } from '../common/logger/logger.service';
import { RouteDefinition } from './interfaces/plugin.interface';

describe('PluginController', () => {
  let controller: PluginController;
  let routeRegistry: jest.Mocked<RouteRegistry>;
  let logger: jest.Mocked<CustomLoggerService>;
  let mockReq: Request;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(async () => {
    const mockRouteRegistry = {
      getAll: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        {
          provide: RouteRegistry,
          useValue: mockRouteRegistry,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<PluginController>(PluginController);
    routeRegistry = module.get(RouteRegistry);
    logger = module.get(CustomLoggerService);

    // Setup mock request and response
    mockReq = {
      method: 'GET',
      path: '/plugin/test',
    } as Request;

    mockRes = {
      headersSent: false,
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should set logger context on initialization', () => {
    expect(logger.setContext).toHaveBeenCalledWith('PluginController');
  });

  describe('handlePluginRoute', () => {
    it('should handle matched route with handler', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const mockRoute: RouteDefinition = {
        method: 'GET',
        path: '/test',
        handler: mockHandler,
        middleware: [],
      };

      routeRegistry.getAll.mockReturnValue([mockRoute]);

      await controller.handlePluginRoute(
        mockReq,
        mockRes as Response,
        mockNext,
      );

      expect(routeRegistry.getAll).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should execute middleware before handler', async () => {
      const middlewareExecuted: number[] = [];
      const mockMiddleware1 = jest.fn((req, res, next) => {
        middlewareExecuted.push(1);
        next();
      });
      const mockMiddleware2 = jest.fn((req, res, next) => {
        middlewareExecuted.push(2);
        next();
      });
      const mockHandler = jest.fn().mockResolvedValue({ success: true });

      const mockRoute: RouteDefinition = {
        method: 'GET',
        path: '/test',
        handler: mockHandler,
        middleware: [mockMiddleware1, mockMiddleware2],
      };

      routeRegistry.getAll.mockReturnValue([mockRoute]);

      await controller.handlePluginRoute(
        mockReq,
        mockRes as Response,
        mockNext,
      );

      expect(middlewareExecuted).toEqual([1, 2]);
      expect(mockHandler).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle middleware errors', async () => {
      const mockError = new Error('Middleware error');
      const mockMiddleware = jest.fn((req, res, next) => {
        next(mockError);
      });
      const mockHandler = jest.fn().mockResolvedValue({ success: true });

      const mockRoute: RouteDefinition = {
        method: 'GET',
        path: '/test',
        handler: mockHandler,
        middleware: [mockMiddleware],
      };

      routeRegistry.getAll.mockReturnValue([mockRoute]);

      await controller.handlePluginRoute(
        mockReq,
        mockRes as Response,
        mockNext,
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Error handling plugin route: Middleware error',
        expect.any(String),
      );
      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Middleware error',
      });
    });

    it('should handle handler errors', async () => {
      const mockError = new Error('Handler error');
      const mockHandler = jest.fn().mockRejectedValue(mockError);
      const mockRoute: RouteDefinition = {
        method: 'GET',
        path: '/test',
        handler: mockHandler,
        middleware: [],
      };

      routeRegistry.getAll.mockReturnValue([mockRoute]);

      await controller.handlePluginRoute(
        mockReq,
        mockRes as Response,
        mockNext,
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Error handling plugin route: Handler error',
        expect.any(String),
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Handler error',
      });
    });

    it('should not send response if headers already sent', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const mockRoute: RouteDefinition = {
        method: 'GET',
        path: '/test',
        handler: mockHandler,
        middleware: [],
      };

      mockRes.headersSent = true;
      routeRegistry.getAll.mockReturnValue([mockRoute]);

      await controller.handlePluginRoute(
        mockReq,
        mockRes as Response,
        mockNext,
      );

      expect(mockHandler).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should call next when no route matches', async () => {
      routeRegistry.getAll.mockReturnValue([]);

      await controller.handlePluginRoute(
        mockReq,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should match routes by method and path', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const routes: RouteDefinition[] = [
        {
          method: 'POST',
          path: '/test',
          handler: mockHandler,
          middleware: [],
        },
        {
          method: 'GET',
          path: '/different',
          handler: mockHandler,
          middleware: [],
        },
        {
          method: 'GET',
          path: '/test',
          handler: mockHandler,
          middleware: [],
        },
      ];

      routeRegistry.getAll.mockReturnValue(routes);

      await controller.handlePluginRoute(
        mockReq,
        mockRes as Response,
        mockNext,
      );

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('matchPath (private method testing via behavior)', () => {
    it('should match exact paths', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const mockRoute: RouteDefinition = {
        method: 'GET',
        path: '/test',
        handler: mockHandler,
        middleware: [],
      };

      routeRegistry.getAll.mockReturnValue([mockRoute]);
      (mockReq as any).path = '/plugin/test';

      await controller.handlePluginRoute(
        mockReq,
        mockRes as Response,
        mockNext,
      );

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should match paths with leading slash', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const mockRoute: RouteDefinition = {
        method: 'GET',
        path: '/test',
        handler: mockHandler,
        middleware: [],
      };

      routeRegistry.getAll.mockReturnValue([mockRoute]);
      (mockReq as any).path = '/plugin/test';

      await controller.handlePluginRoute(
        mockReq,
        mockRes as Response,
        mockNext,
      );

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should not match different paths', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const mockRoute: RouteDefinition = {
        method: 'GET',
        path: '/different',
        handler: mockHandler,
        middleware: [],
      };

      routeRegistry.getAll.mockReturnValue([mockRoute]);
      (mockReq as any).path = '/plugin/test';

      await controller.handlePluginRoute(
        mockReq,
        mockRes as Response,
        mockNext,
      );

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});