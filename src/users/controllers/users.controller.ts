import {
  Controller,
  Post,
  Get,
  Body,
  UsePipes,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateRootUserCommand } from '../commands/create-root-user.command';
import { CheckRootUserExistsQuery } from '../queries/check-root-user-exists.query';
import { CreateUserSchema } from '../dto/create-user.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ResponseBuilder } from '../../common/decorators/api-response.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('root/status')
  async getRootUserStatus() {
    try {
      const result = await this.queryBus.execute(
        new CheckRootUserExistsQuery(),
      );

      return ResponseBuilder.success(
        {
          exists: result.exists,
          count: result.count,
          message: result.exists
            ? `${result.count}명의 루트 사용자가 존재합니다.`
            : '루트 사용자가 존재하지 않습니다.',
        },
        '루트 사용자 상태 조회 완료',
      );
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: `루트 사용자 상태 조회 실패: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('root')
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async createRootUser(
    @Body()
    createUserDto: {
      username: string;
      password: string;
      email?: string;
    },
  ) {
    try {
      const command = new CreateRootUserCommand(
        createUserDto.username,
        createUserDto.password,
        createUserDto.email,
      );

      const result = await this.commandBus.execute(command);

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            message: result.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return ResponseBuilder.success(
        {
          username: createUserDto.username,
          email: createUserDto.email,
          isSystemAdmin: true,
        },
        result.message,
      );
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: `루트 사용자 생성 실패: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  getHealth() {
    return ResponseBuilder.success(
      {
        service: 'Users Service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        endpoints: {
          rootStatus: 'GET /users/root/status',
          createRoot: 'POST /users/root',
          health: 'GET /users/health',
        },
      },
      'Users 서비스가 정상적으로 작동 중입니다.',
    );
  }
}
