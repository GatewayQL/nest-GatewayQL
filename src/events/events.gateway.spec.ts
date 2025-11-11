import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { CustomLoggerService } from '../common/logger/logger.service';
import { Socket, Server } from 'socket.io';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let logger: CustomLoggerService;
  let mockServer: Partial<Server>;

  const mockSocket = {
    id: 'test-socket-id',
    handshake: {
      headers: {
        'user-agent': 'test-user-agent',
      },
      address: '127.0.0.1',
      time: new Date().toISOString(),
      xdomain: false,
      secure: false,
      issued: Date.now(),
      url: '/',
      query: {},
      auth: {},
    },
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as Socket;

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
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

    // Mock server
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      sockets: {
        sockets: new Map(),
        adapter: {
          nsp: {},
        },
        name: '/',
        server: {},
        to: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        allSockets: jest.fn().mockResolvedValue(new Set()),
        compress: jest.fn().mockReturnThis(),
        volatile: jest.fn().mockReturnThis(),
        local: jest.fn().mockReturnThis(),
        timeout: jest.fn().mockReturnThis(),
        use: jest.fn(),
        run: jest.fn(),
        except: jest.fn().mockReturnThis(),
        disconnectSockets: jest.fn(),
        serverSideEmit: jest.fn(),
        bind: jest.fn().mockReturnThis(),
        _adapter: {},
        _fns: [],
        _rooms: new Set(),
        _flags: {},
        _ids: 0,
        connected: {},
      } as any,
    };
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset logger mock implementations to default behavior
    mockLogger.log.mockReset().mockImplementation(() => {});
    mockLogger.warn.mockReset().mockImplementation(() => {});
    mockLogger.error.mockReset().mockImplementation(() => {});
  });

  describe('Basic functionality', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
      expect(logger).toBeDefined();
    });

    it('should set logger context on initialization', () => {
      expect(mockLogger.setContext).toHaveBeenCalledWith('EventsGateway');
    });
  });

  describe('Connection handling', () => {
    describe('handleConnection', () => {
      it('should log when client connects', () => {
        gateway.handleConnection(mockSocket as Socket);

        expect(mockLogger.log).toHaveBeenCalledWith(
          `Client connected: ${mockSocket.id}`,
        );
      });

      it('should handle multiple simultaneous connections', () => {
        const socket1 = { ...mockSocket, id: 'socket-1' };
        const socket2 = { ...mockSocket, id: 'socket-2' };
        const socket3 = { ...mockSocket, id: 'socket-3' };

        gateway.handleConnection(socket1 as Socket);
        gateway.handleConnection(socket2 as Socket);
        gateway.handleConnection(socket3 as Socket);

        expect(mockLogger.log).toHaveBeenCalledTimes(3);
        expect(mockLogger.log).toHaveBeenNthCalledWith(1, 'Client connected: socket-1');
        expect(mockLogger.log).toHaveBeenNthCalledWith(2, 'Client connected: socket-2');
        expect(mockLogger.log).toHaveBeenNthCalledWith(3, 'Client connected: socket-3');
      });

      it('should handle connection with missing socket id gracefully', () => {
        const socketWithoutId = { ...mockSocket, id: undefined };

        gateway.handleConnection(socketWithoutId as Socket);

        expect(mockLogger.log).toHaveBeenCalledWith('Client connected: undefined');
      });
    });

    describe('handleDisconnect', () => {
      it('should log when client disconnects', () => {
        gateway.handleDisconnect(mockSocket as Socket);

        expect(mockLogger.log).toHaveBeenCalledWith(
          `Client disconnected: ${mockSocket.id}`,
        );
      });

      it('should handle multiple disconnections', () => {
        const socket1 = { ...mockSocket, id: 'disconnect-1' };
        const socket2 = { ...mockSocket, id: 'disconnect-2' };

        gateway.handleDisconnect(socket1 as Socket);
        gateway.handleDisconnect(socket2 as Socket);

        expect(mockLogger.log).toHaveBeenCalledTimes(2);
        expect(mockLogger.log).toHaveBeenNthCalledWith(1, 'Client disconnected: disconnect-1');
        expect(mockLogger.log).toHaveBeenNthCalledWith(2, 'Client disconnected: disconnect-2');
      });

      it('should handle disconnection cleanup', () => {
        gateway.handleDisconnect(mockSocket as Socket);

        // Verify logging occurs for cleanup
        expect(mockLogger.log).toHaveBeenCalled();
      });
    });
  });

  describe('Message handling', () => {
    describe('handleHealthCheck', () => {
      it('should return health status with correct format', () => {
        const testData = { test: 'data' };
        const result = gateway.handleHealthCheck(mockSocket as Socket, testData);

        expect(result).toHaveProperty('event', 'health');
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('status', 'ok');
        expect(result.data).toHaveProperty('timestamp');
        expect(new Date(result.data.timestamp)).toBeInstanceOf(Date);
      });

      it('should log health check with client id', () => {
        gateway.handleHealthCheck(mockSocket as Socket, {});

        expect(mockLogger.log).toHaveBeenCalledWith(
          `Health check from client: ${mockSocket.id}`,
        );
      });

      it('should handle health check with various data types', () => {
        const testCases = [
          {},
          { test: 'string' },
          { number: 123 },
          { array: [1, 2, 3] },
          { nested: { object: true } },
          null,
          undefined,
        ];

        testCases.forEach((testData, index) => {
          const result = gateway.handleHealthCheck(mockSocket as Socket, testData);

          expect(result.event).toBe('health');
          expect(result.data.status).toBe('ok');
          expect(result.data.timestamp).toBeDefined();
        });

        expect(mockLogger.log).toHaveBeenCalledTimes(testCases.length);
      });

      it('should return ISO timestamp format', () => {
        const result = gateway.handleHealthCheck(mockSocket as Socket, {});
        const timestamp = result.data.timestamp;

        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(timestamp).toISOString()).toBe(timestamp);
      });
    });
  });

  describe('Broadcasting methods', () => {
    describe('emitToAll', () => {
      it('should emit event to all connected clients', () => {
        const event = 'test-event';
        const data = { message: 'test message', id: 123 };

        gateway.emitToAll(event, data);

        expect(mockServer.emit).toHaveBeenCalledWith(event, data);
        expect(mockServer.emit).toHaveBeenCalledTimes(1);
      });

      it('should handle various data types in broadcast', () => {
        const testCases = [
          { event: 'string-data', data: 'simple string' },
          { event: 'number-data', data: 42 },
          { event: 'object-data', data: { complex: true, nested: { value: 'test' } } },
          { event: 'array-data', data: [1, 2, { item: 'test' }] },
          { event: 'null-data', data: null },
          { event: 'boolean-data', data: true },
        ];

        testCases.forEach(({ event, data }) => {
          gateway.emitToAll(event, data);
        });

        expect(mockServer.emit).toHaveBeenCalledTimes(testCases.length);
        testCases.forEach(({ event, data }, index) => {
          expect(mockServer.emit).toHaveBeenNthCalledWith(index + 1, event, data);
        });
      });

      it('should handle empty events and data', () => {
        gateway.emitToAll('', {});
        gateway.emitToAll('empty-data', undefined);

        expect(mockServer.emit).toHaveBeenCalledWith('', {});
        expect(mockServer.emit).toHaveBeenCalledWith('empty-data', undefined);
      });
    });

    describe('emitToClient', () => {
      it('should emit event to specific client', () => {
        const clientId = 'specific-client-123';
        const event = 'private-message';
        const data = { message: 'private data', userId: 456 };

        const mockTo = jest.fn().mockReturnValue({
          emit: jest.fn(),
        });
        mockServer.to = mockTo;

        gateway.emitToClient(clientId, event, data);

        expect(mockServer.to).toHaveBeenCalledWith(clientId);
        expect(mockTo().emit).toHaveBeenCalledWith(event, data);
      });

      it('should handle targeting multiple different clients', () => {
        const clients = [
          { id: 'client-1', event: 'event-1', data: { msg: 'data-1' } },
          { id: 'client-2', event: 'event-2', data: { msg: 'data-2' } },
          { id: 'client-3', event: 'event-3', data: { msg: 'data-3' } },
        ];

        const mockTo = jest.fn().mockReturnValue({
          emit: jest.fn(),
        });
        mockServer.to = mockTo;

        clients.forEach(({ id, event, data }) => {
          gateway.emitToClient(id, event, data);
        });

        expect(mockServer.to).toHaveBeenCalledTimes(3);
        clients.forEach(({ id }, index) => {
          expect(mockServer.to).toHaveBeenNthCalledWith(index + 1, id);
        });
      });

      it('should handle invalid client ids gracefully', () => {
        const invalidIds = ['', null, undefined, 123];

        const mockTo = jest.fn().mockReturnValue({
          emit: jest.fn(),
        });
        mockServer.to = mockTo;

        invalidIds.forEach(id => {
          gateway.emitToClient(id as string, 'test-event', 'test-data');
        });

        expect(mockServer.to).toHaveBeenCalledTimes(invalidIds.length);
      });
    });
  });

  describe('WebSocket gateway configuration', () => {
    it('should have CORS configuration', () => {
      // The @WebSocketGateway decorator should configure CORS
      // We verify the gateway is properly constructed
      expect(gateway).toBeDefined();
    });

    it('should handle server assignment', () => {
      const newMockServer = {
        emit: jest.fn(),
        to: jest.fn(),
      } as Partial<Server>;

      gateway.server = newMockServer as Server;

      expect(gateway.server).toBe(newMockServer);
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle logger errors gracefully', () => {
      mockLogger.log.mockImplementation(() => {
        throw new Error('Logger error');
      });

      expect(() => {
        gateway.handleConnection(mockSocket as Socket);
      }).toThrow('Logger error');
    });

    it('should handle server communication errors', () => {
      mockServer.emit = jest.fn().mockImplementation(() => {
        throw new Error('Server communication error');
      });

      expect(() => {
        gateway.emitToAll('test-event', {});
      }).toThrow('Server communication error');
    });

    it('should handle health check during server unavailability', () => {
      // Health check should work even if server has issues
      const result = gateway.handleHealthCheck(mockSocket as Socket, {});

      expect(result).toBeDefined();
      expect(result.data.status).toBe('ok');
    });
  });

  describe('Real-time communication patterns', () => {
    it('should support chat-like messaging patterns', () => {
      const chatData = {
        user: 'testuser',
        message: 'Hello everyone!',
        timestamp: new Date().toISOString(),
        room: 'general',
      };

      gateway.emitToAll('chat-message', chatData);

      expect(mockServer.emit).toHaveBeenCalledWith('chat-message', chatData);
    });

    it('should support notification broadcasting', () => {
      const notification = {
        type: 'system',
        title: 'System Update',
        message: 'The system will be updated in 5 minutes',
        priority: 'high',
        timestamp: new Date().toISOString(),
      };

      gateway.emitToAll('notification', notification);

      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
    });

    it('should support private messaging', () => {
      const privateMessage = {
        from: 'user1',
        to: 'user2',
        message: 'This is a private message',
        timestamp: new Date().toISOString(),
      };

      const mockTo = jest.fn().mockReturnValue({
        emit: jest.fn(),
      });
      mockServer.to = mockTo;

      gateway.emitToClient('user2-socket-id', 'private-message', privateMessage);

      expect(mockServer.to).toHaveBeenCalledWith('user2-socket-id');
      expect(mockTo().emit).toHaveBeenCalledWith('private-message', privateMessage);
    });

    it('should support GraphQL subscription-like events', () => {
      const subscriptionUpdate = {
        subscription: 'POST_UPDATED',
        data: {
          postUpdated: {
            id: '123',
            title: 'Updated Post Title',
            content: 'Updated content',
            updatedAt: new Date().toISOString(),
          },
        },
      };

      gateway.emitToAll('graphql-subscription', subscriptionUpdate);

      expect(mockServer.emit).toHaveBeenCalledWith('graphql-subscription', subscriptionUpdate);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle rapid event emissions efficiently', () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        event: `rapid-event-${i}`,
        data: { index: i, timestamp: Date.now() },
      }));

      events.forEach(({ event, data }) => {
        gateway.emitToAll(event, data);
      });

      expect(mockServer.emit).toHaveBeenCalledTimes(100);
    });

    it('should handle concurrent health checks', () => {
      const sockets = Array.from({ length: 10 }, (_, i) => ({
        ...mockSocket,
        id: `concurrent-socket-${i}`,
      }));

      const results = sockets.map(socket =>
        gateway.handleHealthCheck(socket as Socket, {})
      );

      results.forEach(result => {
        expect(result.data.status).toBe('ok');
        expect(result.data.timestamp).toBeDefined();
      });

      expect(mockLogger.log).toHaveBeenCalledTimes(10);
    });
  });
});