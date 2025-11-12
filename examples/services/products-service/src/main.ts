import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for federation
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const port = process.env.PORT || 4001;
  await app.listen(port);

  console.log(`🚀 Products Service running on: http://localhost:${port}`);
  console.log(`🔍 GraphQL Federation: http://localhost:${port}/graphql`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Products Service:', error);
  process.exit(1);
});