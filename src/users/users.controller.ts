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
import { CheckRootUserExistsQuery } from './queries/check-root-user-exists.query';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ResponseBuilder } from '../common/decorators/api-response.decorator';
import {
  ExistsUserResponse,
  UserHealthResponse,
  CreateRootUserResponse,
} from './dto/user.response.dto';
import {
  CreateUserRequest,
  CreateUserRequestSchema,
} from './dto/user.request.dto';
import {
  ApiResponse,
  ApiErrorResponse,
} from '../common/interfaces/response.interface';

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
    const result: ApiResponse<ExistsUserResponse> | ApiErrorResponse =
      await this.queryBus.execute(new CheckRootUserExistsQuery());

    return result;
  }

  //! root 계정
  @Post('root')
  @UsePipes(new ZodValidationPipe(CreateUserRequestSchema))
  async createRootUser(
    @Body() createUserDto: CreateUserRequest,
    @Res() res: Response,
  ): Promise<ApiResponse<CreateRootUserResponse> | ApiErrorResponse> {
    const command = new CreateRootUserCommand(
      createUserDto.username,
      createUserDto.password,
      createUserDto.email,
    );
    const result: ApiResponse<CreateRootUserResponse> | ApiErrorResponse =
      await this.commandBus.execute(command);

    res.setHeader('Content-Type', 'application/x-pem-file');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="root-user-${createUserDto.username}.pem"`,
    );
    const encodedResponse = Buffer.from(
      JSON.stringify(result),
    ).toString('base64');
    res.setHeader('X-Setup-Response', encodedResponse);

    res.send(result);

    return result;
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
