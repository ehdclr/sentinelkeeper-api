import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { CreateRootUserCommand } from '../commands/create-root-user.command';
import { UserDomainService } from '../services/user-domain.service';
import { UserCreatedEvent } from '../events/user-created.event';

@Injectable()
@CommandHandler(CreateRootUserCommand)
export class CreateRootUserHandler
  implements ICommandHandler<CreateRootUserCommand>
{
  constructor(
    private readonly userDomainService: UserDomainService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: CreateRootUserCommand,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { username, password, email } = command;

      // 도메인 서비스를 통한 루트 사용자 생성
      const user = await this.userDomainService.createRootUser({
        username,
        password,
        email,
      });

      // 이벤트 발행 (트랜잭션 성공 후)
      this.eventBus.publish(new UserCreatedEvent(user.id, user.username));

      return {
        success: true,
        message: `루트 사용자 '${username}' 생성 완료`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `루트 사용자 생성 실패: ${error.message}`,
      };
    }
  }
}
