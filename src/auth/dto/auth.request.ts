import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
});

export class LoginRequest extends createZodDto(LoginRequestSchema) {}

export const LogoutRequestSchema = z.object({
  sessionId: z.string().uuid('유효한 세션 ID가 아닙니다.').optional(),
});

export class LogoutRequest extends createZodDto(LogoutRequestSchema) {}

export const validateSessionSchema = z.object({
  sessionId: z.string().uuid('유효한 세션 ID가 아닙니다.'),
});

export class ValidateSessionRequest extends createZodDto(
  validateSessionSchema,
) {}
