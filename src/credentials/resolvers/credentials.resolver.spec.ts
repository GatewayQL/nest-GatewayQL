import { Test, TestingModule } from '@nestjs/testing';
import { CredentialsResolver } from './credentials.resolver';
import { CredentialsService } from '../services/credentials.service';
import { CredentialEntity } from '../models/credential.entity';
import { CredentialType } from '../models/credential.interface';

const oneCredential = new CredentialEntity();
oneCredential.consumerId = 'john.doe@test.com';
oneCredential.type = CredentialType.BASIC;
oneCredential.secret = 'secret';

describe('CredentialsResolver', () => {
  let resolver: CredentialsResolver;
  let service: CredentialsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CredentialsResolver],
      providers: [
        {
          provide: CredentialsService,
          useValue: {
            findOneOrFail: jest.fn().mockResolvedValue(oneCredential),
            create: jest
              .fn()
              .mockImplementation((credential: Credential) =>
                Promise.resolve({ id: 'a uuid', ...credential }),
              ),
            save: jest.fn(),
            update: jest.fn().mockResolvedValue(true),
            delete: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
    resolver = module.get<CredentialsResolver>(CredentialsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
