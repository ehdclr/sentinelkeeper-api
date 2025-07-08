import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const TimestampSchema = z.date();
export const EmailSchema = z.string().email();

// 강화된 비밀번호 스키마 (선택사항)
export const PasswordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
  .max(128, '비밀번호는 최대 128자까지 가능합니다.')
  .regex(/[A-Z]/, '비밀번호는 대문자를 포함해야 합니다.')
  .regex(/[a-z]/, '비밀번호는 소문자를 포함해야 합니다.')
  .regex(/\d/, '비밀번호는 숫자를 포함해야 합니다.')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, '비밀번호는 특수문자를 포함해야 합니다.');

// 기본 비밀번호 스키마 (현재 사용 중)
export const BasicPasswordSchema = z.string().min(8);
