import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScopeEntity } from './models/scope.entity';
import { ScopesService } from './services/scopes.service';
import { ScopesResolver } from './resolvers/scopes.resolver';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScopeEntity]),
    forwardRef(() => AuthModule),
  ],
  providers: [ScopesService, ScopesResolver],
  exports: [ScopesService],
})
export class ScopesModule {}
