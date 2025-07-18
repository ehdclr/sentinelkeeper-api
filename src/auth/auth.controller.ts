import { Controller, Post, UsePipes } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { QueryBus } from '@nestjs/cqrs';
import { Body } from '@nestjs/common';
import { LoginRequestSchema, LoginRequest } from '@/auth/dto/auth.request';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { ApiResponse } from '@/common/interfaces/response.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  //TODO 로그인
  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginRequestSchema))
  login(@Body() loginDto: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.commandBus.execute(new LoginCommand(loginDto));
  }
}
