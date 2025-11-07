import { ConfigModule, ConfigService } from '@nestjs/config';
import { forwardRef } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../../auth/services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { CredentialEntity } from '../models/credential.entity';
import { CredentialType } from '../models/credential.interface';
import { CredentialsService } from './credentials.service';
import { AuthModule } from '../../auth/auth.module';

const oneCredential = new CredentialEntity();
oneCredential.consumerId = 'john.doe@test.com';
oneCredential.type = CredentialType.BASIC;
oneCredential.secret = 'secret';

describe('CredentialsService', () => {
  let service: CredentialsService;
  let repo: Repository<CredentialEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CredentialsService,
          useValue: {
            create: jest.fn().mockReturnValue(oneCredential),
          },
        },
        {
          provide: getRepositoryToken(CredentialEntity),
          useValue: {
            findOneOrFail: jest.fn().mockResolvedValue(oneCredential),
            create: jest.fn().mockReturnValue(oneCredential),
            save: jest.fn(),
            update: jest.fn().mockResolvedValue(true),
            delete: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
    repo = module.get<Repository<CredentialEntity>>(
      getRepositoryToken(CredentialEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
