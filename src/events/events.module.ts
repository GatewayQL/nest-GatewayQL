import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
