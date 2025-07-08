import { Test, TestingModule } from '@nestjs/testing';
import { CheckRootUserExistsHandler } from './check-root-user-exists.handler';
import { CheckRootUserExistsQuery } from '../queries/check-root-user-exists.query';
import { UserRepository } from '../repositories/user.repository';

describe('CheckRootUserExistsHandler', () => {
  let handler: CheckRootUserExistsHandler;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const mockUserRepository = {
      countSystemAdmins: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckRootUserExistsHandler,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    handler = module.get<CheckRootUserExistsHandler>(CheckRootUserExistsHandler);
    userRepository = module.get(UserRepository);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return exists: true when system admins exist', async () => {
      userRepository.countSystemAdmins.mockResolvedValue(2);

      const result = await handler.execute();

      expect(userRepository.countSystemAdmins).toHaveBeenCalled();
      expect(result).toEqual({
        exists: true,
        count: 2,
      });
    });

    it('should return exists: false when no system admins exist', async () => {
      userRepository.countSystemAdmins.mockResolvedValue(0);

      const result = await handler.execute();

      expect(userRepository.countSystemAdmins).toHaveBeenCalled();
      expect(result).toEqual({
        exists: false,
        count: 0,
      });
    });
  });
}); 