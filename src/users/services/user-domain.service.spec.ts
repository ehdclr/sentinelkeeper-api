import { Test, TestingModule } from '@nestjs/testing';
import { UserDomainService } from './user-domain.service';
import { UserRepository } from '../repositories/user.repository';
import { UserHashService } from './user-hash.service';

describe('UserDomainService', () => {
  let service: UserDomainService;
  let userRepository: jest.Mocked<UserRepository>;
  let userHashService: jest.Mocked<UserHashService>;

  beforeEach(async () => {
    const mockUserRepository = {
      findByUsername: jest.fn(),
      create: jest.fn(),
    };

    const mockUserHashService = {
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDomainService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: UserHashService,
          useValue: mockUserHashService,
        },
      ],
    }).compile();

    service = module.get<UserDomainService>(UserDomainService);
    userRepository = module.get(UserRepository);
    userHashService = module.get(UserHashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRootUser', () => {
    it('should create root user successfully', async () => {
      const userData = {
        username: 'admin',
        password: 'Admin123!',
        email: 'admin@example.com',
      };

      const mockUser = {
        id: 1,
        username: 'admin',
        passwordHash: 'hashedpassword',
        email: 'admin@example.com',
        isActive: true,
        isSystemAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findByUsername.mockResolvedValue(null);
      userHashService.hashPassword.mockResolvedValue('hashedpassword');
      userRepository.create.mockResolvedValue(mockUser);

      const result = await service.createRootUser(userData);

      expect(userRepository.findByUsername).toHaveBeenCalledWith('admin');
      expect(userHashService.hashPassword).toHaveBeenCalledWith('Admin123!');
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'admin',
        passwordHash: 'hashedpassword',
        email: 'admin@example.com',
        isSystemAdmin: true,
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error if username already exists', async () => {
      const userData = {
        username: 'admin',
        password: 'Admin123!',
        email: 'admin@example.com',
      };

      const existingUser = {
        id: 1,
        username: 'admin',
        passwordHash: 'hashedpassword',
        email: 'admin@example.com',
        isActive: true,
        isSystemAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findByUsername.mockResolvedValue(existingUser);

      await expect(service.createRootUser(userData)).rejects.toThrow(
        "사용자명 'admin'은 이미 존재합니다.",
      );

      expect(userRepository.findByUsername).toHaveBeenCalledWith('admin');
      expect(userHashService.hashPassword).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        passwordHash: 'hashedpassword',
        email: 'admin@example.com',
        isActive: true,
        isSystemAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findByUsername.mockResolvedValue(mockUser);
      userHashService.comparePassword.mockResolvedValue(true);

      const result = await service.verifyPassword('admin', 'Admin123!');

      expect(result).toBe(true);
      expect(userRepository.findByUsername).toHaveBeenCalledWith('admin');
      expect(userHashService.comparePassword).toHaveBeenCalledWith(
        'Admin123!',
        'hashedpassword',
      );
    });

    it('should return false for non-existent user', async () => {
      userRepository.findByUsername.mockResolvedValue(null);

      const result = await service.verifyPassword('nonexistent', 'password');

      expect(result).toBe(false);
      expect(userRepository.findByUsername).toHaveBeenCalledWith('nonexistent');
      expect(userHashService.comparePassword).not.toHaveBeenCalled();
    });
  });
}); 