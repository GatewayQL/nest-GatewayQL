import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from './models/app.entity';
import { AppsService } from './services/apps.service';
import { AppsResolver } from './resolvers/apps.resolver';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  providers: [AppsService, AppsResolver],
  exports: [AppsService],
})
export class AppsModule {}
