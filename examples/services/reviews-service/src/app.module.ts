import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsModule } from './reviews/reviews.module';
import { Review } from './reviews/entities/review.entity';

@Module({
  imports: [
    // Database configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'reviews_service',
      entities: [Review],
      synchronize: true, // Only for development
      logging: process.env.NODE_ENV === 'development',
    }),

    // GraphQL Federation configuration
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      playground: process.env.NODE_ENV !== 'production',
      introspection: true,
    }),

    ReviewsModule,
  ],
})
export class AppModule {}