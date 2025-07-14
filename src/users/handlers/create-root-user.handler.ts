import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HttpStatus, Logger } from '@nestjs/common';
import { CreateRootUserCommand } from '../commands/create-root-user.command';
import { UserService } from '../services/user.service';
import { ResponseBuilder } from '@/common/decorators/api-response.decorator';
import {
  ApiResponse,
  ApiErrorResponse,
} from '@/common/interfaces/response.interface';

export interface CreateRootUserResponse {
  user: {
    username: string;
    email: string | null;
    isSystemRoot: boolean;
    createdAt: Date;
  };
  pemKey: string;
  message: string;
}

@CommandHandler(CreateRootUserCommand)
export class CreateRootUserHandler
  implements ICommandHandler<CreateRootUserCommand>
{
  private readonly logger = new Logger(CreateRootUserHandler.name);

  constructor(private readonly userService: UserService) {}

  async execute(
    command: CreateRootUserCommand,
  ): Promise<ApiResponse<CreateRootUserResponse> | ApiErrorResponse> {
    try {
      const result = await this.userService.createRootUser({
        username: command.username,
        password: command.password,
        email: command.email,
      });

      const responseData: CreateRootUserResponse = {
        user: {
          username: result.user.username,
          email: result.user.email,
          isSystemRoot: result.user.isSystemRoot,
          createdAt: result.user.createdAt,
        },
        pemKey: result.pemKey,
        message:
          '루트 사용자가 성공적으로 생성되었습니다. PEM 키를 안전한 곳에 보관하세요.',
      };

      const response = ResponseBuilder.success(
        responseData,
        '루트 사용자 생성 및 복구 키 생성이 완료되었습니다.',
        HttpStatus.CREATED,
      );

      return {
        ...response,
        timestamp: new Date().toISOString(),
        path: '/users/root',
      } as ApiResponse<CreateRootUserResponse>;
    } catch (error) {
      this.logger.error('루트 사용자 생성 실패:', error);

      const errorResponse = ResponseBuilder.error(
        '루트 사용자 생성에 실패했습니다.',
        error instanceof Error ? error.message : '알 수 없는 오류',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      return {
        ...errorResponse,
        timestamp: new Date().toISOString(),
        path: '/users/root',
      } as ApiErrorResponse;
    }
  }
}
