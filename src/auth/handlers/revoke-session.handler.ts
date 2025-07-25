import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { RevokeSessionCommand } from '../commands/revoke-session.command';
import { SessionRevokedEvent } from '../events/session-revoked.event';
import { AuthRepository } from '../repositories/auth.repository';

@CommandHandler(RevokeSessionCommand)
@Injectable()
export class RevokeSessionHandler
  implements ICommandHandler<RevokeSessionCommand>
{
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RevokeSessionCommand): Promise<{ success: boolean }> {
    const session = await this.authRepository.findById(command.sessionId);

    if (session) {
      await this.authRepository.delete(command.sessionId);

      this.eventBus.publish(
        new SessionRevokedEvent(
          session.id,
          session.userId,
          command.reason,
          new Date(),
        ),
      );
    }

    return { success: true };
  }
}
