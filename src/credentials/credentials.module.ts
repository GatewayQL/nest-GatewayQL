import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialEntity } from './models/credential.entity';
import { CredentialsResolver } from './resolvers/credentials.resolver';
import { CredentialsService } from './services/credentials.service';

import { AuthModule } from './../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AppsModule } from '../apps/apps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CredentialEntity]),
    AuthModule,
    UsersModule,
    forwardRef(() => AppsModule),
  ],
  providers: [CredentialsResolver, CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
