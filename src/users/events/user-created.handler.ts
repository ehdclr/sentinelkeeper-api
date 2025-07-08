import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { UserCreatedEvent } from './user-created.event';

@Injectable()
@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent) {
    console.log(
      `사용자 생성 이벤트 처리: ${event.username} (ID: ${event.userId})`,
    );

    // 여기서 카프카 발행, 이메일 전송, 알림 생성 등
    // await this.kafkaProducer.send({
    //   topic: 'user.created',
    //   messages: [{ value: JSON.stringify({ id: event.userId, username: event.username }) }],
    // });
  }
}
