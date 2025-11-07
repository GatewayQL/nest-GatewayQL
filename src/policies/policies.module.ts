import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from './guards/api-key.guard';
import { CredentialsModule } from '../credentials/credentials.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, CredentialsModule, AuthModule],
  providers: [ApiKeyGuard],
  exports: [ApiKeyGuard],
})
export class PoliciesModule {}
