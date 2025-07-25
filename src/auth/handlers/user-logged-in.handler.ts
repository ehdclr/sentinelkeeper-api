import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserLoggedInEvent } from '../events/user-logged-in.event';

@EventsHandler(UserLoggedInEvent)
export class UserLoggedInHandler implements IEventHandler<UserLoggedInEvent> {
  private readonly logger = new Logger(UserLoggedInHandler.name);

  async handle(event: UserLoggedInEvent): Promise<void> {
    this.logger.log(
      `사용자 로그인: ${event.username} (세션: ${event.sessionId})`,
    );

    await Promise.all([
      this.logLoginActivity(event),
      this.updateUserStats(event),
      this.sendWelcomeNotification(event),
    ]);
  }

  private async logLoginActivity(event: UserLoggedInEvent): Promise<void> {
    console.log(`📋 로그인 활동 기록: ${event.userId} - ${event.loginTime}`);
    // 실제로는 로그 테이블에 저장
  }

  private async updateUserStats(event: UserLoggedInEvent): Promise<void> {
    console.log(`📊 사용자 통계 업데이트: ${event.userId}`);
    // 로그인 횟수, 마지막 로그인 시간 등 업데이트
  }

  private async sendWelcomeNotification(
    event: UserLoggedInEvent,
  ): Promise<void> {
    console.log(`👋 ${event.username}님 환영합니다!`);
    // 웰컴 알림 발송
  }
}
