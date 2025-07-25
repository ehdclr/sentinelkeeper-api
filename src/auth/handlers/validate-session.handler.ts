import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ValidateSessionCommand } from '../commands/validate-session.command';
import { AuthRepository } from '../repositories/auth.repository';
import { UserRepository } from '../../users/repositories/user.repository';

@CommandHandler(ValidateSessionCommand)
@Injectable()
export class ValidateSessionHandler
  implements ICommandHandler<ValidateSessionCommand>
{
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ValidateSessionCommand): Promise<{
    userId: string;
    username: string;
    name: string;
  }> {
    const session = await this.authRepository.findById(command.sessionId);

    if (!session || !session.isValid()) {
      throw new UnauthorizedException('유효하지 않은 세션입니다');
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }

    // 세션 활동 시간 업데이트
    const updatedSession = session.updateActivity();
    await this.authRepository.save(updatedSession);

    return {
      userId: user.id,
      username: user.username,
      name: user.name,
    };
  }
}
