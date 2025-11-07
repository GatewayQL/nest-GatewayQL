import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CredentialsService } from '../../credentials/services/credentials.service';
import { AuthService } from '../../auth/services/auth.service';
import { firstValueFrom } from 'rxjs';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * API Key Authentication Guard
 * Validates API key from headers against database
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private credentialsService: CredentialsService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKeyHeader =
      request.headers['x-api-key'] ||
      request.headers['authorization']?.replace('Bearer ', '');

    if (!apiKeyHeader) {
      throw new UnauthorizedException('API key is required');
    }

    try {
      // Parse API key format: keyId:keySecret
      const [keyId, keySecret] = apiKeyHeader.includes(':')
        ? apiKeyHeader.split(':')
        : [apiKeyHeader, null];

      if (!keyId || !keySecret) {
        // Fallback to environment variable for backwards compatibility
        const envApiKey = this.configService.get<string>('API_KEY');
        if (envApiKey && apiKeyHeader === envApiKey) {
          return true;
        }
        throw new UnauthorizedException('Invalid API key format. Expected format: keyId:keySecret');
      }

      // Find all credentials
      const credentials = await firstValueFrom(this.credentialsService.findAll());

      // Find credential with matching keyId
      const credential = credentials.find(c => c.keyId === keyId && c.type === 'key-auth' && c.isActive);

      if (!credential) {
        throw new UnauthorizedException('Invalid API key');
      }

      // Get the full credential with secret
      const fullCredential = await this.credentialsService.findByCosumerId(credential.consumerId);

      if (!fullCredential || !fullCredential.keySecret) {
        throw new UnauthorizedException('Invalid API key');
      }

      // Verify the key secret matches
      const isValid = await firstValueFrom(
        this.authService.compareSaltAndHashed(keySecret, fullCredential.keySecret),
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid API key');
      }

      // Attach credential info to request for later use
      request.apiKey = {
        keyId: credential.keyId,
        consumerId: credential.consumerId,
        scope: credential.scope,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
