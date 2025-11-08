import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloDriver,
  ApolloDriverConfig,
  ApolloGatewayDriver,
  ApolloGatewayDriverConfig,
} from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';
import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SystemConfigModule } from './config/system-config.module';
import { GraphQLConfigService } from './config/graphql-config.service';
import gatewayConfiguration from './config/gateway.configuration';
import systemConfiguration from './config/system.configuration';
import { DatabaseConfig } from './config/databases/database.config';
import { CacheConfigService } from './config/cache.config';
import { AuthModule } from './auth/auth.module';
import { CredentialsModule } from './credentials/credentials.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsController } from './metrics/metrics.controller';
import { EventsModule } from './events/events.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development', '.env.production'],
      load: [gatewayConfiguration, systemConfiguration],
    }),

    // Logging
    LoggerModule,

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('throttle.ttl'),
          limit: config.get('throttle.limit'),
        },
      ],
    }),

    // Caching (Redis or in-memory)
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useClass: CacheConfigService,
    }),

    // Metrics
    MetricsModule,

    // WebSocket Events
    EventsModule,

    // GraphQL Gateway
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      useFactory: async (graphQLConfigService: GraphQLConfigService) => ({
        ...graphQLConfigService.createGatewayOptions(),
        server: {
          plugins: [ApolloServerPluginLandingPageLocalDefault()],
          context: ({ req }) => ({ headers: req.headers }),
        },
      }),
      imports: [SystemConfigModule],
      inject: [GraphQLConfigService],
    }),

    // Admin GraphQL API with Subscriptions
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'generated/admin.gql'),
      path: 'admin',
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      context: ({ req }) => ({ headers: req.headers }),
      subscriptions: {
        'graphql-ws': true,
        'subscriptions-transport-ws': false, // Disable legacy protocol
      },
      installSubscriptionHandlers: true,
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
    }),

    // Feature Modules
    UsersModule,
    AuthModule,
    CredentialsModule,
    HealthModule,
  ],
  controllers: [AppController, MetricsController],
  providers: [
    AppService,
    // Prometheus metrics
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5],
    }),
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
