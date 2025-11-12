import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './services/users.service';
import { UsersResolver } from './resolvers/users.resolver';
import { UsersSubscriptionResolver } from './resolvers/users.subscription';
import { UserEntity } from './models/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    forwardRef(() => AuthModule),
  ],
  providers: [UsersResolver, UsersSubscriptionResolver, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
