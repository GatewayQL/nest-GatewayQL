import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { LoginInput } from '../dto/login.input';
import { AuthResponse } from '../dto/auth.response';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Mutation(() => AuthResponse)
  async login(
    @Args('loginInput') loginInput: LoginInput,
  ): Promise<AuthResponse> {
    // Find user with password hash
    const user = await this.usersService.findByUsernameWithPassword(
      loginInput.username,
    );

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await firstValueFrom(
      this.authService.compareSaltAndHashed(
        loginInput.password,
        user.passwordHash,
      ),
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // Remove password hash from response
    delete user.passwordHash;

    return {
      accessToken,
      expiresIn: this.configService.get('jwt.signOptions.expiresIn') || '24h',
      user,
    };
  }

  @Mutation(() => Boolean)
  async logout(): Promise<boolean> {
    // In a stateless JWT setup, logout is handled client-side by removing the token
    // This mutation exists for client-side compatibility
    return true;
  }
}
