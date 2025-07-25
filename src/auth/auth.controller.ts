import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Req,
  Res,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Request, Response } from 'express';
import { LoginRequest, LoginRequestSchema } from './dto/auth.request';
import { ZodBody } from '@/common/decorators/zod-body.decorator';
import { LoginUserCommand } from './commands/login-user.command';
import { ValidateSessionCommand } from './commands/validate-session.command';
import { RevokeSessionCommand } from './commands/revoke-session.command';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @ZodBody(LoginRequestSchema) loginData: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('🚀 로그인 API 호출:', loginData.username);

    const result = await this.commandBus.execute(
      new LoginUserCommand(
        loginData.username,
        loginData.password,
        req.ip,
        req.headers['user-agent'],
      ),
    );

    // 세션 쿠키 설정
    res.cookie('sessionId', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: result.expiresAt,
    });

    console.log('✅ 로그인 완료, 쿠키 설정됨');

    return {
      success: true,
      user: result.user,
      expiresAt: result.expiresAt,
    };
  }

  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      throw new UnauthorizedException('세션이 없습니다');
    }

    const result = await this.commandBus.execute(
      new ValidateSessionCommand(sessionId),
    );

    return {
      user: result,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = req.cookies?.sessionId;

    if (sessionId) {
      await this.commandBus.execute(
        new RevokeSessionCommand(sessionId, 'logout'),
      );
    }

    // 쿠키 삭제
    res.clearCookie('sessionId');

    return { success: true, message: '로그아웃 되었습니다' };
  }
}
