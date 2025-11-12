import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScopeEntity } from './models/scope.entity';
import { ScopesService } from './services/scopes.service';
import { ScopesResolver } from './resolvers/scopes.resolver';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScopeEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  providers: [ScopesService, ScopesResolver],
  exports: [ScopesService],
})
export class ScopesModule {}
