import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ValidateSessionCommand } from '../commands/validate-session.command';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly commandBus: CommandBus) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.cookies?.sessionId;

    if (!sessionId) {
      throw new UnauthorizedException('인증이 필요합니다');
    }

    try {
      const user = await this.commandBus.execute(
        new ValidateSessionCommand(sessionId),
      );

      request.user = user; // 요청 객체에 사용자 정보 추가
      return true;
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 세션입니다');
    }
  }
}
