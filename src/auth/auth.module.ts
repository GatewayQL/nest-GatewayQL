import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthResolver } from './resolvers/auth.resolver';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesGuard } from './guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { CredentialsModule } from '../credentials/credentials.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: configService.get('jwt.signOptions'),
      }),
    }),
  ],
  providers: [AuthService, AuthResolver, RolesGuard, ConfigService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
