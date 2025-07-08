import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { CreateRootUserHandler } from './create-root-user.handler';
import { CreateRootUserCommand } from '../commands/create-root-user.command';
import { UserDomainService } from '../services/user-domain.service';
import { UserCreatedEvent } from '../events/user-created.event';

describe('CreateRootUserHandler', () => {
  let handler: CreateRootUserHandler;
  let userDomainService: jest.Mocked<UserDomainService>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const mockUserDomainService = {
      createRootUser: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRootUserHandler,
        {
          provide: UserDomainService,
          useValue: mockUserDomainService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<CreateRootUserHandler>(CreateRootUserHandler);
    userDomainService = module.get(UserDomainService);
    eventBus = module.get(EventBus);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should create root user and publish event successfully', async () => {
      const command = new CreateRootUserCommand(
        'admin',
        'Admin123!',
        'admin@example.com',
      );

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

      userDomainService.createRootUser.mockResolvedValue(mockUser);

      const result = await handler.execute(command);

      expect(userDomainService.createRootUser).toHaveBeenCalledWith({
        username: 'admin',
        password: 'Admin123!',
        email: 'admin@example.com',
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        new UserCreatedEvent(1, 'admin'),
      );

      expect(result).toEqual({
        success: true,
        message: "루트 사용자 'admin' 생성 완료",
      });
    });

    it('should handle error and return failure response', async () => {
      const command = new CreateRootUserCommand(
        'admin',
        'Admin123!',
        'admin@example.com',
      );

      const error = new Error('사용자명이 이미 존재합니다.');
      userDomainService.createRootUser.mockRejectedValue(error);

      const result = await handler.execute(command);

      expect(userDomainService.createRootUser).toHaveBeenCalledWith({
        username: 'admin',
        password: 'Admin123!',
        email: 'admin@example.com',
      });

      expect(eventBus.publish).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: false,
        message: '루트 사용자 생성 실패: 사용자명이 이미 존재합니다.',
      });
    });
  });
}); 