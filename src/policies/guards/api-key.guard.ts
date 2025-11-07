import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * API Key Authentication Guard
 * Validates API key from headers
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey =
      request.headers['x-api-key'] || request.headers['authorization'];

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key (in production, check against database)
    const validApiKey = this.configService.get<string>('API_KEY');

    if (validApiKey && apiKey !== validApiKey && apiKey !== `Bearer ${validApiKey}`) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
