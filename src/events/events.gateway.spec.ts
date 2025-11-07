import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { CustomLoggerService } from '../common/logger/logger.service';
import { Socket } from 'socket.io';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let logger: CustomLoggerService;

  const mockSocket = {
    id: 'test-socket-id',
  } as Socket;

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should log when client connects', () => {
      gateway.handleConnection(mockSocket);
      expect(mockLogger.log).toHaveBeenCalledWith(`Client connected: ${mockSocket.id}`);
    });
  });

  describe('handleDisconnect', () => {
    it('should log when client disconnects', () => {
      gateway.handleDisconnect(mockSocket);
      expect(mockLogger.log).toHaveBeenCalledWith(`Client disconnected: ${mockSocket.id}`);
    });
  });

  describe('handleHealthCheck', () => {
    it('should return health status', () => {
      const result = gateway.handleHealthCheck(mockSocket, {});
      expect(result.event).toBe('health');
      expect(result.data.status).toBe('ok');
      expect(result.data.timestamp).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(`Health check from client: ${mockSocket.id}`);
    });
  });

  describe('emitToAll', () => {
    it('should emit event to all clients', () => {
      const mockServer = {
        emit: jest.fn(),
      };
      gateway.server = mockServer as any;

      gateway.emitToAll('test-event', { data: 'test' });
      expect(mockServer.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });
  });

  describe('emitToClient', () => {
    it('should emit event to specific client', () => {
      const mockTo = jest.fn().mockReturnThis();
      const mockEmit = jest.fn();
      const mockServer = {
        to: mockTo,
      };
      (mockTo as any).mockReturnValue({ emit: mockEmit });

      gateway.server = mockServer as any;
      gateway.emitToClient('client-id', 'test-event', { data: 'test' });
      expect(mockServer.to).toHaveBeenCalledWith('client-id');
    });
  });
});
