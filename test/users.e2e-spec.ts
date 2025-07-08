import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CommandBus, QueryBus, EventBus } from '@nestjs/cqrs';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CreateRootUserCommand } from '../src/users/commands/create-root-user.command';
import { CheckRootUserExistsQuery } from '../src/users/queries/check-root-user-exists.query';
import { UserCreatedEvent } from '../src/users/events/user-created.event';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let eventBus: EventBus;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    commandBus = moduleFixture.get<CommandBus>(CommandBus);
    queryBus = moduleFixture.get<QueryBus>(QueryBus);
    eventBus = moduleFixture.get<EventBus>(EventBus);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('CQRS Flow', () => {
    it('should create root user and check existence', async () => {
      // 1. 초기 상태 확인 (루트 사용자 없음)
      const initialCheck = await queryBus.execute(new CheckRootUserExistsQuery());
      expect(initialCheck.exists).toBe(false);
      expect(initialCheck.count).toBe(0);

      // 2. 루트 사용자 생성
      const createCommand = new CreateRootUserCommand(
        'admin',
        'Admin123!',
        'admin@example.com',
      );

      const createResult = await commandBus.execute(createCommand);
      expect(createResult.success).toBe(true);
      expect(createResult.message).toContain("루트 사용자 'admin' 생성 완료");

      // 3. 생성 후 상태 확인 (루트 사용자 있음)
      const finalCheck = await queryBus.execute(new CheckRootUserExistsQuery());
      expect(finalCheck.exists).toBe(true);
      expect(finalCheck.count).toBe(1);
    });

    it('should handle duplicate username error', async () => {
      // 1. 첫 번째 사용자 생성
      const createCommand1 = new CreateRootUserCommand(
        'admin',
        'Admin123!',
        'admin@example.com',
      );

      const result1 = await commandBus.execute(createCommand1);
      expect(result1.success).toBe(true);

      // 2. 같은 사용자명으로 다시 생성 시도
      const createCommand2 = new CreateRootUserCommand(
        'admin',
        'Admin456!',
        'admin2@example.com',
      );

      const result2 = await commandBus.execute(createCommand2);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('루트 사용자 생성 실패');
    });
  });

  describe('Event Publishing', () => {
    it('should publish UserCreatedEvent when user is created', async () => {
      const eventSpy = jest.spyOn(eventBus, 'publish');

      const createCommand = new CreateRootUserCommand(
        'admin',
        'Admin123!',
        'admin@example.com',
      );

      await commandBus.execute(createCommand);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(Number),
          username: 'admin',
        }),
      );

      eventSpy.mockRestore();
    });
  });
}); 