import { Injectable } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: this.configService.get<any>('db.type'),
      host: this.configService.get<string>('db.host'),
      port: this.configService.get<number>('db.port'),
      username: this.configService.get<string>('db.username'),
      password: this.configService.get<string>('db.password'),
      database: this.configService.get<string>('db.database'),
      autoLoadEntities: this.configService.get<boolean>('db.autoLoadEntities'),
      synchronize: this.configService.get<boolean>('db.synchronize'),
      ssl: this.configService.get<boolean>('db.ssl'),
      retryAttempts: this.configService.get<number>('db.retryAttempts'),
    };
  }
}
