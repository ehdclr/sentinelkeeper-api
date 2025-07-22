import { z } from 'zod';
import {
  LoginRequestSchema,
  LogoutRequestSchema,
} from '@/auth/dto/auth.request';

// 타입 추출
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
