import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CustomLoggerService } from '../common/logger/logger.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private logger: CustomLoggerService) {
    this.logger.setContext('EventsGateway');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('health')
  handleHealthCheck(client: Socket, data: any) {
    this.logger.log(`Health check from client: ${client.id}`);
    return {
      event: 'health',
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Emit events to all connected clients
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Emit event to specific client
  emitToClient(clientId: string, event: string, data: any) {
    this.server.to(clientId).emit(event, data);
  }
}
