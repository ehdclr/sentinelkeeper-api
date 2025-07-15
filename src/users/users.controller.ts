import {
  Controller,
  Post,
  Get,
  Body,
  UsePipes,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateRootUserCommand } from './commands/create-root-user.command';
import { ResetRootPasswordCommand } from './commands/reset-root-password.command';
import { CheckRootUserExistsQuery } from './queries/check-root-user-exists.query';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ResponseBuilder } from '../common/decorators/api-response.decorator';
import {
  ExistsUserResponse,
  UserHealthResponse,
} from './dto/user.response.dto';
import {
  CreateUserRequest,
  CreateUserRequestSchema,
  ResetPasswordRequest,
  ResetPasswordRequestSchema,
} from './dto/user.request.dto';
import {
  ApiResponse,
  ApiErrorResponse,
} from '../common/interfaces/response.interface';
import {
  CreateRootUserResponse,
  ResetPasswordResponse,
} from './dto/user.response.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('root/status')
  async getRootUserStatus(): Promise<
    ApiResponse<ExistsUserResponse> | ApiErrorResponse
  > {
    return await this.queryBus.execute(new CheckRootUserExistsQuery());
  }

  @Post('root')
  @UsePipes(new ZodValidationPipe(CreateUserRequestSchema))
  async createRootUser(
    @Body() createUserDto: CreateUserRequest,
    @Res() res: Response,
  ): Promise<void> {
    const command = new CreateRootUserCommand(
      createUserDto.username,
      createUserDto.password,
      createUserDto.email,
    );

    const result: ApiResponse<CreateRootUserResponse> | ApiErrorResponse =
      await this.commandBus.execute(command);

    if ('success' in result && result.success) {
      // Ed25519 Private Key PEM 파일 다운로드
      const filename = `sentinelkeeper-root-${createUserDto.username}-ed25519.pem`;

      res.setHeader('Content-Type', 'application/x-pem-file');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('X-Setup-Success', 'true');
      res.setHeader('X-Setup-Message', encodeURIComponent(result.message));

      res.send(result.data.privateKeyPem);
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(result);
    }
  }

  @Post('root/password-reset')
  @UsePipes(new ZodValidationPipe(ResetPasswordRequestSchema))
  async resetRootPassword(
    @Body() resetDto: ResetPasswordRequest,
  ): Promise<ApiResponse<ResetPasswordResponse> | ApiErrorResponse> {
    const command = new ResetRootPasswordCommand(
      resetDto.pemContent,
      resetDto.newPassword,
      resetDto.signature, // Ed25519 서명 추가
    );

    return await this.commandBus.execute(command);
  }

  @Get('health')
  getHealth(): ApiResponse<UserHealthResponse> {
    const responseData: UserHealthResponse = {
      service: 'Users Service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoints: {
        rootStatus: 'GET /users/root/status',
        createRoot: 'POST /users/root',
        resetPassword: 'POST /users/root/password-reset',
        health: 'GET /users/health',
      },
    };

    return ResponseBuilder.success(
      responseData,
      'Users 서비스가 정상적으로 작동 중입니다.',
      HttpStatus.OK,
    ) as ApiResponse<UserHealthResponse>;
  }
}
