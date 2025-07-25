import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { LoginUserCommand } from '../commands/login-user.command';
import { UserLoggedInEvent } from '../events/user-logged-in.event';
import { SessionCreatedEvent } from '../events/session-create.event';
import { UserRepository } from '../../users/repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { SessionEntity } from '../entities/session.entity';

@CommandHandler(LoginUserCommand)
@Injectable()
export class LoginUserHandler implements ICommandHandler<LoginUserCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: LoginUserCommand): Promise<{
    sessionId: string;
    expiresAt: Date;
    user: {
      id: string;
      username: string;
      name: string;
    };
  }> {
    console.log('🔍 로그인 시도:', command.username);

    // 1. 사용자 검증
    const user = await this.userRepository.findByUsername(
      command.username as string,
    );
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다');
    }

    // 2. 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(
      command.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 틀렸습니다');
    }

    console.log('✅ 사용자 인증 완료:', user.username);

    // 3. 기존 세션 무효화 (선택사항)
    await this.authRepository.revokeUserSessions(user.id);

    // 4. 새 세션 생성
    const session = SessionEntity.create(
      user.id,
      24, // 24시간
      command.userAgent,
      command.ip,
    );

    await this.authRepository.save(session);
    console.log('🔑 세션 생성 완료:', session.id);

    // 5. 이벤트 발행
    this.eventBus.publish(
      new UserLoggedInEvent(
        user.id,
        user.username,
        session.id,
        new Date(),
        command.ip,
        command.userAgent,
      ),
    );

    this.eventBus.publish(
      new SessionCreatedEvent(
        session.id,
        user.id,
        session.expiresAt,
        session.createdAt,
      ),
    );

    console.log('📡 로그인 이벤트 발행 완료');

    return {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    };
  }
}
