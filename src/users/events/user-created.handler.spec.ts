import { Test, TestingModule } from '@nestjs/testing';
import { UserCreatedHandler } from './user-created.handler';
import { UserCreatedEvent } from './user-created.event';

describe('UserCreatedHandler', () => {
  let handler: UserCreatedHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserCreatedHandler],
    }).compile();

    handler = module.get<UserCreatedHandler>(UserCreatedHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('should handle UserCreatedEvent', async () => {
      const event = new UserCreatedEvent(1, 'admin');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.handle(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        '사용자 생성 이벤트 처리: admin (ID: 1)',
      );

      consoleSpy.mockRestore();
    });
  });
}); 