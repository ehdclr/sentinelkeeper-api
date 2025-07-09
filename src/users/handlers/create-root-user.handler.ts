import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateRootUserCommand } from '../commands/create-root-user.command';
import { UserService } from '../services/user.service';
import { ResponseBuilder } from '@/common/decorators/api-response.decorator';
import {
  ApiResponse,
  ApiErrorResponse,
} from '@/common/interfaces/response.interface';
import { PemKeyService } from '@/common/services/pem-key.service';
import { CreateRootUserResponse } from '../dto/user.response.dto';

@Injectable()
@CommandHandler(CreateRootUserCommand)
export class CreateRootUserHandler
  implements ICommandHandler<CreateRootUserCommand>
{
  constructor(
    private readonly userService: UserService,
    private readonly pemKeyService: PemKeyService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: CreateRootUserCommand,
  ): Promise<ApiResponse<CreateRootUserResponse> | ApiErrorResponse> {
    const { username, password, email } = command;

    // 도메인 서비스를 통한 루트 사용자 생성
    await this.userService.createRootUser(command);
    const pemKey = this.pemKeyService.generateRootPemKey(username);
    const pemFilePath = await this.pemKeyService.savePemKey(username, pemKey);

    // 이벤트 발행 (트랜잭션 성공 후)
    // this.eventBus.publish(new UserCreatedEvent(user.id, user.username));

    return ResponseBuilder.success(
      {
        username,
        email,
        isSystemAdmin: true,
        pemKey,
        pemFilePath,
      },
      '루트 사용자 생성 완료',
      HttpStatus.CREATED,
    ) as ApiResponse<CreateRootUserResponse>;
  }
}
