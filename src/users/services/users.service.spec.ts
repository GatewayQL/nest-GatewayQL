import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../models/user.entity';
import { UsersService } from './users.service';
import { UserRole } from '../models/user.interface';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../auth/services/auth.service';

describe('UsersService', () => {
  let service: UsersService;
  let _repo: Repository<UserEntity>;

  const oneUser = new UserEntity();
  oneUser.firstname = 'John';
  oneUser.lastname = 'Doe';
  oneUser.username = 'john.doe';
  oneUser.email = 'john.doe@test.com';
  oneUser.role = UserRole.ADMIN;

  const mockAuthService = {
    saltAndHash: jest.fn().mockReturnValue({
      toPromise: jest.fn().mockResolvedValue('hashed-password'),
    }),
    compareSaltAndHashed: jest.fn(),
    generateJWT: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOneOrFail: jest.fn().mockResolvedValue(oneUser),
            create: jest.fn().mockReturnValue(oneUser),
            save: jest.fn(),
            update: jest.fn().mockResolvedValue(true),
            delete: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    _repo = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));

    service.create({
      firstname: 'admin',
      lastname: 'admin',
      username: 'admin.admin',
      email: 'admin.admin@test.com',
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully insert an user', () => {
      expect(
        service.create({
          firstname: 'John',
          lastname: 'Doe',
          username: 'john.doe',
          email: 'john.doe@test.com',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return users', async () => {
      // expect(await service.findByemail('admin.admin@test.com'));
    });
  });
});
