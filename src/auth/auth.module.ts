import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesGuard } from './guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { CredentialsModule } from '../credentials/credentials.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    //forwardRef(() => CredentialsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt_secret'),
        signOptions: { expiresIn: '10000s' },
      }),
    }),
  ],
  providers: [AuthService, RolesGuard, ConfigService],
  exports: [AuthService],
})
export class AuthModule {}
