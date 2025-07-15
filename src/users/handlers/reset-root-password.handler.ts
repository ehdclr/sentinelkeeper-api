import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HttpStatus, Logger } from '@nestjs/common';
import { ResetRootPasswordCommand } from '../commands/reset-root-password.command';
import { UserService } from '../services/user.service';
import { ResponseBuilder } from '@/common/decorators/api-response.decorator';
import {
  ApiResponse,
  ApiErrorResponse,
} from '@/common/interfaces/response.interface';

export interface ResetPasswordResponse {
  username: string;
  message: string;
  resetAt: string;
}

@CommandHandler(ResetRootPasswordCommand)
export class ResetRootPasswordHandler
  implements ICommandHandler<ResetRootPasswordCommand>
{
  private readonly logger = new Logger(ResetRootPasswordHandler.name);

  constructor(private readonly userService: UserService) {}

  async execute(
    command: ResetRootPasswordCommand,
  ): Promise<ApiResponse<ResetPasswordResponse> | ApiErrorResponse> {
    try {
      // 통합된 리셋 메서드 사용
      const result = await this.userService.resetRootPassword(
        command.pemContent,
        command.newPassword,
      );

      const responseData: ResetPasswordResponse = {
        username: result.username,
        message: result.message,
        resetAt: new Date().toISOString(),
      };

      const response = ResponseBuilder.success(
        responseData,
        '루트 사용자 비밀번호가 성공적으로 변경되었습니다.',
        HttpStatus.OK,
      );

      return {
        ...response,
        timestamp: new Date().toISOString(),
        path: '/users/root/password-reset',
      } as ApiResponse<ResetPasswordResponse>;
    } catch (error) {
      this.logger.error('비밀번호 리셋 실패:', error);

      const errorResponse = ResponseBuilder.error(
        '비밀번호 리셋에 실패했습니다.',
        error instanceof Error ? error.message : '알 수 없는 오류',
        HttpStatus.BAD_REQUEST,
      );

      return {
        ...errorResponse,
        timestamp: new Date().toISOString(),
        path: '/users/root/password-reset',
      } as ApiErrorResponse;
    }
  }
}
