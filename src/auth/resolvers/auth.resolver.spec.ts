import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { AuthResolver } from './auth.resolver';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { LoginInput } from '../dto/login.input';
import { AuthResponse } from '../dto/auth.response';
import { UserEntity } from '../../users/models/user.entity';
import { UserRole } from '../../users/models/user.interface';

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const createMockUser = () => {
    const user = new UserEntity();
    user.id = 'test-user-id';
    user.username = 'testuser';
    user.email = 'test@example.com';
    user.role = UserRole.USER;
    user.passwordHash = 'hashedPassword123';
    return user;
  };

  const mockLoginInput: LoginInput = {
    username: 'testuser',
    password: 'password123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: AuthService,
          useValue: {
            compareSaltAndHashed: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByUsernameWithPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully authenticate user and return auth response', async () => {
      // Arrange
      const mockUser = createMockUser();
      const expectedToken = 'jwt-token-123';
      const expectedExpiresIn = '24h';
      const expectedPayload = {
        sub: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
      };

      jest.spyOn(usersService, 'findByUsernameWithPassword').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'compareSaltAndHashed').mockReturnValue(of(true));
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(expectedToken);
      jest.spyOn(configService, 'get').mockReturnValue(expectedExpiresIn);

      // Act
      const result: AuthResponse = await resolver.login(mockLoginInput);

      // Assert
      expect(usersService.findByUsernameWithPassword).toHaveBeenCalledWith(mockLoginInput.username);
      expect(authService.compareSaltAndHashed).toHaveBeenCalledWith(
        mockLoginInput.password,
        'hashedPassword123'
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(expectedPayload);
      expect(configService.get).toHaveBeenCalledWith('jwt.signOptions.expiresIn');

      expect(result.accessToken).toBe(expectedToken);
      expect(result.expiresIn).toBe(expectedExpiresIn);
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.passwordHash).toBeUndefined();
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByUsernameWithPassword').mockResolvedValue(null);

      // Act & Assert
      await expect(resolver.login(mockLoginInput)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      );

      expect(usersService.findByUsernameWithPassword).toHaveBeenCalledWith(mockLoginInput.username);
      expect(authService.compareSaltAndHashed).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user has no password hash', async () => {
      // Arrange
      const userWithoutPassword = createMockUser();
      userWithoutPassword.passwordHash = undefined;

      jest.spyOn(usersService, 'findByUsernameWithPassword').mockResolvedValue(userWithoutPassword);

      // Act & Assert
      await expect(resolver.login(mockLoginInput)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      );

      expect(usersService.findByUsernameWithPassword).toHaveBeenCalledWith(mockLoginInput.username);
      expect(authService.compareSaltAndHashed).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      const mockUser = createMockUser();
      jest.spyOn(usersService, 'findByUsernameWithPassword').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'compareSaltAndHashed').mockReturnValue(of(false));

      // Act & Assert
      await expect(resolver.login(mockLoginInput)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      );

      expect(usersService.findByUsernameWithPassword).toHaveBeenCalledWith(mockLoginInput.username);
      expect(authService.compareSaltAndHashed).toHaveBeenCalledWith(
        mockLoginInput.password,
        mockUser.passwordHash
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should use default expires in when config value is not set', async () => {
      // Arrange
      const mockUser = createMockUser();
      const expectedToken = 'jwt-token-123';

      jest.spyOn(usersService, 'findByUsernameWithPassword').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'compareSaltAndHashed').mockReturnValue(of(true));
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(expectedToken);
      jest.spyOn(configService, 'get').mockReturnValue(null);

      // Act
      const result: AuthResponse = await resolver.login(mockLoginInput);

      // Assert
      expect(result.expiresIn).toBe('24h');
    });

    it('should handle JWT service errors', async () => {
      // Arrange
      const mockUser = createMockUser();
      jest.spyOn(usersService, 'findByUsernameWithPassword').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'compareSaltAndHashed').mockReturnValue(of(true));
      jest.spyOn(jwtService, 'signAsync').mockRejectedValue(new Error('JWT generation failed'));

      // Act & Assert
      await expect(resolver.login(mockLoginInput)).rejects.toThrow('JWT generation failed');
    });
  });

  describe('logout', () => {
    it('should return true for logout operation', async () => {
      // Act
      const result = await resolver.logout();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('resolver initialization', () => {
    it('should be defined with all dependencies', () => {
      expect(resolver).toBeDefined();
      expect(authService).toBeDefined();
      expect(usersService).toBeDefined();
      expect(jwtService).toBeDefined();
      expect(configService).toBeDefined();
    });
  });
});