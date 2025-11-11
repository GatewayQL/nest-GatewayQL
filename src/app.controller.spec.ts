import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  const mockAppService = {
    getHello: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should be defined', () => {
      expect(appController).toBeDefined();
      expect(appService).toBeDefined();
    });

    it('should return "Hello World!" from getHello', () => {
      const expectedMessage = 'Hello World!';
      mockAppService.getHello.mockReturnValue(expectedMessage);

      const result = appController.getHello();

      expect(mockAppService.getHello).toHaveBeenCalled();
      expect(result).toBe(expectedMessage);
    });
  });

  describe('HTTP Response', () => {
    it('should handle service response correctly', () => {
      const customMessage = 'Custom Hello Message';
      mockAppService.getHello.mockReturnValue(customMessage);

      const result = appController.getHello();

      expect(result).toBe(customMessage);
      expect(typeof result).toBe('string');
    });

    it('should call service method exactly once', () => {
      mockAppService.getHello.mockReturnValue('Hello World!');

      appController.getHello();

      expect(mockAppService.getHello).toHaveBeenCalledTimes(1);
      expect(mockAppService.getHello).toHaveBeenCalledWith();
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', () => {
      const error = new Error('Service error');
      mockAppService.getHello.mockImplementation(() => {
        throw error;
      });

      expect(() => appController.getHello()).toThrow('Service error');
      expect(mockAppService.getHello).toHaveBeenCalled();
    });
  });
});