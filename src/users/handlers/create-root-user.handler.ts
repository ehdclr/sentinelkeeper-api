import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, HttpStatus } from '@nestjs/common';
import { CreateRootUserCommand } from '../commands/create-root-user.command';
import { UserService } from '../services/user.service';
import { PemKeyService } from '../../common/services/pem-key.service';
import { ResponseBuilder } from '../../common/decorators/api-response.decorator';
import {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/interfaces/response.interface';
import { CreateRootUserResponse } from '../dto/user.response.dto';

@CommandHandler(CreateRootUserCommand)
export class CreateRootUserHandler
  implements ICommandHandler<CreateRootUserCommand>
{
  private readonly logger = new Logger(CreateRootUserHandler.name);

  constructor(
    private readonly userService: UserService,
    private readonly pemKeyService: PemKeyService,
  ) {}

  async execute(
    command: CreateRootUserCommand,
  ): Promise<ApiResponse<CreateRootUserResponse> | ApiErrorResponse> {
    try {
      // 1. 루트 사용자 생성
      const user = await this.userService.createRootUser({
        username: command.username,
        password: command.password,
        email: command.email,
      });

      // 2. PEM 키 생성 (userId 포함)
      const pemKey = this.pemKeyService.generateRootPemKey(
        command.username,
        command.email,
      );

      // 3. PEM 키 파일 저장
      const pemFilePath = await this.pemKeyService.savePemKey(
        command.username,
        pemKey,
      );

      const responseData: CreateRootUserResponse = {
        user: {
          username: user.username,
          email: user.email,
          isSystemAdmin: user.isSystemAdmin,
          createdAt: user.createdAt,
        },
        pemKey,
        pemFilePath,
        message:
          '루트 사용자가 성공적으로 생성되었습니다. PEM 키를 안전한 곳에 보관하세요.',
      };

      // ResponseBuilder 결과에 timestamp와 path 추가
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
